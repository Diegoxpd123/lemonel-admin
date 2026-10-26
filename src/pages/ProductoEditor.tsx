import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowSquareOut, ArrowLeft as Izq, ArrowRight as Der, Copy, Images, Plus, Prohibit, Trash, X } from '@phosphor-icons/react'
import { api, STORE_URL } from '../api'
import type { Categoria, Coleccion, Color, Opcion, Producto, Variante } from '../types'
import { Campo, Cargando, Interruptor, useAviso, useConfirmar } from '../ui'

type Formulario = {
  nombre: string
  categoriaId: number
  seccion: string
  material: string
  descripcion: string
  agotado: boolean
  oculto: boolean
  destacado: boolean
  nuevo: boolean
  escogeDiseno: boolean
  variantes: Variante[]
  opciones: Opcion[]
  colecciones: number[]
}

type Pendiente = { id: string; file: File; url: string }

const vacio = (categoriaId = 0): Formulario => ({
  nombre: '',
  categoriaId,
  seccion: '',
  material: '',
  descripcion: '',
  agotado: false,
  oculto: false,
  destacado: false,
  nuevo: false,
  escogeDiseno: false,
  variantes: [{ tipo: '', precio: 0, sku: null, agotado: false }],
  opciones: [],
  colecciones: [],
})

const desdeProducto = (p: Producto): Formulario => ({
  nombre: p.nombre,
  categoriaId: p.categoriaId,
  seccion: p.seccion,
  material: p.material,
  descripcion: p.descripcion,
  agotado: p.agotado,
  oculto: p.oculto,
  destacado: p.destacado,
  nuevo: p.nuevo,
  escogeDiseno: p.escogeDiseno,
  variantes: p.variantes.map((v) => ({ tipo: v.tipo, precio: v.precio, sku: v.sku, agotado: v.agotado })),
  opciones: p.opciones.map((o) => ({ nombre: o.nombre, valores: [...o.valores], agotados: [...(o.agotados ?? [])], requerida: o.requerida })),
  colecciones: [...p.colecciones],
})

const TIPOS = ['Collar', 'Aretes', 'Pulsera', 'Anillo', 'Set', 'Dúo', 'Cadena', 'Reloj', 'Pareja']
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const SUGERIDAS = ['Medida', 'Color', 'Letra', 'Grosor', 'Metal', 'Tamaño', 'Modelo']

const ValoresInput = ({
  valores,
  agotados,
  onChange,
  onAgotados,
  colores,
  etiqueta,
}: {
  valores: string[]
  agotados: string[]
  onChange: (v: string[]) => void
  onAgotados: (v: string[]) => void
  colores: Record<string, string>
  etiqueta: string
}) => {
  const [texto, setTexto] = useState('')

  const agregar = (crudo: string) => {
    const nuevos = crudo
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s && !valores.includes(s))
    if (nuevos.length) onChange([...valores, ...nuevos])
    setTexto('')
  }

  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      agregar(texto)
    } else if (e.key === 'Backspace' && !texto && valores.length) {
      onChange(valores.slice(0, -1))
    }
  }

  return (
    <div className="valores">
      {valores.map((v) => {
        const sinStock = agotados.includes(v)
        return (
          <span key={v} className={`valor${sinStock ? ' valor--agotado' : ''}`}>
            {colores[v] ? <i className="valor__color" style={{ background: colores[v] }} /> : null}
            <span className="valor__texto">{v}</span>
            {sinStock ? <span className="valor__aviso">Agotado</span> : null}
            <button
              type="button"
              className="valor__stock"
              aria-pressed={sinStock}
              onClick={() => onAgotados(sinStock ? agotados.filter((x) => x !== v) : [...agotados, v])}
              aria-label={sinStock ? `${v} vuelve a estar disponible` : `Marcar ${v} como agotado`}
              title={sinStock ? 'Marcar como disponible' : 'Marcar como agotado'}
            >
              <Prohibit size={14} weight="bold" />
            </button>
            <button type="button" className="valor__quitar" onClick={() => onChange(valores.filter((x) => x !== v))} aria-label={`Quitar ${v}`} title="Quitar">
              <X size={12} weight="bold" />
            </button>
          </span>
        )
      })}
      <input
        className="valores__input"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={alTeclear}
        onBlur={() => texto.trim() && agregar(texto)}
        placeholder={valores.length ? 'Agregar otro…' : `Escribe y presiona Enter (${etiqueta})`}
        aria-label={`Valores de ${etiqueta}`}
      />
    </div>
  )
}

