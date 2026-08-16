/**
 * NORMALIZACIÓN DE MARCAS
 *
 * BILLIA manda el nombre de marca tal como lo escribió quien cargó el producto,
 * así que llegan variantes de la misma marca: "Huawei" y "HUAWEI" entraban como
 * dos marcas distintas y partían los reportes por marca en dos filas
 * (S/. 2.292.462 por un lado y S/. 6.710 por el otro).
 *
 * Se normaliza al ENTRAR el dato, no al pintarlo: si se arreglara solo en la
 * pantalla, la siguiente sincronización de BILLIA (cada 2 horas) volvería a
 * meter el dato sucio. Aquí queda limpio en el snapshot que todo lo demás lee.
 *
 * Criterio conservador a propósito: solo se unifican variantes de mayúsculas y
 * espacios, más una lista corta de alias explícitos. Nunca se juntan marcas
 * que se parezcan pero sean distintas (HP y HPE, por ejemplo).
 */

/**
 * Alias explícitos → nombre canónico.
 * Solo para casos que NO son diferencia de mayúsculas o espacios.
 * La clave se compara ya normalizada (mayúsculas, sin espacios repetidos).
 */
const ALIAS = {
  'WD': 'WD / HDD',
  'WESTERN DIGITAL': 'WD / HDD',
  'TPLINK': 'TP-LINK',
  'TP LINK': 'TP-LINK',
  'HIK VISION': 'HIKVISION',
};

/** Lo que se usa cuando la marca viene vacía. */
const SIN_MARCA = 'SIN MARCA';

/**
 * Clave de comparación: dos marcas con la misma clave son la misma marca.
 * Mayúsculas, sin acentos, sin espacios repetidos.
 */
function claveMarca(marca) {
  return String(marca == null ? '' : marca)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Devuelve el nombre canónico de una marca.
 * Vacío o solo espacios → "SIN MARCA", que es una categoría real del inventario.
 */
function normalizarMarca(marca) {
  const clave = claveMarca(marca);
  if (!clave) return SIN_MARCA;
  return ALIAS[clave] || clave;
}

/**
 * Normaliza la marca de cada línea del inventario.
 * Devuelve las líneas ya limpias y un resumen de lo que se unificó, para
 * poder dejarlo en el log y notar si BILLIA empieza a mandar basura nueva.
 */
function normalizarInventario(lineas) {
  const original = new Map(); // canónica → set de formas originales
  const salida = (lineas || []).map((l) => {
    const antes = l && l.marca;
    const despues = normalizarMarca(antes);
    if (!original.has(despues)) original.set(despues, new Set());
    original.get(despues).add(String(antes == null ? '' : antes).trim() || '(vacío)');
    return { ...l, marca: despues };
  });

  // Solo interesan las marcas que llegaron escritas de más de una forma.
  const unificadas = [...original.entries()]
    .filter(([, formas]) => formas.size > 1)
    .map(([canonica, formas]) => ({ canonica, formas: [...formas].sort() }));

  return { lineas: salida, unificadas, marcas: original.size };
}

module.exports = { ALIAS, SIN_MARCA, claveMarca, normalizarMarca, normalizarInventario };
