import { useMemo, useState } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { SinDatos } from '@/componentes/Estados'
import { TablaLarga } from '@/componentes/Tabla'
import { usarSeed } from '@/hooks/usarSeed'
import { guardarAlmacen, ConflictoAlmacen } from '@/lib/almacen'
import { numero, soles } from '@/lib/formato'
import type { Transaccion } from '@/lib/tipos'

/**
 * El lector de Excel pesa más de medio mega. Se trae solo cuando alguien va a
 * importar de verdad, en vez de cargarlo en el arranque de toda la aplicación
 * para una pantalla que casi nunca se abre.
 */
const cargarXLSX = () => import('@e965/xlsx')

/** Cabeceras aceptadas para cada campo, como en la aplicación anterior. */
const ALIAS: Record<string, string[]> = {
  fecha: ['Fecha', 'fecha', 'FECHA'],
  canal: ['Canal', 'canal', 'CANAL'],
  tipo_doc: ['Tipo_Comprobante', 'Tipo Comprobante', 'TipoComprobante', 'Comprobante', 'tipo_doc', 'Tipo'],
  serie: ['Serie', 'serie', 'SERIE'],
  correlativo: ['Correlativo', 'Correl', 'correlativo', 'Numero', 'Número', 'N'],
  modelo: ['Modelo', 'modelo', 'MODELO', 'Producto', 'producto'],
  marca: ['Marca', 'marca', 'MARCA'],
  qty: ['Qty', 'Cantidad', 'qty', 'cantidad', 'CANT'],
  venta: ['Venta_S/.', 'Venta', 'venta', 'Precio', 'Precio_Venta', 'PrecioVenta', 'Total', 'total'],
  costo: ['Costo_S/.', 'Costo', 'costo', 'Costo_Unit', 'CostoUnit'],
  medio_pago: ['Medio_Pago', 'Medio Pago', 'MedioPago', 'medio_pago', 'Medio'],
}

const CABECERAS = [
  'Fecha', 'Canal', 'Tipo_Comprobante', 'Serie', 'Correlativo',
  'Modelo', 'Marca', 'Qty', 'Venta_S/.', 'Costo_S/.', 'Medio_Pago',
]

type Fila = Record<string, unknown>

const tomar = (f: Fila, campo: string): string => {
  for (const n of ALIAS[campo] ?? []) {
    const v = f[n]
    if (v !== undefined && v !== null && String(v) !== '') return String(v)
  }
  return ''
}

