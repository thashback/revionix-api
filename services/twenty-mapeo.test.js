/**
 * Pruebas del mapeo REVIONIX → Twenty.
 * Se corren con: node services/twenty-mapeo.test.js
 * Usa el runner de Node, sin dependencias extra.
 */
const test = require('node:test');
const assert = require('node:assert');
const {
  aCentimos,
  normalizarNombreEmpresa,
  proyectoAOportunidad,
  empresasDesdeProyectos,
} = require('./twenty-mapeo');

test('aCentimos convierte soles sin perder precisión', () => {
  assert.strictEqual(aCentimos(1234.56), 123456);
  assert.strictEqual(aCentimos('99.99'), 9999);
  assert.strictEqual(aCentimos(0), 0);
});

test('aCentimos aguanta valores inválidos sin romper', () => {
  assert.strictEqual(aCentimos(null), 0);
  assert.strictEqual(aCentimos(undefined), 0);
  assert.strictEqual(aCentimos('no es número'), 0);
});

test('el mismo cliente escrito distinto se normaliza igual', () => {
  const a = normalizarNombreEmpresa('CERVEP S.A.C.');
  const b = normalizarNombreEmpresa('cervep sac');
  const c = normalizarNombreEmpresa('  Cervep   S.A.C  ');
  assert.strictEqual(a, b);
  assert.strictEqual(b, c);
  assert.strictEqual(a, 'CERVEP');
});

test('distintas formas societarias no colisionan entre empresas distintas', () => {
  assert.notStrictEqual(
    normalizarNombreEmpresa('ALFA SAC'),
    normalizarNombreEmpresa('BETA SAC'),
  );
});

test('un proyecto se convierte en oportunidad con su clave estable', () => {
  const op = proyectoAOportunidad({
    numero_oc: 'OC-2026-001',
    fecha_oc: '2026-03-15',
    cliente: 'CERVEP S.A.C.',
    descripcion: 'CCTV campamento',
    monto_total: 50000,
    monto_ejecutado: 12500,
    estado: 'en_proceso',
    condicion_pago: 'credito',
  });

  assert.strictEqual(op.claveExterna, 'OC-2026-001');
  assert.strictEqual(op.nombre, 'OC OC-2026-001');
  assert.strictEqual(op.etapa, 'En proceso');
  assert.strictEqual(op.empresa, 'CERVEP');
  assert.strictEqual(op.monto.currencyCode, 'PEN');
  assert.strictEqual(op.personalizados.avancePct, 25);
  assert.strictEqual(op.personalizados.condicionPago, 'credito');
});

test('cada estado de REVIONIX cae en la etapa correcta', () => {
  const base = { numero_oc: 'X', cliente: 'A', monto_total: 100 };
  assert.strictEqual(proyectoAOportunidad({ ...base, estado: 'pendiente' }).etapa, 'Pendiente');
  assert.strictEqual(proyectoAOportunidad({ ...base, estado: 'completado' }).etapa, 'Ganado');
  assert.strictEqual(proyectoAOportunidad({ ...base, estado: 'cancelado' }).etapa, 'Perdido');
});

test('un estado desconocido no rompe: cae en la etapa por defecto', () => {
  const op = proyectoAOportunidad({
    numero_oc: 'X', cliente: 'A', monto_total: 100, estado: 'inventado',
  });
  assert.strictEqual(op.etapa, 'Pendiente');
});

test('un proyecto sin numero_oc se rechaza en vez de sincronizarse mal', () => {
  assert.throws(() => proyectoAOportunidad({ cliente: 'A', monto_total: 100 }));
});

test('avance no se dispara sobre 100 aunque lo ejecutado exceda el monto', () => {
  const op = proyectoAOportunidad({
    numero_oc: 'X', cliente: 'A', monto_total: 100, monto_ejecutado: 250,
  });
  assert.strictEqual(op.personalizados.avancePct, 100);
});

test('monto en cero no provoca división por cero', () => {
  const op = proyectoAOportunidad({
    numero_oc: 'X', cliente: 'A', monto_total: 0, monto_ejecutado: 0,
  });
  assert.strictEqual(op.personalizados.avancePct, 0);
});

test('las empresas se deduplican sumando sus proyectos', () => {
  const empresas = empresasDesdeProyectos([
    { cliente: 'CERVEP S.A.C.', monto_total: 50000 },
    { cliente: 'cervep sac', monto_total: 30000 },
    { cliente: 'OTRA EIRL', monto_total: 10000 },
  ]);

  assert.strictEqual(empresas.length, 2);
  const cervep = empresas.find((e) => e.claveExterna === 'CERVEP');
  assert.strictEqual(cervep.proyectos, 2);
  assert.strictEqual(cervep.montoTotal, 80000);
  // Van ordenadas por monto: la más grande primero.
  assert.strictEqual(empresas[0].claveExterna, 'CERVEP');
});

test('clientes vacíos se descartan en vez de crear empresas fantasma', () => {
  const empresas = empresasDesdeProyectos([
    { cliente: '', monto_total: 100 },
    { cliente: '   ', monto_total: 100 },
    { cliente: null, monto_total: 100 },
  ]);
  assert.strictEqual(empresas.length, 0);
});
