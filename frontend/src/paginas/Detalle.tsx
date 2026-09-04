import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { CampoBusqueda, TablaLarga, coincide } from '@/componentes/Tabla'
import { BotonExcel } from '@/componentes/BotonExcel'
import { usarSeed } from '@/hooks/usarSeed'
import { etiquetaMes, numero, porcentaje, soles } from '@/lib/formato'

/** Columnas por las que se puede ordenar. */
type Orden = 'fecha' | 'venta' | 'margen'

export function Detalle() {
  const { transacciones, cargando, error, recargar } = usarSeed()
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<Orden>('fecha')

  const filas = useMemo(
    () =>
      transacciones.map((t) => {
        // Los servicios cuentan como costeados: su costo es cero a propósito
        // porque la mano de obra ya está en planilla y gastos.
        const conCosto = t.es_servicio || (t.costo || 0) > 0
        const margen = conCosto ? (t.venta || 0) - (t.costo || 0) : null
        return {
          ...t,
          comprobante: [t.serie, t.correlativo].filter(Boolean).join('-') || '—',
          margen,
          margenPct: conCosto && t.venta > 0 ? (margen! / t.venta) * 100 : null,
        }
      }),
    [transacciones],
  )

  const visibles = useMemo(() => {
    const filtradas = filas.filter((f) =>
      coincide(busqueda, f.fecha, f.canal, f.modelo, f.marca, f.comprobante, f.medio_pago, f.tipo_doc),
    )
    const ordenadas = [...filtradas]
    if (orden === 'fecha') ordenadas.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    if (orden === 'venta') ordenadas.sort((a, b) => (b.venta || 0) - (a.venta || 0))
    if (orden === 'margen') ordenadas.sort((a, b) => (b.margen ?? -Infinity) - (a.margen ?? -Infinity))
    return ordenadas
  }, [filas, busqueda, orden])

  const totales = useMemo(() => {
    const venta = visibles.reduce((s, f) => s + (f.venta || 0), 0)
    const conCosto = visibles.filter((f) => f.margen != null)
    const costo = conCosto.reduce((s, f) => s + (f.costo || 0), 0)
    const ventaCosteada = conCosto.reduce((s, f) => s + (f.venta || 0), 0)
    return {
      venta, costo,
      margen: ventaCosteada - costo,
      margenPct: ventaCosteada > 0 ? ((ventaCosteada - costo) / ventaCosteada) * 100 : null,
      sinCosto: visibles.length - conCosto.length,
    }
  }, [visibles])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = filas.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Detalle por producto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas las ventas, línea a línea. Los totales siguen a lo que filtres.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta={busqueda ? 'Venta filtrada' : 'Venta total'}
          valor={hay || cargando ? soles(totales.venta) : '—'}
          detalle={`${numero(visibles.length)} de ${numero(filas.length)} líneas`}
          acento="navy" cargando={cargando} />
        <Kpi etiqueta="Costo conocido" valor={totales.costo > 0 ? soles(totales.costo) : '—'}
          detalle={totales.sinCosto > 0 ? `${numero(totales.sinCosto)} líneas sin costo` : 'todas con costo'}
          acento="rojo" cargando={cargando} />
        <Kpi etiqueta="Margen" valor={totales.margenPct == null ? '—' : soles(totales.margen)}
          detalle={totales.margenPct == null ? 'sin base de costo' : `${porcentaje(totales.margenPct)} sobre lo costeado`}
          acento="verde" cargando={cargando} />
        <Kpi etiqueta="Marcas distintas"
          valor={numero(new Set(visibles.map((f) => f.marca).filter(Boolean)).size)}
          detalle={`${numero(new Set(visibles.map((f) => f.canal).filter(Boolean)).size)} canales`}
          acento="morado" cargando={cargando} />
      </div>

      <Card className="t-card-hover">
        <CardHeader className="gap-3">
          <div>
            <div className="flex items-center justify-between gap-2">
            <CardTitle>Líneas de venta</CardTitle>
            <BotonExcel
              nombre="detalle_ventas"
              filas={visibles}
              columnas={[
              { titulo: 'Fecha', valor: (f) => f.fecha },
              { titulo: 'Mes', valor: (f) => f.mes },
              { titulo: 'Comprobante', valor: (f) => f.comprobante },
              { titulo: 'Canal', valor: (f) => f.canal },
              { titulo: 'Producto', valor: (f) => f.modelo },
              { titulo: 'Marca', valor: (f) => f.marca },
              { titulo: 'Cantidad', valor: (f) => Number(f.qty) || 0 },
              { titulo: 'Venta', valor: (f) => Number(f.venta) || 0 },
              { titulo: 'Costo', valor: (f) => f.margen == null ? '' : Number(f.costo) || 0 },
              { titulo: 'Margen', valor: (f) => f.margen ?? '' },
              { titulo: 'Margen %', valor: (f) => f.margenPct ?? '' },
              { titulo: 'Medio de pago', valor: (f) => f.medio_pago },
            ]}
            />
          </div>
            <CardDescription>
              Busca por producto, marca, canal, comprobante o medio de pago
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CampoBusqueda
              valor={busqueda}
              alCambiar={setBusqueda}
              marcador="Buscar en todas las columnas…"
              resultados={visibles.length}
              className="flex-1"
            />
            <div className="flex gap-1">
              {([['fecha', 'Recientes'], ['venta', 'Mayor venta'], ['margen', 'Mayor margen']] as const).map(
                ([clave, texto]) => (
                  <button
                    key={clave}
                    type="button"
                    onClick={() => setOrden(clave)}
                    aria-pressed={orden === clave}
                    className={
                      'min-h-9 rounded-md border px-2.5 text-xs font-medium transition-colors ' +
                      (orden === clave
                        ? 'border-transparent bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent')
                    }
                  >
                    {texto}
                  </button>
                ),
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando ventas…" />
            : !hay ? <SinDatos mensaje="Sin ventas registradas." />
            : !visibles.length ? <SinDatos mensaje={`Nada coincide con "${busqueda}".`} />
            : (
              <TablaLarga>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Mes</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Venta</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead>Medio de pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibles.map((f, i) => (
                      <TableRow key={`${f.comprobante}-${f.modelo}-${i}`}>
                        <TableCell className="whitespace-nowrap text-xs">{f.fecha || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {f.mes ? etiquetaMes(f.mes) : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{f.comprobante}</TableCell>
                        <TableCell className="text-xs">{f.canal || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {/* En un div, no en la celda: una celda de tabla
                              ignora max-width y el texto invade la columna
                              vecina. El nombre completo va en el title. */}
                          <div className="max-w-[24rem] truncate" title={String(f.modelo ?? '')}>
                            {f.modelo || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{f.marca || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(f.qty || 0)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{soles(f.venta)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.margen == null ? '—' : soles(f.costo)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.margen == null ? '—' : soles(f.margen)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.margenPct == null
                            ? <Badge variant="outline">sin costo</Badge>
                            : porcentaje(f.margenPct, 0)}
                        </TableCell>
                        <TableCell className="text-xs">{f.medio_pago || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TablaLarga>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
