import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Eye, EyeSlash, Image, Package, Star, Truck, Warning } from '@phosphor-icons/react'
import { api } from '../api'
import type { Resumen as TResumen } from '../types'
import { Cargando } from '../ui'
import { contar } from '../motion'

const Cifra = ({ valor }: { valor: number }) => {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => contar(ref.current, valor), [valor])
  return <span ref={ref}>0</span>
}

const Resumen = () => {
  const q = useQuery({ queryKey: ['resumen'], queryFn: () => api.get<TResumen>('/api/admin/resumen') })

  if (q.isLoading) return <Cargando />
  if (!q.data) return <p className="texto-suave">No se pudo cargar el resumen.</p>
  const r = q.data
  const maximo = Math.max(1, ...r.porCategoria.map((c) => c.total))

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">Hola</p>
          <h1 className="pagina__titulo">Resumen de la tienda</h1>
        </div>
        <Link to="/productos/nuevo" className="btn btn--primario">
          Nuevo producto
        </Link>
      </header>

      <div className="cifras">
        <Link to="/productos" className="cifra">
          <span className="cifra__valor">
            <Cifra valor={r.productos} />
          </span>
          <span className="cifra__etiqueta">Productos</span>
        </Link>
        <div className="cifra">
          <span className="cifra__valor">
            <Cifra valor={r.destacados} />
          </span>
          <span className="cifra__etiqueta">
            <Star size={16} weight="fill" /> Más vendidos
          </span>
        </div>
        <div className="cifra">
          <span className="cifra__valor">
            <Cifra valor={r.agotados} />
          </span>
          <span className="cifra__etiqueta">
            <EyeSlash size={16} /> Agotados
          </span>
        </div>
        <div className="cifra">
          <span className="cifra__valor">
            <Cifra valor={r.ocultos} />
          </span>
          <span className="cifra__etiqueta">
            <Eye size={16} /> Ocultos en la tienda
          </span>
        </div>
      </div>

      <div className="rejilla-2">
        <section className="tarjeta">
          <h2 className="tarjeta__titulo">Productos por categoría</h2>
          <ul className="barras">
            {r.porCategoria.map((c) => (
              <li key={c.nombre} className="barras__fila">
                <span className="barras__nombre">{c.nombre}</span>
                <span className="barras__pista">
                  <span className="barras__relleno" style={{ width: `${(c.total / maximo) * 100}%` }} />
                </span>
                <span className="barras__valor">{c.total}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="tarjeta">
          <h2 className="tarjeta__titulo">Para revisar</h2>
          <ul className="atajos">
            <li>
              <Link to="/pedidos?estado=recibido" className="atajo">
                <Package size={22} weight="light" />
                <span>
                  <strong>{r.pedidos.nuevos}</strong> pedido(s) nuevo(s) por confirmar
                </span>
                <ArrowRight size={18} />
              </Link>
            </li>
            <li>
              <Link to="/pedidos?estado=porenviar" className="atajo">
                <Truck size={22} weight="light" />
                <span>
                  <strong>{r.pedidos.porEnviar}</strong> pedido(s) por preparar y enviar
                </span>
                <ArrowRight size={18} />
              </Link>
            </li>
            <li>
              <Link to="/productos?estado=sinfoto" className="atajo">
                <Image size={22} weight="light" />
                <span>
                  <strong>{r.sinFoto}</strong> producto(s) sin foto
                </span>
                <ArrowRight size={18} />
              </Link>
            </li>
            <li>
              <Link to="/productos?estado=agotado" className="atajo">
                <Warning size={22} weight="light" />
                <span>
                  <strong>{r.agotados}</strong> agotado(s) por reponer
                </span>
                <ArrowRight size={18} />
              </Link>
            </li>
            <li>
              <Link to="/colecciones" className="atajo">
                <Star size={22} weight="light" />
                <span>
                  <strong>{r.colecciones}</strong> colecciones en la tienda
                </span>
                <ArrowRight size={18} />
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default Resumen
