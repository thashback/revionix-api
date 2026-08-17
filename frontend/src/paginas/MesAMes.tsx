import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras } from '@/componentes/Graficos'
import { BotonExcel } from '@/componentes/BotonExcel'
import { usarSeed } from '@/hooks/usarSeed'
import { etiquetaMes, mesLargo, numero, porcentaje, soles } from '@/lib/formato'
import type { Ecommerce, Transaccion, VentaCorp } from '@/lib/tipos'

/**
 * Una línea de venta normalizada, venga del canal que venga. Las tres fuentes
 * guardan los mismos hechos con nombres distintos, así que se traducen aquí
 * una sola vez en lugar de repetir el `||` en cada celda de la tabla.
 */
interface LineaVenta {
  origen: 'Tiendas' | 'Corporativo' | 'Ecommerce'
  fecha: string
  mes: string
  cliente: string
  doc: string
  producto: string
  marca: string
  qty: number
  venta: number
  /** null cuando no se conoce: un cero se sumaría como margen del 100%. */
  costo: number | null
  medioPago: string
}

const ORIGEN_TONO: Record<LineaVenta['origen'], 'default' | 'secondary' | 'outline'> = {
  Tiendas: 'default',
  Corporativo: 'secondary',
  Ecommerce: 'outline',
}

