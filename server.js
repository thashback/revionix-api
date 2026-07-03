const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectionLimit: 5,
  enableQueueing: true,
  waitForConnections: true
});

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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
