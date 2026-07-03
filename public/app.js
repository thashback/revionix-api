// REVIONIX - Full Functional App v2 with Complete Upload & Preview System
const API_BASE = (() => {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isDev ? 'http://localhost:8080/api' : `${window.location.protocol}//${window.location.host}/api`;
})();

console.log('[APP] API Base:', API_BASE);

let currentUser = localStorage.getItem('currentUser') || '';
let currentPage = 'dashboard';

// ═══════════════════════════════════════════════════════════════
// LOGIN
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
    document.getElementById('login-error').textContent = '❌ Usuario o contraseña inválidos';
  }
}

function doLogout() {
  localStorage.removeItem('currentUser');
  location.reload();
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
// PAGE NAVIGATION
// ═══════════════════════════════════════════════════════════════
function goPage(pageName) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const page = document.getElementById(`page-${pageName}`);
  if (page) page.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.querySelector(`[data-page="${pageName}"]`);
  if (navItem) navItem.classList.add('active');

  currentPage = pageName;

  switch (pageName) {
    case 'dashboard': loadDashboard(); break;
    case 'compras': loadCompras(); break;
    case 'gastos': loadGastos(); break;
    case 'canales': loadCanales(); break;
    case 'meses': loadMeses(); break;
    case 'detalle': loadDetalle(); break;
    case 'marcas': loadMarcas(); break;
    case 'proyectos': loadProyectos(); break;
    case 'gastos-fijos': loadGastosFijos(); break;
    case 'pagos-pendientes': loadPagosPendientes(); break;
    case 'planilla': loadPlanilla(); break;
  }
}

