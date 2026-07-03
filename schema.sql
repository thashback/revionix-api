-- REVIONIX - Esquema de Base de Datos MySQL
-- Crear tablas para gestión de compras, gastos, ventas, y movilidad

CREATE TABLE IF NOT EXISTS compras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_factura VARCHAR(50) UNIQUE NOT NULL,
  fecha DATE NOT NULL,
  proveedor VARCHAR(150),
  descripcion VARCHAR(300),
  marca VARCHAR(100),
  cantidad INT,
  moneda VARCHAR(10),
  precio_usd DECIMAL(10, 2),
  precio_sol DECIMAL(10, 2),
  total_sol DECIMAL(10, 2),
  ruta_comprobante VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fecha (fecha),
  INDEX idx_marca (marca)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gastos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL,
  tipo_comprobante VARCHAR(50),
  serie VARCHAR(50),
  numero VARCHAR(50),
  categoria VARCHAR(100),
  canal VARCHAR(100),
  descripcion VARCHAR(300),
  responsable VARCHAR(100),
  monto DECIMAL(10, 2),
  ruta_comprobante VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fecha (fecha),
  INDEX idx_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL,
  canal VARCHAR(100),
  sku VARCHAR(100),
  modelo VARCHAR(100),
  marca VARCHAR(100),
  cantidad INT,
  precio_venta DECIMAL(10, 2),
  total_venta DECIMAL(10, 2),
  costo DECIMAL(10, 2),
  margen DECIMAL(10, 2),
  medio_pago VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fecha (fecha),
  INDEX idx_canal (canal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movilidad (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL,
  descripcion VARCHAR(300),
  monto DECIMAL(10, 2),
  ruta_comprobante VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
