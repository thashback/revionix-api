'use strict';

const crypto = require('crypto');
const path = require('path');

/**
 * MEDIDAS DE SEGURIDAD DE REVIONIX
 *
 * Lo que hay acá protege datos del negocio: comprobantes, facturas, órdenes
 * de compra y costos. Todo se resolvió sin dependencias nuevas para no
 * ampliar la superficie de terceros por algo que el runtime ya sabe hacer.
 */

// ── Cabeceras de seguridad ────────────────────────────────────────────
// No hay CSP: la aplicación anterior tiene scripts y estilos en línea, y una
// política estricta la rompería entera. Se añadirá cuando /v2 la reemplace.
function cabecerasSeguridad(req, res, next) {
  // Evita que el navegador adivine el tipo de un archivo subido y lo
  // ejecute como HTML: es la mitad de la defensa contra XSS almacenado.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // HSTS solo cuando la petición ya llegó por HTTPS: activarlo en local
  // dejaría el navegador del desarrollador sin poder abrir http://localhost.
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

// ── Límite de intentos de inicio de sesión ────────────────────────────
// En memoria a propósito: hay un solo proceso y la alternativa (Redis) sería
// otra pieza que mantener. Si algún día hay varias réplicas, esto se queda
// corto y habría que moverlo a la base.
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 8;
const intentos = new Map();

function limpiarVencidos(ahora) {
  for (const [clave, reg] of intentos) {
    if (ahora - reg.desde > VENTANA_MS) intentos.delete(clave);
  }
}

/** Identifica al cliente por IP; detrás del proxy de Railway vale la primera. */
function ipCliente(req) {
  const reenviada = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return reenviada || req.socket?.remoteAddress || 'desconocida';
}

function limitadorLogin(req, res, next) {
  const ahora = Date.now();
  limpiarVencidos(ahora);
  // Se cuenta por IP + usuario: así un atacante que rota usuarios no diluye
  // el contador, y un usuario legítimo no queda bloqueado por culpa de otro
  // que comparte su salida a internet.
  const clave = `${ipCliente(req)}|${String(req.body?.username || '').trim().toLowerCase()}`;
  const reg = intentos.get(clave);

  if (reg && ahora - reg.desde <= VENTANA_MS && reg.fallos >= MAX_INTENTOS) {
    const faltan = Math.ceil((VENTANA_MS - (ahora - reg.desde)) / 60000);
    res.setHeader('Retry-After', String(faltan * 60));
    return res.status(429).json({
      ok: false,
      error: `Demasiados intentos fallidos. Vuelve a intentar en ${faltan} minutos.`,
    });
  }

  // Se marca el resultado cuando la respuesta ya salió: solo los intentos
  // fallidos suman, y un inicio de sesión correcto limpia el contador.
  res.on('finish', () => {
    const fallo = res.statusCode === 401 || res.locals?.loginFallido === true;
    if (!fallo) return intentos.delete(clave);
    const actual = intentos.get(clave);
    if (actual && ahora - actual.desde <= VENTANA_MS) actual.fallos += 1;
    else intentos.set(clave, { desde: ahora, fallos: 1 });
  });

  next();
}

/** Solo para las pruebas: deja el contador en blanco entre casos. */
function reiniciarIntentos() {
  intentos.clear();
}

// ── Archivos subidos ──────────────────────────────────────────────────
// Lista blanca: son comprobantes y órdenes de compra, nada más. Quedan fuera
// .html, .svg y .xhtml a propósito — servidos en el mismo dominio podrían
// leer el token de sesión del usuario que los abra.
const EXTENSIONES_PERMITIDAS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.xml', '.xls', '.xlsx', '.csv', '.txt', '.doc', '.docx',
]);

const MIME_POR_EXTENSION = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.xml': 'application/xml',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Solo el PDF y las imágenes se muestran dentro del navegador. */
const VISIBLES_EN_LINEA = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif']);

function extensionDe(nombre) {
  return path.extname(String(nombre || '')).toLowerCase();
}

function extensionPermitida(nombre) {
  return EXTENSIONES_PERMITIDAS.has(extensionDe(nombre));
}

/**
 * Nombre con el que se guarda un archivo subido.
 *
 * El esquema anterior era `<nombre original>-<timestamp>.<ext>`, que se puede
 * adivinar: con el nombre de un comprobante y la fecha aproximada se llegaba
 * al documento. Ahora lleva 16 bytes al azar, así que la ruta no se enumera.
 */
function nombreSeguro(nombreOriginal) {
  const ext = extensionDe(nombreOriginal);
  const base = path
    .basename(String(nombreOriginal || 'archivo'), path.extname(String(nombreOriginal || '')))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // tildes
    .replace(/[^a-zA-Z0-9._-]/g, '-')     // todo lo demás
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 48) || 'archivo';
  return `${base}-${crypto.randomBytes(16).toString('hex')}${ext}`;
}

/**
 * Deja un nombre de archivo en algo que no puede salir de su carpeta.
 * Devuelve null si el resultado no es utilizable.
 */
function nombreDentroDeCarpeta(nombre) {
  const limpio = path.basename(String(nombre || ''));
  if (!limpio || limpio === '.' || limpio === '..') return null;
  return limpio;
}

/**
 * Cabeceras con las que se entrega un archivo guardado. Nunca se reutiliza el
 * tipo que declaró quien lo subió: se deduce de la extensión, que ya pasó por
 * la lista blanca.
 */
function cabecerasDeArchivo(nombre) {
  const ext = extensionDe(nombre);
  return {
    'Content-Type': MIME_POR_EXTENSION[ext] || 'application/octet-stream',
    'Content-Disposition':
      `${VISIBLES_EN_LINEA.has(ext) ? 'inline' : 'attachment'}; filename="${path.basename(nombre)}"`,
    'X-Content-Type-Options': 'nosniff',
  };
}

module.exports = {
  cabecerasSeguridad,
  limitadorLogin,
  reiniciarIntentos,
  EXTENSIONES_PERMITIDAS,
  extensionPermitida,
  nombreSeguro,
  nombreDentroDeCarpeta,
  cabecerasDeArchivo,
  MAX_INTENTOS,
};