// ═══════════════════════════════════════════════════════════════
// FILE PREVIEW SYSTEM
// ═══════════════════════════════════════════════════════════════
function viewFile(ruta, nombre) {
  if (!ruta) {
    alert('❌ No hay archivo disponible');
    return;
  }

  const ext = ruta.split('.').pop().toLowerCase();

  if (ext === 'pdf') {
    window.open(ruta, '_blank');
  } else if (ext === 'xml') {
    fetch(ruta)
      .then(r => r.text())
      .then(xmlText => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999';
        modal.innerHTML = `
          <div style="background:#fff;border-radius:8px;padding:20px;width:90%;max-width:800px;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #eee;padding-bottom:12px">
              <h3 style="margin:0;color:#333">📄 Visor XML</h3>
              <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:24px;cursor:pointer">×</button>
            </div>
            <pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow:auto;max-height:60vh;font-size:11px;line-height:1.4">${xmlText.substring(0, 3000)}</pre>
            <div style="margin-top:16px;text-align:center">
              <a href="${ruta}" download style="display:inline-block;padding:8px 16px;background:#0066cc;color:#fff;border-radius:4px;text-decoration:none;font-size:14px">⬇️ Descargar XML</a>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
      })
      .catch(err => alert('Error al cargar XML: ' + err.message));
  } else if (['jpg', 'png', 'jpeg', 'gif'].includes(ext)) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:8px;padding:20px;width:90%;max-width:800px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #eee;padding-bottom:12px">
          <h3 style="margin:0;color:#333">📷 Vista Previa</h3>
          <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:24px;cursor:pointer">×</button>
        </div>
        <img src="${ruta}" style="max-width:100%;max-height:60vh;border-radius:4px;margin:12px 0" />
        <div>
          <a href="${ruta}" download style="display:inline-block;padding:8px 16px;background:#0066cc;color:#fff;border-radius:4px;text-decoration:none;font-size:14px">⬇️ Descargar Imagen</a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  } else {
    window.open(ruta, '_blank');
  }
}

async function uploadFile(id, tipo, endpoint) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.jpg,.png,.xml,.jpeg';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();

    // Send file with correct field name based on endpoint
    if (endpoint === 'compras') formData.append('comprobante', file);
    else if (endpoint === 'gastos') formData.append('comprobante', file);
    else if (endpoint === 'proyectos') formData.append('ruta_oc', file);
    else if (endpoint === 'pagos-pendientes') formData.append('ruta_comprobante_pago', file);
    else if (endpoint === 'gastos-fijos') formData.append('ruta_comprobante', file);
    else if (endpoint === 'planilla') formData.append('ruta_recibo', file);

    try {
      const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
        method: 'PUT',
        body: formData
      });
      if (response.ok) {
        alert('✅ Archivo cargado correctamente');
        if (tipo === 'compras') loadCompras();
        else if (tipo === 'gastos') loadGastos();
        else if (tipo === 'gastos-fijos') loadGastosFijos();
        else if (tipo === 'proyectos') loadProyectos();
        else if (tipo === 'pagos') loadPagosPendientes();
        else if (tipo === 'planilla') loadPlanilla();
      } else {
        alert('❌ Error al cargar archivo');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  input.click();
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const [ventas, compras, gastos] = await Promise.all([
      fetch(`${API_BASE}/ventas`).then(r => r.json()),
      fetch(`${API_BASE}/compras`).then(r => r.json()),
      fetch(`${API_BASE}/gastos`).then(r => r.json())
    ]);

    const totalVentas = ventas.reduce((s, v) => s + (v.total_venta || 0), 0);
    const totalCompras = compras.reduce((s, c) => s + (c.total_sol || 0), 0);
    const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
    const margen = totalVentas - totalCompras - totalGastos;

    if (document.getElementById('kpi-ventas')) {
      document.getElementById('kpi-ventas').textContent = `S/. ${totalVentas.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
    }
    if (document.getElementById('kpi-costo')) {
      document.getElementById('kpi-costo').textContent = `S/. ${totalCompras.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
    }
    if (document.getElementById('kpi-margen')) {
      document.getElementById('kpi-margen').textContent = `S/. ${margen.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
    }
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPRAS
// ═══════════════════════════════════════════════════════════════
async function loadCompras() {
  try {
    const compras = await fetch(`${API_BASE}/compras`).then(r => r.json());
    const tbody = document.getElementById('tbl-compras-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    compras.forEach(c => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${c.proveedor || '-'}</td>
        <td>${new Date(c.fecha).toLocaleDateString('es-ES')}</td>
        <td>${c.descripcion || '-'}</td>
        <td>${c.marca || '-'}</td>
        <td>${c.cantidad || '-'}</td>
        <td>${c.moneda || 'SOL'}</td>
        <td>${c.precio_usd ? c.precio_usd.toFixed(2) : '-'}</td>
        <td>${c.precio_sol ? c.precio_sol.toFixed(2) : '-'}</td>
        <td><strong>S/. ${(c.total_sol || 0).toFixed(2)}</strong></td>
        <td>
          ${c.ruta_comprobante ? `<button onclick="viewFile('${c.ruta_comprobante}')">📄 Ver</button>` : '❌'}
          <button onclick="uploadFile(${c.id}, 'compras', 'compras')" style="padding:4px 8px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">📤</button>
          <button onclick="if(confirm('¿Eliminar?')) fetch(\`${API_BASE}/compras/${c.id}\`, {method:'DELETE'}).then(()=>loadCompras())" style="padding:4px 8px;background:#cc0000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GASTOS
// ═══════════════════════════════════════════════════════════════
async function loadGastos() {
  try {
    const gastos = await fetch(`${API_BASE}/gastos`).then(r => r.json());
    const tbody = document.getElementById('tbl-gastos-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    gastos.forEach(g => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(g.fecha).toLocaleDateString('es-ES')}</td>
        <td>${g.tipo_comprobante || '-'}</td>
        <td>${g.serie || '-'}</td>
        <td>${g.numero || '-'}</td>
        <td>${g.categoria || '-'}</td>
        <td>${g.canal || '-'}</td>
        <td>${g.descripcion || '-'}</td>
        <td>${g.responsable || '-'}</td>
        <td><strong>S/. ${(g.monto || 0).toFixed(2)}</strong></td>
        <td>
          ${g.ruta_comprobante ? `<button onclick="viewFile('${g.ruta_comprobante}')">📄 Ver</button>` : '❌'}
          <button onclick="uploadFile(${g.id}, 'gastos', 'gastos')" style="padding:4px 8px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">📤</button>
          <button onclick="if(confirm('¿Eliminar?')) fetch(\`${API_BASE}/gastos/${g.id}\`, {method:'DELETE'}).then(()=>loadGastos())" style="padding:4px 8px;background:#cc0000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════
async function loadCanales() {
  try {
    const canales = await fetch(`${API_BASE}/analytics/canales`).then(r => r.json());
    const tbody = document.getElementById('tbl-canales-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    canales.forEach(c => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${c.canal}</strong></td>
        <td>S/. ${c.ventas.toFixed(2)}</td>
        <td>S/. ${c.costo.toFixed(2)}</td>
        <td>S/. ${c.margen.toFixed(2)}</td>
        <td>${c.margen_pct}%</td>
        <td>${c.items}</td>
        <td>S/. ${c.ticket_prom.toFixed(2)}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

async function loadMeses() {
  try {
    const meses = await fetch(`${API_BASE}/analytics/meses`).then(r => r.json());
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
  } catch (err) {
    console.error('Error:', err);
  }
}

async function loadDetalle() {
  try {
    const ventas = await fetch(`${API_BASE}/ventas`).then(r => r.json());
    const tbody = document.getElementById('tbl-detalle-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    ventas.forEach(v => {
      const row = document.createElement('tr');
      const margenPct = v.total_venta > 0 ? ((v.margen / v.total_venta) * 100).toFixed(2) : 0;
      row.innerHTML = `
        <td>-</td>
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
        <td>${margenPct}%</td>
        <td>${v.medio_pago || '-'}</td>
        <td><button onclick="if(confirm('¿Eliminar?')) fetch(\`${API_BASE}/ventas/${v.id}\`, {method:'DELETE'}).then(()=>loadDetalle())">🗑️</button></td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

async function loadMarcas() {
  try {
    const ventas = await fetch(`${API_BASE}/ventas`).then(r => r.json());
    const tbody = document.getElementById('tbl-marcas-body');
    if (!tbody) return;

    const marcas = {};
    ventas.forEach(v => {
      if (!marcas[v.marca]) marcas[v.marca] = { ventas: 0, items: 0 };
      marcas[v.marca].ventas += v.total_venta || 0;
      marcas[v.marca].items++;
    });

    tbody.innerHTML = '';
    Object.entries(marcas).forEach(([marca, data]) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${marca || 'N/A'}</strong></td>
        <td>S/. 0</td>
        <td>S/. ${data.ventas.toFixed(2)}</td>
        <td>S/. ${(data.ventas * 0.6).toFixed(2)}</td>
        <td>S/. ${(data.ventas * 0.4).toFixed(2)}</td>
        <td>0%</td>
        <td>0%</td>
        <td>${data.items}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// PROYECTOS
// ═══════════════════════════════════════════════════════════════
async function loadProyectos() {
  try {
    const proyectos = await fetch(`${API_BASE}/proyectos`).then(r => r.json());
    const tbody = document.getElementById('tbl-proyectos-body');
    if (!tbody) return;

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
        <td>${p.estado}</td>
        <td>
          ${p.ruta_oc ? `<button onclick="viewFile('${p.ruta_oc}')">📄 Ver</button>` : '❌'}
          <button onclick="uploadFile(${p.id}, 'proyectos', 'proyectos')" style="padding:4px 8px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">📤</button>
        </td>
        <td>
          <button onclick="if(confirm('¿Eliminar?')) fetch(\`${API_BASE}/proyectos/${p.id}\`, {method:'DELETE'}).then(()=>loadProyectos())">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

function openAddProyecto() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:20px;width:90%;max-width:500px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <h3 style="margin:0 0 16px 0">➕ Nuevo Proyecto / OC</h3>
      <input type="text" id="proy-oc" placeholder="Número OC" required style="width:100%;padding:8px;margin:8px 0;border:1px solid #ddd;border-radius:4px" />
      <input type="date" id="proy-fecha" required style="width:100%;padding:8px;margin:8px 0;border:1px solid #ddd;border-radius:4px" />
      <input type="text" id="proy-cliente" placeholder="Cliente" required style="width:100%;padding:8px;margin:8px 0;border:1px solid #ddd;border-radius:4px" />
      <textarea id="proy-desc" placeholder="Descripción" rows="3" style="width:100%;padding:8px;margin:8px 0;border:1px solid #ddd;border-radius:4px"></textarea>
      <input type="number" id="proy-monto" placeholder="Monto Total" step="0.01" required style="width:100%;padding:8px;margin:8px 0;border:1px solid #ddd;border-radius:4px" />
      <label style="display:block;margin:12px 0 8px 0;font-weight:600">📎 OC (PDF):</label>
      <input type="file" id="proy-file" accept=".pdf" required style="width:100%;padding:8px;margin:8px 0;border:1px solid #ddd;border-radius:4px" />
      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="saveProyecto()" style="flex:1;padding:10px;background:#198c35;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600">💾 Guardar</button>
        <button onclick="this.closest('.modal-overlay').remove()" style="flex:1;padding:10px;background:#ccc;color:#000;border:none;border-radius:4px;cursor:pointer">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function saveProyecto() {
  const formData = new FormData();
  formData.append('numero_oc', document.getElementById('proy-oc').value);
  formData.append('fecha_oc', document.getElementById('proy-fecha').value);
  formData.append('cliente', document.getElementById('proy-cliente').value);
  formData.append('descripcion', document.getElementById('proy-desc').value);
  formData.append('monto_total', document.getElementById('proy-monto').value);

  const fileInput = document.getElementById('proy-file');
  const file = fileInput?.files?.[0];

  if (!file) {
    alert('❌ Por favor selecciona un archivo PDF');
    return;
  }

  formData.append('ruta_oc', file);

  try {
    const response = await fetch(`${API_BASE}/proyectos`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      alert('✅ Proyecto creado');
      document.querySelector('.modal-overlay').remove();
      loadProyectos();
    } else {
      alert('❌ Error: ' + (data.error || data.message || 'Error desconocido'));
      console.error('Server error:', data);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
    console.error('Fetch error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GASTOS FIJOS
// ═══════════════════════════════════════════════════════════════
async function loadGastosFijos() {
  try {
    const gastos = await fetch(`${API_BASE}/gastos-fijos`).then(r => r.json());
    const tbody = document.getElementById('tbl-gastos-fijos-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    gastos.forEach(g => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${g.ano}</td>
        <td>${g.mes}</td>
        <td>${g.descripcion}</td>
        <td>S/. ${g.monto || 0}</td>
        <td>
          ${g.ruta_comprobante ? `<button onclick="viewFile('${g.ruta_comprobante}')">📄</button>` : '❌'}
          <button onclick="uploadFile(${g.id}, 'gastos-fijos', 'gastos-fijos')" style="padding:4px 8px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">📤</button>
        </td>
        <td>
          <button onclick="if(confirm('¿Eliminar?')) fetch(\`${API_BASE}/gastos-fijos/${g.id}\`, {method:'DELETE'}).then(()=>loadGastosFijos())">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// PAGOS PENDIENTES
// ═══════════════════════════════════════════════════════════════
async function loadPagosPendientes() {
  try {
    const pagos = await fetch(`${API_BASE}/pagos-pendientes`).then(r => r.json());
    const tbody = document.getElementById('tbl-pagos-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    pagos.forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>Factura #${p.factura_id}</td>
        <td>S/. ${p.monto.toFixed(2)}</td>
        <td>${new Date(p.fecha_vencimiento).toLocaleDateString('es-ES')}</td>
        <td>${p.estado}</td>
        <td>
          ${p.ruta_comprobante_pago ? `<button onclick="viewFile('${p.ruta_comprobante_pago}')">📄</button>` : '❌'}
          ${p.estado === 'pendiente' ? `<button onclick="uploadFile(${p.id}, 'pagos', 'pagos-pendientes')" style="padding:4px 8px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">📤 Pagar</button>` : ''}
        </td>
        <td>
          <button onclick="if(confirm('¿Eliminar?')) fetch(\`${API_BASE}/pagos-pendientes/${p.id}\`, {method:'DELETE'}).then(()=>loadPagosPendientes())">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// PLANILLA
// ═══════════════════════════════════════════════════════════════
async function loadPlanilla() {
  try {
    const planilla = await fetch(`${API_BASE}/planilla`).then(r => r.json());
    const tbody = document.getElementById('tbl-planilla-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    planilla.forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${p.ano}</td>
        <td>${p.mes}</td>
        <td>${p.empleado}</td>
        <td>S/. ${p.sueldo || 0}</td>
        <td>S/. ${p.bonificacion || 0}</td>
        <td>S/. ${p.descuentos || 0}</td>
        <td><strong>S/. ${p.neto || 0}</strong></td>
        <td>
          ${p.ruta_recibo ? `<button onclick="viewFile('${p.ruta_recibo}')">📄</button>` : '❌'}
          <button onclick="uploadFile(${p.id}, 'planilla', 'planilla')" style="padding:4px 8px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">📤</button>
        </td>
        <td>
          <button onclick="if(confirm('¿Eliminar?')) fetch(\`${API_BASE}/planilla/${p.id}\`, {method:'DELETE'}).then(()=>loadPlanilla())">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════════════════════════
window.addEventListener('load', () => {
  if (currentUser) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('hdr-user').textContent = `👤 ${currentUser}`;
    updateDateTime();
    loadDashboard();
  }
});
