import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Trash, UploadSimple } from '@phosphor-icons/react'
import { api } from '../api'
import type { Ajustes as TAjustes, HeroVideo } from '../types'
import { Campo, Cargando, useAviso, useConfirmar } from '../ui'

const pestanas = [
  { id: 'contacto', t: 'Contacto' },
  { id: 'envios', t: 'Envíos y reservas' },
  { id: 'descuentos', t: 'Descuentos por cantidad' },
  { id: 'hero', t: 'Video de inicio' },
]

const Contacto = ({ datos }: { datos: TAjustes['contacto'] }) => {
  const qc = useQueryClient()
  const aviso = useAviso()
  const [f, setF] = useState(datos)
  useEffect(() => setF(datos), [datos])
  const g = useMutation({
    mutationFn: () => api.put('/api/admin/ajustes/contacto', f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajustes'] })
      aviso.ok('Contacto guardado')
    },
    onError: (e) => aviso.error(e.message),
  })
  return (
    <section className="tarjeta tarjeta--angosta">
      <h2 className="tarjeta__titulo">Contacto de la tienda</h2>
      <div className="campos">
        <Campo etiqueta="WhatsApp de pedidos" ayuda="Con código de país y sin espacios. Ej. 51981101636. Aquí llegan todos los pedidos.">
          {(i) => <input id={i} className="input" inputMode="numeric" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value.replace(/\D/g, '') })} maxLength={15} />}
        </Campo>
        <Campo etiqueta="Instagram" ayuda="Sin @.">
          {(i) => <input id={i} className="input" value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value.replace(/^@/, '') })} maxLength={60} />}
        </Campo>
        <Campo etiqueta="TikTok" ayuda="Sin @.">
          {(i) => <input id={i} className="input" value={f.tiktok} onChange={(e) => setF({ ...f, tiktok: e.target.value.replace(/^@/, '') })} maxLength={60} />}
        </Campo>
        <Campo etiqueta="Correo (opcional)">{(i) => <input id={i} type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={120} />}</Campo>
      </div>
      <div className="tarjeta__pie">
        <button type="button" className="btn btn--primario" onClick={() => g.mutate()} disabled={g.isPending || f.whatsapp.length < 8}>
          {g.isPending ? 'Guardando…' : 'Guardar contacto'}
        </button>
      </div>
    </section>
  )
}

const Envios = ({ datos }: { datos: TAjustes['envios'] }) => {
  const qc = useQueryClient()
  const aviso = useAviso()
  const [f, setF] = useState(datos)
  useEffect(() => setF(datos), [datos])
  const num = (k: keyof TAjustes['envios']) => ({ type: 'number', min: 0, value: f[k] as number, onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: Number(e.target.value) }) })
  const g = useMutation({
    mutationFn: () => api.put('/api/admin/ajustes/envios', f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajustes'] })
      aviso.ok('Envíos guardados')
    },
    onError: (e) => aviso.error(e.message),
  })
  return (
    <section className="tarjeta tarjeta--angosta">
      <h2 className="tarjeta__titulo">Envíos y reservas</h2>
      <div className="campos">
        <div className="fila-2">
          <Campo etiqueta="Motorizado en Lima (S/)">{(i) => <input id={i} className="input" {...num('motorizadoLima')} />}</Campo>
          <Campo etiqueta="Shalom a provincias (S/)">{(i) => <input id={i} className="input" {...num('shalom')} />}</Campo>
        </div>
        <Campo etiqueta="Días de envío">{(i) => <input id={i} className="input" value={f.dias} onChange={(e) => setF({ ...f, dias: e.target.value })} maxLength={120} />}</Campo>
        <div className="fila-3">
          <Campo etiqueta="Separar con (S/)">{(i) => <input id={i} className="input" {...num('separar')} />}</Campo>
          <Campo etiqueta="Meses para completar">{(i) => <input id={i} className="input" {...num('mesesSeparar')} />}</Campo>
          <Campo etiqueta="Horas para cambio">{(i) => <input id={i} className="input" {...num('horasCambio')} />}</Campo>
        </div>
      </div>
      <div className="tarjeta__pie">
        <button type="button" className="btn btn--primario" onClick={() => g.mutate()} disabled={g.isPending}>
          {g.isPending ? 'Guardando…' : 'Guardar envíos'}
        </button>
      </div>
    </section>
  )
}

