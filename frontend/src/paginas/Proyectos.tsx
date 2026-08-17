import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { BotonExcel } from '@/componentes/BotonExcel'
import { api } from '@/lib/api'
import { calcularEtapas, num, type Avance, type Proyecto } from '@/lib/etapas'
import { numero, porcentaje, soles } from '@/lib/formato'

const CERRADOS = new Set(['completado', 'cancelado', 'entregado'])

const ESTADO_TONO: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendiente: 'outline',
  en_proceso: 'default',
  completado: 'secondary',
  entregado: 'secondary',
  cancelado: 'destructive',
}

const etiquetaEstado = (e: string) =>
  ({ en_proceso: 'En proceso', pendiente: 'Pendiente', completado: 'Completado',
     entregado: 'Entregado', cancelado: 'Cancelado' })[e] ?? e

/** Barra de etapas: OC → confirmación → fabricación → envío → entrega. */
function LineaEtapas({ avance }: { avance: Avance }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {avance.tramos.map((t, i) => (
          <div key={t.id} className="flex-1" title={`${t.nombre}: ${t.desde} → ${t.hasta}`}>
            <div className={
              'h-1.5 rounded-full ' +
              (t.estado === 'completada' ? 'bg-chart-2'
                : t.estado === 'en_curso' ? (avance.atrasado ? 'bg-destructive' : 'bg-chart-1')
                : 'bg-muted')
            } />
            <div className={
              'mt-1.5 truncate text-[11px] ' +
              (i === avance.indiceActual ? 'font-semibold text-foreground' : 'text-muted-foreground')
            }>
              {t.nombre}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {avance.atrasado
          ? `Atrasado ${numero(Math.abs(avance.diasRestantes))} días en ${
              avance.tramos[avance.indiceActual].nombre.toLowerCase()}`
          : avance.actual === 'entrega'
            ? 'Entregado'
            : `Faltan ${numero(avance.diasRestantes)} días para cerrar ${
                avance.tramos[avance.indiceActual].nombre.toLowerCase()}`}
        {' · '}entrega estimada {avance.entregaEstimada}
      </p>
    </div>
  )
}

export function Proyectos() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const r = await api.get<Proyecto[]>('/proyectos')
      setProyectos(Array.isArray(r) ? r : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los proyectos')
      setProyectos([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  const totales = useMemo(() => {
    const total = proyectos.reduce((s, p) => s + num(p.monto_total), 0)
    const ejecutado = proyectos.reduce((s, p) => s + num(p.monto_ejecutado), 0)
    const costo = proyectos.reduce((s, p) => s + num(p.costo), 0)
    const activos = proyectos.filter((p) => !CERRADOS.has(p.estado)).length
    const atrasados = proyectos.filter((p) => calcularEtapas(p)?.atrasado).length
    return {
      total, ejecutado, costo, activos, atrasados,
      margen: costo > 0 ? ejecutado - costo : null,
      avancePct: total > 0 ? (ejecutado / total) * 100 : null,
    }
  }, [proyectos])

  if (error) return <ErrorCarga mensaje={error} alReintentar={cargar} />
  const hay = proyectos.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Proyectos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Órdenes de compra y su avance por etapa, con la OC adjunta
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Proyectos activos" valor={hay || cargando ? numero(totales.activos) : '—'}
          detalle={`de ${numero(proyectos.length)} órdenes`} acento="azul" cargando={cargando} />
        <Kpi etiqueta="Monto en OC" valor={hay || cargando ? soles(totales.total) : '—'}
          detalle="Suma de órdenes emitidas" acento="navy" cargando={cargando} />
        <Kpi etiqueta="Ejecutado" valor={hay || cargando ? soles(totales.ejecutado) : '—'}
          detalle={totales.avancePct == null ? 'sin órdenes' : `${porcentaje(totales.avancePct)} de avance`}
          acento="verde" cargando={cargando} />
        <Kpi etiqueta="Margen" valor={totales.margen == null ? '—' : soles(totales.margen)}
          detalle={totales.margen == null ? 'sin costo cargado' : `sobre ${soles(totales.costo)} de costo`}
          acento={totales.atrasados > 0 ? 'rojo' : 'morado'} cargando={cargando} />
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Estado de los proyectos</CardTitle>
          <CardDescription>
            Avance por etapa: OC → confirmación → fabricación → envío → entrega
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {cargando ? <SinDatos mensaje="Cargando proyectos…" />
            : !hay ? <SinDatos mensaje="Sin órdenes de compra registradas." />
            : proyectos.map((p) => {
              const avance = calcularEtapas(p)
              return (
                <div key={p.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{p.numero_oc}</span>
                        <Badge variant={ESTADO_TONO[p.estado] ?? 'outline'}>
                          {etiquetaEstado(p.estado)}
                        </Badge>
                        {avance?.atrasado && <Badge variant="destructive">Atrasado</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{p.cliente}</p>
                      {p.descripcion && (
                        <p className="mt-1 text-xs whitespace-pre-line text-muted-foreground">
                          {p.descripcion}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">{soles(num(p.monto_total))}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        ejecutado {soles(num(p.monto_ejecutado))}
                      </div>
                    </div>
                  </div>
                  {avance
                    ? <LineaEtapas avance={avance} />
                    : <p className="text-xs text-muted-foreground">
                        Sin fecha de OC: no se puede calcular el avance.
                      </p>}
                </div>
              )
            })}
        </CardContent>
      </Card>

      <Card className="t-card-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Órdenes de compra</CardTitle>
            <BotonExcel
              nombre="proyectos"
              filas={proyectos}
              columnas={[
              { titulo: 'OC', valor: (p) => p.numero_oc },
              { titulo: 'Cliente', valor: (p) => p.cliente },
              { titulo: 'Descripción', valor: (p) => p.descripcion },
              { titulo: 'Fecha', valor: (p) => String(p.fecha_oc ?? '').slice(0, 10) },
              { titulo: 'Monto', valor: (p) => num(p.monto_total) },
              { titulo: 'Ejecutado', valor: (p) => num(p.monto_ejecutado) },
              { titulo: 'Estado', valor: (p) => p.estado },
              { titulo: 'Condición', valor: (p) => p.condicion_pago },
            ]}
            />
          </div>
          <CardDescription>{numero(proyectos.length)} registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !hay ? <SinDatos mensaje="Sin órdenes de compra." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OC</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Ejecutado</TableHead>
                      <TableHead className="text-right">Avance</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Condición</TableHead>
                      <TableHead>OC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proyectos.map((p) => {
                      const monto = num(p.monto_total)
                      const ejec = num(p.monto_ejecutado)
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium whitespace-nowrap">{p.numero_oc}</TableCell>
                          <TableCell>{p.cliente}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {String(p.fecha_oc ?? '').slice(0, 10) || '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{soles(monto)}</TableCell>
                          <TableCell className="text-right tabular-nums">{soles(ejec)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {monto > 0 ? porcentaje((ejec / monto) * 100, 0) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={ESTADO_TONO[p.estado] ?? 'outline'}>
                              {etiquetaEstado(p.estado)}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{p.condicion_pago || '—'}</TableCell>
                          <TableCell>
                            {p.ruta_oc
                              ? (
                                <a href={p.ruta_oc} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 underline underline-offset-2">
                                  <FileText className="size-3.5" /> Ver
                                </a>
                              )
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
