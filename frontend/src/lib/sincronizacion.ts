import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { api } from '@/lib/api'

/**
 * VIGILANTE DE SINCRONIZACIÓN
 *
 * BILLIA empuja el inventario y los comprobantes cada 2 horas. Antes esto se
 * notaba mal: el sello de la cabecera se refrescaba solo, pero las cifras de
 * la pantalla se pedían una única vez al montar. Una pestaña abierta toda la
 * tarde acababa diciendo "sincronizado hace 3 minutos" encima de unos números
 * de hacía tres horas.
 *
 * Aquí vive un solo sondeo para toda la aplicación —no uno por componente— y
 * quien pinta datos se engancha con `usarRecargaAlSincronizar`: cuando el
 * sello de BILLIA avanza, vuelve a pedir lo suyo.
 */

export interface Sincronizacion {
  billia?: {
    inventario?: { actualizado?: string; unidades?: number; lineas?: number | null }
    ventas?: { actualizado?: string; comprobantes?: number | null }
  }
  revionix?: { transacciones?: number | null; actualizado?: string | null; claves?: number | null }
}

export interface EstadoVigilante {
  datos: Sincronizacion | null
  fallo: boolean
  /** Sello de BILLIA: cambia cuando entra un empujón nuevo. */
  sello: string | null
  /** Se mueve cada minuto para que "hace 12 min" no se quede congelado. */
  tic: number
}

/** Cada cuánto se pregunta al servidor. El dato cambia cada 2 h; con esto
 *  la hora nunca lleva más de 5 minutos de retraso y el coste es mínimo. */
const CADA_SONDEO = 5 * 60 * 1000

/** Cada cuánto se recalcula el "hace X". No pide nada al servidor. */
const CADA_TIC = 60 * 1000

let estado: EstadoVigilante = { datos: null, fallo: false, sello: null, tic: 0 }
const suscriptores = new Set<() => void>()
let temporizadorSondeo: ReturnType<typeof setInterval> | null = null
let temporizadorTic: ReturnType<typeof setInterval> | null = null

function publicar(cambios: Partial<EstadoVigilante>) {
  // Se conserva el mismo objeto si nada cambió: useSyncExternalStore compara
  // por identidad y devolver uno nuevo cada vez provocaría un bucle.
  const siguiente = { ...estado, ...cambios }
  if (
    siguiente.datos === estado.datos &&
    siguiente.fallo === estado.fallo &&
    siguiente.sello === estado.sello &&
    siguiente.tic === estado.tic
  ) return
  estado = siguiente
  for (const s of suscriptores) s()
}

async function consultar() {
  try {
    const datos = await api.get<Sincronizacion>('/sincronizacion')
    publicar({
      datos,
      fallo: false,
      sello: datos?.billia?.inventario?.actualizado ?? null,
    })
  } catch {
    // Un fallo puntual no borra el último dato bueno: mejor una hora de hace
    // un rato que un hueco donde había una cifra.
    publicar({ fallo: true })
  }
}

function arrancar() {
  if (temporizadorSondeo) return
  void consultar()
  temporizadorSondeo = setInterval(() => { void consultar() }, CADA_SONDEO)
  temporizadorTic = setInterval(() => publicar({ tic: Date.now() }), CADA_TIC)

  // Al volver a la pestaña se pregunta enseguida: si estuvo en segundo plano
  // media tarde, el navegador pudo frenar los temporizadores.
  document.addEventListener('visibilitychange', alVolver)
}

function parar() {
  if (suscriptores.size) return
  if (temporizadorSondeo) clearInterval(temporizadorSondeo)
  if (temporizadorTic) clearInterval(temporizadorTic)
  temporizadorSondeo = temporizadorTic = null
  document.removeEventListener('visibilitychange', alVolver)
}

function alVolver() {
  if (document.visibilityState === 'visible') void consultar()
}

function suscribir(alCambiar: () => void) {
  suscriptores.add(alCambiar)
  arrancar()
  return () => {
    suscriptores.delete(alCambiar)
    parar()
  }
}

const leer = () => estado

/** Estado de la sincronización, compartido por toda la aplicación. */
export function usarSincronizacion(): EstadoVigilante {
  return useSyncExternalStore(suscribir, leer, leer)
}

/**
 * Vuelve a llamar a `recargar` cuando BILLIA trae datos nuevos.
 *
 * La primera lectura no dispara nada: en ese momento la página acaba de
 * cargar y ya tiene lo último. Solo cuenta que el sello cambie después.
 */
export function usarRecargaAlSincronizar(recargar: () => void) {
  const { sello } = usarSincronizacion()
  const visto = useRef<string | null | undefined>(undefined)
  // La función de recarga cambia de identidad en cada render de quien la pasa;
  // guardarla en una referencia evita reaccionar a eso en vez de al sello.
  const fn = useRef(recargar)
  fn.current = recargar

  const alCambiar = useCallback(() => {
    if (visto.current === undefined) { visto.current = sello; return }
    if (sello && sello !== visto.current) {
      visto.current = sello
      fn.current()
    }
  }, [sello])

  useEffect(alCambiar, [alCambiar])
}