const Descuentos = ({ datos, evento }: { datos: TAjustes['descuentos']; evento: TAjustes['evento'] }) => {
  const qc = useQueryClient()
  const aviso = useAviso()
  const [lista, setLista] = useState(datos)
  const [ev, setEv] = useState(evento)
  useEffect(() => setLista(datos), [datos])
  useEffect(() => setEv(evento), [evento])
  const g = useMutation({
    mutationFn: async () => {
      const ordenada = [...lista].sort((a, b) => a.desde - b.desde)
      await api.put('/api/admin/ajustes/descuentos', ordenada)
      await api.put('/api/admin/ajustes/evento', ev)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajustes'] })
      aviso.ok('Descuentos guardados')
    },
    onError: (e) => aviso.error(e.message),
  })
  return (
    <section className="tarjeta tarjeta--angosta">
      <h2 className="tarjeta__titulo">Descuentos por cantidad</h2>
      <p className="texto-suave">Para pedidos de eventos, misas y regalos corporativos. El descuento se aplica según la cantidad de piezas del pedido.</p>
      <ul className="escala">
        {lista.map((d, i) => (
          <li key={i} className="escala__fila">
            <Campo etiqueta="Desde (piezas)">{(k) => <input id={k} className="input" type="number" min={1} value={d.desde} onChange={(e) => setLista(lista.map((x, j) => (j === i ? { ...x, desde: Number(e.target.value) } : x)))} />}</Campo>
            <Campo etiqueta="Descuento (%)">{(k) => <input id={k} className="input" type="number" min={0} max={90} value={d.porcentaje} onChange={(e) => setLista(lista.map((x, j) => (j === i ? { ...x, porcentaje: Number(e.target.value) } : x)))} />}</Campo>
            <button type="button" className="icono-btn icono-btn--peligro escala__quitar" onClick={() => setLista(lista.filter((_, j) => j !== i))} aria-label="Quitar escala">
              <Trash size={20} />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn--suave" onClick={() => setLista([...lista, { desde: (lista.at(-1)?.desde ?? 0) + 10, porcentaje: 10 }])} disabled={lista.length >= 12}>
        <Plus size={18} /> Agregar escala
      </button>
      <div className="campos campos--separado">
        <div className="fila-2">
          <Campo etiqueta="Mínimo para pedido de evento (piezas)">{(i) => <input id={i} className="input" type="number" min={1} value={ev.minimo} onChange={(e) => setEv({ ...ev, minimo: Number(e.target.value) })} />}</Campo>
          <Campo etiqueta="Días de anticipación">{(i) => <input id={i} className="input" type="number" min={0} value={ev.diasAnticipacion} onChange={(e) => setEv({ ...ev, diasAnticipacion: Number(e.target.value) })} />}</Campo>
        </div>
      </div>
      <div className="tarjeta__pie">
        <button type="button" className="btn btn--primario" onClick={() => g.mutate()} disabled={g.isPending}>
          {g.isPending ? 'Guardando…' : 'Guardar descuentos'}
        </button>
      </div>
    </section>
  )
}

const Hero = ({ datos }: { datos: HeroVideo[] }) => {
  const qc = useQueryClient()
  const aviso = useAviso()
  const confirmar = useConfirmar()
  const video = useRef<HTMLInputElement>(null)
  const poster = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [elegido, setElegido] = useState<File | null>(null)
  const [portada, setPortada] = useState<File | null>(null)

  const actualizar = (lista: HeroVideo[]) => qc.setQueryData<TAjustes>(['ajustes'], (a) => (a ? { ...a, hero: lista } : a))

  const subir = async () => {
    if (!elegido) return
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('video', elegido)
      if (portada) fd.append('poster', portada)
      actualizar(await api.post<HeroVideo[]>('/api/admin/hero', fd))
      setElegido(null)
      setPortada(null)
      if (video.current) video.current.value = ''
      if (poster.current) poster.current.value = ''
      aviso.ok('Video agregado')
    } catch (e) {
      aviso.error((e as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  const quitar = async (i: number) => {
    const si = await confirmar('Quitar video', 'El video dejará de mostrarse en el inicio de la tienda.', { confirmar: 'Quitar', peligro: true })
    if (!si) return
    try {
      actualizar(await api.del<HeroVideo[]>(`/api/admin/hero/${i}`))
    } catch (e) {
      aviso.error((e as Error).message)
    }
  }

  const mover = async (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= datos.length) return
    const indices = datos.map((_, k) => k)
    ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
    try {
      actualizar(await api.put<HeroVideo[]>('/api/admin/hero/orden', { indices }))
    } catch (e) {
      aviso.error((e as Error).message)
    }
  }

  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Video de la portada</h2>
      <p className="texto-suave">Se reproducen solos y sin sonido en la portada de la tienda, uno tras otro. Usa videos cortos (de 8 a 15 segundos), en MP4 y de menos de 80 MB.</p>

      {datos.length === 0 ? (
        <p className="aviso-caja">Todavía no subiste videos. Mientras tanto, la tienda muestra los videos de muestra.</p>
      ) : (
        <ul className="videos">
          {datos.map((h, i) => (
            <li key={h.video} className="video">
              <video src={h.video} poster={h.poster ?? undefined} muted playsInline preload="metadata" controls className="video__previa" />
              <div className="video__acciones">
                <span className="lista__orden">Video {i + 1}</span>
                <button type="button" className="icono-btn" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
                  <ArrowUp size={20} />
                </button>
                <button type="button" className="icono-btn" onClick={() => mover(i, 1)} disabled={i === datos.length - 1} aria-label="Bajar">
                  <ArrowDown size={20} />
                </button>
                <button type="button" className="icono-btn icono-btn--peligro" onClick={() => quitar(i)} aria-label="Quitar video">
                  <Trash size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="subida">
        <div className="subida__fila">
          <button type="button" className="btn btn--suave" onClick={() => video.current?.click()}>
            <UploadSimple size={18} /> {elegido ? elegido.name : 'Elegir video'}
          </button>
          <input ref={video} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => setElegido(e.target.files?.[0] ?? null)} />
          <button type="button" className="btn btn--suave" onClick={() => poster.current?.click()}>
            <UploadSimple size={18} /> {portada ? portada.name : 'Imagen de carga (opcional)'}
          </button>
          <input ref={poster} type="file" accept="image/*" hidden onChange={(e) => setPortada(e.target.files?.[0] ?? null)} />
        </div>
        <button type="button" className="btn btn--primario" onClick={subir} disabled={!elegido || subiendo || datos.length >= 8}>
          {subiendo ? 'Subiendo…' : 'Agregar video'}
        </button>
      </div>
    </section>
  )
}

const Ajustes = () => {
  const [pestana, setPestana] = useState('contacto')
  const q = useQuery({ queryKey: ['ajustes'], queryFn: () => api.get<TAjustes>('/api/admin/ajustes') })

  if (q.isLoading || !q.data) return <Cargando />
  const a = q.data

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">Datos generales</p>
          <h1 className="pagina__titulo">Ajustes</h1>
        </div>
      </header>

      <div className="chips" role="tablist" aria-label="Ajustes">
        {pestanas.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id} className={`chip${pestana === p.id ? ' chip--activo' : ''}`} onClick={() => setPestana(p.id)}>
            {p.t}
          </button>
        ))}
      </div>

      {pestana === 'contacto' ? <Contacto datos={a.contacto} /> : null}
      {pestana === 'envios' ? <Envios datos={a.envios} /> : null}
      {pestana === 'descuentos' ? <Descuentos datos={a.descuentos} evento={a.evento} /> : null}
      {pestana === 'hero' ? <Hero datos={a.hero} /> : null}
    </div>
  )
}

export default Ajustes
