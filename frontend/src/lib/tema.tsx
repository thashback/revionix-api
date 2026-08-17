import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Modo = 'claro' | 'oscuro' | 'sistema'

const CLAVE = 'revionix_tema'

interface ContextoTema {
  modo: Modo
  /** Lo que se está pintando ahora, ya resuelto el caso 'sistema'. */
  efectivo: 'claro' | 'oscuro'
  cambiar: (m: Modo) => void
}

const Contexto = createContext<ContextoTema | null>(null)

function leerGuardado(): Modo {
  try {
    const v = localStorage.getItem(CLAVE)
    if (v === 'claro' || v === 'oscuro' || v === 'sistema') return v
  } catch {
    /* localStorage bloqueado: se sigue con el valor por defecto */
  }
  return 'sistema'
}

const consultaOscuro = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

export function ProveedorTema({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<Modo>(leerGuardado)
  const [sistemaOscuro, setSistemaOscuro] = useState(consultaOscuro)

  // Si el usuario eligió "sistema", hay que seguir los cambios del sistema
  // operativo en vivo, no solo al cargar.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const alCambiar = (e: MediaQueryListEvent) => setSistemaOscuro(e.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  const efectivo: 'claro' | 'oscuro' =
    modo === 'sistema' ? (sistemaOscuro ? 'oscuro' : 'claro') : modo

  // La clase `dark` en <html> es lo que activa el bloque .dark del tema.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', efectivo === 'oscuro')
  }, [efectivo])

  const cambiar = useCallback((m: Modo) => {
    setModo(m)
    try {
      localStorage.setItem(CLAVE, m)
    } catch {
      /* si no se puede guardar, al menos aplica en esta sesión */
    }
  }, [])

  const valor = useMemo(() => ({ modo, efectivo, cambiar }), [modo, efectivo, cambiar])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function usarTema(): ContextoTema {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('usarTema debe usarse dentro de ProveedorTema')
  return ctx
}
