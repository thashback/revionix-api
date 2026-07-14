const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse DATABASE_URL or use individual env vars
let dbConfig;
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1),
    port: url.port || 3306,
    connectionLimit: 5,
    enableQueueing: true,
    waitForConnections: true
  };
} else {
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    connectionLimit: 5,
    enableQueueing: true,
    waitForConnections: true
  };
}

// MySQL Pool
const pool = mysql.createPool(dbConfig);

// Uploads
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Guarda el binario del archivo en MySQL (sobrevive a los redeploys de Railway,
// cuyo sistema de archivos es efímero)
async function guardarArchivoBD(nombre, mime, buffer) {
  try {
    const conn = await pool.getConnection();
    await conn.execute(
      'INSERT INTO archivos_bin (nombre, mime, datos) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE datos=VALUES(datos), mime=VALUES(mime)',
      [nombre, mime || 'application/octet-stream', buffer]
    );
    conn.release();
  } catch (err) {
    console.error('✗ guardarArchivoBD:', err.message);
  }
}

// Motor de almacenamiento: escribe a disco (para servir rápido en la misma
// sesión) Y persiste una copia en MySQL. req.file.filename se mantiene igual,
// así que todos los endpoints existentes siguen funcionando sin cambios.
const storage = {
  _handleFile(req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const name = `${base}-${timestamp}${ext}`;
    const finalPath = path.join(uploadsDir, name);
    const chunks = [];
    const ws = fs.createWriteStream(finalPath);
    file.stream.on('data', (d) => chunks.push(d));
    file.stream.on('error', cb);
    file.stream.pipe(ws);
    ws.on('error', cb);
    ws.on('finish', () => {
      const buffer = Buffer.concat(chunks);
      guardarArchivoBD(name, file.mimetype, buffer).finally(() => {
        cb(null, { filename: name, path: finalPath, size: buffer.length });
      });
    });
  },
  _removeFile(req, file, cb) {
    fs.unlink(file.path, () => cb(null));
  }
};

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Middleware (límite alto: rv_ventas/rv_gastos pueden pesar varios MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// no-store en html/js: el navegador NUNCA guarda copia, siempre pide la última
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
// Sirve /uploads/:archivo desde disco si existe; si no (tras un redeploy),
// lo recupera desde MySQL.
app.get('/uploads/:nombre', async (req, res) => {
  const nombre = req.params.nombre;
  const rutaDisco = path.join(uploadsDir, nombre);
  if (fs.existsSync(rutaDisco)) return res.sendFile(rutaDisco);
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT mime, datos FROM archivos_bin WHERE nombre = ?', [nombre]);
    conn.release();
    if (rows.length) {
      res.setHeader('Content-Type', rows[0].mime || 'application/octet-stream');
      res.setHeader('Content-Disposition', 'inline; filename="' + nombre + '"');
      return res.send(rows[0].datos);
    }
    res.status(404).send('Archivo no encontrado');
  } catch (err) {
    res.status(500).send('Error al recuperar archivo');
  }
});

// Health checks
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', api: 'REVIONIX', version: '1.0.0' });
});

