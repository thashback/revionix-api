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

export function Solicitudes() {
  const { usuario } = usarSesion()
  const [filas, setFilas] = useState<Solicitud[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState(false)

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
        <Kpi etiqueta="Ya hechas" valor={numero(totales.hechas)}
          detalle="Aplicadas al sistema" acento="verde" cargando={cargando} />
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
                      <TableHead>Respuesta</TableHead>
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
                        <TableCell className="max-w-[18rem] text-xs">
                          {f.respuesta || <span className="text-muted-foreground">—</span>}
                        </TableCell>
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
