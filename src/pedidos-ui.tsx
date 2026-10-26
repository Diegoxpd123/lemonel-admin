import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, MagnifyingGlass, Minus, Plus, Trash } from '@phosphor-icons/react'
import { api, STORE_URL } from './api'
import type { EstadoPedido, Pedido, PedidoItem, ProductoCatalogo } from './types'
import { Campo, Cargando, dinero, Modal } from './ui'

export const ESTADOS: { id: EstadoPedido; corto: string; largo: string }[] = [
  { id: 'recibido', corto: 'Recibido', largo: 'Pedido recibido' },
  { id: 'pagado', corto: 'Pagado', largo: 'Pago confirmado' },
  { id: 'preparando', corto: 'Preparando', largo: 'Preparando' },
  { id: 'enviado', corto: 'Enviado', largo: 'Enviado' },
  { id: 'entregado', corto: 'Entregado', largo: 'Entregado' },
]

export const METODOS_PAGO = ['Yape', 'Plin', 'Transferencia', 'Efectivo', 'Otro']

export const nombreEstado = (e: string) => ESTADOS.find((x) => x.id === e)?.largo ?? (e === 'cancelado' ? 'Pedido cancelado' : e === 'reactivado' ? 'Pedido reactivado' : e)

export const EstadoChip = ({ estado, cancelado }: { estado: EstadoPedido; cancelado?: boolean }) => (
  <span className={`estado estado--${cancelado ? 'cancelado' : estado}`}>{cancelado ? 'Cancelado' : (ESTADOS.find((x) => x.id === estado)?.corto ?? estado)}</span>
)

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export const soloDia = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short', year: 'numeric' })

export const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

export const linkSeguimiento = (token: string) => `${STORE_URL}/pedido/${token}`

export const telefonoWhatsapp = (s: string) => {
  const d = s.replace(/\D/g, '')
  return d.length === 9 && d.startsWith('9') ? `51${d}` : d
}

export const urlWhatsapp = (telefono: string, texto: string) => `https://wa.me/${telefonoWhatsapp(telefono)}?text=${encodeURIComponent(texto)}`

export const mensajeParaClienta = (p: Pedido) => {
  const nombre = p.cliente.trim().split(/\s+/)[0] ?? ''
  const hola = nombre ? `Hola ${nombre}` : 'Hola'
  const link = linkSeguimiento(p.token)
  switch (p.estado) {
    case 'recibido':
      return `${hola}, recibimos tu pedido ${p.codigo} 💛 Puedes ver su estado en cualquier momento aquí: ${link}`
    case 'pagado':
      return p.saldo > 0
        ? `${hola}, registramos tu pago de ${dinero(p.pagado)} y separamos tu pedido ${p.codigo}. Te faltan ${dinero(p.saldo)}. Sigue tu pedido aquí: ${link}`
        : `${hola}, ¡confirmamos tu pago! Tu pedido ${p.codigo} pasa a preparación. Míralo aquí: ${link}`
    case 'preparando':
      return `${hola}, estamos preparando tu pedido ${p.codigo} con cariño. Sigue el avance aquí: ${link}`
    case 'enviado':
      return p.metodoEnvio === 'motorizado'
        ? `${hola}, tu pedido ${p.codigo} ya va en camino con nuestro motorizado 🛵 Míralo aquí: ${link}`
        : `${hola}, tu pedido ${p.codigo} ya salió por ${p.metodoEnvio === 'shalom' ? 'Shalom' : 'courier'}${p.agencia ? ` hacia ${p.agencia}` : ''} 📦${p.seguimiento ? ` Código de seguimiento: ${p.seguimiento}.` : ''} Míralo aquí: ${link}`
    default:
      return `${hola}, tu pedido ${p.codigo} fue entregado. ¡Gracias por elegir Lemonel! 💛 Si necesitas algo, aquí estamos. ${link}`
  }
}

export type Linea = {
  id?: number
  productoId: number | null
  varianteId?: number
  opciones?: Record<string, string>
  diseno?: string
  nombre: string
  detalle: string
  foto: string | null
  cantidad: number
  precio: number
}

