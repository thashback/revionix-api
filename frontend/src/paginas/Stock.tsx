import { useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { usarInventario } from '@/hooks/usarInventario'
import { fechaHoraLima, numero, porcentaje, soles } from '@/lib/formato'

export function Stock() {
  const { lineas, meta, cargando, error, recargar } = usarInventario()
  const [busqueda, setBusqueda] = useState('')
  const [sede, setSede] = useState('')
  const [marca, setMarca] = useState('')

  const sedes = useMemo(
    () => [...new Set(lineas.map((l) => l.sede).filter(Boolean))].sort(),
    [lineas],
  )
  const marcas = useMemo(
    () => [...new Set(lineas.map((l) => l.marca).filter(Boolean))].sort(),
    [lineas],
  )

  const filtradas = useMemo(() => {
    const txt = busqueda.toLowerCase().trim()
    return lineas.filter((l) => {
      if (sede && l.sede !== sede) return false
      if (marca && l.marca !== marca) return false
      if (txt) {
        const heno = `${l.producto ?? ''} ${l.sku ?? ''} ${l.marca ?? ''}`.toLowerCase()
        if (!heno.includes(txt)) return false
      }
      return true
    })
  }, [lineas, busqueda, sede, marca])

  const totales = useMemo(() => {
    const unidades = filtradas.reduce((s, l) => s + (l.cant || 0), 0)
    const valorVenta = filtradas.reduce((s, l) => s + (l.valor_venta || 0), 0)
    const valorCosto = filtradas.reduce((s, l) => s + (l.valor_costo || 0), 0)
    const conCosto = filtradas.filter((l) => (l.costo || 0) > 0).length
    return {
      unidades,
      valorVenta,
      valorCosto,
      margen: valorVenta - valorCosto,
      margenPct: valorVenta > 0 ? ((valorVenta - valorCosto) / valorVenta) * 100 : null,
      conCosto,
      sedes: new Set(filtradas.map((l) => l.sede)).size,
    }
  }, [filtradas])

  const sello = fechaHoraLima(meta?.actualizado)
  const hayDatos = lineas.length > 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Stock Disponible</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventario real por sede · sincronizado desde BILLIA
            {sello && ` · actualizado ${sello}`}
          </p>
        </div>
        <Button variant="outline" onClick={recargar} disabled={cargando} className="gap-2">
          <RefreshCw className={cargando ? 'size-4 animate-spin' : 'size-4'} />
          Actualizar
        </Button>
      </div>

      {error ? (
        <ErrorCarga mensaje={error} alReintentar={recargar} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi
              etiqueta="Unidades en Stock"
              valor={hayDatos || cargando ? numero(totales.unidades) : '—'}
              detalle={`${numero(filtradas.length)} líneas · ${totales.sedes} sedes`}
              acento="navy"
              cargando={cargando}
            />
            <Kpi
              etiqueta="Valor Venta"
              valor={hayDatos || cargando ? soles(totales.valorVenta) : '—'}
              detalle="A precio de lista"
              acento="verde"
              cargando={cargando}
            />
            <Kpi
              etiqueta="Valor Costo"
              valor={hayDatos || cargando ? soles(totales.valorCosto) : '—'}
              detalle={`${totales.conCosto} de ${filtradas.length} con costo`}
              acento="azul"
              cargando={cargando}
            />
            <Kpi
              etiqueta="Margen Potencial"
              valor={hayDatos || cargando ? soles(totales.margen) : '—'}
              detalle={
                totales.margenPct == null
                  ? 'sin base de venta'
                  : `${porcentaje(totales.margenPct)} sobre venta`
              }
              acento="naranja"
              cargando={cargando}
            />
            <Kpi
              etiqueta="Marcas"
              valor={hayDatos || cargando ? numero(marcas.length) : '—'}
              detalle={`${sedes.length} sedes con inventario`}
              acento="morado"
              cargando={cargando}
            />
          </div>

          <Card className="t-card-hover">
            <CardHeader className="gap-3">
              <CardTitle>Inventario Detallado</CardTitle>
              <CardDescription>
                {numero(filtradas.length)} de {numero(lineas.length)} líneas
                {(busqueda || sede || marca) && ' · filtrado'}
              </CardDescription>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar producto, SKU o marca…"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  className="h-9 min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0 sm:w-48"
                >
                  <option value="">Todas las sedes</option>
                  {sedes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="h-9 min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0 sm:w-48"
                >
                  <option value="">Todas las marcas</option>
                  {marcas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <CardContent>
              {cargando ? (
                <SinDatos mensaje="Cargando inventario…" />
              ) : !hayDatos ? (
                <SinDatos mensaje="Todavía no hay inventario sincronizado desde BILLIA." />
              ) : filtradas.length === 0 ? (
                <SinDatos mensaje="Ningún producto coincide con los filtros." />
              ) : (
                // La tabla scrollea sola: nunca arrastra la página en móvil.
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sede</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Cant.</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                        <TableHead className="text-right">Valor Venta</TableHead>
                        <TableHead className="text-right">Valor Costo</TableHead>
                        <TableHead className="text-right">Margen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtradas.map((l, i) => (
                        <TableRow key={`${l.sku}-${l.sede}-${i}`}>
                          <TableCell className="whitespace-nowrap">{l.sede}</TableCell>
                          <TableCell className="whitespace-nowrap">{l.marca}</TableCell>
                          <TableCell className="min-w-56">{l.producto}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs">
                            {l.sku}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {numero(l.cant)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {soles(l.precio, 2)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {l.costo > 0 ? soles(l.costo, 2) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {soles(l.valor_venta)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {l.valor_costo > 0 ? soles(l.valor_costo) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {l.valor_costo > 0 ? soles(l.valor_venta - l.valor_costo) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
