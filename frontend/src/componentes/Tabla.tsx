import { useId, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Contenedor para tablas largas.
 *
 * El wrapper que trae shadcn solo desplaza en horizontal, así que una tabla
 * de trescientas filas obligaba a subir hasta arriba del todo cada vez que
 * uno quería recordar qué columna estaba mirando. Aquí el desplazamiento
 * vertical se queda dentro del recuadro y la cabecera se ancla arriba.
 *
 * La altura máxima se puede quitar (`alto={false}`) para tablas cortas, donde
 * un recuadro con su propia barra estorba más de lo que ayuda.
 */
export function TablaLarga({
  children,
  alto = '70vh',
  className,
}: {
  children: ReactNode
  alto?: string | false
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative w-full overflow-auto rounded-md border',
        // La cabecera se pega al borde del contenedor, no al de la página:
        // por eso hace falta que el desplazamiento viva aquí dentro.
        '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card',
        '[&_thead_th]:bg-card',
        className,
      )}
      style={alto === false ? undefined : { maxHeight: alto }}
    >
      {children}
    </div>
  )
}

/** Buscador de una tabla. El filtrado lo hace quien lo usa. */
export function CampoBusqueda({
  valor,
  alCambiar,
  marcador = 'Buscar…',
  resultados,
  className,
}: {
  valor: string
  alCambiar: (v: string) => void
  marcador?: string
  /** Cuántas filas quedan; se anuncia para lectores de pantalla. */
  resultados?: number
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          placeholder={marcador}
          aria-label={marcador}
          className="pl-8 pr-8"
        />
        {valor && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Limpiar la búsqueda"
            onClick={() => alCambiar('')}
            className="absolute right-0.5 top-1/2 size-7 -translate-y-1/2"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {valor && resultados != null && (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {resultados === 0
            ? 'Sin coincidencias'
            : `${resultados} ${resultados === 1 ? 'fila' : 'filas'}`}
        </p>
      )}
    </div>
  )
}

/**
 * ¿La fila contiene todas las palabras buscadas?
 *
 * Se parte por espacios y se exige que estén todas, en cualquier orden y en
 * cualquier campo: buscar "honor san isidro" tiene que encontrar la línea
 * aunque la marca y la sede estén en columnas distintas.
 */
export function coincide(consulta: string, ...campos: unknown[]): boolean {
  const q = consulta.trim().toLowerCase()
  if (!q) return true
  const texto = campos.map((c) => String(c ?? '')).join(' ').toLowerCase()
  return q.split(/\s+/).every((palabra) => texto.includes(palabra))
}
