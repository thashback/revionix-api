// ═══════════════════════════════════════════════════════════════
// FUNCIONES GLOBALES Y CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const API_BASE = (() => {
  const isDevelopment = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';

  if (isDevelopment) {
    return 'http://localhost:3000/api';
  } else {
    return `${window.location.protocol}//${window.location.host}/api`;
  }
})();

console.log(`[APP] API Base URL: ${API_BASE}`);
console.log(`[APP] Environment: ${API_BASE.includes('localhost') ? 'development' : 'production'}`);

let currentUser = localStorage.getItem('currentUser') || '';
let currentPage = 'dashboard';

// ═══════════════════════════════════════════════════════════════
// LOGIN Y AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════
function doLogin() {
  const user = document.getElementById('login-user').value;
  const pass = document.getElementById('login-pass').value;

  if (user && pass) {
    localStorage.setItem('currentUser', user);
    currentUser = user;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('hdr-user').textContent = `👤 ${user}`;
    updateDateTime();
    loadDashboard();
  } else {
    document.getElementById('login-error').textContent = 'Usuario o contraseña inválidos';
  }
}

function doLogout() {
  localStorage.removeItem('currentUser');
  currentUser = '';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}

function updateDateTime() {
  const now = new Date();
  const formatted = now.toLocaleDateString('es-ES', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
  document.getElementById('hdr-fecha').textContent = formatted;
}

setInterval(updateDateTime, 60000);

// ═══════════════════════════════════════════════════════════════
// NAVEGACIÓN DE PÁGINAS
// ═══════════════════════════════════════════════════════════════
function goPage(pageName) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.getElementById(`page-${pageName}`).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

  currentPage = pageName;

  switch (pageName) {
    case 'dashboard': loadDashboard(); break;
    case 'compras': loadCompras(); break;
    case 'gastos': loadGastos(); break;
    case 'canales': loadCanales(); break;
    case 'meses': loadMeses(); break;
    case 'detalle': loadDetalle(); break;
  }
}

// ═══════════════════════════════════════════════════════════════
// MODAL PARA VER COMPROBANTES
// ═══════════════════════════════════════════════════════════════
function viewComprobante(rutaComprobante, fileName) {
  if (!rutaComprobante) {
    alert('No hay comprobante disponible');
    return;
  }

  const ext = rutaComprobante.split('.').pop().toLowerCase();

  if (ext === 'xml') {
    viewXMLComprobante(rutaComprobante);
  } else if (ext === 'pdf' || ext === 'jpg' || ext === 'png' || ext === 'jpeg') {
    window.open(rutaComprobante, '_blank');
  } else {
    alert('Tipo de archivo no soportado: ' + ext);
  }
}

