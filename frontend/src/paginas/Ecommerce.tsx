import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut, agrupar, topYResto } from '@/componentes/Graficos'
import { usarSeed } from '@/hooks/usarSeed'
import { etiquetaMes, numero, porcentaje, soles } from '@/lib/formato'


export function Ecommerce() {
  const { ecommerce, cargando, error, recargar } = usarSeed()

  const porMes = useMemo(
    () =>
      agrupar(ecommerce, (e) => e.mes || String(e.fecha || '').slice(0, 7), {
        total: (e) => e.total || 0,
        costo: (e) => e.costo || 0,
      })
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((x) => ({ ...x, nombre: etiquetaMes(x.nombre) })),
    [ecommerce],
  )

  const porPlataforma = useMemo(
    () => agrupar(ecommerce, (e) => e.plataforma, {
      total: (e) => e.total || 0,
      unidades: (e) => e.qty || 0,
      costo: (e) => e.costo || 0,
    }).sort((a, b) => b.total - a.total),
    [ecommerce],
  )

  const totales = useMemo(() => {
    const total = ecommerce.reduce((s, e) => s + (e.total || 0), 0)
    const costo = ecommerce.reduce((s, e) => s + (e.costo || 0), 0)
    const unidades = ecommerce.reduce((s, e) => s + (e.qty || 0), 0)
    return {
      total, costo, unidades, margen: total - costo,
      margenPct: total > 0 ? ((total - costo) / total) * 100 : null,
      plataformas: new Set(ecommerce.map((e) => e.plataforma)).size,
    }
  }, [ecommerce])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = ecommerce.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Ecommerce</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ventas por plataforma de venta en línea</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Vendido" valor={hay || cargando ? soles(totales.total) : '—'}
          detalle={`${numero(ecommerce.length)} operaciones`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Unidades" valor={hay || cargando ? numero(totales.unidades) : '—'}
          detalle="Piezas despachadas" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Margen" valor={hay || cargando ? soles(totales.margen) : '—'}
          detalle={totales.margenPct == null ? 'sin base' : `${porcentaje(totales.margenPct)} sobre venta`}
          acento="verde" cargando={cargando} />
        <Kpi etiqueta="Plataformas" valor={hay || cargando ? numero(totales.plataformas) : '—'}
          detalle="Con ventas registradas" acento="morado" cargando={cargando} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Ventas por mes</CardTitle>
            <CardDescription>Con su costo asociado</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin ventas de ecommerce." />
              : <GraficoBarras datos={porMes} ejeX="nombre"
                  series={[{ clave: 'total', etiqueta: 'Venta' }, { clave: 'costo', etiqueta: 'Costo' }]} />}
          </CardContent>
        </Card>
        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Por plataforma</CardTitle>
            <CardDescription>Dónde se vende más</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoDonut datos={topYResto(porPlataforma, 'total') as Record<string, unknown>[]}
                  claveNombre="nombre" claveValor="total" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Detalle de operaciones</CardTitle>
          <CardDescription>{numero(ecommerce.length)} ventas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin ventas de ecommerce." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-right">Cant</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ecommerce.map((e, i) => (
                      <TableRow key={`${e.fecha}-${i}`}>
                        <TableCell className="whitespace-nowrap">{e.fecha}</TableCell>
                        <TableCell className="whitespace-nowrap">{e.plataforma}</TableCell>
                        <TableCell className="min-w-56">{e.modelo}</TableCell>
                        <TableCell className="whitespace-nowrap">{e.marca}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(e.qty)}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(e.precio_unit, 2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(e.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {e.costo > 0 ? soles((e.total || 0) - (e.costo || 0)) : '—'}
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
