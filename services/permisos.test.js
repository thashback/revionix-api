const test = require('node:test');
const assert = require('node:assert');
const { puedeEscribir } = require('./permisos');

const visor = { role: 'visor', username: 'jmolina' };
const admin = { role: 'admin', username: 'admin' };
const tienda = { role: 'tienda', username: 'sanisidro' };

test('el visor puede leer cualquier cosa', () => {
  assert.equal(puedeEscribir(visor, 'GET', '/ventas'), true);
  assert.equal(puedeEscribir(visor, 'GET', '/solicitudes'), true);
});

test('el visor NO puede escribir datos del negocio', () => {
  for (const ruta of ['/ventas', '/gastos', '/compras', '/storage', '/proyectos']) {
    assert.equal(puedeEscribir(visor, 'POST', ruta), false, `POST ${ruta}`);
    assert.equal(puedeEscribir(visor, 'PUT', ruta), false, `PUT ${ruta}`);
    assert.equal(puedeEscribir(visor, 'DELETE', ruta), false, `DELETE ${ruta}`);
  }
});

test('el visor SÍ puede enviar una solicitud de mejora', () => {
  assert.equal(puedeEscribir(visor, 'POST', '/solicitudes'), true);
});

test('la excepción no le abre el resto del módulo', () => {
  // Cambiar el estado de una solicitud es cosa del administrador.
  assert.equal(puedeEscribir(visor, 'PUT', '/solicitudes/1'), false);
  assert.equal(puedeEscribir(visor, 'DELETE', '/solicitudes/1'), false);
});

test('la excepción no se cuela por una ruta parecida', () => {
  assert.equal(puedeEscribir(visor, 'POST', '/solicitudes-mejora'), false);
  assert.equal(puedeEscribir(visor, 'POST', '/solicitudes/otra'), false);
  assert.equal(puedeEscribir(visor, 'POST', '/api/solicitudes'), false);
});

test('los demás roles escriben con normalidad', () => {
  assert.equal(puedeEscribir(admin, 'POST', '/ventas'), true);
  assert.equal(puedeEscribir(tienda, 'POST', '/ventas'), true);
  assert.equal(puedeEscribir(null, 'POST', '/ventas'), true); // lo corta requireAuth antes
});
