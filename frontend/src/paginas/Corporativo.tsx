import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut, agrupar, topYResto } from '@/componentes/Graficos'
import { usarSeed } from '@/hooks/usarSeed'
import { numero, porcentaje, soles } from '@/lib/formato'

export function Corporativo() {
  const { ventasCorp, cargando, error, recargar } = usarSeed()

  const porCliente = useMemo(
    () =>
      agrupar(ventasCorp, (v) => v.cliente, {
        total: (v) => v.total || 0,
        costo: (v) => v.costo || 0,
        porCobrar: (v) => (v.cobrado ? 0 : v.total || 0),
        docs: () => 1,
      }).sort((a, b) => b.total - a.total),
    [ventasCorp],
  )

  const totales = useMemo(() => {
    const total = ventasCorp.reduce((s, v) => s + (v.total || 0), 0)
    const costo = ventasCorp.reduce((s, v) => s + (v.costo || 0), 0)
    const porCobrar = ventasCorp.filter((v) => !v.cobrado).reduce((s, v) => s + (v.total || 0), 0)
    return {
      total, costo, margen: total - costo, porCobrar,
      margenPct: total > 0 ? ((total - costo) / total) * 100 : null,
      clientes: new Set(ventasCorp.map((v) => v.cliente)).size,
    }
  }, [ventasCorp])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = ventasCorp.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Corporativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ventas a clientes empresa, con lo que queda por cobrar
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Facturado" valor={hay || cargando ? soles(totales.total) : '—'}
          detalle={`${numero(ventasCorp.length)} documentos`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Clientes" valor={hay || cargando ? numero(totales.clientes) : '—'}
          detalle="Con ventas registradas" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Margen" valor={hay || cargando ? soles(totales.margen) : '—'}
          detalle={totales.margenPct == null ? 'sin base' : `${porcentaje(totales.margenPct)} sobre venta`}
          acento="verde" cargando={cargando} />
        <Kpi etiqueta="Por cobrar" valor={hay || cargando ? soles(totales.porCobrar) : '—'}
          detalle={totales.total > 0 ? `${porcentaje((totales.porCobrar / totales.total) * 100, 0)} de lo facturado` : ''}
          acento="rojo" cargando={cargando} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Facturado por cliente</CardTitle>
            <CardDescription>Con lo pendiente de cobro</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin ventas corporativas." />
              : <GraficoBarras datos={topYResto(porCliente, 'total', 7) as Record<string, unknown>[]} ejeX="nombre"
                  series={[{ clave: 'total', etiqueta: 'Facturado' }, { clave: 'porCobrar', etiqueta: 'Por cobrar' }]} />}
          </CardContent>
        </Card>
        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Concentración</CardTitle>
            <CardDescription>Cuánto pesa cada cliente</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoDonut datos={topYResto(porCliente, 'total') as Record<string, unknown>[]}
                  claveNombre="nombre" claveValor="total" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Detalle por cliente</CardTitle>
          <CardDescription>{numero(porCliente.length)} clientes</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin ventas corporativas." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Docs</TableHead>
                      <TableHead className="text-right">Facturado</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">Por cobrar</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porCliente.map((c) => (
                      <TableRow key={c.nombre}>
                        <TableCell className="font-medium">{c.nombre}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(c.docs)}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(c.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.costo > 0 ? soles(c.costo) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.costo > 0 ? soles(c.total - c.costo) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.porCobrar > 0 ? soles(c.porCobrar) : '—'}
                        </TableCell>
                        <TableCell>
                          {c.porCobrar > 0
                            ? <Badge variant="destructive">Pendiente</Badge>
                            : <Badge variant="secondary">Cobrado</Badge>}
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
