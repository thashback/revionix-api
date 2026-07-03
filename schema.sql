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

CREATE TABLE IF NOT EXISTS proyectos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_oc VARCHAR(50) UNIQUE NOT NULL,
  fecha_oc DATE NOT NULL,
  cliente VARCHAR(200) NOT NULL,
  descripcion TEXT,
  monto_total DECIMAL(12,2),
  monto_ejecutado DECIMAL(12,2) DEFAULT 0,
  costo DECIMAL(12,2) DEFAULT 0,
  condicion_pago VARCHAR(20) DEFAULT 'contado',
  estado ENUM('pendiente','en_proceso','completado','cancelado') DEFAULT 'pendiente',
  ruta_oc VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_numero_oc (numero_oc),
  INDEX idx_fecha_oc (fecha_oc),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gastos_fijos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mes INT NOT NULL,
  ano INT NOT NULL,
  descripcion VARCHAR(200) NOT NULL,
  monto DECIMAL(10,2),
  ruta_comprobante VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_mes_desc (mes, ano, descripcion),
  INDEX idx_mes_ano (mes, ano)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pagos_pendientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  factura_id INT,
  monto DECIMAL(10,2),
  fecha_vencimiento DATE,
  estado ENUM('pendiente','pagado','cancelado') DEFAULT 'pendiente',
  ruta_comprobante_pago VARCHAR(255),
  fecha_pago DATE,
  metodo_pago VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estado (estado),
  INDEX idx_factura_id (factura_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS planilla (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mes INT NOT NULL,
  ano INT NOT NULL,
  empleado VARCHAR(100) NOT NULL,
  sueldo DECIMAL(10,2),
  bonificacion DECIMAL(10,2) DEFAULT 0,
  descuentos DECIMAL(10,2) DEFAULT 0,
  neto DECIMAL(10,2),
  ruta_recibo VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_mes_emp (mes, ano, empleado),
  INDEX idx_mes_ano (mes, ano)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
