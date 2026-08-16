/**
 * Cliente de la API de REVIONIX.
 *
 * Regla del proyecto: acá NO hay datos de ejemplo ni valores de relleno.
 * Todo lo que se pinta sale del servidor. Si el servidor no responde, la
 * pantalla dice que no hay datos — nunca inventa un número.
 */

const TOKEN_KEY = 'revionix_auth_token'
const USER_KEY = 'revionix_auth_user'

export interface Usuario {
  username: string
  nombre: string
  role: 'admin' | 'tienda' | 'visor' | string
  canal?: string | null
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getUsuario(): Usuario | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as Usuario) : null
  } catch {
    return null
  }
}

function guardarSesion(token: string, user: Usuario) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** Se dispara cuando el token vence, para que la app vuelva al login. */
export const sesionExpirada = new EventTarget()

export class ApiError extends Error {
  status: number
  constructor(mensaje: string, status: number) {
    super(mensaje)
    this.status = status
  }
}

async function request<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`/api${ruta}`, { ...init, headers })

  if (res.status === 401) {
    // El token venció o no vale: se limpia y la app cae al login sola.
    cerrarSesion()
    sesionExpirada.dispatchEvent(new Event('expirada'))
    throw new ApiError('La sesión venció. Inicia sesión de nuevo.', 401)
  }

  if (!res.ok) {
    let detalle = `Error ${res.status}`
    try {
      const cuerpo = await res.json()
      if (cuerpo?.error) detalle = cuerpo.error
    } catch {
      /* respuesta sin JSON: se queda el código */
    }
    throw new ApiError(detalle, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(ruta: string) => request<T>(ruta),
  post: <T>(ruta: string, datos?: unknown) =>
    request<T>(ruta, {
      method: 'POST',
      body: datos instanceof FormData ? datos : JSON.stringify(datos ?? {}),
    }),
  put: <T>(ruta: string, datos?: unknown) =>
    request<T>(ruta, {
      method: 'PUT',
      body: datos instanceof FormData ? datos : JSON.stringify(datos ?? {}),
    }),
  del: <T>(ruta: string) => request<T>(ruta, { method: 'DELETE' }),
}

interface RespuestaLogin {
  ok: boolean
  token?: string
  user?: Usuario
  error?: string
}

export async function login(username: string, password: string): Promise<Usuario> {
  // El login es el único endpoint que se llama sin token.
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const datos = (await res.json()) as RespuestaLogin
  if (!datos.ok || !datos.token || !datos.user) {
    throw new Error(datos.error || 'Usuario o contraseña incorrectos')
  }
  guardarSesion(datos.token, datos.user)
  return datos.user
}
