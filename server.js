const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${timestamp}${ext}`);
  }
});

const upload = multer({ storage });

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

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

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
    conn.release();
    console.log('✓ Tabla app_storage lista');
  } catch (err) {
    console.error('✗ initStorageTable:', err.message);
  }
}
initStorageTable();

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

async function guardarStorage(req, res) {
  try {
    const entries = Object.entries(req.body || {});
    if (entries.length === 0) return res.json({ guardadas: 0 });
    const conn = await pool.getConnection();
    for (const [clave, valor] of entries) {
      if (valor === null) {
        await conn.execute('DELETE FROM app_storage WHERE clave = ?', [clave]);
      } else {
        await conn.execute(
          'INSERT INTO app_storage (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
          [clave, String(valor)]
        );
      }
    }
    conn.release();
    res.json({ guardadas: entries.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
app.put('/api/storage', guardarStorage);
app.post('/api/storage', guardarStorage); // para navigator.sendBeacon al cerrar

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
    const { numero_oc, fecha_oc, cliente, descripcion, monto_total } = req.body;
    const ruta_oc = req.file ? `/uploads/${req.file.filename}` : null;
    const conn = await pool.getConnection();
    const result = await conn.execute(
      'INSERT INTO proyectos (numero_oc, fecha_oc, cliente, descripcion, monto_total, ruta_oc) VALUES (?, ?, ?, ?, ?, ?)',
      [numero_oc, fecha_oc, cliente, descripcion, monto_total, ruta_oc]
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
      const { cliente, descripcion, monto_total, monto_ejecutado, estado } = req.body;
      let query = 'UPDATE proyectos SET cliente=?, descripcion=?, monto_total=?, monto_ejecutado=?, estado=? WHERE id=?';
      let params = [cliente, descripcion, monto_total, monto_ejecutado, estado, id];
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
