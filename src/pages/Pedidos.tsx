import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { MagnifyingGlass, Plus, Storefront } from '@phosphor-icons/react'
import { api } from '../api'
import type { ListaPedidos } from '../types'
import { Cargando, dinero, Vacio } from '../ui'
import { EstadoChip, fechaCorta } from '../pedidos-ui'

const filtros = [
  { id: 'todos', t: 'Todos' },
  { id: 'porenviar', t: 'Por enviar' },
  { id: 'recibido', t: 'Recibidos' },
  { id: 'pagado', t: 'Pagados' },
  { id: 'preparando', t: 'Preparando' },
  { id: 'enviado', t: 'Enviados' },
  { id: 'entregado', t: 'Entregados' },
  { id: 'cancelado', t: 'Cancelados' },
]

const Pedidos = () => {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? 'todos'
  const q = params.get('q') ?? ''
  const [texto, setTexto] = useState(q)

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (texto !== q) {
        const p = new URLSearchParams(params)
        if (texto) p.set('q', texto)
        else p.delete('q')
        setParams(p, { replace: true })
      }
    }, 300)
    return () => window.clearTimeout(t)
  }, [texto, q, params, setParams])

  const lista = useQuery({
    queryKey: ['pedidos', estado, q],
    queryFn: () => api.get<ListaPedidos>(`/api/admin/pedidos?estado=${encodeURIComponent(estado === 'todos' ? '' : estado)}&q=${encodeURIComponent(q)}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

  const fijar = (id: string) => {
    const p = new URLSearchParams(params)
    if (id === 'todos') p.delete('estado')
    else p.set('estado', id)
    setParams(p, { replace: true })
  }

  if (lista.isLoading) return <Cargando />

  const pedidos = lista.data?.pedidos ?? []
  const conteos = lista.data?.conteos ?? {}
  const total = Object.values(conteos).reduce((a, b) => a + b, 0)

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">{total} pedido(s) registrados</p>
          <h1 className="pagina__titulo">Pedidos</h1>
        </div>
        <Link to="/pedidos/nuevo" className="btn btn--primario">
          <Plus size={18} /> Nuevo pedido
        </Link>
      </header>

      <div className="filtros">
        <label className="buscador">
          <MagnifyingGlass size={20} />
          <input type="search" className="buscador__input" placeholder="Buscar por código, nombre, ciudad o teléfono" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar pedidos" />
        </label>
      </div>

      <div className="chips" role="group" aria-label="Estado del pedido">
        {filtros.map((f) => (
          <button key={f.id} type="button" className={`chip${estado === f.id ? ' chip--activo' : ''}`} aria-pressed={estado === f.id} onClick={() => fijar(f.id)}>
            {f.t}
            {f.id !== 'todos' && conteos[f.id] ? <span className="chip__n">{conteos[f.id]}</span> : null}
          </button>
        ))}
      </div>

      {pedidos.length === 0 ? (
        <Vacio
          titulo={total === 0 ? 'Todavía no hay pedidos' : 'No encontramos pedidos'}
          texto={total === 0 ? 'Cuando una clienta termine su carrito por WhatsApp, su pedido aparecerá aquí. También puedes crear uno a mano.' : 'Prueba con otra búsqueda o cambia el filtro.'}
          accion={
            total === 0 ? (
              <Link to="/pedidos/nuevo" className="btn btn--primario">
                <Plus size={18} /> Crear un pedido
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="pedidos">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link to={`/pedidos/${p.id}`} className={`pedido${p.cancelado ? ' pedido--cancelado' : ''}`}>
                <div className="pedido__info">
                  <p className="pedido__codigo">
                    {p.codigo}
                    {p.origen === 'tienda' ? (
                      <span className="pedido__origen" title="Pedido hecho desde la tienda">
                        <Storefront size={14} /> Tienda
                      </span>
                    ) : null}
                  </p>
                  <p className="pedido__cliente">{p.cliente || 'Sin nombre todavía'}</p>
                  <p className="texto-suave pedido__resumen">
                    {p.piezas} pieza(s) · {p.resumen}
                    {p.ciudad ? ` · ${p.ciudad}` : ''}
                  </p>
                </div>
                <div className="pedido__lado">
                  <EstadoChip estado={p.estado} cancelado={p.cancelado} />
                  <p className="pedido__total">{dinero(p.total)}</p>
                  {!p.cancelado && p.saldo > 0 ? <p className="pedido__debe">Falta {dinero(p.saldo)}</p> : <p className="texto-suave pedido__fecha">{fechaCorta(p.creado)}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Pedidos
