import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Lightbulb, Loader2, Send } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Kpi } from '@/componentes/Kpi'
import { ErrorCarga, SinDatos } from '@/componentes/Estados'
import { api } from '@/lib/api'
import { usarSesion } from '@/lib/sesion'
import { fechaHoraLima, numero } from '@/lib/formato'

interface Solicitud {
  id: number
  usuario: string
  titulo: string
  detalle: string | null
  modulo: string | null
  prioridad: 'baja' | 'media' | 'alta'
  estado: 'pendiente' | 'en_revision' | 'aceptada' | 'descartada' | 'hecha'
  respuesta: string | null
  /** Para cuándo se estima que estará. AAAA-MM-DD, o null si no hay fecha. */
  fecha_estimada: string | null
  created_at: string
}

const ESTADO = {
  pendiente:   { texto: 'Pendiente',   tono: 'outline' as const },
  en_revision: { texto: 'En revisión', tono: 'default' as const },
  aceptada:    { texto: 'Aceptada',    tono: 'secondary' as const },
  hecha:       { texto: 'Hecha',       tono: 'secondary' as const },
  descartada:  { texto: 'Descartada',  tono: 'destructive' as const },
}

const PRIORIDAD = {
  alta:  { texto: 'Alta',  tono: 'destructive' as const },
  media: { texto: 'Media', tono: 'default' as const },
  baja:  { texto: 'Baja',  tono: 'outline' as const },
}

/** Las pantallas sobre las que se puede pedir algo. */
const MODULOS = [
  'Dashboard', 'EBITDA', 'Ventas', 'Mes a Mes', 'Corporativo', 'Ecommerce',
  'Canales', 'Proyectos', 'Stock', 'Marcas', 'Compras', 'Detalle por Producto',
  'Inversión', 'Gastos', 'Gastos Fijos', 'Pagos Pendientes', 'Planilla', 'Otro',
]

/** Hoy en Lima, como AAAA-MM-DD: comparar plazos con el reloj del navegador
 *  daría un día de diferencia para quien abra la página desde otro huso. */
const hoyLima = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

/**
 * El plazo en palabras. La fecha sola obliga a hacer la cuenta mentalmente, y
 * lo que la persona quiere saber es si falta mucho o si ya se pasó.
 */
function plazo(fecha: string | null, estado: Solicitud['estado']) {
  if (!fecha) return null
  const dia = String(fecha).slice(0, 10)
  const dias = Math.round(
    (new Date(dia + 'T00:00:00').getTime() - new Date(hoyLima() + 'T00:00:00').getTime()) / 86_400_000,
  )
  const cerrada = estado === 'hecha' || estado === 'descartada'
  if (cerrada) return { dia, texto: '', tono: 'text-muted-foreground' }
  if (dias < 0) return { dia, texto: `atrasada ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`, tono: 'text-destructive font-medium' }
  if (dias === 0) return { dia, texto: 'es hoy', tono: 'text-chart-3 font-medium' }
  if (dias === 1) return { dia, texto: 'mañana', tono: 'text-chart-3' }
  return { dia, texto: `en ${dias} días`, tono: 'text-muted-foreground' }
}

