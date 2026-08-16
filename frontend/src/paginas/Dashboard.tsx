import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { usarInventario } from '@/hooks/usarInventario'
import { fechaHoraLima, numero, porcentaje, soles } from '@/lib/formato'

export function Dashboard() {
  const { lineas, meta, cargando, error, recargar } = usarInventario()

  const totales = useMemo(() => {
    const unidades = lineas.reduce((s, l) => s + (l.cant || 0), 0)
    const valorVenta = lineas.reduce((s, l) => s + (l.valor_venta || 0), 0)
    const valorCosto = lineas.reduce((s, l) => s + (l.valor_costo || 0), 0)
    return {
      unidades,
      valorVenta,
      valorCosto,
      margen: valorVenta - valorCosto,
      margenPct: valorVenta > 0 ? ((valorVenta - valorCosto) / valorVenta) * 100 : null,
      sedes: new Set(lineas.map((l) => l.sede)).size,
    }
  }, [lineas])

  /** Resumen por sede, calculado sobre el inventario real. */
  const porSede = useMemo(() => {
    const mapa = new Map<
      string,
      { sede: string; lineas: number; unidades: number; venta: number; costo: number }
    >()
    for (const l of lineas) {
      const clave = l.sede || '—'
      const acc = mapa.get(clave) ?? {
        sede: clave,
        lineas: 0,
        unidades: 0,
        venta: 0,
        costo: 0,
      }
      acc.lineas += 1
      acc.unidades += l.cant || 0
      acc.venta += l.valor_venta || 0
      acc.costo += l.valor_costo || 0
      mapa.set(clave, acc)
    }
    return [...mapa.values()].sort((a, b) => b.venta - a.venta)
  }, [lineas])

  const sello = fechaHoraLima(meta?.actualizado)
  const hayDatos = lineas.length > 0

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard Ejecutivo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sello
            ? `Inventario real sincronizado desde BILLIA · ${sello}`
            : 'Inventario real sincronizado desde BILLIA'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          etiqueta="Unidades en Stock"
          valor={hayDatos || cargando ? numero(totales.unidades) : '—'}
          detalle={`${numero(lineas.length)} líneas de inventario`}
          acento="navy"
          cargando={cargando}
        />
        <Kpi
          etiqueta="Inventario a Precio de Venta"
          valor={hayDatos || cargando ? soles(totales.valorVenta) : '—'}
          detalle={`${totales.sedes} sedes`}
          acento="verde"
          cargando={cargando}
        />
        <Kpi
          etiqueta="Inventario a Costo"
          valor={hayDatos || cargando ? soles(totales.valorCosto) : '—'}
          detalle="Solo productos con costo"
          acento="azul"
          cargando={cargando}
        />
        <Kpi
          etiqueta="Margen Potencial"
          valor={hayDatos || cargando ? soles(totales.margen) : '—'}
          detalle={
            totales.margenPct == null
              ? 'sin base de venta'
              : `${porcentaje(totales.margenPct)} sobre venta`
          }
          acento="naranja"
          cargando={cargando}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario por Sede</CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <SinDatos mensaje="Cargando inventario…" />
          ) : !hayDatos ? (
            <SinDatos mensaje="Todavía no hay inventario sincronizado desde BILLIA." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sede</TableHead>
                    <TableHead className="text-right">Líneas</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Valor Venta</TableHead>
                    <TableHead className="text-right">Valor Costo</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">% del Inventario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porSede.map((s) => (
                    <TableRow key={s.sede}>
                      <TableCell className="font-medium">{s.sede}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {numero(s.lineas)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {numero(s.unidades)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {soles(s.venta)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.costo > 0 ? soles(s.costo) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.costo > 0 ? soles(s.venta - s.costo) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {totales.valorVenta > 0
                          ? porcentaje((s.venta / totales.valorVenta) * 100)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
