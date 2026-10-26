import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Images, MagnifyingGlass, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { api } from '../api'
import type { Coleccion, ProductoFila } from '../types'
import { Campo, Cargando, Interruptor, Modal, useAviso, useConfirmar } from '../ui'

type Edicion = { id?: number; nombre: string; descripcion: string; orden: number; activa: boolean; productoIds: number[]; foto: string | null }

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const Colecciones = () => {
  const qc = useQueryClient()
  const aviso = useAviso()
  const confirmar = useConfirmar()
  const [edit, setEdit] = useState<Edicion | null>(null)
  const [buscar, setBuscar] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const archivo = useRef<HTMLInputElement>(null)

  const q = useQuery({ queryKey: ['colecciones'], queryFn: () => api.get<Coleccion[]>('/api/admin/colecciones') })
  const prods = useQuery({ queryKey: ['productos'], queryFn: () => api.get<ProductoFila[]>('/api/admin/productos') })

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['colecciones'] })
    qc.invalidateQueries({ queryKey: ['resumen'] })
  }

  const guardar = useMutation({
    mutationFn: (e: Edicion) => {
      const cuerpo = { nombre: e.nombre, descripcion: e.descripcion, orden: e.orden, activa: e.activa, productoIds: e.productoIds }
      return e.id ? api.put<Coleccion>(`/api/admin/colecciones/${e.id}`, cuerpo) : api.post<Coleccion>('/api/admin/colecciones', cuerpo)
    },
    onSuccess: () => {
      refrescar()
      setEdit(null)
      aviso.ok('Colección guardada')
    },
    onError: (e) => aviso.error(e.message),
  })

  const borrar = useMutation({
    mutationFn: (id: number) => api.del(`/api/admin/colecciones/${id}`),
    onSuccess: () => {
      refrescar()
      aviso.ok('Colección eliminada')
    },
    onError: (e) => aviso.error(e.message),
  })

  const pedirBorrar = async (c: Coleccion) => {
    const si = await confirmar('Eliminar colección', `Se eliminará “${c.nombre}”. Los productos no se borran.`, { confirmar: 'Eliminar', peligro: true })
    if (si) borrar.mutate(c.id)
  }

  const subirFoto = async (file: File | undefined) => {
    if (!file || !edit?.id) return
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('foto', file)
      const c = await api.post<Coleccion>(`/api/admin/colecciones/${edit.id}/foto`, fd)
      setEdit((e) => (e ? { ...e, foto: c.foto } : e))
      refrescar()
      aviso.ok('Foto actualizada')
    } catch (e) {
      aviso.error((e as Error).message)
    } finally {
      setSubiendo(false)
      if (archivo.current) archivo.current.value = ''
    }
  }

  const visibles = useMemo(() => {
    const t = normalizar(buscar.trim())
    return (prods.data ?? []).filter((p) => !t || normalizar(p.nombre).includes(t))
  }, [prods.data, buscar])

  const alternar = (id: number) =>
    setEdit((e) => (e ? { ...e, productoIds: e.productoIds.includes(id) ? e.productoIds.filter((x) => x !== id) : [...e.productoIds, id] } : e))

  if (q.isLoading) return <Cargando />

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">Agrupaciones por tema</p>
          <h1 className="pagina__titulo">Colecciones</h1>
        </div>
        <button type="button" className="btn btn--primario" onClick={() => setEdit({ nombre: '', descripcion: '', orden: (q.data?.length ?? 0) + 1, activa: true, productoIds: [], foto: null })}>
          <Plus size={18} /> Nueva colección
        </button>
      </header>

      <ul className="colecciones">
        {q.data?.map((c) => (
          <li key={c.id} className="coleccion">
            <div className="coleccion__foto">{c.foto ? <img src={c.foto} alt="" loading="lazy" /> : <span>Sin foto</span>}</div>
            <div className="coleccion__texto">
              <p className="lista__titulo">
                {c.nombre} {!c.activa ? <span className="etiqueta etiqueta--gris">Oculta</span> : null}
              </p>
              <p className="lista__sub">{c.productoIds.length} producto(s)</p>
            </div>
            <div className="coleccion__acciones">
              <button type="button" className="icono-btn" onClick={() => setEdit({ id: c.id, nombre: c.nombre, descripcion: c.descripcion, orden: c.orden, activa: c.activa, productoIds: [...c.productoIds], foto: c.foto })} aria-label={`Editar ${c.nombre}`}>
                <PencilSimple size={20} />
              </button>
              <button type="button" className="icono-btn icono-btn--peligro" onClick={() => pedirBorrar(c)} aria-label={`Eliminar ${c.nombre}`}>
                <Trash size={20} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        abierto={!!edit}
        titulo={edit?.id ? 'Editar colección' : 'Nueva colección'}
        ancho={720}
        onCerrar={() => {
          setEdit(null)
          setBuscar('')
        }}
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
            <div className="fila-2">
              <Campo etiqueta="Nombre">{(i) => <input id={i} className="input" value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} maxLength={60} autoFocus />}</Campo>
              <Campo etiqueta="Orden" ayuda="El 1 aparece primero.">
                {(i) => <input id={i} className="input" type="number" min={0} value={edit.orden} onChange={(e) => setEdit({ ...edit, orden: Number(e.target.value) })} />}
              </Campo>
            </div>
            <Campo etiqueta="Descripción corta">{(i) => <input id={i} className="input" value={edit.descripcion} onChange={(e) => setEdit({ ...edit, descripcion: e.target.value })} maxLength={200} />}</Campo>
            <Interruptor activo={edit.activa} onChange={(v) => setEdit({ ...edit, activa: v })} titulo="Visible en la tienda" />

            <div className="campo">
              <span className="campo__etiqueta">Foto de portada</span>
              {edit.id ? (
                <div className="portada">
                  <div className="portada__foto">{edit.foto ? <img src={edit.foto} alt="" /> : <span>Sin foto</span>}</div>
                  <button type="button" className="btn btn--suave" onClick={() => archivo.current?.click()} disabled={subiendo}>
                    <Images size={18} /> {subiendo ? 'Subiendo…' : edit.foto ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                  <input ref={archivo} type="file" accept="image/*" hidden onChange={(e) => subirFoto(e.target.files?.[0])} />
                </div>
              ) : (
                <p className="campo__ayuda">Guarda la colección y luego podrás subir su foto de portada.</p>
              )}
            </div>

            <div className="campo">
              <span className="campo__etiqueta">Productos de la colección ({edit.productoIds.length})</span>
              <label className="buscador buscador--modal">
                <MagnifyingGlass size={18} />
                <input type="search" className="buscador__input" placeholder="Buscar producto" value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar producto" />
              </label>
              <ul className="selector">
                {visibles.map((p) => {
                  const on = edit.productoIds.includes(p.id)
                  return (
                    <li key={p.id}>
                      <button type="button" className={`selector__item${on ? ' selector__item--activo' : ''}`} aria-pressed={on} onClick={() => alternar(p.id)}>
                        <span className="selector__foto">{p.foto ? <img src={p.foto} alt="" loading="lazy" width="40" height="50" /> : null}</span>
                        <span className="selector__nombre">{p.nombre}</span>
                        <span className="selector__marca" aria-hidden="true">
                          {on ? '✓' : ''}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default Colecciones
