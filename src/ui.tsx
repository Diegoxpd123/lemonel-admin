import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react'
import { deslizar, modalIn } from './motion'

export const dinero = (n: number) => `S/ ${n.toFixed(2)}`

export const Interruptor = ({ activo, onChange, titulo, detalle }: { activo: boolean; onChange: (v: boolean) => void; titulo: string; detalle?: string }) => (
  <button type="button" role="switch" aria-checked={activo} className="switch" onClick={() => onChange(!activo)}>
    <span className="switch__texto">
      <span className="switch__titulo">{titulo}</span>
      {detalle ? <span className="switch__detalle">{detalle}</span> : null}
    </span>
    <span className="switch__pista" aria-hidden="true">
      <span className="switch__bola" />
    </span>
  </button>
)

export const Campo = ({ etiqueta, ayuda, children, error }: { etiqueta: string; ayuda?: string; children: (id: string) => ReactNode; error?: string }) => {
  const id = useId()
  return (
    <div className={`campo${error ? ' campo--error' : ''}`}>
      <label htmlFor={id} className="campo__etiqueta">
        {etiqueta}
      </label>
      {children(id)}
      {error ? <p className="campo__error">{error}</p> : ayuda ? <p className="campo__ayuda">{ayuda}</p> : null}
    </div>
  )
}

export const Cargando = ({ texto = 'Cargando…' }: { texto?: string }) => (
  <div className="cargando" role="status">
    <span className="cargando__rueda" />
    <span>{texto}</span>
  </div>
)

export const Vacio = ({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) => (
  <div className="vacio">
    <p className="vacio__titulo">{titulo}</p>
    {texto ? <p className="vacio__texto">{texto}</p> : null}
    {accion}
  </div>
)

export const Modal = ({ abierto, titulo, onCerrar, children, ancho = 560, pie }: { abierto: boolean; titulo: string; onCerrar: () => void; children: ReactNode; ancho?: number; pie?: ReactNode }) => {
  const fondo = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (abierto) modalIn(fondo.current, panel.current)
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    document.body.classList.add('bloqueado')
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.classList.remove('bloqueado')
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div className="modal" ref={fondo} onMouseDown={(e) => e.target === fondo.current && onCerrar()}>
      <div className="modal__panel" ref={panel} style={{ maxWidth: ancho }} role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="modal__cabecera">
          <h2 className="modal__titulo">{titulo}</h2>
          <button type="button" className="icono-btn" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>
        <div className="modal__cuerpo">{children}</div>
        {pie ? <footer className="modal__pie">{pie}</footer> : null}
      </div>
    </div>
  )
}

type Aviso = { id: number; tipo: 'ok' | 'error'; texto: string }
type AvisoCtx = { ok: (t: string) => void; error: (t: string) => void }

const AvisoContexto = createContext<AvisoCtx | null>(null)

const AvisoItem = ({ aviso, cerrar }: { aviso: Aviso; cerrar: (id: number) => void }) => {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => deslizar(ref.current), [])
  useEffect(() => {
    const t = window.setTimeout(() => cerrar(aviso.id), aviso.tipo === 'error' ? 6000 : 3200)
    return () => window.clearTimeout(t)
  }, [aviso, cerrar])
  return (
    <div className={`aviso aviso--${aviso.tipo}`} ref={ref} role="status">
      {aviso.tipo === 'ok' ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}
      <span>{aviso.texto}</span>
    </div>
  )
}

export const AvisoProvider = ({ children }: { children: ReactNode }) => {
  const [lista, setLista] = useState<Aviso[]>([])
  const n = useRef(0)
  const cerrar = useCallback((id: number) => setLista((l) => l.filter((x) => x.id !== id)), [])
  const agregar = useCallback((tipo: Aviso['tipo'], texto: string) => {
    n.current += 1
    const id = n.current
    setLista((l) => [...l.slice(-2), { id, tipo, texto }])
  }, [])
  const valor = useRef<AvisoCtx>({ ok: (t) => agregar('ok', t), error: (t) => agregar('error', t) })
  return (
    <AvisoContexto.Provider value={valor.current}>
      {children}
      <div className="avisos" aria-live="polite">
        {lista.map((a) => (
          <AvisoItem key={a.id} aviso={a} cerrar={cerrar} />
        ))}
      </div>
    </AvisoContexto.Provider>
  )
}

export const useAviso = () => {
  const c = useContext(AvisoContexto)
  if (!c) throw new Error('AvisoProvider ausente')
  return c
}

type Pregunta = { titulo: string; texto: string; confirmar: string; peligro: boolean; resolver: (v: boolean) => void }
const ConfirmarContexto = createContext<((p: Omit<Pregunta, 'resolver'>) => Promise<boolean>) | null>(null)

export const ConfirmarProvider = ({ children }: { children: ReactNode }) => {
  const [p, setP] = useState<Pregunta | null>(null)
  const preguntar = useCallback((x: Omit<Pregunta, 'resolver'>) => new Promise<boolean>((resolver) => setP({ ...x, resolver })), [])
  const cerrar = (v: boolean) => {
    p?.resolver(v)
    setP(null)
  }
  return (
    <ConfirmarContexto.Provider value={preguntar}>
      {children}
      <Modal
        abierto={!!p}
        titulo={p?.titulo ?? ''}
        ancho={440}
        onCerrar={() => cerrar(false)}
        pie={
          <>
            <button type="button" className="btn btn--suave" onClick={() => cerrar(false)}>
              Cancelar
            </button>
            <button type="button" className={`btn ${p?.peligro ? 'btn--peligro' : 'btn--primario'}`} onClick={() => cerrar(true)}>
              {p?.confirmar}
            </button>
          </>
        }
      >
        <p className="texto-suave">{p?.texto}</p>
      </Modal>
    </ConfirmarContexto.Provider>
  )
}

export const useConfirmar = () => {
  const c = useContext(ConfirmarContexto)
  if (!c) throw new Error('ConfirmarProvider ausente')
  return (titulo: string, texto: string, opciones: { confirmar?: string; peligro?: boolean } = {}) =>
    c({ titulo, texto, confirmar: opciones.confirmar ?? 'Confirmar', peligro: opciones.peligro ?? false })
}

export const FichaVacia = () => <div className="ficha-vacia" />
