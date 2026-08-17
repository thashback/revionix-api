import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usarTema } from '@/lib/tema'

/**
 * Alterna claro → oscuro → sistema en un solo botón. Se prefirió esto a un
 * menú desplegable: son tres estados y el icono ya dice en cuál estás.
 */
export function BotonTema() {
  const { modo, cambiar } = usarTema()

  const siguiente = modo === 'claro' ? 'oscuro' : modo === 'oscuro' ? 'sistema' : 'claro'
  const etiqueta =
    modo === 'claro' ? 'Tema claro' : modo === 'oscuro' ? 'Tema oscuro' : 'Según el sistema'

  const Icono = modo === 'claro' ? Sun : modo === 'oscuro' ? Moon : Monitor

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => cambiar(siguiente)}
      title={`${etiqueta} · cambiar a ${siguiente === 'sistema' ? 'según el sistema' : siguiente}`}
      aria-label={etiqueta}
    >
      <Icono className="size-4" />
    </Button>
  )
}
