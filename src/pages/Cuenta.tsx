import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../api'
import { Campo, useAviso } from '../ui'

const Cuenta = () => {
  const aviso = useAviso()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')

  const cambiar = useMutation({
    mutationFn: () => api.post('/api/auth/password', { actual, nueva }),
    onSuccess: () => {
      setActual('')
      setNueva('')
      setRepetir('')
      aviso.ok('Contraseña actualizada')
    },
    onError: (e) => aviso.error(e.message),
  })

  const distintas = repetir.length > 0 && nueva !== repetir

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (nueva.length < 8 || distintas || !actual) return
    cambiar.mutate()
  }

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <p className="sobretitulo">Seguridad</p>
          <h1 className="pagina__titulo">Mi cuenta</h1>
        </div>
      </header>

      <form className="tarjeta tarjeta--angosta" onSubmit={enviar} noValidate>
        <h2 className="tarjeta__titulo">Cambiar contraseña</h2>
        <div className="campos">
          <Campo etiqueta="Contraseña actual">{(i) => <input id={i} type="password" autoComplete="current-password" className="input" value={actual} onChange={(e) => setActual(e.target.value)} />}</Campo>
          <Campo etiqueta="Contraseña nueva" ayuda="Mínimo 8 caracteres.">
            {(i) => <input id={i} type="password" autoComplete="new-password" className="input" value={nueva} onChange={(e) => setNueva(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Repite la contraseña nueva" error={distintas ? 'Las contraseñas no coinciden' : undefined}>
            {(i) => <input id={i} type="password" autoComplete="new-password" className="input" value={repetir} onChange={(e) => setRepetir(e.target.value)} />}
          </Campo>
        </div>
        <div className="tarjeta__pie">
          <button type="submit" className="btn btn--primario" disabled={cambiar.isPending || nueva.length < 8 || distintas || !actual}>
            {cambiar.isPending ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Cuenta
