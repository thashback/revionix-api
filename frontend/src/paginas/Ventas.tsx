import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut, agrupar, topYResto } from '@/componentes/Graficos'
import { usarSeed } from '@/hooks/usarSeed'
import { numero, porcentaje, soles } from '@/lib/formato'

const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const etiquetaMes = (p: string) => {
  const [a, m] = String(p).split('-')
  return m ? `${MES_CORTO[Number(m) - 1]}-${a.slice(2)}` : p
}

export function Ventas() {
  const { transacciones, ventasBillia, ventasCorp, ecommerce, cargando, error, recargar } = usarSeed()

  /**
   * Las ventas del CRM se cargan a mano y BILLIA emite los comprobantes. Se
   * muestran las dos series por separado en vez de sumarlas: hasta julio
   * convivió el sistema de facturación anterior, así que sumarlas contaría
   * de más y restarlas escondería el problema.
   */
  const porMes = useMemo(() => {
    const crm = agrupar(transacciones, (t) => t.mes, {
      venta: (t) => t.venta || 0,
      costo: (t) => t.costo || 0,
    })
    const bil = agrupar(ventasBillia.filter((v) => v.mes), (v) => v.mes as string, {
      facturado: (v) => v.total || 0,
    })
    const meses = [...new Set([...crm, ...bil].map((x) => x.nombre))].sort()
    return meses.map((m) => {
      const c = crm.find((x) => x.nombre === m)
      const b = bil.find((x) => x.nombre === m)
      return {
        nombre: etiquetaMes(m),
        periodo: m,
        venta: c?.venta ?? 0,
        costo: c?.costo ?? 0,
        margen: (c?.venta ?? 0) - (c?.costo ?? 0),
        facturado: b?.facturado ?? 0,
      }
    })
  }, [transacciones, ventasBillia])

  const porCanal = useMemo(
    () =>
      topYResto(
        agrupar(transacciones, (t) => t.canal, {
          venta: (t) => t.venta || 0,
          costo: (t) => t.costo || 0,
        }),
        'venta',
      ),
    [transacciones],
  )

  const totales = useMemo(() => {
    const venta = transacciones.reduce((s, t) => s + (t.venta || 0), 0)
    const costo = transacciones.reduce((s, t) => s + (t.costo || 0), 0)
    const facturado = ventasBillia.reduce((s, v) => s + (v.total || 0), 0)
    const corp = ventasCorp.reduce((s, v) => s + (v.total || 0), 0)
    const ecom = ecommerce.reduce((s, v) => s + (v.total || 0), 0)
    const porCobrar = ventasCorp.filter((v) => !v.cobrado).reduce((s, v) => s + (v.total || 0), 0)
    return {
      venta, costo, margen: venta - costo,
      margenPct: venta > 0 ? ((venta - costo) / venta) * 100 : null,
      facturado, corp, ecom, porCobrar,
    }
  }, [transacciones, ventasBillia, ventasCorp, ecommerce])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = transacciones.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Ventas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registrado en el CRM, contrastado con lo facturado en BILLIA
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Ventas registradas" valor={hay || cargando ? soles(totales.venta) : '—'}
          detalle={`${numero(transacciones.length)} transacciones`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Facturado en BILLIA" valor={cargando || ventasBillia.length ? soles(totales.facturado) : '—'}
          detalle={`${numero(ventasBillia.length)} comprobantes`} acento="azul" cargando={cargando} />
        <Kpi etiqueta="Margen bruto" valor={hay || cargando ? soles(totales.margen) : '—'}
          detalle={totales.margenPct == null ? 'sin base' : `${porcentaje(totales.margenPct)} sobre venta`}
          acento="verde" cargando={cargando} />
        <Kpi etiqueta="Por cobrar (corporativo)" valor={cargando || ventasCorp.length ? soles(totales.porCobrar) : '—'}
          detalle={`de ${soles(totales.corp)} facturados`} acento="rojo" cargando={cargando} />
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Ventas mes a mes</CardTitle>
          <CardDescription>
            Lo registrado en el CRM junto a lo facturado en BILLIA. No se suman: hasta
            julio convivió el sistema de facturación anterior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando ventas…" />
            : !porMes.length ? <SinDatos mensaje="Sin ventas registradas." />
            : <GraficoBarras datos={porMes} ejeX="nombre" alto={300}
                series={[
                  { clave: 'venta', etiqueta: 'Registrado en CRM' },
                  { clave: 'facturado', etiqueta: 'Facturado en BILLIA' },
                ]} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Margen por canal</CardTitle>
            <CardDescription>Venta contra costo en cada punto</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" />
              : !hay ? <SinDatos mensaje="Sin datos de canal." />
              : <GraficoBarras datos={porCanal as Record<string, unknown>[]} ejeX="nombre"
                  series={[
                    { clave: 'venta', etiqueta: 'Venta' },
                    { clave: 'costo', etiqueta: 'Costo' },
                  ]} />}
          </CardContent>
        </Card>

        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Peso por canal</CardTitle>
            <CardDescription>Participación en la venta total</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" />
              : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoDonut datos={porCanal as Record<string, unknown>[]} claveNombre="nombre" claveValor="venta" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Detalle mensual</CardTitle>
          <CardDescription>Con la diferencia contra lo facturado</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !porMes.length ? <SinDatos mensaje="Sin datos." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Venta CRM</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">MB %</TableHead>
                      <TableHead className="text-right">Facturado BILLIA</TableHead>
                      <TableHead className="text-right">Diferencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porMes.map((m) => {
                      const dif = m.venta - m.facturado
                      // Menos de 5% se toma como redondeo y no se resalta.
                      const alerta = m.facturado > 0 && Math.abs(dif) / m.facturado >= 0.05
                      return (
                        <TableRow key={m.periodo}>
                          <TableCell className="font-medium">{m.nombre}</TableCell>
                          <TableCell className="text-right tabular-nums">{soles(m.venta)}</TableCell>
                          <TableCell className="text-right tabular-nums">{m.costo > 0 ? soles(m.costo) : '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{m.costo > 0 ? soles(m.margen) : '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.venta > 0 && m.costo > 0 ? porcentaje((m.margen / m.venta) * 100) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.facturado > 0 ? soles(m.facturado) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.facturado > 0
                              ? alerta
                                ? <Badge variant="destructive">{dif > 0 ? '+' : ''}{soles(dif)}</Badge>
                                : soles(dif)
                              : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
