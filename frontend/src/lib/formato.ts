/** Formatos de moneda y fecha en la convención peruana que usa el sistema. */

export function soles(n: number | null | undefined, decimales = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  return (
    'S/. ' +
    n.toLocaleString('es-PE', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })
  )
}

export function numero(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-PE')
}

export function porcentaje(n: number | null | undefined, decimales = 1): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toFixed(decimales) + '%'
}

const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** "2026-03" → "Mar-26". Los periodos vienen siempre como AAAA-MM. */
export function etiquetaMes(periodo: string): string {
  const [a, m] = String(periodo ?? '').split('-')
  return m ? `${MES_CORTO[Number(m) - 1]}-${a.slice(2)}` : String(periodo ?? '—')
}

/** "2026-03" → "Marzo 2026", para títulos donde cabe el nombre completo. */
export function mesLargo(periodo: string): string {
  const LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const [a, m] = String(periodo ?? '').split('-')
  return m ? `${LARGO[Number(m) - 1]} ${a}` : String(periodo ?? '—')
}

/** Solo la hora, en Lima. Para el sello corto de la cabecera. */
export function horaLima(iso: string | undefined | null): string | null {
  if (!iso) return null
  const f = new Date(iso)
  if (Number.isNaN(f.getTime())) return null
  return f.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  })
}

/**
 * "hace 12 min", "hace 3 h". Acompaña a la hora exacta: la hora sola no dice
 * si el dato es de recién o de anteayer a la misma hora.
 */
export function haceCuanto(iso: string | undefined | null): string | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  const min = Math.max(0, Math.round((Date.now() - t) / 60_000))
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}

/** Fecha y hora en horario de Lima, para el sello de sincronización. */
export function fechaHoraLima(iso: string | undefined | null): string | null {
  if (!iso) return null
  const f = new Date(iso)
  if (Number.isNaN(f.getTime())) return null
  return f.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  })
}
