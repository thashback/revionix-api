import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { CampoBusqueda, coincide } from '@/componentes/Tabla'
import { BotonExcel } from '@/componentes/BotonExcel'
import { usarSeed } from '@/hooks/usarSeed'
import { numero, porcentaje, soles } from '@/lib/formato'
import type { Fijo } from '@/lib/tipos'

const importe = (f: Fijo) => Number(f.monto_mensual ?? f.monto ?? 0) || 0

const enSoles = (f: Fijo) => {
  const m = String(f.moneda ?? 'SOL').toUpperCase()
  return m.startsWith('S') || m === 'PEN' || m === ''
}

/** Lo que la aplicación anterior considera ya saldado. */
const PAGADO = /pagad|cancelad|saldad/i

export function PagosPendientes() {
  const { alquileres, pagosFijos, cargando, error, recargar } = usarSeed()
  const [busqueda, setBusqueda] = useState('')
  const [soloPendientes, setSoloPendientes] = useState(true)

  // Misma advertencia que en Gastos Fijos: las dos claves traen los mismos
  // conceptos, y PAGOS_FIJOS_DATA es la que incluye cuenta y estado.
  const filas = useMemo(
    () =>
      (pagosFijos.length ? pagosFijos : alquileres).map((f) => ({
        ...f,
        grupo: /alquiler/i.test(String(f.tipo ?? '')) ? ('Alquiler' as const) : ('Servicio' as const),
        pagado: PAGADO.test(String(f.estado ?? '')),
        monto: importe(f),
        soles: enSoles(f),
      })),
    [alquileres, pagosFijos],
  )

  const visibles = useMemo(
    () =>
      filas
        .filter((f) => (soloPendientes ? !f.pagado : true))
        .filter((f) => coincide(busqueda, f.concepto, f.tipo, f.cuenta, f.estado, f.grupo))
        .sort((a, b) => b.monto - a.monto),
    [filas, busqueda, soloPendientes],
  )

  const totales = useMemo(() => {
    const pendientes = filas.filter((f) => !f.pagado)
    const enSol = pendientes.filter((f) => f.soles)
    const porPagar = enSol.reduce((s, f) => s + f.monto, 0)
    const alquiler = enSol.filter((f) => f.grupo === 'Alquiler').reduce((s, f) => s + f.monto, 0)
    const sinCuenta = pendientes.filter((f) => !String(f.cuenta ?? '').trim()).length
    return {
      porPagar,
      alquiler,
      servicios: porPagar - alquiler,
      n: pendientes.length,
      sinCuenta,
      pagados: filas.length - pendientes.length,
    }
  }, [filas])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = filas.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Pagos pendientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Los fijos del mes que todavía no figuran como pagados, con sus datos de cuenta
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Total por pagar" valor={hay || cargando ? soles(totales.porPagar) : '—'}
          detalle={`${numero(totales.n)} conceptos pendientes`} acento="rojo" cargando={cargando} />
        <Kpi etiqueta="Alquileres" valor={hay || cargando ? soles(totales.alquiler) : '—'}
          detalle={totales.porPagar > 0 ? `${porcentaje((totales.alquiler / totales.porPagar) * 100, 0)} del pendiente` : ''}
          acento="azul" cargando={cargando} />
        <Kpi etiqueta="Servicios" valor={hay || cargando ? soles(totales.servicios) : '—'}
          detalle="Luz, agua, internet y demás" acento="morado" cargando={cargando} />
        <Kpi etiqueta="Sin datos de cuenta" valor={numero(totales.sinCuenta)}
          detalle={totales.sinCuenta > 0 ? 'no se pueden transferir' : 'todos con cuenta'}
          acento={totales.sinCuenta > 0 ? 'naranja' : 'verde'} cargando={cargando} />
      </div>

      <Card className="t-card-hover">
        <CardHeader className="gap-3">
          <div>
            <div className="flex items-center justify-between gap-2">
            <CardTitle>Conceptos</CardTitle>
            <BotonExcel
              nombre="pagos_pendientes"
              filas={visibles}
              columnas={[
              { titulo: 'Concepto', valor: (f) => f.concepto },
              { titulo: 'Grupo', valor: (f) => f.grupo },
              { titulo: 'Tipo', valor: (f) => f.tipo },
              { titulo: 'Monto', valor: (f) => f.monto },
              { titulo: 'Moneda', valor: (f) => f.soles ? 'S/.' : 'US$' },
              { titulo: 'Cuenta / datos de pago', valor: (f) => f.cuenta },
              { titulo: 'Estado', valor: (f) => f.estado || (f.pagado ? 'Pagado' : 'Pendiente') },
            ]}
            />
          </div>
            <CardDescription>
              El estado sale de lo que se marcó en la aplicación anterior; aquí
              solo se lee.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CampoBusqueda valor={busqueda} alCambiar={setBusqueda}
              marcador="Buscar concepto o cuenta…" resultados={visibles.length} className="flex-1" />
            <button
              type="button"
              onClick={() => setSoloPendientes((v) => !v)}
              aria-pressed={soloPendientes}
              className={
                'min-h-9 rounded-md border px-3 text-xs font-medium transition-colors ' +
                (soloPendientes
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent')
              }
            >
              {soloPendientes ? 'Solo pendientes' : `Todos (${numero(filas.length)})`}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !hay ? <SinDatos mensaje="Sin gastos fijos cargados." />
            : !visibles.length ? (
              <SinDatos mensaje={busqueda
                ? `Nada coincide con "${busqueda}".`
                : 'No queda nada pendiente de pago.'} />
            )
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Cuenta / datos de pago</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibles.map((f, i) => (
                      <TableRow key={`${f.concepto}-${i}`}>
                        <TableCell className="font-medium">{f.concepto || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={f.grupo === 'Alquiler' ? 'default' : 'secondary'}>
                            {f.grupo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.tipo || '—'}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {f.soles ? soles(f.monto) : `US$ ${numero(Math.round(f.monto))}`}
                        </TableCell>
                        <TableCell className="text-xs">
                          {/* El recorte va en un div: una celda de tabla ignora
                              max-width y el texto se salía sobre la columna de
                              al lado. El completo queda en el title. */}
                          {String(f.cuenta ?? '').trim() ? (
                            <div className="max-w-[18rem] truncate" title={String(f.cuenta)}>
                              {String(f.cuenta)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">sin datos</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {f.pagado
                            ? <Badge variant="secondary">{f.estado || 'Pagado'}</Badge>
                            : <Badge variant="destructive">{f.estado || 'Pendiente'}</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
