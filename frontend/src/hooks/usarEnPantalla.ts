import { useEffect, useRef, useState } from 'react'

/**
 * Avisa cuando el elemento ya está en pantalla Y tiene tamaño.
 *
 * Los gráficos lo necesitan por dos motivos:
 *
 * 1. recharts calcula la animación contra el tamaño del contenedor. Si monta
 *    dentro de una caja de 0px —una pestaña oculta, una tarjeta que todavía
 *    está en su esqueleto— la animación arranca y termina antes de que haya
 *    layout, y las barras se quedan en su altura inicial: cero. Esperar a que
 *    haya medida evita ese caso.
 * 2. De paso, el gráfico se dibuja cuando el usuario llega a él, así la
 *    animación de entrada se ve en lugar de ocurrir fuera de la vista.
 *
 * Una vez visible ya no se vuelve atrás: no tiene sentido re-animar cada vez
 * que se pasa por encima con el scroll.
 */
export function usarEnPantalla<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo || visible) return

    // Sin IntersectionObserver (navegador muy viejo o entorno de pruebas) se
    // dibuja directamente: mejor un gráfico sin animación que ninguno.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const caja = e.boundingClientRect
          if (e.isIntersecting && caja.width > 0 && caja.height > 0) {
            setVisible(true)
            observador.disconnect()
          }
        }
      },
      // Un poco antes de entrar: así llega ya dibujándose, no de golpe.
      { rootMargin: '80px' },
    )
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [visible])

  return { ref, visible }
}
