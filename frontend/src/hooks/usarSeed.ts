import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type {
  Compra,
  Ecommerce,
  Fijo,
  Gasto,
  LineaInventario,
  MetaInventario,
  Planilla,
  SeedCompleto,
  Transaccion,
  VentaBillia,
  VentaCorp,
} from '@/lib/tipos'

export interface DatosSeed {
  inventario: LineaInventario[]
  inventarioMeta: MetaInventario | null
  transacciones: Transaccion[]
  ventasBillia: VentaBillia[]
  ventasCorp: VentaCorp[]
  ecommerce: Ecommerce[]
  compras: Compra[]
  gastos: Gasto[]
  planilla: Planilla[]
  alquileres: Fijo[]
  pagosFijos: Fijo[]
}

const VACIO: DatosSeed = {
  inventario: [], inventarioMeta: null, transacciones: [], ventasBillia: [],
  ventasCorp: [], ecommerce: [], compras: [], gastos: [], planilla: [], alquileres: [], pagosFijos: [],
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/**
 * Trae de una sola vez todo lo que el servidor guarda en seed_snapshot.
 *
 * Se hace en un solo hook y no uno por página porque `/api/seed-all` devuelve
 * el paquete completo: pedirlo en cada pantalla sería descargar lo mismo
 * varias veces. Las páginas filtran de aquí lo que necesitan.
 *
 * Igual que con el inventario: si la API falla no hay respaldo local. La
 * pantalla dice que no pudo cargar, nunca inventa una cifra.
 */
export function usarSeed() {
  const [datos, setDatos] = useState<DatosSeed>(VACIO)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      // Dos fuentes, no una: el snapshot del servidor y el almacenamiento
      // compartido. La aplicación anterior integra rv_ventas y rv_gastos
      // dentro de TXNS_DATA y GASTOS_DATA en el navegador, así que leer solo
      // el snapshot dejaba fuera junio, julio y agosto.
      const [s, almacen] = await Promise.all([
        api.get<SeedCompleto>('/seed-all'),
        api.get<Record<string, string>>('/storage').catch(() => ({}) as Record<string, string>),
      ])

      const deAlmacen = <T,>(clave: string): T[] => {
        try {
          const v = JSON.parse(almacen[clave] ?? '[]')
          return Array.isArray(v) ? (v as T[]) : []
        } catch {
          return []
        }
      }

      // Se descartan los registros que el usuario marcó como eliminados, igual
      // que hace la aplicación anterior.
      const eliminados = new Set(deAlmacen<string | number>('rv_eliminados').map(String))
      const vivos = <T extends { id?: string | number }>(f: T[]) =>
        f.filter((x) => !(x?.id != null && eliminados.has(String(x.id))))

      // Clave de identidad de una venta: mismo documento y mismo importe. Sin
      // esto, las ventas que ya están en el snapshot se contarían dos veces.
      const claveVenta = (v: Transaccion) =>
        `${v.serie ?? ''}-${v.correlativo ?? ''}-${v.fecha ?? ''}-${v.venta ?? 0}`
      const delSnapshot = arr<Transaccion>(s.TXNS_DATA)
      const yaEstan = new Set(delSnapshot.map(claveVenta))
      const extraVentas = deAlmacen<Transaccion>('rv_ventas').filter(
        (v) => !yaEstan.has(claveVenta(v)),
      )

      const extraGastos = vivos(deAlmacen<Gasto>('rv_gastos'))

      setDatos({
        inventario: arr<LineaInventario>(s.INVENTARIO_DATA),
        inventarioMeta: (s.INVENTARIO_META as MetaInventario) ?? null,
        transacciones: [...delSnapshot, ...extraVentas],
        ventasBillia: arr<VentaBillia>(s.VENTAS_BILLIA_DATA),
        ventasCorp: arr<VentaCorp>(s.CORP_VENTAS_DATA),
        ecommerce: arr<Ecommerce>(s.ECOMMERCE_DATA),
        compras: arr<Compra>(s.COMPRAS_DATA),
        gastos: [...arr<Gasto>(s.GASTOS_DATA), ...extraGastos],
        planilla: arr<Planilla>(s.PLANILLA_DATA),
        alquileres: arr<Fijo>(s.ALQUILERES_DATA),
        pagosFijos: arr<Fijo>(s.PAGOS_FIJOS_DATA),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos')
      setDatos(VACIO)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { ...datos, cargando, error, recargar: cargar }
}
