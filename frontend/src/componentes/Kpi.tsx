import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Acento = 'navy' | 'verde' | 'azul' | 'naranja' | 'morado' | 'rojo'

const ACENTOS: Record<Acento, string> = {
  navy: 'before:bg-slate-700',
  verde: 'before:bg-emerald-600',
  azul: 'before:bg-blue-600',
  naranja: 'before:bg-orange-500',
  morado: 'before:bg-violet-600',
  rojo: 'before:bg-red-600',
}

export function Kpi({
  etiqueta,
  valor,
  detalle,
  acento = 'navy',
  cargando = false,
}: {
  etiqueta: string
  /** Ya formateado. Cuando no hay dato se pasa "—", nunca un cero inventado. */
  valor: string
  detalle?: string
  acento?: Acento
  cargando?: boolean
}) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden py-0 before:absolute before:inset-y-0 before:left-0 before:w-1.5',
        ACENTOS[acento],
      )}
    >
      <CardContent className="py-4 pl-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {etiqueta}
        </p>
        {cargando ? (
          <Skeleton className="my-1.5 h-7 w-28" />
        ) : (
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{valor}</p>
        )}
        {detalle && !cargando && (
          <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>
        )}
      </CardContent>
    </Card>
  )
}
