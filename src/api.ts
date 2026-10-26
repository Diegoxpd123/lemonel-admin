export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:50002').replace(/\/$/, '')
export const STORE_URL = (import.meta.env.VITE_STORE_URL ?? 'http://localhost:4321').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Cuerpo = Record<string, unknown> | unknown[] | FormData | undefined

const pedir = async <T>(method: string, ruta: string, cuerpo?: Cuerpo): Promise<T> => {
  const esForm = cuerpo instanceof FormData
  let res: Response
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method,
      credentials: 'include',
      headers: cuerpo && !esForm ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo ? (esForm ? cuerpo : JSON.stringify(cuerpo)) : undefined,
    })
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa tu internet e inténtalo otra vez.')
  }
  const texto = await res.text()
  let datos: unknown = null
  if (texto) {
    try {
      datos = JSON.parse(texto)
    } catch {
      datos = null
    }
  }
  if (!res.ok) {
    const msg = (datos as { error?: string } | null)?.error ?? 'Algo salió mal. Inténtalo otra vez.'
    if (res.status === 401 && !ruta.startsWith('/api/auth/')) window.dispatchEvent(new Event('sesion-vencida'))
    throw new ApiError(res.status, msg)
  }
  return datos as T
}

export const api = {
  get: <T>(ruta: string) => pedir<T>('GET', ruta),
  post: <T>(ruta: string, cuerpo?: Cuerpo) => pedir<T>('POST', ruta, cuerpo),
  put: <T>(ruta: string, cuerpo?: Cuerpo) => pedir<T>('PUT', ruta, cuerpo),
  patch: <T>(ruta: string, cuerpo?: Cuerpo) => pedir<T>('PATCH', ruta, cuerpo),
  del: <T>(ruta: string) => pedir<T>('DELETE', ruta),
}
