# PHASE 2: REVIONIX Complete Enhancement - Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` to implement this plan in parallel.

**Goal:** Extend REVIONIX with advanced features: Projects/OC management, enhanced file uploads, editable modules (gastos fijos, planilla), payment tracking, and XML viewers across all modules.

**Architecture:** 
- New "proyectos" table for project/OC management
- Enhanced file upload system for all modules
- Editable monthly data (gastos_fijos, planilla, pagos_pendientes)
- Desglose views with detailed transaction breakdowns
- XML viewers integrated in every section

**Tech Stack:** Node.js/Express, MySQL, Vanilla JS

---

## Global Constraints

- Node.js 18+
- MySQL 8.0+
- File uploads: PDF, XML, JPG, PNG, DOCX (max 50MB)
- All months editable and saveable
- No external UI libraries (vanilla CSS)
- TDD for API endpoints
- Atomic git commits per task

---

# MODULE 1: PROYECTOS (Projects/OC Management)

## Task 1.1: Database Schema for Proyectos

**Deliverable:** New `proyectos` table with relationships

**Steps:**

- [ ] Create schema migration:
  ```sql
  CREATE TABLE proyectos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_oc VARCHAR(50) UNIQUE NOT NULL,
    fecha_oc DATE NOT NULL,
    cliente VARCHAR(200) NOT NULL,
    descripcion TEXT,
    monto_total DECIMAL(12,2),
    monto_ejecutado DECIMAL(12,2) DEFAULT 0,
    estado ENUM('pendiente', 'en_proceso', 'completado', 'cancelado') DEFAULT 'pendiente',
    ruta_oc VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_numero_oc (numero_oc),
    INDEX idx_fecha_oc (fecha_oc),
    INDEX idx_estado (estado)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ```
- [ ] Execute in Railway MySQL
- [ ] Verify table created
- [ ] Commit: "Add proyectos table schema"

## Task 1.2: CRUD API Endpoints for Proyectos

**Deliverable:** Complete REST API for projects

**Steps:**

- [ ] POST /api/proyectos
  - Accept: numero_oc, fecha_oc, cliente, descripcion, monto_total, file (OC PDF/XML)
  - Save file to /uploads/
  - Return created record with id
  - Test with curl

- [ ] GET /api/proyectos
  - Return all projects with file info
  - Test with curl

- [ ] GET /api/proyectos/:id
  - Return single project details
  - Test with curl

- [ ] PUT /api/proyectos/:id
  - Accept: client, description, monto_total, new file (optional)
  - Update record
  - Handle file replacement
  - Test with curl

- [ ] PUT /api/proyectos/:id/estado
  - Accept: estado (pendiente|en_proceso|completado|cancelado)
  - Update status
  - Test with curl

- [ ] DELETE /api/proyectos/:id
  - Remove project and associated files
  - Test with curl

- [ ] Commit: "Add proyectos CRUD API endpoints"

## Task 1.3: Frontend Page for Proyectos

**Deliverable:** UI page with project listing and OC viewer

**Steps:**

- [ ] Add to HTML:
  ```html
  <div class="page" id="page-proyectos">
    <div class="page-title">📋 Proyectos / OC</div>
    <button class="btn btn-success" onclick="openAddProyecto()">➕ Nuevo Proyecto</button>
    <table id="tbl-proyectos">
      <thead>
        <tr><th>OC #</th><th>Cliente</th><th>Fecha</th><th>Monto</th><th>Ejecutado</th><th>Estado</th><th>OC</th><th></th></tr>
      </thead>
      <tbody id="tbl-proyectos-body"></tbody>
    </table>
  </div>
  ```

