import { AlertCircle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Estados honestos: cuando no hay datos se dice que no hay datos.
 * Este proyecto no rellena pantallas con cifras de ejemplo.
 */

export function SinDatos({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <Inbox className="size-8 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{mensaje}</p>
    </div>
  )
}

export function ErrorCarga({
  mensaje,
  alReintentar,
}: {
  mensaje: string
  alReintentar?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <AlertCircle className="size-8 text-destructive" />
      <div>
        <p className="text-sm font-medium">No se pudieron cargar los datos</p>
        <p className="mt-1 text-sm text-muted-foreground">{mensaje}</p>
      </div>
      {alReintentar && (
        <Button variant="outline" onClick={alReintentar}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
