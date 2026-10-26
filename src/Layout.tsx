import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowSquareOut, Diamond, Gear, Key, List, Palette, Question, SignOut, SquaresFour, Stack, Tag, X } from '@phosphor-icons/react'
import { api, STORE_URL } from './api'
import type { Sesion } from './types'
import { entrada } from './motion'

const enlaces = [
  { a: '/', t: 'Resumen', i: SquaresFour, fin: true },
  { a: '/productos', t: 'Productos', i: Diamond },
  { a: '/categorias', t: 'Categorías', i: Tag },
  { a: '/colecciones', t: 'Colecciones', i: Stack },
  { a: '/colores', t: 'Colores', i: Palette },
  { a: '/preguntas', t: 'Preguntas', i: Question },
  { a: '/ajustes', t: 'Ajustes', i: Gear },
  { a: '/cuenta', t: 'Mi cuenta', i: Key },
]

const Layout = ({ sesion }: { sesion: Sesion }) => {
  const [abierto, setAbierto] = useState(false)
  const loc = useLocation()
  const qc = useQueryClient()
  const principal = useRef<HTMLElement>(null)

  useEffect(() => setAbierto(false), [loc.pathname])

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    entrada(principal.current?.querySelector<HTMLElement>('.pagina') ?? null)
  }, [loc.pathname])

  useEffect(() => {
    document.body.classList.toggle('bloqueado-movil', abierto)
    return () => document.body.classList.remove('bloqueado-movil')
  }, [abierto])

  const salir = async () => {
    await api.post('/api/auth/logout').catch(() => null)
    qc.clear()
    qc.setQueryData(['sesion'], null)
  }

  return (
    <div className="app">
      <header className="barra-movil">
        <button type="button" className="icono-btn" onClick={() => setAbierto(true)} aria-label="Abrir menú">
          <List size={24} />
        </button>
        <img src="/logo.webp" alt="Lemonel" width="36" height="36" className="barra-movil__logo" />
        <span className="barra-movil__titulo">Panel</span>
      </header>

      <div className={`velo${abierto ? ' velo--visible' : ''}`} onClick={() => setAbierto(false)} />

      <aside className={`lateral${abierto ? ' lateral--abierto' : ''}`}>
        <div className="lateral__marca">
          <img src="/logo.webp" alt="Lemonel" width="52" height="52" />
          <div>
            <p className="lateral__nombre">Lemonel</p>
            <p className="lateral__rol">Panel de tienda</p>
          </div>
          <button type="button" className="icono-btn icono-btn--claro lateral__cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
            <X size={22} />
          </button>
        </div>

        <nav className="lateral__nav" aria-label="Secciones">
          {enlaces.map(({ a, t, i: Icono, fin }) => (
            <NavLink key={a} to={a} end={fin} className={({ isActive }) => `enlace${isActive ? ' enlace--activo' : ''}`}>
              <Icono size={21} weight="light" />
              <span>{t}</span>
            </NavLink>
          ))}
        </nav>

        <div className="lateral__pie">
          <a className="enlace" href={STORE_URL} target="_blank" rel="noreferrer">
            <ArrowSquareOut size={21} weight="light" />
            <span>Ver la tienda</span>
          </a>
          <div className="lateral__usuario">
            <div className="lateral__avatar" aria-hidden="true">
              {sesion.nombre.slice(0, 1).toUpperCase()}
            </div>
            <div className="lateral__datos">
              <p>{sesion.nombre}</p>
              <p>{sesion.email}</p>
            </div>
            <button type="button" className="icono-btn icono-btn--claro" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
              <SignOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      <main className="principal" ref={principal}>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
