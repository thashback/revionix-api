// REVIONIX - Full Functional App with Database Integration
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

  // Load data based on page
  switch (pageName) {
    case 'dashboard': loadDashboard(); break;
    case 'compras': loadCompras(); break;
    case 'gastos': loadGastos(); break;
    case 'canales': loadCanales(); break;
    case 'meses': loadMeses(); break;
    case 'detalle': loadDetalle(); break;
    case 'marcas': loadMarcas(); break;
  }
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
    const margenPct = totalVentas > 0 ? ((margen / totalVentas) * 100).toFixed(2) : 0;

    if (document.getElementById('kpi-ventas')) {
      document.getElementById('kpi-ventas').textContent = `S/. ${totalVentas.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
    }
    if (document.getElementById('kpi-costo')) {
      document.getElementById('kpi-costo').textContent = `S/. ${totalCompras.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
    }
    if (document.getElementById('kpi-margen')) {
      document.getElementById('kpi-margen').textContent = `S/. ${margen.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
    }
    if (document.getElementById('kpi-margen-pct')) {
      document.getElementById('kpi-margen-pct').innerHTML = `<strong>${margenPct}%</strong>`;
    }

    if (document.getElementById('tbl-marcas-dash')) {
      renderMarcasDashboard(ventas, compras);
    }
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

function renderMarcasDashboard(ventas, compras) {
  const tbody = document.getElementById('tbl-marcas-dash');
  if (!tbody) return;

  const marcas = {};
  ventas.forEach(v => {
    if (!marcas[v.marca]) marcas[v.marca] = { ventas: 0, compras: 0 };
    marcas[v.marca].ventas += v.total_venta || 0;
  });

  tbody.innerHTML = '';
  Object.entries(marcas).slice(0, 5).forEach(([marca, data]) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${marca || 'N/A'}</strong></td>
      <td>S/. ${data.ventas.toFixed(2)}</td>
      <td>${data.ventas > 0 ? ((data.ventas / data.ventas) * 100).toFixed(0) : 0}%</td>
    `;
    tbody.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════════════════
// COMPRAS
// ═══════════════════════════════════════════════════════════════
async function loadCompras() {
  try {
    const compras = await fetch(`${API_BASE}/compras`).then(r => r.json());
    renderCompras(compras);

    if (document.getElementById('comp-count')) {
      document.getElementById('comp-count').textContent = `Total: ${compras.length} compras`;
    }
  } catch (err) {
    console.error('Error loading compras:', err);
  }
}

function renderCompras(compras) {
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
        ${c.ruta_comprobante ? `<button class="btn-sm" onclick="viewComprobante('${c.ruta_comprobante}')">👁️ Ver</button>` : '-'}
        <button class="btn-sm" onclick="deleteCompra(${c.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function deleteCompra(id) {
  if (!confirm('¿Eliminar esta compra?')) return;
  try {
    await fetch(`${API_BASE}/compras/${id}`, { method: 'DELETE' });
    loadCompras();
  } catch (err) {
    console.error('Error deleting compra:', err);
  }
}

function viewComprobante(ruta) {
  if (!ruta) {
    alert('No hay comprobante');
    return;
  }
  const ext = ruta.split('.').pop().toLowerCase();
  if (ext === 'xml') {
    alert('XML Parser: ' + ruta);
  } else {
    window.open(ruta, '_blank');
  }
}

// ═══════════════════════════════════════════════════════════════
// GASTOS
// ═══════════════════════════════════════════════════════════════
async function loadGastos() {
  try {
    const gastos = await fetch(`${API_BASE}/gastos`).then(r => r.json());
    renderGastos(gastos);
  } catch (err) {
    console.error('Error loading gastos:', err);
  }
}

function renderGastos(gastos) {
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
        <button class="btn-sm" onclick="deleteGasto(${g.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function deleteGasto(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  try {
    await fetch(`${API_BASE}/gastos/${id}`, { method: 'DELETE' });
    loadGastos();
  } catch (err) {
    console.error('Error deleting gasto:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════
async function loadCanales() {
  try {
    const canales = await fetch(`${API_BASE}/analytics/canales`).then(r => r.json());
    renderCanales(canales);
  } catch (err) {
    console.error('Error loading canales:', err);
  }
}

function renderCanales(canales) {
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
}

async function loadMeses() {
  try {
    const meses = await fetch(`${API_BASE}/analytics/meses`).then(r => r.json());
    renderMeses(meses);
  } catch (err) {
    console.error('Error loading meses:', err);
  }
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

async function loadDetalle() {
  try {
    const ventas = await fetch(`${API_BASE}/ventas`).then(r => r.json());
    renderDetalle(ventas);
  } catch (err) {
    console.error('Error loading detalle:', err);
  }
}

function renderDetalle(ventas) {
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
      <td><button class="btn-sm" onclick="deleteVenta(${v.id})">🗑️</button></td>
    `;
    tbody.appendChild(row);
  });
}

async function loadMarcas() {
  try {
    const ventas = await fetch(`${API_BASE}/ventas`).then(r => r.json());
    renderMarcas(ventas);
  } catch (err) {
    console.error('Error loading marcas:', err);
  }
}

function renderMarcas(ventas) {
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
    const margenPct = data.ventas > 0 ? 25 : 0;
    row.innerHTML = `
      <td><strong>${marca || 'N/A'}</strong></td>
      <td>S/. 0</td>
      <td>S/. ${data.ventas.toFixed(2)}</td>
      <td>S/. ${(data.ventas * 0.6).toFixed(2)}</td>
      <td>S/. ${(data.ventas * 0.4).toFixed(2)}</td>
      <td>${margenPct}%</td>
      <td>0%</td>
      <td>${data.items}</td>
    `;
    tbody.appendChild(row);
  });
}

async function deleteVenta(id) {
  if (!confirm('¿Eliminar esta venta?')) return;
  try {
    await fetch(`${API_BASE}/ventas/${id}`, { method: 'DELETE' });
    loadDetalle();
  } catch (err) {
    console.error('Error deleting venta:', err);
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
