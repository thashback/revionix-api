# Add Product Inventory Management - Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` to implement this plan task-by-task.

**Goal:** Add a product inventory tracking system to monitor stock levels across all purchase channels.

**Architecture:** New database table `inventory` tracks product SKUs with buy/sell quantities. API endpoints for CRUD operations. Frontend shows stock levels with low-stock alerts.

**Tech Stack:** Node.js/Express, MySQL, Vanilla JS fetch API

## Global Constraints

- Node.js 18+
- MySQL 8.0+
- No external UI libraries (vanilla CSS only)
- No premature optimization
- TDD for all new code
- Atomic commits after each task

---

## Task 1: Add Inventory Schema

**Deliverable:** New `inventory` table in MySQL

**Steps:**

- [ ] Create schema migration: `docs/inventory-schema.sql`
  ```sql
  CREATE TABLE inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    producto VARCHAR(200) NOT NULL,
    marca VARCHAR(100),
    cantidad_total INT DEFAULT 0,
    cantidad_vendido INT DEFAULT 0,
    cantidad_disponible INT GENERATED ALWAYS AS (cantidad_total - cantidad_vendido),
    costo_unitario DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sku (sku)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ```
- [ ] Execute in Railway MySQL dashboard
- [ ] Verify table created: `SELECT * FROM inventory LIMIT 1`
- [ ] Commit: "Add inventory table schema"

## Task 2: Add Inventory API Endpoints

**Deliverable:** GET/POST/PUT endpoints in server.js

**Steps:**

- [ ] In server.js, add endpoint: `GET /api/inventory`
  - Query all inventory records
  - Return JSON array
  - Test with curl

- [ ] Add endpoint: `POST /api/inventory`
  - Accept: sku, producto, marca, cantidad_total, costo_unitario
  - Validate sku uniqueness
  - Return created record with id
  - Test with curl

- [ ] Add endpoint: `PUT /api/inventory/:sku`
  - Accept: cantidad_total, costo_unitario
  - Update existing SKU
  - Return updated record
  - Test with curl

- [ ] Add endpoint: `DELETE /api/inventory/:sku`
  - Remove inventory record
  - Return success message
  - Test with curl

- [ ] Commit: "Add inventory API endpoints"

## Task 3: Link Inventory to Sales

**Deliverable:** Automatic inventory updates when sales recorded

**Steps:**

- [ ] Modify `POST /api/ventas` to:
  - Extract sku from request
  - Check inventory exists
  - Increment cantidad_vendido
  - Verify cantidad_disponible >= 0
  - Return error if insufficient stock

- [ ] Add validation test (example):
  ```javascript
  // Pseudo-test
  1. Create inventory: sku=APPLE-1, cantidad_total=100
  2. Record sale: sku=APPLE-1, cantidad=50
  3. Verify inventory: cantidad_disponible should be 50
  4. Record sale: sku=APPLE-1, cantidad=60 (should fail)
  ```

- [ ] Test scenarios:
  - Normal sale updates inventory ✓
  - Oversell prevented ✓
  - Non-existent SKU handled ✓

- [ ] Commit: "Link inventory to sales with validation"

## Task 4: Add Frontend Inventory Page

**Deliverable:** UI page showing stock levels

**Steps:**

- [ ] In index.html, add page:
  ```html
  <div class="page" id="page-inventory">
    <div class="page-title">Inventario de Productos</div>
    <button class="btn btn-success" onclick="addProduct()">+ Nuevo Producto</button>
    <table id="tbl-inventory">
      <thead>
        <tr><th>SKU</th><th>Producto</th><th>Marca</th><th>Total</th><th>Vendido</th><th>Disponible</th><th>Costo Unit.</th><th></th></tr>
      </thead>
      <tbody id="tbl-inventory-body"></tbody>
    </table>
  </div>
  ```

- [ ] In app.js, add:
  ```javascript
  function loadInventory() {
    fetch(`${API_BASE}/inventory`)
      .then(res => res.json())
      .then(data => renderInventory(data))
      .catch(err => console.error('Error:', err));
  }

  function renderInventory(items) {
    const tbody = document.getElementById('tbl-inventory-body');
    tbody.innerHTML = '';
    
    items.forEach(item => {
      const row = document.createElement('tr');
      const alertColor = item.cantidad_disponible < 10 ? '#ffcccc' : '';
      row.style.backgroundColor = alertColor;
      row.innerHTML = `
        <td>${item.sku}</td>
        <td>${item.producto}</td>
        <td>${item.marca || '-'}</td>
        <td>${item.cantidad_total}</td>
        <td>${item.cantidad_vendido}</td>
        <td><strong>${item.cantidad_disponible}</strong></td>
        <td>S/. ${item.costo_unitario.toFixed(2)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteInventory('${item.sku}')">🗑️</button></td>
      `;
      tbody.appendChild(row);
    });
  }

  function addProduct() {
    // Modal form to create new inventory
  }
  ```

- [ ] Add nav item in sidebar:
  ```html
  <div class="nav-item" onclick="goPage('inventory')" data-page="inventory">Inventario</div>
  ```

- [ ] Test:
  - Load inventory page shows records
  - Low stock (<10) highlighted in red
  - Delete button removes record

- [ ] Commit: "Add inventory frontend page"

## Task 5: Add Low-Stock Alerts

**Deliverable:** Dashboard alerts for low inventory

**Steps:**

- [ ] Create function in app.js:
  ```javascript
  function checkLowStock() {
    fetch(`${API_BASE}/inventory?warning=true`)
      .then(res => res.json())
      .then(items => {
        if (items.length > 0) {
          const msg = `⚠️ ${items.length} productos con stock bajo`;
          document.getElementById('hdr-badge').textContent = msg;
        }
      });
  }
  ```

- [ ] Call on dashboard load
- [ ] Test:
  - Create inventory with cantidad_disponible < 10
  - Dashboard shows warning badge

- [ ] Commit: "Add low-stock warnings"

## Task 6: Integration Testing

**Deliverable:** Full workflow test

**Steps:**

- [ ] Test complete flow:
  1. Create product: sku=TEST-001, qty=50, cost=S/. 20
  2. Record sale: qty=30 from TEST-001
  3. Verify inventory: available = 20
  4. Check dashboard alert (none if > 10)
  5. Record another sale: qty=15
  6. Check dashboard alert (warning badge)
  7. Try oversell (qty=100) - should fail

- [ ] Verify:
  - All endpoints work ✓
  - Stock calculations correct ✓
  - Alerts trigger properly ✓
  - Frontend UI updates ✓

- [ ] Commit: "Integration test inventory system"

---

## Verification Checklist

- [ ] All CRUD endpoints work via curl
- [ ] Frontend page loads and displays data
- [ ] Stock levels update after sales
- [ ] Overselling prevented
- [ ] Low-stock alerts appear
- [ ] Database queries use connection pool
- [ ] No SQL injection vulnerabilities
- [ ] Code follows project standards
- [ ] All commits are atomic and clear

---

## Notes

- Inventory is stock LEVEL tracking, not transaction history
- `cantidad_disponible` is calculated, not stored
- Sales auto-decrement inventory (cascade)
- Low-stock threshold is 10 units (editable)
- SKU must be unique per product