export function Solicitudes() {
  const { usuario } = usarSesion()
  const [filas, setFilas] = useState<Solicitud[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [respondiendo, setRespondiendo] = useState<Solicitud | null>(null)

  const esAdmin = usuario?.role === 'admin'

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const r = await api.get<Solicitud[]>('/solicitudes')
      setFilas(Array.isArray(r) ? r : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las solicitudes')
      setFilas([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  const totales = useMemo(() => {
    const por = (e: Solicitud['estado']) => filas.filter((f) => f.estado === e).length
    return {
      total: filas.length,
      pendientes: por('pendiente') + por('en_revision'),
      hechas: por('hecha'),
      vencidas: filas.filter((f) => {
        const p = plazo(f.fecha_estimada, f.estado)
        return p != null && p.texto.startsWith('atrasada')
      }).length,
      altas: filas.filter((f) => f.prioridad === 'alta' && f.estado !== 'hecha' && f.estado !== 'descartada').length,
    }
  }, [filas])

  if (error) return <ErrorCarga mensaje={error} alReintentar={cargar} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Solicitudes de mejora</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {esAdmin
              ? 'Lo que el equipo echa en falta en el sistema'
              : 'Cuenta qué te haría falta y lo revisamos'}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setAbierto(true)}>
          <Lightbulb className="size-4" /> Nueva solicitud
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta={esAdmin ? 'Solicitudes' : 'Mis solicitudes'} valor={numero(totales.total)}
          detalle="Registradas" acento="navy" cargando={cargando} />
        <Kpi etiqueta="Sin resolver" valor={numero(totales.pendientes)}
          detalle="Pendientes o en revisión" acento="azul" cargando={cargando} />
        <Kpi etiqueta="Prioridad alta" valor={numero(totales.altas)}
          detalle="Abiertas y urgentes"
          acento={totales.altas > 0 ? 'rojo' : 'verde'} cargando={cargando} />
        {totales.vencidas > 0 ? (
          <Kpi etiqueta="Fuera de plazo" valor={numero(totales.vencidas)}
            detalle="Pasó la fecha estimada" acento="rojo" cargando={cargando} />
        ) : (
          <Kpi etiqueta="Ya hechas" valor={numero(totales.hechas)}
            detalle="Aplicadas al sistema" acento="verde" cargando={cargando} />
        )}
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>{esAdmin ? 'Todas las solicitudes' : 'Tus solicitudes'}</CardTitle>
          <CardDescription>
            {esAdmin
              ? 'De todo el equipo, de la más reciente a la más antigua'
              : 'Solo tú y el administrador las ven'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando…" />
            : !filas.length ? (
              <SinDatos mensaje="Todavía no hay solicitudes. Usa el botón de arriba para enviar la primera." />
            )
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      {esAdmin && <TableHead>De</TableHead>}
                      <TableHead>Solicitud</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Para cuándo</TableHead>
                      <TableHead>Respuesta</TableHead>
                      {esAdmin && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {fechaHoraLima(f.created_at) ?? '—'}
                        </TableCell>
                        {esAdmin && <TableCell className="text-xs">{f.usuario}</TableCell>}
                        <TableCell>
                          <div className="font-medium">{f.titulo}</div>
                          {f.detalle && (
                            <div className="mt-0.5 max-w-[28rem] text-xs whitespace-pre-line text-muted-foreground">
                              {f.detalle}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.modulo || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={PRIORIDAD[f.prioridad].tono}>{PRIORIDAD[f.prioridad].texto}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ESTADO[f.estado].tono}>{ESTADO[f.estado].texto}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {(() => {
                            const pl = plazo(f.fecha_estimada, f.estado)
                            if (!pl) return <span className="text-muted-foreground">sin fecha</span>
                            return (
                              <span className={pl.tono}>
                                {pl.dia}
                                {pl.texto && <span className="ml-1 opacity-80">· {pl.texto}</span>}
                              </span>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="max-w-[18rem] text-xs">
                          {f.respuesta || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        {esAdmin && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setRespondiendo(f)}>
                              Responder
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>

      <FormularioSolicitud
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        onEnviado={() => { setAbierto(false); void cargar() }}
      />

      <PanelRespuesta
        solicitud={respondiendo}
        onCerrar={() => setRespondiendo(null)}
        onGuardado={() => { setRespondiendo(null); void cargar() }}
      />
    </div>
  )
}

function FormularioSolicitud({
  abierto,
  onCerrar,
  onEnviado,
}: {
  abierto: boolean
  onCerrar: () => void
  onEnviado: () => void
}) {
  const [form, setForm] = useState({ titulo: '', detalle: '', modulo: '', prioridad: 'media' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (abierto) { setForm({ titulo: '', detalle: '', modulo: '', prioridad: 'media' }); setError(null) }
  }, [abierto])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.titulo.trim()) return setError('Escribe en una línea qué necesitas')
    setEnviando(true)
    try {
      await api.post('/solicitudes', form)
      onEnviado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar')
    } finally {
      setEnviando(false)
    }
  }

  const campo = 'h-9 min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0'

  return (
    <Sheet open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nueva solicitud de mejora</SheetTitle>
          <SheetDescription>
            Cuanto más concreto, más fácil es resolverlo. Si puedes, di en qué
            pantalla y qué esperabas que pasara.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={enviar} className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="s-titulo">¿Qué necesitas?</Label>
            <Input id="s-titulo" value={form.titulo} required
              placeholder="En una línea"
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-detalle">Cuéntalo con detalle</Label>
            <textarea id="s-detalle" rows={5} value={form.detalle}
              onChange={(e) => setForm((f) => ({ ...f, detalle: e.target.value }))}
              placeholder="Qué haces hoy, qué te gustaría que hiciera el sistema y por qué te ayudaría"
              className={campo.replace('h-9 ', '') + ' py-2'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="s-modulo">Pantalla</Label>
              <select id="s-modulo" value={form.modulo} className={campo}
                onChange={(e) => setForm((f) => ({ ...f, modulo: e.target.value }))}>
                <option value="">Sin especificar</option>
                {MODULOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-prioridad">Prioridad</Label>
              <select id="s-prioridad" value={form.prioridad} className={campo}
                onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value }))}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={enviando} className="gap-2">
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {enviando ? 'Enviando…' : 'Enviar solicitud'}
            </Button>
            <Button type="button" variant="outline" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Panel del administrador: responder, mover el estado y comprometer una fecha.
 * Es lo único que un visor no puede hacer sobre su propia solicitud.
 */
function PanelRespuesta({
  solicitud,
  onCerrar,
  onGuardado,
}: {
  solicitud: Solicitud | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [form, setForm] = useState({ estado: 'pendiente', respuesta: '', fecha_estimada: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!solicitud) return
    setError(null)
    setForm({
      estado: solicitud.estado,
      respuesta: solicitud.respuesta ?? '',
      // La fecha puede llegar con hora; el input date solo admite AAAA-MM-DD.
      fecha_estimada: String(solicitud.fecha_estimada ?? '').slice(0, 10),
    })
  }, [solicitud])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setGuardando(true)
    try {
      await api.put(`/solicitudes/${solicitud!.id}`, form)
      onGuardado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const campo = 'min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-9'

  return (
    <Sheet open={solicitud != null} onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Responder solicitud</SheetTitle>
          <SheetDescription>
            {solicitud ? `${solicitud.titulo} — pedida por ${solicitud.usuario}` : ''}
          </SheetDescription>
        </SheetHeader>

        {solicitud?.detalle && (
          <p className="mx-4 rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-line text-muted-foreground">
            {solicitud.detalle}
          </p>
        )}

        <form onSubmit={guardar} className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="r-estado">Estado</Label>
            <select id="r-estado" value={form.estado} className={campo}
              onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>
              <option value="pendiente">Pendiente</option>
              <option value="en_revision">En revisión</option>
              <option value="aceptada">Aceptada</option>
              <option value="hecha">Hecha</option>
              <option value="descartada">Descartada</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-fecha">¿Para cuándo estará?</Label>
            <Input id="r-fecha" type="date" value={form.fecha_estimada}
              onChange={(e) => setForm((f) => ({ ...f, fecha_estimada: e.target.value }))} />
            <p className="text-xs text-muted-foreground">
              Quien la pidió ve esta fecha. Déjala en blanco si todavía no hay
              un compromiso: mejor sin fecha que con una que no se va a cumplir.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-respuesta">Respuesta</Label>
            <textarea id="r-respuesta" rows={4} value={form.respuesta}
              onChange={(e) => setForm((f) => ({ ...f, respuesta: e.target.value }))}
              placeholder="Qué se va a hacer, o por qué no"
              className={campo + ' py-2'} />
          </div>

          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={guardando} className="gap-2">
              {guardando && <Loader2 className="size-4 animate-spin" />}
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
