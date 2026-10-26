import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Eye, EyeSlash, MagnifyingGlass, PencilSimple, Plus, Prohibit, Sparkle, Star, Trash } from '@phosphor-icons/react'
import { api } from '../api'
import type { Categoria, Producto, ProductoFila } from '../types'
import { Cargando, dinero, useAviso, useConfirmar, Vacio } from '../ui'

const estados = [
  { id: 'todos', t: 'Todos' },
  { id: 'agotado', t: 'Agotados' },
  { id: 'oculto', t: 'Ocultos' },
  { id: 'destacado', t: 'Más vendidos' },
  { id: 'nuevo', t: 'Nuevos' },
  { id: 'sinfoto', t: 'Sin foto' },
]

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const TAM = 40

const Productos = () => {
  const [params, setParams] = useSearchParams()
  const [limite, setLimite] = useState(TAM)
  const qc = useQueryClient()
  const nav = useNavigate()
  const aviso = useAviso()
  const confirmar = useConfirmar()

  const busqueda = params.get('q') ?? ''
  const categoria = params.get('categoria') ?? 'todas'
  const estado = params.get('estado') ?? 'todos'

  const fijar = (clave: string, valor: string, defecto: string) => {
    const p = new URLSearchParams(params)
    if (valor === defecto || !valor) p.delete(clave)
    else p.set(clave, valor)
    setParams(p, { replace: true })
    setLimite(TAM)
  }

  const lista = useQuery({ queryKey: ['productos'], queryFn: () => api.get<ProductoFila[]>('/api/admin/productos') })
  const cats = useQuery({ queryKey: ['categorias'], queryFn: () => api.get<Categoria[]>('/api/admin/categorias') })

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (lista.data ?? []).filter((p) => {
      if (categoria !== 'todas' && p.categoria !== categoria) return false
      if (estado === 'agotado' && !p.agotado) return false
      if (estado === 'oculto' && !p.oculto) return false
      if (estado === 'destacado' && !p.destacado) return false
      if (estado === 'nuevo' && !p.nuevo) return false
      if (estado === 'sinfoto' && p.foto) return false
      if (q && !normalizar(`${p.nombre} ${p.seccion}`).includes(q)) return false
      return true
    })
  }, [lista.data, busqueda, categoria, estado])

  const cambiar = useMutation({
    mutationFn: ({ id, campo, valor }: { id: number; campo: string; valor: boolean }) => api.patch<Producto>(`/api/admin/productos/${id}`, { [campo]: valor }),
    onMutate: async ({ id, campo, valor }) => {
      await qc.cancelQueries({ queryKey: ['productos'] })
      const previo = qc.getQueryData<ProductoFila[]>(['productos'])
      qc.setQueryData<ProductoFila[]>(['productos'], (l) => l?.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)))
      return { previo }
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(['productos'], ctx?.previo)
      aviso.error(e.message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['resumen'] })
    },
  })

  const duplicar = useMutation({
    mutationFn: (id: number) => api.post<Producto>(`/api/admin/productos/${id}/duplicar`),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      aviso.ok('Producto duplicado. Quedó oculto hasta que lo publiques.')
      nav(`/productos/${p.id}`)
    },
    onError: (e) => aviso.error(e.message),
  })

  const borrar = useMutation({
    mutationFn: (id: number) => api.del(`/api/admin/productos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      qc.invalidateQueries({ queryKey: ['resumen'] })
      aviso.ok('Producto eliminado')
    },
    onError: (e) => aviso.error(e.message),
  })

  const pedirBorrar = async (p: ProductoFila) => {
    const si = await confirmar('Eliminar producto', `Se eliminará “${p.nombre}” con todas sus fotos. Esta acción no se puede deshacer.`, { confirmar: 'Eliminar', peligro: true })
    if (si) borrar.mutate(p.id)
  }

  if (lista.isLoading) return <Cargando />

  const visibles = filtrados.slice(0, limite)

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">{lista.data?.length ?? 0} piezas en el catálogo</p>
          <h1 className="pagina__titulo">Productos</h1>
        </div>
        <Link to="/productos/nuevo" className="btn btn--primario">
          <Plus size={18} /> Nuevo producto
        </Link>
      </header>

      <div className="filtros">
        <label className="buscador">
          <MagnifyingGlass size={20} />
          <input type="search" className="buscador__input" placeholder="Buscar por nombre o sección" value={busqueda} onChange={(e) => fijar('q', e.target.value, '')} aria-label="Buscar productos" />
        </label>
        <select className="input input--corto" value={categoria} onChange={(e) => fijar('categoria', e.target.value, 'todas')} aria-label="Categoría">
          <option value="todas">Todas las categorías</option>
          {cats.data?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="chips" role="group" aria-label="Estado">
        {estados.map((e) => (
          <button key={e.id} type="button" className={`chip${estado === e.id ? ' chip--activo' : ''}`} aria-pressed={estado === e.id} onClick={() => fijar('estado', e.id, 'todos')}>
            {e.t}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <Vacio titulo="No encontramos productos" texto="Prueba con otra búsqueda o cambia los filtros." />
      ) : (
        <>
          <p className="texto-suave conteo">
            Mostrando {visibles.length} de {filtrados.length}
          </p>
          <ul className="productos">
            {visibles.map((p) => (
              <li key={p.id} className={`producto${p.oculto ? ' producto--oculto' : ''}`}>
                <Link to={`/productos/${p.id}`} className="producto__foto" aria-label={`Editar ${p.nombre}`}>
                  {p.foto ? <img src={p.foto} alt="" loading="lazy" width="64" height="80" /> : <span className="producto__sinfoto">Sin foto</span>}
                </Link>
                <div className="producto__info">
                  <Link to={`/productos/${p.id}`} className="producto__nombre">
                    {p.nombre}
                  </Link>
                  <p className="producto__meta">
                    {p.categoriaNombre}
                    {p.seccion ? ` · ${p.seccion}` : ''}
                  </p>
                  <div className="etiquetas">
                    {p.agotado ? <span className="etiqueta etiqueta--rojo">Agotado</span> : null}
                    {p.oculto ? <span className="etiqueta etiqueta--gris">Oculto</span> : null}
                    {p.destacado ? <span className="etiqueta etiqueta--dorado">Más vendido</span> : null}
                    {p.nuevo ? <span className="etiqueta etiqueta--verde">Nuevo</span> : null}
                  </div>
                </div>
                <div className="producto__precio">
                  <span className="producto__desde">{p.variantes > 1 ? 'Desde' : 'Precio'}</span>
                  <strong>{dinero(p.precioDesde)}</strong>
                  {p.variantes > 1 ? <span className="producto__variantes">{p.variantes} variantes</span> : null}
                </div>
                <div className="producto__acciones">
                  <button type="button" className={`icono-btn${p.agotado ? ' icono-btn--rojo' : ''}`} onClick={() => cambiar.mutate({ id: p.id, campo: 'agotado', valor: !p.agotado })} aria-pressed={p.agotado} title={p.agotado ? 'Marcar como disponible' : 'Marcar como agotado'} aria-label={p.agotado ? 'Marcar como disponible' : 'Marcar como agotado'}>
                    <Prohibit size={20} />
                  </button>
                  <button type="button" className={`icono-btn${p.oculto ? ' icono-btn--gris' : ''}`} onClick={() => cambiar.mutate({ id: p.id, campo: 'oculto', valor: !p.oculto })} aria-pressed={p.oculto} title={p.oculto ? 'Mostrar en la tienda' : 'Ocultar de la tienda'} aria-label={p.oculto ? 'Mostrar en la tienda' : 'Ocultar de la tienda'}>
                    {p.oculto ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                  <button type="button" className={`icono-btn${p.destacado ? ' icono-btn--dorado' : ''}`} onClick={() => cambiar.mutate({ id: p.id, campo: 'destacado', valor: !p.destacado })} aria-pressed={p.destacado} title={p.destacado ? 'Quitar de más vendidos' : 'Marcar como más vendido'} aria-label={p.destacado ? 'Quitar de más vendidos' : 'Marcar como más vendido'}>
                    <Star size={20} weight={p.destacado ? 'fill' : 'regular'} />
                  </button>
                  <button type="button" className={`icono-btn${p.nuevo ? ' icono-btn--verde' : ''}`} onClick={() => cambiar.mutate({ id: p.id, campo: 'nuevo', valor: !p.nuevo })} aria-pressed={p.nuevo} title={p.nuevo ? 'Quitar etiqueta Nuevo' : 'Marcar como nuevo'} aria-label={p.nuevo ? 'Quitar etiqueta Nuevo' : 'Marcar como nuevo'}>
                    <Sparkle size={20} weight={p.nuevo ? 'fill' : 'regular'} />
                  </button>
                  <span className="producto__separador" aria-hidden="true" />
                  <Link to={`/productos/${p.id}`} className="icono-btn" title="Editar" aria-label="Editar">
                    <PencilSimple size={20} />
                  </Link>
                  <button type="button" className="icono-btn" onClick={() => duplicar.mutate(p.id)} title="Duplicar" aria-label="Duplicar">
                    <Copy size={20} />
                  </button>
                  <button type="button" className="icono-btn icono-btn--peligro" onClick={() => pedirBorrar(p)} title="Eliminar" aria-label="Eliminar">
                    <Trash size={20} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {filtrados.length > visibles.length ? (
            <div className="centrado">
              <button type="button" className="btn btn--suave" onClick={() => setLimite((l) => l + TAM)}>
                Mostrar más
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

export default Productos
