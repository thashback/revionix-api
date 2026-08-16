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
