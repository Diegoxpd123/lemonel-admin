import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowSquareOut, Check, Copy, Image, Plus, Prohibit, Trash, WhatsappLogo } from '@phosphor-icons/react'
import { api, API_URL } from '../api'
import type { EstadoPedido, MetodoEnvio, Pedido } from '../types'
import { Campo, Cargando, dinero, Modal, useAviso, useConfirmar } from '../ui'
import {
  EstadoChip,
  ESTADOS,
  ItemsEditor,
  METODOS_PAGO,
  fechaCorta,
  hoy,
  itemsParaApi,
  lineasDe,
  linkSeguimiento,
  mensajeParaClienta,
  nombreEstado,
  soloDia,
  urlWhatsapp,
  type Linea,
} from '../pedidos-ui'

const desde = (p: Pedido) => ({
  cliente: p.cliente,
  whatsapp: p.whatsapp,
  ciudad: p.ciudad,
  metodoEnvio: p.metodoEnvio,
  agencia: p.agencia,
  seguimiento: p.seguimiento,
  envioCosto: String(p.envioCosto || ''),
  descuento: String(p.descuento || ''),
  nota: p.nota,
})

const capturaUrl = (pagoId: number) => `${API_URL}/api/admin/pedidos/pagos/${pagoId}/captura`

const ModalEstado = ({ pedido, destino, onCerrar, onHecho }: { pedido: Pedido; destino: EstadoPedido; onCerrar: () => void; onHecho: (p: Pedido) => void }) => {
  const aviso = useAviso()
  const [nota, setNota] = useState('')
  const [metodo, setMetodo] = useState<MetodoEnvio>(pedido.metodoEnvio)
  const [agencia, setAgencia] = useState(pedido.agencia)
  const [seguimiento, setSeguimiento] = useState(pedido.seguimiento)
  const [error, setError] = useState('')
  const info = ESTADOS.find((e) => e.id === destino)

  const guardar = useMutation({
    mutationFn: () =>
      api.post<Pedido>(`/api/admin/pedidos/${pedido.id}/estado`, {
        estado: destino,
        nota,
        ...(destino === 'enviado' ? { metodoEnvio: metodo, agencia, seguimiento } : {}),
      }),
    onSuccess: onHecho,
    onError: (e: Error) => aviso.error(e.message),
  })

  const confirmar = () => {
    if (destino === 'enviado' && !metodo) {
      setError('Elige cómo se envía el pedido')
      return
    }
    guardar.mutate()
  }

  return (
    <Modal
      abierto
      titulo={`Cambiar a “${info?.largo ?? destino}”`}
      onCerrar={onCerrar}
      ancho={520}
      pie={
        <>
          <button type="button" className="btn btn--suave" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primario" onClick={confirmar} disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Confirmar cambio'}
          </button>
        </>
      }
    >
      <div className="campos">
        {destino === 'enviado' ? (
          <>
            <Campo etiqueta="Cómo se envía" error={error}>
              {(id) => (
                <select id={id} className="input" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoEnvio)}>
                  <option value="">Elige una opción</option>
                  <option value="motorizado">Motorizado (Lima)</option>
                  <option value="shalom">Shalom (provincias)</option>
                  <option value="otro">Otro</option>
                </select>
              )}
            </Campo>
            <Campo etiqueta="Destino o agencia" ayuda="Lo ve la clienta en su link.">
              {(id) => <input id={id} className="input" value={agencia} maxLength={120} placeholder="Ej. Shalom Arequipa - Av. Ejército" onChange={(e) => setAgencia(e.target.value)} />}
            </Campo>
            <Campo etiqueta="Código de seguimiento" ayuda="Opcional. La clienta puede copiarlo desde su link.">
              {(id) => <input id={id} className="input" value={seguimiento} maxLength={60} onChange={(e) => setSeguimiento(e.target.value)} />}
            </Campo>
          </>
        ) : null}
        <Campo etiqueta="Mensaje para la clienta (opcional)" ayuda="Lo verá en su link de seguimiento, en “Mensajes de Lemonel”.">
          {(id) => <textarea id={id} className="input input--area" rows={3} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} />}
        </Campo>
      </div>
    </Modal>
  )
}