function viewXMLComprobante(rutaXml) {
  fetch(rutaXml)
    .then(res => res.text())
    .then(xmlText => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const fecha = xmlDoc.querySelector('FechaEmision')?.textContent || 'N/A';
      const emisor = xmlDoc.querySelector('EmisorNombre')?.textContent || 'N/A';
      const total = xmlDoc.querySelector('Total')?.textContent || 'N/A';
      const comprobante = xmlDoc.querySelector('Correlativo')?.textContent || 'N/A';

      let html = `
        <div style="padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3>📄 Detalles del Comprobante XML</h3>
          <p><strong>Comprobante:</strong> ${comprobante}</p>
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Emisor:</strong> ${emisor}</p>
          <p><strong>Total:</strong> S/. ${total}</p>
          <button onclick="downloadXML('${rutaXml}')" class="btn btn-sm btn-info">Descargar XML</button>
        </div>
      `;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Comprobante XML</span>
            <button style="background: none; border: none; font-size: 24px; cursor: pointer;" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body">${html}</div>
        </div>
      `;
      document.body.appendChild(modal);
    })
    .catch(err => {
      console.error('Error al leer XML:', err);
      alert('Error al leer el comprobante XML');
    });
}

function downloadXML(url) {
  const a = document.createElement('a');
  a.href = url;
  a.download = url.split('/').pop();
  a.click();
}

// ═══════════════════════════════════════════════════════════════
// COMPRAS
// ═══════════════════════════════════════════════════════════════
function loadCompras() {
  fetch(`${API_BASE}/compras`)
    .then(res => res.json())
    .then(data => renderCompras(data))
    .catch(err => {
      console.error('Error:', err);
      document.getElementById('tbl-compras-body').innerHTML = '<tr><td colspan="10">Error al cargar datos</td></tr>';
    });
}

function renderCompras(compras) {
  const tbody = document.getElementById('tbl-compras-body');
  tbody.innerHTML = '';

  compras.forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${c.proveedor}</td>
      <td>${new Date(c.fecha).toLocaleDateString('es-ES')}</td>
      <td>${c.descripcion || '-'}</td>
      <td>${c.marca || '-'}</td>
      <td>${c.cantidad || '-'}</td>
      <td>${c.moneda}</td>
      <td>${c.precio_usd || '-'}</td>
      <td>${c.precio_sol || '-'}</td>
      <td><strong>S/. ${(c.total_sol || 0).toFixed(2)}</strong></td>
      <td>
        ${c.ruta_comprobante ? `<button class="btn btn-sm btn-info" onclick="viewComprobante('${c.ruta_comprobante}')">👁️ Ver</button>` : '-'}
        <button class="btn btn-sm btn-danger" onclick="deleteCompra(${c.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function addNewCompra() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="width: 90%; max-width: 600px;">
      <div class="modal-header">
        <span class="modal-title">Registrar Nueva Compra</span>
        <button style="background: none; border: none; font-size: 24px; cursor: pointer;" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <input type="text" id="c-factura" placeholder="Número de Factura" required />
        <input type="date" id="c-fecha" required />
        <input type="text" id="c-proveedor" placeholder="Proveedor" />
        <input type="text" id="c-descripcion" placeholder="Descripción" />
        <input type="text" id="c-marca" placeholder="Marca" />
        <input type="number" id="c-cantidad" placeholder="Cantidad" />
        <select id="c-moneda"><option value="USD">USD</option><option value="SOL">SOL</option></select>
        <input type="number" id="c-precio-usd" placeholder="Precio USD" step="0.01" />
        <input type="number" id="c-precio-sol" placeholder="Precio SOL" step="0.01" />
        <input type="number" id="c-total-sol" placeholder="Total SOL" step="0.01" required />
        <input type="file" id="c-comprobante" accept=".pdf,.xml,.jpg,.png" />
        <small>📎 PDF, XML, JPG o PNG</small>
      </div>
      <div class="modal-footer">
        <button onclick="saveCompra()" class="btn btn-success">Guardar Compra</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveCompra() {
  const formData = new FormData();
  formData.append('numero_factura', document.getElementById('c-factura').value);
  formData.append('fecha', document.getElementById('c-fecha').value);
  formData.append('proveedor', document.getElementById('c-proveedor').value);
  formData.append('descripcion', document.getElementById('c-descripcion').value);
  formData.append('marca', document.getElementById('c-marca').value);
  formData.append('cantidad', document.getElementById('c-cantidad').value);
  formData.append('moneda', document.getElementById('c-moneda').value);
  formData.append('precio_usd', document.getElementById('c-precio-usd').value);
  formData.append('precio_sol', document.getElementById('c-precio-sol').value);
  formData.append('total_sol', document.getElementById('c-total-sol').value);

  const file = document.getElementById('c-comprobante').files[0];
  if (file) {
    formData.append('comprobante', file);
  }

  fetch(`${API_BASE}/compras`, {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      alert('Compra registrada exitosamente');
      document.querySelector('.modal-overlay').remove();
      loadCompras();
    })
    .catch(err => {
      console.error('Error:', err);
      alert('Error al guardar compra');
    });
}

function deleteCompra(id) {
  if (confirm('¿Eliminar esta compra?')) {
    fetch(`${API_BASE}/compras/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => loadCompras())
      .catch(err => console.error('Error:', err));
  }
}

// ═══════════════════════════════════════════════════════════════
// GASTOS
// ═══════════════════════════════════════════════════════════════
function loadGastos() {
  fetch(`${API_BASE}/gastos`)
    .then(r => r.json())
    .then(gastos => renderGastos(gastos))
    .catch(err => console.error('Error:', err));
}

