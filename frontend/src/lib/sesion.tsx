import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  cerrarSesion as limpiarSesion,
  getUsuario,
  login as loginApi,
  sesionExpirada,
  type Usuario,
} from '@/lib/api'

interface ContextoSesion {
  usuario: Usuario | null
  entrar: (username: string, password: string) => Promise<void>
  salir: () => void
}

const Contexto = createContext<ContextoSesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => getUsuario())

  // Si el token vence en cualquier llamada, la app vuelve al login sola.
  useEffect(() => {
    const alExpirar = () => setUsuario(null)
    sesionExpirada.addEventListener('expirada', alExpirar)
    return () => sesionExpirada.removeEventListener('expirada', alExpirar)
  }, [])

  const entrar = useCallback(async (username: string, password: string) => {
    const u = await loginApi(username, password)
    setUsuario(u)
  }, [])

  const salir = useCallback(() => {
    limpiarSesion()
    setUsuario(null)
  }, [])

  const valor = useMemo(() => ({ usuario, entrar, salir }), [usuario, entrar, salir])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function usarSesion(): ContextoSesion {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('usarSesion debe usarse dentro de ProveedorSesion')
  return ctx
}
