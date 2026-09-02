import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut, agrupar, topYResto } from '@/componentes/Graficos'
import { BotonExcel } from '@/componentes/BotonExcel'
import { usarSeed } from '@/hooks/usarSeed'
import { etiquetaMes, numero, porcentaje, soles } from '@/lib/formato'
import type { Ecommerce as VentaEcommerce, Transaccion } from '@/lib/tipos'

/** Una venta de ecommerce, sepamos o no de qué plataforma vino. */
type Linea = VentaEcommerce & { origen: 'Plataforma' | 'Carga de ventas' }

const SIN_PLATAFORMA = 'Sin plataforma'

/**
 * Una venta cargada por "Carga de ventas" con canal Ecommerce, traída a la
 * forma de esta pantalla.
 *
 * No trae plataforma ni vendedor: la plantilla de carga no tiene esas
 * columnas. Se marca como "Sin plataforma" en vez de adivinar si fue
 * MercadoLibre o Falabella.
 */
function desdeVenta(t: Transaccion): Linea {
  const qty = Number(t.qty) || 1
  const total = Number(t.venta) || 0
  return {
    fecha: t.fecha,
    mes: t.mes || String(t.fecha || '').slice(0, 7),
    plataforma: SIN_PLATAFORMA,
    vendedor: '',
    qty,
    modelo: t.modelo,
    marca: t.marca,
    precio_unit: qty > 0 ? total / qty : total,
    total,
    costo: Number(t.costo) || 0,
    origen: 'Carga de ventas',
  }
}

export function Ecommerce() {
  const { ecommerce, transacciones, cargando, error, recargar } = usarSeed()

  /**
   * Las dos fuentes juntas.
   *
   * ECOMMERCE_DATA es la lista precargada, que se detiene en mayo. Desde
   * junio las ventas de ecommerce entran por "Carga de ventas" con canal
   * Ecommerce y viven en rv_ventas: sumaban en Ventas, Canales y EBITDA, pero
   * esta pantalla no las leía y parecía que el canal se había apagado.
   */
  const lineas = useMemo<Linea[]>(() => {
    const precargadas: Linea[] = ecommerce.map((e) => ({ ...e, origen: 'Plataforma' }))
    const cargadas = transacciones
      .filter((t) => /ecommerce/i.test(String(t.canal ?? '')))
      .map(desdeVenta)
    return [...precargadas, ...cargadas].sort((a, b) =>
      String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')))
  }, [ecommerce, transacciones])

  const nCargadas = useMemo(() => lineas.filter((l) => l.origen === 'Carga de ventas').length, [lineas])

  const porMes = useMemo(
    () =>
      agrupar(lineas, (e) => e.mes || String(e.fecha || '').slice(0, 7), {
        total: (e) => e.total || 0,
        costo: (e) => e.costo || 0,
      })
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((x) => ({ ...x, nombre: etiquetaMes(x.nombre) })),
    [lineas],
  )

  const porPlataforma = useMemo(
    () => agrupar(lineas, (e) => e.plataforma, {
      total: (e) => e.total || 0,
      unidades: (e) => e.qty || 0,
      costo: (e) => e.costo || 0,
    }).sort((a, b) => b.total - a.total),
    [lineas],
  )

  const totales = useMemo(() => {
    const total = lineas.reduce((s, e) => s + (e.total || 0), 0)
    const costo = lineas.reduce((s, e) => s + (e.costo || 0), 0)
    const unidades = lineas.reduce((s, e) => s + (e.qty || 0), 0)
    return {
      total, costo, unidades, margen: total - costo,
      margenPct: total > 0 ? ((total - costo) / total) * 100 : null,
      plataformas: new Set(
        lineas.filter((e) => e.plataforma !== SIN_PLATAFORMA).map((e) => e.plataforma),
      ).size,
    }
  }, [lineas])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = lineas.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Ecommerce</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ventas por plataforma de venta en línea</p>
      </div>

      {nCargadas > 0 && (
        <Card className="border-chart-3/40 bg-chart-3/5">
          <CardContent className="py-3 text-sm">
            <strong>{numero(nCargadas)}</strong> de estas ventas entraron por{' '}
            <strong>Carga de ventas</strong> con canal Ecommerce, no desde la lista
            precargada por plataforma. Aparecen como{' '}
            <Badge variant="secondary">{SIN_PLATAFORMA}</Badge> porque la plantilla de
            carga no tiene columna de plataforma.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Vendido" valor={hay || cargando ? soles(totales.total) : '—'}
          detalle={`${numero(lineas.length)} operaciones`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Unidades" valor={hay || cargando ? numero(totales.unidades) : '—'}
          detalle="Piezas despachadas" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Margen" valor={hay || cargando ? soles(totales.margen) : '—'}
          detalle={totales.margenPct == null ? 'sin base' : `${porcentaje(totales.margenPct)} sobre venta`}
          acento="verde" cargando={cargando} />
        <Kpi etiqueta="Plataformas" valor={hay || cargando ? numero(totales.plataformas) : '—'}
          detalle="Con ventas registradas" acento="morado" cargando={cargando} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Ventas por mes</CardTitle>
            <CardDescription>Con su costo asociado</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin ventas de ecommerce." />
              : <GraficoBarras datos={porMes} ejeX="nombre"
                  series={[{ clave: 'total', etiqueta: 'Venta' }, { clave: 'costo', etiqueta: 'Costo' }]} />}
          </CardContent>
        </Card>
        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Por plataforma</CardTitle>
            <CardDescription>Dónde se vende más</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoDonut datos={topYResto(porPlataforma, 'total') as Record<string, unknown>[]}
                  claveNombre="nombre" claveValor="total" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Detalle de operaciones</CardTitle>
            <BotonExcel
              nombre="ecommerce"
              filas={lineas}
              columnas={[
              { titulo: 'Fecha', valor: (f) => f.fecha },
              { titulo: 'Mes', valor: (f) => f.mes },
              { titulo: 'Plataforma', valor: (f) => f.plataforma },
              { titulo: 'Vendedor', valor: (f) => f.vendedor },
              { titulo: 'Producto', valor: (f) => f.modelo },
              { titulo: 'Marca', valor: (f) => f.marca },
              { titulo: 'Cantidad', valor: (f) => Number(f.qty) || 0 },
              { titulo: 'Precio unitario', valor: (f) => Number(f.precio_unit) || 0 },
              { titulo: 'Total', valor: (f) => Number(f.total) || 0 },
              { titulo: 'Costo', valor: (f) => Number(f.costo) || 0 },
              { titulo: 'Origen', valor: (f) => f.origen },
            ]}
            />
          </div>
          <CardDescription>{numero(lineas.length)} ventas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin ventas de ecommerce." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-right">Cant</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineas.map((e, i) => (
                      <TableRow key={`${e.fecha}-${i}`}>
                        <TableCell className="whitespace-nowrap">{e.fecha}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {e.plataforma === SIN_PLATAFORMA
                            ? <Badge variant="secondary">{SIN_PLATAFORMA}</Badge>
                            : e.plataforma}
                        </TableCell>
                        <TableCell className="min-w-56">{e.modelo}</TableCell>
                        <TableCell className="whitespace-nowrap">{e.marca}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(e.qty)}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(e.precio_unit, 2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(e.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {e.costo > 0 ? soles((e.total || 0) - (e.costo || 0)) : '—'}
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
