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
