import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Menu, LogOut, LayoutDashboard, Package, TrendingUp, ShoppingCart, Receipt,
  Activity, Tag, Building2, Globe, CalendarRange, FolderKanban, ChevronDown,
  Store, ListTree, Landmark, CalendarClock, Upload, Users, Lightbulb, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { usarSesion } from '@/lib/sesion'
import { BotonTema } from '@/componentes/BotonTema'
import { EstadoSincronizacion } from '@/componentes/EstadoSincronizacion'
import { Logo } from '@/componentes/Logo'

export type ClavePagina =
  | 'dashboard' | 'ventas' | 'ebitda' | 'stock' | 'marcas'
  | 'compras' | 'gastos' | 'corporativo' | 'ecommerce'
  | 'meses' | 'proyectos' | 'canales' | 'detalle' | 'inversion'
  | 'gastos-fijos' | 'pagos-pendientes' | 'planilla' | 'carga' | 'usuarios'
  | 'solicitudes'

interface ItemNav {
  clave: ClavePagina
  /**
   * Quién ve la entrada. Sin esto el menú enseñaba todo a todo el mundo, y
   * pantallas como Usuarios solo se defendían por dentro: se veían, se
   * entraba y recién ahí decían que no. Ahora ni aparecen.
   */
  visible?: (u: { username: string; role: string } | null) => boolean
  etiqueta: string
  icono: typeof LayoutDashboard
}

interface Seccion {
  titulo: string
  items: ItemNav[]
}

// Agrupado por tema: con diez entradas, una lista plana obliga a leerlas
// todas para encontrar una.
const SECCIONES: Seccion[] = [
  {
    titulo: 'Resumen',
    items: [
      { clave: 'dashboard', etiqueta: 'Dashboard', icono: LayoutDashboard },
      { clave: 'ebitda', etiqueta: 'EBITDA', icono: Activity },
    ],
  },
  {
    titulo: 'Comercial',
    items: [
      { clave: 'ventas', etiqueta: 'Ventas', icono: TrendingUp },
      { clave: 'meses', etiqueta: 'Mes a Mes', icono: CalendarRange },
      { clave: 'corporativo', etiqueta: 'Corporativo', icono: Building2 },
      { clave: 'ecommerce', etiqueta: 'Ecommerce', icono: Globe },
      { clave: 'canales', etiqueta: 'Canales', icono: Store },
      { clave: 'proyectos', etiqueta: 'Proyectos', icono: FolderKanban },
    ],
  },
  {
    titulo: 'Inventario',
    items: [
      { clave: 'stock', etiqueta: 'Stock Disponible', icono: Package },
      { clave: 'marcas', etiqueta: 'Por Marca', icono: Tag },
      { clave: 'compras', etiqueta: 'Compras Mayoristas', icono: ShoppingCart },
      { clave: 'detalle', etiqueta: 'Detalle por Producto', icono: ListTree },
      { clave: 'inversion', etiqueta: 'Inversión', icono: Landmark },
    ],
  },
  {
    titulo: 'Costos',
    items: [
      { clave: 'gastos', etiqueta: 'Gastos', icono: Receipt },
      { clave: 'gastos-fijos', etiqueta: 'Gastos Fijos', icono: Landmark },
      { clave: 'pagos-pendientes', etiqueta: 'Pagos Pendientes', icono: CalendarClock },
      { clave: 'planilla', etiqueta: 'Planilla', icono: Wallet },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      // Un visor no puede escribir: el servidor le rechaza la importación, así
      // que enseñarle la pantalla solo le hace perder el viaje.
      { clave: 'carga', etiqueta: 'Carga de Ventas', icono: Upload,
        visible: (u) => u?.role !== 'visor' },
      { clave: 'usuarios', etiqueta: 'Usuarios', icono: Users,
        visible: (u) => u?.role === 'admin' },
      // Pedida para JMOLINA. El administrador también la ve, porque si no
      // las solicitudes se quedarían en un cajón que nadie abre.
      { clave: 'solicitudes', etiqueta: 'Solicitudes de Mejora', icono: Lightbulb,
        visible: (u) => u?.role === 'admin' || u?.username === 'jmolina' },
    ],
  },
]

