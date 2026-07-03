// REVIONIX - Full Functional App - SIMPLIFIED VERSION
const API_BASE = (() => {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isDev ? 'http://localhost:8080/api' : `${window.location.protocol}//${window.location.host}/api`;
})();

console.log('[APP] ✓ App.js iniciando');
console.log('[APP] API Base:', API_BASE);

let currentUser = localStorage.getItem('currentUser') || '';
let currentPage = 'dashboard';

// ═══════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════
function doLogin() {
  try {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    if (user && pass) {
      localStorage.setItem('currentUser', user);
      currentUser = user;
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.getElementById('hdr-user').textContent = `👤 ${user}`;
      updateDateTime();
      console.log('[LOGIN] ✓ Login exitoso para:', user);
      loadDashboard();
    } else {
      document.getElementById('login-error').textContent = '❌ Usuario o contraseña inválidos';
      console.log('[LOGIN] ✗ Campos vacíos');
    }
  } catch (err) {
    console.error('[LOGIN] ERROR:', err);
    alert('Error en login: ' + err.message);
  }
}

function doLogout() {
  localStorage.removeItem('currentUser');
  location.reload();
}

function updateDateTime() {
  try {
    const now = new Date();
    const formatted = now.toLocaleDateString('es-ES', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('hdr-fecha').textContent = formatted;
  } catch (err) {
    console.error('[DATE] Error:', err);
  }
}
setInterval(updateDateTime, 60000);

// ═══════════════════════════════════════════════════════════════
// PAGE NAVIGATION
// ═══════════════════════════════════════════════════════════════
function goPage(pageName) {
  try {
    console.log('[NAV] Ir a página:', pageName);

    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const page = document.getElementById(`page-${pageName}`);
    if (page) {
      page.classList.add('active');
      console.log('[NAV] ✓ Página encontrada:', `page-${pageName}`);
    } else {
      console.error('[NAV] ✗ Página NO encontrada:', `page-${pageName}`);
    }

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
      default: console.log('[NAV] Sin cargas específicas para:', pageName);
    }
  } catch (err) {
    console.error('[NAV] ERROR:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// FILE PREVIEW & UPLOAD
// ═══════════════════════════════════════════════════════════════
function viewFile(ruta, nombre) {
  try {
    if (!ruta) {
      alert('❌ No hay archivo disponible');
      return;
    }
    const ext = ruta.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      window.open(ruta, '_blank');
    } else if (ext === 'xml') {
      fetch(ruta).then(r => r.text()).then(xmlText => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999';
        modal.innerHTML = `
          <div style="background:#fff;border-radius:8px;padding:20px;width:90%;max-width:800px;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #eee;padding-bottom:12px">
              <h3 style="margin:0;color:#333">📄 Visor XML</h3>
              <button onclick="this.closest('div').parentElement.remove()" style="background:none;border:none;font-size:24px;cursor:pointer">×</button>
            </div>
            <pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow:auto;max-height:60vh;font-size:11px;line-height:1.4">${xmlText.substring(0, 3000)}</pre>
            <div style="margin-top:16px;text-align:center">
              <a href="${ruta}" download style="display:inline-block;padding:8px 16px;background:#0066cc;color:#fff;border-radius:4px;text-decoration:none;font-size:14px">⬇️ Descargar XML</a>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
      }).catch(err => alert('Error: ' + err.message));
    } else if (['jpg', 'png', 'jpeg', 'gif'].includes(ext)) {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999';
      modal.innerHTML = `
        <div style="background:#fff;border-radius:8px;padding:20px;width:90%;max-width:800px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #eee;padding-bottom:12px">
            <h3 style="margin:0;color:#333">📷 Vista Previa</h3>
            <button onclick="this.closest('div').parentElement.remove()" style="background:none;border:none;font-size:24px;cursor:pointer">×</button>
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
  } catch (err) {
    console.error('[VIEW] ERROR:', err);
    alert('Error al abrir archivo: ' + err.message);
  }
}

async function uploadFile(id, tipo, endpoint) {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.png,.xml,.jpeg';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
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
          const data = await response.json();
          alert('❌ Error: ' + (data.error || 'Error desconocido'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };
    input.click();
  } catch (err) {
    console.error('[UPLOAD] ERROR:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    console.log('[DASHBOARD] Cargando...');
    const [ventas, compras, gastos] = await Promise.all([
      fetch(`${API_BASE}/ventas`).then(r => r.json()),
      fetch(`${API_BASE}/compras`).then(r => r.json()),
      fetch(`${API_BASE}/gastos`).then(r => r.json())
    ]);

    const totalVentas = ventas.reduce((s, v) => s + (v.total_venta || 0), 0);
    const totalCompras = compras.reduce((s, c) => s + (c.total_sol || 0), 0);
    const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
    const margen = totalVentas - totalCompras - totalGastos;

    if (document.getElementById('kpi-ventas')) document.getElementById('kpi-ventas').textContent = `S/. ${totalVentas.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
    if (document.getElementById('kpi-costo')) document.getElementById('kpi-costo').textContent = `S/. ${totalCompras.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
    if (document.getElementById('kpi-margen')) document.getElementById('kpi-margen').textContent = `S/. ${margen.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;

    console.log('[DASHBOARD] ✓ Cargado');
  } catch (err) {
    console.error('[DASHBOARD] ERROR:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// PROYECTOS
// ═══════════════════════════════════════════════════════════════
async function loadProyectos() {
  try {
    console.log('[PROYECTOS] Cargando...');
    const proyectos = await fetch(`${API_BASE}/proyectos`).then(r => r.json());
    const tbody = document.getElementById('tbl-proyectos-body');
    if (!tbody) {
      console.error('[PROYECTOS] ✗ tbody NOT FOUND: tbl-proyectos-body');
      return;
    }

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
    console.log('[PROYECTOS] ✓ Cargado', proyectos.length, 'registros');
  } catch (err) {
    console.error('[PROYECTOS] ERROR:', err);
  }
}

function openAddProyecto() {
  try {
    console.log('[PROYECTO] Abriendo modal...');
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
          <button onclick="document.querySelector('.modal-overlay').remove()" style="flex:1;padding:10px;background:#ccc;color:#000;border:none;border-radius:4px;cursor:pointer">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    console.log('[PROYECTO] ✓ Modal abierto');
  } catch (err) {
    console.error('[PROYECTO] ERROR:', err);
  }
}

async function saveProyecto() {
  try {
    console.log('[PROYECTO] Guardando...');
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

    const response = await fetch(`${API_BASE}/proyectos`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      alert('✅ Proyecto creado');
      document.querySelector('.modal-overlay').remove();
      loadProyectos();
      console.log('[PROYECTO] ✓ Guardado');
    } else {
      alert('❌ Error: ' + (data.error || data.message || 'Error desconocido'));
      console.error('[PROYECTO] Error del servidor:', data);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
    console.error('[PROYECTO] ERROR:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// OTROS MÓDULOS (BÁSICO)
// ═══════════════════════════════════════════════════════════════
async function loadCompras() {
  try {
    const compras = await fetch(`${API_BASE}/compras`).then(r => r.json());
    const tbody = document.getElementById('tbl-compras-body');
    if (!tbody) return;
    tbody.innerHTML = compras.map(c => `<tr><td>${c.numero_factura}</td><td>S/. ${c.total_sol}</td></tr>`).join('');
  } catch (err) {
    console.error('[COMPRAS]', err);
  }
}

async function loadGastos() {
  try {
    const gastos = await fetch(`${API_BASE}/gastos`).then(r => r.json());
    const tbody = document.getElementById('tbl-gastos-body');
    if (!tbody) return;
    tbody.innerHTML = gastos.map(g => `<tr><td>${new Date(g.fecha).toLocaleDateString('es-ES')}</td><td>${g.descripcion}</td><td>S/. ${g.monto}</td></tr>`).join('');
  } catch (err) {
    console.error('[GASTOS]', err);
  }
}

async function loadCanales() {
  try {
    const data = await fetch(`${API_BASE}/analytics/canales`).then(r => r.json());
    const tbody = document.getElementById('tbl-canales-body');
    if (!tbody) return;
    tbody.innerHTML = data.map(c => `<tr><td>${c.canal}</td><td>S/. ${c.ventas.toFixed(2)}</td></tr>`).join('');
  } catch (err) {
    console.error('[CANALES]', err);
  }
}

async function loadMeses() {
  try {
    const data = await fetch(`${API_BASE}/analytics/meses`).then(r => r.json());
    const tbody = document.getElementById('tbl-meses-body');
    if (!tbody) return;
    tbody.innerHTML = data.map(m => `<tr><td>${m.mes}</td><td>S/. ${m.ventas.toFixed(2)}</td></tr>`).join('');
  } catch (err) {
    console.error('[MESES]', err);
  }
}

async function loadDetalle() {
  try {
    const ventas = await fetch(`${API_BASE}/ventas`).then(r => r.json());
    const tbody = document.getElementById('tbl-detalle-body');
    if (!tbody) return;
    tbody.innerHTML = ventas.map(v => `<tr><td>${v.modelo}</td><td>S/. ${v.total_venta.toFixed(2)}</td></tr>`).join('');
  } catch (err) {
    console.error('[DETALLE]', err);
  }
}

async function loadMarcas() {
  try {
    const ventas = await fetch(`${API_BASE}/ventas`).then(r => r.json());
    const tbody = document.getElementById('tbl-marcas-body');
    if (!tbody) return;
    const marcas = {};
    ventas.forEach(v => {
      if (!marcas[v.marca]) marcas[v.marca] = 0;
      marcas[v.marca] += v.total_venta || 0;
    });
    tbody.innerHTML = Object.entries(marcas).map(([m, v]) => `<tr><td>${m}</td><td>S/. ${v.toFixed(2)}</td></tr>`).join('');
  } catch (err) {
    console.error('[MARCAS]', err);
  }
}

async function loadGastosFijos() {
  try {
    const gastos = await fetch(`${API_BASE}/gastos-fijos`).then(r => r.json());
    const tbody = document.getElementById('tbl-gastos-fijos-body');
    if (!tbody) return;
    tbody.innerHTML = gastos.map(g => `<tr><td>${g.ano}</td><td>${g.mes}</td><td>${g.descripcion}</td><td>S/. ${g.monto}</td><td><button onclick="uploadFile(${g.id}, 'gastos-fijos', 'gastos-fijos')">📤</button></td></tr>`).join('');
  } catch (err) {
    console.error('[GASTOS-FIJOS]', err);
  }
}

async function loadPagosPendientes() {
  try {
    const pagos = await fetch(`${API_BASE}/pagos-pendientes`).then(r => r.json());
    const tbody = document.getElementById('tbl-pagos-body');
    if (!tbody) return;
    tbody.innerHTML = pagos.map(p => `<tr><td>Factura #${p.factura_id}</td><td>S/. ${p.monto.toFixed(2)}</td><td>${p.estado}</td><td><button onclick="uploadFile(${p.id}, 'pagos', 'pagos-pendientes')">📤</button></td></tr>`).join('');
  } catch (err) {
    console.error('[PAGOS]', err);
  }
}

async function loadPlanilla() {
  try {
    const planilla = await fetch(`${API_BASE}/planilla`).then(r => r.json());
    const tbody = document.getElementById('tbl-planilla-body');
    if (!tbody) return;
    tbody.innerHTML = planilla.map(p => `<tr><td>${p.empleado}</td><td>S/. ${p.neto}</td><td><button onclick="uploadFile(${p.id}, 'planilla', 'planilla')">📤</button></td></tr>`).join('');
  } catch (err) {
    console.error('[PLANILLA]', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════════════════════════
window.addEventListener('load', () => {
  try {
    console.log('[INIT] Window load event');
    if (currentUser) {
      console.log('[INIT] Usuario guardado encontrado:', currentUser);
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.getElementById('hdr-user').textContent = `👤 ${currentUser}`;
      updateDateTime();
      loadDashboard();
    } else {
      console.log('[INIT] No usuario guardado - mostrando login');
    }
  } catch (err) {
    console.error('[INIT] ERROR CRÍTICO:', err);
  }
});

console.log('[APP] ✓ App.js cargado completamente');
