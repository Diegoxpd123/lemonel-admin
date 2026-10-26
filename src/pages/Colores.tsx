import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { api } from '../api'
import type { Color } from '../types'
import { Campo, Cargando, Modal, useAviso, useConfirmar } from '../ui'

type Edicion = { id?: number; nombre: string; hex: string }

const Colores = () => {
  const qc = useQueryClient()
  const aviso = useAviso()
  const confirmar = useConfirmar()
  const [edit, setEdit] = useState<Edicion | null>(null)

  const q = useQuery({ queryKey: ['colores'], queryFn: () => api.get<Color[]>('/api/admin/colores') })

  const guardar = useMutation({
    mutationFn: (e: Edicion) => (e.id ? api.put(`/api/admin/colores/${e.id}`, { nombre: e.nombre, hex: e.hex }) : api.post('/api/admin/colores', { nombre: e.nombre, hex: e.hex })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colores'] })
      setEdit(null)
      aviso.ok('Color guardado')
    },
    onError: (e) => aviso.error(e.message),
  })

  const borrar = useMutation({
    mutationFn: (id: number) => api.del(`/api/admin/colores/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colores'] })
      aviso.ok('Color eliminado')
    },
    onError: (e) => aviso.error(e.message),
  })

  const pedirBorrar = async (c: Color) => {
    const si = await confirmar('Eliminar color', `“${c.nombre}” dejará de mostrarse como muestra de color. Los productos que lo usan seguirán funcionando.`, { confirmar: 'Eliminar', peligro: true })
    if (si) borrar.mutate(c.id)
  }

  if (q.isLoading) return <Cargando />

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">Muestras de color de la tienda</p>
          <h1 className="pagina__titulo">Colores</h1>
        </div>
        <button type="button" className="btn btn--primario" onClick={() => setEdit({ nombre: '', hex: '#d6b36a' })}>
          <Plus size={18} /> Nuevo color
        </button>
      </header>

      <p className="texto-suave pagina__intro">Cuando una opción se llama igual que uno de estos colores, la tienda muestra la muestra de color junto al nombre.</p>

      <ul className="colores">
        {q.data?.map((c) => (
          <li key={c.id} className="color">
            <span className="color__muestra" style={{ background: c.hex }} />
            <div className="color__texto">
              <p className="lista__titulo">{c.nombre}</p>
              <p className="lista__sub">{c.hex.toUpperCase()}</p>
            </div>
            <button type="button" className="icono-btn" onClick={() => setEdit({ id: c.id, nombre: c.nombre, hex: c.hex })} aria-label={`Editar ${c.nombre}`}>
              <PencilSimple size={20} />
            </button>
            <button type="button" className="icono-btn icono-btn--peligro" onClick={() => pedirBorrar(c)} aria-label={`Eliminar ${c.nombre}`}>
              <Trash size={20} />
            </button>
          </li>
        ))}
      </ul>

      <Modal
        abierto={!!edit}
        titulo={edit?.id ? 'Editar color' : 'Nuevo color'}
        ancho={440}
        onCerrar={() => setEdit(null)}
        pie={
          <>
            <button type="button" className="btn btn--suave" onClick={() => setEdit(null)}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primario" disabled={guardar.isPending || (edit?.nombre.trim().length ?? 0) < 2} onClick={() => edit && guardar.mutate(edit)}>
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        {edit ? (
          <div className="campos">
            <Campo etiqueta="Nombre">{(i) => <input id={i} className="input" value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} maxLength={40} autoFocus />}</Campo>
            <Campo etiqueta="Color">
              {(i) => (
                <div className="selector-color">
                  <input id={i} type="color" value={edit.hex} onChange={(e) => setEdit({ ...edit, hex: e.target.value })} className="selector-color__input" />
                  <input className="input" value={edit.hex} onChange={(e) => setEdit({ ...edit, hex: e.target.value })} maxLength={7} aria-label="Código del color" />
                </div>
              )}
            </Campo>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default Colores
