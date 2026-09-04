import { useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras } from '@/componentes/Graficos'
import { BotonExcel } from '@/componentes/BotonExcel'
import { FileText, Loader2, Paperclip } from 'lucide-react'
import { usarSeed } from '@/hooks/usarSeed'
import { guardarAlmacen, subirArchivo, ConflictoAlmacen } from '@/lib/almacen'
import { etiquetaMes, mesLargo, numero, soles } from '@/lib/formato'
import type { PlanillaMes } from '@/lib/tipos'

const n = (x: unknown) => Number(x) || 0

/** Periodo AAAA-MM de un registro, que es como se agrupa todo el sistema. */
const periodo = (p: PlanillaMes) => `${p.ano}-${String(p.mes).padStart(2, '0')}`

/**
 * Bruto armado desde sus componentes, NO desde el campo `total`.
 *
 * En varias filas ese campo viene con el adelanto ya descontado, porque así
 * salía de las hojas de origen. Los adelantos no son un costo menor: son
 * sueldo pagado antes. Tomarlo tal cual subestimaba la planilla.
 */
const bruto = (p: PlanillaMes) =>
  n(p.remuneracion) + n(p.bono) + n(p.gratif) + n(p.vacaciones) + n(p.liquidacion)

/**
 * Lo que le cuesta a la empresa: bruto + EsSalud.
 *
 * El neto no sirve para esto porque deja fuera AFP y ONP, que la empresa
 * desembolsa igual.
 */
const costoEmpresa = (p: PlanillaMes) => bruto(p) + n(p.essalud)