function renderGastos(items) {
  const tbody = document.getElementById('tbl-gastos-body');
  tbody.innerHTML = '';

  items.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(item.fecha).toLocaleDateString('es-ES')}</td>
      <td>${item.tipo_comprobante || '-'}</td>
      <td>${item.serie || '-'}</td>
      <td>${item.numero || '-'}</td>
      <td>${item.categoria}</td>
      <td>${item.canal || '-'}</td>
      <td>${item.descripcion}</td>
      <td>${item.responsable || '-'}</td>
      <td><strong>S/. ${(item.monto || 0).toFixed(2)}</strong></td>
      <td>
        ${item.ruta_comprobante ? `<button class="btn btn-sm btn-info" onclick="viewComprobante('${item.ruta_comprobante}')">👁️</button>` : '-'}
        <button class="btn btn-sm btn-danger" onclick="deleteGasto(${item.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function saveGasto() {
  const fecha = document.getElementById('g-fecha').value;
  const categoria = document.getElementById('g-cat').value;
  const descripcion = document.getElementById('g-desc').value;
  const monto = document.getElementById('g-monto').value;
  const tipo = document.getElementById('g-tipo').value;

  if (!fecha || !descripcion || !monto) {
    alert('Por favor completa los campos requeridos');
    return;
  }

  const formData = new FormData();
  formData.append('fecha', fecha);
  formData.append('categoria', categoria);
  formData.append('descripcion', descripcion);
  formData.append('monto', monto);
  formData.append('tipo_comprobante', tipo);

  fetch(`${API_BASE}/gastos`, {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      alert('Gasto registrado');
      document.getElementById('g-fecha').value = '';
      document.getElementById('g-desc').value = '';
      document.getElementById('g-monto').value = '';
      loadGastos();
    })
    .catch(err => alert('Error: ' + err.message));
}

function deleteGasto(id) {
  if (confirm('¿Eliminar este gasto?')) {
    fetch(`${API_BASE}/gastos/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => loadGastos())
      .catch(err => console.error('Error:', err));
  }
}

// ═══════════════════════════════════════════════════════════════
// VENTAS
// ═══════════════════════════════════════════════════════════════
function loadVentas() {
  fetch(`${API_BASE}/ventas`)
    .then(res => res.json())
    .then(data => renderVentas(data))
    .catch(err => console.error('Error:', err));
}

function renderVentas(ventas) {
  const tbody = document.getElementById('tbl-detalle-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  ventas.forEach(v => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${v.id}</td>
      <td>-</td>
      <td>-</td>
      <td>${v.canal}</td>
      <td>${new Date(v.fecha).toLocaleDateString('es-ES')}</td>
      <td>${v.modelo || '-'}</td>
      <td>${v.marca || '-'}</td>
      <td>${v.cantidad || 1}</td>
      <td>S/. ${v.precio_venta}</td>
      <td>S/. ${(v.costo || 0).toFixed(2)}</td>
      <td>S/. ${(v.margen || 0).toFixed(2)}</td>
      <td>${v.margen ? ((v.margen / v.total_venta * 100).toFixed(2) + '%') : '-'}</td>
      <td>${v.medio_pago || '-'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteVenta(${v.id})">🗑️</button></td>
    `;
    tbody.appendChild(row);
  });
}

function saveVenta() {
  const data = {
    fecha: document.getElementById('v-fecha').value,
    canal: document.getElementById('v-canal').value,
    modelo: document.getElementById('v-modelo').value,
    precio_venta: parseFloat(document.getElementById('v-venta').value),
    total_venta: parseFloat(document.getElementById('v-venta').value),
    costo: parseFloat(document.getElementById('v-costo').value),
    margen: parseFloat(document.getElementById('v-venta').value) - parseFloat(document.getElementById('v-costo').value),
    cantidad: 1
  };

  fetch(`${API_BASE}/ventas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(() => {
      alert('Venta registrada');
      document.getElementById('modal-venta').style.display = 'none';
      loadVentas();
    })
    .catch(err => alert('Error: ' + err.message));
}

function deleteVenta(id) {
  if (confirm('¿Eliminar esta venta?')) {
    fetch(`${API_BASE}/ventas/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => loadVentas())
      .catch(err => console.error('Error:', err));
  }
}

