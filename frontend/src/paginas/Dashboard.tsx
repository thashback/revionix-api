import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
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

const CONFIG_SEDE = {
  venta: { label: 'Valor venta', color: 'var(--chart-1)' },
  costo: { label: 'Valor costo', color: 'var(--chart-3)' },
} satisfies ChartConfig

const CONFIG_MARCA = {
  venta: { label: 'Valor venta' },
} satisfies ChartConfig

/** Los cinco tonos del tema, en orden, para las porciones del donut. */
const TONOS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

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
              <ChartContainer config={CONFIG_SEDE} className="h-[280px] w-full">
                <BarChart data={porSede} margin={{ left: 4, right: 4 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="sede"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    // Los nombres de sede son largos: se recortan para que el
                    // eje no se convierta en un muro de texto.
                    tickFormatter={(v: string) => String(v).split(' ').slice(0, 2).join(' ').slice(0, 14)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={58}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`
                    }
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(v) => soles(Number(v))} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="venta" fill="var(--color-venta)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="costo" fill="var(--color-costo)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
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
              <ChartContainer config={CONFIG_MARCA} className="h-[280px] w-full">
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="marca" formatter={(v) => soles(Number(v))} />}
                  />
                  <Pie
                    data={porMarca}
                    dataKey="venta"
                    nameKey="marca"
                    innerRadius={58}
                    outerRadius={100}
                    strokeWidth={2}
                    // recharts 3.8 deja el donut vacío si la animación de
                    // entrada está activa: los sectores se quedan en radio 0
                    // y nunca se emiten. Sin animación dibuja bien, y de todos
                    // modos la tarjeta ya entra con el skeleton reveal.
                    isAnimationActive={false}
                  >
                    {porMarca.map((_, i) => (
                      <Cell key={i} fill={TONOS[i % TONOS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            {hayDatos && !cargando && (
              <ul className="mt-3 space-y-1.5">
                {porMarca.map((m, i) => (
                  <li key={m.marca} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-2.5 shrink-0 rounded-[3px]"
                      style={{ background: TONOS[i % TONOS.length] }}
                    />
                    <span className="truncate">{m.marca}</span>
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {porcentaje((m.venta / totales.valorVenta) * 100, 0)}
                    </span>
                  </li>
                ))}
              </ul>
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
