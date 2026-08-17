'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  extensionPermitida, nombreSeguro, nombreDentroDeCarpeta,
  cabecerasDeArchivo, limitadorLogin, reiniciarIntentos, MAX_INTENTOS,
} = require('./seguridad');

test('acepta comprobantes y rechaza lo que el navegador ejecutaría', () => {
  for (const ok of ['a.pdf', 'B.PDF', 'foto.jpg', 'sunat.xml', 'libro.xlsx']) {
    assert.equal(extensionPermitida(ok), true, ok);
  }
  for (const no of ['x.html', 'x.svg', 'x.xhtml', 'x.js', 'x.php', 'sin-extension']) {
    assert.equal(extensionPermitida(no), false, no);
  }
});

test('el nombre guardado no se puede adivinar y conserva la extensión', () => {
  const a = nombreSeguro('Factura 001.pdf');
  const b = nombreSeguro('Factura 001.pdf');
  assert.notEqual(a, b, 'dos subidas del mismo nombre no pueden colisionar');
  assert.ok(a.endsWith('.pdf'));
  assert.match(a, /^Factura-001-[0-9a-f]{32}\.pdf$/);
});

test('el nombre guardado se queda en caracteres seguros', () => {
  assert.match(nombreSeguro('Ñandú áéí #1.pdf'), /^Nandu-aei-1-[0-9a-f]{32}\.pdf$/);
  // Un nombre que se queda sin nada utilizable no puede producir un archivo oculto.
  assert.match(nombreSeguro('...pdf'), /^archivo-[0-9a-f]{32}\.pdf$/);
});

test('un nombre con rutas dentro se queda solo con el último tramo', () => {
  // path.basename ya descarta el ../..; se comprueba para que no se pierda
  // si alguien reescribe la normalización.
  assert.match(nombreSeguro('../../etc/passwd.pdf'), /^passwd-[0-9a-f]{32}\.pdf$/);
  assert.ok(!nombreSeguro('..\\..\\windows\\algo.pdf').includes('\\'));
});

test('ningún nombre puede salir de la carpeta de subidas', () => {
  assert.equal(nombreDentroDeCarpeta('../../etc/passwd'), 'passwd');
  assert.equal(nombreDentroDeCarpeta('..%2f..%2fetc'), '..%2f..%2fetc'.split('/').pop());
  assert.equal(nombreDentroDeCarpeta('..'), null);
  assert.equal(nombreDentroDeCarpeta(''), null);
});

test('el tipo servido sale de la extensión, no de quien subió el archivo', () => {
  const pdf = cabecerasDeArchivo('a.pdf');
  assert.equal(pdf['Content-Type'], 'application/pdf');
  assert.match(pdf['Content-Disposition'], /^inline/);

  // Lo que no se muestra en pantalla se descarga: así no se ejecuta.
  const xml = cabecerasDeArchivo('a.xml');
  assert.match(xml['Content-Disposition'], /^attachment/);
  assert.equal(xml['X-Content-Type-Options'], 'nosniff');

  // Una extensión desconocida nunca hereda un tipo ejecutable.
  assert.equal(cabecerasDeArchivo('a.raro')['Content-Type'], 'application/octet-stream');
});

// ── Límite de intentos ────────────────────────────────────────────────
function pedir(usuario, ip = '1.2.3.4') {
  const oyentes = [];
  const res = {
    statusCode: 200,
    locals: {},
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(cuerpo) { this.cuerpo = cuerpo; return this; },
    on(evento, fn) { if (evento === 'finish') oyentes.push(fn); },
    terminar() { oyentes.forEach((f) => f()); },
  };
  const req = { headers: { 'x-forwarded-for': ip }, socket: {}, body: { username: usuario } };
  let siguio = false;
  limitadorLogin(req, res, () => { siguio = true; });
  return { res, siguio };
}

test('bloquea tras varios intentos fallidos y explica cuándo reintentar', () => {
  reiniciarIntentos();
  for (let i = 0; i < MAX_INTENTOS; i++) {
    const { res, siguio } = pedir('admin');
    assert.equal(siguio, true, `el intento ${i + 1} debía pasar`);
    res.locals.loginFallido = true;
    res.terminar();
  }
  const { res, siguio } = pedir('admin');
  assert.equal(siguio, false, 'el intento de más no debe llegar al login');
  assert.equal(res.statusCode, 429);
  assert.match(res.cuerpo.error, /Vuelve a intentar/);
  assert.ok(res.headers['Retry-After']);
});

test('un inicio de sesión correcto borra los fallos previos', () => {
  reiniciarIntentos();
  for (let i = 0; i < MAX_INTENTOS - 1; i++) {
    const { res } = pedir('admin');
    res.locals.loginFallido = true;
    res.terminar();
  }
  const bueno = pedir('admin');
  bueno.res.terminar(); // sin marcar fallo
  // El contador quedó limpio, así que vuelve a haber margen completo.
  for (let i = 0; i < MAX_INTENTOS; i++) {
    const { siguio, res } = pedir('admin');
    assert.equal(siguio, true, `tras el acierto, el intento ${i + 1} debía pasar`);
    res.locals.loginFallido = true;
    res.terminar();
  }
});

test('el bloqueo de un usuario no arrastra a los demás', () => {
  reiniciarIntentos();
  for (let i = 0; i < MAX_INTENTOS; i++) {
    const { res } = pedir('admin');
    res.locals.loginFallido = true;
    res.terminar();
  }
  assert.equal(pedir('admin').siguio, false);
  assert.equal(pedir('luis').siguio, true, 'otro usuario desde la misma IP sigue pudiendo entrar');
  assert.equal(pedir('admin', '9.9.9.9').siguio, true, 'el mismo usuario desde otra IP no está bloqueado');
});