const ModalPago = ({ pedido, onCerrar, onHecho }: { pedido: Pedido; onCerrar: () => void; onHecho: (p: Pedido) => void }) => {
  const aviso = useAviso()
  const [monto, setMonto] = useState(pedido.saldo > 0 ? String(pedido.saldo) : '')
  const [metodo, setMetodo] = useState('Yape')
  const [fecha, setFecha] = useState(hoy())
  const [nota, setNota] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [error, setError] = useState('')
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!archivo) {
      setVista(null)
      return
    }
    const u = URL.createObjectURL(archivo)
    setVista(u)
    return () => URL.revokeObjectURL(u)
  }, [archivo])

  const guardar = useMutation({
    mutationFn: () => {
      const f = new FormData()
      f.set('monto', monto)
      f.set('metodo', metodo)
      f.set('fecha', fecha)
      f.set('nota', nota)
      if (archivo) f.set('captura', archivo)
      return api.post<Pedido>(`/api/admin/pedidos/${pedido.id}/pagos`, f)
    },
    onSuccess: (p) => {
      aviso.ok('Pago registrado')
      onHecho(p)
    },
    onError: (e: Error) => aviso.error(e.message),
  })

  const confirmar = () => {
    const n = Number(monto)
    if (!Number.isFinite(n) || n <= 0) {
      setError('Escribe el monto recibido')
      return
    }
    setError('')
    guardar.mutate()
  }

  return (
    <Modal
      abierto
      titulo="Registrar pago"
      onCerrar={onCerrar}
      ancho={520}
      pie={
        <>
          <button type="button" className="btn btn--suave" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primario" onClick={confirmar} disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Registrar pago'}
          </button>
        </>
      }
    >
      <div className="campos">
        <div className="campos campos--fila">
          <Campo etiqueta="Monto (S/)" error={error}>
            {(id) => <input id={id} className="input" type="number" inputMode="decimal" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Método">
            {(id) => (
              <select id={id} className="input" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                {METODOS_PAGO.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            )}
          </Campo>
        </div>
        <Campo etiqueta="Fecha del pago">{(id) => <input id={id} className="input input--corto" type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} />}</Campo>
        <Campo etiqueta="Nota (opcional)">{(id) => <input id={id} className="input" value={nota} maxLength={200} placeholder="Ej. Separó con el adelanto" onChange={(e) => setNota(e.target.value)} />}</Campo>
        <div className="campo">
          <span className="campo__etiqueta">Captura del pago (opcional)</span>
          <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          {vista ? (
            <div className="captura-prev">
              <img src={vista} alt="Vista previa de la captura" />
              <button type="button" className="btn btn--suave" onClick={() => setArchivo(null)}>
                Quitar captura
              </button>
            </div>
          ) : (
            <button type="button" className="subir subir--chico" onClick={() => entrada.current?.click()}>
              <Image size={26} weight="light" />
              <span className="subir__texto">Toca para elegir la captura</span>
              <span className="subir__ayuda">La clienta no la ve. Solo queda guardada para ti.</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

const PedidoDetalle = () => {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const aviso = useAviso()
  const confirmar = useConfirmar()
  const idNum = Number(id)

  const q = useQuery({ queryKey: ['pedido', idNum], queryFn: () => api.get<Pedido>(`/api/admin/pedidos/${idNum}`), enabled: Number.isInteger(idNum) && idNum > 0 })

  const [f, setF] = useState<ReturnType<typeof desde> | null>(null)
  const base = useRef('')
  const [destino, setDestino] = useState<EstadoPedido | null>(null)
  const [pagando, setPagando] = useState(false)
  const [editandoItems, setEditandoItems] = useState(false)
  const [lineas, setLineas] = useState<Linea[]>([])
  const [captura, setCaptura] = useState<number | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [avisar, setAvisar] = useState(false)

  const p = q.data

  useEffect(() => {
    if (!p) return
    const nuevo = desde(p)
    if (f === null || JSON.stringify(f) === base.current) {
      setF(nuevo)
      base.current = JSON.stringify(nuevo)
    }
  }, [p])

  const poner = (nuevo: Pedido) => {
    qc.setQueryData(['pedido', idNum], nuevo)
    qc.invalidateQueries({ queryKey: ['pedidos'] })
    qc.invalidateQueries({ queryKey: ['resumen'] })
  }

  const guardarDatos = useMutation({
    mutationFn: () =>
      api.put<Pedido>(`/api/admin/pedidos/${idNum}`, {
        ...f,
        envioCosto: Math.max(0, Number(f?.envioCosto) || 0),
        descuento: Math.max(0, Number(f?.descuento) || 0),
      }),
    onSuccess: (nuevo) => {
      const d = desde(nuevo)
      base.current = JSON.stringify(d)
      setF(d)
      poner(nuevo)
      aviso.ok('Datos guardados')
    },
    onError: (e: Error) => aviso.error(e.message),
  })

  const guardarItems = useMutation({
    mutationFn: () => api.put<Pedido>(`/api/admin/pedidos/${idNum}`, { items: itemsParaApi(lineas) }),
    onSuccess: (nuevo) => {
      poner(nuevo)
      setEditandoItems(false)
      aviso.ok('Productos actualizados')
    },
    onError: (e: Error) => aviso.error(e.message),
  })

  const cancelar = useMutation({
    mutationFn: (cancelado: boolean) => api.post<Pedido>(`/api/admin/pedidos/${idNum}/cancelar`, { cancelado, nota: cancelado ? motivo : '' }),
    onSuccess: (nuevo) => {
      poner(nuevo)
      setCancelando(false)
      setMotivo('')
      aviso.ok(nuevo.cancelado ? 'Pedido cancelado' : 'Pedido reactivado')
    },
    onError: (e: Error) => aviso.error(e.message),
  })

  const quitarPago = useMutation({
    mutationFn: (pagoId: number) => api.del<Pedido>(`/api/admin/pedidos/${idNum}/pagos/${pagoId}`),
    onSuccess: (nuevo) => {
      poner(nuevo)
      aviso.ok('Pago eliminado')
    },
    onError: (e: Error) => aviso.error(e.message),
  })

  const nuevoLink = useMutation({
    mutationFn: () => api.post<Pedido>(`/api/admin/pedidos/${idNum}/token`),
    onSuccess: (nuevo) => {
      poner(nuevo)
      aviso.ok('Link nuevo generado. El anterior ya no funciona.')
    },
    onError: (e: Error) => aviso.error(e.message),
  })

  if (q.isLoading || !f) return <Cargando />
  if (!p) return <p className="texto-suave">No se encontró el pedido.</p>

  const indice = ESTADOS.findIndex((e) => e.id === p.estado)
  const link = linkSeguimiento(p.token)
  const sucio = JSON.stringify(f) !== base.current
  const campo = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => (x ? { ...x, [k]: v } : x))

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link)
      aviso.ok('Link copiado')
    } catch {
      aviso.error('No se pudo copiar. Selecciónalo y cópialo a mano.')
    }
  }

  const pedirBorrarPago = async (pagoId: number, monto: number) => {
    const si = await confirmar('Eliminar pago', `Se eliminará el pago de ${dinero(monto)} y su captura. Esta acción no se puede deshacer.`, { confirmar: 'Eliminar', peligro: true })
    if (si) quitarPago.mutate(pagoId)
  }

  const pedirBorrar = async () => {
    const si = await confirmar('Eliminar pedido', `Se eliminará el pedido ${p.codigo} con sus pagos y capturas, y el link de la clienta dejará de funcionar. Esta acción no se puede deshacer.`, { confirmar: 'Eliminar', peligro: true })
    if (!si) return
    try {
      await api.del(`/api/admin/pedidos/${idNum}`)
      qc.removeQueries({ queryKey: ['pedido', idNum] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      qc.invalidateQueries({ queryKey: ['resumen'] })
      aviso.ok('Pedido eliminado')
      nav('/pedidos')
    } catch (e) {
      aviso.error((e as Error).message)
    }
  }

  const pedirNuevoLink = async () => {
    const si = await confirmar('Generar link nuevo', 'El link anterior dejará de funcionar. Tendrás que enviarle el nuevo a la clienta.', { confirmar: 'Generar nuevo' })
    if (si) nuevoLink.mutate()
  }

  const fechaPaso = (estado: string) => {
    const e = [...p.eventos].reverse().find((x) => x.estado === estado)
    return e ? fechaCorta(e.fecha) : ''
  }

  return (
    <div className="pagina pagina--editor">
      <Link to="/pedidos" className="volver">
        <ArrowLeft size={16} /> Pedidos
      </Link>
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">Pedido del {soloDia(p.creado)}</p>
          <h1 className="pagina__titulo pedido-titulo">
            {p.codigo} <EstadoChip estado={p.estado} cancelado={p.cancelado} />
          </h1>
          <p className="texto-suave">
            {p.cliente || 'Sin nombre todavía'}
            {p.origen === 'tienda' ? ' · Hecho desde la tienda' : ''}
          </p>
        </div>
        <div className="acciones-cab">
          <button type="button" className="btn btn--suave" onClick={copiar}>
            <Copy size={18} /> Copiar link
          </button>
          <a className="btn btn--primario" href={urlWhatsapp(p.whatsapp, mensajeParaClienta(p))} target="_blank" rel="noreferrer">
            <WhatsappLogo size={20} /> Avisar por WhatsApp
          </a>
        </div>
      </header>

      {avisar ? (
        <div className="aviso-banner" role="status">
          <Check size={20} weight="bold" />
          <p>
            Estado actualizado a <strong>{nombreEstado(p.estado)}</strong>. ¿Le avisas a la clienta?
          </p>
          <a className="btn btn--primario" href={urlWhatsapp(p.whatsapp, mensajeParaClienta(p))} target="_blank" rel="noreferrer" onClick={() => setAvisar(false)}>
            <WhatsappLogo size={18} /> Avisar por WhatsApp
          </a>
          <button type="button" className="btn btn--suave" onClick={() => setAvisar(false)}>
            Ahora no
          </button>
        </div>
      ) : null}

      {p.cancelado ? (
        <div className="aviso-banner aviso-banner--rojo" role="status">
          <Prohibit size={20} weight="bold" />
          <p>
            Este pedido está <strong>cancelado</strong>. La clienta lo ve así en su link.
          </p>
          <button type="button" className="btn btn--suave" onClick={() => cancelar.mutate(false)} disabled={cancelar.isPending}>
            Reactivar pedido
          </button>
        </div>
      ) : null}

      <div className="editor">
        <div className="editor__principal">
          <section className="tarjeta">
            <h2 className="tarjeta__titulo">Seguimiento</h2>
            <p className="texto-suave">Toca un paso para cambiar el estado. La clienta lo ve al instante en su link.</p>
            <ol className="pasos-pedido">
              {ESTADOS.map((e, i) => {
                const hecho = i <= indice
                const actual = i === indice
                return (
                  <li key={e.id}>
                    <button type="button" className={`paso-pedido${hecho ? ' paso-pedido--hecho' : ''}${actual ? ' paso-pedido--actual' : ''}`} aria-current={actual ? 'step' : undefined} onClick={() => setDestino(e.id)}>
                      <span className="paso-pedido__perla" aria-hidden="true">
                        {hecho ? <Check size={14} weight="bold" /> : i + 1}
                      </span>
                      <span className="paso-pedido__texto">
                        <strong>{e.largo}</strong>
                        <small>{hecho ? fechaPaso(e.id) || 'Hecho' : 'Marcar'}</small>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            {p.estado === 'enviado' || p.estado === 'entregado' ? (
              <p className="envio-resumen">
                <strong>{p.metodoEnvio === 'shalom' ? 'Shalom' : p.metodoEnvio === 'motorizado' ? 'Motorizado' : p.metodoEnvio ? 'Otro courier' : 'Envío'}</strong>
                {p.agencia ? ` · ${p.agencia}` : ''}
                {p.seguimiento ? ` · Código ${p.seguimiento}` : ''}
              </p>
            ) : null}
          </section>

          <section className="tarjeta">
            <div className="tarjeta__cabecera">
              <h2 className="tarjeta__titulo">Productos</h2>
              <button
                type="button"
                className="btn btn--suave"
                onClick={() => {
                  setLineas(lineasDe(p.items))
                  setEditandoItems(true)
                }}
              >
                Editar productos
              </button>
            </div>
            <ul className="pe-lista pe-lista--lectura">
              {p.items.map((i) => (
                <li key={i.id} className="pe-item pe-item--lectura">
                  {i.foto ? <img src={i.foto} alt="" width="52" height="64" /> : <span className="producto__sinfoto">Sin foto</span>}
                  <div className="pe-item__info">
                    <p className="pe-item__n">{i.nombre}</p>
                    {i.detalle ? <p className="texto-suave">{i.detalle}</p> : null}
                    {i.sku ? <p className="texto-suave">Cód. {i.sku}</p> : null}
                  </div>
                  <p className="pe-item__q">
                    {i.cantidad} × {dinero(i.precio)}
                  </p>
                  <p className="pe-item__sub">{dinero(i.precio * i.cantidad)}</p>
                </li>
              ))}
            </ul>
            <dl className="cuentas">
              <div>
                <dt>Subtotal</dt>
                <dd>{dinero(p.subtotal)}</dd>
              </div>
              {p.descuento > 0 ? (
                <div>
                  <dt>Descuento</dt>
                  <dd>− {dinero(p.descuento)}</dd>
                </div>
              ) : null}
              {p.envioCosto > 0 ? (
                <div>
                  <dt>Envío</dt>
                  <dd>{dinero(p.envioCosto)}</dd>
                </div>
              ) : null}
            </dl>
            <dl className="cuentas cuentas--total">
              <div>
                <dt>Total</dt>
                <dd>{dinero(p.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="tarjeta">
            <div className="tarjeta__cabecera">
              <h2 className="tarjeta__titulo">Pagos</h2>
              <button type="button" className="btn btn--primario" onClick={() => setPagando(true)} disabled={p.cancelado}>
                <Plus size={18} /> Registrar pago
              </button>
            </div>
            <div className="pago-resumen">
              <div>
                <span>Total</span>
                <strong>{dinero(p.total)}</strong>
              </div>
              <div>
                <span>Pagado</span>
                <strong>{dinero(p.pagado)}</strong>
              </div>
              <div className={p.saldo > 0 ? 'pago-resumen__debe' : 'pago-resumen__ok'}>
                <span>{p.saldo > 0 ? 'Falta' : 'Saldo'}</span>
                <strong>{p.saldo > 0 ? dinero(p.saldo) : 'Al día'}</strong>
              </div>
            </div>
            {p.pagos.length === 0 ? (
              <p className="texto-suave">Todavía no registraste pagos. Al registrar el primero, el pedido pasa solo a “Pago confirmado”.</p>
            ) : (
              <ul className="pagos">
                {p.pagos.map((x) => (
                  <li key={x.id} className="pago">
                    {x.tieneCaptura ? (
                      <button type="button" className="captura-mini" onClick={() => setCaptura(x.id)} aria-label="Ver captura del pago">
                        <img src={capturaUrl(x.id)} alt="" loading="lazy" width="44" height="56" />
                      </button>
                    ) : (
                      <span className="captura-mini captura-mini--vacia" aria-hidden="true">
                        <Image size={20} weight="light" />
                      </span>
                    )}
                    <div className="pago__info">
                      <p>
                        <strong>{dinero(x.monto)}</strong> · {x.metodo}
                      </p>
                      <p className="texto-suave">
                        {soloDia(x.fecha)}
                        {x.nota ? ` · ${x.nota}` : ''}
                      </p>
                    </div>
                    <button type="button" className="icono-btn icono-btn--peligro" onClick={() => pedirBorrarPago(x.id, x.monto)} aria-label={`Eliminar pago de ${dinero(x.monto)}`}>
                      <Trash size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="editor__lateral">
          <section className="tarjeta">
            <h2 className="tarjeta__titulo">Link para la clienta</h2>
            <p className="texto-suave">Se lo envías por WhatsApp. Ahí ve el estado de su pedido, sin entrar a ninguna cuenta.</p>
            <input className="input link-campo" readOnly value={link} aria-label="Link de seguimiento" onFocus={(e) => e.currentTarget.select()} />
            <div className="link-botones">
              <button type="button" className="btn btn--suave" onClick={copiar}>
                <Copy size={18} /> Copiar
              </button>
              <a className="btn btn--suave" href={link} target="_blank" rel="noreferrer">
                <ArrowSquareOut size={18} /> Abrir
              </a>
            </div>
            <button type="button" className="enlace-btn" onClick={pedirNuevoLink}>
              Generar un link nuevo
            </button>
          </section>

          <section className="tarjeta">
            <h2 className="tarjeta__titulo">Clienta y envío</h2>
            <div className="campos">
              <Campo etiqueta="Nombre">{(i) => <input id={i} className="input" value={f.cliente} maxLength={120} onChange={(e) => campo('cliente', e.target.value)} />}</Campo>
              <Campo etiqueta="WhatsApp">{(i) => <input id={i} className="input" inputMode="tel" value={f.whatsapp} maxLength={30} onChange={(e) => campo('whatsapp', e.target.value)} />}</Campo>
              <Campo etiqueta="Ciudad">{(i) => <input id={i} className="input" value={f.ciudad} maxLength={80} onChange={(e) => campo('ciudad', e.target.value)} />}</Campo>
              <Campo etiqueta="Cómo se envía">
                {(i) => (
                  <select id={i} className="input" value={f.metodoEnvio} onChange={(e) => campo('metodoEnvio', e.target.value as MetodoEnvio)}>
                    <option value="">Por definir</option>
                    <option value="motorizado">Motorizado (Lima)</option>
                    <option value="shalom">Shalom (provincias)</option>
                    <option value="otro">Otro</option>
                  </select>
                )}
              </Campo>
              <Campo etiqueta="Destino o agencia">{(i) => <input id={i} className="input" value={f.agencia} maxLength={120} onChange={(e) => campo('agencia', e.target.value)} />}</Campo>
              <Campo etiqueta="Código de seguimiento">{(i) => <input id={i} className="input" value={f.seguimiento} maxLength={60} onChange={(e) => campo('seguimiento', e.target.value)} />}</Campo>
              <div className="campos campos--fila">
                <Campo etiqueta="Envío (S/)">{(i) => <input id={i} className="input" type="number" inputMode="decimal" min="0" step="0.01" value={f.envioCosto} onChange={(e) => campo('envioCosto', e.target.value)} />}</Campo>
                <Campo etiqueta="Descuento (S/)">{(i) => <input id={i} className="input" type="number" inputMode="decimal" min="0" step="0.01" value={f.descuento} onChange={(e) => campo('descuento', e.target.value)} />}</Campo>
              </div>
              <Campo etiqueta="Nota interna" ayuda="Solo la ves tú.">
                {(i) => <textarea id={i} className="input input--area" rows={3} maxLength={600} value={f.nota} onChange={(e) => campo('nota', e.target.value)} />}
              </Campo>
            </div>
            <button type="button" className="btn btn--primario btn--bloque" onClick={() => guardarDatos.mutate()} disabled={!sucio || guardarDatos.isPending}>
              {guardarDatos.isPending ? 'Guardando…' : 'Guardar datos'}
            </button>
            {sucio && !guardarDatos.isPending ? <p className="guardar__aviso">Tienes cambios sin guardar</p> : null}
          </section>

          <section className="tarjeta">
            <h2 className="tarjeta__titulo">Historial</h2>
            <ul className="historial">
              {[...p.eventos].reverse().map((e) => (
                <li key={e.id}>
                  <p>
                    <strong>{nombreEstado(e.estado)}</strong>
                    <span className="texto-suave"> · {fechaCorta(e.fecha)}</span>
                  </p>
                  {e.nota ? <p className="historial__nota">“{e.nota}”</p> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="tarjeta tarjeta--peligro">
            <h2 className="tarjeta__titulo">Zona delicada</h2>
            <div className="campos">
              {p.cancelado ? null : (
                <button type="button" className="btn btn--peligro-suave btn--bloque" onClick={() => setCancelando(true)}>
                  <Prohibit size={18} /> Cancelar pedido
                </button>
              )}
              <button type="button" className="btn btn--peligro-suave btn--bloque" onClick={pedirBorrar}>
                <Trash size={18} /> Eliminar pedido
              </button>
            </div>
          </section>
        </aside>
      </div>

      {destino ? (
        <ModalEstado
          key={destino}
          pedido={p}
          destino={destino}
          onCerrar={() => setDestino(null)}
          onHecho={(nuevo) => {
            poner(nuevo)
            setDestino(null)
            setAvisar(true)
          }}
        />
      ) : null}

      {pagando ? (
        <ModalPago
          pedido={p}
          onCerrar={() => setPagando(false)}
          onHecho={(nuevo) => {
            poner(nuevo)
            setPagando(false)
          }}
        />
      ) : null}

      <Modal
        abierto={editandoItems}
        titulo="Editar productos"
        onCerrar={() => setEditandoItems(false)}
        ancho={860}
        pie={
          <>
            <button type="button" className="btn btn--suave" onClick={() => setEditandoItems(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primario" onClick={() => guardarItems.mutate()} disabled={guardarItems.isPending || lineas.length === 0}>
              {guardarItems.isPending ? 'Guardando…' : 'Guardar productos'}
            </button>
          </>
        }
      >
        <ItemsEditor lineas={lineas} onChange={setLineas} />
      </Modal>

      <Modal abierto={captura !== null} titulo="Captura del pago" onCerrar={() => setCaptura(null)} ancho={560}>
        {captura !== null ? <img className="captura-grande" src={capturaUrl(captura)} alt="Captura del pago" /> : null}
      </Modal>

      <Modal
        abierto={cancelando}
        titulo="Cancelar pedido"
        onCerrar={() => setCancelando(false)}
        ancho={480}
        pie={
          <>
            <button type="button" className="btn btn--suave" onClick={() => setCancelando(false)}>
              Volver
            </button>
            <button type="button" className="btn btn--peligro" onClick={() => cancelar.mutate(true)} disabled={cancelar.isPending}>
              Cancelar pedido
            </button>
          </>
        }
      >
        <p className="texto-suave">La clienta verá en su link que el pedido fue cancelado. Puedes reactivarlo cuando quieras.</p>
        <Campo etiqueta="Motivo (opcional)" ayuda="Lo verá la clienta.">
          {(i) => <input id={i} className="input" value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} />}
        </Campo>
      </Modal>
    </div>
  )
}

export default PedidoDetalle
