const test = require('node:test');
const assert = require('node:assert');
const { normalizarMarca, normalizarInventario, SIN_MARCA } = require('./marcas');

test('el caso reportado: Huawei y HUAWEI son la misma marca', () => {
  assert.strictEqual(normalizarMarca('Huawei'), normalizarMarca('HUAWEI'));
  assert.strictEqual(normalizarMarca('Huawei'), 'HUAWEI');
  assert.strictEqual(normalizarMarca('  huawei  '), 'HUAWEI');
});

test('espacios repetidos no crean marcas distintas', () => {
  assert.strictEqual(normalizarMarca('TP  LINK'), normalizarMarca('TP LINK'));
});

test('los acentos no parten una marca en dos', () => {
  assert.strictEqual(normalizarMarca('Télefonica'), normalizarMarca('TELEFONICA'));
});

test('marca vacía cae en SIN MARCA, que es una categoría real', () => {
  assert.strictEqual(normalizarMarca(''), SIN_MARCA);
  assert.strictEqual(normalizarMarca('   '), SIN_MARCA);
  assert.strictEqual(normalizarMarca(null), SIN_MARCA);
  assert.strictEqual(normalizarMarca(undefined), SIN_MARCA);
});

test('los alias explícitos se unifican', () => {
  assert.strictEqual(normalizarMarca('WD'), 'WD / HDD');
  assert.strictEqual(normalizarMarca('Western Digital'), 'WD / HDD');
  assert.strictEqual(normalizarMarca('TPLINK'), 'TP-LINK');
  assert.strictEqual(normalizarMarca('Hik Vision'), 'HIKVISION');
});

test('NO se juntan marcas parecidas pero distintas', () => {
  assert.notStrictEqual(normalizarMarca('HP'), normalizarMarca('HPE'));
  assert.notStrictEqual(normalizarMarca('ASUS'), normalizarMarca('ASROCK'));
  assert.notStrictEqual(normalizarMarca('HONOR'), normalizarMarca('HUAWEI'));
});

test('el inventario se normaliza y reporta lo que unificó', () => {
  const { lineas, unificadas } = normalizarInventario([
    { producto: 'A', marca: 'Huawei', cant: 1 },
    { producto: 'B', marca: 'HUAWEI', cant: 2 },
    { producto: 'C', marca: 'HONOR', cant: 3 },
  ]);

  assert.strictEqual(lineas[0].marca, 'HUAWEI');
  assert.strictEqual(lineas[1].marca, 'HUAWEI');
  assert.strictEqual(lineas[2].marca, 'HONOR');

  // Solo HUAWEI llegó escrita de dos formas.
  assert.strictEqual(unificadas.length, 1);
  assert.strictEqual(unificadas[0].canonica, 'HUAWEI');
  assert.deepStrictEqual(unificadas[0].formas, ['HUAWEI', 'Huawei']);
});

test('normalizar no pierde ni altera el resto de los campos', () => {
  const { lineas } = normalizarInventario([
    { producto: 'A', marca: 'Huawei', cant: 5, precio: 99.9, sede: 'SJL', sku: 'X-1' },
  ]);
  assert.strictEqual(lineas.length, 1);
  assert.strictEqual(lineas[0].cant, 5);
  assert.strictEqual(lineas[0].precio, 99.9);
  assert.strictEqual(lineas[0].sede, 'SJL');
  assert.strictEqual(lineas[0].sku, 'X-1');
});

test('un inventario vacío no revienta', () => {
  const r = normalizarInventario([]);
  assert.deepStrictEqual(r.lineas, []);
  assert.deepStrictEqual(r.unificadas, []);
  const r2 = normalizarInventario(null);
  assert.deepStrictEqual(r2.lineas, []);
});

test('normalizar dos veces da el mismo resultado (idempotente)', () => {
  const una = normalizarInventario([{ marca: 'Huawei' }]).lineas;
  const dos = normalizarInventario(una).lineas;
  assert.strictEqual(una[0].marca, dos[0].marca);
});