export const lineasDe = (items: PedidoItem[]): Linea[] =>
  items.map((i) => ({ id: i.id, productoId: i.productoId, nombre: i.nombre, detalle: i.detalle, foto: i.foto, cantidad: i.cantidad, precio: i.precio }))

export const itemsParaApi = (lineas: Linea[]) =>
  lineas.map((l) => {
    if (l.id) return { id: l.id, cantidad: l.cantidad, precio: l.precio, nombre: l.nombre, detalle: l.detalle }
    if (l.productoId && l.varianteId) return { productoId: l.productoId, varianteId: l.varianteId, opciones: l.opciones ?? {}, diseno: l.diseno ?? '', cantidad: l.cantidad, precio: l.precio }
    return { nombre: l.nombre, detalle: l.detalle, cantidad: l.cantidad, precio: l.precio }
  })

export const subtotalDe = (lineas: Linea[]) => Math.round(lineas.reduce((a, l) => a + l.precio * l.cantidad, 0) * 100) / 100

const detalleLinea = (p: ProductoCatalogo, tipo: string, op: Record<string, string>, diseno: string) => {
  const partes: string[] = []
  if (p.variantes.length > 1) partes.push(tipo)
  for (const [k, v] of Object.entries(op)) if (v) partes.push(`${k}: ${v}`)
  if (diseno.trim()) partes.push(`Diseño: ${diseno.trim()}`)
  return partes.join(' · ')
}

