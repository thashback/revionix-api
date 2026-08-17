import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
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
import { numero } from '@/lib/formato'

interface UsuarioFila {
  username: string
  nombre: string
  role: string
  canal?: string | null
  activo: number | boolean
}

/**
 * Los roles que la aplicación conoce. En producción hay además cuentas con
 * roles que no están aquí ('operaciones', 'pipeline'): si no se contemplan,
 * abrir a editar a uno de esos usuarios y guardar le cambiaría el rol sin
 * que nadie lo pidiera, porque el desplegable caería en el primero de la
 * lista. Por eso el rol que ya tiene el usuario siempre se añade.
 */
const ROLES = [
  { valor: 'admin', etiqueta: 'Administrador', ayuda: 'Todo, incluida la gestión de usuarios' },
  { valor: 'tienda', etiqueta: 'Tienda', ayuda: 'Registra ventas y gastos de su canal' },
  { valor: 'visor', etiqueta: 'Visor', ayuda: 'Solo lectura: no puede modificar nada' },
]

function rolesDisponibles(actual?: string) {
  if (!actual || ROLES.some((r) => r.valor === actual)) return ROLES
  return [...ROLES, { valor: actual, etiqueta: actual, ayuda: 'Rol propio de esta instalación' }]
}

const TONO_ROL: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default', tienda: 'secondary', visor: 'outline',
}

export function Usuarios() {
  const { usuario: yo } = usarSesion()
  const [filas, setFilas] = useState<UsuarioFila[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<UsuarioFila | null>(null)
  const [creando, setCreando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const r = await api.get<UsuarioFila[]>('/auth/users')
      setFilas(Array.isArray(r) ? r : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios')
      setFilas([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  const totales = useMemo(() => {
    const activos = filas.filter((u) => u.activo === 1 || u.activo === true).length
    const porRol = (r: string) => filas.filter((u) => u.role === r).length
    return { activos, admins: porRol('admin'), visores: porRol('visor'), total: filas.length }
  }, [filas])

  const esAdmin = yo?.role === 'admin'

  if (!esAdmin) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Usuarios</h1>
        <SinDatos mensaje="Esta pantalla es solo para administradores." />
      </div>
    )
  }
  if (error) return <ErrorCarga mensaje={error} alReintentar={cargar} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quién entra al sistema y qué puede hacer
          </p>
        </div>
        <Button className="gap-2" onClick={() => { setEditando(null); setCreando(true) }}>
          <UserPlus className="size-4" /> Nuevo usuario
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Usuarios" valor={numero(totales.total)} detalle="Dados de alta"
          acento="navy" cargando={cargando} />
        <Kpi etiqueta="Activos" valor={numero(totales.activos)}
          detalle={`${numero(totales.total - totales.activos)} desactivados`}
          acento="verde" cargando={cargando} />
        <Kpi etiqueta="Administradores" valor={numero(totales.admins)}
          detalle="Pueden gestionar usuarios"
          acento={totales.admins > 3 ? 'naranja' : 'azul'} cargando={cargando} />
        <Kpi etiqueta="Solo lectura" valor={numero(totales.visores)}
          detalle="No pueden modificar datos" acento="morado" cargando={cargando} />
      </div>

      <Card className="t-card-hover">
        <CardHeader>
          <CardTitle>Cuentas</CardTitle>
          <CardDescription>
            Las contraseñas se guardan cifradas con scrypt; nunca se muestran ni
            se pueden recuperar, solo reemplazar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? <SinDatos mensaje="Cargando usuarios…" />
            : !filas.length ? <SinDatos mensaje="Sin usuarios dados de alta." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((u) => {
                      const activo = u.activo === 1 || u.activo === true
                      const soyYo = u.username === yo?.username
                      return (
                        <TableRow key={u.username}>
                          <TableCell className="font-medium">
                            {u.username}
                            {soyYo && (
                              <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                            )}
                          </TableCell>
                          <TableCell>{u.nombre || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={TONO_ROL[u.role] ?? 'outline'}>{u.role}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{u.canal || '—'}</TableCell>
                          <TableCell>
                            {activo
                              ? <Badge variant="secondary">Activo</Badge>
                              : <Badge variant="destructive">Desactivado</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm"
                              onClick={() => { setCreando(false); setEditando(u) }}>
                              Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>

      <FormularioUsuario
        abierto={creando || editando != null}
        usuario={editando}
        esUltimoAdmin={totales.admins <= 1}
        soyYo={editando?.username === yo?.username}
        onCerrar={() => { setCreando(false); setEditando(null) }}
        onGuardado={() => { setCreando(false); setEditando(null); void cargar() }}
      />
    </div>
  )
}

function FormularioUsuario({
  abierto,
  usuario,
  esUltimoAdmin,
  soyYo,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean
  usuario: UsuarioFila | null
  esUltimoAdmin: boolean
  soyYo?: boolean
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [form, setForm] = useState({
    username: '', nombre: '', role: 'tienda', canal: '', activo: true, password: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setForm({
      username: usuario?.username ?? '',
      nombre: usuario?.nombre ?? '',
      role: usuario?.role ?? 'tienda',
      canal: usuario?.canal ?? '',
      activo: usuario ? usuario.activo === 1 || usuario.activo === true : true,
      password: '',
    })
  }, [abierto, usuario])

  const editando = usuario != null

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.username.trim()) return setError('El usuario es obligatorio')
    if (!editando && form.password.length < 8) {
      return setError('La contraseña debe tener al menos 8 caracteres')
    }
    if (form.password && form.password.length < 8) {
      return setError('La contraseña nueva debe tener al menos 8 caracteres')
    }
    // Quitarse a uno mismo el último acceso de administrador deja el sistema
    // sin nadie que pueda gestionar usuarios.
    if (editando && soyYo && esUltimoAdmin && (form.role !== 'admin' || !form.activo)) {
      return setError('Eres el único administrador: no puedes quitarte el rol ni desactivarte.')
    }

    setGuardando(true)
    try {
      await api.post('/auth/users', {
        username: form.username.trim().toLowerCase(),
        nombre: form.nombre.trim(),
        role: form.role,
        canal: form.canal.trim() || null,
        activo: form.activo,
        // Solo se manda cuando se escribió algo: al editar, vacío significa
        // "deja la que tenía".
        ...(form.password ? { password: form.password } : {}),
      })
      onGuardado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editando ? `Editar ${usuario?.username}` : 'Nuevo usuario'}</SheetTitle>
          <SheetDescription>
            {editando
              ? 'Deja la contraseña en blanco para conservar la actual.'
              : 'La contraseña la escribe quien va a usar la cuenta.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={enviar} className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="u-username">Usuario</Label>
            <Input id="u-username" value={form.username} autoComplete="off"
              disabled={editando}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="sin espacios" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="u-nombre">Nombre completo</Label>
            <Input id="u-nombre" value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="u-role">Rol</Label>
            <select id="u-role" value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="h-9 min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0">
              {rolesDisponibles(usuario?.role).map((r) => (
                <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {rolesDisponibles(usuario?.role).find((r) => r.valor === form.role)?.ayuda}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="u-canal">Canal</Label>
            <Input id="u-canal" value={form.canal}
              onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))}
              placeholder="Sede a la que pertenece (opcional)" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="u-pass">
              {editando ? 'Contraseña nueva (opcional)' : 'Contraseña'}
            </Label>
            <Input id="u-pass" type="password" value={form.password} autoComplete="new-password"
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={editando ? 'dejar en blanco para no cambiarla' : 'mínimo 8 caracteres'} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.activo}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              className="size-4" />
            Cuenta activa
          </label>

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