- [ ] In app.js add:
  ```javascript
  async function loadProyectos() {
    const proyectos = await fetch(`${API_BASE}/proyectos`).then(r => r.json());
    renderProyectos(proyectos);
  }

  function renderProyectos(proyectos) {
    const tbody = document.getElementById('tbl-proyectos-body');
    tbody.innerHTML = '';
    proyectos.forEach(p => {
      const row = document.createElement('tr');
      const pct = p.monto_total > 0 ? ((p.monto_ejecutado / p.monto_total) * 100).toFixed(0) : 0;
      row.innerHTML = `
        <td><strong>${p.numero_oc}</strong></td>
        <td>${p.cliente}</td>
        <td>${new Date(p.fecha_oc).toLocaleDateString('es-ES')}</td>
        <td>S/. ${p.monto_total.toFixed(2)}</td>
        <td>S/. ${p.monto_ejecutado.toFixed(2)} (${pct}%)</td>
        <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
        <td>
          ${p.ruta_oc ? `<button onclick="viewFile('${p.ruta_oc}')">📄 Ver</button>` : '❌'}
        </td>
        <td>
          <button onclick="editProyecto(${p.id})">✏️</button>
          <button onclick="deleteProyecto(${p.id})">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
  ```

- [ ] Add nav item in sidebar to proyectos
- [ ] Test page loads and displays projects
- [ ] Commit: "Add proyectos frontend page"

---

# MODULE 2: Enhanced File Upload System

## Task 2.1: Add File Upload to Gastos

**Deliverable:** File upload buttons and storage for gastos

**Steps:**

- [ ] In renderGastos(), add upload button for each gasto
- [ ] Create uploadGastoFile() function
- [ ] Test file upload and preview
- [ ] Commit: "Add file upload to gastos"

## Task 2.2: Add File Upload to Movilidad

**Deliverable:** Upload support for movilidad records

**Steps:**

- [ ] Create movilidad API endpoints (GET, POST, PUT with file)
- [ ] Add movilidad UI page
- [ ] Implement file upload/preview
- [ ] Commit: "Add movilidad module with file upload"

## Task 2.3: Add File Upload to Gastos Fijos

**Deliverable:** Editable monthly gastos fijos with file support

**Steps:**

- [ ] Create gastos_fijos table:
  ```sql
  CREATE TABLE gastos_fijos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mes INT,
    ano INT,
    descripcion VARCHAR(200),
    monto DECIMAL(10,2),
    ruta_comprobante VARCHAR(255),
    created_at TIMESTAMP,
    UNIQUE(mes, ano, descripcion),
    INDEX idx_mes_ano (mes, ano)
  );
  ```

- [ ] Create CRUD endpoints
- [ ] Add UI with monthly grid (12 columns = 12 months)
- [ ] Allow inline editing and saving per month
- [ ] Support file upload per line item
- [ ] Commit: "Add gastos_fijos module with monthly editing"

---

# MODULE 3: Desglose Views & Enhanced Analytics

## Task 3.1: Ventas por Canal Desglose

**Deliverable:** Clickable channel rows that show transaction detail

**Steps:**

- [ ] In renderCanales(), make rows clickable
- [ ] Create expandirCanal(canal) function
- [ ] Fetch /api/analytics/canal-detalle/:canal
- [ ] Show modal with detailed transactions for that channel
- [ ] Test clickability and data display
- [ ] Commit: "Add ventas channel desglose modal"

## Task 3.2: Mes a Mes Enhanced View

**Deliverable:** Show cost of goods sold and purchase invoice numbers per month

**Steps:**

- [ ] Modify renderMeses() to include:
  - Costo de compra (from compras table, matched by date/product)
  - Número de factura de compra
  - Breakdown by product SKU

- [ ] Create JOIN query in server.js:
  ```sql
  SELECT 
    DATE_FORMAT(v.fecha, '%Y-%m') as mes,
    v.sku,
    v.modelo,
    c.numero_factura,
    SUM(v.total_venta) as ventas,
    SUM(v.costo) as costo_venta
  FROM ventas v
  LEFT JOIN compras c ON v.marca = c.marca AND v.fecha >= c.fecha
  GROUP BY mes, v.sku, v.modelo, c.numero_factura
  ```

- [ ] Render in table with factura numbers visible
- [ ] Allow expand to see product breakdown
- [ ] Commit: "Enhance mes a mes view with cost and factura"

---

# MODULE 4: Pagos Pendientes Enhancement

## Task 4.1: Pagos Pendientes Tracking

**Deliverable:** Track pending payments with proof of payment upload

**Steps:**

- [ ] Create pagos_pendientes table:
  ```sql
  CREATE TABLE pagos_pendientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    factura_id INT,
    monto DECIMAL(10,2),
    fecha_vencimiento DATE,
    estado ENUM('pendiente', 'pagado', 'cancelado') DEFAULT 'pendiente',
    ruta_comprobante_pago VARCHAR(255),
    fecha_pago DATE,
    metodo_pago VARCHAR(50),
    created_at TIMESTAMP,
    FOREIGN KEY (factura_id) REFERENCES compras(id)
  );
  ```

- [ ] Create /api/pagos-pendientes endpoints
- [ ] Add uploadProofOfPayment() function
- [ ] When file uploaded, set estado='pagado' and fecha_pago=today
- [ ] Show unpaid only in default view, with "Mark Paid" option
- [ ] Commit: "Add pagos_pendientes tracking with proof upload"

---

# MODULE 5: XML Viewers Across Modules

## Task 5.1: Universal XML Viewer

**Deliverable:** Reusable XML viewer component for all modules

**Steps:**

- [ ] Create viewXML(rutaXml) function that:
  - Fetches XML file
  - Parses with DOMParser
  - Shows structured view
  - Allows download
  - Highlights important fields (monto, fecha, RUC, etc)

- [ ] Integrate into:
  - Compras detail modal
  - Gastos detail modal
  - Proyectos detail modal
  - Any module with file support

- [ ] Test with sample XML files
- [ ] Commit: "Add universal XML viewer component"

---

# MODULE 6: Planilla (Payroll) Module

## Task 6.1: Planilla Database & API

**Deliverable:** Monthly editable payroll tracking

**Steps:**

- [ ] Create planilla table:
  ```sql
  CREATE TABLE planilla (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mes INT,
    ano INT,
    empleado VARCHAR(100),
    sueldo DECIMAL(10,2),
    bonificacion DECIMAL(10,2),
    descuentos DECIMAL(10,2),
    neto DECIMAL(10,2),
    ruta_recibo VARCHAR(255),
    created_at TIMESTAMP,
    UNIQUE(mes, ano, empleado),
    INDEX idx_mes_ano (mes, ano)
  );
  ```

- [ ] Create CRUD endpoints with file upload
- [ ] Add UI: 12-month grid, editable cells
- [ ] Support file upload (recibo por honorarios)
- [ ] Calculate neto automatically
- [ ] Commit: "Add planilla module with monthly editing"

---

# MODULE 7: Integration & Polish

## Task 7.1: Update Dashboard

**Deliverable:** Dashboard reflects new modules and data

**Steps:**

- [ ] Add proyectos KPI: Total OC in progress
- [ ] Add gastos fijos total for current month
- [ ] Add pagos pendientes count
- [ ] Add planilla total for current month
- [ ] Update sidebar to include new nav items
- [ ] Commit: "Update dashboard with new module KPIs"

## Task 7.2: Testing & QA

**Deliverable:** All modules tested and working

**Steps:**

- [ ] Test file upload flow for each module
- [ ] Test XML viewer
- [ ] Test monthly editing (gastos fijos, planilla)
- [ ] Test payment marking as paid
- [ ] Test desglose modals (channel, products)
- [ ] Verify all data persists in MySQL
- [ ] Commit: "Complete testing for all modules"

---

## Verification Checklist

- [ ] All new tables created in MySQL
- [ ] All CRUD endpoints working via curl
- [ ] File uploads work for all modules
- [ ] XML viewer displays correctly
- [ ] Monthly editing saves to database
- [ ] Payment status updates when file uploaded
- [ ] Desglose modals show correct data
- [ ] Dashboard shows all new data
- [ ] All files download/preview correctly
- [ ] UI matches existing design

---

## Estimated Timeline

- Module 1 (Proyectos): 2-3 hours
- Module 2 (File uploads): 1-2 hours
- Module 3 (Desglose): 1.5-2 hours
- Module 4 (Pagos pendientes): 1-1.5 hours
- Module 5 (XML viewers): 1 hour
- Module 6 (Planilla): 1.5-2 hours
- Module 7 (Integration): 1-1.5 hours

**Total: 10-14 hours of work**

With subagent-driven-development: **2-3 hours parallel execution**

---

## Next Step

Run in Claude Code:
```
Implementa este plan usando subagent-driven-development
```

Claude will:
1. Divide trabajo en tareas paralelas
2. Crear múltiples agentes para cada módulo
3. Coordinar resultados
4. Hacer commits atómicos
5. Reportar progreso