const SelectorProducto = ({ abierto, onCerrar, onAgregar }: { abierto: boolean; onCerrar: () => void; onAgregar: (l: Linea) => void }) => {
  const [modo, setModo] = useState<'catalogo' | 'libre'>('catalogo')
  const [busca, setBusca] = useState('')
  const [elegido, setElegido] = useState<ProductoCatalogo | null>(null)
  const [vi, setVi] = useState(0)
  const [op, setOp] = useState<Record<string, string>>({})
  const [diseno, setDiseno] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [libre, setLibre] = useState({ nombre: '', detalle: '', precio: '', cantidad: 1 })
  const [error, setError] = useState('')

  const cat = useQuery({ queryKey: ['catalogo-pedidos'], queryFn: () => api.get<ProductoCatalogo[]>('/api/admin/pedidos/catalogo'), enabled: abierto, staleTime: 60_000 })

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return (cat.data ?? []).filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)).slice(0, 60)
  }, [cat.data, busca])

  const cerrar = () => {
    setElegido(null)
    setBusca('')
    setError('')
    setModo('catalogo')
    onCerrar()
  }

  const elegir = (p: ProductoCatalogo) => {
    const inicial: Record<string, string> = {}
    for (const o of p.opciones) {
      const libres = o.valores.filter((v) => !o.agotados.includes(v))
      if (!o.requerida && libres[0]) inicial[o.nombre] = libres[0]
    }
    setElegido(p)
    setVi(Math.max(0, p.variantes.findIndex((v) => !v.agotado)))
    setOp(inicial)
    setDiseno('')
    setCantidad(1)
    setError('')
  }

  const agregarCatalogo = () => {
    if (!elegido) return
    const v = elegido.variantes[vi]
    if (!v) return
    const falta = elegido.opciones.find((o) => o.requerida && o.valores.length && !op[o.nombre])
    if (falta) {
      setError(`Elige ${falta.nombre.toLowerCase()} para continuar`)
      return
    }
    onAgregar({
      productoId: elegido.id,
      varianteId: v.id,
      opciones: op,
      diseno,
      nombre: elegido.nombre,
      detalle: detalleLinea(elegido, v.tipo, op, diseno),
      foto: elegido.foto,
      cantidad,
      precio: v.precio,
    })
    cerrar()
  }

  const agregarLibre = () => {
    const precio = Number(libre.precio)
    if (!libre.nombre.trim()) return setError('Escribe el concepto')
    if (!Number.isFinite(precio) || precio < 0 || libre.precio === '') return setError('Escribe el precio')
    onAgregar({ productoId: null, nombre: libre.nombre.trim(), detalle: libre.detalle.trim(), foto: null, cantidad: Math.max(1, libre.cantidad), precio })
    setLibre({ nombre: '', detalle: '', precio: '', cantidad: 1 })
    cerrar()
  }

  return (
    <Modal abierto={abierto} titulo="Agregar al pedido" onCerrar={cerrar} ancho={620}>
      <div className="chips" role="group" aria-label="Qué agregar">
        <button type="button" className={`chip${modo === 'catalogo' ? ' chip--activo' : ''}`} aria-pressed={modo === 'catalogo'} onClick={() => setModo('catalogo')}>
          Del catálogo
        </button>
        <button type="button" className={`chip${modo === 'libre' ? ' chip--activo' : ''}`} aria-pressed={modo === 'libre'} onClick={() => setModo('libre')}>
          Otro concepto
        </button>
      </div>

      {modo === 'libre' ? (
        <div className="campos">
          <Campo etiqueta="Concepto">
            {(id) => <input id={id} className="input" value={libre.nombre} maxLength={120} placeholder="Ej. Cajita de regalo" onChange={(e) => setLibre({ ...libre, nombre: e.target.value })} />}
          </Campo>
          <Campo etiqueta="Detalle (opcional)">
            {(id) => <input id={id} className="input" value={libre.detalle} maxLength={200} onChange={(e) => setLibre({ ...libre, detalle: e.target.value })} />}
          </Campo>
          <div className="campos campos--fila">
            <Campo etiqueta="Precio (S/)">
              {(id) => <input id={id} className="input" type="number" inputMode="decimal" min="0" step="0.01" value={libre.precio} onChange={(e) => setLibre({ ...libre, precio: e.target.value })} />}
            </Campo>
            <Campo etiqueta="Cantidad">
              {(id) => <input id={id} className="input" type="number" inputMode="numeric" min="1" value={libre.cantidad} onChange={(e) => setLibre({ ...libre, cantidad: Math.max(1, Number(e.target.value) || 1) })} />}
            </Campo>
          </div>
          {error ? <p className="campo__error">{error}</p> : null}
          <button type="button" className="btn btn--primario" onClick={agregarLibre}>
            <Plus size={18} /> Agregar al pedido
          </button>
        </div>
      ) : elegido ? (
        <div className="sel-config">
          <button type="button" className="enlace-btn" onClick={() => setElegido(null)}>
            <ArrowLeft size={16} /> Elegir otro producto
          </button>
          <div className="sel-config__cab">
            {elegido.foto ? <img src={elegido.foto} alt="" width="64" height="80" /> : <span className="producto__sinfoto">Sin foto</span>}
            <div>
              <p className="sel-prod__n">{elegido.nombre}</p>
              <p className="texto-suave">{elegido.categoria}</p>
            </div>
          </div>
          {elegido.variantes.length > 1 ? (
            <fieldset className="sel-grupo">
              <legend>Pieza</legend>
              <div className="chips">
                {elegido.variantes.map((v, i) => (
                  <button key={v.id} type="button" className={`chip${vi === i ? ' chip--activo' : ''}`} aria-pressed={vi === i} onClick={() => setVi(i)}>
                    {v.tipo} · {dinero(v.precio)}
                    {v.agotado ? ' (agotado)' : ''}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {elegido.opciones.map((o) =>
            o.valores.length ? (
              <fieldset key={o.nombre} className="sel-grupo">
                <legend>
                  {o.nombre}
                  {o.requerida ? ' *' : ''}
                </legend>
                <div className="chips">
                  {o.valores.map((v) => (
                    <button key={v} type="button" className={`chip${op[o.nombre] === v ? ' chip--activo' : ''}`} aria-pressed={op[o.nombre] === v} onClick={() => setOp({ ...op, [o.nombre]: v })}>
                      {v}
                      {o.agotados.includes(v) ? ' (agotado)' : ''}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null,
          )}
          {elegido.escogeDiseno ? (
            <Campo etiqueta="Diseño que quiere la clienta">
              {(id) => <input id={id} className="input" value={diseno} maxLength={200} onChange={(e) => setDiseno(e.target.value)} />}
            </Campo>
          ) : null}
          <Campo etiqueta="Cantidad">
            {(id) => <input id={id} className="input input--corto" type="number" inputMode="numeric" min="1" value={cantidad} onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))} />}
          </Campo>
          {error ? <p className="campo__error">{error}</p> : null}
          <button type="button" className="btn btn--primario" onClick={agregarCatalogo}>
            <Plus size={18} /> Agregar al pedido
          </button>
        </div>
      ) : (
        <>
          <label className="buscador">
            <MagnifyingGlass size={20} />
            <input type="search" className="buscador__input" placeholder="Buscar producto" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar producto" autoFocus />
          </label>
          {cat.isLoading ? (
            <Cargando />
          ) : (
            <ul className="sel-lista">
              {lista.map((p) => (
                <li key={p.id}>
                  <button type="button" className="sel-prod" onClick={() => elegir(p)}>
                    {p.foto ? <img src={p.foto} alt="" width="44" height="54" loading="lazy" /> : <span className="producto__sinfoto">Sin foto</span>}
                    <span>
                      <span className="sel-prod__n">{p.nombre}</span>
                      <span className="texto-suave">
                        {p.categoria}
                        {p.agotado ? ' · Agotado' : ''}
                        {p.oculto ? ' · Oculto' : ''}
                      </span>
                    </span>
                    <span className="sel-prod__p">{p.variantes.length ? `desde ${dinero(Math.min(...p.variantes.map((v) => v.precio)))}` : ''}</span>
                  </button>
                </li>
              ))}
              {lista.length === 0 ? <li className="texto-suave sel-vacio">No hay productos con ese nombre.</li> : null}
            </ul>
          )}
        </>
      )}
    </Modal>
  )
}

export const ItemsEditor = ({ lineas, onChange }: { lineas: Linea[]; onChange: (l: Linea[]) => void }) => {
  const [abierto, setAbierto] = useState(false)
  const cambiar = (i: number, parte: Partial<Linea>) => onChange(lineas.map((l, j) => (j === i ? { ...l, ...parte } : l)))

  return (
    <div className="pe-items">
      {lineas.length === 0 ? <p className="texto-suave pe-vacio">Todavía no agregaste productos.</p> : null}
      <ul className="pe-lista">
        {lineas.map((l, i) => (
          <li key={`${l.id ?? 'n'}-${i}`} className="pe-item">
            {l.foto ? <img src={l.foto} alt="" width="52" height="64" /> : <span className="producto__sinfoto">Sin foto</span>}
            <div className="pe-item__info">
              <p className="pe-item__n">{l.nombre}</p>
              {l.detalle ? <p className="texto-suave">{l.detalle}</p> : null}
            </div>
            <div className="pe-item__cant" role="group" aria-label={`Cantidad de ${l.nombre}`}>
              <button type="button" className="icono-btn" onClick={() => cambiar(i, { cantidad: Math.max(1, l.cantidad - 1) })} aria-label="Una menos">
                <Minus size={16} />
              </button>
              <input className="input" type="number" inputMode="numeric" min="1" value={l.cantidad} onChange={(e) => cambiar(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })} aria-label="Cantidad" />
              <button type="button" className="icono-btn" onClick={() => cambiar(i, { cantidad: l.cantidad + 1 })} aria-label="Una más">
                <Plus size={16} />
              </button>
            </div>
            <label className="pe-item__precio">
              <span>Precio S/</span>
              <input className="input" type="number" inputMode="decimal" min="0" step="0.01" value={l.precio} onChange={(e) => cambiar(i, { precio: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
            <p className="pe-item__sub">{dinero(l.precio * l.cantidad)}</p>
            <button type="button" className="icono-btn icono-btn--peligro" onClick={() => onChange(lineas.filter((_, j) => j !== i))} aria-label={`Quitar ${l.nombre}`}>
              <Trash size={18} />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn--suave" onClick={() => setAbierto(true)}>
        <Plus size={18} /> Agregar producto
      </button>
      <SelectorProducto abierto={abierto} onCerrar={() => setAbierto(false)} onAgregar={(l) => onChange([...lineas, l])} />
    </div>
  )
}
