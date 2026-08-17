#!/usr/bin/env node
/**
 * ASIGNAR CONTRASEÑA A UN USUARIO
 *
 * Las contraseñas se guardan como hash scrypt con sal (server.js:766), que es
 * de un solo sentido: no se pueden recuperar, solo reemplazar. Esta herramienta
 * existe para cuando alguien perdió su acceso.
 *
 * La contraseña se escribe aquí, en la máquina de quien la ejecuta, con la
 * pantalla en blanco mientras se teclea. No se muestra, no se registra en el
 * historial de la terminal y no viaja a ningún sitio: solo sale de aquí el
 * hash, que es lo único que la base guarda.
 *
 *   railway run --service "MySQL - REVIONIX DATOS REALES (produccion)" \
 *     node herramientas/clave.cjs
 *
 * Sin argumentos lista las cuentas. Con un usuario, pide la contraseña nueva.
 */
const crypto = require('crypto');
const readline = require('readline');
const mysql = require('mysql2/promise');

const MINIMO = 8;

/** Idéntico a hashPass() de server.js: si cambia allí, hay que cambiarlo aquí. */
function hashPass(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

/** Lee sin mostrar lo tecleado, ni siquiera asteriscos. */
function preguntarOculto(texto) {
  return new Promise((resolve, reject) => {
    const entrada = process.stdin;
    if (!entrada.isTTY) {
      reject(new Error('Hace falta una terminal interactiva para escribir la contraseña.'));
      return;
    }
    process.stdout.write(texto);
    const previo = entrada.isRaw;
    entrada.setRawMode(true);
    entrada.resume();
    let valor = '';
    const alTeclear = (buf) => {
      const c = buf.toString('utf8');
      if (c === '\r' || c === '\n') {
        entrada.removeListener('data', alTeclear);
        entrada.setRawMode(previo);
        entrada.pause();
        process.stdout.write('\n');
        resolve(valor);
      } else if (c === '') {           // Ctrl+C
        entrada.setRawMode(previo);
        process.stdout.write('\n');
        process.exit(130);
      } else if (c === '' || c === '\b') {
        valor = valor.slice(0, -1);
      } else if (c >= ' ') {
        valor += c;
      }
    };
    entrada.on('data', alTeclear);
  });
}

function preguntar(texto) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(texto, (v) => { rl.close(); r(v.trim()); }));
}

(async () => {
  const url = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('No hay conexión a la base. Ejecútalo con:\n' +
      '  railway run --service "MySQL - REVIONIX DATOS REALES (produccion)" node herramientas/clave.cjs');
    process.exit(1);
  }
  const con = await mysql.createConnection(url);
  try {
    const [filas] = await con.execute(
      'SELECT username, nombre, role, activo FROM usuarios ORDER BY role, username');

    let usuario = process.argv[2];
    if (!usuario) {
      console.log('\nCuentas del sistema:\n');
      for (const u of filas) {
        console.log(`   ${u.username.padEnd(14)} ${String(u.nombre || '').padEnd(28)} ` +
          `${u.role.padEnd(12)} ${u.activo ? 'activo' : 'DESACTIVADO'}`);
      }
      console.log('');
      usuario = await preguntar('¿A qué usuario le pones contraseña nueva? ');
    }

    const cuenta = filas.find((u) => u.username === usuario);
    if (!cuenta) {
      console.error(`\nNo existe el usuario "${usuario}".`);
      process.exit(1);
    }

    console.log(`\n   Usuario : ${cuenta.username}`);
    console.log(`   Nombre  : ${cuenta.nombre || '—'}`);
    console.log(`   Rol     : ${cuenta.role}`);
    console.log('\n   La contraseña no se verá mientras la escribes.\n');

    const clave = await preguntarOculto('   Contraseña nueva: ');
    if (clave.length < MINIMO) {
      console.error(`\nDemasiado corta: mínimo ${MINIMO} caracteres. No se cambió nada.`);
      process.exit(1);
    }
    const repetida = await preguntarOculto('   Repítela        : ');
    if (clave !== repetida) {
      console.error('\nNo coinciden. No se cambió nada.');
      process.exit(1);
    }

    const { salt, hash } = hashPass(clave);
    await con.execute(
      'UPDATE usuarios SET salt = ?, pass_hash = ?, activo = 1 WHERE username = ?',
      [salt, hash, cuenta.username]);

    // Comprobación real: se vuelve a leer de la base y se verifica igual que
    // hace el login. Si esto pasa, entrar va a funcionar.
    const [[guardado]] = await con.execute(
      'SELECT salt, pass_hash FROM usuarios WHERE username = ?', [cuenta.username]);
    const ok = crypto.timingSafeEqual(
      Buffer.from(crypto.scryptSync(clave, guardado.salt, 64).toString('hex')),
      Buffer.from(guardado.pass_hash));

    console.log(ok
      ? `\n   ✔ Listo. "${cuenta.username}" ya entra con esa contraseña.\n`
      : '\n   ✘ Se guardó pero la comprobación falló. Avisa antes de seguir.\n');
    process.exit(ok ? 0 : 1);
  } finally {
    await con.end();
  }
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
