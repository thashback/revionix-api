import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usarSesion } from '@/lib/sesion'
import { BotonTema } from '@/componentes/BotonTema'
import { Logo } from '@/componentes/Logo'

export function Login() {
  const { entrar } = usarSesion()
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function alEnviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await entrar(usuario.trim().toLowerCase(), clave)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setEnviando(false)
    }
  }

  return (
    // El fondo va con el color de fondo del tema, no con el primario: el
    // primario está pensado para botones y acentos, y usarlo en un área
    // grande hace que la pantalla no se parezca al tema elegido.
    <div className="relative flex min-h-dvh items-center justify-center bg-background p-4">
      {/* El interruptor también aquí: si alguien prefiere el modo oscuro,
          debería poder ponerlo antes de escribir su contraseña. */}
      <div className="absolute right-3 top-3">
        <BotonTema />
      </div>
      <Card className="w-full max-w-sm">
        <CardContent className="pt-2">
          {/* El logo y el eslogan van en blanco sobre el navy de la marca.
              Antes era el PNG oscuro sobre la tarjeta, y en modo oscuro se veía
              el recuadro blanco del archivo recortado contra el fondo. */}
          <div className="-mx-6 -mt-2 mb-6 rounded-t-xl bg-[oklch(0.28_0.07_260)] px-6 py-7 text-center text-white">
            <Logo className="mx-auto w-full max-w-[230px]" />
          </div>

          <form onSubmit={alEnviar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input
                id="usuario"
                autoComplete="username"
                placeholder="nombre de usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clave">Contraseña</Label>
              <Input
                id="clave"
                type="password"
                autoComplete="current-password"
                placeholder="contraseña"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
