import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { GraficoBarras, GraficoDonut } from '@/componentes/Graficos'
import { usarInventario } from '@/hooks/usarInventario'
import { fechaHoraLima, numero, porcentaje, soles } from '@/lib/formato'

export function Dashboard() {
  const { lineas, meta, cargando, error, recargar } = usarInventario()

  const totales = useMemo(() => {
    const unidades = lineas.reduce((s, l) => s + (l.cant || 0), 0)
    const valorVenta = lineas.reduce((s, l) => s + (l.valor_venta || 0), 0)
    const valorCosto = lineas.reduce((s, l) => s + (l.valor_costo || 0), 0)

    // El margen se calcula SOLO sobre las líneas con costo conocido. Restar
    // los costos que se conocen del valor de venta completo trataría a los
    // productos sin costo como si dieran 100% de margen, y lo inflaba: daba
    // 41.9% donde el real es 40.3%.
    const conCosto = lineas.filter((l) => (l.costo || 0) > 0)
    const ventaConCosto = conCosto.reduce((s, l) => s + (l.valor_venta || 0), 0)
    const margen = ventaConCosto - valorCosto

    return {
      unidades,
      valorVenta,
      valorCosto,
      margen,
      margenPct: ventaConCosto > 0 ? (margen / ventaConCosto) * 100 : null,
      sedes: new Set(lineas.map((l) => l.sede)).size,
      // Qué parte del inventario tiene costo conocido: sin esto, el margen
      // se leería como si aplicara a todo el stock.
      cobertura: valorVenta > 0 ? (ventaConCosto / valorVenta) * 100 : null,
    }
  }, [lineas])

  const porSede = useMemo(() => {
    const mapa = new Map<string, { sede: string; lineas: number; unidades: number; venta: number; costo: number }>()
    for (const l of lineas) {
      const clave = l.sede || '—'
      const acc = mapa.get(clave) ?? { sede: clave, lineas: 0, unidades: 0, venta: 0, costo: 0 }
      acc.lineas += 1
      acc.unidades += l.cant || 0
      acc.venta += l.valor_venta || 0
      acc.costo += l.valor_costo || 0
      mapa.set(clave, acc)
    }
    return [...mapa.values()].sort((a, b) => b.venta - a.venta)
  }, [lineas])

  const porMarca = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const l of lineas) {
      mapa.set(l.marca || '—', (mapa.get(l.marca || '—') || 0) + (l.valor_venta || 0))
    }
    const todas = [...mapa.entries()].sort((a, b) => b[1] - a[1])
    // Más de seis porciones vuelven ilegible el donut: el resto se agrupa.
    const principales = todas.slice(0, 5).map(([marca, venta]) => ({ marca, venta }))
    const resto = todas.slice(5).reduce((s, [, v]) => s + v, 0)
    return resto > 0 ? [...principales, { marca: 'Otras', venta: resto }] : principales
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
          detalle={`${numero(lineas.length)} líneas · ${totales.sedes} sedes`}
          acento="navy"
          cargando={cargando}
        />
        <Kpi
          etiqueta="Inventario a Precio de Venta"
          valor={hayDatos || cargando ? soles(totales.valorVenta) : '—'}
          detalle="Valorizado a precio de lista"
          acento="azul"
          cargando={cargando}
        />
        <Kpi
          etiqueta="Inventario a Costo"
          valor={hayDatos || cargando ? soles(totales.valorCosto) : '—'}
          detalle={
            totales.cobertura == null
              ? 'sin costos cargados'
              : `${porcentaje(totales.cobertura, 0)} del stock con costo`
          }
          acento="naranja"
          cargando={cargando}
        />
        <Kpi
          etiqueta="Margen Potencial"
          valor={hayDatos || cargando ? soles(totales.margen) : '—'}
          detalle={
            totales.margenPct == null
              ? 'sin base de venta'
              : `${porcentaje(totales.margenPct)} sobre el stock costeado`
          }
          acento="verde"
          cargando={cargando}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Valor por Sede</CardTitle>
            <CardDescription>Precio de venta contra costo, por local</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? (
              <SinDatos mensaje="Cargando inventario…" />
            ) : !hayDatos ? (
              <SinDatos mensaje="Todavía no hay inventario sincronizado desde BILLIA." />
            ) : (
              <GraficoBarras
                datos={porSede}
                ejeX="sede"
                series={[
                  { clave: 'venta', etiqueta: 'Valor venta' },
                  { clave: 'costo', etiqueta: 'Valor costo' },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Peso por Marca</CardTitle>
            <CardDescription>Participación en el valor del inventario</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? (
              <SinDatos mensaje="Cargando inventario…" />
            ) : !hayDatos ? (
              <SinDatos mensaje="Sin datos de marca." />
            ) : (
              <GraficoDonut
                datos={porMarca as unknown as Record<string, unknown>[]}
                claveNombre="marca"
                claveValor="venta"
                alto={280}
                etiquetaTotal="Valor total"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Inventario por Sede</CardTitle>
          <CardDescription>Detalle con margen y participación</CardDescription>
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
                      <TableCell className="text-right tabular-nums">{numero(s.lineas)}</TableCell>
                      <TableCell className="text-right tabular-nums">{numero(s.unidades)}</TableCell>
                      <TableCell className="text-right tabular-nums">{soles(s.venta)}</TableCell>
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
