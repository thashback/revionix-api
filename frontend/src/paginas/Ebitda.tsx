import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras } from '@/componentes/Graficos'
import { usarVeAvisos } from '@/componentes/AvisoAdmin'
import { usarSeed } from '@/hooks/usarSeed'
import { etiquetaMes, numero, porcentaje, soles } from '@/lib/formato'


/** El tipo de cambio con el que el sistema convierte importes en dólares. */
const TC = 3.5

/**
 * Series que emitía el sistema de facturación ANTERIOR a BILLIA. Los dos
 * convivieron: BILLIA arrancó el 05/05/2026 y el anterior se usó hasta el
 * 25/07. Una venta con estas series está facturada de verdad aunque su
 * comprobante no viva en BILLIA.
 */
const SERIES_ANTERIORES = ['B008', 'B009', 'EB01', 'F006', 'F007', 'F009']

export function Ebitda() {
  const {
    transacciones, ventasBillia, gastos, planilla, alquileres,
    cargando, error, recargar,
  } = usarSeed()
  const veAvisos = usarVeAvisos()

  /** Costos fijos: alquileres + planilla. Son los mismos todos los meses. */
  const fijos = useMemo(() => {
    const alq = alquileres.reduce(
      (s, a) => s + ((a.moneda === 'USD' ? (a.monto_mensual || 0) * TC : a.monto_mensual || 0)), 0)
    const pla = planilla.reduce(
      (s, p) => s + (p.remuneracion || 0) + (p.bono || 0) + (p.gratif || 0)
        + (p.vacaciones || 0) + (p.liquidacion || 0) + (p.essalud || 0), 0)
    return { alq, pla, total: alq + pla }
  }, [alquileres, planilla])

  const filas = useMemo(() => {
    const mes = (f: string, m?: string) => m || String(f || '').slice(0, 7)

    const acumular = <T,>(items: T[], claveMes: (x: T) => string, valor: (x: T) => number) => {
      const m = new Map<string, number>()
      items.forEach((x) => {
        const k = claveMes(x)
        if (k) m.set(k, (m.get(k) || 0) + (valor(x) || 0))
      })
      return m
    }

    const ventas = acumular(transacciones, (t) => mes(t.fecha, t.mes), (t) => t.venta || 0)
    const costos = acumular(transacciones, (t) => mes(t.fecha, t.mes), (t) => t.costo || 0)
    const gVar = acumular(gastos.filter((g) => g.cat !== 'Movilidad'), (g) => mes(g.fecha, g.mes), (g) => g.monto || 0)
    const gMov = acumular(gastos.filter((g) => g.cat === 'Movilidad'), (g) => mes(g.fecha, g.mes), (g) => g.monto || 0)
    const facturado = acumular(ventasBillia.filter((v) => v.mes), (v) => v.mes as string, (v) => v.total || 0)

    // Respaldo documental: lo que importa vigilar no es que falte en BILLIA
    // —el sistema anterior también facturaba— sino la venta que no tiene
    // NINGÚN número de comprobante, porque no se puede rastrear a ninguno.
    const sinDoc = new Map<string, { monto: number; n: number }>()
    const heredado = new Map<string, number>()
    transacciones.forEach((t) => {
      const k = mes(t.fecha, t.mes)
      if (!k) return
      const serie = String(t.serie || '').trim().toUpperCase()
      const corr = String(t.correlativo || '').replace(/\D/g, '')
      if (serie && corr) {
        if (SERIES_ANTERIORES.includes(serie)) heredado.set(k, (heredado.get(k) || 0) + (t.venta || 0))
      } else {
        const a = sinDoc.get(k) || { monto: 0, n: 0 }
        a.monto += t.venta || 0
        a.n += 1
        sinDoc.set(k, a)
      }
    })

    const meses = [...new Set([...ventas.keys(), ...facturado.keys()])].sort()
    return meses.map((p) => {
      const v = ventas.get(p) || 0
      const c = costos.get(p) || 0
      const vars = gVar.get(p) || 0
      const mov = gMov.get(p) || 0
      // Sin costo de lo vendido no hay margen, y sin margen no hay EBITDA.
      // Se deja en null en vez de calcularlo con costo cero, que mostraría
      // un margen del 100%.
      const hayCosto = c > 0
      const margen = hayCosto ? v - c : null
      const ebitda = margen === null ? null : margen - fijos.total - vars - mov
      const sd = sinDoc.get(p)
      return {
        periodo: p, nombre: etiquetaMes(p), v, c, margen,
        mbPct: hayCosto && v > 0 ? ((v - c) / v) * 100 : null,
        fijos: fijos.total, vars, mov, ebitda,
        ebitdaPct: ebitda !== null && v > 0 ? (ebitda / v) * 100 : null,
        facturado: facturado.get(p) || 0,
        heredado: heredado.get(p) || 0,
        sinDoc: sd?.monto || 0,
        nSinDoc: sd?.n || 0,
      }
    })
  }, [transacciones, ventasBillia, gastos, fijos])

  const conEbitda = filas.filter((f) => f.ebitda !== null)
  const ult3 = conEbitda.slice(-3)
  const promedio = ult3.length ? ult3.reduce((s, f) => s + (f.ebitda || 0), 0) / ult3.length : null
  const totalSinDoc = filas.reduce((s, f) => s + f.sinDoc, 0)
  const totalVentas = filas.reduce((s, f) => s + f.v, 0)
  // Qué parte de todo lo vendido carece de comprobante. En porcentaje se lee
  // mejor que en soles: dice si es una esquina del negocio o algo de fondo.
  const pctSinDoc = totalVentas > 0 ? (totalSinDoc / totalVentas) * 100 : null

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">EBITDA Mensual</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ventas − costo de lo vendido − gastos fijos − gastos variables − movilidad
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ult3.slice().reverse().map((f) => (
          <Kpi key={f.periodo} etiqueta={`EBITDA ${f.nombre}`}
            valor={soles(f.ebitda || 0)}
            detalle={f.ebitdaPct != null ? `${porcentaje(f.ebitdaPct)} sobre ventas` : 'sin base'}
            acento={(f.ebitda || 0) >= 0 ? 'verde' : 'rojo'}
            cargando={cargando} />
        )).concat(
          <Kpi key="prom" etiqueta="Promedio 3 meses"
            valor={promedio == null ? '—' : soles(promedio)}
            detalle="Últimos meses con costo conocido"
            acento={(promedio || 0) >= 0 ? 'azul' : 'rojo'} cargando={cargando} />,
        )}
      </div>

      {/* Solo el administrador: quien viene a consultar una cifra no puede
          arreglar esto, y leerlo solo le hace dudar del número. */}
      {veAvisos && totalSinDoc > 0 && !cargando && (
        <Card className="t-card-hover border-chart-3/40">
          <CardHeader>
            <CardTitle className="text-base">
              {pctSinDoc == null ? '—' : porcentaje(pctSinDoc)} de las ventas sin número de comprobante
            </CardTitle>
            <CardDescription>
              Son ventas antiguas provenientes de sistemas anteriores. Requieren revisión
              manual para extraer su comprobante y completar el registro.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>EBITDA mes a mes</CardTitle>
          <CardDescription>
            Los meses sin costo de lo vendido no aparecen: sin costo no hay margen que mostrar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Calculando…" />
            : !conEbitda.length ? <SinDatos mensaje="Ningún mes tiene costo de lo vendido cargado." />
            : <GraficoBarras
                datos={conEbitda.map((f) => ({ nombre: f.nombre, margen: f.margen || 0, ebitda: f.ebitda || 0 }))}
                ejeX="nombre" alto={300}
                series={[
                  { clave: 'margen', etiqueta: 'Margen bruto' },
                  { clave: 'ebitda', etiqueta: 'EBITDA' },
                ]} />}
        </CardContent>
      </Card>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Detalle mes a mes</CardTitle>
          <CardDescription>
            Gastos fijos estimados constantes: alquileres {soles(fijos.alq)} + planilla {soles(fijos.pla)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Calculando…" />
            : !filas.length ? <SinDatos mensaje="Sin datos." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Facturado BILLIA</TableHead>
                      <TableHead className="text-right">CMV</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">MB %</TableHead>
                      <TableHead className="text-right">Fijos</TableHead>
                      <TableHead className="text-right">Variables</TableHead>
                      <TableHead className="text-right">Movilidad</TableHead>
                      <TableHead className="text-right">EBITDA</TableHead>
                      <TableHead className="text-right">EBITDA %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((f) => (
                      <TableRow key={f.periodo}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {f.nombre}
                          {f.heredado > 0 && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">sist. anterior</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{soles(f.v)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.facturado > 0 ? soles(f.facturado) : '—'}
                          {f.sinDoc > 0 && f.v > 0 && (
                            <Badge
                              variant="secondary"
                              className="ml-2 text-[10px]"
                              title={`${f.nSinDoc} ventas sin número de comprobante · pendientes de extraer del sistema anterior`}
                            >
                              sin doc {porcentaje((f.sinDoc / f.v) * 100, 0)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{f.c > 0 ? soles(f.c) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.margen === null ? <span className="text-muted-foreground">—</span> : soles(f.margen)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.mbPct === null ? '—' : porcentaje(f.mbPct)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{soles(f.fijos)}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(f.vars)}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(f.mov)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.ebitda === null
                            ? <span className="text-muted-foreground" title="Sin costo de lo vendido no hay margen que calcular">—</span>
                            : <Badge variant={f.ebitda >= 0 ? 'secondary' : 'destructive'}>{soles(f.ebitda)}</Badge>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.ebitdaPct === null ? '—' : porcentaje(f.ebitdaPct)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 text-xs text-muted-foreground">
                  {numero(filas.length)} meses · los fijos se aplican constantes a todos, incluidos
                  aquellos en que la plantilla o los locales pudieron ser distintos.
                </p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
