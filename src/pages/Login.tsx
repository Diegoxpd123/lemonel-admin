import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { api } from '../api'
import type { Sesion } from '../types'
import { Campo } from '../ui'
import { entrada } from '../motion'

const Login = () => {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [ver, setVer] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => entrada(caja.current), [])

  const entrar = useMutation({
    mutationFn: () => api.post<Sesion>('/api/auth/login', { email, password: clave }),
    onSuccess: (s) => qc.setQueryData(['sesion'], s),
  })

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!entrar.isPending) entrar.mutate()
  }

  return (
    <main className="acceso">
      <div className="acceso__caja" ref={caja}>
        <img src="/logo.webp" alt="Lemonel" width="84" height="84" className="acceso__logo" />
        <h1 className="acceso__titulo">Panel de Lemonel</h1>
        <p className="acceso__texto">Administra tus joyas, precios, fotos y colecciones.</p>
        <form onSubmit={enviar} className="acceso__form" noValidate>
          <Campo etiqueta="Correo">
            {(id) => <input id={id} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required autoFocus />}
          </Campo>
          <Campo etiqueta="Contraseña">
            {(id) => (
              <div className="input-grupo">
                <input id={id} type={ver ? 'text' : 'password'} autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} className="input" required />
                <button type="button" className="icono-btn input-grupo__btn" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {ver ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}
          </Campo>
          {entrar.error ? (
            <p className="acceso__error" role="alert">
              {entrar.error.message}
            </p>
          ) : null}
          <button type="submit" className="btn btn--primario btn--bloque" disabled={entrar.isPending || !email || !clave}>
            {entrar.isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default Login
