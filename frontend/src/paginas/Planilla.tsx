import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut } from '@/componentes/Graficos'
import { usarSeed } from '@/hooks/usarSeed'
import { numero, porcentaje, soles } from '@/lib/formato'

const TC = 3.5

export function Planilla() {
  const { planilla, alquileres, pagosFijos, cargando, error, recargar } = usarSeed()

  /**
   * El bruto se arma desde sus componentes y NO desde una columna "total":
   * en varias filas ese total ya viene con el adelanto descontado, y los
   * adelantos no son costo extra — son sueldo pagado antes.
   */
  const conBruto = useMemo(
    () =>
      planilla
        .map((p) => ({
          ...p,
          bruto: (p.remuneracion || 0) + (p.bono || 0) + (p.gratif || 0)
            + (p.vacaciones || 0) + (p.liquidacion || 0),
          costo: (p.remuneracion || 0) + (p.bono || 0) + (p.gratif || 0)
            + (p.vacaciones || 0) + (p.liquidacion || 0) + (p.essalud || 0),
        }))
        .sort((a, b) => b.costo - a.costo),
    [planilla],
  )

  const fijos = useMemo(() => {
    const alq = alquileres.reduce(
      (s, a) => s + (a.moneda === 'USD' ? (a.monto_mensual || 0) * TC : a.monto_mensual || 0), 0)
    const otros = pagosFijos.reduce(
      (s, f) => s + (f.moneda === 'USD' ? (f.monto || 0) * TC : f.monto || 0), 0)
    const pla = conBruto.reduce((s, p) => s + p.costo, 0)
    return { alq, otros, pla, total: alq + otros + pla }
  }, [alquileres, pagosFijos, conBruto])

  const reparto = useMemo(
    () => [
      { nombre: 'Planilla', monto: fijos.pla },
      { nombre: 'Alquileres', monto: fijos.alq },
      { nombre: 'Otros fijos', monto: fijos.otros },
    ].filter((x) => x.monto > 0),
    [fijos],
  )

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = planilla.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Planilla y Costos Fijos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo que cuesta la operación cada mes, con o sin ventas
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Costo fijo mensual" valor={cargando || fijos.total > 0 ? soles(fijos.total) : '—'}
          detalle="Planilla + alquileres + otros" acento="rojo" cargando={cargando} />
        <Kpi etiqueta="Planilla" valor={hay || cargando ? soles(fijos.pla) : '—'}
          detalle={`${numero(planilla.length)} personas`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Alquileres" valor={cargando || fijos.alq > 0 ? soles(fijos.alq) : '—'}
          detalle={`${numero(alquileres.length)} locales`} acento="azul" cargando={cargando} />
        <Kpi etiqueta="Otros fijos" valor={cargando || fijos.otros > 0 ? soles(fijos.otros) : '—'}
          detalle={`${numero(pagosFijos.length)} conceptos`} acento="morado" cargando={cargando} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Costo por persona</CardTitle>
            <CardDescription>Bruto más EsSalud, sin descontar adelantos</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin planilla cargada." />
              : <GraficoBarras
                  datos={conBruto.map((p) => ({ nombre: p.nombre, costo: p.costo }))}
                  ejeX="nombre" alto={300} series={[{ clave: 'costo', etiqueta: 'Costo mensual' }]} />}
          </CardContent>
        </Card>
        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Reparto del costo fijo</CardTitle>
            <CardDescription>Dónde se va el gasto que no depende de vender</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !reparto.length ? <SinDatos mensaje="Sin costos fijos." />
              : <GraficoDonut datos={reparto} claveNombre="nombre" claveValor="monto" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Detalle de planilla</CardTitle>
          <CardDescription>{numero(planilla.length)} personas</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin planilla cargada." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Remuneración</TableHead>
                      <TableHead className="text-right">Bono</TableHead>
                      <TableHead className="text-right">Vacaciones</TableHead>
                      <TableHead className="text-right">EsSalud</TableHead>
                      <TableHead className="text-right">Costo total</TableHead>
                      <TableHead className="text-right">% del fijo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conBruto.map((p, i) => (
                      <TableRow key={`${p.nombre}-${i}`}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(p.remuneracion)}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.bono ? soles(p.bono) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.vacaciones ? soles(p.vacaciones) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.essalud ? soles(p.essalud) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{soles(p.costo)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fijos.total > 0 ? porcentaje((p.costo / fijos.total) * 100) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>

      {(alquileres.length > 0 || pagosFijos.length > 0) && (
        <Card className="t-card-hover">
          <CardHeader>
            <CardTitle>Alquileres y otros fijos</CardTitle>
            <CardDescription>Los importes en dólares se convierten a S/. {TC}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto mensual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...alquileres, ...pagosFijos].map((f, i) => {
                    const monto = f.monto_mensual ?? f.monto ?? 0
                    return (
                      <TableRow key={`${f.concepto}-${i}`}>
                        <TableCell className="font-medium">{f.concepto}</TableCell>
                        <TableCell>{f.tipo || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.moneda === 'USD' ? `US$ ${monto.toFixed(2)} · ${soles(monto * TC)}` : soles(monto)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
