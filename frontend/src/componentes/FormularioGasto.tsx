import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { subirArchivo } from '@/lib/almacen'
import type { Gasto } from '@/lib/tipos'

/** Categorías que ya usa la aplicación anterior, para no inventar nuevas. */
const CATEGORIAS = [
  'Movilidad', 'Servicios', 'Alquiler', 'Planilla', 'Mantenimiento',
  'Publicidad', 'Suministros', 'Impuestos', 'Otros',
]

const HOY = () => new Date().toISOString().slice(0, 10)

export function FormularioGasto({
  abierto,
  gasto,
  onCerrar,
  onGuardar,
}: {
  abierto: boolean
  /** Cuando viene, es edición; cuando no, alta. */
  gasto: Gasto | null
  onCerrar: () => void
  onGuardar: (g: Gasto) => Promise<void>
}) {
  const [form, setForm] = useState<Gasto>({
    fecha: HOY(), mes: HOY().slice(0, 7), cat: 'Movilidad', canal: '', desc: '',
    resp: '', monto: 0, tipo_doc: '', pdf: null,
  })
  const [archivo, setArchivo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setArchivo(null)
    setForm(
      gasto ?? {
        fecha: HOY(), mes: HOY().slice(0, 7), cat: 'Movilidad', canal: '', desc: '',
        resp: '', monto: 0, tipo_doc: '', pdf: null,
      },
    )
  }, [abierto, gasto])

  const set = <K extends keyof Gasto>(k: K, v: Gasto[K]) =>
    setForm((f) => ({
      ...f,
      [k]: v,
      // El mes se deriva de la fecha: tenerlos desincronizados rompe todos
      // los agrupados por mes.
      ...(k === 'fecha' ? { mes: String(v).slice(0, 7) } : {}),
    }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.desc.trim()) return setError('La descripción es obligatoria')
    if (!(Number(form.monto) > 0)) return setError('El monto debe ser mayor que cero')

    setGuardando(true)
    try {
      let pdf = form.pdf ?? null
      if (archivo) pdf = await subirArchivo(archivo)
      await onGuardar({ ...form, monto: Number(form.monto), pdf })
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
          <SheetTitle>{gasto ? 'Editar gasto' : 'Nuevo gasto'}</SheetTitle>
          <SheetDescription>
            Se guarda en el mismo sitio que la aplicación anterior, así que el
            cambio se ve en las dos.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={enviar} className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto">Monto S/.</Label>
              <Input id="monto" type="number" step="0.01" min="0" value={form.monto || ''}
                onChange={(e) => set('monto', Number(e.target.value))} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat">Categoría</Label>
            <select id="cat" value={form.cat} onChange={(e) => set('cat', e.target.value)}
              className="h-9 min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0">
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Descripción</Label>
            <Input id="desc" value={form.desc} onChange={(e) => set('desc', e.target.value)}
              placeholder="Qué se pagó" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="canal">Canal</Label>
              <Input id="canal" value={form.canal ?? ''} onChange={(e) => set('canal', e.target.value)}
                placeholder="Sede o general" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resp">Responsable</Label>
              <Input id="resp" value={form.resp ?? ''} onChange={(e) => set('resp', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf">Comprobante (PDF o imagen)</Label>
            <Input id="pdf" type="file" accept=".pdf,image/*"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
            {form.pdf && !archivo && (
              <p className="text-xs text-muted-foreground">
                Ya tiene uno:{' '}
                <a href={form.pdf} target="_blank" rel="noopener noreferrer" className="underline">
                  ver comprobante
                </a>
                . Sube otro para reemplazarlo.
              </p>
            )}
            {archivo && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Upload className="size-3" /> {archivo.name}
              </p>
            )}
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
