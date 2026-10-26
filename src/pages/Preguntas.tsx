import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { api } from '../api'
import type { Faq } from '../types'
import { Campo, Cargando, Interruptor, Modal, useAviso, useConfirmar } from '../ui'

type Edicion = { id?: number; pregunta: string; respuesta: string; orden: number; activa: boolean }

const Preguntas = () => {
  const qc = useQueryClient()
  const aviso = useAviso()
  const confirmar = useConfirmar()
  const [edit, setEdit] = useState<Edicion | null>(null)

  const q = useQuery({ queryKey: ['faqs'], queryFn: () => api.get<Faq[]>('/api/admin/faqs') })

  const guardar = useMutation({
    mutationFn: (e: Edicion) => {
      const cuerpo = { pregunta: e.pregunta, respuesta: e.respuesta, orden: e.orden, activa: e.activa }
      return e.id ? api.put(`/api/admin/faqs/${e.id}`, cuerpo) : api.post('/api/admin/faqs', cuerpo)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faqs'] })
      setEdit(null)
      aviso.ok('Pregunta guardada')
    },
    onError: (e) => aviso.error(e.message),
  })

  const borrar = useMutation({
    mutationFn: (id: number) => api.del(`/api/admin/faqs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faqs'] })
      aviso.ok('Pregunta eliminada')
    },
    onError: (e) => aviso.error(e.message),
  })

  const pedirBorrar = async (f: Faq) => {
    const si = await confirmar('Eliminar pregunta', `Se eliminará “${f.pregunta}”.`, { confirmar: 'Eliminar', peligro: true })
    if (si) borrar.mutate(f.id)
  }

  if (q.isLoading) return <Cargando />

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">Sección de la tienda</p>
          <h1 className="pagina__titulo">Preguntas frecuentes</h1>
        </div>
        <button type="button" className="btn btn--primario" onClick={() => setEdit({ pregunta: '', respuesta: '', orden: 0, activa: true })}>
          <Plus size={18} /> Nueva pregunta
        </button>
      </header>

      <ul className="lista">
        {q.data?.map((f) => (
          <li key={f.id} className="lista__fila lista__fila--alta">
            <div className="lista__texto">
              <p className="lista__titulo">
                {f.pregunta} {!f.activa ? <span className="etiqueta etiqueta--gris">Oculta</span> : null}
              </p>
              <p className="lista__sub lista__sub--parrafo">{f.respuesta}</p>
            </div>
            <span className="lista__orden">N.° {f.orden}</span>
            <button type="button" className="icono-btn" onClick={() => setEdit({ id: f.id, pregunta: f.pregunta, respuesta: f.respuesta, orden: f.orden, activa: f.activa })} aria-label="Editar">
              <PencilSimple size={20} />
            </button>
            <button type="button" className="icono-btn icono-btn--peligro" onClick={() => pedirBorrar(f)} aria-label="Eliminar">
              <Trash size={20} />
            </button>
          </li>
        ))}
      </ul>

      <Modal
        abierto={!!edit}
        titulo={edit?.id ? 'Editar pregunta' : 'Nueva pregunta'}
        onCerrar={() => setEdit(null)}
        pie={
          <>
            <button type="button" className="btn btn--suave" onClick={() => setEdit(null)}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primario" disabled={guardar.isPending || (edit?.pregunta.trim().length ?? 0) < 3 || (edit?.respuesta.trim().length ?? 0) < 2} onClick={() => edit && guardar.mutate(edit)}>
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        {edit ? (
          <div className="campos">
            <Campo etiqueta="Pregunta">{(i) => <input id={i} className="input" value={edit.pregunta} onChange={(e) => setEdit({ ...edit, pregunta: e.target.value })} maxLength={200} autoFocus />}</Campo>
            <Campo etiqueta="Respuesta">{(i) => <textarea id={i} className="input input--area" rows={4} value={edit.respuesta} onChange={(e) => setEdit({ ...edit, respuesta: e.target.value })} maxLength={1200} />}</Campo>
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

export default Preguntas
