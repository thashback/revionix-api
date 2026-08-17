import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoDonut, topYResto } from '@/componentes/Graficos'
import { BotonExcel } from '@/componentes/BotonExcel'
import { usarSeed } from '@/hooks/usarSeed'
import { numero, porcentaje, soles } from '@/lib/formato'
import type { Fijo } from '@/lib/tipos'

/** El importe mensual de un fijo, venga con el nombre que venga. */
const importe = (f: Fijo) => Number(f.monto_mensual ?? f.monto ?? 0) || 0

/** Los que están en dólares no se convierten sin tipo de cambio guardado. */
const enSoles = (f: Fijo) => {
  const m = String(f.moneda ?? 'SOL').toUpperCase()
  return m.startsWith('S') || m === 'PEN' || m === ''
}

export function GastosFijos() {
  const { alquileres, pagosFijos, transacciones, cargando, error, recargar } = usarSeed()

  /**
   * ALQUILERES_DATA y PAGOS_FIJOS_DATA son la MISMA lista de conceptos: la
   * segunda es la versión completa, con los datos de cuenta y el estado de
   * pago. Sumarlas daba el fijo duplicado. Se toma la rica y, si no hubiera,
   * la otra; el grupo sale del campo `tipo`, que es lo que de verdad
   * distingue un alquiler de un servicio.
   */
  const todos = useMemo(() => {
    const fuente = pagosFijos.length ? pagosFijos : alquileres
    return fuente.map((f) => ({
      ...f,
      grupo: /alquiler/i.test(String(f.tipo ?? '')) ? ('Alquiler' as const) : ('Servicio' as const),
    }))
  }, [alquileres, pagosFijos])

  const totales = useMemo(() => {
    const soleados = todos.filter(enSoles)
    const alquiler = soleados.filter((f) => f.grupo === 'Alquiler').reduce((s, f) => s + importe(f), 0)
    const servicios = soleados.filter((f) => f.grupo === 'Servicio').reduce((s, f) => s + importe(f), 0)
    const dolares = todos.filter((f) => !enSoles(f))

    // Contra qué se compara: la venta media de los meses que tienen venta.
    const porMes = new Map<string, number>()
    for (const t of transacciones) {
      if (!t.mes) continue
      porMes.set(t.mes, (porMes.get(t.mes) || 0) + (t.venta || 0))
    }
    const ventaMedia = porMes.size
      ? [...porMes.values()].reduce((s, v) => s + v, 0) / porMes.size
      : 0

    const total = alquiler + servicios
    return {
      alquiler, servicios, total, ventaMedia,
      pesoSobreVenta: ventaMedia > 0 ? (total / ventaMedia) * 100 : null,
      enDolares: dolares.length,
      montoDolares: dolares.reduce((s, f) => s + importe(f), 0),
      meses: porMes.size,
    }
  }, [todos, transacciones])

  const reparto = useMemo(
    () =>
      todos
        .filter(enSoles)
        .map((f) => ({ nombre: f.concepto || '—', monto: importe(f) }))
        .filter((x) => x.monto > 0)
        .sort((a, b) => b.monto - a.monto),
    [todos],
  )

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = todos.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Gastos fijos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alquileres y servicios que se pagan todos los meses, pase lo que pase
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Total mensual" valor={hay || cargando ? soles(totales.total) : '—'}
          detalle={`${numero(todos.length)} conceptos`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Alquileres" valor={hay || cargando ? soles(totales.alquiler) : '—'}
          detalle={totales.total > 0 ? `${porcentaje((totales.alquiler / totales.total) * 100, 0)} del fijo` : ''}
          acento="azul" cargando={cargando} />
        <Kpi etiqueta="Servicios" valor={hay || cargando ? soles(totales.servicios) : '—'}
          detalle={totales.total > 0 ? `${porcentaje((totales.servicios / totales.total) * 100, 0)} del fijo` : ''}
          acento="morado" cargando={cargando} />
        <Kpi etiqueta="Peso sobre la venta"
          valor={totales.pesoSobreVenta == null ? '—' : porcentaje(totales.pesoSobreVenta)}
          detalle={totales.ventaMedia > 0
            ? `de ${soles(totales.ventaMedia)} de venta media`
            : 'sin ventas con las que comparar'}
          acento={totales.pesoSobreVenta != null && totales.pesoSobreVenta > 40 ? 'rojo' : 'verde'}
          cargando={cargando} />
      </div>

      {totales.enDolares > 0 && (
        <Card className="border-chart-3/40 bg-chart-3/5">
          <CardContent className="py-3 text-sm">
            <strong>{numero(totales.enDolares)}</strong> conceptos están en dólares
            (US$ {numero(Math.round(totales.montoDolares))}). No se suman al total en
            soles porque no hay un tipo de cambio guardado con el que convertirlos.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Reparto del fijo</CardTitle>
            <CardDescription>Dónde se va el gasto mensual</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" />
              : !reparto.length ? <SinDatos mensaje="Sin gastos fijos cargados." />
              : <GraficoDonut datos={topYResto(reparto, 'monto', 6) as Record<string, unknown>[]}
                  claveNombre="nombre" claveValor="monto" etiquetaTotal="Al mes" />}
          </CardContent>
        </Card>

        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
            <CardTitle>Conceptos</CardTitle>
            <BotonExcel
              nombre="gastos_fijos"
              filas={todos}
              columnas={[
              { titulo: 'Concepto', valor: (f) => f.concepto },
              { titulo: 'Grupo', valor: (f) => f.grupo },
              { titulo: 'Tipo', valor: (f) => f.tipo },
              { titulo: 'Monto mensual', valor: (f) => importe(f) },
              { titulo: 'Moneda', valor: (f) => enSoles(f) ? 'S/.' : 'US$' },
            ]}
            />
          </div>
            <CardDescription>
              {numero(todos.length)} pagos recurrentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" />
              : !hay ? <SinDatos mensaje="Sin gastos fijos cargados." />
              : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Monto mensual</TableHead>
                        <TableHead className="text-right">% del fijo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todos
                        .slice()
                        .sort((a, b) => importe(b) - importe(a))
                        .map((f, i) => (
                          <TableRow key={`${f.concepto}-${i}`}>
                            <TableCell className="font-medium">{f.concepto || '—'}</TableCell>
                            <TableCell>
                              <Badge variant={f.grupo === 'Alquiler' ? 'default' : 'secondary'}>
                                {f.grupo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{f.tipo || '—'}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {enSoles(f)
                                ? soles(importe(f))
                                : `US$ ${numero(Math.round(importe(f)))}`}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {enSoles(f) && totales.total > 0
                                ? porcentaje((importe(f) / totales.total) * 100, 0)
                                : '—'}
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
    </div>
  )
}
