import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { LineaInventario, MetaInventario, SeedCompleto } from '@/lib/tipos'

interface EstadoInventario {
  lineas: LineaInventario[]
  meta: MetaInventario | null
  cargando: boolean
  error: string | null
  recargar: () => void
}

/**
 * Trae el inventario real que BILLIA sincroniza cada 2 horas.
 *
 * No hay respaldo local ni datos de ejemplo a propósito: si la API falla,
 * la pantalla debe decir que no pudo cargar, nunca mostrar cifras viejas
 * que el usuario tomaría por buenas.
 */
export function usarInventario(): EstadoInventario {
  const [lineas, setLineas] = useState<LineaInventario[]>([])
  const [meta, setMeta] = useState<MetaInventario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const seed = await api.get<SeedCompleto>('/seed-all')
      setLineas(Array.isArray(seed.INVENTARIO_DATA) ? seed.INVENTARIO_DATA : [])
      setMeta(seed.INVENTARIO_META ?? null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar el inventario'
      setError(msg)
      setLineas([])
      setMeta(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { lineas, meta, cargando, error, recargar: cargar }
}