// ═══════════════════════════════════════════════════════════════
// ANÁLISIS
// ═══════════════════════════════════════════════════════════════
function loadCanales() {
  fetch(`${API_BASE}/analytics/canales`)
    .then(res => res.json())
    .then(data => renderCanales(data))
    .catch(err => console.error('Error:', err));
}

function renderCanales(canales) {
  const tbody = document.getElementById('tbl-canales-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  canales.forEach(c => {
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <td><strong>${c.canal} 📊</strong></td>
      <td>S/. ${c.ventas.toFixed(2)}</td>
      <td>S/. ${c.costo.toFixed(2)}</td>
      <td>S/. ${c.margen.toFixed(2)}</td>
      <td>${c.margen_pct}%</td>
      <td>${c.items}</td>
      <td>S/. ${c.ticket_prom.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

function loadMeses() {
  fetch(`${API_BASE}/analytics/meses`)
    .then(res => res.json())
    .then(data => renderMeses(data))
    .catch(err => console.error('Error:', err));
}

function renderMeses(meses) {
  const tbody = document.getElementById('tbl-meses-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  meses.forEach(m => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${m.mes}</td>
      <td>S/. ${m.ventas.toFixed(2)}</td>
      <td>S/. ${m.costo.toFixed(2)}</td>
      <td>S/. ${m.margen.toFixed(2)}</td>
      <td>${m.margen_pct}%</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
    `;
    tbody.appendChild(row);
  });
}

function loadDetalle() {
  fetch(`${API_BASE}/ventas`)
    .then(res => res.json())
    .then(data => renderDetalle(data))
    .catch(err => console.error('Error:', err));
}

function renderDetalle(ventas) {
  const tbody = document.getElementById('tbl-detalle-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  ventas.forEach(v => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${v.id}</td>
      <td>-</td>
      <td>-</td>
      <td>${v.canal}</td>
      <td>${new Date(v.fecha).toLocaleDateString('es-ES')}</td>
      <td>${v.modelo || '-'}</td>
      <td>${v.marca || '-'}</td>
      <td>${v.cantidad || 1}</td>
      <td>S/. ${v.precio_venta.toFixed(2)}</td>
      <td>S/. ${(v.costo || 0).toFixed(2)}</td>
      <td>S/. ${(v.margen || 0).toFixed(2)}</td>
      <td>${v.total_venta > 0 ? ((v.margen / v.total_venta * 100).toFixed(2) + '%') : '-'}</td>
      <td>-</td>
      <td></td>
    `;
    tbody.appendChild(row);
  });
}

function loadDashboard() {
  Promise.all([
    fetch(`${API_BASE}/ventas`).then(r => r.json()),
    fetch(`${API_BASE}/compras`).then(r => r.json()),
    fetch(`${API_BASE}/gastos`).then(r => r.json())
  ])
    .then(([ventas, compras, gastos]) => {
      const totalVentas = ventas.reduce((sum, v) => sum + v.total_venta, 0);
      const totalCompras = compras.reduce((sum, c) => sum + c.total_sol, 0);
      const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

      document.getElementById('page-dashboard').innerHTML = `
        <div class="page-title">Dashboard Ejecutivo</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; color: #2e7d32; font-weight: bold;">S/. ${totalVentas.toFixed(2)}</div>
            <div style="color: #555; margin-top: 5px;">Total Ventas</div>
          </div>
          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; color: #e65100; font-weight: bold;">S/. ${totalCompras.toFixed(2)}</div>
            <div style="color: #555; margin-top: 5px;">Total Compras</div>
          </div>
          <div style="background: #ffebee; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; color: #c62828; font-weight: bold;">S/. ${totalGastos.toFixed(2)}</div>
            <div style="color: #555; margin-top: 5px;">Total Gastos</div>
          </div>
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; color: #0d47a1; font-weight: bold;">S/. ${(totalVentas - totalCompras - totalGastos).toFixed(2)}</div>
            <div style="color: #555; margin-top: 5px;">Margen Neto</div>
          </div>
        </div>
      `;
    })
    .catch(err => console.error('Error:', err));
}

window.addEventListener('load', () => {
  if (currentUser) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('hdr-user').textContent = `👤 ${currentUser}`;
    updateDateTime();
  }
});
