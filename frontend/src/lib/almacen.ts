import { api } from '@/lib/api'

/**
 * ESCRITURA EN EL ALMACENAMIENTO COMPARTIDO
 *
 * La aplicación anterior guarda sus cambios en app_storage vía
 * PUT /api/storage, con bloqueo optimista: cada clave lleva una revisión y
 * el servidor rechaza la escritura si el cliente vio una versión vieja.
 *
 * /v2 escribe por el mismo camino a propósito. Si escribiera en las tablas
 * MySQL (/api/gastos y compañía) los cambios serían invisibles para la
 * aplicación anterior, y las dos mostrarían cifras distintas mientras
 * convivan.
 */

interface RespuestaGuardado {
  guardadas?: number
  conflictos?: string[]
  revs?: Record<string, number>
}

/** Revisiones vistas por esta pestaña. Se refrescan en cada guardado. */
let revs: Record<string, number> = {}

export async function cargarRevisiones(): Promise<void> {
  try {
    revs = await api.get<Record<string, number>>('/storage/rev')
  } catch {
    // Sin revisiones el servidor tratará la escritura como primera versión.
    revs = {}
  }
}

export class ConflictoAlmacen extends Error {
  claves: string[]
  constructor(claves: string[]) {
    super(
      'Otra sesión guardó cambios más recientes. Se recargaron los datos del ' +
        'servidor para no sobrescribirlos.',
    )
    this.claves = claves
  }
}

/**
 * Guarda una o varias claves. Lanza ConflictoAlmacen si el servidor rechazó
 * la escritura por desactualización — quien llama debe recargar y reintentar,
 * nunca forzar: forzar pisaría el trabajo de otra persona.
 */
export async function guardarAlmacen(cambios: Record<string, unknown>): Promise<void> {
  const cuerpo: Record<string, unknown> = { __rev: {} }
  const rev = cuerpo.__rev as Record<string, number>
  for (const [clave, valor] of Object.entries(cambios)) {
    cuerpo[clave] = typeof valor === 'string' ? valor : JSON.stringify(valor)
    rev[clave] = revs[clave] ?? 0
  }

  const res = await api.put<RespuestaGuardado>('/storage', cuerpo)

  if (res?.revs) Object.assign(revs, res.revs)
  if (res?.conflictos?.length) throw new ConflictoAlmacen(res.conflictos)
}

/** Sube un archivo y devuelve la ruta pública con la que se enlaza. */
export async function subirArchivo(archivo: File): Promise<string> {
  const fd = new FormData()
  fd.append('archivo', archivo)
  const res = await api.post<{ ruta?: string; error?: string }>('/archivos', fd)
  if (!res?.ruta) throw new Error(res?.error || 'No se pudo subir el archivo')
  return res.ruta
}
