import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut, agrupar, topYResto } from '@/componentes/Graficos'
import { CampoBusqueda, TablaLarga, coincide } from '@/componentes/Tabla'
import { usarSeed } from '@/hooks/usarSeed'
import { etiquetaMes, numero, porcentaje, soles } from '@/lib/formato'

export function Inversion() {
  const { compras, cargando, error, recargar } = usarSeed()
  const [busqueda, setBusqueda] = useState('')

  /**
   * El importe de una línea de compra: `sol` ya viene en soles y es UNITARIO,
   * así que el desembolso de la línea es precio × cantidad. Las que están en
   * dólares traen `usd`; sin tipo de cambio guardado no se convierten, se
   * marcan y quedan fuera del total en soles para no inventar una cifra.
   */
  const filas = useMemo(
    () =>
      compras.map((c) => {
        const cant = c.cant || 1
        const enSoles = String(c.mon || 'SOL').toUpperCase().startsWith('S') || !c.usd
        return {
          ...c,
          cant,
          unitario: enSoles ? c.sol || 0 : c.usd || 0,
          total: (enSoles ? c.sol || 0 : c.usd || 0) * cant,
          enSoles,
          mes: String(c.fecha || '').slice(0, 7),
        }
      }),
    [compras],
  )

  const visibles = useMemo(
    () => filas.filter((f) => coincide(busqueda, f.prov, f.desc, f.marca, f.fecha, f.mon)),
    [filas, busqueda],
  )

  const enSoles = useMemo(() => visibles.filter((f) => f.enSoles), [visibles])

  const porProveedor = useMemo(
    () =>
      agrupar(enSoles, (f) => f.prov || '—', {
        total: (f) => f.total,
        lineas: () => 1,
        unidades: (f) => f.cant,
      }).sort((a, b) => b.total - a.total),
    [enSoles],
  )

  const porMes = useMemo(
    () =>
      agrupar(enSoles.filter((f) => f.mes), (f) => f.mes, { total: (f) => f.total })
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((x) => ({ ...x, nombre: etiquetaMes(x.nombre) })),
    [enSoles],
  )

  const totales = useMemo(() => {
    const total = enSoles.reduce((s, f) => s + f.total, 0)
    const dolares = visibles.filter((f) => !f.enSoles)
    return {
      total,
      lineas: visibles.length,
      unidades: enSoles.reduce((s, f) => s + f.cant, 0),
      proveedores: new Set(enSoles.map((f) => f.prov).filter(Boolean)).size,
      enDolares: dolares.length,
      montoDolares: dolares.reduce((s, f) => s + f.total, 0),
    }
  }, [enSoles, visibles])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = filas.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Inversión</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo desembolsado en compras a proveedores, por quién y cuándo
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Invertido en soles" valor={hay || cargando ? soles(totales.total) : '—'}
          detalle={`${numero(totales.lineas)} líneas de compra`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Proveedores" valor={numero(totales.proveedores)}
          detalle="Con compras registradas" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Unidades compradas" valor={numero(totales.unidades)}
          detalle="Suma de cantidades" acento="morado" cargando={cargando} />
        <Kpi etiqueta="En dólares"
          valor={totales.enDolares ? `US$ ${numero(Math.round(totales.montoDolares))}` : '—'}
          detalle={totales.enDolares
            ? `${numero(totales.enDolares)} líneas, fuera del total en soles`
            : 'todo en soles'}
          acento={totales.enDolares ? 'naranja' : 'verde'} cargando={cargando} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Compras por mes</CardTitle>
            <CardDescription>Cuándo se puso el dinero</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" />
              : !porMes.length ? <SinDatos mensaje="Sin compras con fecha." />
              : <GraficoBarras datos={porMes as Record<string, unknown>[]} ejeX="nombre"
                  series={[{ clave: 'total', etiqueta: 'Invertido' }]} />}
          </CardContent>
        </Card>
        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Concentración</CardTitle>
            <CardDescription>Cuánto pesa cada proveedor</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" />
              : !porProveedor.length ? <SinDatos mensaje="Sin compras." />
              : <GraficoDonut datos={topYResto(porProveedor, 'total') as Record<string, unknown>[]}
                  claveNombre="nombre" claveValor="total" etiquetaTotal="Invertido" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Por proveedor</CardTitle>
          <CardDescription>{numero(porProveedor.length)} proveedores</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !porProveedor.length ? <SinDatos mensaje="Sin compras registradas." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Líneas</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">% del total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porProveedor.map((p) => (
                      <TableRow key={p.nombre}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(p.lineas)}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(p.unidades)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{soles(p.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {totales.total > 0 ? porcentaje((p.total / totales.total) * 100) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>

      <Card className="t-card-hover">
        <CardHeader className="gap-3">
          <div>
            <CardTitle>Todas las compras</CardTitle>
            <CardDescription>El precio unitario es por pieza, no por línea</CardDescription>
          </div>
          <CampoBusqueda valor={busqueda} alCambiar={setBusqueda}
            marcador="Buscar proveedor, producto o marca…" resultados={visibles.length} />
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !hay ? <SinDatos mensaje="Sin compras registradas." />
            : !visibles.length ? <SinDatos mensaje={`Nada coincide con "${busqueda}".`} />
            : (
              <TablaLarga>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">P. unitario</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Moneda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibles.map((f, i) => (
                      <TableRow key={`${f.prov}-${f.desc}-${i}`}>
                        <TableCell className="whitespace-nowrap text-xs">{f.fecha || '—'}</TableCell>
                        <TableCell className="text-xs">{f.prov || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {/* En un div, no en la celda: una celda de tabla
                              ignora max-width y el texto invade la columna
                              vecina. El nombre completo va en el title. */}
                          <div className="max-w-[24rem] truncate" title={String(f.desc ?? '')}>
                            {f.desc || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{f.marca || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(f.cant)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.enSoles ? soles(f.unitario, 2) : `US$ ${f.unitario.toFixed(2)}`}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {f.enSoles ? soles(f.total) : `US$ ${numero(Math.round(f.total))}`}
                        </TableCell>
                        <TableCell className="text-xs">{f.enSoles ? 'S/.' : 'US$'}</TableCell>
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
