import { useState } from 'react'
import { Check, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usarSincronizacion } from '@/lib/sincronizacion'
import { fechaHoraLima, haceCuanto, horaLima, numero } from '@/lib/formato'

/** Cada cuánto consulta el servidor a BILLIA (server.js:249). */
const HORAS_ENTRE_SINCRONIZACIONES = 2

/** Tres ciclos perdidos ya no es un retraso, es que algo no va. */
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
  // El sondeo vive en lib/sincronizacion: uno solo para toda la aplicación,
  // y de paso las páginas se enteran de cuándo recargar sus cifras.
  const { datos, fallo } = usarSincronizacion()
  const [abierto, setAbierto] = useState(false)

  const horas = horasDesde(datos?.billia?.inventario?.actualizado)
  const atrasado = horas != null && horas > HORAS_PARA_ALERTA
  const estado: 'cargando' | 'error' | 'atrasado' | 'ok' =
    fallo ? 'error' : !datos ? 'cargando' : atrasado ? 'atrasado' : 'ok'

  // Estimada: el temporizador del servidor arranca con el proceso, así que
  // la referencia buena es el último empujón más el intervalo.
  const proxima = (() => {
    const iso = datos?.billia?.inventario?.actualizado
    if (!iso) return null
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return null
    return horaLima(new Date(t + HORAS_ENTRE_SINCRONIZACIONES * 3_600_000).toISOString())
  })()

  const horaBillia = horaLima(datos?.billia?.inventario?.actualizado)
  const horaRevionix = horaLima(datos?.revionix?.actualizado)

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
        {/* En teléfono solo cabe el icono y la hora; el resto vuelve en sm. */}
        <span className="hidden sm:inline">{TEXTO}</span>
        <span className="hidden text-[10px] font-semibold tracking-wide opacity-70 md:inline">
          BILLIA · REVIONIX
        </span>
        {/* La hora a la vista: es lo primero que se pregunta al mirar una
            cifra, y tenerla que buscar dentro del panel era un clic de más. */}
        {horaBillia && (
          <span className="font-semibold tabular-nums" title={`Último dato de BILLIA: ${fechaHoraLima(datos?.billia?.inventario?.actualizado) ?? '—'}`}>
            {horaBillia}
          </span>
        )}
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
              hora={horaBillia}
              relativo={haceCuanto(datos?.billia?.inventario?.actualizado)}
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
              hora={horaRevionix}
              relativo={haceCuanto(datos?.revionix?.actualizado)}
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
              BILLIA se consulta cada {HORAS_ENTRE_SINCRONIZACIONES} horas
              {proxima ? `; la siguiente hacia las ${proxima}` : ''}. Los cambios
              del CRM se ven al instante. Cuando entren datos nuevos, la pantalla
              se actualiza sola.
            </p>
            {/* Recargar la página entera y no solo este panel: lo que interesa
                refrescar son las cifras de la pantalla, no el sello. */}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="size-3.5" />
              Recargar los datos
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Fuente({
  nombre,
  detalle,
  hora,
  relativo,
  lineas,
}: {
  nombre: string
  detalle: string
  hora?: string | null
  /** "hace 12 min": la hora sola no dice si es de hoy. */
  relativo?: string | null
  lineas: (string | null)[]
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{nombre}</p>
        {hora && (
          <p className="text-sm font-semibold tabular-nums">
            {hora}
            {relativo && (
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                {relativo}
              </span>
            )}
          </p>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{detalle}</p>
      <ul className="mt-1 space-y-0.5">
        {lineas.filter(Boolean).map((l) => (
          <li key={l} className="text-xs text-muted-foreground">{l}</li>
        ))}
      </ul>
    </div>
  )
}
