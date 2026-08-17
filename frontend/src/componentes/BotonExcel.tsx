import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * DESCARGA A EXCEL
 *
 * El lector/escritor de hojas pesa medio mega, así que se trae solo cuando
 * alguien pulsa el botón. No se carga en el arranque para una acción que la
 * mayoría de visitas no llega a usar.
 */
const cargarXLSX = () => import('@e965/xlsx')

export interface ColumnaExcel<T> {
  /** Título de la cabecera en la hoja. */
  titulo: string
  /**
   * Qué sacar de cada fila. Devolver número cuando sea número: si va como
   * texto, Excel no deja sumarlo ni ordenarlo, que es justo para lo que la
   * gente se descarga esto.
   */
  valor: (f: T) => string | number | null | undefined
  /** Ancho de columna en caracteres. */
  ancho?: number
}

/** Nombre de archivo con la fecha, para que no se pisen unas descargas a otras. */
function nombreArchivo(base: string): string {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  return `revionix_${base}_${hoy}.xlsx`
}

export function BotonExcel<T>({
  nombre,
  hoja,
  columnas,
  filas,
  etiqueta = 'Excel',
  variant = 'outline',
}: {
  /** Base del nombre del archivo, en minúsculas y sin espacios. */
  nombre: string
  /** Nombre de la pestaña dentro del libro. Excel la corta a 31 caracteres. */
  hoja?: string
  columnas: ColumnaExcel<T>[]
  filas: T[]
  etiqueta?: string
  variant?: 'outline' | 'ghost' | 'secondary'
}) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(false)

  async function descargar() {
    if (!filas.length) return
    setOcupado(true)
    setError(false)
    try {
      const XLSX = await cargarXLSX()
      const datos = [
        columnas.map((c) => c.titulo),
        ...filas.map((f) => columnas.map((c) => {
          const v = c.valor(f)
          // null y undefined van como celda vacía, no como el texto "null".
          return v == null ? '' : v
        })),
      ]
      const ws = XLSX.utils.aoa_to_sheet(datos)
      // Ancho por el contenido más largo, mirando solo las primeras filas:
      // recorrer diez mil para medir texto no cambia el resultado y se nota.
      ws['!cols'] = columnas.map((c) => ({
        wch: c.ancho ?? Math.min(40, Math.max(
          c.titulo.length + 2,
          ...filas.slice(0, 200).map((f) => String(c.valor(f) ?? '').length + 2),
          10,
        )),
      }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, (hoja ?? nombre).slice(0, 31))
      XLSX.writeFile(wb, nombreArchivo(nombre))
    } catch {
      setError(true)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className="gap-2"
      disabled={ocupado || !filas.length}
      onClick={() => void descargar()}
      title={filas.length
        ? `Descargar ${filas.length} filas en Excel`
        : 'No hay datos que descargar'}
    >
      {ocupado ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {error ? 'No se pudo' : ocupado ? 'Generando…' : etiqueta}
    </Button>
  )
}
