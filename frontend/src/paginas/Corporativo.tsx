import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut, agrupar, topYResto } from '@/componentes/Graficos'
import { BotonExcel } from '@/componentes/BotonExcel'
import { usarSeed } from '@/hooks/usarSeed'
import { etiquetaMes, numero, porcentaje, soles } from '@/lib/formato'
import type { VentaCorp } from '@/lib/tipos'

export function Corporativo() {
  const { ventasCorp, cargando, error, recargar } = usarSeed()
  const [abierto, setAbierto] = useState<string | null>(null)

  const porCliente = useMemo(
    () =>
      agrupar(ventasCorp, (v) => v.cliente, {
        total: (v) => v.total || 0,
        costo: (v) => v.costo || 0,
        porCobrar: (v) => (v.cobrado ? 0 : v.total || 0),
        docs: () => 1,
      }).sort((a, b) => b.total - a.total),
    [ventasCorp],
  )

  /**
   * Las líneas de cada cliente, para el desglose. La aplicación anterior las
   * pintaba en tarjetas siempre visibles; aquí van plegadas porque con 29
   * documentos la tabla completa tapaba el resumen.
   */
  const lineasPorCliente = useMemo(() => {
    const mapa = new Map<string, VentaCorp[]>()
    for (const v of ventasCorp) {
      const k = v.cliente || '—'
      const a = mapa.get(k) ?? []
      a.push(v)
      mapa.set(k, a)
    }
    for (const a of mapa.values()) {
      a.sort((x, y) => (x.fecha < y.fecha ? -1 : x.fecha > y.fecha ? 1 : 0))
    }
    return mapa
  }, [ventasCorp])

  const totales = useMemo(() => {
    const total = ventasCorp.reduce((s, v) => s + (v.total || 0), 0)
    const costo = ventasCorp.reduce((s, v) => s + (v.costo || 0), 0)
    const porCobrar = ventasCorp.filter((v) => !v.cobrado).reduce((s, v) => s + (v.total || 0), 0)
    return {
      total, costo, margen: total - costo, porCobrar,
      margenPct: total > 0 ? ((total - costo) / total) * 100 : null,
      clientes: new Set(ventasCorp.map((v) => v.cliente)).size,
    }
  }, [ventasCorp])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = ventasCorp.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Corporativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ventas a clientes empresa, con lo que queda por cobrar
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Facturado" valor={hay || cargando ? soles(totales.total) : '—'}
          detalle={`${numero(ventasCorp.length)} documentos`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Clientes" valor={hay || cargando ? numero(totales.clientes) : '—'}
          detalle="Con ventas registradas" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Margen" valor={hay || cargando ? soles(totales.margen) : '—'}
          detalle={totales.margenPct == null ? 'sin base' : `${porcentaje(totales.margenPct)} sobre venta`}
          acento="verde" cargando={cargando} />
        <Kpi etiqueta="Por cobrar" valor={hay || cargando ? soles(totales.porCobrar) : '—'}
          detalle={totales.total > 0 ? `${porcentaje((totales.porCobrar / totales.total) * 100, 0)} de lo facturado` : ''}
          acento="rojo" cargando={cargando} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Facturado por cliente</CardTitle>
            <CardDescription>Con lo pendiente de cobro</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin ventas corporativas." />
              : <GraficoBarras datos={topYResto(porCliente, 'total', 7) as Record<string, unknown>[]} ejeX="nombre"
                  series={[{ clave: 'total', etiqueta: 'Facturado' }, { clave: 'porCobrar', etiqueta: 'Por cobrar' }]} />}
          </CardContent>
        </Card>
        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Concentración</CardTitle>
            <CardDescription>Cuánto pesa cada cliente</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoDonut datos={topYResto(porCliente, 'total') as Record<string, unknown>[]}
                  claveNombre="nombre" claveValor="total" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Detalle por cliente</CardTitle>
            <BotonExcel
              nombre="corporativo"
              filas={porCliente}
              columnas={[
              { titulo: 'Cliente', valor: (f) => f.nombre },
              { titulo: 'Documentos', valor: (f) => f.docs },
              { titulo: 'Facturado', valor: (f) => f.total },
              { titulo: 'Costo', valor: (f) => f.costo },
              { titulo: 'Margen', valor: (f) => f.total - f.costo },
              { titulo: 'Por cobrar', valor: (f) => f.porCobrar },
            ]}
            />
          </div>
          <CardDescription>
            {numero(porCliente.length)} clientes · toca una fila para ver sus
            documentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin ventas corporativas." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Docs</TableHead>
                      <TableHead className="text-right">Facturado</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">Por cobrar</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porCliente.map((c) => {
                      const lineas = lineasPorCliente.get(c.nombre) ?? []
                      const expandido = abierto === c.nombre
                      return (
                        <Fragment key={c.nombre}>
                          <TableRow tabIndex={0} role="button" aria-expanded={expandido}
                            aria-label={`Ver los documentos de ${c.nombre}`}
                            className="cursor-pointer"
                            onClick={() => setAbierto(expandido ? null : c.nombre)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setAbierto(expandido ? null : c.nombre)
                              }
                            }}>
                            <TableCell className="text-muted-foreground">
                              {expandido ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </TableCell>
                            <TableCell className="font-medium">{c.nombre}</TableCell>
                            <TableCell className="text-right tabular-nums">{numero(c.docs)}</TableCell>
                            <TableCell className="text-right tabular-nums">{soles(c.total)}</TableCell>
                            <TableCell className="text-right tabular-nums">{c.costo > 0 ? soles(c.costo) : '—'}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {c.costo > 0 ? soles(c.total - c.costo) : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {c.porCobrar > 0 ? soles(c.porCobrar) : '—'}
                            </TableCell>
                            <TableCell>
                              {c.porCobrar > 0
                                ? <Badge variant="destructive">Pendiente</Badge>
                                : <Badge variant="secondary">Cobrado</Badge>}
                            </TableCell>
                          </TableRow>

                          {expandido && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={8} className="bg-muted/40 p-0">
                                <div className="overflow-x-auto p-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Mes</TableHead>
                                        <TableHead>Documento</TableHead>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Marca</TableHead>
                                        <TableHead className="text-right">Cant.</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Condición</TableHead>
                                        <TableHead>Cobro</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {lineas.map((l, i) => (
                                        <TableRow key={`${l.doc}-${i}`}>
                                          <TableCell className="whitespace-nowrap text-xs">
                                            {l.fecha || <Badge variant="outline">Pendiente</Badge>}
                                          </TableCell>
                                          <TableCell className="whitespace-nowrap text-xs">
                                            {l.mes ? etiquetaMes(l.mes) : '—'}
                                          </TableCell>
                                          <TableCell className="whitespace-nowrap text-xs">{l.doc || '—'}</TableCell>
                                          <TableCell className="text-xs">
                          {/* En un div, no en la celda: una celda de tabla
                              ignora max-width y el texto invade la columna
                              vecina. El nombre completo va en el title. */}
                          <div className="max-w-[24rem] truncate" title={String(l.desc ?? '')}>
                            {l.desc || '—'}
                          </div>
                        </TableCell>
                                          <TableCell className="text-xs">{l.marca || '—'}</TableCell>
                                          <TableCell className="text-right tabular-nums">{numero(l.qty)}</TableCell>
                                          <TableCell className="text-right font-semibold tabular-nums">
                                            {soles(l.total)}
                                          </TableCell>
                                          <TableCell className="text-xs capitalize">{l.condicion || '—'}</TableCell>
                                          <TableCell>
                                            {l.cobrado
                                              ? <Badge variant="secondary">Cobrado</Badge>
                                              : <Badge variant="destructive">Por cobrar</Badge>}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow className="font-semibold">
                                        <TableCell colSpan={6}>Subtotal</TableCell>
                                        <TableCell className="text-right tabular-nums">{soles(c.total)}</TableCell>
                                        <TableCell colSpan={2} />
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
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
