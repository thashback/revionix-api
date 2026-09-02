import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { soles } from '@/lib/formato'
import type { Transaccion } from '@/lib/tipos'

/** Las plataformas que ya usa el sistema, más una casilla libre. */
const PLATAFORMAS = ['MercadoLibre', 'Saga Falabella', 'Otra']

const HOY = () => new Date().toISOString().slice(0, 10)

interface Form {
  fecha: string
  plataforma: string
  plataformaOtra: string
  modelo: string
  marca: string
  qty: string
  precio_unit: string
  costo_unit: string
  tipo_doc: string
  serie: string
  correlativo: string
  medio_pago: string
}

const VACIO = (): Form => ({
  fecha: HOY(), plataforma: 'MercadoLibre', plataformaOtra: '', modelo: '', marca: '',
  qty: '1', precio_unit: '', costo_unit: '', tipo_doc: 'BOLETA', serie: '',
  correlativo: '', medio_pago: '',
})

const n = (v: string) => Number(v) || 0

export function FormularioEcommerce({
  abierto,
  onCerrar,
  onGuardar,
  /** Firmas ya existentes, para avisar de un comprobante repetido. */
  firmasExistentes,
}: {
  abierto: boolean
  onCerrar: () => void
  onGuardar: (v: Transaccion) => Promise<void>
  firmasExistentes: Set<string>
}) {
  const [form, setForm] = useState<Form>(VACIO())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setForm(VACIO())
    setError(null)
  }, [abierto])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const cantidad = Math.max(1, n(form.qty))
  const total = n(form.precio_unit) * cantidad
  const costo = n(form.costo_unit) * cantidad
  const margen = total - costo

  // Mismo comprobante, misma fecha y mismo importe: casi siempre es la misma
  // venta cargada dos veces. Ya pasó con un B001-2 que quedó por triplicado.
  const firma = `${form.serie}-${form.correlativo}-${form.fecha}-${total}`
  const repetida = Boolean(form.serie && form.correlativo && firmasExistentes.has(firma))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.modelo.trim()) return setError('El producto es obligatorio')
    if (!(total > 0)) return setError('El precio unitario debe ser mayor que cero')
    if (costo > total) {
      return setError('El costo es mayor que la venta. Revísalo antes de guardar.')
    }

    const plataforma =
      form.plataforma === 'Otra' ? form.plataformaOtra.trim() : form.plataforma
    if (!plataforma) return setError('Indica la plataforma')

    setGuardando(true)
    try {
      await onGuardar({
        canal: 'Ecommerce',
        plataforma,
        fecha: form.fecha,
        mes: form.fecha.slice(0, 7),
        tipo_doc: form.tipo_doc,
        serie: form.serie,
        correlativo: form.correlativo,
        modelo: form.modelo.trim(),
        marca: form.marca.trim() || 'Otros',
        qty: cantidad,
        venta: total,
        costo,
        medio_pago: form.medio_pago,
      })
      onCerrar()
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
          <SheetTitle>Nueva venta de ecommerce</SheetTitle>
          <SheetDescription>
            Se guarda como venta con canal Ecommerce, en el mismo sitio que las demás:
            suma en Ventas, Canales, Mes a Mes y EBITDA, no solo en esta pantalla.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={enviar} className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ec-fecha">Fecha</Label>
              <Input id="ec-fecha" type="date" value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-plat">Plataforma</Label>
              <select id="ec-plat" value={form.plataforma}
                onChange={(e) => set('plataforma', e.target.value)}
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none">
                {PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {form.plataforma === 'Otra' && (
            <div className="space-y-2">
              <Label htmlFor="ec-plat-otra">¿Cuál?</Label>
              <Input id="ec-plat-otra" value={form.plataformaOtra}
                onChange={(e) => set('plataformaOtra', e.target.value)}
                placeholder="Nombre de la plataforma" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ec-modelo">Producto</Label>
            <Input id="ec-modelo" value={form.modelo}
              onChange={(e) => set('modelo', e.target.value)}
              placeholder="Cámara EZVIZ H6C 3MP" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ec-marca">Marca</Label>
              <Input id="ec-marca" value={form.marca}
                onChange={(e) => set('marca', e.target.value)} placeholder="EZVIZ" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-qty">Cantidad</Label>
              <Input id="ec-qty" type="number" min="1" step="1" value={form.qty}
                onChange={(e) => set('qty', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ec-precio">Precio unitario S/.</Label>
              <Input id="ec-precio" type="number" min="0" step="0.01" value={form.precio_unit}
                onChange={(e) => set('precio_unit', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-costo">Costo unitario S/.</Label>
              <Input id="ec-costo" type="number" min="0" step="0.01" value={form.costo_unit}
                onChange={(e) => set('costo_unit', e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          {total > 0 && (
            <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">
              Venta <strong>{soles(total, 2)}</strong>
              {costo > 0 && <> · costo {soles(costo, 2)} · margen <strong>{soles(margen, 2)}</strong></>}
              {costo === 0 && <span className="text-muted-foreground"> · sin costo, el margen saldrá completo</span>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ec-doc">Comprobante</Label>
              <Input id="ec-doc" value={form.tipo_doc}
                onChange={(e) => set('tipo_doc', e.target.value)} placeholder="BOLETA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-serie">Serie</Label>
              <Input id="ec-serie" value={form.serie}
                onChange={(e) => set('serie', e.target.value)} placeholder="B001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-corr">Número</Label>
              <Input id="ec-corr" value={form.correlativo}
                onChange={(e) => set('correlativo', e.target.value)} placeholder="123" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ec-pago">Medio de pago</Label>
            <Input id="ec-pago" value={form.medio_pago}
              onChange={(e) => set('medio_pago', e.target.value)}
              placeholder="Transferencia, Culqi, contra entrega…" />
          </div>

          {repetida && (
            <div className="rounded-md border border-chart-3/50 bg-chart-3/10 px-3 py-2 text-sm">
              Ya hay una venta con el comprobante <strong>{form.serie}-{form.correlativo}</strong>,
              la misma fecha y el mismo importe. Si no es una venta distinta, no la guardes:
              quedaría contada dos veces en todo el sistema.
            </div>
          )}

          {error && (
            <div className="text-destructive rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={guardando}>
              {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
              Guardar venta
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