/** La sección a la que pertenece una página; sirve para abrirla sola. */
function seccionDe(clave: ClavePagina): string {
  return SECCIONES.find((s) => s.items.some((i) => i.clave === clave))?.titulo
    ?? SECCIONES[0].titulo
}

function Navegacion({
  actual,
  alElegir,
}: {
  actual: ClavePagina
  alElegir: (c: ClavePagina) => void
}) {
  const { usuario } = usarSesion()
  // Las secciones que se quedan sin ninguna entrada visible desaparecen: un
  // título solo, sin nada debajo, parece que algo se rompió.
  const secciones = useMemo(
    () =>
      SECCIONES
        .map((s) => ({ ...s, items: s.items.filter((i) => !i.visible || i.visible(usuario)) }))
        .filter((s) => s.items.length > 0),
    [usuario],
  )
  // Con doce entradas la lista completa obliga a recorrerla entera cada vez.
  // Se deja abierta solo la sección de la página en la que se está; las demás
  // se pliegan, y quien quiera otra la abre con un toque.
  const [abierta, setAbierta] = useState<string>(() => seccionDe(actual))

  // Al cambiar de página —incluido desde otro sitio que no sea este menú— la
  // sección que corresponde se abre sola.
  useEffect(() => { setAbierta(seccionDe(actual)) }, [actual])

  return (
    <nav className="flex flex-col gap-1 p-3">
      {secciones.map((sec) => {
        const abiertaEsta = abierta === sec.titulo
        const contieneActual = sec.items.some((i) => i.clave === actual)
        return (
          <div key={sec.titulo} className="mb-1">
            <button
              type="button"
              onClick={() => setAbierta(abiertaEsta ? '' : sec.titulo)}
              aria-expanded={abiertaEsta}
              className="flex w-full min-h-9 items-center gap-1.5 rounded-md px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {sec.titulo}
              {/* Cuando la sección está plegada pero contiene la página en la
                  que estás, un punto lo recuerda sin tener que desplegarla. */}
              {!abiertaEsta && contieneActual && (
                <span className="size-1.5 rounded-full bg-sidebar-accent-foreground" />
              )}
              <ChevronDown
                className={cn(
                  'ml-auto size-3.5 transition-transform duration-200',
                  !abiertaEsta && '-rotate-90',
                )}
              />
            </button>

            {/* Se pliega con una transición de altura en vez de desaparecer de
                golpe: así se ve de dónde salió y a dónde volvió. */}
            <div
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
                abiertaEsta ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                {sec.items.map(({ clave, etiqueta, icono: Icono }) => (
                  <button
                    key={clave}
                    onClick={() => alElegir(clave)}
                    aria-current={actual === clave ? 'page' : undefined}
                    tabIndex={abiertaEsta ? 0 : -1}
                    className={cn(
                      // min-h-11 = 44px: mínimo táctil cómodo en teléfono.
                      'flex w-full min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      actual === clave
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                    )}
                  >
                    <Icono className="size-4 shrink-0" />
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })}
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
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-3 sm:px-5">
        {/* El cajón solo existe por debajo de lg: en escritorio la barra es fija. */}
        <Sheet open={cajonAbierto} onOpenChange={setCajonAbierto}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menú de navegación"
              className="lg:hidden"
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

        {/* El logo hereda el color del texto: oscuro sobre la cabecera clara,
            claro en modo oscuro. Ya no hacen falta dos archivos PNG. */}
        <Logo soloMarca className="h-6 w-auto shrink-0 text-foreground sm:h-7" />

        {usuario && (
          <>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {usuario.nombre}
            </span>
            <Badge variant="secondary" className="uppercase">
              {usuario.role}
            </Badge>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <EstadoSincronizacion />
          <BotonTema />
        </div>

        <Button
          variant="ghost"
          onClick={salir}
          className="min-h-11 gap-2"
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
