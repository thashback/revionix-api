/**
 * MAPEO REVIONIX → TWENTY
 *
 * Reparto de responsabilidades acordado:
 *   · REVIONIX  = operación (inventario, compras, ventas, gastos, planilla, EBITDA)
 *                 y es la FUENTE DE VERDAD de proyectos y clientes.
 *   · Twenty    = capa comercial encima (pipeline, seguimiento, actividades).
 *
 * La sincronización arranca en un solo sentido (REVIONIX → Twenty) a propósito.
 * Con doble escritura habría que resolver conflictos —dos lados editando el
 * mismo monto— y eso trae bugs difíciles de ver. Si más adelante hace falta
 * que Twenty escriba de vuelta, se agrega con webhooks y un campo de origen.
 *
 * Este archivo contiene SOLO funciones puras de transformación, sin llamadas
 * de red, para poder probarlas sin depender de una instancia de Twenty.
 */

/**
 * Estados de REVIONIX → etapas del pipeline de Twenty.
 *
 * Los valores son los del enum real de Twenty (NEW, SCREENING, MEETING,
 * PROPOSAL, CUSTOMER), verificados contra el esquema de la instancia.
 *
 * "cancelado" queda en null a propósito: el pipeline por defecto de Twenty
 * no tiene etapa de "perdido", y meter un proyecto cancelado en NEW lo haría
 * pasar por una oportunidad fresca. La sincronización los omite y lo dice.
 */
const ETAPAS = {
  pendiente: 'NEW',
  en_proceso: 'PROPOSAL',
  completado: 'CUSTOMER',
  cancelado: null,
};

/** Etapa por defecto cuando el estado no está entre los conocidos. */
const ETAPA_POR_DEFECTO = 'NEW';

/**
 * Twenty maneja los importes en la unidad mínima (céntimos) para no perder
 * precisión con decimales. REVIONIX guarda soles con 2 decimales.
 */
function aCentimos(monto) {
  const n = Number(monto);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Normaliza un nombre de empresa para poder compararlos sin duplicar. */
function normalizarNombreEmpresa(nombre) {
  return String(nombre || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    // Se quitan las formas societarias y la puntuación: "REVIONIX S.A.C." y
    // "Revionix SAC" son el mismo cliente y no deben crear dos empresas.
    .replace(/[.,]/g, '')
    .replace(/\b(S\s?A\s?C|E\s?I\s?R\s?L|S\s?R\s?L|S\s?A|SOCIEDAD ANONIMA CERRADA)\b/g, '')
    .trim();
}

/**
 * Convierte un proyecto/OC de REVIONIX en una Oportunidad de Twenty.
 *
 * `numero_oc` es UNIQUE en la base de REVIONIX, así que sirve de clave de
 * idempotencia: reenviar el mismo proyecto actualiza en vez de duplicar.
 */
function proyectoAOportunidad(proyecto) {
  if (!proyecto || !proyecto.numero_oc) {
    throw new Error('El proyecto necesita numero_oc para sincronizarse');
  }

  const monto = aCentimos(proyecto.monto_total);
  const ejecutado = aCentimos(proyecto.monto_ejecutado);

  // Un estado conocido puede mapear a null (cancelado): eso significa
  // "no va al pipeline", y es distinto de un estado desconocido.
  const etapa = Object.prototype.hasOwnProperty.call(ETAPAS, proyecto.estado)
    ? ETAPAS[proyecto.estado]
    : ETAPA_POR_DEFECTO;

  return {
    // Clave estable para buscar el registro ya creado en Twenty.
    claveExterna: String(proyecto.numero_oc).trim(),
    nombre: `OC ${String(proyecto.numero_oc).trim()}`,
    etapa,
    monto: { amountMicros: monto * 10000, currencyCode: 'PEN' },
    // La fecha de la OC es lo más cercano a un cierre real que tiene REVIONIX.
    fechaCierre: proyecto.fecha_oc ? new Date(proyecto.fecha_oc).toISOString() : null,
    empresa: normalizarNombreEmpresa(proyecto.cliente),
    // Campos propios que se crean como personalizados en Twenty.
    personalizados: {
      numeroOc: String(proyecto.numero_oc).trim(),
      descripcion: proyecto.descripcion || '',
      montoEjecutado: ejecutado,
      avancePct:
        monto > 0 ? Math.min(100, Math.round((ejecutado / monto) * 100)) : 0,
      condicionPago: proyecto.condicion_pago || 'contado',
      estadoRevionix: proyecto.estado || 'pendiente',
    },
  };
}

/**
 * Deduce las empresas a crear en Twenty a partir de los proyectos.
 * Devuelve una por nombre normalizado, sin repetir.
 */
function empresasDesdeProyectos(proyectos) {
  const mapa = new Map();
  for (const p of proyectos || []) {
    const clave = normalizarNombreEmpresa(p.cliente);
    if (!clave) continue;
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        claveExterna: clave,
        // Se conserva el nombre tal como lo escribieron, para mostrarlo.
        nombre: String(p.cliente).trim(),
        proyectos: 0,
        montoTotal: 0,
      });
    }
    const e = mapa.get(clave);
    e.proyectos += 1;
    e.montoTotal += Number(p.monto_total) || 0;
  }
  return [...mapa.values()].sort((a, b) => b.montoTotal - a.montoTotal);
}

module.exports = {
  ETAPAS,
  ETAPA_POR_DEFECTO,
  aCentimos,
  normalizarNombreEmpresa,
  proyectoAOportunidad,
  empresasDesdeProyectos,
};
