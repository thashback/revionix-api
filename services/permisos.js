/**
 * PERMISOS DE ESCRITURA
 *
 * Extraído de server.js para poder probarlo: la regla de quién escribe y quién
 * no es de las que, si se rompe, no se nota hasta que alguien de solo lectura
 * modifica algo que no debía.
 */

/** La única ruta donde un visor puede escribir. */
const EXCEPCIONES_VISOR = [{ metodo: 'POST', ruta: '/solicitudes' }];

/**
 * ¿Puede este usuario hacer esta petición?
 *
 * Un visor solo lee. La excepción son las solicitudes de mejora: no tocan
 * datos del negocio, y sin ellas la gente que usa el sistema en modo consulta
 * sería justo la que no puede pedir que se arregle nada.
 */
function puedeEscribir(usuario, metodo, ruta) {
  if (!usuario || usuario.role !== 'visor') return true;
  if (metodo === 'GET') return true;
  return EXCEPCIONES_VISOR.some((e) => e.metodo === metodo && e.ruta === ruta);
}

module.exports = { puedeEscribir, EXCEPCIONES_VISOR };
