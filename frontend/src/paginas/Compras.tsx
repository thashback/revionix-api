import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut, agrupar, topYResto } from '@/componentes/Graficos'
import { usarSeed } from '@/hooks/usarSeed'
import { numero, soles } from '@/lib/formato'

/** El tipo de cambio con el que el sistema convierte las compras en dólares. */
const TC = 3.5

export function Compras() {
  const { compras, cargando, error, recargar } = usarSeed()
  const [busqueda, setBusqueda] = useState('')

  // El costo de COMPRAS_DATA es UNITARIO: el total de la línea es costo × cant.
  const conTotal = useMemo(
    () =>
      compras.map((c) => {
        const unit = c.mon === 'S/.' ? c.sol || 0 : (c.usd || 0) * TC
        return { ...c, unit, total: unit * (c.cant || 0) }
      }),
    [compras],
  )

  const filtradas = useMemo(() => {
    const t = busqueda.toLowerCase().trim()
    if (!t) return conTotal
    return conTotal.filter((c) =>
      `${c.desc} ${c.marca} ${c.prov}`.toLowerCase().includes(t),
    )
  }, [conTotal, busqueda])

  const porMes = useMemo(
    () =>
      agrupar(conTotal, (c) => String(c.fecha || '').slice(0, 7), { total: (c) => c.total })
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [conTotal],
  )

  const porProveedor = useMemo(
    () => topYResto(agrupar(conTotal, (c) => c.prov, { total: (c) => c.total }), 'total'),
    [conTotal],
  )

  const porMarca = useMemo(
    () => topYResto(agrupar(conTotal, (c) => c.marca, { total: (c) => c.total }), 'total'),
    [conTotal],
  )

  const totales = useMemo(() => {
    const total = conTotal.reduce((s, c) => s + c.total, 0)
    const unidades = conTotal.reduce((s, c) => s + (c.cant || 0), 0)
    return {
      total, unidades,
      proveedores: new Set(conTotal.map((c) => c.prov)).size,
      marcas: new Set(conTotal.map((c) => c.marca)).size,
    }
  }, [conTotal])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = compras.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Compras Mayoristas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historial de compras a proveedores · el costo mostrado es unitario
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Total comprado" valor={hay || cargando ? soles(totales.total) : '—'}
          detalle={`${numero(compras.length)} líneas`} acento="navy" cargando={cargando} />
        <Kpi etiqueta="Unidades" valor={hay || cargando ? numero(totales.unidades) : '—'}
          detalle="Piezas ingresadas" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Proveedores" valor={hay || cargando ? numero(totales.proveedores) : '—'}
          detalle="Distintos en el histórico" acento="verde" cargando={cargando} />
        <Kpi etiqueta="Marcas" valor={hay || cargando ? numero(totales.marcas) : '—'}
          detalle="Con compras registradas" acento="morado" cargando={cargando} />
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Compras por mes</CardTitle>
          <CardDescription>Los dólares se convierten a S/. {TC} para poder sumarlos</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando compras…" />
            : !porMes.length ? <SinDatos mensaje="Sin compras registradas." />
            : <GraficoBarras datos={porMes} ejeX="nombre" series={[{ clave: 'total', etiqueta: 'Comprado' }]} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="t-card-hover">
          <CardHeader>
            <CardTitle>Por proveedor</CardTitle>
            <CardDescription>Dónde se concentra la compra</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoDonut datos={porProveedor as Record<string, unknown>[]} claveNombre="nombre" claveValor="total" />}
          </CardContent>
        </Card>
        <Card className="t-card-hover">
          <CardHeader>
            <CardTitle>Por marca</CardTitle>
            <CardDescription>Qué marcas pesan más en la compra</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoDonut datos={porMarca as Record<string, unknown>[]} claveNombre="nombre" claveValor="total" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader className="gap-3">
          <CardTitle>Detalle de compras</CardTitle>
          <CardDescription>
            {numero(filtradas.length)} de {numero(compras.length)} líneas{busqueda && ' · filtrado'}
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar producto, marca o proveedor…"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !hay ? <SinDatos mensaje="Sin compras registradas." />
            : !filtradas.length ? <SinDatos mensaje="Ninguna compra coincide con la búsqueda." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-right">Cant</TableHead>
                      <TableHead className="text-right">Costo unit.</TableHead>
                      <TableHead className="text-right">Total S/.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((c, i) => (
                      <TableRow key={`${c.desc}-${i}`}>
                        <TableCell className="whitespace-nowrap">{c.prov}</TableCell>
                        <TableCell className="whitespace-nowrap">{c.fecha}</TableCell>
                        <TableCell className="min-w-64">{c.desc}</TableCell>
                        <TableCell className="whitespace-nowrap">{c.marca}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(c.cant)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.mon === 'S/.' ? soles(c.sol, 2) : `US$ ${(c.usd || 0).toFixed(2)}`}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{soles(c.total)}</TableCell>
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