export function MesAMes() {
  const { transacciones, ventasCorp, ecommerce, ventasBillia, cargando, error, recargar } = usarSeed()
  const [mesAbierto, setMesAbierto] = useState<string | null>(null)

  /**
   * Las tres fuentes comerciales en un solo formato.
   *
   * Corporativo no es un canal aparte de las tiendas: es una clasificación de
   * ventas que, cuando ya están facturadas, TAMBIÉN figuran en el CRM. Sumar
   * las dos listas sin más contaría dos veces esos documentos, así que se
   * descartan de tiendas los comprobantes que ya vienen por el lado
   * corporativo — el mismo criterio que usa `usarSeed` con rv_ventas.
   */
  const lineas = useMemo<LineaVenta[]>(() => {
    const claveDoc = (serie: unknown, numero: unknown) =>
      `${String(serie ?? '').trim().toUpperCase()}-${String(numero ?? '').trim().replace(/^0+/, '')}`
    const docsCorp = new Set(
      ventasCorp
        .filter((v) => v.serie && v.numero)
        .map((v) => claveDoc(v.serie, v.numero)),
    )

    const deTienda = (t: Transaccion): LineaVenta => ({
      origen: 'Tiendas',
      fecha: t.fecha || '',
      mes: t.mes || String(t.fecha || '').slice(0, 7),
      // TXNS_DATA no guarda el cliente; el canal es lo más cercano que hay.
      cliente: t.canal || '—',
      doc: [t.serie, t.correlativo].filter(Boolean).join('-') || '—',
      producto: t.modelo || '—',
      marca: t.marca || '—',
      qty: t.qty || 0,
      venta: t.venta || 0,
      costo: t.costo > 0 ? t.costo : null,
      medioPago: t.medio_pago || '—',
    })
    const deCorp = (v: VentaCorp): LineaVenta => ({
      origen: 'Corporativo',
      fecha: v.fecha || '',
      mes: v.mes || String(v.fecha || '').slice(0, 7),
      cliente: v.cliente || '—',
      doc: v.doc || '—',
      producto: v.desc || '—',
      marca: v.marca || '—',
      qty: v.qty || 0,
      venta: v.total || 0,
      costo: v.costo > 0 ? v.costo : null,
      medioPago: v.condicion || '—',
    })
    const deEcom = (e: Ecommerce): LineaVenta => ({
      origen: 'Ecommerce',
      fecha: e.fecha || '',
      mes: e.mes || String(e.fecha || '').slice(0, 7),
      // El ecommerce no emite comprobante propio y no guarda cliente: la
      // contraparte es la plataforma, y el vendedor acompaña como referencia.
      cliente: [e.plataforma, e.vendedor].filter(Boolean).join(' · ') || '—',
      doc: '—',
      producto: e.modelo || '—',
      marca: e.marca || '—',
      qty: e.qty || 0,
      venta: e.total || 0,
      costo: e.costo > 0 ? e.costo : null,
      medioPago: '—',
    })
    const tiendas = transacciones
      .filter((t) => !docsCorp.has(claveDoc(t.serie, t.correlativo)))
      .map(deTienda)

    return [
      ...tiendas,
      ...ventasCorp.map(deCorp),
      ...ecommerce.map(deEcom),
    ].filter((l) => l.mes)
  }, [transacciones, ventasCorp, ecommerce])

  /**
   * Fila por mes. El margen se calcula SOLO sobre las líneas que tienen costo
   * conocido: mezclarlas con las que no lo tienen daría un margen inflado, que
   * es justo el error que ya se corrigió en Stock.
   */
  const filas = useMemo(() => {
    const porMes = new Map<string, LineaVenta[]>()
    for (const l of lineas) {
      const a = porMes.get(l.mes) ?? []
      a.push(l)
      porMes.set(l.mes, a)
    }
    const facturado = new Map<string, number>()
    for (const v of ventasBillia) {
      if (!v.mes) continue
      facturado.set(v.mes, (facturado.get(v.mes) || 0) + (v.total || 0))
    }

    const meses = [...new Set([...porMes.keys(), ...facturado.keys()])].sort()
    let acumulado = 0
    return meses.map((m) => {
      const ls = porMes.get(m) ?? []
      const venta = ls.reduce((s, l) => s + l.venta, 0)
      const conCosto = ls.filter((l) => l.costo != null)
      const ventaConCosto = conCosto.reduce((s, l) => s + l.venta, 0)
      const costo = conCosto.reduce((s, l) => s + (l.costo || 0), 0)
      const canal = (o: LineaVenta['origen']) =>
        ls.filter((l) => l.origen === o).reduce((s, l) => s + l.venta, 0)
      acumulado += venta
      return {
        periodo: m,
        nombre: etiquetaMes(m),
        venta,
        costo,
        margen: ventaConCosto - costo,
        margenPct: ventaConCosto > 0 ? ((ventaConCosto - costo) / ventaConCosto) * 100 : null,
        cobertura: venta > 0 ? (ventaConCosto / venta) * 100 : 0,
        tiendas: canal('Tiendas'),
        corp: canal('Corporativo'),
        ecom: canal('Ecommerce'),
        facturado: facturado.get(m) || 0,
        acumulado,
        n: ls.length,
      }
    })
  }, [lineas, ventasBillia])

  const totales = useMemo(() => {
    const venta = filas.reduce((s, f) => s + f.venta, 0)
    const mejor = filas.reduce<(typeof filas)[number] | null>(
      (b, f) => (b == null || f.venta > b.venta ? f : b), null)
    const ultimo = filas[filas.length - 1] ?? null
    const previo = filas[filas.length - 2] ?? null
    const variacion = ultimo && previo && previo.venta > 0
      ? ((ultimo.venta - previo.venta) / previo.venta) * 100 : null
    return { venta, mejor, ultimo, variacion, promedio: filas.length ? venta / filas.length : 0 }
  }, [filas])

  const detalle = useMemo(() => {
    if (!mesAbierto) return []
    return lineas
      .filter((l) => l.mes === mesAbierto)
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
  }, [lineas, mesAbierto])

  const totDetalle = useMemo(() => {
    const venta = detalle.reduce((s, l) => s + l.venta, 0)
    const conCosto = detalle.filter((l) => l.costo != null)
    const costo = conCosto.reduce((s, l) => s + (l.costo || 0), 0)
    const ventaConCosto = conCosto.reduce((s, l) => s + l.venta, 0)
    return { venta, costo, margen: ventaConCosto - costo, n: detalle.length, sinCosto: detalle.length - conCosto.length }
  }, [detalle])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = filas.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Mes a mes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evolución de tiendas, corporativo y ecommerce. Toca un mes para ver
          venta por venta.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Venta acumulada" valor={hay || cargando ? soles(totales.venta) : '—'}
          detalle={`${numero(filas.length)} meses con movimiento`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Promedio mensual" valor={hay || cargando ? soles(totales.promedio) : '—'}
          detalle="Sobre los meses con venta" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Mejor mes" valor={totales.mejor ? soles(totales.mejor.venta) : '—'}
          detalle={totales.mejor ? mesLargo(totales.mejor.periodo) : ''} acento="verde" cargando={cargando} />
        <Kpi etiqueta="Último mes" valor={totales.ultimo ? soles(totales.ultimo.venta) : '—'}
          detalle={totales.variacion == null
            ? (totales.ultimo ? mesLargo(totales.ultimo.periodo) : '')
            : `${totales.variacion >= 0 ? '▲' : '▼'} ${porcentaje(Math.abs(totales.variacion))} vs. mes previo`}
          acento={totales.variacion != null && totales.variacion < 0 ? 'rojo' : 'morado'} cargando={cargando} />
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Venta por canal</CardTitle>
          <CardDescription>
            Apilado: la altura de cada barra es la venta total del mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !hay ? <SinDatos mensaje="Sin ventas registradas." />
            : <GraficoBarras datos={filas} ejeX="nombre" alto={300} apilado
                series={[
                  { clave: 'tiendas', etiqueta: 'Tiendas' },
                  { clave: 'corp', etiqueta: 'Corporativo' },
                  { clave: 'ecom', etiqueta: 'Ecommerce' },
                ]} />}
        </CardContent>
      </Card>

      <Card className="t-card-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Detalle mensual</CardTitle>
            <BotonExcel
              nombre="mes_a_mes"
              filas={filas}
              columnas={[
              { titulo: 'Mes', valor: (f) => f.periodo },
              { titulo: 'Ventas', valor: (f) => f.venta },
              { titulo: 'Costo', valor: (f) => f.costo },
              { titulo: 'Margen', valor: (f) => f.margen },
              { titulo: 'Margen %', valor: (f) => f.margenPct ?? '' },
              { titulo: 'Tiendas', valor: (f) => f.tiendas },
              { titulo: 'Corporativo', valor: (f) => f.corp },
              { titulo: 'Ecommerce', valor: (f) => f.ecom },
              { titulo: 'Facturado BILLIA', valor: (f) => f.facturado },
              { titulo: 'Acumulado', valor: (f) => f.acumulado },
            ]}
            />
          </div>
          <CardDescription>
            Ventas = tiendas + corporativo + ecommerce, sin contar dos veces los
            comprobantes corporativos que ya están en el CRM. El margen se
            calcula solo sobre las ventas con costo conocido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !hay ? <SinDatos mensaje="Sin ventas registradas." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Costo conocido</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">Margen %</TableHead>
                      <TableHead className="text-right">Tiendas</TableHead>
                      <TableHead className="text-right">Corp.</TableHead>
                      <TableHead className="text-right">Ecommerce</TableHead>
                      <TableHead className="text-right">Facturado BILLIA</TableHead>
                      <TableHead className="text-right">Acumulado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((f) => (
                      <TableRow key={f.periodo} tabIndex={0} role="button"
                        aria-label={`Ver el desglose de ${mesLargo(f.periodo)}`}
                        className="cursor-pointer"
                        onClick={() => setMesAbierto(f.periodo)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setMesAbierto(f.periodo)
                          }
                        }}>
                        <TableCell className="font-medium whitespace-nowrap">{f.nombre}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{soles(f.venta)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.costo > 0 ? soles(f.costo) : '—'}
                          {/* Sin esto la fila parece mal sumada: el margen no
                              sale de (Ventas − Costo) sino solo de las líneas
                              que tienen costo cargado. */}
                          {f.costo > 0 && f.cobertura < 99.5 && (
                            <div className="text-[11px] font-normal text-muted-foreground">
                              cubre {porcentaje(f.cobertura, 0)} de la venta
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.margenPct == null ? '—' : soles(f.margen)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.margenPct == null
                            ? <span className="text-muted-foreground">sin costo</span>
                            : porcentaje(f.margenPct)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{f.tiendas > 0 ? soles(f.tiendas) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{f.corp > 0 ? soles(f.corp) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{f.ecom > 0 ? soles(f.ecom) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {f.facturado > 0 ? soles(f.facturado) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{soles(f.acumulado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>

      <Sheet open={mesAbierto != null} onOpenChange={(v) => !v && setMesAbierto(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{mesAbierto ? mesLargo(mesAbierto) : ''}</SheetTitle>
            <SheetDescription>
              {numero(totDetalle.n)} ventas · {soles(totDetalle.venta)}
              {totDetalle.sinCosto > 0 && ` · ${numero(totDetalle.sinCosto)} sin costo cargado`}
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-3 gap-3 px-4">
            <Kpi etiqueta="Venta" valor={soles(totDetalle.venta)} acento="navy" />
            <Kpi etiqueta="Costo" valor={totDetalle.costo > 0 ? soles(totDetalle.costo) : '—'} acento="rojo" />
            <Kpi etiqueta="Margen" valor={totDetalle.costo > 0 ? soles(totDetalle.margen) : '—'} acento="verde" />
          </div>

          <div className="overflow-x-auto px-4 pb-6">
            {!detalle.length ? <SinDatos mensaje="Sin ventas este mes." />
              : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Venta</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalle.map((l, i) => (
                      <TableRow key={`${l.doc}-${l.producto}-${i}`}>
                        <TableCell className="whitespace-nowrap text-xs">{l.fecha || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={ORIGEN_TONO[l.origen]}>{l.origen}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{l.cliente}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{l.doc}</TableCell>
                        <TableCell className="text-xs">
                          {/* En un div, no en la celda: una celda de tabla
                              ignora max-width y el texto invade la columna
                              vecina. El nombre completo va en el title. */}
                          <div className="max-w-[22rem] truncate" title={String(l.producto ?? '')}>
                            {l.producto}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{l.marca}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(l.qty)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{soles(l.venta)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {l.costo == null ? '—' : soles(l.costo)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {l.costo == null ? '—' : soles(l.venta - l.costo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