export function Planilla() {
  const { planillaMensual, planillaPdfs, crudo, cargando, error, recargar } = usarSeed()
  const [mesElegido, setMesElegido] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [avisoPdf, setAvisoPdf] = useState<string | null>(null)
  /** Un input por fila: compartir uno solo obliga a rastrear a quién pertenece. */
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  /**
   * Adjunta el recibo por honorarios de un trabajador.
   *
   * Se guarda en rv_planilla_pdfs, indexado por el id del registro, igual que
   * los comprobantes de gasto en rv_gastos_pdfs. Así el archivo queda atado al
   * mes concreto: un mismo trabajador tiene un recibo distinto cada mes.
   */
  async function adjuntar(id: string, archivo: File) {
    setAvisoPdf(null)
    setSubiendo(id)
    try {
      const ruta = await subirArchivo(archivo)
      await guardarAlmacen({ rv_planilla_pdfs: { ...crudo.planillaPdfs, [id]: ruta } })
      await recargar()
      setAvisoPdf('Recibo adjuntado.')
    } catch (e) {
      setAvisoPdf(
        e instanceof ConflictoAlmacen
          ? e.message + ' Vuelve a adjuntarlo.'
          : e instanceof Error ? e.message : 'No se pudo adjuntar el recibo',
      )
      if (e instanceof ConflictoAlmacen) await recargar()
    } finally {
      setSubiendo(null)
    }
  }

  /** Los periodos con planilla cargada, del más reciente al más antiguo. */
  const periodos = useMemo(
    () => [...new Set(planillaMensual.map(periodo))].sort().reverse(),
    [planillaMensual],
  )

  // Si el mes guardado ya no existe se cae al más reciente, en vez de dejar
  // la pantalla en blanco.
  const mes = mesElegido && periodos.includes(mesElegido) ? mesElegido : (periodos[0] ?? null)

  const filas = useMemo(
    () =>
      planillaMensual
        .filter((p) => periodo(p) === mes)
        .sort((a, b) => String(a.trabajador).localeCompare(String(b.trabajador))),
    [planillaMensual, mes],
  )

  const totales = useMemo(() => {
    const rem = filas.reduce((s, p) => s + n(p.remuneracion), 0)
    const neto = filas.reduce((s, p) => s + n(p.neto), 0)
    const essalud = filas.reduce((s, p) => s + n(p.essalud), 0)
    const adelantos = filas.reduce((s, p) => s + n(p.adelantos), 0)
    const costo = filas.reduce((s, p) => s + costoEmpresa(p), 0)
    return { rem, neto, essalud, adelantos, costo, trabajadores: filas.length }
  }, [filas])

  /** Evolución del costo de personal, para ver si la planilla sube o baja. */
  const evolucion = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of planillaMensual) {
      m.set(periodo(p), (m.get(periodo(p)) || 0) + costoEmpresa(p))
    }
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([per, costo]) => ({ mes: etiquetaMes(per), costo: Math.round(costo) }))
  }, [planillaMensual])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />

  const hay = planillaMensual.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Planilla</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Planilla mensual por trabajador · elige el mes para ver el suyo
        </p>
      </div>

      {avisoPdf && (
        <Card className="border-chart-2/40 bg-chart-2/5">
          <CardContent className="py-3 text-sm">{avisoPdf}</CardContent>
        </Card>
      )}

      {/* Un botón por mes: con cuatro meses seguidos, una lista corrida
          obliga a buscar dónde empieza cada uno. */}
      {periodos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {periodos.map((per) => {
            const cuantos = planillaMensual.filter((p) => periodo(p) === per).length
            const activo = per === mes
            return (
              <Button
                key={per}
                size="sm"
                variant={activo ? 'default' : 'outline'}
                onClick={() => setMesElegido(per)}
              >
                {mesLargo(per)}
                <span className="ml-1.5 opacity-70">{cuantos}</span>
              </Button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Trabajadores" valor={hay || cargando ? numero(totales.trabajadores) : '—'}
          detalle={mes ? mesLargo(mes) : ''} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Remuneración" valor={hay || cargando ? soles(totales.rem) : '—'}
          detalle="Suma de sueldos del mes" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Neto a pagar" valor={hay || cargando ? soles(totales.neto) : '—'}
          detalle={totales.adelantos > 0 ? `${soles(totales.adelantos)} en adelantos` : 'Sin adelantos'}
          acento="verde" cargando={cargando} />
        <Kpi etiqueta="Costo empresa" valor={hay || cargando ? soles(totales.costo) : '—'}
          detalle={`Bruto + EsSalud (${soles(totales.essalud)})`} acento="morado" cargando={cargando} />
      </div>

      {evolucion.length > 1 && (
        <Card className="t-card-hover">
          <CardHeader>
            <CardTitle>Costo de personal mes a mes</CardTitle>
            <CardDescription>Bruto más EsSalud, por mes cargado</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoBarras
              datos={evolucion as unknown as Record<string, unknown>[]}
              ejeX="mes"
              series={[{ clave: 'costo', etiqueta: 'Costo empresa' }]}
            />
          </CardContent>
        </Card>
      )}

      <Card className="t-card-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{mes ? mesLargo(mes) : 'Detalle'}</CardTitle>
            <BotonExcel
              nombre={`planilla_${mes ?? 'sin_mes'}`}
              filas={filas}
              columnas={[
                { titulo: 'Trabajador', valor: (p) => p.trabajador, ancho: 24 },
                { titulo: 'Cargo', valor: (p) => p.cargo ?? '', ancho: 28 },
                { titulo: 'Ingreso', valor: (p) => p.fecha_ingreso ?? '' },
                { titulo: 'Días', valor: (p) => n(p.dias) },
                { titulo: 'Remuneración', valor: (p) => n(p.remuneracion) },
                { titulo: 'Bono', valor: (p) => n(p.bono) },
                { titulo: 'Adelantos', valor: (p) => n(p.adelantos) },
                { titulo: 'Vacaciones', valor: (p) => n(p.vacaciones) },
                { titulo: 'Liquidación', valor: (p) => n(p.liquidacion) },
                { titulo: 'Gratificación', valor: (p) => n(p.gratif) },
                { titulo: 'Total bruto', valor: (p) => bruto(p) },
                { titulo: 'Sistema', valor: (p) => p.sistema ?? '' },
                { titulo: 'Desc. AFP/ONP', valor: (p) => n(p.desc_pension) },
                { titulo: 'Otros descuentos', valor: (p) => n(p.desc_otros) },
                { titulo: 'Total descuentos', valor: (p) => n(p.total_descuentos) },
                { titulo: 'Neto a pagar', valor: (p) => n(p.neto) },
                { titulo: 'EsSalud', valor: (p) => n(p.essalud) },
                { titulo: 'Costo empresa', valor: (p) => costoEmpresa(p) },
                { titulo: 'N° de cuenta', valor: (p) => p.n_cuenta ?? '', ancho: 46 },
                { titulo: 'Recibo', valor: (p) => (p.id && planillaPdfs[String(p.id)] ? 'sí' : 'no') },
              ]}
            />
          </div>
          <CardDescription>
            {numero(filas.length)} trabajadores en planilla
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <SinDatos mensaje="Cargando…" />
          ) : !hay ? (
            <SinDatos mensaje="Sin planilla cargada." />
          ) : !filas.length ? (
            <SinDatos mensaje="Sin registros en el mes elegido." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Días</TableHead>
                    <TableHead className="text-right">Remuneración</TableHead>
                    <TableHead className="text-right">Bono</TableHead>
                    <TableHead className="text-right">Adelantos</TableHead>
                    <TableHead className="text-right">Descuentos</TableHead>
                    <TableHead className="text-right">Neto a pagar</TableHead>
                    <TableHead className="text-right">EsSalud</TableHead>
                    <TableHead className="text-right">Costo empresa</TableHead>
                    <TableHead className="text-center">Recibo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((p, i) => (
                    <TableRow key={p.id ?? `${p.trabajador}-${i}`}>
                      <TableCell className="whitespace-nowrap font-medium">{p.trabajador}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.cargo || '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{n(p.dias) || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{soles(n(p.remuneracion))}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n(p.bono) ? soles(n(p.bono)) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        {n(p.adelantos) ? soles(n(p.adelantos)) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        {n(p.total_descuentos) ? soles(n(p.total_descuentos)) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {soles(n(p.neto))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n(p.essalud) ? soles(n(p.essalud)) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {soles(costoEmpresa(p))}
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const id = String(p.id ?? '')
                          const pdf = id ? planillaPdfs[id] : undefined
                          if (!id) return <span className="text-muted-foreground">—</span>
                          return (
                            <div className="flex items-center justify-center gap-1">
                              {pdf && (
                                // Pestaña nueva: /uploads se sirve sin la sesión
                                // del CRM, igual que los comprobantes de gasto.
                                <a href={pdf} target="_blank" rel="noopener noreferrer"
                                  title="Ver recibo por honorarios"
                                  className="text-primary inline-flex items-center">
                                  <FileText className="size-4" />
                                  <span className="sr-only">Ver recibo</span>
                                </a>
                              )}
                              <input
                                ref={(el) => { inputs.current[id] = el }}
                                type="file"
                                accept=".pdf,image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0]
                                  if (f) void adjuntar(id, f)
                                  e.target.value = ''
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="size-7 p-0"
                                disabled={subiendo === id}
                                title={pdf ? 'Reemplazar el recibo' : 'Adjuntar recibo por honorarios'}
                                onClick={() => inputs.current[id]?.click()}
                              >
                                {subiendo === id
                                  ? <Loader2 className="size-4 animate-spin" />
                                  : <Paperclip className="size-4" />}
                              </Button>
                            </div>
                          )
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 bg-muted/40 font-bold">
                    <TableCell colSpan={3}>Total {mes ? mesLargo(mes) : ''}</TableCell>
                    <TableCell className="text-right tabular-nums">{soles(totales.rem)}</TableCell>
                    <TableCell colSpan={2} />
                    <TableCell className="text-right tabular-nums">
                      {soles(filas.reduce((s, p) => s + n(p.total_descuentos), 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{soles(totales.neto)}</TableCell>
                    <TableCell className="text-right tabular-nums">{soles(totales.essalud)}</TableCell>
                    <TableCell className="text-right tabular-nums">{soles(totales.costo)}</TableCell>
                    <TableCell className="text-center font-normal text-xs text-muted-foreground">
                      {numero(filas.filter((p) => p.id && planillaPdfs[String(p.id)]).length)}/{numero(filas.length)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {hay && (
        <Card>
          <CardContent className="py-3 text-xs text-muted-foreground">
            El <strong>costo empresa</strong> es el bruto más EsSalud. Los adelantos no se le
            restan: son sueldo pagado por adelantado, no un costo menor.
            {' '}Solo figura con EsSalud quien está afecto, no toda la planilla.
            {' '}Se pueden ver <Badge variant="secondary">{numero(periodos.length)}</Badge> meses.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
