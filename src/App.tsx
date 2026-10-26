import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './api'
import type { Sesion } from './types'
import { Cargando } from './ui'
import Layout from './Layout'
import Login from './pages/Login'
import Resumen from './pages/Resumen'
import Pedidos from './pages/Pedidos'
import PedidoNuevo from './pages/PedidoNuevo'
import PedidoDetalle from './pages/PedidoDetalle'
import Productos from './pages/Productos'
import ProductoEditor from './pages/ProductoEditor'
import Categorias from './pages/Categorias'
import Colecciones from './pages/Colecciones'
import Colores from './pages/Colores'
import Preguntas from './pages/Preguntas'
import Ajustes from './pages/Ajustes'
import Cuenta from './pages/Cuenta'

const App = () => {
  const qc = useQueryClient()
  const sesion = useQuery({
    queryKey: ['sesion'],
    queryFn: async () => {
      try {
        return await api.get<Sesion>('/api/auth/me')
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null
        throw e
      }
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    const alVencer = () => qc.setQueryData(['sesion'], null)
    window.addEventListener('sesion-vencida', alVencer)
    return () => window.removeEventListener('sesion-vencida', alVencer)
  }, [qc])

  if (sesion.isLoading) return <Cargando texto="Entrando…" />
  if (sesion.isError) return <Cargando texto="No se pudo conectar con el servidor. Recarga la página." />
  if (!sesion.data) return <Login />

  return (
    <Routes>
      <Route element={<Layout sesion={sesion.data} />}>
        <Route index element={<Resumen />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="pedidos/nuevo" element={<PedidoNuevo />} />
        <Route path="pedidos/:id" element={<PedidoDetalle />} />
        <Route path="productos" element={<Productos />} />
        <Route path="productos/nuevo" element={<ProductoEditor />} />
        <Route path="productos/:id" element={<ProductoEditor />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="colecciones" element={<Colecciones />} />
        <Route path="colores" element={<Colores />} />
        <Route path="preguntas" element={<Preguntas />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="cuenta" element={<Cuenta />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
