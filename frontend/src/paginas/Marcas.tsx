import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut, agrupar, topYResto } from '@/componentes/Graficos'
import { BotonExcel } from '@/componentes/BotonExcel'
import { usarSeed } from '@/hooks/usarSeed'
import { numero, porcentaje, soles } from '@/lib/formato'

export function Marcas() {
  const { inventario, transacciones, cargando, error, recargar } = usarSeed()

  const porMarca = useMemo(() => {
    const inv = agrupar(inventario, (l) => l.marca, {
      unidades: (l) => l.cant || 0,
      venta: (l) => l.valor_venta || 0,
      costo: (l) => l.valor_costo || 0,
      lineas: () => 1,
      conCosto: (l) => ((l.costo || 0) > 0 ? l.valor_venta || 0 : 0),
    })
    const vendido = agrupar(transacciones, (t) => t.marca, { vendido: (t) => t.venta || 0 })
    // El tipo se declara a mano: al esparcir el resultado de `agrupar`,
    // TypeScript ensancha las claves y pierde los campos concretos.
    type Fila = {
      nombre: string; lineas: number; unidades: number
      venta: number; costo: number; vendido: number; margen: number | null
    }
    return inv
      .map<Fila>((m) => ({
        nombre: m.nombre,
        lineas: m.lineas,
        unidades: m.unidades,
        venta: m.venta,
        costo: m.costo,
        vendido: vendido.find((v) => v.nombre === m.nombre)?.vendido ?? 0,
        // El margen solo se calcula sobre lo que tiene costo conocido.
        margen: m.conCosto > 0 ? m.conCosto - m.costo : null,
      }))
      .sort((a, b) => b.venta - a.venta)
  }, [inventario, transacciones])

  const totales = useMemo(() => {
    const venta = inventario.reduce((s, l) => s + (l.valor_venta || 0), 0)
    const costo = inventario.reduce((s, l) => s + (l.valor_costo || 0), 0)
    const conCosto = inventario.filter((l) => (l.costo || 0) > 0)
      .reduce((s, l) => s + (l.valor_venta || 0), 0)
    return {
      venta, costo, marcas: new Set(inventario.map((l) => l.marca)).size,
      margen: conCosto - costo,
      cobertura: venta > 0 ? (conCosto / venta) * 100 : null,
    }
  }, [inventario])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = inventario.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Por Marca</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inventario y ventas agrupados por marca
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Marcas" valor={hay || cargando ? numero(totales.marcas) : '—'}
          detalle={`${numero(inventario.length)} líneas de inventario`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Valor en stock" valor={hay || cargando ? soles(totales.venta) : '—'}
          detalle="A precio de lista" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Valor a costo" valor={hay || cargando ? soles(totales.costo) : '—'}
          detalle={totales.cobertura == null ? 'sin costos' : `${porcentaje(totales.cobertura, 0)} con costo`}
          acento="naranja" cargando={cargando} />
        <Kpi etiqueta="Margen potencial" valor={hay || cargando ? soles(totales.margen) : '—'}
          detalle="Sobre el stock costeado" acento="verde" cargando={cargando} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Valor en stock por marca</CardTitle>
            <CardDescription>Precio de venta contra costo</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin inventario." />
              : <GraficoBarras datos={topYResto(porMarca, 'venta', 7) as Record<string, unknown>[]} ejeX="nombre"
                  series={[{ clave: 'venta', etiqueta: 'Venta' }, { clave: 'costo', etiqueta: 'Costo' }]} />}
          </CardContent>
        </Card>
        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Participación</CardTitle>
            <CardDescription>Peso de cada marca en el inventario</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoDonut datos={topYResto(porMarca, 'venta') as Record<string, unknown>[]}
                  claveNombre="nombre" claveValor="venta" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Detalle por marca</CardTitle>
            <BotonExcel
              nombre="marcas"
              filas={porMarca}
              columnas={[
              { titulo: 'Marca', valor: (f) => f.nombre },
              { titulo: 'Unidades', valor: (f) => f.unidades },
              { titulo: 'Valor al costo', valor: (f) => f.costo },
              { titulo: 'Valor de venta', valor: (f) => f.venta },
              { titulo: 'Margen', valor: (f) => f.venta - f.costo },
            ]}
            />
          </div>
          <CardDescription>{numero(porMarca.length)} marcas con inventario</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin inventario." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-right">Líneas</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">Valor venta</TableHead>
                      <TableHead className="text-right">Valor costo</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">Vendido</TableHead>
                      <TableHead className="text-right">% inventario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porMarca.map((m) => (
                      <TableRow key={m.nombre}>
                        <TableCell className="font-medium">{m.nombre}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(m.lineas)}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(m.unidades)}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(m.venta)}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.costo > 0 ? soles(m.costo) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.margen === null ? '—' : soles(m.margen)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.vendido > 0 ? soles(m.vendido) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {totales.venta > 0 ? porcentaje((m.venta / totales.venta) * 100) : '—'}
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
