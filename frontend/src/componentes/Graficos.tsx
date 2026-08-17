import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { usarEnPantalla } from '@/hooks/usarEnPantalla'
import { porcentaje, soles } from '@/lib/formato'

/**
 * Duración de la animación de entrada. 650 ms es suficiente para que se lea el
 * movimiento sin que haya que esperar a que el gráfico se quede quieto.
 */
const DURACION = 650

/** Cada serie entra un poco después que la anterior: se distinguen mejor. */
const RETRASO_SERIE = 110

/** Respeta a quien pidió menos movimiento en su sistema. */
const sinMovimiento = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * Colores de las series.
 *
 * No son los --chart-* del tema: esos cinco son el mismo azul con distinta
 * luminosidad, y con más de dos series encima resultan indistinguibles. Estos
 * se separan en tono, empezando por el azul corporativo. El tema sigue intacto
 * para el resto de la interfaz.
 */
export const TONOS = [
  'var(--serie-1)',
  'var(--serie-2)',
  'var(--serie-3)',
  'var(--serie-4)',
  'var(--serie-5)',
  'var(--serie-6)',
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
  const { ref, visible } = usarEnPantalla()
  const anima = visible && !sinMovimiento()
  const config = Object.fromEntries(
    series.map((s, i) => [s.clave, { label: s.etiqueta, color: s.tono ?? TONOS[i % TONOS.length] }]),
  ) satisfies ChartConfig

  return (
    <div ref={ref}>
      <ChartContainer config={config} className="w-full" style={{ height: alto }}>
        <BarChart data={datos} margin={{ left: 4, right: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={ejeX} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={etiquetaCorta} />
          <YAxis tickLine={false} axisLine={false} width={58} tickFormatter={ejeCorto} />
          <ChartTooltip
            // Sin esto el puntero no marca la columna y cuesta saber a qué mes
            // corresponde el globo, sobre todo con barras juntas.
            cursor={{ fill: 'var(--muted)', opacity: 0.45 }}
            content={<ChartTooltipContent formatter={(v) => soles(Number(v))} />}
          />
          {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          {series.map((s, i) => (
            <Bar
              key={s.clave}
              dataKey={s.clave}
              stackId={apilado ? 'a' : undefined}
              fill={`var(--color-${s.clave})`}
              // El gráfico solo se anima cuando ya está en pantalla y medido:
              // recharts calcula el crecimiento contra el alto del contenedor,
              // y dentro de una caja de 0px las barras se quedarían en cero.
              isAnimationActive={anima}
              animationDuration={DURACION}
              animationBegin={i * RETRASO_SERIE}
              animationEasing="ease-out"
              // Un importe pequeño al lado de uno grande desaparece; con esto
              // deja al menos un trazo visible en vez de nada.
              minPointSize={2}
              // En apilado solo la de arriba lleva esquinas redondeadas; si no,
              // se ven cortes raros entre segmentos.
              radius={apilado && i < series.length - 1 ? 0 : [4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
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
  const { ref, visible } = usarEnPantalla()
  const anima = visible && !sinMovimiento()
  const config = Object.fromEntries(
    series.map((s, i) => [s.clave, { label: s.etiqueta, color: TONOS[i % TONOS.length] }]),
  ) satisfies ChartConfig

  return (
    <div ref={ref}>
      <ChartContainer config={config} className="w-full" style={{ height: alto }}>
        <LineChart data={datos} margin={{ left: 4, right: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={ejeX} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={58} tickFormatter={ejeCorto} />
          <ChartTooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={<ChartTooltipContent formatter={(v) => soles(Number(v))} />}
          />
          {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          {series.map((s, i) => (
            <Line
              key={s.clave}
              dataKey={s.clave}
              type="monotone"
              stroke={`var(--color-${s.clave})`}
              strokeWidth={2}
              // Sin punto fijo la línea se lee limpia; el punto aparece al
              // apuntar, que es cuando hace falta saber el valor exacto.
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
              isAnimationActive={anima}
              animationDuration={DURACION}
              animationBegin={i * RETRASO_SERIE}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
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
  etiquetaTotal = 'Total',
}: {
  datos: Record<string, unknown>[]
  claveNombre: string
  claveValor: string
  alto?: number
  etiquetaTotal?: string
}) {
  const { ref, visible } = usarEnPantalla()
  const anima = visible && !sinMovimiento()
  const total = datos.reduce((s, d) => s + (Number(d[claveValor]) || 0), 0)
  const config = { [claveValor]: { label: 'Valor' } } satisfies ChartConfig

  return (
    <div ref={ref}>
      {/* El total va en una capa HTML y no en un <Label> de recharts: en la
          versión 3 ese Label no llega a montarse dentro de <Pie>, y así además
          hereda la tipografía y los colores del tema sin duplicarlos en SVG. */}
      <div className="relative">
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
              // Barre en sentido horario al entrar. Igual que en las barras,
              // solo cuando el contenedor ya tiene medida.
              isAnimationActive={anima}
              animationDuration={DURACION}
              animationEasing="ease-out"
            >
              {datos.map((_, i) => (
                <Cell key={i} fill={TONOS[i % TONOS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums">{soles(total)}</span>
          <span className="text-xs text-muted-foreground">{etiquetaTotal}</span>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {datos.map((d, i) => (
          <li key={String(d[claveNombre])} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: TONOS[i % TONOS.length] }}
            />
            <span className="truncate">{String(d[claveNombre])}</span>
            {/* Antes solo estaba el porcentaje: para saber cuánto era en soles
                había que apuntar cada porción una por una. */}
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
              {soles(Number(d[claveValor]) || 0)}
            </span>
            <span className="w-10 shrink-0 text-right tabular-nums font-medium">
              {total > 0 ? porcentaje(((Number(d[claveValor]) || 0) / total) * 100, 0) : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
