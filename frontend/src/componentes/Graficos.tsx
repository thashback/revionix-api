import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { porcentaje, soles } from '@/lib/formato'

/** Los cinco tonos del tema, en orden. Todo gráfico tira de aquí para que
 *  al cambiar de tema los colores cambien solos. */
export const TONOS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

/** Miles y millones abreviados: "2200k" se lee peor que "2.2M". */
export const ejeCorto = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : Math.abs(v) >= 1000
      ? `${Math.round(v / 1000)}k`
      : String(Math.round(v))

/** Nombres largos (sedes, plataformas) recortados para que el eje no sea un muro. */
export const etiquetaCorta = (v: string) =>
  String(v).split(' ').slice(0, 2).join(' ').slice(0, 14)

export function GraficoBarras<T extends Record<string, unknown>>({
  datos,
  ejeX,
  series,
  alto = 280,
  apilado = false,
}: {
  datos: T[]
  ejeX: string
  series: { clave: string; etiqueta: string; tono?: string }[]
  alto?: number
  apilado?: boolean
}) {
  const config = Object.fromEntries(
    series.map((s, i) => [s.clave, { label: s.etiqueta, color: s.tono ?? TONOS[i % TONOS.length] }]),
  ) satisfies ChartConfig

  return (
    <ChartContainer config={config} className="w-full" style={{ height: alto }}>
      <BarChart data={datos} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={ejeX} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={etiquetaCorta} />
        <YAxis tickLine={false} axisLine={false} width={58} tickFormatter={ejeCorto} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => soles(Number(v))} />} />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {series.map((s, i) => (
          <Bar
            key={s.clave}
            dataKey={s.clave}
            stackId={apilado ? 'a' : undefined}
            fill={`var(--color-${s.clave})`}
            // Misma razón que en el donut: con la animación de entrada activa,
            // recharts 3.8 deja las barras a la altura inicial (casi cero).
            isAnimationActive={false}
            // En apilado solo la de arriba lleva esquinas redondeadas; si no,
            // se ven cortes raros entre segmentos.
            radius={apilado && i < series.length - 1 ? 0 : [4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

export function GraficoLinea<T extends Record<string, unknown>>({
  datos,
  ejeX,
  series,
  alto = 280,
}: {
  datos: T[]
  ejeX: string
  series: { clave: string; etiqueta: string }[]
  alto?: number
}) {
  const config = Object.fromEntries(
    series.map((s, i) => [s.clave, { label: s.etiqueta, color: TONOS[i % TONOS.length] }]),
  ) satisfies ChartConfig

  return (
    <ChartContainer config={config} className="w-full" style={{ height: alto }}>
      <LineChart data={datos} margin={{ left: 4, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={ejeX} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={58} tickFormatter={ejeCorto} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => soles(Number(v))} />} />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {series.map((s) => (
          <Line
            key={s.clave}
            dataKey={s.clave}
            type="monotone"
            stroke={`var(--color-${s.clave})`}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}

/**
 * Donut con su leyenda al pie. La leyenda va en lista y no dentro del gráfico
 * porque los nombres de marca y plataforma no caben alrededor del círculo.
 */
export function GraficoDonut({
  datos,
  claveNombre,
  claveValor,
  alto = 240,
}: {
  datos: Record<string, unknown>[]
  claveNombre: string
  claveValor: string
  alto?: number
}) {
  const total = datos.reduce((s, d) => s + (Number(d[claveValor]) || 0), 0)
  const config = { [claveValor]: { label: 'Valor' } } satisfies ChartConfig

  return (
    <>
      <ChartContainer config={config} className="w-full" style={{ height: alto }}>
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent nameKey={claveNombre} formatter={(v) => soles(Number(v))} />}
          />
          <Pie
            data={datos}
            dataKey={claveValor}
            nameKey={claveNombre}
            // recharts 3 no dibuja el donut si falta outerRadius: la capa se
            // crea vacía y no hay error en consola.
            innerRadius={54}
            outerRadius={96}
            strokeWidth={2}
            // recharts 3.8 deja el donut vacío si la animación de entrada
            // está activa: los sectores se quedan en radio 0 y nunca se
            // emiten. La tarjeta ya entra con el skeleton reveal.
            isAnimationActive={false}
          >
            {datos.map((_, i) => (
              <Cell key={i} fill={TONOS[i % TONOS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-3 space-y-1.5">
        {datos.map((d, i) => (
          <li key={String(d[claveNombre])} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: TONOS[i % TONOS.length] }}
            />
            <span className="truncate">{String(d[claveNombre])}</span>
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
              {total > 0 ? porcentaje(((Number(d[claveValor]) || 0) / total) * 100, 0) : '—'}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Agrupa por una clave y suma campos. Lo usan casi todas las páginas. */
export function agrupar<T>(
  filas: T[],
  clave: (f: T) => string,
  campos: Record<string, (f: T) => number>,
): (Record<string, number> & { nombre: string })[] {
  const mapa = new Map<string, Record<string, number> & { nombre: string }>()
  for (const f of filas) {
    const k = clave(f) || '—'
    const acc = mapa.get(k) ?? ({ nombre: k } as Record<string, number> & { nombre: string })
    for (const [campo, fn] of Object.entries(campos)) {
      acc[campo] = (acc[campo] || 0) + (fn(f) || 0)
    }
    mapa.set(k, acc)
  }
  return [...mapa.values()]
}

/** Deja las N mayores y agrupa el resto en "Otras": más porciones no se leen. */
export function topYResto<T extends { nombre: string }>(filas: T[], campo: string, n = 5): T[] {
  // El acceso va por `unknown` porque las filas mezclan el nombre (texto) con
  // los campos sumados (números), y TypeScript no acepta ese índice mixto.
  const num = (f: T) => Number((f as unknown as Record<string, unknown>)[campo]) || 0
  const orden = [...filas].sort((a, b) => num(b) - num(a))
  if (orden.length <= n + 1) return orden
  const resto = orden.slice(n).reduce((s, f) => s + num(f), 0)
  return [...orden.slice(0, n), { nombre: 'Otras', [campo]: resto } as unknown as T]
}
