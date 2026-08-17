import { useEffect, useState } from 'react'
import { Check, RefreshCw, TriangleAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fechaHoraLima, numero } from '@/lib/formato'

interface Sincronizacion {
  billia?: {
    inventario?: { actualizado?: string; unidades?: number; lineas?: number | null }
    ventas?: { actualizado?: string; comprobantes?: number | null }
  }
  revionix?: { transacciones?: number | null; actualizado?: string | null; claves?: number | null }
}

/** BILLIA empuja cada 2 horas; más de 6 sin noticias ya no es normal. */
const HORAS_PARA_ALERTA = 6

const horasDesde = (iso?: string | null): number | null => {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return (Date.now() - t) / 3_600_000
}

/**
 * Indicador de dónde salen los datos que se están viendo.
 *
 * Existe porque la pantalla mezcla dos orígenes —el inventario y las facturas
 * vienen de BILLIA, las ventas y gastos se cargan en REVIONIX— y sin este
 * sello no había forma de saber si un número era de hoy o de anteayer.
 */
export function EstadoSincronizacion() {
  const [datos, setDatos] = useState<Sincronizacion | null>(null)
  const [fallo, setFallo] = useState(false)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    let vivo = true
    const cargar = () =>
      api.get<Sincronizacion>('/sincronizacion')
        .then((d) => { if (vivo) { setDatos(d); setFallo(false) } })
        .catch(() => { if (vivo) setFallo(true) })
    void cargar()
    // Se refresca solo: una pestaña abierta toda la tarde mostraría un sello
    // congelado aunque BILLIA ya hubiera empujado dos veces.
    const t = setInterval(cargar, 5 * 60 * 1000)
    return () => { vivo = false; clearInterval(t) }
  }, [])

  const horas = horasDesde(datos?.billia?.inventario?.actualizado)
  const atrasado = horas != null && horas > HORAS_PARA_ALERTA
  const estado: 'cargando' | 'error' | 'atrasado' | 'ok' =
    fallo ? 'error' : !datos ? 'cargando' : atrasado ? 'atrasado' : 'ok'

  const TEXTO = {
    cargando: 'Comprobando…',
    error: 'Sin conexión',
    atrasado: 'Sincronización atrasada',
    ok: 'Sincronizado',
  }[estado]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`${TEXTO}. Ver detalle de sincronización`}
        className={cn(
          'flex min-h-9 items-center gap-2 rounded-full border px-2.5 text-xs font-medium transition-colors sm:px-3',
          estado === 'ok' && 'border-chart-2/40 bg-chart-2/10 text-chart-2',
          estado === 'atrasado' && 'border-chart-3/40 bg-chart-3/10 text-chart-3',
          estado === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
          estado === 'cargando' && 'border-border text-muted-foreground',
        )}
      >
        {estado === 'ok' ? <Check className="size-3.5" />
          : estado === 'cargando' ? <RefreshCw className="size-3.5 animate-spin" />
          : <TriangleAlert className="size-3.5" />}
        {/* En teléfono solo cabe el punto y el icono; el texto vuelve en sm. */}
        <span className="hidden sm:inline">{TEXTO}</span>
        <span className="hidden text-[10px] font-semibold tracking-wide opacity-70 md:inline">
          BILLIA · REVIONIX
        </span>
      </button>

      {abierto && (
        <>
          {/* Capa para cerrar tocando fuera, sin traerse un Popover entero. */}
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Origen de los datos
            </p>

            <Fuente
              nombre="BILLIA"
              detalle="Inventario y comprobantes"
              lineas={[
                datos?.billia?.inventario?.actualizado
                  ? `Stock: ${fechaHoraLima(datos.billia.inventario.actualizado)}`
                  : 'Stock: sin sello',
                datos?.billia?.inventario?.unidades != null
                  ? `${numero(datos.billia.inventario.unidades)} unidades en ${numero(datos.billia.inventario.lineas ?? 0)} líneas`
                  : null,
                datos?.billia?.ventas?.comprobantes != null
                  ? `${numero(datos.billia.ventas.comprobantes)} comprobantes facturados`
                  : null,
              ]}
            />

            <Fuente
              nombre="REVIONIX"
              detalle="app.revionix.pe · ventas y gastos del CRM"
              lineas={[
                datos?.revionix?.transacciones != null
                  ? `${numero(datos.revionix.transacciones)} transacciones registradas`
                  : null,
                datos?.revionix?.actualizado
                  ? `Último cambio: ${fechaHoraLima(datos.revionix.actualizado)}`
                  : null,
              ]}
            />

            <p className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
              BILLIA se consulta cada 2 horas. Los cambios del CRM se ven al
              instante.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function Fuente({
  nombre,
  detalle,
  lineas,
}: {
  nombre: string
  detalle: string
  lineas: (string | null)[]
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-sm font-semibold">{nombre}</p>
      <p className="text-[11px] text-muted-foreground">{detalle}</p>
      <ul className="mt-1 space-y-0.5">
        {lineas.filter(Boolean).map((l) => (
          <li key={l} className="text-xs text-muted-foreground">{l}</li>
        ))}
      </ul>
    </div>
  )
}
