import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { NumeroAnimado } from '@/componentes/NumeroAnimado'

type Acento = 'navy' | 'verde' | 'azul' | 'naranja' | 'morado' | 'rojo'

/**
 * Los acentos salen de las variables del tema (chart-1..5), no de colores
 * fijos de Tailwind. Antes eran `bg-emerald-600` y compañía, y por eso las
 * tarjetas no seguían la paleta al cambiar de tema.
 */
const ACENTOS: Record<Acento, string> = {
  azul: 'before:bg-chart-1',
  verde: 'before:bg-chart-2',
  naranja: 'before:bg-chart-3',
  morado: 'before:bg-chart-4',
  navy: 'before:bg-chart-5',
  // El rojo sí queda fuera de la escala: marca un problema, y el tema define
  // `destructive` justo para eso.
  rojo: 'before:bg-destructive',
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
  // Skeleton reveal: el esqueleto y el contenido viven apilados y se cruzan
  // con desenfoque. `revelado` va un tick por detrás de `cargando` para que
  // el navegador alcance a pintar el estado inicial y la transición ocurra.
  const [revelado, setRevelado] = useState(!cargando)
  const yaRevelado = useRef(!cargando)

  useEffect(() => {
    if (cargando) {
      setRevelado(false)
      yaRevelado.current = false
      return
    }
    if (yaRevelado.current) return
    const id = requestAnimationFrame(() => {
      yaRevelado.current = true
      setRevelado(true)
    })
    return () => cancelAnimationFrame(id)
  }, [cargando])

  return (
    <Card
      className={cn(
        't-card-hover relative overflow-hidden py-0',
        'before:absolute before:inset-y-0 before:left-0 before:w-1.5',
        ACENTOS[acento],
      )}
    >
      <CardContent className="py-4 pl-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {etiqueta}
        </p>

        {/* El alto se fija para que el cruce esqueleto → contenido no empuje
            el resto de la tarjeta mientras ocurre. */}
        <div className={cn('t-skel mt-1 h-[52px]', revelado && 'is-revealed')}>
          <div className="t-skel-skeleton is-pulsing" aria-hidden={revelado}>
            <div className="h-7 w-28 rounded-md bg-muted" />
            {detalle && <div className="mt-2 h-3 w-20 rounded bg-muted" />}
          </div>
          <div className="t-skel-content" aria-hidden={!revelado}>
            <NumeroAnimado valor={valor} className="text-2xl font-extrabold tabular-nums" />
            {detalle && <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
