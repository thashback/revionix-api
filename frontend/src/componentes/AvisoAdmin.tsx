import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { usarSesion } from '@/lib/sesion'
import { cn } from '@/lib/utils'

/**
 * AVISOS INTERNOS
 *
 * Notas sobre el estado de los datos: lo que falta cuadrar, lo que llegó a
 * medias, lo que no se puede convertir. Son recordatorios de trabajo pendiente
 * para quien mantiene el sistema.
 *
 * Solo los ve el administrador. A quien entra a consultar una cifra no le
 * aporta nada leer que el 11.7% de las ventas está sin comprobante: no puede
 * arreglarlo, y siembra la duda de si el número que está mirando sirve.
 *
 * Ojo: esto es presentación, no seguridad. Lo que se oculta aquí son notas
 * derivadas de datos que esa persona ya puede ver en pantalla; nada que deba
 * protegerse vive en un aviso.
 */
export function AvisoAdmin({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { usuario } = usarSesion()
  if (usuario?.role !== 'admin') return null
  return (
    <Card className={cn('border-chart-3/40 bg-chart-3/5', className)}>
      <CardContent className="py-3 text-sm">{children}</CardContent>
    </Card>
  )
}

/** ¿Le corresponde a este usuario ver los avisos internos? */
export function usarVeAvisos(): boolean {
  const { usuario } = usarSesion()
  return usuario?.role === 'admin'
}