const ProductoEditor = () => {
  const { id } = useParams()
  const esNuevo = !id
  const idNum = id ? Number(id) : 0
  const nav = useNavigate()
  const qc = useQueryClient()
  const aviso = useAviso()
  const confirmar = useConfirmar()

  const cats = useQuery({ queryKey: ['categorias'], queryFn: () => api.get<Categoria[]>('/api/admin/categorias') })
  const cols = useQuery({ queryKey: ['colecciones'], queryFn: () => api.get<Coleccion[]>('/api/admin/colecciones') })
  const coloresQ = useQuery({ queryKey: ['colores'], queryFn: () => api.get<Color[]>('/api/admin/colores') })
  const prod = useQuery({ queryKey: ['producto', idNum], queryFn: () => api.get<Producto>(`/api/admin/productos/${idNum}`), enabled: !esNuevo })

  const [form, setForm] = useState<Formulario>(vacio())
  const [base, setBase] = useState('')
  const [pendientes, setPendientes] = useState<Pendiente[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [subiendo, setSubiendo] = useState(false)
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const archivoRef = useRef<HTMLInputElement>(null)

  const colores = useMemo(() => Object.fromEntries((coloresQ.data ?? []).map((c) => [c.nombre, c.hex])), [coloresQ.data])

  useEffect(() => {
    if (esNuevo) {
      const f = vacio(cats.data?.[0]?.id ?? 0)
      setForm(f)
      setBase(JSON.stringify(f))
      setPendientes([])
    }
  }, [esNuevo, cats.data])

  useEffect(() => {
    if (prod.data) {
      const f = desdeProducto(prod.data)
      setForm(f)
      setBase(JSON.stringify(f))
    }
  }, [prod.data?.id, prod.dataUpdatedAt])

  const sucio = JSON.stringify(form) !== base || pendientes.length > 0

  useEffect(() => {
    if (!sucio) return
    const antes = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', antes)
    return () => window.removeEventListener('beforeunload', antes)
  }, [sucio])

  useEffect(
    () => () => {
      pendientes.forEach((p) => URL.revokeObjectURL(p.url))
    },
    [],
  )

  const poner = <K extends keyof Formulario>(k: K, v: Formulario[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrores((e) => {
      if (!e[k]) return e
      const { [k]: _omitido, ...resto } = e
      return resto
    })
  }

  const cambiarVariante = (i: number, parte: Partial<Variante>) => poner('variantes', form.variantes.map((v, j) => (j === i ? { ...v, ...parte } : v)))
  const cambiarOpcion = (i: number, parte: Partial<Opcion>) => poner('opciones', form.opciones.map((o, j) => (j === i ? { ...o, ...parte } : o)))

  const validar = () => {
    const e: Record<string, string> = {}
    if (form.nombre.trim().length < 2) e.nombre = 'Escribe el nombre del producto'
    if (!form.categoriaId) e.categoriaId = 'Elige una categoría'
    if (form.variantes.length === 0) e.variantes = 'Agrega al menos un precio'
    else if (form.variantes.some((v) => !v.tipo.trim())) e.variantes = 'Cada precio necesita un tipo (Collar, Aretes…)'
    else if (form.variantes.some((v) => !(v.precio >= 0))) e.variantes = 'Revisa los precios'
    if (form.opciones.some((o) => !o.nombre.trim())) e.opciones = 'Cada opción necesita un nombre'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const cuerpo = () => ({
    ...form,
    nombre: form.nombre.trim(),
    variantes: form.variantes.map((v) => ({ ...v, tipo: v.tipo.trim(), precio: Number(v.precio), sku: v.sku?.trim() || null })),
    opciones: form.opciones.filter((o) => o.nombre.trim()).map((o) => ({ ...o, nombre: o.nombre.trim() })),
  })

  const subirFotos = async (productoId: number, archivos: File[]) => {
    const fd = new FormData()
    archivos.forEach((f) => fd.append('fotos', f))
    return api.post<Producto>(`/api/admin/productos/${productoId}/fotos`, fd)
  }

  const guardar = useMutation({
    mutationFn: async () => {
      if (esNuevo) {
        const creado = await api.post<Producto>('/api/admin/productos', cuerpo())
        if (pendientes.length) {
          try {
            await subirFotos(creado.id, pendientes.map((p) => p.file))
          } catch (e) {
            aviso.error(`El producto se creó, pero las fotos no se pudieron subir: ${(e as Error).message}`)
          }
        }
        return creado
      }
      return api.put<Producto>(`/api/admin/productos/${idNum}`, cuerpo())
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      qc.invalidateQueries({ queryKey: ['resumen'] })
      qc.invalidateQueries({ queryKey: ['colecciones'] })
      qc.invalidateQueries({ queryKey: ['categorias'] })
      if (esNuevo) {
        setBase(JSON.stringify(form))
        setPendientes([])
        aviso.ok('Producto creado')
        nav(`/productos/${p.id}`, { replace: true })
      } else {
        qc.setQueryData(['producto', idNum], p)
        aviso.ok('Cambios guardados')
      }
    },
    onError: (e) => aviso.error(e.message),
  })

  const intentarGuardar = () => {
    if (!validar()) {
      aviso.error('Revisa los campos marcados antes de guardar')
      return
    }
    guardar.mutate()
  }

  const actualizarProducto = (p: Producto) => {
    qc.setQueryData(['producto', idNum], p)
    qc.invalidateQueries({ queryKey: ['productos'] })
    qc.invalidateQueries({ queryKey: ['resumen'] })
  }

  const alElegirArchivos = async (lista: FileList | null) => {
    const archivos = Array.from(lista ?? []).filter((f) => f.type.startsWith('image/'))
    if (archivoRef.current) archivoRef.current.value = ''
    if (!archivos.length) return
    if (esNuevo) {
      setPendientes((p) => [...p, ...archivos.map((file) => ({ id: `${file.name}-${file.size}-${Math.random()}`, file, url: URL.createObjectURL(file) }))])
      return
    }
    setSubiendo(true)
    try {
      actualizarProducto(await subirFotos(idNum, archivos))
      aviso.ok(archivos.length > 1 ? 'Fotos agregadas' : 'Foto agregada')
    } catch (e) {
      aviso.error((e as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  const quitarFoto = async (fotoId: number) => {
    const si = await confirmar('Quitar foto', 'La foto se eliminará del producto y de la tienda.', { confirmar: 'Quitar', peligro: true })
    if (!si) return
    try {
      actualizarProducto(await api.del<Producto>(`/api/admin/productos/${idNum}/fotos/${fotoId}`))
    } catch (e) {
      aviso.error((e as Error).message)
    }
  }

  const reordenar = async (desde: number, hasta: number) => {
    if (!prod.data || desde === hasta || hasta < 0 || hasta >= prod.data.fotos.length) return
    const ids = prod.data.fotos.map((f) => f.id)
    const [x] = ids.splice(desde, 1)
    ids.splice(hasta, 0, x!)
    const previo = prod.data
    qc.setQueryData(['producto', idNum], { ...previo, fotos: ids.map((i) => previo.fotos.find((f) => f.id === i)!) })
    try {
      actualizarProducto(await api.put<Producto>(`/api/admin/productos/${idNum}/fotos/orden`, { ids }))
    } catch (e) {
      qc.setQueryData(['producto', idNum], previo)
      aviso.error((e as Error).message)
    }
  }

  const reordenarPendiente = (desde: number, hasta: number) => {
    if (hasta < 0 || hasta >= pendientes.length) return
    setPendientes((p) => {
      const c = [...p]
      const [x] = c.splice(desde, 1)
      c.splice(hasta, 0, x!)
      return c
    })
  }

  const quitarPendiente = (pid: string) =>
    setPendientes((p) => {
      const x = p.find((q) => q.id === pid)
      if (x) URL.revokeObjectURL(x.url)
      return p.filter((q) => q.id !== pid)
    })

  const soltar = (e: DragEvent, destino: number) => {
    e.preventDefault()
    if (arrastrando === null) return
    if (esNuevo) reordenarPendiente(arrastrando, destino)
    else reordenar(arrastrando, destino)
    setArrastrando(null)
  }

  const borrarProducto = async () => {
    const si = await confirmar('Eliminar producto', `Se eliminará “${form.nombre}” con todas sus fotos. Esta acción no se puede deshacer.`, { confirmar: 'Eliminar', peligro: true })
    if (!si) return
    try {
      await api.del(`/api/admin/productos/${idNum}`)
      qc.invalidateQueries({ queryKey: ['productos'] })
      qc.invalidateQueries({ queryKey: ['resumen'] })
      aviso.ok('Producto eliminado')
      nav('/productos', { replace: true })
    } catch (e) {
      aviso.error((e as Error).message)
    }
  }

  const duplicar = async () => {
    try {
      const p = await api.post<Producto>(`/api/admin/productos/${idNum}/duplicar`)
      qc.invalidateQueries({ queryKey: ['productos'] })
      aviso.ok('Producto duplicado. Quedó oculto hasta que lo publiques.')
      nav(`/productos/${p.id}`)
    } catch (e) {
      aviso.error((e as Error).message)
    }
  }

  if (!esNuevo && prod.isLoading) return <Cargando />
  if (!esNuevo && !prod.data) return <p className="texto-suave">No se encontró el producto.</p>

  const fotos = prod.data?.fotos ?? []
  const nFotos = esNuevo ? pendientes.length : fotos.length

  const cuadros = esNuevo
    ? pendientes.map((p) => ({ clave: p.id, src: p.url, quitar: () => quitarPendiente(p.id) }))
    : fotos.map((f) => ({ clave: String(f.id), src: f.sm, quitar: () => quitarFoto(f.id) }))

  return (
    <div className="pagina pagina--editor">
      <header className="pagina__cabecera">
        <div>
          <Link to="/productos" className="volver">
            <ArrowLeft size={16} /> Productos
          </Link>
          <h1 className="pagina__titulo">{esNuevo ? 'Nuevo producto' : form.nombre || 'Producto'}</h1>
        </div>
        <div className="cabecera-acciones">
          {!esNuevo && prod.data ? (
            <a className="btn btn--suave" href={`${STORE_URL}/?producto=${prod.data.slug}`} target="_blank" rel="noreferrer">
              <ArrowSquareOut size={18} /> Ver en la tienda
            </a>
          ) : null}
        </div>
      </header>

      <div className="editor">
        <div className="editor__principal">
          <section className="tarjeta">
            <h2 className="tarjeta__titulo">Información</h2>
            <div className="campos">
              <Campo etiqueta="Nombre" error={errores.nombre}>
                {(i) => <input id={i} className="input" value={form.nombre} onChange={(e) => poner('nombre', e.target.value)} maxLength={120} placeholder="Ej. Collar Corazón Minimalista" />}
              </Campo>
              <Campo etiqueta="Material" ayuda="Aparece en la ficha del producto.">
                {(i) => <input id={i} className="input" value={form.material} onChange={(e) => poner('material', e.target.value)} maxLength={160} placeholder="Acero 316L bañado en oro de 18k" />}
              </Campo>
              <Campo etiqueta="Descripción" ayuda="Una o dos frases. Cuenta qué lo hace especial.">
                {(i) => <textarea id={i} className="input input--area" rows={3} value={form.descripcion} onChange={(e) => poner('descripcion', e.target.value)} maxLength={800} />}
              </Campo>
              <Campo etiqueta="Sección del catálogo" ayuda="Solo para tu orden interno, no se muestra en la tienda.">
                {(i) => <input id={i} className="input" value={form.seccion} onChange={(e) => poner('seccion', e.target.value)} maxLength={80} placeholder="Collares básicos" />}
              </Campo>
            </div>
          </section>

          <section className="tarjeta">
            <div className="tarjeta__cabecera">
              <div>
                <h2 className="tarjeta__titulo">Fotos</h2>
                <p className="texto-suave">La primera es la foto principal. Arrastra para cambiar el orden.</p>
              </div>
              <button type="button" className="btn btn--suave" onClick={() => archivoRef.current?.click()} disabled={subiendo}>
                <Images size={18} /> {subiendo ? 'Subiendo…' : 'Agregar fotos'}
              </button>
              <input ref={archivoRef} type="file" accept="image/*" multiple hidden onChange={(e) => alElegirArchivos(e.target.files)} />
            </div>
            {nFotos === 0 ? (
              <button type="button" className="subir" onClick={() => archivoRef.current?.click()}>
                <Images size={32} weight="light" />
                <span>Toca para elegir fotos</span>
                <span className="subir__ayuda">JPG, PNG o WebP · hasta 15 MB cada una</span>
              </button>
            ) : (
              <ul className="fotos">
                {cuadros.map((c, i) => (
                  <li
                    key={c.clave}
                    className={`foto${arrastrando === i ? ' foto--arrastrando' : ''}`}
                    draggable
                    onDragStart={() => setArrastrando(i)}
                    onDragEnd={() => setArrastrando(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => soltar(e, i)}
                  >
                    <img src={c.src} alt="" width="160" height="200" />
                    {i === 0 ? <span className="foto__principal">Principal</span> : null}
                    <div className="foto__acciones">
                      <button type="button" className="foto__btn" onClick={() => (esNuevo ? reordenarPendiente(i, i - 1) : reordenar(i, i - 1))} disabled={i === 0} aria-label="Mover antes">
                        <Izq size={16} />
                      </button>
                      <button type="button" className="foto__btn" onClick={() => (esNuevo ? reordenarPendiente(i, i + 1) : reordenar(i, i + 1))} disabled={i === cuadros.length - 1} aria-label="Mover después">
                        <Der size={16} />
                      </button>
                      <button type="button" className="foto__btn foto__btn--peligro" onClick={c.quitar} aria-label="Quitar foto">
                        <Trash size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="tarjeta">
            <div className="tarjeta__cabecera">
              <div>
                <h2 className="tarjeta__titulo">Precios</h2>
                <p className="texto-suave">Si la pieza se vende como collar, aretes o set, agrega un precio por cada una.</p>
              </div>
              <button type="button" className="btn btn--suave" onClick={() => poner('variantes', [...form.variantes, { tipo: '', precio: 0, sku: null, agotado: false }])}>
                <Plus size={18} /> Agregar precio
              </button>
            </div>
            {errores.variantes ? <p className="campo__error">{errores.variantes}</p> : null}
            <datalist id="tipos">
              {TIPOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <ul className="variantes">
              {form.variantes.map((v, i) => (
                <li key={i} className="variante">
                  <Campo etiqueta="Tipo">{(k) => <input id={k} className="input" list="tipos" value={v.tipo} onChange={(e) => cambiarVariante(i, { tipo: e.target.value })} maxLength={60} placeholder="Collar" />}</Campo>
                  <Campo etiqueta="Precio (S/)">
                    {(k) => <input id={k} className="input" type="number" inputMode="decimal" min={0} step="0.5" value={Number.isNaN(v.precio) ? '' : v.precio} onChange={(e) => cambiarVariante(i, { precio: e.target.value === '' ? NaN : Number(e.target.value) })} />}
                  </Campo>
                  <Campo etiqueta="Código">{(k) => <input id={k} className="input" value={v.sku ?? ''} onChange={(e) => cambiarVariante(i, { sku: e.target.value || null })} maxLength={40} placeholder="1010" />}</Campo>
                  <div className="variante__extra">
                    <Interruptor activo={v.agotado} onChange={(x) => cambiarVariante(i, { agotado: x })} titulo="Agotado" />
                    <button type="button" className="icono-btn icono-btn--peligro" onClick={() => poner('variantes', form.variantes.filter((_, j) => j !== i))} disabled={form.variantes.length === 1} aria-label="Quitar precio">
                      <Trash size={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="tarjeta">
            <div className="tarjeta__cabecera">
              <div>
                <h2 className="tarjeta__titulo">Opciones para la clienta</h2>
                <p className="texto-suave">Medida, color, letra… Se eligen en la ficha y viajan en el pedido de WhatsApp.</p>
              </div>
            </div>
            {errores.opciones ? <p className="campo__error">{errores.opciones}</p> : null}
            <ul className="opciones">
              {form.opciones.map((o, i) => (
                <li key={i} className="opcion">
                  <div className="opcion__cabecera">
                    <input className="input opcion__nombre" list="sugeridas" value={o.nombre} onChange={(e) => cambiarOpcion(i, { nombre: e.target.value })} maxLength={40} placeholder="Nombre (Medida, Color…)" aria-label="Nombre de la opción" />
                    <Interruptor activo={o.requerida} onChange={(x) => cambiarOpcion(i, { requerida: x })} titulo="Obligatoria" detalle="Debe elegirla" />
                    <button type="button" className="icono-btn icono-btn--peligro" onClick={() => poner('opciones', form.opciones.filter((_, j) => j !== i))} aria-label="Quitar opción">
                      <Trash size={20} />
                    </button>
                  </div>
                  <ValoresInput
                    valores={o.valores}
                    agotados={o.agotados}
                    onChange={(v) => cambiarOpcion(i, { valores: v, agotados: o.agotados.filter((a) => v.includes(a)) })}
                    onAgotados={(a) => cambiarOpcion(i, { agotados: a })}
                    colores={colores}
                    etiqueta={o.nombre || 'opción'}
                  />
                  {o.valores.length > 0 ? <p className="texto-suave opcion__ayuda">Toca <Prohibit size={13} weight="bold" /> en un valor para marcarlo agotado: la clienta lo verá tachado y no podrá elegirlo.</p> : null}
                  {o.nombre.trim().toLowerCase() === 'letra' && o.valores.length === 0 ? (
                    <button type="button" className="enlace-btn" onClick={() => cambiarOpcion(i, { valores: LETRAS })}>
                      Agregar el abecedario completo (A–Z)
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <datalist id="sugeridas">
              {SUGERIDAS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <div className="sugerencias">
              <span className="texto-suave">Agregar:</span>
              {['Medida', 'Color', 'Letra', 'Grosor'].map((n) => (
                <button key={n} type="button" className="chip" onClick={() => poner('opciones', [...form.opciones, { nombre: n, valores: n === 'Letra' ? LETRAS : [], agotados: [], requerida: n === 'Letra' }])}>
                  <Plus size={14} /> {n}
                </button>
              ))}
              <button type="button" className="chip" onClick={() => poner('opciones', [...form.opciones, { nombre: '', valores: [], agotados: [], requerida: false }])}>
                <Plus size={14} /> Otra
              </button>
            </div>
            <div className="opcion__libre">
              <Interruptor activo={form.escogeDiseno} onChange={(x) => poner('escogeDiseno', x)} titulo="La clienta escribe qué diseño quiere" detalle="Útil para anillos y familias de modelos: aparece un cuadro “¿Cuál de la foto te gusta?”" />
            </div>
          </section>
        </div>

        <aside className="editor__lateral">
          <section className="tarjeta tarjeta--pegada">
            <h2 className="tarjeta__titulo">Publicación</h2>
            <div className="interruptores">
              <Interruptor activo={!form.oculto} onChange={(x) => poner('oculto', !x)} titulo="Visible en la tienda" detalle={form.oculto ? 'Oculto: nadie lo ve' : 'Las clientas lo ven'} />
              <Interruptor activo={form.agotado} onChange={(x) => poner('agotado', x)} titulo="Agotado" detalle="Se muestra pero no se puede pedir" />
              <Interruptor activo={form.destacado} onChange={(x) => poner('destacado', x)} titulo="Más vendido" detalle="Aparece en el carrusel de inicio" />
              <Interruptor activo={form.nuevo} onChange={(x) => poner('nuevo', x)} titulo="Etiqueta Nuevo" detalle="Aparece en Novedades" />
            </div>

            <Campo etiqueta="Categoría" error={errores.categoriaId}>
              {(i) => (
                <select id={i} className="input" value={form.categoriaId} onChange={(e) => poner('categoriaId', Number(e.target.value))}>
                  <option value={0} disabled>
                    Elige una categoría
                  </option>
                  {cats.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              )}
            </Campo>

            <fieldset className="grupo">
              <legend className="campo__etiqueta">Colecciones</legend>
              <div className="chips chips--envuelto">
                {cols.data?.map((c) => {
                  const on = form.colecciones.includes(c.id)
                  return (
                    <button key={c.id} type="button" className={`chip${on ? ' chip--activo' : ''}`} aria-pressed={on} onClick={() => poner('colecciones', on ? form.colecciones.filter((x) => x !== c.id) : [...form.colecciones, c.id])}>
                      {c.nombre}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="guardar">
              <button type="button" className="btn btn--primario btn--bloque" onClick={intentarGuardar} disabled={guardar.isPending || (!esNuevo && !sucio)}>
                {guardar.isPending ? 'Guardando…' : esNuevo ? 'Crear producto' : 'Guardar cambios'}
              </button>
              {sucio && !guardar.isPending ? <p className="guardar__aviso">Tienes cambios sin guardar</p> : null}
            </div>

            {!esNuevo ? (
              <div className="zona-final">
                <button type="button" className="btn btn--suave btn--bloque" onClick={duplicar}>
                  <Copy size={18} /> Duplicar
                </button>
                <button type="button" className="btn btn--peligro-suave btn--bloque" onClick={borrarProducto}>
                  <Trash size={18} /> Eliminar producto
                </button>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  )
}

export default ProductoEditor
