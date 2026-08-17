import { useEffect, useRef } from 'react'

/**
 * Number pop-in de transitions.dev: cada carácter entra por separado, con
 * desenfoque, y los dos últimos van escalonados para que los decimales no
 * aterricen todos a la vez.
 *
 * Se manipula el DOM a mano —y no con estado de React— porque la animación
 * necesita: quitar la clase, reemplazar los dígitos, forzar un reflow y
 * volver a poner la clase. React no garantiza ese orden entre renders.
 */
export function NumeroAnimado({ valor, className }: { valor: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const anterior = useRef<string | null>(null)

  useEffect(() => {
    const grupo = ref.current
    if (!grupo) return
    // Sin cambio real no se reanima: si no, cualquier render repintaría los
    // números y la pantalla parecería inquieta.
    if (anterior.current === valor) return
    const esPrimera = anterior.current === null
    anterior.current = valor

    grupo.classList.remove('is-animating')
    grupo.replaceChildren()
    const chars = [...valor]
    chars.forEach((ch, i) => {
      const span = document.createElement('span')
      span.className = 't-digit'
      // Los espacios necesitan ancho propio: dentro de un inline-flex se
      // colapsarían y el número saldría pegado.
      span.textContent = ch === ' ' ? ' ' : ch
      if (i === chars.length - 2) span.dataset.stagger = '1'
      else if (i === chars.length - 1) span.dataset.stagger = '2'
      grupo.appendChild(span)
    })
    void grupo.offsetHeight // fuerza el reflow
    // En la primera aparición ya anima el skeleton reveal; encadenar las dos
    // se ve nervioso, así que aquí solo se anima cuando el valor cambia.
    if (!esPrimera) grupo.classList.add('is-animating')
  }, [valor])

  return (
    <span
      ref={ref}
      className={`t-digit-group ${className ?? ''}`}
      // El valor completo para lectores de pantalla: los dígitos sueltos se
      // leerían de uno en uno.
      aria-label={valor}
      role="text"
    />
  )
}
