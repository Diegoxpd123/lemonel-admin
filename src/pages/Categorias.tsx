import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { api } from '../api'
import type { Categoria } from '../types'
import { Campo, Cargando, Interruptor, Modal, useAviso, useConfirmar } from '../ui'

type Edicion = { id?: number; nombre: string; descripcion: string; orden: number; activa: boolean }

const Categorias = () => {
  const qc = useQueryClient()
  const aviso = useAviso()
  const confirmar = useConfirmar()
  const [edit, setEdit] = useState<Edicion | null>(null)

  const q = useQuery({ queryKey: ['categorias'], queryFn: () => api.get<Categoria[]>('/api/admin/categorias') })

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['categorias'] })
    qc.invalidateQueries({ queryKey: ['resumen'] })
    qc.invalidateQueries({ queryKey: ['productos'] })
  }

  const guardar = useMutation({
    mutationFn: (e: Edicion) => (e.id ? api.put(`/api/admin/categorias/${e.id}`, { nombre: e.nombre, descripcion: e.descripcion, orden: e.orden, activa: e.activa }) : api.post('/api/admin/categorias', { nombre: e.nombre, descripcion: e.descripcion, orden: e.orden, activa: e.activa })),
    onSuccess: () => {
      refrescar()
      setEdit(null)
      aviso.ok('Categoría guardada')
    },
    onError: (e) => aviso.error(e.message),
  })

  const borrar = useMutation({
    mutationFn: (id: number) => api.del(`/api/admin/categorias/${id}`),
    onSuccess: () => {
      refrescar()
      aviso.ok('Categoría eliminada')
    },
    onError: (e) => aviso.error(e.message),
  })

  const pedirBorrar = async (c: Categoria) => {
    const si = await confirmar('Eliminar categoría', `Se eliminará “${c.nombre}”.`, { confirmar: 'Eliminar', peligro: true })
    if (si) borrar.mutate(c.id)
  }

  if (q.isLoading) return <Cargando />

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">Cómo se agrupa la tienda</p>
          <h1 className="pagina__titulo">Categorías</h1>
        </div>
        <button type="button" className="btn btn--primario" onClick={() => setEdit({ nombre: '', descripcion: '', orden: (q.data?.length ?? 0) + 1, activa: true })}>
          <Plus size={18} /> Nueva categoría
        </button>
      </header>

      <ul className="lista">
        {q.data?.map((c) => (
          <li key={c.id} className="lista__fila">
            <div className="lista__texto">
              <p className="lista__titulo">
                {c.nombre} {!c.activa ? <span className="etiqueta etiqueta--gris">Oculta</span> : null}
              </p>
              <p className="lista__sub">
                {c.productos} producto(s){c.descripcion ? ` · ${c.descripcion}` : ''}
              </p>
            </div>
            <span className="lista__orden">N.° {c.orden}</span>
            <button type="button" className="icono-btn" onClick={() => setEdit({ id: c.id, nombre: c.nombre, descripcion: c.descripcion, orden: c.orden, activa: c.activa })} aria-label="Editar">
              <PencilSimple size={20} />
            </button>
            <button type="button" className="icono-btn icono-btn--peligro" onClick={() => pedirBorrar(c)} aria-label="Eliminar">
              <Trash size={20} />
            </button>
          </li>
        ))}
      </ul>

      <Modal
        abierto={!!edit}
        titulo={edit?.id ? 'Editar categoría' : 'Nueva categoría'}
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
            <Campo etiqueta="Nombre">{(i) => <input id={i} className="input" value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} maxLength={60} autoFocus />}</Campo>
            <Campo etiqueta="Descripción corta" ayuda="Se muestra en la tienda bajo el nombre.">
              {(i) => <input id={i} className="input" value={edit.descripcion} onChange={(e) => setEdit({ ...edit, descripcion: e.target.value })} maxLength={200} />}
            </Campo>
            <Campo etiqueta="Orden" ayuda="El 1 aparece primero.">
              {(i) => <input id={i} className="input input--corto" type="number" min={0} value={edit.orden} onChange={(e) => setEdit({ ...edit, orden: Number(e.target.value) })} />}
            </Campo>
            <Interruptor activo={edit.activa} onChange={(v) => setEdit({ ...edit, activa: v })} titulo="Visible en la tienda" />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default Categorias
