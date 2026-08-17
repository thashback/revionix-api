import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut, agrupar, topYResto } from '@/componentes/Graficos'
import { usarSeed } from '@/hooks/usarSeed'
import { numero, porcentaje, soles } from '@/lib/formato'

export function Canales() {
  const { transacciones, cargando, error, recargar } = usarSeed()

  const porCanal = useMemo(() => {
    const base = agrupar(transacciones, (t) => t.canal, {
      venta: (t) => t.venta || 0,
      // El costo solo se acumula donde se conoce, y aparte se lleva la venta
      // de esas mismas líneas: si no, el margen sale inflado.
      costo: (t) => (t.costo > 0 ? t.costo : 0),
      ventaCosteada: (t) => (t.costo > 0 ? t.venta || 0 : 0),
      items: (t) => t.qty || 1,
      operaciones: () => 1,
    })
    // Los campos se nombran uno a uno en vez de propagar `c`: `agrupar`
    // devuelve un índice de números, y al propagarlo TypeScript pierde de
    // vista qué claves existen.
    return base
      .map((c) => ({
        nombre: c.nombre,
        venta: c.venta,
        costo: c.costo,
        ventaCosteada: c.ventaCosteada,
        items: c.items,
        operaciones: c.operaciones,
        margen: c.ventaCosteada - c.costo,
        margenPct: c.ventaCosteada > 0 ? ((c.ventaCosteada - c.costo) / c.ventaCosteada) * 100 : null,
        ticket: c.operaciones > 0 ? c.venta / c.operaciones : 0,
      }))
      .sort((a, b) => b.venta - a.venta)
  }, [transacciones])

  const totales = useMemo(() => {
    const venta = porCanal.reduce((s, c) => s + c.venta, 0)
    const costo = porCanal.reduce((s, c) => s + c.costo, 0)
    const costeada = porCanal.reduce((s, c) => s + c.ventaCosteada, 0)
    const ops = porCanal.reduce((s, c) => s + c.operaciones, 0)
    const mejor = porCanal[0] ?? null
    return {
      venta, costo, ops, mejor,
      margen: costeada - costo,
      margenPct: costeada > 0 ? ((costeada - costo) / costeada) * 100 : null,
      ticket: ops > 0 ? venta / ops : 0,
    }
  }, [porCanal])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = porCanal.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Canales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuánto vende y cuánto deja cada punto de venta
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Venta total" valor={hay || cargando ? soles(totales.venta) : '—'}
          detalle={`${numero(porCanal.length)} canales activos`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Canal líder" valor={totales.mejor ? soles(totales.mejor.venta) : '—'}
          detalle={totales.mejor?.nombre ?? ''} acento="azul" cargando={cargando} />
        <Kpi etiqueta="Margen" valor={totales.margenPct == null ? '—' : soles(totales.margen)}
          detalle={totales.margenPct == null ? 'sin costo cargado' : `${porcentaje(totales.margenPct)} sobre lo costeado`}
          acento="verde" cargando={cargando} />
        <Kpi etiqueta="Ticket promedio" valor={hay || cargando ? soles(totales.ticket) : '—'}
          detalle={`${numero(totales.ops)} operaciones`} acento="morado" cargando={cargando} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Venta contra costo</CardTitle>
            <CardDescription>Por canal, de mayor a menor</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" />
              : !hay ? <SinDatos mensaje="Sin ventas registradas." />
              : <GraficoBarras datos={topYResto(porCanal, 'venta', 7) as Record<string, unknown>[]}
                  ejeX="nombre"
                  series={[
                    { clave: 'venta', etiqueta: 'Venta' },
                    { clave: 'costo', etiqueta: 'Costo conocido' },
                  ]} />}
          </CardContent>
        </Card>
        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Reparto</CardTitle>
            <CardDescription>Peso de cada canal en la venta</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" />
              : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoDonut datos={topYResto(porCanal, 'venta') as Record<string, unknown>[]}
                  claveNombre="nombre" claveValor="venta" etiquetaTotal="Venta total" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Detalle por canal</CardTitle>
          <CardDescription>
            El margen se mide solo sobre las ventas con costo cargado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !hay ? <SinDatos mensaje="Sin ventas registradas." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Costo conocido</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">Margen %</TableHead>
                      <TableHead className="text-right">Ítems</TableHead>
                      <TableHead className="text-right">Operaciones</TableHead>
                      <TableHead className="text-right">Ticket prom.</TableHead>
                      <TableHead className="text-right">% del total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porCanal.map((c) => (
                      <TableRow key={c.nombre}>
                        <TableCell className="font-medium">{c.nombre}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{soles(c.venta)}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.costo > 0 ? soles(c.costo) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.margenPct == null ? '—' : soles(c.margen)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.margenPct == null
                            ? <span className="text-muted-foreground">sin costo</span>
                            : porcentaje(c.margenPct)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{numero(c.items)}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(c.operaciones)}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(c.ticket)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {totales.venta > 0 ? porcentaje((c.venta / totales.venta) * 100) : '—'}
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
