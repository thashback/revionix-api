import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { usarRecargaAlSincronizar } from '@/lib/sincronizacion'
import { cargarRevisiones } from '@/lib/almacen'
import type {
  Compra,
  Ecommerce,
  Fijo,
  Gasto,
  LineaInventario,
  MetaInventario,
  Planilla,
  PlanillaMes,
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
  /**
   * Planilla mes a mes (rv_planilla). PLANILLA_DATA es una foto de un solo
   * mes sin periodo; esta lleva año y mes, y es la que tiene los 65 registros
   * cargados de abril a julio.
   */
  planillaMensual: PlanillaMes[]
  /** Recibo por honorarios de cada registro de planilla, indexado por su id. */
  planillaPdfs: Record<string, string>
  alquileres: Fijo[]
  pagosFijos: Fijo[]
  /** Estado de cobro por cliente, editado a mano en la aplicación anterior. */
  estadosCorp: Record<string, string>
  /**
   * Lo que hace falta para ESCRIBIR: al guardar hay que reenviar la clave
   * entera, no solo el registro tocado, así que se conserva tal cual vino.
   */
  crudo: {
    gastosLocales: Gasto[]
    edicionesGasto: Record<string, unknown>
    edicionesTxn: Record<string, unknown>
    pdfs: Record<string, string>
    planillaPdfs: Record<string, string>
    lapidas: Record<string, unknown>
    ventasLocales: Transaccion[]
  }
}

const VACIO: DatosSeed = {
  inventario: [], inventarioMeta: null, transacciones: [], ventasBillia: [],
  ventasCorp: [], ecommerce: [], compras: [], gastos: [], planilla: [], planillaMensual: [], planillaPdfs: {}, alquileres: [], pagosFijos: [], estadosCorp: {},
  crudo: { gastosLocales: [], edicionesGasto: {}, edicionesTxn: {}, pdfs: {}, planillaPdfs: {}, lapidas: {}, ventasLocales: [] },
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
        // Las revisiones hacen falta para poder escribir con bloqueo optimista.
        cargarRevisiones(),
      ])

      const deAlmacen = <T,>(clave: string): T[] => {
        try {
          const v = JSON.parse(almacen[clave] ?? '[]')
          return Array.isArray(v) ? (v as T[]) : []
        } catch {
          return []
        }
      }

      const objAlmacen = (clave: string): Record<string, unknown> => {
        try {
          const v = JSON.parse(almacen[clave] ?? '{}')
          return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
        } catch {
          return {}
        }
      }

      // Las lápidas de borrado vienen como { gasto: {id: 1}, txn: {...} }, no
      // como lista: la aplicación anterior las guarda así.
      const lapidas = objAlmacen('rv_eliminados')
      const gastosBorrados = new Set(
        Object.keys((lapidas.gasto as Record<string, unknown>) ?? {}).map(String),
      )
      const txnsBorradas = new Set(
        Object.keys((lapidas.txn as Record<string, unknown>) ?? {}).map(String),
      )
      const vivos = <T extends { id?: string | number }>(f: T[]) =>
        f.filter((x) => !(x?.id != null && gastosBorrados.has(String(x.id))))

      const num = (x: unknown) => Number(x) || 0

      /**
       * Firma de una venta, idéntica a la que usa la aplicación anterior
       * (app.js:2313). Es la clave con la que guarda cada edición, así que
       * tiene que coincidir carácter por carácter o las ediciones se pierden.
       */
      const firma = (t: Transaccion) =>
        [t.fecha || '', t.canal || '', t.modelo || '', t.marca || '',
          num(t.venta), num(t.costo), t.serie || '', t.correlativo || ''].join('|')

      const edicionesTxn = objAlmacen('rv_ediciones_txn')
      const edicionesGasto = objAlmacen('rv_ediciones_gasto')

      /** Aplica la edición guardada encima del registro original, si existe. */
      const conEdicionTxn = (t: Transaccion): Transaccion => {
        const e = edicionesTxn[firma(t)]
        return e && typeof e === 'object' ? { ...t, ...(e as Partial<Transaccion>) } : t
      }
      const conEdicionGasto = (g: Gasto): Gasto => {
        const e = g.id != null ? edicionesGasto[String(g.id)] : undefined
        return e && typeof e === 'object' ? { ...g, ...(e as Partial<Gasto>) } : g
      }

      // Clave de identidad de una venta: mismo documento y mismo importe. Sin
      // esto, las ventas que ya están en el snapshot se contarían dos veces.
      const claveVenta = (v: Transaccion) =>
        `${v.serie ?? ''}-${v.correlativo ?? ''}-${v.fecha ?? ''}-${v.venta ?? 0}`
      const delSnapshot = arr<Transaccion>(s.TXNS_DATA)
      const yaEstan = new Set(delSnapshot.map(claveVenta))
      const extraVentas = deAlmacen<Transaccion>('rv_ventas').filter(
        (v) => !yaEstan.has(claveVenta(v)),
      )
      const todasVentas = [...delSnapshot, ...extraVentas]
        .filter((t) => !txnsBorradas.has(firma(t)))
        .map(conEdicionTxn)

      const todosGastos = [...vivos(arr<Gasto>(s.GASTOS_DATA)), ...vivos(deAlmacen<Gasto>('rv_gastos'))]
        .map(conEdicionGasto)

      // Comprobantes en PDF: la aplicación anterior los indexa por 'g'+id para
      // los que tienen id, y por 's'+posición para los del snapshot que no.
      const pdfs = objAlmacen('rv_gastos_pdfs') as Record<string, string>
      const gastosConPdf = todosGastos.map((g, i) => ({
        ...g,
        pdf: (g.id != null ? pdfs['g' + g.id] : undefined) ?? pdfs['s' + i] ?? null,
      }))

      setDatos({
        inventario: arr<LineaInventario>(s.INVENTARIO_DATA),
        inventarioMeta: (s.INVENTARIO_META as MetaInventario) ?? null,
        transacciones: todasVentas,
        ventasBillia: arr<VentaBillia>(s.VENTAS_BILLIA_DATA),
        ventasCorp: arr<VentaCorp>(s.CORP_VENTAS_DATA),
        ecommerce: arr<Ecommerce>(s.ECOMMERCE_DATA),
        compras: arr<Compra>(s.COMPRAS_DATA),
        gastos: gastosConPdf,
        planilla: arr<Planilla>(s.PLANILLA_DATA),
        planillaMensual: deAlmacen<PlanillaMes>('rv_planilla'),
        planillaPdfs: objAlmacen('rv_planilla_pdfs') as Record<string, string>,
        alquileres: arr<Fijo>(s.ALQUILERES_DATA),
        pagosFijos: arr<Fijo>(s.PAGOS_FIJOS_DATA),
        estadosCorp: objAlmacen('rv_corp_estados') as Record<string, string>,
        crudo: {
          gastosLocales: deAlmacen<Gasto>('rv_gastos'),
          edicionesGasto,
          edicionesTxn,
          pdfs,
          planillaPdfs: objAlmacen('rv_planilla_pdfs') as Record<string, string>,
          lapidas,
          ventasLocales: deAlmacen<Transaccion>('rv_ventas'),
        },
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

  // Cuando BILLIA empuja datos nuevos, la pantalla se pone al día sola: antes
  // el sello de la cabecera avanzaba y las cifras se quedaban como estaban.
  usarRecargaAlSincronizar(cargar)

  return { ...datos, cargando, error, recargar: cargar }
}