// ═══════════════════════════════════════════════════════════════
// ALMACENAMIENTO PERSISTENTE DEL SISTEMA (respaldo de localStorage)
// Guarda ventas, gastos, stock, usuarios y estados en MySQL para
// que los datos sobrevivan al navegador y se compartan entre equipos.
// ═══════════════════════════════════════════════════════════════
async function initStorageTable() {
  try {
    const conn = await pool.getConnection();
    await conn.query(`CREATE TABLE IF NOT EXISTS app_storage (
      clave VARCHAR(100) PRIMARY KEY,
      valor LONGTEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    // Columna de revisión: base del bloqueo optimista (evita que una pestaña
    // desactualizada sobrescriba datos más nuevos guardados por otra sesión).
    try {
      await conn.query('ALTER TABLE app_storage ADD COLUMN rev BIGINT NOT NULL DEFAULT 0');
      console.log('✓ Columna app_storage.rev agregada');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✓ Columna app_storage.rev ya existe');
      else console.error('migrar app_storage.rev:', e.message);
    }
    conn.release();
    console.log('✓ Tabla app_storage lista');
  } catch (err) {
    console.error('✗ initStorageTable:', err.message);
  }
}
initStorageTable();

// Tabla para binarios de archivos (persisten a los redeploys de Railway)
async function initArchivosTable() {
  try {
    const conn = await pool.getConnection();
    await conn.query(`CREATE TABLE IF NOT EXISTS archivos_bin (
      nombre VARCHAR(255) PRIMARY KEY,
      mime VARCHAR(100),
      datos LONGBLOB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    conn.release();
    console.log('✓ Tabla archivos_bin lista');
  } catch (err) {
    console.error('✗ initArchivosTable:', err.message);
  }
}
initArchivosTable();

// Registro de auditoría (oculto para el usuario): quién modificó/eliminó qué
async function initAuditoriaTable() {
  try {
    const conn = await pool.getConnection();
    await conn.query(`CREATE TABLE IF NOT EXISTS auditoria (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(80),
      accion VARCHAR(30),
      modulo VARCHAR(40),
      detalle TEXT,
      ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    conn.release();
    console.log('✓ Tabla auditoria lista');
  } catch (err) {
    console.error('✗ initAuditoriaTable:', err.message);
  }
}
initAuditoriaTable();

// Snapshot de los datos PRECARGADOS (respaldo en BD). No se auto-carga en el
// navegador (a diferencia de app_storage); es solo respaldo/consulta.
async function initSeedSnapshotTable() {
  try {
    const conn = await pool.getConnection();
    await conn.query(`CREATE TABLE IF NOT EXISTS seed_snapshot (
      clave VARCHAR(60) PRIMARY KEY,
      datos LONGTEXT,
      registros INT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    conn.release();
    console.log('✓ Tabla seed_snapshot lista');
  } catch (err) {
    console.error('✗ initSeedSnapshotTable:', err.message);
  }
}
initSeedSnapshotTable();

app.post('/api/seed', async (req, res) => {
  try {
    const { clave, datos } = req.body || {};
    if (!clave || datos == null) return res.status(400).json({ error: 'Falta clave o datos' });
    let n = 0; try { const a = JSON.parse(datos); n = Array.isArray(a) ? a.length : 1; } catch (e) {}
    const conn = await pool.getConnection();
    await conn.execute(
      'INSERT INTO seed_snapshot (clave, datos, registros) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE datos=VALUES(datos), registros=VALUES(registros)',
      [String(clave).slice(0, 60), String(datos), n]
    );
    conn.release();
    res.json({ ok: true, clave, registros: n });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lista las claves + cuántos registros (para verificar). Sin los datos completos.
app.get('/api/seed', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT clave, registros, updated_at, CHAR_LENGTH(datos) AS bytes FROM seed_snapshot ORDER BY clave');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Devuelve TODOS los datos precargados ya parseados (para que el front los cargue)
app.get('/api/seed-all', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT clave, datos FROM seed_snapshot');
    conn.release();
    const out = {};
    rows.forEach(r => { try { out[r.clave] = JSON.parse(r.datos); } catch (e) { out[r.clave] = null; } });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/seed/:clave', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT datos FROM seed_snapshot WHERE clave = ?', [req.params.clave]);
    conn.release();
    if (!rows.length) return res.status(404).json({ error: 'No existe' });
    res.type('application/json').send(rows[0].datos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit', async (req, res) => {
  try {
    const { usuario, accion, modulo, detalle } = req.body || {};
    const conn = await pool.getConnection();
    await conn.execute(
      'INSERT INTO auditoria (usuario, accion, modulo, detalle) VALUES (?, ?, ?, ?)',
      [String(usuario || 'desconocido').slice(0, 80), String(accion || '').slice(0, 30), String(modulo || '').slice(0, 40), String(detalle || '').slice(0, 2000)]
    );
    conn.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Consulta del registro (para respaldo/administración; no se muestra en la app)
app.get('/api/audit', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM auditoria ORDER BY id DESC LIMIT 1000');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// AUTENTICACIÓN REAL (usuarios en MySQL, contraseñas con hash scrypt)
// ═══════════════════════════════════════════════════════════════
function hashPass(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPass(password, salt, hash) {
  try {
    const h = crypto.scryptSync(String(password), salt, 64).toString('hex');
    const a = Buffer.from(h, 'hex'), b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) { return false; }
}

const USUARIOS_DEFAULT = [
  { u: 'admin', p: 'R3v10n1x#2026', n: 'Administrador General', role: 'admin', canal: '*' },
  { u: 'compuplaza', p: 'Cpz2026#', n: 'Encargado Compuplaza', role: 'tienda', canal: 'Compuplaza' },
  { u: 'malvitec', p: 'Mlv2026#', n: 'Encargado Malvitec', role: 'tienda', canal: 'Malvitec' },
  { u: 'compupalace', p: 'Cpl2026#', n: 'Encargado Compupalace', role: 'tienda', canal: 'Compupalace' },
  { u: 'corporativo', p: 'Corp2026#', n: 'Ejecutivo Corporativo', role: 'tienda', canal: 'Corporativo' },
  { u: 'sanisidro', p: 'Si2026#', n: 'Encargado San Isidro', role: 'tienda', canal: 'San Isidro' },
  { u: 'visor', p: 'V1s0r2026#', n: 'Solo Lectura', role: 'visor', canal: '*' },
  { u: 'ccervep', p: 'ccervep2026@', n: 'Cervep — Solo Lectura', role: 'visor', canal: '*' }
];

async function initUsuariosTable() {
  try {
    const conn = await pool.getConnection();
    await conn.query(`CREATE TABLE IF NOT EXISTS usuarios (
      username VARCHAR(50) PRIMARY KEY,
      salt VARCHAR(64),
      pass_hash VARCHAR(200),
      nombre VARCHAR(120),
      role VARCHAR(20) DEFAULT 'tienda',
      canal VARCHAR(50) DEFAULT '*',
      activo TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const [rows] = await conn.query('SELECT COUNT(*) AS c FROM usuarios');
    if (rows[0].c === 0) {
      for (const d of USUARIOS_DEFAULT) {
        const { salt, hash } = hashPass(d.p);
        await conn.execute(
          'INSERT INTO usuarios (username, salt, pass_hash, nombre, role, canal, activo) VALUES (?, ?, ?, ?, ?, ?, 1)',
          [d.u, salt, hash, d.n, d.role, d.canal]
        );
      }
      console.log('✓ Usuarios por defecto sembrados (' + USUARIOS_DEFAULT.length + ')');
    }
    conn.release();
    console.log('✓ Tabla usuarios lista');
  } catch (err) {
    console.error('✗ initUsuariosTable:', err.message);
  }
}
initUsuariosTable();

// Verifica credenciales contra la BD
app.post('/api/auth/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!username || !password) return res.json({ ok: false, error: 'Faltan credenciales' });
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM usuarios WHERE username = ?', [username]);
    conn.release();
    if (!rows.length) return res.json({ ok: false, error: 'Usuario o contraseña incorrectos' });
    const u = rows[0];
    if (u.activo === 0) return res.json({ ok: false, error: 'Usuario desactivado' });
    if (!verifyPass(password, u.salt, u.pass_hash)) return res.json({ ok: false, error: 'Usuario o contraseña incorrectos' });
    res.json({ ok: true, user: { username: u.username, nombre: u.nombre, role: u.role, canal: u.canal } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Lista de usuarios (sin hashes)
app.get('/api/auth/users', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT username, nombre, role, canal, activo FROM usuarios ORDER BY username');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear/actualizar usuario (contraseña opcional al actualizar)
app.post('/api/auth/users', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const { password, nombre, role, canal } = req.body;
    const activo = (req.body.activo === false || req.body.activo === 0) ? 0 : 1;
    if (!username) return res.status(400).json({ error: 'Falta username' });
    const conn = await pool.getConnection();
    const [ex] = await conn.execute('SELECT username FROM usuarios WHERE username = ?', [username]);
    if (ex.length) {
      if (password) {
        const { salt, hash } = hashPass(password);
        await conn.execute('UPDATE usuarios SET salt=?, pass_hash=?, nombre=?, role=?, canal=?, activo=? WHERE username=?',
          [salt, hash, nombre || username, role || 'tienda', canal || '*', activo, username]);
      } else {
        await conn.execute('UPDATE usuarios SET nombre=?, role=?, canal=?, activo=? WHERE username=?',
          [nombre || username, role || 'tienda', canal || '*', activo, username]);
      }
    } else {
      const { salt, hash } = hashPass(password || 'cambiar123');
      await conn.execute('INSERT INTO usuarios (username, salt, pass_hash, nombre, role, canal, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, salt, hash, nombre || username, role || 'tienda', canal || '*', activo]);
    }
    conn.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/auth/users/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').toLowerCase();
    if (username === 'admin') return res.status(400).json({ error: 'No se puede eliminar el admin' });
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM usuarios WHERE username = ?', [username]);
    conn.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Migración: agregar columna costo a proyectos si no existe (MySQL 8 no soporta IF NOT EXISTS en ADD COLUMN)
async function migrarColumnaCosto() {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.query('ALTER TABLE proyectos ADD COLUMN costo DECIMAL(12,2) DEFAULT 0');
      console.log('✓ Columna proyectos.costo agregada');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✓ Columna proyectos.costo ya existe');
      else console.error('migrarColumnaCosto:', e.message);
    }
    try {
      await conn.query("ALTER TABLE proyectos ADD COLUMN condicion_pago VARCHAR(20) DEFAULT 'contado'");
      console.log('✓ Columna proyectos.condicion_pago agregada');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✓ Columna proyectos.condicion_pago ya existe');
      else console.error('migrar condicion_pago:', e.message);
    }
    conn.release();
  } catch (err) {
    console.error('✗ migrarColumnaCosto:', err.message);
  }
}
migrarColumnaCosto();

app.get('/api/storage', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT clave, valor FROM app_storage');
    conn.release();
    const out = {};
    rows.forEach(r => { out[r.clave] = r.valor; });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revisiones actuales de cada clave (para el bloqueo optimista del cliente)
app.get('/api/storage/rev', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT clave, rev FROM app_storage');
    conn.release();
    const out = {};
    rows.forEach(r => { out[r.clave] = Number(r.rev) || 0; });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function guardarStorage(req, res) {
  try {
    const body = Object.assign({}, req.body || {});
    // __rev = { clave: revisión que el cliente vio al cargar/guardar por última vez }
    const revsCliente = body.__rev && typeof body.__rev === 'object' ? body.__rev : null;
    delete body.__rev;
    const entries = Object.entries(body);
    if (entries.length === 0) return res.json({ guardadas: 0, conflictos: [] });

    const conn = await pool.getConnection();
    const [cur] = await conn.query('SELECT clave, rev FROM app_storage');
    const revServidor = {};
    cur.forEach(r => { revServidor[r.clave] = Number(r.rev) || 0; });

    const conflictos = [];
    const escritas = [];
    const revsNuevas = {};

    for (const [clave, valor] of entries) {
      const servRev = revServidor[clave] || 0;
      // Protección: solo las claves rv_* que YA existen en el servidor.
      // Un cliente sin __rev (pestaña con código viejo) se trata como desactualizado.
      if (String(clave).startsWith('rv_') && servRev > 0) {
        const cliRev = revsCliente ? (Number(revsCliente[clave]) || 0) : -1;
        if (cliRev < servRev) { conflictos.push(clave); continue; } // NO sobrescribir
      }
      const nueva = servRev + 1;
      if (valor === null) {
        await conn.execute('DELETE FROM app_storage WHERE clave = ?', [clave]);
      } else {
        await conn.execute(
          'INSERT INTO app_storage (clave, valor, rev) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor), rev = VALUES(rev)',
          [clave, String(valor), nueva]
        );
        revsNuevas[clave] = nueva;
      }
      escritas.push([clave, valor]);
    }
    conn.release();

    if (conflictos.length) {
      console.warn('[STORAGE] escritura RECHAZADA (cliente desactualizado):', conflictos.join(', '));
    }

    // Reflejar los datasets clave en tablas relacionales reales (consultables).
    // Solo los que SÍ se escribieron.
    for (const [clave, valor] of escritas) {
      if (['rv_ventas', 'rv_gastos', 'rv_compras'].includes(clave)) {
        try { await espejarDataset(clave, valor); } catch (e) { console.error('espejarDataset', clave, e.message); }
      }
    }
    res.json({ guardadas: escritas.length, conflictos, revs: revsNuevas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Crea tablas relacionales para los datasets del sistema (una fila por registro)
async function initRegistrosTables() {
  try {
    const conn = await pool.getConnection();
    await conn.query(`CREATE TABLE IF NOT EXISTS reg_ventas (
      id INT AUTO_INCREMENT PRIMARY KEY, fecha VARCHAR(20), canal VARCHAR(80), cliente VARCHAR(200),
      modelo VARCHAR(300), marca VARCHAR(80), qty INT, venta DECIMAL(12,2), costo DECIMAL(12,2),
      condicion VARCHAR(20), grupo VARCHAR(40), raw LONGTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await conn.query(`CREATE TABLE IF NOT EXISTS reg_gastos (
      id INT AUTO_INCREMENT PRIMARY KEY, fecha VARCHAR(20), categoria VARCHAR(80), canal VARCHAR(80),
      descripcion VARCHAR(400), monto DECIMAL(12,2), responsable VARCHAR(120), comentarios VARCHAR(500),
      numero VARCHAR(60), raw LONGTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await conn.query(`CREATE TABLE IF NOT EXISTS reg_compras (
      id INT AUTO_INCREMENT PRIMARY KEY, prov VARCHAR(150), fecha VARCHAR(20), descripcion VARCHAR(400),
      marca VARCHAR(80), cant INT, usd DECIMAL(12,2), sol DECIMAL(12,2), destino VARCHAR(40),
      numero_comprobante VARCHAR(80), raw LONGTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    // Migración: agregar columna raw si las tablas ya existían sin ella
    for (const t of ['reg_ventas', 'reg_gastos', 'reg_compras']) {
      try { await conn.query('ALTER TABLE ' + t + ' ADD COLUMN raw LONGTEXT'); } catch (e) { /* ya existe */ }
    }
    conn.release();
    console.log('✓ Tablas reg_ventas/reg_gastos/reg_compras listas');
  } catch (err) {
    console.error('✗ initRegistrosTables:', err.message);
  }
}
initRegistrosTables();

// Refleja un dataset (JSON string) en su tabla relacional (reemplazo completo)
async function espejarDataset(clave, valorJSON) {
  let arr;
  try { arr = JSON.parse(valorJSON); } catch (e) { return; }
  if (!Array.isArray(arr)) return;
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const conn = await pool.getConnection();
  try {
    if (clave === 'rv_ventas') {
      await conn.query('DELETE FROM reg_ventas');
      for (const r of arr) {
        await conn.execute('INSERT INTO reg_ventas (fecha,canal,cliente,modelo,marca,qty,venta,costo,condicion,grupo,raw) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [r.fecha || '', r.canal || '', r.cliente || '', r.modelo || '', r.marca || '', parseInt(r.qty) || 1, num(r.venta), num(r.costo), r.condicion || '', r.grupo || '', JSON.stringify(r)]);
      }
    } else if (clave === 'rv_gastos') {
      await conn.query('DELETE FROM reg_gastos');
      for (const r of arr) {
        await conn.execute('INSERT INTO reg_gastos (fecha,categoria,canal,descripcion,monto,responsable,comentarios,numero,raw) VALUES (?,?,?,?,?,?,?,?,?)',
          [r.fecha || '', r.cat || '', r.canal || '', r.desc || '', num(r.monto), r.resp || '', r.comentarios || '', r.numero || '', JSON.stringify(r)]);
      }
    } else if (clave === 'rv_compras') {
      await conn.query('DELETE FROM reg_compras');
      for (const r of arr) {
        await conn.execute('INSERT INTO reg_compras (prov,fecha,descripcion,marca,cant,usd,sol,destino,numero_comprobante,raw) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [r.prov || '', r.fecha || '', r.desc || '', r.marca || '', parseInt(r.cant) || 0, num(r.usd), num(r.sol), r.destino || '', r.numero_comprobante || '', JSON.stringify(r)]);
      }
    }
  } finally {
    conn.release();
  }
}

// Endpoints de solo lectura para las tablas relacionales
app.get('/api/reg/:tipo', async (req, res) => {
  const t = req.params.tipo;
  const tabla = { ventas: 'reg_ventas', gastos: 'reg_gastos', compras: 'reg_compras' }[t];
  if (!tabla) return res.status(404).json({ error: 'Tipo inválido' });
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM ' + tabla + ' ORDER BY id DESC');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/storage', guardarStorage);
app.post('/api/storage', guardarStorage); // para navigator.sendBeacon al cerrar

// Subida genérica de archivos: devuelve la ruta para asociarla a cualquier
// registro del sistema (gastos de movilidad, comprobantes, etc.)
app.post('/api/archivos', upload.single('archivo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  res.json({ ruta: `/uploads/${req.file.filename}`, nombre: req.file.originalname });
});

// Compras
app.post('/api/compras', upload.single('comprobante'), async (req, res) => {
  try {
    const { numero_factura, fecha, proveedor, descripcion, marca, cantidad, moneda, precio_usd, precio_sol, total_sol } = req.body;
    const ruta_comprobante = req.file ? `/uploads/${req.file.filename}` : null;

    const conn = await pool.getConnection();
    const result = await conn.execute(
      'INSERT INTO compras (numero_factura, fecha, proveedor, descripcion, marca, cantidad, moneda, precio_usd, precio_sol, total_sol, ruta_comprobante) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [numero_factura, fecha, proveedor, descripcion, marca, cantidad, moneda, precio_usd, precio_sol, total_sol, ruta_comprobante]
    );
    conn.release();
    res.json({ id: result[0].insertId, mensaje: 'Compra registrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/compras', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM compras ORDER BY fecha DESC LIMIT 100');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/compras/:id', upload.single('comprobante'), async (req, res) => {
  try {
    const ruta_comprobante = req.file ? `/uploads/${req.file.filename}` : null;

    if (!ruta_comprobante) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const conn = await pool.getConnection();
    await conn.execute('UPDATE compras SET ruta_comprobante = ? WHERE id = ?',
      [ruta_comprobante, req.params.id]);
    conn.release();
    res.json({ mensaje: 'Comprobante actualizado', ruta: ruta_comprobante });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/compras/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM compras WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ mensaje: 'Compra eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gastos
app.post('/api/gastos', upload.single('comprobante'), async (req, res) => {
  try {
    const { fecha, tipo_comprobante, serie, numero, categoria, canal, descripcion, responsable, monto } = req.body;
    const ruta_comprobante = req.file ? `/uploads/${req.file.filename}` : null;

    const conn = await pool.getConnection();
    const result = await conn.execute(
      'INSERT INTO gastos (fecha, tipo_comprobante, serie, numero, categoria, canal, descripcion, responsable, monto, ruta_comprobante) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [fecha, tipo_comprobante, serie, numero, categoria, canal, descripcion, responsable, monto, ruta_comprobante]
    );
    conn.release();
    res.json({ id: result[0].insertId, mensaje: 'Gasto registrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gastos', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM gastos ORDER BY fecha DESC LIMIT 100');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/gastos/:id', upload.single('comprobante'), async (req, res) => {
  try {
    const ruta_comprobante = req.file ? `/uploads/${req.file.filename}` : null;

    if (!ruta_comprobante) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const conn = await pool.getConnection();
    await conn.execute('UPDATE gastos SET ruta_comprobante = ? WHERE id = ?',
      [ruta_comprobante, req.params.id]);
    conn.release();
    res.json({ mensaje: 'Comprobante actualizado', ruta: ruta_comprobante });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gastos/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM gastos WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ mensaje: 'Gasto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ventas
app.post('/api/ventas', async (req, res) => {
  try {
    const { fecha, canal, sku, modelo, marca, cantidad, precio_venta, total_venta, costo, margen, medio_pago } = req.body;

    const conn = await pool.getConnection();
    const result = await conn.execute(
      'INSERT INTO ventas (fecha, canal, sku, modelo, marca, cantidad, precio_venta, total_venta, costo, margen, medio_pago) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [fecha, canal, sku, modelo, marca, cantidad, precio_venta, total_venta, costo, margen, medio_pago]
    );
    conn.release();
    res.json({ id: result[0].insertId, mensaje: 'Venta registrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ventas', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM ventas ORDER BY fecha DESC LIMIT 100');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ventas/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM ventas WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ mensaje: 'Venta eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics
app.get('/api/analytics/canales', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute(`
      SELECT canal, COUNT(*) as items, SUM(total_venta) as ventas, SUM(costo) as costo, SUM(margen) as margen,
      ROUND(SUM(margen) / NULLIF(SUM(total_venta), 0) * 100, 2) as margen_pct,
      ROUND(AVG(total_venta), 2) as ticket_prom
      FROM ventas GROUP BY canal ORDER BY ventas DESC
    `);
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/meses', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute(`
      SELECT DATE_FORMAT(fecha, '%Y-%m') as mes, COUNT(*) as transacciones, SUM(total_venta) as ventas,
      SUM(costo) as costo, SUM(margen) as margen,
      ROUND(SUM(margen) / NULLIF(SUM(total_venta), 0) * 100, 2) as margen_pct
      FROM ventas GROUP BY DATE_FORMAT(fecha, '%Y-%m') ORDER BY mes DESC
    `);
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proyectos
app.post('/api/proyectos', upload.single('ruta_oc'), async (req, res) => {
  try {
    const { numero_oc, fecha_oc, cliente, descripcion, monto_total, monto_ejecutado, costo, condicion_pago } = req.body;
    const ruta_oc = req.file ? `/uploads/${req.file.filename}` : null;
    const conn = await pool.getConnection();
    const result = await conn.execute(
      'INSERT INTO proyectos (numero_oc, fecha_oc, cliente, descripcion, monto_total, monto_ejecutado, costo, condicion_pago, ruta_oc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [numero_oc, fecha_oc, cliente, descripcion, monto_total, monto_ejecutado || 0, costo || 0, condicion_pago || 'contado', ruta_oc]
    );
    conn.release();
    res.json({ id: result[0].insertId, mensaje: 'Proyecto creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/proyectos', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM proyectos ORDER BY fecha_oc DESC LIMIT 100');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/proyectos/:id', upload.single('ruta_oc'), async (req, res) => {
  try {
    const id = req.params.id;
    const conn = await pool.getConnection();

    if (req.file) {
      const ruta_oc = `/uploads/${req.file.filename}`;
      await conn.execute('UPDATE proyectos SET ruta_oc=? WHERE id=?', [ruta_oc, id]);
      conn.release();
      res.json({ id, mensaje: 'Proyecto actualizado' });
    } else {
      const { cliente, descripcion, monto_total, monto_ejecutado, costo, estado, condicion_pago } = req.body;
      let query = 'UPDATE proyectos SET cliente=?, descripcion=?, monto_total=?, monto_ejecutado=?, costo=?, estado=?, condicion_pago=? WHERE id=?';
      let params = [cliente, descripcion, monto_total, monto_ejecutado, costo || 0, estado, condicion_pago || 'contado', id];
      await conn.execute(query, params);
      conn.release();
      res.json({ id, mensaje: 'Proyecto actualizado' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/proyectos/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM proyectos WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ mensaje: 'Proyecto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gastos Fijos
app.get('/api/gastos-fijos', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM gastos_fijos ORDER BY ano DESC, mes DESC');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gastos-fijos', upload.single('ruta_comprobante'), async (req, res) => {
  try {
    const { mes, ano, descripcion, monto } = req.body;
    const ruta_comprobante = req.file ? `/uploads/${req.file.filename}` : null;
    const conn = await pool.getConnection();
    const result = await conn.execute(
      'INSERT INTO gastos_fijos (mes, ano, descripcion, monto, ruta_comprobante) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE monto=?, ruta_comprobante=?',
      [mes, ano, descripcion, monto, ruta_comprobante, monto, ruta_comprobante]
    );
    conn.release();
    res.json({ id: result[0].insertId, mensaje: 'Gasto fijo guardado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/gastos-fijos/:id', upload.single('ruta_comprobante'), async (req, res) => {
  try {
    const id = req.params.id;
    const conn = await pool.getConnection();

    if (req.file) {
      const ruta_comprobante = `/uploads/${req.file.filename}`;
      await conn.execute(
        'UPDATE gastos_fijos SET ruta_comprobante=? WHERE id=?',
        [ruta_comprobante, id]
      );
    } else {
      const { mes, ano, descripcion, monto } = req.body;
      await conn.execute(
        'UPDATE gastos_fijos SET mes=?, ano=?, descripcion=?, monto=? WHERE id=?',
        [mes, ano, descripcion, monto, id]
      );
    }
    conn.release();
    res.json({ id, mensaje: 'Gasto fijo actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gastos-fijos/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM gastos_fijos WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ mensaje: 'Gasto fijo eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pagos Pendientes
app.get('/api/pagos-pendientes', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM pagos_pendientes ORDER BY fecha_vencimiento ASC');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pagos-pendientes', async (req, res) => {
  try {
    const { factura_id, monto, fecha_vencimiento } = req.body;
    const conn = await pool.getConnection();
    const result = await conn.execute(
      'INSERT INTO pagos_pendientes (factura_id, monto, fecha_vencimiento) VALUES (?, ?, ?)',
      [factura_id, monto, fecha_vencimiento]
    );
    conn.release();
    res.json({ id: result[0].insertId, mensaje: 'Pago pendiente creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pagos-pendientes/:id', upload.single('ruta_comprobante_pago'), async (req, res) => {
  try {
    const id = req.params.id;
    const conn = await pool.getConnection();

    if (req.file) {
      const ruta_comprobante_pago = `/uploads/${req.file.filename}`;
      await conn.execute(
        'UPDATE pagos_pendientes SET ruta_comprobante_pago=?, estado=?, fecha_pago=NOW() WHERE id=?',
        [ruta_comprobante_pago, 'pagado', id]
      );
      conn.release();
      res.json({ id, mensaje: 'Pago actualizado' });
    } else {
      const { estado, metodo_pago } = req.body;
      await conn.execute(
        'UPDATE pagos_pendientes SET estado=?, metodo_pago=? WHERE id=?',
        [estado, metodo_pago, id]
      );
      conn.release();
      res.json({ id, mensaje: 'Pago actualizado' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pagos-pendientes/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM pagos_pendientes WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ mensaje: 'Pago eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Planilla
app.get('/api/planilla', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM planilla ORDER BY ano DESC, mes DESC');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/planilla', upload.single('ruta_recibo'), async (req, res) => {
  try {
    const { mes, ano, empleado, sueldo, bonificacion, descuentos } = req.body;
    const neto = (parseFloat(sueldo) + parseFloat(bonificacion) - parseFloat(descuentos)).toFixed(2);
    const ruta_recibo = req.file ? `/uploads/${req.file.filename}` : null;
    const conn = await pool.getConnection();
    const result = await conn.execute(
      'INSERT INTO planilla (mes, ano, empleado, sueldo, bonificacion, descuentos, neto, ruta_recibo) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE sueldo=?, bonificacion=?, descuentos=?, neto=?, ruta_recibo=?',
      [mes, ano, empleado, sueldo, bonificacion, descuentos, neto, ruta_recibo, sueldo, bonificacion, descuentos, neto, ruta_recibo]
    );
    conn.release();
    res.json({ id: result[0].insertId, mensaje: 'Planilla guardada', neto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/planilla/:id', upload.single('ruta_recibo'), async (req, res) => {
  try {
    const id = req.params.id;
    const conn = await pool.getConnection();

    if (req.file) {
      const ruta_recibo = `/uploads/${req.file.filename}`;
      await conn.execute(
        'UPDATE planilla SET ruta_recibo=? WHERE id=?',
        [ruta_recibo, id]
      );
      conn.release();
      res.json({ id, mensaje: 'Planilla actualizada' });
    } else {
      const { mes, ano, empleado, sueldo, bonificacion, descuentos } = req.body;
      const neto = (parseFloat(sueldo) + parseFloat(bonificacion) - parseFloat(descuentos)).toFixed(2);
      await conn.execute(
        'UPDATE planilla SET mes=?, ano=?, empleado=?, sueldo=?, bonificacion=?, descuentos=?, neto=? WHERE id=?',
        [mes, ano, empleado, sueldo, bonificacion, descuentos, neto, id]
      );
      conn.release();
      res.json({ id, mensaje: 'Planilla actualizada', neto });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/planilla/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM planilla WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ mensaje: 'Planilla eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download files
app.get('/uploads/:filename', (req, res) => {
  const file = path.join(uploadsDir, req.params.filename);
  res.download(file);
});

// Preview endpoint
app.get('/api/preview/:filename', (req, res) => {
  const file = path.join(uploadsDir, req.params.filename);
  res.sendFile(file);
});

// Error handlers
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 REVIONIX API - Puerto ${PORT}\n`);
});