const aNumero = (v: string): number => {
  const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Las fechas de Excel llegan como número de serie (días desde 1899-12-30) o
 * como texto. Se normaliza todo a AAAA-MM-DD, que es como guarda el CRM.
 */
function aFecha(v: string): string {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const serie = Number(v)
  if (Number.isFinite(serie) && serie > 20000 && serie < 60000) {
    const d = new Date(Date.UTC(1899, 11, 30) + serie * 86_400_000)
    return d.toISOString().slice(0, 10)
  }
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export function CargaVentas() {
  const { crudo, transacciones, recargar } = usarSeed()
  const [leidas, setLeidas] = useState<Transaccion[] | null>(null)
  const [descartadas, setDescartadas] = useState(0)
  const [archivo, setArchivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [hecho, setHecho] = useState<number | null>(null)

  /** Firma de la aplicación anterior, para no volver a meter lo mismo. */
  const yaEstan = useMemo(
    () => new Set(transacciones.map((t) =>
      `${t.serie ?? ''}-${t.correlativo ?? ''}-${t.fecha ?? ''}-${Number(t.venta) || 0}`)),
    [transacciones],
  )

  const nuevas = useMemo(
    () => (leidas ?? []).filter((t) =>
      !yaEstan.has(`${t.serie ?? ''}-${t.correlativo ?? ''}-${t.fecha ?? ''}-${Number(t.venta) || 0}`)),
    [leidas, yaEstan],
  )
  const repetidas = (leidas?.length ?? 0) - nuevas.length

  const totales = useMemo(() => {
    const venta = nuevas.reduce((s, t) => s + (t.venta || 0), 0)
    const conCosto = nuevas.filter((t) => (t.costo || 0) > 0)
    const costo = conCosto.reduce((s, t) => s + t.costo, 0)
    const ventaCosteada = conCosto.reduce((s, t) => s + (t.venta || 0), 0)
    return { venta, costo, margen: ventaCosteada - costo, sinCosto: nuevas.length - conCosto.length }
  }, [nuevas])

  async function descargarPlantilla() {
    const XLSX = await cargarXLSX()
    const ws = XLSX.utils.aoa_to_sheet([
      CABECERAS,
      ['2026-05-01', 'Malvitec', 'BOLETA', 'B001', '12345', 'CS-H8C 5MP', 'EZVIZ', 1, 250, 169, 'YAPE/PLIN'],
      ['2026-05-02', 'Compuplaza', 'FACTURA', 'F001', '6789', 'MSI Thin A15', 'MSI', 1, 3200, 2240, 'TRANSFERENCIA'],
    ])
    ws['!cols'] = CABECERAS.map(() => ({ wch: 15 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
    XLSX.writeFile(wb, 'plantilla_ventas_revionix.xlsx')
  }

  async function leerArchivo(f: File) {
    setError(null)
    setHecho(null)
    setArchivo(f.name)
    try {
      const XLSX = await cargarXLSX()
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const hoja = wb.Sheets[wb.SheetNames[0]]
      const filas = XLSX.utils.sheet_to_json<Fila>(hoja, { defval: '' })

      let fuera = 0
      const parsed: Transaccion[] = []
      for (const f of filas) {
        const venta = aNumero(tomar(f, 'venta'))
        // Sin importe no hay venta que registrar: casi siempre es una fila de
        // totales o una línea en blanco al final de la hoja.
        if (venta <= 0) { fuera++; continue }
        const fecha = aFecha(tomar(f, 'fecha'))
        const qty = Math.max(1, Math.round(aNumero(tomar(f, 'qty')) || 1))
        parsed.push({
          fecha,
          mes: fecha.slice(0, 7),
          canal: tomar(f, 'canal'),
          tipo_doc: tomar(f, 'tipo_doc'),
          serie: tomar(f, 'serie'),
          correlativo: tomar(f, 'correlativo'),
          modelo: tomar(f, 'modelo'),
          marca: tomar(f, 'marca') || 'Otros',
          medio_pago: tomar(f, 'medio_pago'),
          qty,
          venta,
          costo: aNumero(tomar(f, 'costo')),
        })
      }
      setDescartadas(fuera)
      setLeidas(parsed)
      if (!parsed.length) {
        setError('No se encontró ninguna venta con importe. Revisa que la columna "Venta_S/." tenga montos y que las cabeceras coincidan con la plantilla.')
      }
    } catch (e) {
      setLeidas(null)
      setError(e instanceof Error ? `No se pudo leer el archivo: ${e.message}` : 'No se pudo leer el archivo')
    }
  }

  async function confirmar() {
    if (!nuevas.length) return
    setGuardando(true)
    setError(null)
    try {
      // Se escriben en rv_ventas, la misma clave que usa la aplicación
      // anterior, para que las dos vean lo mismo mientras convivan.
      await guardarAlmacen({ rv_ventas: [...crudo.ventasLocales, ...nuevas] })
      setHecho(nuevas.length)
      setLeidas(null)
      setArchivo('')
      await recargar()
    } catch (e) {
      setError(e instanceof ConflictoAlmacen
        ? `${e.message} Vuelve a cargar el archivo.`
        : e instanceof Error ? e.message : 'No se pudo guardar')
      if (e instanceof ConflictoAlmacen) { setLeidas(null); await recargar() }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Carga de ventas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Importa un Excel de ventas. Nada se guarda hasta que revises lo que se leyó.
        </p>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>1 · El archivo</CardTitle>
          <CardDescription>
            Descarga la plantilla si es la primera vez: las cabeceras tienen que
            coincidir para que las columnas se reconozcan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => void descargarPlantilla()}>
            <Download className="size-4" /> Descargar plantilla
          </Button>
          <div className="flex-1 sm:max-w-sm">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              aria-label="Archivo de ventas"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void leerArchivo(f)
              }}
            />
          </div>
          {archivo && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Upload className="size-3" /> {archivo}
            </p>
          )}
        </CardContent>
      </Card>

      {hecho != null && (
        <Card className="border-chart-2/40 bg-chart-2/5">
          <CardContent className="py-3 text-sm">
            Se registraron <strong>{numero(hecho)}</strong> ventas. Ya aparecen en
            Ventas, Mes a Mes y el EBITDA.
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive" role="alert">{error}</CardContent>
        </Card>
      )}

      {leidas != null && leidas.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi etiqueta="Se van a registrar" valor={numero(nuevas.length)}
              detalle={repetidas > 0 ? `${numero(repetidas)} ya estaban, se omiten` : 'ninguna repetida'}
              acento="navy" />
            <Kpi etiqueta="Venta" valor={soles(totales.venta)}
              detalle={descartadas > 0 ? `${numero(descartadas)} filas sin importe, descartadas` : 'todas con importe'}
              acento="azul" />
            <Kpi etiqueta="Costo declarado" valor={totales.costo > 0 ? soles(totales.costo) : '—'}
              detalle={totales.sinCosto > 0 ? `${numero(totales.sinCosto)} sin costo` : 'todas con costo'}
              acento="rojo" />
            <Kpi etiqueta="Margen estimado"
              valor={totales.costo > 0 ? soles(totales.margen) : '—'}
              detalle="solo sobre las que traen costo" acento="verde" />
          </div>

          <Card className="t-card-hover">
            <CardHeader>
              <CardTitle>2 · Revisa antes de guardar</CardTitle>
              <CardDescription>
                Las repetidas se detectan por serie, correlativo, fecha e importe
                — el mismo criterio que usa el CRM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!nuevas.length ? (
                <SinDatos mensaje="Todas las filas del archivo ya estaban registradas." />
              ) : (
                <>
                  <TablaLarga alto="50vh">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Canal</TableHead>
                          <TableHead>Comprobante</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="text-right">Venta</TableHead>
                          <TableHead className="text-right">Costo</TableHead>
                          <TableHead>Medio de pago</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nuevas.map((t, i) => (
                          <TableRow key={i}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {t.fecha || <Badge variant="destructive">sin fecha</Badge>}
                            </TableCell>
                            <TableCell className="text-xs">{t.canal || '—'}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {[t.serie, t.correlativo].filter(Boolean).join('-') || '—'}
                            </TableCell>
                            <TableCell className="text-xs">
                          {/* En un div, no en la celda: una celda de tabla
                              ignora max-width y el texto invade la columna
                              vecina. El nombre completo va en el title. */}
                          <div className="max-w-[20rem] truncate" title={String(t.modelo ?? '')}>
                            {t.modelo || '—'}
                          </div>
                        </TableCell>
                            <TableCell className="text-xs">{t.marca}</TableCell>
                            <TableCell className="text-right tabular-nums">{numero(t.qty)}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{soles(t.venta)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {t.costo > 0 ? soles(t.costo) : '—'}
                            </TableCell>
                            <TableCell className="text-xs">{t.medio_pago || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TablaLarga>

                  <div className="flex flex-wrap gap-2">
                    <Button className="gap-2" disabled={guardando} onClick={confirmar}>
                      {guardando && <Loader2 className="size-4 animate-spin" />}
                      {guardando ? 'Guardando…' : `Registrar ${numero(nuevas.length)} ventas`}
                    </Button>
                    <Button variant="outline" disabled={guardando}
                      onClick={() => { setLeidas(null); setArchivo(''); setError(null) }}>
                      Descartar
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
