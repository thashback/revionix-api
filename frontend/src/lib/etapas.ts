/**
 * ETAPAS DE UN PROYECTO / ORDEN DE COMPRA
 *
 * Traducción de la lógica que ya usa la aplicación anterior (app.js:200,
 * `rvCalcularEtapas`). Los plazos son por proyecto porque varían según el
 * proveedor, y la fabricación no arranca el día de la OC: antes hay un plazo
 * de confirmación de 10 días por defecto.
 */

export interface Proyecto {
  id: number
  numero_oc: string
  fecha_oc: string | null
  cliente: string
  descripcion: string
  monto_total: number | string
  monto_ejecutado: number | string
  costo?: number | string
  estado: string
  condicion_pago?: string
  ruta_oc?: string | null
  etapa?: string | null
  dias_espera?: number | null
  dias_fabricacion?: number | null
  dias_envio?: number | null
  fecha_inicio_etapas?: string | null
}

export type IdEtapa = 'oc' | 'espera' | 'fabricacion' | 'envio' | 'entrega'

export const ETAPAS: { id: IdEtapa; nombre: string }[] = [
  { id: 'oc', nombre: 'OC emitida' },
  { id: 'espera', nombre: 'Confirmación' },
  { id: 'fabricacion', nombre: 'Fabricación' },
  { id: 'envio', nombre: 'Envío' },
  { id: 'entrega', nombre: 'Entrega' },
]

export interface Tramo {
  id: IdEtapa
  nombre: string
  desde: string
  hasta: string
  dias: number
  estado: 'completada' | 'en_curso' | 'pendiente'
}

export interface Avance {
  tramos: Tramo[]
  actual: IdEtapa
  indiceActual: number
  /** Porcentaje recorrido DENTRO de la etapa en curso, no del proyecto. */
  avance: number
  diasRestantes: number
  entregaEstimada: string
  /** true cuando la etapa en curso ya pasó su fecha de fin. */
  atrasado: boolean
}

const DIA = 86_400_000

function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  d.setDate(d.getDate() + (Number(dias) || 0))
  return d.toISOString().slice(0, 10)
}

const diferenciaDias = (a: string, b: string) =>
  Math.round((new Date(a + 'T00:00:00').getTime() - new Date(b + 'T00:00:00').getTime()) / DIA)

export function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Devuelve null cuando el proyecto no tiene fecha con la que calcular nada. */
export function calcularEtapas(p: Proyecto, hoyISO?: string): Avance | null {
  const inicio = String(p.fecha_inicio_etapas || p.fecha_oc || '').slice(0, 10)
  if (!inicio) return null

  const dEspera = p.dias_espera == null ? 10 : num(p.dias_espera)
  const dFabricacion = num(p.dias_fabricacion)
  const dEnvio = num(p.dias_envio)

  const iniFab = sumarDias(inicio, dEspera)
  const finFab = sumarDias(iniFab, dFabricacion)
  const finEnv = sumarDias(finFab, dEnvio)
  const hoy = hoyISO ?? new Date().toISOString().slice(0, 10)

  const base: Omit<Tramo, 'estado'>[] = [
    { ...ETAPAS[0], desde: inicio, hasta: inicio, dias: 0 },
    { ...ETAPAS[1], desde: inicio, hasta: iniFab, dias: dEspera },
    { ...ETAPAS[2], desde: iniFab, hasta: finFab, dias: dFabricacion },
    { ...ETAPAS[3], desde: finFab, hasta: finEnv, dias: dEnvio },
    { ...ETAPAS[4], desde: finEnv, hasta: finEnv, dias: 0 },
  ]

  // La etapa marcada a mano manda; si no hay, se deduce por fecha.
  let actual = (p.etapa as IdEtapa) || null
  if (!actual) {
    if (hoy < inicio) actual = 'oc'
    else if (hoy < iniFab) actual = 'espera'
    else if (hoy <= finFab) actual = 'fabricacion'
    else if (hoy <= finEnv) actual = 'envio'
    else actual = 'entrega'
  }
  let indiceActual = base.findIndex((t) => t.id === actual)
  if (indiceActual < 0) indiceActual = 0 // etapa guardada que ya no existe

  const tramos: Tramo[] = base.map((t, i) => ({
    ...t,
    estado: i < indiceActual ? 'completada' : i === indiceActual ? 'en_curso' : 'pendiente',
  }))

  const t = tramos[indiceActual]
  const avance = t.dias > 0
    ? Math.max(0, Math.min(100, Math.round((diferenciaDias(hoy, t.desde) / t.dias) * 100)))
    : 100
  const diasRestantes = diferenciaDias(t.hasta, hoy)

  return {
    tramos,
    actual,
    indiceActual,
    avance,
    diasRestantes,
    entregaEstimada: finEnv,
    atrasado: diasRestantes < 0 && actual !== 'entrega',
  }
}
