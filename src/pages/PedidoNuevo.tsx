import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from '@phosphor-icons/react'
import { api } from '../api'
import type { MetodoEnvio, Pedido } from '../types'
import { Campo, dinero, useAviso } from '../ui'
import { ItemsEditor, itemsParaApi, subtotalDe, type Linea } from '../pedidos-ui'

const PedidoNuevo = () => {
  const nav = useNavigate()
  const qc = useQueryClient()
  const aviso = useAviso()
  const [f, setF] = useState({ cliente: '', whatsapp: '', ciudad: '', nota: '', metodoEnvio: '' as MetodoEnvio, agencia: '', envioCosto: '', descuento: '' })
  const [lineas, setLineas] = useState<Linea[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})

  const poner = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  const subtotal = subtotalDe(lineas)
  const descuento = Math.max(0, Number(f.descuento) || 0)
  const envio = Math.max(0, Number(f.envioCosto) || 0)
  const total = Math.max(0, Math.round((subtotal - descuento + envio) * 100) / 100)

  const crear = useMutation({
    mutationFn: () =>
      api.post<Pedido>('/api/admin/pedidos', {
        cliente: f.cliente,
        whatsapp: f.whatsapp,
        ciudad: f.ciudad,
        nota: f.nota,
        metodoEnvio: f.metodoEnvio,
        agencia: f.agencia,
        envioCosto: envio,
        descuento,
        items: itemsParaApi(lineas),
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      qc.invalidateQueries({ queryKey: ['resumen'] })
      aviso.ok(`Pedido ${p.codigo} creado`)
      nav(`/pedidos/${p.id}`)
    },
    onError: (e: Error) => aviso.error(e.message),
  })

  const intentar = () => {
    const e: Record<string, string> = {}
    if (!f.cliente.trim()) e.cliente = 'Escribe el nombre de la clienta'
    if (lineas.length === 0) e.items = 'Agrega al menos un producto'
    setErrores(e)
    if (Object.keys(e).length) {
      aviso.error(Object.values(e)[0] ?? 'Revisa el pedido')
      return
    }
    crear.mutate()
  }

  return (
    <div className="pagina pagina--editor">
      <Link to="/pedidos" className="volver">
        <ArrowLeft size={16} /> Pedidos
      </Link>
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">Crear a mano</p>
          <h1 className="pagina__titulo">Nuevo pedido</h1>
        </div>
      </header>

      <div className="editor">
        <div className="editor__principal">
          <section className="tarjeta">
            <h2 className="tarjeta__titulo">Clienta</h2>
            <div className="campos">
              <Campo etiqueta="Nombre" error={errores.cliente}>
                {(id) => <input id={id} className="input" value={f.cliente} maxLength={120} placeholder="Ej. Lucía Fernández" onChange={(e) => poner('cliente', e.target.value)} />}
              </Campo>
              <div className="campos campos--fila">
                <Campo etiqueta="WhatsApp" ayuda="Con o sin el 51. Sirve para avisarle con un toque.">
                  {(id) => <input id={id} className="input" inputMode="tel" value={f.whatsapp} maxLength={30} placeholder="987 654 321" onChange={(e) => poner('whatsapp', e.target.value)} />}
                </Campo>
                <Campo etiqueta="Ciudad">
                  {(id) => <input id={id} className="input" value={f.ciudad} maxLength={80} placeholder="Lima" onChange={(e) => poner('ciudad', e.target.value)} />}
                </Campo>
              </div>
            </div>
          </section>

          <section className="tarjeta">
            <h2 className="tarjeta__titulo">Productos</h2>
            {errores.items ? <p className="campo__error">{errores.items}</p> : null}
            <ItemsEditor lineas={lineas} onChange={setLineas} />
          </section>

          <section className="tarjeta">
            <h2 className="tarjeta__titulo">Envío</h2>
            <p className="texto-suave">Puedes completarlo ahora o más adelante, cuando marques el pedido como enviado.</p>
            <div className="campos campos--fila">
              <Campo etiqueta="Cómo se envía">
                {(id) => (
                  <select id={id} className="input" value={f.metodoEnvio} onChange={(e) => poner('metodoEnvio', e.target.value as MetodoEnvio)}>
                    <option value="">Por definir</option>
                    <option value="motorizado">Motorizado (Lima)</option>
                    <option value="shalom">Shalom (provincias)</option>
                    <option value="otro">Otro</option>
                  </select>
                )}
              </Campo>
              <Campo etiqueta="Destino o agencia">
                {(id) => <input id={id} className="input" value={f.agencia} maxLength={120} placeholder="Ej. Shalom Arequipa" onChange={(e) => poner('agencia', e.target.value)} />}
              </Campo>
            </div>
          </section>
        </div>

        <aside className="editor__lateral">
          <section className="tarjeta tarjeta--pegada">
            <h2 className="tarjeta__titulo">Resumen</h2>
            <dl className="cuentas">
              <div>
                <dt>Subtotal</dt>
                <dd>{dinero(subtotal)}</dd>
              </div>
            </dl>
            <div className="campos">
              <Campo etiqueta="Descuento (S/)">
                {(id) => <input id={id} className="input" type="number" inputMode="decimal" min="0" step="0.01" value={f.descuento} onChange={(e) => poner('descuento', e.target.value)} />}
              </Campo>
              <Campo etiqueta="Costo de envío (S/)">
                {(id) => <input id={id} className="input" type="number" inputMode="decimal" min="0" step="0.01" value={f.envioCosto} onChange={(e) => poner('envioCosto', e.target.value)} />}
              </Campo>
              <Campo etiqueta="Nota interna" ayuda="Solo la ves tú. La clienta no la ve.">
                {(id) => <textarea id={id} className="input input--area" rows={3} maxLength={600} value={f.nota} onChange={(e) => poner('nota', e.target.value)} />}
              </Campo>
            </div>
            <dl className="cuentas cuentas--total">
              <div>
                <dt>Total</dt>
                <dd>{dinero(total)}</dd>
              </div>
            </dl>
            <button type="button" className="btn btn--primario btn--bloque" onClick={intentar} disabled={crear.isPending}>
              {crear.isPending ? 'Creando…' : 'Crear pedido'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default PedidoNuevo
