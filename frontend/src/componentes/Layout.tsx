import { useState, type ReactNode } from 'react'
import { Menu, LogOut, LayoutDashboard, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { usarSesion } from '@/lib/sesion'

export type ClavePagina = 'dashboard' | 'stock'

interface ItemNav {
  clave: ClavePagina
  etiqueta: string
  icono: typeof LayoutDashboard
}

// Solo las páginas ya migradas. Se irán sumando conforme avance la migración.
const NAV: ItemNav[] = [
  { clave: 'dashboard', etiqueta: 'Dashboard', icono: LayoutDashboard },
  { clave: 'stock', etiqueta: 'Stock Disponible', icono: Package },
]

function Navegacion({
  actual,
  alElegir,
}: {
  actual: ClavePagina
  alElegir: (c: ClavePagina) => void
}) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Principal
      </p>
      {NAV.map(({ clave, etiqueta, icono: Icono }) => (
        <button
          key={clave}
          onClick={() => alElegir(clave)}
          aria-current={actual === clave ? 'page' : undefined}
          className={cn(
            // min-h-11 = 44px: mínimo táctil cómodo en teléfono.
            'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
            actual === clave
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
          )}
        >
          <Icono className="size-4 shrink-0" />
          {etiqueta}
        </button>
      ))}
    </nav>
  )
}

export function Layout({
  pagina,
  alCambiarPagina,
  children,
}: {
  pagina: ClavePagina
  alCambiarPagina: (c: ClavePagina) => void
  children: ReactNode
}) {
  const { usuario, salir } = usarSesion()
  const [cajonAbierto, setCajonAbierto] = useState(false)

  function elegir(c: ClavePagina) {
    alCambiarPagina(c)
    setCajonAbierto(false)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 bg-primary px-3 sm:px-5">
        {/* El cajón solo existe por debajo de lg: en escritorio la barra es fija. */}
        <Sheet open={cajonAbierto} onOpenChange={setCajonAbierto}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menú de navegación"
              className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground lg:hidden"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-sidebar p-0">
            <SheetTitle className="sr-only">Navegación</SheetTitle>
            <div className="pt-12">
              <Navegacion actual={pagina} alElegir={elegir} />
            </div>
          </SheetContent>
        </Sheet>

        <img
          src="/img/logo-revionix-blanco.png"
          alt="REVIONIX"
          className="h-6 w-auto object-contain sm:h-7"
        />

        {usuario && (
          <>
            <span className="hidden text-sm text-primary-foreground/80 sm:inline">
              {usuario.nombre}
            </span>
            <Badge variant="secondary" className="uppercase">
              {usuario.role}
            </Badge>
          </>
        )}

        <Button
          variant="ghost"
          onClick={salir}
          className="ml-auto min-h-11 gap-2 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r bg-sidebar lg:block">
          <Navegacion actual={pagina} alElegir={elegir} />
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
