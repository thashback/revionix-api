import { useMemo, useState } from 'react'
import { FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormularioGasto } from '@/componentes/FormularioGasto'
import { ConflictoAlmacen, guardarAlmacen } from '@/lib/almacen'
import type { Gasto } from '@/lib/tipos'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { GraficoBarras, GraficoDonut, agrupar, topYResto } from '@/componentes/Graficos'
import { usarSeed } from '@/hooks/usarSeed'
import { numero, porcentaje, soles } from '@/lib/formato'

const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const etiquetaMes = (p: string) => {
  const [a, m] = String(p).split('-')
  return m ? `${MES_CORTO[Number(m) - 1]}-${a.slice(2)}` : p
}

export function Gastos() {
  const { gastos, alquileres, planilla, crudo, cargando, error, recargar } = usarSeed()
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Gasto | null>(null)
  const [formAbierto, setFormAbierto] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  /**
   * Guarda contra el mismo almacenamiento que la aplicación anterior:
   *  · gasto nuevo        → se añade a rv_gastos
   *  · gasto del snapshot → la edición va a rv_ediciones_gasto por id
   *  · gasto local        → se reemplaza dentro de rv_gastos
   * El comprobante siempre se indexa en rv_gastos_pdfs como 'g'+id.
   */
  async function guardarGasto(g: Gasto) {
    const locales = [...crudo.gastosLocales]
    const ediciones = { ...crudo.edicionesGasto }
    const pdfs = { ...crudo.pdfs }
    const cambios: Record<string, unknown> = {}

    let id = g.id
    if (id == null) {
      // Mismo formato de id que usa la aplicación anterior.
      id = Date.now() + Math.random()
      locales.push({ ...g, id })
      cambios.rv_gastos = locales
    } else {
      const i = locales.findIndex((x) => String(x.id) === String(id))
      if (i >= 0) {
        locales[i] = { ...locales[i], ...g }
        cambios.rv_gastos = locales
      } else {
        // Vive en el snapshot: no se puede tocar, la edición va aparte.
        const { pdf: _pdf, ...campos } = g
        ediciones[String(id)] = campos
        cambios.rv_ediciones_gasto = ediciones
      }
    }

    if (g.pdf) {
      pdfs['g' + id] = g.pdf
      cambios.rv_gastos_pdfs = pdfs
    }

    await aplicar(cambios)
  }

  async function borrarGasto(g: Gasto) {
    if (g.id == null) return
    if (!confirm(`¿Eliminar este gasto?\n\n${g.cat} · ${g.desc} · ${soles(g.monto, 2)}`)) return
    const lap = { ...crudo.lapidas }
    const gasto = { ...((lap.gasto as Record<string, number>) ?? {}) }
    gasto[String(g.id)] = 1
    lap.gasto = gasto
    await aplicar({ rv_eliminados: lap })
  }

  async function aplicar(cambios: Record<string, unknown>) {
    try {
      await guardarAlmacen(cambios)
      setAviso(null)
      await recargar()
    } catch (e) {
      if (e instanceof ConflictoAlmacen) {
        // No se fuerza la escritura: se recarga para no pisar a otra sesión.
        await recargar()
        setAviso(e.message)
        return
      }
      throw e
    }
  }

  const filtrados = useMemo(() => {
    const t = busqueda.toLowerCase().trim()
    const base = t
      ? gastos.filter((g) => `${g.desc} ${g.cat} ${g.canal ?? ''} ${g.resp ?? ''}`.toLowerCase().includes(t))
      : gastos
    // Lo más reciente primero: al registrar un gasto hoy tiene que verse sin
    // buscarlo, y la tabla solo muestra las primeras 300 filas.
    return [...base].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))
  }, [gastos, busqueda])

  const porMes = useMemo(
    () =>
      agrupar(gastos, (g) => g.mes || String(g.fecha || '').slice(0, 7), { monto: (g) => g.monto || 0 })
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((x) => ({ ...x, nombre: etiquetaMes(x.nombre) })),
    [gastos],
  )

  const porCategoria = useMemo(
    () => topYResto(agrupar(gastos, (g) => g.cat, { monto: (g) => g.monto || 0 }), 'monto', 6),
    [gastos],
  )

  const fijos = useMemo(() => {
    // Los alquileres en dólares se convierten con el mismo TC que usa el resto
    // del sistema, para que el total de gastos fijos sea comparable.
    const alq = alquileres.reduce(
      (s, a) => s + (a.moneda === 'USD' ? (a.monto_mensual || 0) * 3.5 : a.monto_mensual || 0), 0)
    const pla = planilla.reduce(
      (s, p) => s + (p.remuneracion || 0) + (p.bono || 0) + (p.gratif || 0)
        + (p.vacaciones || 0) + (p.liquidacion || 0) + (p.essalud || 0), 0)
    return { alq, pla, total: alq + pla }
  }, [alquileres, planilla])

  const totales = useMemo(() => {
    const total = gastos.reduce((s, g) => s + (g.monto || 0), 0)
    const movilidad = gastos.filter((g) => g.cat === 'Movilidad').reduce((s, g) => s + (g.monto || 0), 0)
    const meses = new Set(gastos.map((g) => g.mes || String(g.fecha || '').slice(0, 7))).size
    const conPdf = gastos.filter((g) => g.pdf).length
    return {
      total, movilidad, meses, conPdf,
      promedio: meses > 0 ? total / meses : 0,
      pctPdf: gastos.length > 0 ? (conPdf / gastos.length) * 100 : null,
    }
  }, [gastos])

  if (error) return <ErrorCarga mensaje={error} alReintentar={recargar} />
  const hay = gastos.length > 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Gastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gastos variables de operación, junto a los fijos mensuales
          </p>
        </div>
        <Button onClick={() => { setEditando(null); setFormAbierto(true) }} className="gap-2">
          <Plus className="size-4" /> Nuevo gasto
        </Button>
      </div>

      {aviso && (
        <Card className="border-chart-3/40">
          <CardHeader><CardDescription>{aviso}</CardDescription></CardHeader>
        </Card>
      )}

      <FormularioGasto
        abierto={formAbierto}
        gasto={editando}
        onCerrar={() => setFormAbierto(false)}
        onGuardar={guardarGasto}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Gastos variables" valor={hay || cargando ? soles(totales.total) : '—'}
          detalle={`${numero(gastos.length)} registros en ${totales.meses} meses`} acento="naranja" cargando={cargando} />
        <Kpi etiqueta="Promedio mensual" valor={hay || cargando ? soles(totales.promedio) : '—'}
          detalle="Variables, por mes con datos" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Fijos al mes" valor={cargando || fijos.total > 0 ? soles(fijos.total) : '—'}
          detalle={`Alquileres ${soles(fijos.alq)} + planilla ${soles(fijos.pla)}`} acento="rojo" cargando={cargando} />
        <Kpi etiqueta="Con comprobante" valor={hay || cargando ? numero(totales.conPdf) : '—'}
          detalle={totales.pctPdf == null ? 'sin gastos' : `${porcentaje(totales.pctPdf, 0)} de los registros`}
          acento="morado" cargando={cargando} />
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Gastos por mes</CardTitle>
          <CardDescription>Solo variables — los fijos son constantes y no aportan a la curva</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando gastos…" />
            : !porMes.length ? <SinDatos mensaje="Sin gastos registrados." />
            : <GraficoBarras datos={porMes} ejeX="nombre" series={[{ clave: 'monto', etiqueta: 'Gasto' }]} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="t-card-hover lg:col-span-3">
          <CardHeader>
            <CardTitle>Por categoría</CardTitle>
            <CardDescription>Dónde se va el gasto variable</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoBarras datos={porCategoria as Record<string, unknown>[]} ejeX="nombre"
                  series={[{ clave: 'monto', etiqueta: 'Gasto' }]} />}
          </CardContent>
        </Card>
        <Card className="t-card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle>Reparto</CardTitle>
            <CardDescription>Participación de cada categoría</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando ? <SinDatos mensaje="Cargando…" /> : !hay ? <SinDatos mensaje="Sin datos." />
              : <GraficoDonut datos={porCategoria as Record<string, unknown>[]} claveNombre="nombre" claveValor="monto" />}
          </CardContent>
        </Card>
      </div>

      <Card className="t-card-hover">
        <CardHeader className="gap-3">
          <CardTitle>Detalle de gastos</CardTitle>
          <CardDescription>
            {numero(filtrados.length)} de {numero(gastos.length)} registros{busqueda && ' · filtrado'}
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar descripción, categoría o responsable…"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !hay ? <SinDatos mensaje="Sin gastos registrados." />
            : !filtrados.length ? <SinDatos mensaje="Ningún gasto coincide con la búsqueda." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-center">Comprobante</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.slice(0, 300).map((g, i) => (
                      <TableRow key={`${g.id ?? i}`}>
                        <TableCell className="whitespace-nowrap">{g.fecha}</TableCell>
                        <TableCell className="whitespace-nowrap">{g.cat}</TableCell>
                        <TableCell className="min-w-64">{g.desc}</TableCell>
                        <TableCell className="whitespace-nowrap">{g.canal || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">{g.resp || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(g.monto, 2)}</TableCell>
                        <TableCell className="text-center">
                          {g.pdf ? (
                            // Se abre en pestaña nueva: el PDF se sirve desde
                            // /uploads y no necesita la sesión del CRM.
                            <a
                              href={g.pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ver comprobante"
                              className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                            >
                              <FileText className="size-4" />
                              <span className="sr-only">Ver comprobante</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" aria-label="Editar gasto"
                              onClick={() => { setEditando(g); setFormAbierto(true) }}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Eliminar gasto"
                              onClick={() => void borrarGasto(g)}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtrados.length > 300 && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Mostrando 300 de {numero(filtrados.length)} · afina la búsqueda para ver el resto
                  </p>
                )}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
