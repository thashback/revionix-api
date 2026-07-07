// ═══════════════════════════════════════════════════════════════
// REVIONIX - Módulos API (Proyectos / Planilla / Archivos)
// CAPA ADITIVA: no redefine ninguna función del sistema principal.
// El login, dashboard, gráficos, importación, ecommerce, compras,
// gastos, stock, etc. son manejados por el script interno del HTML.
// ═══════════════════════════════════════════════════════════════
const RV_API = `${window.location.protocol}//${window.location.host}/api`;
console.log('[RV-API] Módulos API inicializando. Base:', RV_API);

// ── Helpers ──────────────────────────────────────────────────────
// MySQL devuelve DECIMAL como string ("5000.00") — siempre parsear.
function rvNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}
function rvMoney(v) {
  return 'S/. ' + rvNum(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function rvDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString('es-ES');
}
function rvEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function closeRvModal() {
  document.querySelectorAll('.rv-modal-overlay').forEach(el => el.remove());
}
function rvModal(innerHTML, maxWidth) {
  closeRvModal();
  const modal = document.createElement('div');
  modal.className = 'rv-modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
  modal.innerHTML = `<div style="background:#fff;border-radius:8px;padding:22px;width:100%;max-width:${maxWidth || 520}px;max-height:88vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.35)">${innerHTML}</div>`;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  return modal;
}
const RV_INPUT = 'width:100%;padding:9px;margin:6px 0;border:1px solid #d8dde3;border-radius:5px;font-size:13px;box-sizing:border-box';
const RV_LABEL = 'display:block;margin:8px 0 0 0;font-weight:600;font-size:12px;color:#455a64';

// ═══════════════════════════════════════════════════════════════
// VISOR UNIVERSAL DE ARCHIVOS (PDF / XML / Imagen)
// ═══════════════════════════════════════════════════════════════
function viewFile(ruta, nombre) {
  if (!ruta) { alert('❌ No hay archivo disponible'); return; }
  const ext = ruta.split('.').pop().toLowerCase();

  if (ext === 'pdf') {
    window.open(ruta, '_blank');
  } else if (ext === 'xml') {
    fetch(ruta)
      .then(r => r.text())
      .then(xmlText => {
        // Resaltar campos clave de facturas electrónicas
        let resumen = '';
        try {
          const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
          const pick = (tags) => {
            for (const t of tags) {
              const els = doc.getElementsByTagName(t);
              if (els.length && els[0].textContent.trim()) return els[0].textContent.trim();
            }
            return null;
          };
          const ruc = pick(['cbc:CustomerAssignedAccountID', 'cbc:CompanyID', 'RUC']);
          const total = pick(['cbc:PayableAmount', 'cbc:TaxInclusiveAmount', 'Total']);
          const fecha = pick(['cbc:IssueDate', 'Fecha']);
          const serie = pick(['cbc:ID', 'Serie']);
          const items = [];
          if (ruc) items.push(`<b>RUC:</b> ${rvEsc(ruc)}`);
          if (serie) items.push(`<b>Serie/N°:</b> ${rvEsc(serie)}`);
          if (fecha) items.push(`<b>Fecha:</b> ${rvEsc(fecha)}`);
          if (total) items.push(`<b>Total:</b> S/. ${rvEsc(total)}`);
          if (items.length) resumen = `<div style="background:#e3f0fb;padding:10px;border-radius:5px;margin-bottom:10px;font-size:13px">${items.join(' &nbsp;·&nbsp; ')}</div>`;
        } catch (e) { /* XML no estándar: mostrar solo texto */ }

        rvModal(`
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:10px">
            <h3 style="margin:0;color:#333">📄 Visor XML ${nombre ? '· ' + rvEsc(nombre) : ''}</h3>
            <button onclick="closeRvModal()" style="background:none;border:none;font-size:24px;cursor:pointer">×</button>
          </div>
          ${resumen}
          <pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow:auto;max-height:55vh;font-size:11px;line-height:1.4">${rvEsc(xmlText.substring(0, 5000))}</pre>
          <div style="margin-top:14px;text-align:center">
            <a href="${ruta}" download style="display:inline-block;padding:8px 16px;background:#1565c0;color:#fff;border-radius:4px;text-decoration:none;font-size:13px">⬇️ Descargar XML</a>
          </div>
        `, 800);
      })
      .catch(err => alert('Error al cargar XML: ' + err.message));
  } else if (['jpg', 'png', 'jpeg', 'gif', 'webp'].includes(ext)) {
    rvModal(`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:10px">
        <h3 style="margin:0;color:#333">📷 Vista Previa</h3>
        <button onclick="closeRvModal()" style="background:none;border:none;font-size:24px;cursor:pointer">×</button>
      </div>
      <div style="text-align:center">
        <img src="${ruta}" style="max-width:100%;max-height:60vh;border-radius:4px;margin:10px 0" />
        <div><a href="${ruta}" download style="display:inline-block;padding:8px 16px;background:#1565c0;color:#fff;border-radius:4px;text-decoration:none;font-size:13px">⬇️ Descargar Imagen</a></div>
      </div>
    `, 820);
  } else {
    window.open(ruta, '_blank');
  }
}

// ═══════════════════════════════════════════════════════════════
// SUBIDA UNIVERSAL DE ARCHIVOS (campo correcto según módulo)
// ═══════════════════════════════════════════════════════════════
const RV_FIELD_BY_ENDPOINT = {
  'compras': 'comprobante',
  'gastos': 'comprobante',
  'proyectos': 'ruta_oc',
  'pagos-pendientes': 'ruta_comprobante_pago',
  'gastos-fijos': 'ruta_comprobante',
  'planilla': 'ruta_recibo'
};

async function uploadFile(id, tipo, endpoint) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.jpg,.png,.jpeg,.xml';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('❌ Archivo demasiado grande (máx 50MB)'); return; }

    const field = RV_FIELD_BY_ENDPOINT[endpoint] || 'comprobante';
    const formData = new FormData();
    formData.append(field, file);

    try {
      const response = await fetch(`${RV_API}/${endpoint}/${id}`, { method: 'PUT', body: formData });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        alert('✅ Archivo cargado correctamente');
        if (endpoint === 'proyectos') loadProyectos();
        else if (endpoint === 'planilla') loadPlanilla();
      } else {
        alert('❌ Error al subir: ' + (data.error || response.status));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };
  input.click();
}

// ═══════════════════════════════════════════════════════════════
// PROYECTOS / OC
// ═══════════════════════════════════════════════════════════════
const RV_ESTADOS = ['pendiente', 'en_proceso', 'completado', 'cancelado'];
const RV_ESTADO_COLOR = { pendiente: '#e67e22', en_proceso: '#1565c0', completado: '#198c35', cancelado: '#c0392b' };

async function loadProyectos() {
  try {
    const proyectos = await fetch(`${RV_API}/proyectos`).then(r => r.json());
    const tbody = document.getElementById('tbl-proyectos-body');
    if (!tbody) return;

    if (!Array.isArray(proyectos)) {
      console.error('[PROYECTOS] Respuesta inesperada:', proyectos);
      return;
    }

    // KPIs
    const activos = proyectos.filter(p => p.estado === 'pendiente' || p.estado === 'en_proceso').length;
    const total = proyectos.reduce((s, p) => s + rvNum(p.monto_total), 0);
    const ejec = proyectos.reduce((s, p) => s + rvNum(p.monto_ejecutado), 0);
    const elC = document.getElementById('kpi-proy-count');
    const elT = document.getElementById('kpi-proy-total');
    const elE = document.getElementById('kpi-proy-ejec');
    const elP = document.getElementById('kpi-proy-ejec-pct');
    if (elC) elC.textContent = activos;
    if (elT) elT.textContent = rvMoney(total);
    if (elE) elE.textContent = rvMoney(ejec);
    if (elP) elP.textContent = total > 0 ? ((ejec / total) * 100).toFixed(1) + '% de avance global' : 'sin órdenes';

    tbody.innerHTML = '';
    if (proyectos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;padding:20px">Sin proyectos registrados. Usa ➕ Nuevo Proyecto.</td></tr>';
      return;
    }

    proyectos.forEach(p => {
      const mTotal = rvNum(p.monto_total);
      const mEjec = rvNum(p.monto_ejecutado);
      const pct = mTotal > 0 ? ((mEjec / mTotal) * 100).toFixed(0) : 0;
      const color = RV_ESTADO_COLOR[p.estado] || '#455a64';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${rvEsc(p.numero_oc)}</strong></td>
        <td>${rvEsc(p.cliente)}</td>
        <td>${rvDate(p.fecha_oc)}</td>
        <td>${rvMoney(mTotal)}</td>
        <td>${rvMoney(mEjec)} <span style="color:#777;font-size:11px">(${pct}%)</span></td>
        <td><span style="background:${color}22;color:${color};padding:3px 8px;border-radius:10px;font-size:11px;font-weight:600">${rvEsc(p.estado)}</span></td>
        <td>${(p.condicion_pago === 'credito' || p.condicion_pago === 'crédito') ? '<span style="background:#fef3e8;color:#e67e22;padding:3px 8px;border-radius:10px;font-size:11px;font-weight:600">Crédito</span>' : '<span style="background:#ebf7ee;color:#155724;padding:3px 8px;border-radius:10px;font-size:11px;font-weight:600">Contado</span>'}</td>
        <td>
          ${p.ruta_oc ? `<button onclick="viewFile('${p.ruta_oc}','OC ${rvEsc(p.numero_oc)}')" style="padding:4px 8px;background:#eceff1;border:1px solid #d8dde3;border-radius:4px;cursor:pointer;font-size:11px">📄 Ver</button>` : '<span style="color:#bbb">—</span>'}
          <button onclick="uploadFile(${p.id}, 'proyectos', 'proyectos')" title="Subir/reemplazar OC" style="padding:4px 8px;background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">📤</button>
        </td>
        <td style="white-space:nowrap">
          <button onclick="editProyecto(${p.id})" title="Editar" style="padding:4px 8px;background:#eceff1;border:1px solid #d8dde3;border-radius:4px;cursor:pointer;font-size:11px">✏️</button>
          <button onclick="deleteProyecto(${p.id})" title="Eliminar" style="padding:4px 8px;background:#fdecea;color:#c0392b;border:1px solid #f5c6cb;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    window.RV_PROYECTOS = proyectos;
    console.log('[PROYECTOS] ✓', proyectos.length, 'registros');
  } catch (err) {
    console.error('[PROYECTOS] ERROR:', err);
  }
}

function openAddProyecto() {
  rvModal(`
    <h3 style="margin:0 0 12px 0">➕ Nuevo Proyecto / OC</h3>
    <label style="${RV_LABEL}">Número OC *</label>
    <input type="text" id="proy-oc" placeholder="Ej: OC-2026-001" style="${RV_INPUT}" />
    <label style="${RV_LABEL}">Fecha OC *</label>
    <input type="date" id="proy-fecha" style="${RV_INPUT}" />
    <label style="${RV_LABEL}">Cliente *</label>
    <input type="text" id="proy-cliente" placeholder="Razón social del cliente" style="${RV_INPUT}" />
    <label style="${RV_LABEL}">Descripción</label>
    <textarea id="proy-desc" rows="2" placeholder="Detalle del proyecto" style="${RV_INPUT}"></textarea>
    <label style="${RV_LABEL}">Monto Total (S/.) *</label>
    <input type="number" id="proy-monto" placeholder="0.00" step="0.01" min="0" style="${RV_INPUT}" />
    <div style="display:flex;gap:8px">
      <div style="flex:1"><label style="${RV_LABEL}">Monto Ejecutado (S/.)</label><input type="number" id="proy-ejec" placeholder="0.00" step="0.01" min="0" value="0" style="${RV_INPUT}" /></div>
      <div style="flex:1"><label style="${RV_LABEL}">Costo (S/.)</label><input type="number" id="proy-costo" placeholder="0.00" step="0.01" min="0" value="0" style="${RV_INPUT}" /></div>
    </div>
    <label style="${RV_LABEL}">Condición de pago</label>
    <select id="proy-cond" style="${RV_INPUT}"><option value="contado">Contado</option><option value="credito">Crédito</option></select>
    <div style="background:#e3f0fb;padding:8px;border-radius:5px;font-size:11px;color:#455a64;margin-top:4px">💡 El <b>monto ejecutado</b> se suma como venta del canal <b>Proyectos</b> (independiente) en el dashboard y EBITDA. El <b>costo</b> define el margen.</div>
    <label style="${RV_LABEL}">📎 Archivo OC (PDF, opcional)</label>
    <input type="file" id="proy-file" accept=".pdf,.xml,.jpg,.png" style="${RV_INPUT}" />
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="saveProyecto()" style="flex:1;padding:10px;background:#198c35;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600">💾 Guardar</button>
      <button onclick="closeRvModal()" style="flex:1;padding:10px;background:#eceff1;color:#333;border:none;border-radius:5px;cursor:pointer">Cancelar</button>
    </div>
  `);
  document.getElementById('proy-fecha').value = new Date().toISOString().slice(0, 10);
}

async function saveProyecto() {
  const oc = document.getElementById('proy-oc').value.trim();
  const fecha = document.getElementById('proy-fecha').value;
  const cliente = document.getElementById('proy-cliente').value.trim();
  const monto = document.getElementById('proy-monto').value;

  if (!oc) { alert('❌ Ingresa el número de OC'); return; }
  if (!fecha) { alert('❌ Selecciona la fecha'); return; }
  if (!cliente) { alert('❌ Ingresa el cliente'); return; }
  if (!monto || rvNum(monto) <= 0) { alert('❌ Ingresa un monto válido'); return; }

  const formData = new FormData();
  formData.append('numero_oc', oc);
  formData.append('fecha_oc', fecha);
  formData.append('cliente', cliente);
  formData.append('descripcion', document.getElementById('proy-desc').value.trim());
  formData.append('monto_total', monto);
  formData.append('monto_ejecutado', rvNum(document.getElementById('proy-ejec').value));
  formData.append('costo', rvNum(document.getElementById('proy-costo').value));
  formData.append('condicion_pago', document.getElementById('proy-cond').value);
  const file = document.getElementById('proy-file').files[0];
  if (file) formData.append('ruta_oc', file);

  try {
    const response = await fetch(`${RV_API}/proyectos`, { method: 'POST', body: formData });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      alert('✅ Proyecto creado');
      closeRvModal();
      loadProyectos();
      rvSyncProyectos();
    } else {
      const msg = (data.error || '').includes('Duplicate') ? 'Ya existe un proyecto con ese número de OC' : (data.error || 'Error del servidor');
      alert('❌ ' + msg);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

function editProyecto(id) {
  const p = (window.RV_PROYECTOS || []).find(x => x.id === id);
  if (!p) return;
  const opts = RV_ESTADOS.map(e => `<option value="${e}" ${p.estado === e ? 'selected' : ''}>${e}</option>`).join('');
  rvModal(`
    <h3 style="margin:0 0 12px 0">✏️ Editar Proyecto — ${rvEsc(p.numero_oc)}</h3>
    <label style="${RV_LABEL}">Cliente</label>
    <input type="text" id="ep-cliente" value="${rvEsc(p.cliente)}" style="${RV_INPUT}" />
    <label style="${RV_LABEL}">Descripción</label>
    <textarea id="ep-desc" rows="2" style="${RV_INPUT}">${rvEsc(p.descripcion || '')}</textarea>
    <label style="${RV_LABEL}">Monto Total (S/.)</label>
    <input type="number" id="ep-total" value="${rvNum(p.monto_total)}" step="0.01" min="0" style="${RV_INPUT}" />
    <div style="display:flex;gap:8px">
      <div style="flex:1"><label style="${RV_LABEL}">Monto Ejecutado (S/.)</label><input type="number" id="ep-ejec" value="${rvNum(p.monto_ejecutado)}" step="0.01" min="0" style="${RV_INPUT}" /></div>
      <div style="flex:1"><label style="${RV_LABEL}">Costo (S/.)</label><input type="number" id="ep-costo" value="${rvNum(p.costo)}" step="0.01" min="0" style="${RV_INPUT}" /></div>
    </div>
    <label style="${RV_LABEL}">Condición de pago</label>
    <select id="ep-cond" style="${RV_INPUT}"><option value="contado" ${(p.condicion_pago !== 'credito' && p.condicion_pago !== 'crédito') ? 'selected' : ''}>Contado</option><option value="credito" ${(p.condicion_pago === 'credito' || p.condicion_pago === 'crédito') ? 'selected' : ''}>Crédito</option></select>
    <div style="background:#e3f0fb;padding:8px;border-radius:5px;font-size:11px;color:#455a64;margin-bottom:4px">💡 El monto ejecutado suma como venta del canal <b>Proyectos</b> (independiente); el costo define el margen para EBITDA.</div>
    <label style="${RV_LABEL}">Estado</label>
    <select id="ep-estado" style="${RV_INPUT}">${opts}</select>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="saveEditProyecto(${id})" style="flex:1;padding:10px;background:#198c35;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600">💾 Actualizar</button>
      <button onclick="closeRvModal()" style="flex:1;padding:10px;background:#eceff1;color:#333;border:none;border-radius:5px;cursor:pointer">Cancelar</button>
    </div>
  `);
}

async function saveEditProyecto(id) {
  const total = rvNum(document.getElementById('ep-total').value);
  const ejec = rvNum(document.getElementById('ep-ejec').value);
  if (ejec > total) { alert('⚠️ El monto ejecutado no puede superar el monto total'); return; }

  const formData = new FormData();
  formData.append('cliente', document.getElementById('ep-cliente').value.trim());
  formData.append('descripcion', document.getElementById('ep-desc').value.trim());
  formData.append('monto_total', total);
  formData.append('monto_ejecutado', ejec);
  formData.append('costo', rvNum(document.getElementById('ep-costo').value));
  formData.append('condicion_pago', document.getElementById('ep-cond').value);
  formData.append('estado', document.getElementById('ep-estado').value);

  try {
    const response = await fetch(`${RV_API}/proyectos/${id}`, { method: 'PUT', body: formData });
    if (response.ok) {
      alert('✅ Proyecto actualizado');
      closeRvModal();
      loadProyectos();
      rvSyncProyectos();
    } else {
      const data = await response.json().catch(() => ({}));
      alert('❌ ' + (data.error || 'Error del servidor'));
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

async function deleteProyecto(id) {
  if (!confirm('¿Eliminar este proyecto?')) return;
  try {
    await fetch(`${RV_API}/proyectos/${id}`, { method: 'DELETE' });
    loadProyectos();
    rvSyncProyectos();
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// PLANILLA (Base de datos)
// Fórmula: Neto = Sueldo + Bonificación − Descuentos
// ═══════════════════════════════════════════════════════════════
const RV_MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

window.RV_PLAN_FILTRO = { ano: '', mes: '' };
function rvRenderFiltroPlanilla(planilla) {
  const tabla = document.getElementById('tbl-planilla');
  if (!tabla) return;
  let bar = document.getElementById('rv-plan-filtro');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'rv-plan-filtro';
    bar.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;font-size:13px';
    tabla.parentElement.insertBefore(bar, tabla);
  }
  const anos = [...new Set(planilla.map(p => p.ano))].sort((a, b) => b - a);
  const anoOpts = '<option value="">Todos</option>' + anos.map(a => `<option value="${a}" ${window.RV_PLAN_FILTRO.ano == a ? 'selected' : ''}>${a}</option>`).join('');
  const mesOpts = '<option value="">Todos</option>' + RV_MESES.map((m, i) => i === 0 ? '' : `<option value="${i}" ${window.RV_PLAN_FILTRO.mes == i ? 'selected' : ''}>${m}</option>`).join('');
  const filtrados = planilla.filter(p => (!window.RV_PLAN_FILTRO.ano || p.ano == window.RV_PLAN_FILTRO.ano) && (!window.RV_PLAN_FILTRO.mes || p.mes == window.RV_PLAN_FILTRO.mes));
  const total = filtrados.reduce((s, p) => s + rvNum(p.neto), 0);
  bar.innerHTML = `<b>Filtrar:</b>
    <label>Año <select id="rv-plan-fano" style="padding:5px;border:1px solid #d8dde3;border-radius:5px">${anoOpts}</select></label>
    <label>Mes <select id="rv-plan-fmes" style="padding:5px;border:1px solid #d8dde3;border-radius:5px">${mesOpts}</select></label>
    <span style="margin-left:auto;background:#ebf7ee;padding:5px 12px;border-radius:6px">Masa salarial (${filtrados.length}): <b style="color:#198c35">${rvMoney(total)}</b></span>`;
  bar.querySelector('#rv-plan-fano').onchange = e => { window.RV_PLAN_FILTRO.ano = e.target.value; loadPlanilla(); };
  bar.querySelector('#rv-plan-fmes').onchange = e => { window.RV_PLAN_FILTRO.mes = e.target.value; loadPlanilla(); };
  return filtrados;
}
async function loadPlanilla() {
  try {
    const planilla = await fetch(`${RV_API}/planilla`).then(r => r.json());
    const tbody = document.getElementById('tbl-planilla-body');
    if (!tbody) return;
    if (!Array.isArray(planilla)) return;
    window.RV_PLANILLA = planilla;

    tbody.innerHTML = '';
    if (planilla.length === 0) {
      const bar = document.getElementById('rv-plan-filtro'); if (bar) bar.remove();
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;padding:20px">Sin registros. Usa ➕ Agregar Empleado o 📂 Importar XLS (puedes cargar cualquier mes).</td></tr>';
      return;
    }

    const filtrados = rvRenderFiltroPlanilla(planilla) || planilla;
    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;padding:16px">Sin registros para ese mes/año.</td></tr>';
      return;
    }

    filtrados.forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${p.ano}</td>
        <td>${RV_MESES[p.mes] || p.mes}</td>
        <td><strong>${rvEsc(p.empleado)}</strong></td>
        <td>${rvMoney(p.sueldo)}</td>
        <td>${rvMoney(p.bonificacion)}</td>
        <td style="color:#c0392b">${rvMoney(p.descuentos)}</td>
        <td><strong style="color:#198c35">${rvMoney(p.neto)}</strong></td>
        <td>
          ${p.ruta_recibo ? `<button onclick="viewFile('${p.ruta_recibo}','Recibo ${rvEsc(p.empleado)}')" style="padding:4px 8px;background:#eceff1;border:1px solid #d8dde3;border-radius:4px;cursor:pointer;font-size:11px">📄</button>` : '<span style="color:#bbb">—</span>'}
          <button onclick="uploadFile(${p.id}, 'planilla', 'planilla')" title="Subir recibo" style="padding:4px 8px;background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">📤</button>
        </td>
        <td style="white-space:nowrap">
          <button onclick="editPlanilla(${p.id})" style="padding:4px 8px;background:#eceff1;border:1px solid #d8dde3;border-radius:4px;cursor:pointer;font-size:11px">✏️</button>
          <button onclick="deletePlanilla(${p.id})" style="padding:4px 8px;background:#fdecea;color:#c0392b;border:1px solid #f5c6cb;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    window.RV_PLANILLA = planilla;
    console.log('[PLANILLA] ✓', planilla.length, 'registros');
  } catch (err) {
    console.error('[PLANILLA] ERROR:', err);
  }
}

function rvPlanillaForm(p) {
  const now = new Date();
  const mesOpts = RV_MESES.map((m, i) => i === 0 ? '' : `<option value="${i}" ${(p ? p.mes : now.getMonth() + 1) === i ? 'selected' : ''}>${m}</option>`).join('');
  return `
    <div style="display:flex;gap:8px">
      <div style="flex:1"><label style="${RV_LABEL}">Mes *</label><select id="pl-mes" style="${RV_INPUT}">${mesOpts}</select></div>
      <div style="flex:1"><label style="${RV_LABEL}">Año *</label><input type="number" id="pl-ano" value="${p ? p.ano : now.getFullYear()}" min="2020" max="2100" style="${RV_INPUT}" /></div>
    </div>
    <label style="${RV_LABEL}">Empleado *</label>
    <input type="text" id="pl-emp" value="${p ? rvEsc(p.empleado) : ''}" placeholder="Nombre completo" style="${RV_INPUT}" ${p ? 'readonly' : ''} />
    <div style="display:flex;gap:8px">
      <div style="flex:1"><label style="${RV_LABEL}">Sueldo (S/.)</label><input type="number" id="pl-sueldo" value="${p ? rvNum(p.sueldo) : ''}" step="0.01" min="0" oninput="rvCalcNeto()" style="${RV_INPUT}" /></div>
      <div style="flex:1"><label style="${RV_LABEL}">Bonificación</label><input type="number" id="pl-bonif" value="${p ? rvNum(p.bonificacion) : 0}" step="0.01" min="0" oninput="rvCalcNeto()" style="${RV_INPUT}" /></div>
      <div style="flex:1"><label style="${RV_LABEL}">Descuentos</label><input type="number" id="pl-desc" value="${p ? rvNum(p.descuentos) : 0}" step="0.01" min="0" oninput="rvCalcNeto()" style="${RV_INPUT}" /></div>
    </div>
    <div style="background:#ebf7ee;padding:10px;border-radius:5px;margin-top:10px;text-align:center">
      <span style="font-size:12px;color:#455a64">NETO A PAGAR (sueldo + bonif − desc):</span>
      <strong id="pl-neto-preview" style="font-size:18px;color:#198c35;margin-left:8px">S/. 0.00</strong>
    </div>
  `;
}

function rvCalcNeto() {
  const s = rvNum(document.getElementById('pl-sueldo')?.value);
  const b = rvNum(document.getElementById('pl-bonif')?.value);
  const d = rvNum(document.getElementById('pl-desc')?.value);
  const el = document.getElementById('pl-neto-preview');
  if (el) el.textContent = rvMoney(s + b - d);
}

function openAddPlanilla() {
  rvModal(`
    <h3 style="margin:0 0 12px 0">➕ Agregar a Planilla</h3>
    ${rvPlanillaForm(null)}
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="savePlanilla(null)" style="flex:1;padding:10px;background:#198c35;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600">💾 Guardar</button>
      <button onclick="closeRvModal()" style="flex:1;padding:10px;background:#eceff1;color:#333;border:none;border-radius:5px;cursor:pointer">Cancelar</button>
    </div>
  `);
  rvCalcNeto();
}

function editPlanilla(id) {
  const p = (window.RV_PLANILLA || []).find(x => x.id === id);
  if (!p) return;
  rvModal(`
    <h3 style="margin:0 0 12px 0">✏️ Editar Planilla — ${rvEsc(p.empleado)}</h3>
    ${rvPlanillaForm(p)}
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="savePlanilla(${id})" style="flex:1;padding:10px;background:#198c35;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600">💾 Actualizar</button>
      <button onclick="closeRvModal()" style="flex:1;padding:10px;background:#eceff1;color:#333;border:none;border-radius:5px;cursor:pointer">Cancelar</button>
    </div>
  `);
  rvCalcNeto();
}

async function savePlanilla(id) {
  const emp = document.getElementById('pl-emp').value.trim();
  const mes = document.getElementById('pl-mes').value;
  const ano = document.getElementById('pl-ano').value;
  if (!emp) { alert('❌ Ingresa el nombre del empleado'); return; }
  if (!mes) { alert('❌ Selecciona el mes'); return; }

  const formData = new FormData();
  formData.append('mes', mes);
  formData.append('ano', ano);
  formData.append('empleado', emp);
  formData.append('sueldo', rvNum(document.getElementById('pl-sueldo').value));
  formData.append('bonificacion', rvNum(document.getElementById('pl-bonif').value));
  formData.append('descuentos', rvNum(document.getElementById('pl-desc').value));

  try {
    const url = id ? `${RV_API}/planilla/${id}` : `${RV_API}/planilla`;
    const response = await fetch(url, { method: id ? 'PUT' : 'POST', body: formData });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      alert('✅ Planilla guardada. Neto: ' + (data.neto ? rvMoney(data.neto) : ''));
      closeRvModal();
      loadPlanilla();
    } else {
      alert('❌ ' + (data.error || 'Error del servidor'));
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

async function deletePlanilla(id) {
  if (!confirm('¿Eliminar este registro de planilla?')) return;
  try {
    await fetch(`${RV_API}/planilla/${id}`, { method: 'DELETE' });
    loadPlanilla();
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// SINCRONIZACIÓN AUTOMÁTICA localStorage → MySQL
// El sistema principal guarda en localStorage (rv_ventas, rv_gastos,
// rv_stock, rv_users, rv_pp_estados...). Esta capa intercepta cada
// guardado y lo respalda en la base de datos con debounce de 1s.
// Al cargar la página, el script del <head> ya restauró los datos.
// ═══════════════════════════════════════════════════════════════
(function initSyncBD() {
  const PREFIJO = 'rv_';
  let pendientes = {};
  let timer = null;

  function empujar() {
    const payload = pendientes;
    pendientes = {};
    const claves = Object.keys(payload);
    if (claves.length === 0) return;
    fetch(`${RV_API}/storage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => {
        if (r.ok) console.log('[SYNC] ✓ Guardado en BD:', claves.join(', '));
        else console.error('[SYNC] ✗ Error HTTP', r.status);
      })
      .catch(err => console.error('[SYNC] ✗', err.message));
  }

  function programar(clave, valor) {
    pendientes[clave] = valor;
    clearTimeout(timer);
    timer = setTimeout(empujar, 350); // guardado casi inmediato → multi-dispositivo confiable
  }
  window.rvEmpujarAhora = empujar; // permite forzar el guardado inmediato

  // Interceptar escrituras (vía prototype: asignar directo a localStorage
  // guardaría la función como item — pitfall clásico de Storage)
  const setOriginal = Storage.prototype.setItem;
  Storage.prototype.setItem = function (clave, valor) {
    setOriginal.call(this, clave, valor);
    if (this === window.localStorage && String(clave).startsWith(PREFIJO)) {
      programar(clave, valor);
    }
  };
  const removeOriginal = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (clave) {
    removeOriginal.call(this, clave);
    if (this === window.localStorage && String(clave).startsWith(PREFIJO)) {
      programar(clave, null); // null = borrar en el servidor
    }
  };

  // Al cerrar la pestaña, enviar lo pendiente sin esperar
  window.addEventListener('beforeunload', () => {
    const claves = Object.keys(pendientes);
    if (claves.length && navigator.sendBeacon) {
      navigator.sendBeacon(
        `${RV_API}/storage`,
        new Blob([JSON.stringify(pendientes)], { type: 'application/json' })
      );
      pendientes = {};
    }
  });

  // Migración inicial: datos locales que el servidor aún no tiene
  // (primera vez tras activar la sincronización)
  const clavesServidor = window.RV_SERVER_KEYS || [];
  const migrar = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIJO) && !clavesServidor.includes(k)) {
      migrar[k] = localStorage.getItem(k);
    }
  }
  if (Object.keys(migrar).length) {
    console.log('[SYNC] Migrando datos locales a BD:', Object.keys(migrar).join(', '));
    pendientes = migrar;
    empujar();
  }

  console.log('[SYNC] ✓ Respaldo automático en BD activo');
})();

// ═══════════════════════════════════════════════════════════════
// INTEGRACIÓN CON LA NAVEGACIÓN DEL SISTEMA PRINCIPAL
// Envuelve goPage (sin reemplazar su lógica) para cargar los
// módulos API cuando se visitan sus páginas.
// ═══════════════════════════════════════════════════════════════
(function integrarNavegacion() {
  if (typeof window.goPage === 'function') {
    const goPageOriginal = window.goPage;
    window.goPage = function (id) {
      if (window.RV_ROL_REAL === 'operaciones' && RV_PAGINAS_BLOQUEADAS.indexOf(id) !== -1) {
        if (typeof showToast === 'function') showToast('Tu usuario no tiene acceso a este módulo');
        else alert('Tu usuario no tiene acceso a este módulo.');
        id = 'dashboard';
      }
      goPageOriginal(id);
      if (id === 'proyectos') loadProyectos();
      if (id === 'planilla') loadPlanilla();
      if (id === 'usuarios' && typeof rvCargarUsuariosBD === 'function') rvCargarUsuariosBD();
      if (id === 'gastos' && typeof rvInyectarBotonDuplicados === 'function') rvInyectarBotonDuplicados();
      if (id === 'dashboard' && typeof rvInyectarBotonRecalc === 'function') rvInyectarBotonRecalc();
    };
    console.log('[RV-API] ✓ Navegación integrada (proyectos, planilla)');
  } else {
    console.warn('[RV-API] goPage del sistema principal no encontrado');
  }
})();

// ═══════════════════════════════════════════════════════════════
// EXTENSIONES DEL SISTEMA PRINCIPAL (decoración, sin reemplazar lógica)
// ═══════════════════════════════════════════════════════════════

// ── Subida genérica: devuelve la ruta del archivo en el servidor ──
async function rvSubirArchivo(file) {
  try {
    const fd = new FormData();
    fd.append('archivo', file);
    const r = await fetch(`${RV_API}/archivos`, { method: 'POST', body: fd });
    const data = await r.json();
    if (r.ok && data.ruta) return data.ruta;
    alert('❌ Error al subir archivo: ' + (data.error || r.status));
    return null;
  } catch (e) {
    alert('❌ Error: ' + e.message);
    return null;
  }
}

// ══ GASTOS / MOVILIDAD: PDF por registro (nuevos y existentes) ══
// Los comprobantes se guardan en rv_gastos_pdfs {clave: ruta} — la capa
// de sincronización los respalda en MySQL automáticamente.
function rvPdfsGastos() {
  try { return JSON.parse(localStorage.getItem('rv_gastos_pdfs') || '{}'); } catch (e) { return {}; }
}
function rvGuardarPdfGasto(clave, ruta) {
  const m = rvPdfsGastos();
  m[clave] = ruta;
  localStorage.setItem('rv_gastos_pdfs', JSON.stringify(m));
  if (window.rvEmpujarAhora) window.rvEmpujarAhora(); // guardar en servidor de inmediato
}
// Réplica exacta del orden de filas de renderGastos: [seed, ...locales] invertido
function rvGastosConClave() {
  const seed = (typeof GASTOS_DATA !== 'undefined') ? GASTOS_DATA : [];
  let local = [];
  try { local = JSON.parse(localStorage.getItem('rv_gastos') || '[]'); } catch (e) {}
  const todos = [
    ...seed.map((g, i) => ({ g, clave: g.id ? 'g' + g.id : 's' + i })),
    ...local.map(g => ({ g, clave: 'g' + g.id }))
  ];
  return todos.reverse();
}
// Asigna una clave ESTABLE a cada gasto precargado (para el mapa de PDFs)
(function rvTagGastos() {
  try {
    if (typeof GASTOS_DATA !== 'undefined') {
      GASTOS_DATA.forEach((g, i) => { if (!g.__clave) g.__clave = (g.id != null ? 'g' + g.id : 's' + i); });
    }
  } catch (e) {}
})();
// Decora usando la clave incrustada en cada fila (data-clave) → sin depender del
// orden/índice; así los PDFs no se desalinean con filtros ni eliminados.
function rvDecorarGastos() {
  const tbody = document.getElementById('tbl-gastos-body');
  if (!tbody) return;
  const pdfs = rvPdfsGastos();
  tbody.querySelectorAll('tr').forEach(tr => {
    const celda = tr.lastElementChild;
    if (!celda || celda.querySelector('.rv-pdf-btn')) return;
    const clave = tr.getAttribute('data-clave');
    if (!clave) return;
    const ruta = pdfs[clave];
    const cont = document.createElement('span');
    cont.style.whiteSpace = 'nowrap';
    cont.innerHTML =
      (ruta ? `<button class="rv-pdf-btn" onclick="viewFile('${ruta}')" title="Ver comprobante" style="background:#e3f0fb;border:1.5px solid #bdd7f3;border-radius:5px;cursor:pointer;padding:1px 6px;font-size:11px;margin-left:3px">📄</button>` : '') +
      `<button class="rv-pdf-btn" onclick="rvSubirPdfGasto('${clave}')" title="${ruta ? 'Reemplazar' : 'Subir'} comprobante" style="background:none;border:1.5px solid var(--c-border,#d8dde3);border-radius:5px;cursor:pointer;padding:1px 6px;font-size:11px;margin-left:3px">📤</button>`;
    celda.appendChild(cont);
  });
}
async function rvSubirPdfGasto(clave) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.xml,.jpg,.png,.jpeg';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ruta = await rvSubirArchivo(file);
    if (ruta) {
      rvGuardarPdfGasto(clave, ruta);
      if (typeof window.renderGastos === 'function') window.renderGastos();
      if (typeof showToast === 'function') showToast('✅ Comprobante guardado');
      else alert('✅ Comprobante guardado');
    }
  };
  input.click();
}
// Input de archivo en el formulario de nuevo gasto
function rvInyectarInputPdfGasto() {
  if (document.getElementById('rv-g-pdf')) return;
  const btn = document.querySelector('#page-gastos [onclick*="saveGasto"]');
  if (!btn) return;
  const div = document.createElement('div');
  div.innerHTML = `<label style="font-size:12px;font-weight:600;color:#455a64;display:block;margin-top:6px">📎 Comprobante (opcional)</label>
    <input type="file" id="rv-g-pdf" accept=".pdf,.xml,.jpg,.png,.jpeg" style="width:100%;padding:6px;margin:4px 0 8px 0;border:1px solid #d8dde3;border-radius:5px;font-size:12px" />`;
  btn.parentElement.insertBefore(div, btn);
}

// ══ MES A MES: click en un mes → desglose de todas sus ventas ══
function rvDecorarMeses() {
  const tbody = document.getElementById('tbl-meses-body');
  if (!tbody || typeof SEED === 'undefined') return;
  const filas = tbody.querySelectorAll('tr');
  filas.forEach((tr, i) => {
    const m = SEED.meses[i];
    if (!m) return;
    tr.style.cursor = 'pointer';
    tr.title = '🔍 Click para ver el desglose de ventas de ' + m.m;
    tr.onclick = () => rvDesgloseMes(m.p, m.m);
  });
}
function rvDesgloseMes(periodo, etiqueta) {
  let rows = [];
  try {
    rows = (typeof getDetalleData === 'function' ? getDetalleData() : []).filter(r => r.mes === periodo);
  } catch (e) { console.error('[DESGLOSE]', e); }
  window.__rvDesglose = { rows: rows, etiqueta: etiqueta, periodo: periodo };
  const totV = rows.reduce((s, r) => s + (r.venta || 0), 0);
  const totC = rows.reduce((s, r) => s + (r.costo || 0), 0);
  const totM = totV - totC;
  const cuerpo = rows.length
    ? rows.map(r => {
        const mg = (r.venta || 0) - (r.costo || 0);
        return `<tr>
          <td style="font-size:11px;white-space:nowrap">${r.fecha || '—'}</td>
          <td style="font-size:11px">${rvEsc(r.canal || '—')}</td>
          <td style="font-size:11px">${rvEsc(r.cliente || '—')}</td>
          <td style="font-size:11px">${rvEsc(r.modelo || '—')}</td>
          <td style="font-size:11px">${rvEsc(r.marca || '—')}</td>
          <td style="font-size:11px;font-weight:600;text-align:right">${rvMoney(r.venta)}</td>
          <td style="font-size:11px;text-align:right">${rvMoney(r.costo)}</td>
          <td style="font-size:11px;text-align:right;font-weight:600;color:${mg >= 0 ? '#198c35' : '#c0392b'}">${rvMoney(mg)}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="8" style="text-align:center;color:#999;padding:16px">Sin ventas registradas este mes</td></tr>';
  rvModal(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #eee;padding-bottom:10px;gap:10px">
      <h3 style="margin:0;color:#333">📅 Desglose de Ventas — ${rvEsc(etiqueta)}</h3>
      <div style="display:flex;gap:8px;align-items:center">
        <button onclick="rvDescargarDesgloseMes()" style="background:#198c35;color:#fff;border:none;border-radius:5px;padding:7px 12px;cursor:pointer;font-size:12px;font-weight:600">⬇ Descargar Excel</button>
        <button onclick="closeRvModal()" style="background:none;border:none;font-size:24px;cursor:pointer">×</button>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:120px;background:#e3f0fb;padding:10px;border-radius:6px;text-align:center"><div style="font-size:11px;color:#455a64">VENTAS</div><strong style="color:#1565c0">${rvMoney(totV)}</strong></div>
      <div style="flex:1;min-width:120px;background:#fdecea;padding:10px;border-radius:6px;text-align:center"><div style="font-size:11px;color:#455a64">COSTO</div><strong style="color:#c0392b">${rvMoney(totC)}</strong></div>
      <div style="flex:1;min-width:120px;background:#ebf7ee;padding:10px;border-radius:6px;text-align:center"><div style="font-size:11px;color:#455a64">MARGEN</div><strong style="color:#198c35">${rvMoney(totM)}</strong></div>
      <div style="flex:1;min-width:120px;background:#eceff1;padding:10px;border-radius:6px;text-align:center"><div style="font-size:11px;color:#455a64">TRANSACCIONES</div><strong>${rows.length}</strong></div>
    </div>
    <div style="overflow:auto;max-height:52vh">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#0f2540;color:#fff;font-size:11px"><th style="padding:6px">Fecha</th><th>Canal</th><th>Cliente</th><th>Modelo</th><th>Marca</th><th style="text-align:right">Venta</th><th style="text-align:right">Costo</th><th style="text-align:right">Margen</th></tr></thead>
        <tbody>${cuerpo}</tbody>
      </table>
    </div>
  `, 920);
}

// Descarga a Excel el desglose completo del mes mostrado
function rvDescargarDesgloseMes() {
  if (typeof XLSX === 'undefined') { alert('❌ Librería XLSX no disponible'); return; }
  const d = window.__rvDesglose;
  if (!d || !d.rows || !d.rows.length) { alert('No hay ventas para descargar en este mes'); return; }
  const aoa = [['Fecha', 'Canal', 'Cliente', 'Comprobante', 'Serie', 'Correlativo', 'N° Operación', 'Modelo', 'Marca', 'Qty', 'Venta S/.', 'Costo S/.', 'Margen S/.', 'Medio Pago']];
  let tV = 0, tC = 0;
  d.rows.forEach(r => {
    const venta = rvNum(r.venta), costo = rvNum(r.costo);
    tV += venta; tC += costo;
    aoa.push([
      r.fecha || '', r.canal || '', r.cliente || '', r.tipo_doc || '', r.serie || '', r.correlativo || '',
      r.n_operacion || '', r.modelo || '', r.marca || '', r.qty || 1,
      venta, costo, venta - costo, r.medio_pago || ''
    ]);
  });
  aoa.push([]);
  aoa.push(['', '', '', '', '', '', '', '', 'TOTALES', d.rows.length, tV, tC, tV - tC, '']);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 11 }, { wch: 13 }, { wch: 26 }, { wch: 12 }, { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  const nombreHoja = String(d.etiqueta || 'Mes').replace(/[^\w-]/g, '_').slice(0, 28);
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  XLSX.writeFile(wb, 'desglose_ventas_' + (d.periodo || 'mes') + '.xlsx');
}

// ══ CORPORATIVO / ECOMMERCE: registrar ventas manualmente ══
// Las ventas registradas entran a saveVenta() del sistema → recalculan
// dashboard, mes a mes, canales, marcas y clientes corporativos.
function rvAbrirVentaCanal(canal) {
  const sel = document.getElementById('v-canal');
  if (sel) {
    const set = new Set((typeof SEED !== 'undefined' && SEED.canales) ? SEED.canales.map(c => c.ch) : []);
    ['Corporativo', 'Ecommerce', 'MercadoLibre', 'Saga Falabella'].forEach(c => set.add(c));
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      [...set].map(c => `<option value="${rvEsc(c)}"${c === canal ? ' selected' : ''}>${rvEsc(c)}</option>`).join('');
    sel.value = canal;
  }
  const f = document.getElementById('v-fecha');
  if (f && !f.value) f.value = new Date().toISOString().slice(0, 10);
  if (typeof openModal === 'function') openModal('modal-venta');
}
function rvInyectarBotonAgregar(pageId, btnId, texto, canal) {
  const page = document.getElementById(pageId);
  if (!page || document.getElementById(btnId)) return;
  const btn = document.createElement('button');
  btn.id = btnId;
  btn.className = 'btn btn-success';
  btn.style.cssText = 'margin:10px 0';
  btn.textContent = texto;
  btn.onclick = () => rvAbrirVentaCanal(canal);
  const ancla = page.querySelector('.page-sub') || page.querySelector('.page-title');
  if (ancla) ancla.insertAdjacentElement('afterend', btn);
}
// Estado de pago por cliente corporativo (persistido en BD vía rv_corp_estados)
function rvDecorarCorp() {
  // Botón de venta por volumen (varios productos por venta)
  (function () {
    const page = document.getElementById('page-corporativo');
    if (page && !document.getElementById('rv-btn-corp-add')) {
      const cont = document.createElement('div');
      cont.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:10px 0';
      cont.innerHTML = `
        <button id="rv-btn-corp-add" class="btn btn-success">➕ Nueva Venta Corporativa (por volumen)</button>
        <button id="rv-btn-corp-tpl" class="btn btn-outline">📥 Plantilla XLS</button>
        <button id="rv-btn-corp-imp" class="btn btn-outline">📂 Importar XLS (por bloque)</button>`;
      const ancla = page.querySelector('.page-sub') || page.querySelector('.page-title');
      if (ancla) ancla.insertAdjacentElement('afterend', cont);
      cont.querySelector('#rv-btn-corp-add').onclick = () => rvNuevaVentaCorpVolumen();
      cont.querySelector('#rv-btn-corp-tpl').onclick = () => rvDescargarPlantillaCorp();
      cont.querySelector('#rv-btn-corp-imp').onclick = () => rvImportarCorp();
    }
  })();
  rvRenderVentasCorpVolumen();
  const tbody = document.getElementById('tbl-corp-body');
  if (!tbody || typeof SEED === 'undefined' || !SEED.clientes) return;
  let estados = {};
  try { estados = JSON.parse(localStorage.getItem('rv_corp_estados') || '{}'); } catch (e) {}
  const filas = tbody.querySelectorAll('tr');
  SEED.clientes.forEach((c, i) => {
    const tr = filas[i];
    if (!tr) return;
    const celda = tr.children[6];
    if (!celda || celda.querySelector('.rv-pago-btn')) return;
    const estado = estados[c.n] || (c.estado === 'Facturado' || c.estado === 'Completado' ? 'Pagado' : 'Pendiente');
    const st = estado === 'Pagado' ? 'background:#ebf7ee;color:#155724' : 'background:#fdecea;color:#c0392b';
    const btn = document.createElement('button');
    btn.className = 'rv-pago-btn';
    btn.style.cssText = st + ';border:none;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer;margin-left:4px';
    btn.textContent = estado === 'Pagado' ? '✅ Pagado' : '🔴 Pendiente';
    btn.title = 'Click para cambiar el estado de pago';
    btn.onclick = () => rvToggleCorpPago(c.n);
    celda.appendChild(btn);
  });
}
function rvToggleCorpPago(nombre) {
  let estados = {};
  try { estados = JSON.parse(localStorage.getItem('rv_corp_estados') || '{}'); } catch (e) {}
  estados[nombre] = (estados[nombre] === 'Pagado') ? 'Pendiente' : 'Pagado';
  localStorage.setItem('rv_corp_estados', JSON.stringify(estados));
  if (typeof window.renderCorpTable === 'function') window.renderCorpTable();
}
function rvDecorarEcommerce() {
  rvInyectarBotonAgregar('page-ecommerce', 'rv-btn-ec-add', '➕ Nueva Venta Ecommerce', 'Ecommerce');
}

// ═══════════════════════════════════════════════════════════════
// VENTA CORPORATIVA POR VOLUMEN (varios productos por venta)
// Cada línea se guarda en rv_ventas como transacción canal 'Corporativo'
// con un 'grupo' compartido + condición (contado/crédito). Se integra a
// todos los cálculos vía rvRebuildTxns. Al hacer click en la venta se
// despliega el detalle de sus productos.
// ═══════════════════════════════════════════════════════════════
const RV_MARCAS = ['EZVIZ', 'HIKVISION', 'DAHUA', 'HUAWEI', 'MSI', 'ASUS', 'LENOVO', 'HP', 'WD / HDD', 'TP-LINK', 'ZKTeco', 'LAPTOPS', 'Servicios', 'Otros'];

// ═══════════════════════════════════════════════════════════════
// AUTO-COSTO: al registrar una venta, jala el costo del PRECIO DE COMPRA
// del mismo producto (busca en COMPRAS_DATA por código de modelo + marca).
// ═══════════════════════════════════════════════════════════════
function rvCostoUnitCompra(c) {
  const sol = rvNum(c.sol), usd = rvNum(c.usd);
  const tc = (typeof TC_FIJO !== 'undefined') ? TC_FIJO : 3.5;
  return sol > 0 ? sol : (usd > 0 ? usd * tc : 0);
}
// Normaliza texto (minúsculas, sin acentos ni signos)
function rvNorm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
// Similitud de dos palabras por bigramas de caracteres (coeficiente de Dice, 0..1)
function rvSimBigram(a, b) {
  a = rvNorm(a); b = rvNorm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const bg = s => { const m = {}; for (let i = 0; i < s.length - 1; i++) { const g = s.substr(i, 2); m[g] = (m[g] || 0) + 1; } return m; };
  const A = bg(a), B = bg(b); let inter = 0, tA = 0, tB = 0;
  for (const g in A) { tA += A[g]; if (B[g]) inter += Math.min(A[g], B[g]); }
  for (const g in B) tB += B[g];
  return (tA + tB) ? (2 * inter) / (tA + tB) : 0;
}
// Similitud producto→compra: fracción de palabras del modelo halladas en la
// descripción de la compra (exactas o con ≥80% de parecido). Maneja que la
// descripción sea más larga que el modelo.
function rvSimTokens(modelo, desc) {
  const mt = rvNorm(modelo).split(' ').filter(t => t.length >= 2);
  const dt = rvNorm(desc).split(' ').filter(t => t.length >= 2);
  if (!mt.length || !dt.length) return 0;
  const dset = new Set(dt);
  let hit = 0;
  mt.forEach(t => {
    if (dset.has(t)) { hit++; return; }
    for (const d of dt) { if (rvSimBigram(t, d) >= 0.8) { hit++; break; } }
  });
  return hit / mt.length;
}
// Devuelve el mejor match de compra (≥80% similitud) con detalle: {costo, prov, desc, sim}
function rvBuscarCostoDetalle(modelo, marca) {
  if (typeof COMPRAS_DATA === 'undefined' || !modelo) return null;
  const mk = rvNorm(marca);
  const codeM = (typeof extractModelCode === 'function') ? extractModelCode(modelo) : '';
  let best = null, bestSim = 0;
  COMPRAS_DATA.forEach(c => {
    const unit = rvCostoUnitCompra(c);
    if (unit <= 0) return;
    let sim = rvSimTokens(modelo, c.desc);
    if (codeM) {
      const codeD = (typeof extractModelCode === 'function') ? extractModelCode(c.desc) : '';
      if (codeD && codeD.toUpperCase() === codeM.toUpperCase()) sim = Math.max(sim, 1);
    }
    const cMarca = rvNorm(c.marca);
    if (mk && cMarca && mk !== cMarca) sim *= 0.5;
    if (sim > bestSim) { bestSim = sim; best = { costo: unit, prov: c.prov || '', desc: c.desc || '', marca: c.marca || '', sim: sim }; }
  });
  return (best && bestSim >= 0.8) ? best : null; // umbral 80%
}
function rvBuscarCostoCompra(modelo, marca) {
  const d = rvBuscarCostoDetalle(modelo, marca);
  return d ? d.costo : null;
}

// ── Overrides de costo para datos preexistentes/históricos ──
// Los costos completados se guardan por firma de venta y se re-aplican en cada
// reconstrucción (rvRebuildTxns), así persisten (se respaldan en la BD).
function rvSigVenta(r) {
  return [rvNorm(r.modelo), rvNorm(r.marca), r.fecha || r.mes || '', rvNum(r.venta)].join('|');
}
function rvCostosOverride() {
  try { return JSON.parse(localStorage.getItem('rv_costos_override') || '{}'); } catch (e) { return {}; }
}
function rvAplicarOverridesCostos() {
  if (typeof TXNS_DATA === 'undefined') return;
  const ov = rvCostosOverride();
  if (!Object.keys(ov).length) return;
  TXNS_DATA.forEach(t => {
    const sig = rvSigVenta(t);
    if (ov[sig] != null && !(rvNum(t.costo) > 0)) {
      const q = rvNum(t.qty) || 1;
      t.costo = rvNum(ov[sig]) * q;   // ov guarda costo UNITARIO → costo total = unit × qty
      t.margen = rvNum(t.venta) - t.costo;
      t.margen_pct = t.venta ? (t.margen / t.venta * 100) : 0;
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// RECUPERACIÓN DE INVERSIÓN + GASTOS FIJOS NO CUBIERTOS
// Monto a recuperar = Inversión + Σ (gastos fijos del mes NO cubiertos).
// "No cubierto" = parte del gasto fijo que lo disponible del mes
// (ventas − costos − gastos variables) no alcanzó a pagar. Solo meses pasados.
// ═══════════════════════════════════════════════════════════════
// Estimado recurrente (fallback cuando aún no hay data mensual registrada)
function rvTotalFijosMensual() {
  const tc = (typeof TC_FIJO !== 'undefined') ? TC_FIJO : 3.5;
  let alq = 0, plan = 0;
  try { if (typeof ALQUILERES_DATA !== 'undefined') alq = ALQUILERES_DATA.reduce((s, r) => s + (r.moneda === 'USD' ? rvNum(r.monto_mensual) * tc : rvNum(r.monto_mensual)), 0); } catch (e) {}
  try { if (typeof PLANILLA_DATA !== 'undefined') plan = PLANILLA_DATA.reduce((s, r) => s + rvNum(r.remuneracion), 0); } catch (e) {}
  return alq + plan;
}
// Totales por mes tomados de la BD (gastos_fijos + planilla registrados)
window.RV_FIJOS_MES = {};
window.RV_PLAN_MES = {};
async function rvCargarFijosPlanillaBD() {
  try {
    const [gf, pl] = await Promise.all([
      fetch(`${RV_API}/gastos-fijos`).then(r => r.json()).catch(() => []),
      fetch(`${RV_API}/planilla`).then(r => r.json()).catch(() => [])
    ]);
    const fmes = {}, pmes = {};
    if (Array.isArray(gf)) gf.forEach(g => { const p = g.ano + '-' + String(g.mes).padStart(2, '0'); fmes[p] = (fmes[p] || 0) + rvNum(g.monto); });
    if (Array.isArray(pl)) pl.forEach(x => { const p = x.ano + '-' + String(x.mes).padStart(2, '0'); pmes[p] = (pmes[p] || 0) + rvNum(x.neto); });
    window.RV_FIJOS_MES = fmes;
    window.RV_PLAN_MES = pmes;
    console.log('[FIJOS-BD] ✓ gastos fijos/planilla por mes cargados');
  } catch (e) { console.warn('[FIJOS-BD]', e.message); }
}
// Gasto fijo del mes: real de la BD (gastos fijos + planilla). Si aún no hay
// NADA registrado en ningún mes, usa el estimado recurrente (transición).
function rvFijosMes(periodo) {
  const hayData = Object.keys(window.RV_FIJOS_MES || {}).length || Object.keys(window.RV_PLAN_MES || {}).length;
  if (!hayData) return rvTotalFijosMensual();
  return ((window.RV_FIJOS_MES || {})[periodo] || 0) + ((window.RV_PLAN_MES || {})[periodo] || 0);
}
function rvGastosVarMes(periodo) {
  const seed = (typeof GASTOS_DATA !== 'undefined') ? GASTOS_DATA : [];
  let local = []; try { local = JSON.parse(localStorage.getItem('rv_gastos') || '[]'); } catch (e) {}
  return seed.concat(local)
    .filter(g => g.mes === periodo || String(g.fecha || '').slice(0, 7) === periodo)
    .reduce((s, g) => s + rvNum(g.monto), 0);
}
function rvGastosFijosNoCubiertos(conDetalle) {
  const vacio = conDetalle ? { total: 0, meses: [] } : 0;
  if (typeof SEED === 'undefined' || !Array.isArray(SEED.meses)) return vacio;
  const hoy = new Date();
  const curP = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
  let acum = 0; const det = [];
  SEED.meses.forEach(m => {
    if (!(rvNum(m.v) > 0)) return;      // solo meses con actividad
    if (m.p >= curP) return;            // solo meses pasados (cerrados)
    const fijosMes = rvFijosMes(m.p);   // gasto fijo REAL de ese mes (BD)
    if (fijosMes <= 0) return;          // sin gasto fijo registrado ese mes → no aplica
    const disponible = rvNum(m.v) - rvNum(m.c) - rvGastosVarMes(m.p);
    const noCub = Math.max(0, fijosMes - Math.max(0, disponible)); // parte del fijo no cubierta
    if (noCub > 0) det.push({ mes: m.m, noCub: noCub, fijo: fijosMes });
    acum += noCub;
  });
  return conDetalle ? { total: acum, meses: det } : acum;
}
// Actualiza el % de avance con el nuevo monto a recuperar y muestra el desglose
function rvActualizarRecuperacion() {
  try {
    if (typeof SEED === 'undefined') return;
    const inv = rvNum(SEED.inv_tot);
    const info = rvGastosFijosNoCubiertos(true);
    const noCub = info.total;
    const target = inv + noCub;
    const tot_v = (typeof computeTotals === 'function') ? rvNum(computeTotals().tot_v) : rvNum(SEED.tot_v);
    const pct = target > 0 ? (tot_v / target * 100) : 0;
    const avEl = document.getElementById('avance-pct');
    if (avEl) avEl.textContent = pct.toFixed(1) + '%';
    const alerta = document.querySelector('#page-dashboard .alert.alert-info');
    if (alerta) {
      let box = document.getElementById('rv-recuperacion');
      if (!box) {
        box = document.createElement('div');
        box.id = 'rv-recuperacion';
        box.style.cssText = 'font-size:12px;margin-top:8px;background:#eef6ff;border:1px solid #bdd7f3;color:#0a3060;padding:10px;border-radius:8px;line-height:1.6';
        alerta.insertAdjacentElement('afterend', box);
      }
      box.innerHTML = `<b>Monto a recuperar: ${rvMoney(target)}</b> = Inversión ${rvMoney(inv)} + Gastos fijos no cubiertos ${rvMoney(noCub)}` +
        ` · Recuperado ${rvMoney(tot_v)} · <b>Avance real: ${pct.toFixed(1)}%</b>` +
        (info.meses.length ? `<br><span style="font-size:11px;color:#455a64">Meses con gasto fijo no cubierto: ${info.meses.map(x => x.mes + ' (' + rvMoney(x.noCub) + ')').join(' · ')}</span>` : '');
    }
  } catch (e) { console.error('[RECUP]', e); }
}

// Conecta el auto-costo al modal de venta individual (v-modelo/v-marca → v-costo)
function rvWireAutoCosto() {
  const modelo = document.getElementById('v-modelo');
  const marca = document.getElementById('v-marca');
  const costo = document.getElementById('v-costo');
  if (!modelo || !costo || modelo.dataset.rvWired === '1') return;
  modelo.dataset.rvWired = '1';
  const aplicar = () => {
    const c = rvBuscarCostoCompra(modelo.value, marca ? marca.value : '');
    if (c != null && (!costo.value || parseFloat(costo.value) === 0 || costo.dataset.rvAuto === '1')) {
      costo.value = c.toFixed(2);
      costo.dataset.rvAuto = '1';
      costo.style.background = '#ebf7ee';
      costo.title = 'Costo tomado automáticamente del precio de compra';
      if (typeof updateMargenPreview === 'function') try { updateMargenPreview(); } catch (e) {}
    }
  };
  modelo.addEventListener('blur', aplicar);
  modelo.addEventListener('change', aplicar);
  if (marca) marca.addEventListener('change', aplicar);
  costo.addEventListener('input', () => { costo.dataset.rvAuto = ''; costo.style.background = ''; });
}
// Auto-costo para cada línea de la venta corporativa por volumen
function rvAutoCostoLinea(inputModelo) {
  const tr = inputModelo.closest('tr');
  if (!tr) return;
  const marcaSel = tr.querySelector('.rvc-marca');
  const costoInp = tr.querySelector('.rvc-costo');
  const c = rvBuscarCostoCompra(inputModelo.value, marcaSel ? marcaSel.value : '');
  if (c != null && costoInp && (!costoInp.value || parseFloat(costoInp.value) === 0)) {
    costoInp.value = c.toFixed(2);
    costoInp.style.background = '#ebf7ee';
    costoInp.title = 'Costo tomado del precio de compra';
    if (typeof rvCorpCalc === 'function') rvCorpCalc();
  }
}

// ── Completar costos de ventas PREEXISTENTES desde compras (con vista previa) ──
function rvCompletarCostos() {
  const rows = (typeof getDetalleData === 'function') ? getDetalleData() : [];
  const sinCosto = rows.filter(r => rvNum(r.venta) > 0 && !(rvNum(r.costo) > 0));
  const cands = [];
  sinCosto.forEach(r => { const m = rvBuscarCostoDetalle(r.modelo, r.marca); if (m) cands.push({ r, m }); });
  if (cands.length === 0) {
    alert(sinCosto.length === 0 ? '✓ Todas las ventas ya tienen costo.' : 'No se encontró compra con ≥80% de similitud para las ' + sinCosto.length + ' ventas sin costo.');
    return;
  }
  window.__rvCandCostos = cands;
  const filas = cands.slice(0, 400).map(x => `<tr>
    <td style="font-size:11px">${rvEsc(x.r.modelo || '—')}</td>
    <td style="font-size:11px">${rvEsc(x.r.marca || '—')}</td>
    <td style="font-size:11px;text-align:right">${rvMoney(x.r.venta)}</td>
    <td style="font-size:11px;text-align:right;color:#198c35;font-weight:600">${rvMoney(x.m.costo)}</td>
    <td style="font-size:10px;color:#666">${rvEsc(x.m.prov)} · ${(x.m.sim * 100).toFixed(0)}%</td>
  </tr>`).join('');
  rvModal(`
    <h3 style="margin:0 0 10px 0">🔧 Completar costos desde compras</h3>
    <div style="font-size:12px;color:#455a64;margin-bottom:10px">Se encontró el costo (precio de compra) para <b>${cands.length}</b> venta(s) sin costo, con ≥80% de similitud. Revisa y aplica:</div>
    <div style="overflow:auto;max-height:52vh"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#0f2540;color:#fff;font-size:11px"><th style="padding:5px">Producto</th><th>Marca</th><th style="text-align:right">Venta</th><th style="text-align:right">Costo hallado</th><th>Origen (compra · match)</th></tr></thead>
      <tbody>${filas}</tbody>
    </table></div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button onclick="rvAplicarCostos()" style="flex:1;padding:10px;background:#198c35;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600">✓ Aplicar a ${cands.length} venta(s)</button>
      <button onclick="closeRvModal()" style="flex:1;padding:10px;background:#eceff1;color:#333;border:none;border-radius:5px;cursor:pointer">Cancelar</button>
    </div>
  `, 780);
}
function rvAplicarCostos() {
  const cands = window.__rvCandCostos || [];
  const ov = rvCostosOverride();
  cands.forEach(({ r, m }) => {
    const q = rvNum(r.qty) || 1;
    r.costo = m.costo * q;          // m.costo es UNITARIO → costo total = unit × qty
    r.margen = rvNum(r.venta) - r.costo;
    r.margen_pct = r.venta ? (r.margen / r.venta * 100) : 0;
    ov[rvSigVenta(r)] = m.costo;    // se guarda el UNITARIO; se multiplica por qty al re-aplicar
  });
  localStorage.setItem('rv_costos_override', JSON.stringify(ov)); // se respalda en la BD
  closeRvModal();
  try { if (typeof recomputeSeedTotals === 'function') recomputeSeedTotals(); } catch (e) {}
  try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
  try { if (typeof initCharts === 'function') setTimeout(initCharts, 100); } catch (e) {}
  if (typeof showToast === 'function') showToast('✓ Costos completados: ' + cands.length + ' ventas');
}
function rvInyectarBotonCostos() {
  const page = document.getElementById('page-detalle');
  if (!page || document.getElementById('rv-btn-costos')) return;
  const b = document.createElement('button');
  b.id = 'rv-btn-costos';
  b.className = 'btn btn-outline';
  b.style.cssText = 'margin:10px 0 10px 8px;font-size:12px';
  b.textContent = '🔧 Completar costos desde compras';
  b.onclick = rvCompletarCostos;
  const a = page.querySelector('.page-sub') || page.querySelector('.page-title');
  if (a) a.insertAdjacentElement('afterend', b);
}

function rvCorpLineHTML() {
  const marcaOpts = RV_MARCAS.map(m => `<option value="${m}">${m}</option>`).join('');
  return `<tr class="rv-corp-line">
    <td><input type="text" class="rvc-modelo" placeholder="Modelo / producto" onblur="rvAutoCostoLinea(this)" style="width:100%;padding:5px;border:1px solid #d8dde3;border-radius:4px;font-size:12px"></td>
    <td><select class="rvc-marca" onchange="rvAutoCostoLinea(this.closest('tr').querySelector('.rvc-modelo'))" style="width:100%;padding:5px;border:1px solid #d8dde3;border-radius:4px;font-size:12px">${marcaOpts}</select></td>
    <td><input type="number" class="rvc-qty" value="1" min="1" step="1" oninput="rvCorpCalc()" style="width:60px;padding:5px;border:1px solid #d8dde3;border-radius:4px;font-size:12px;text-align:center"></td>
    <td><input type="number" class="rvc-precio" value="0" min="0" step="0.01" oninput="rvCorpCalc()" style="width:90px;padding:5px;border:1px solid #d8dde3;border-radius:4px;font-size:12px"></td>
    <td><input type="number" class="rvc-costo" value="0" min="0" step="0.01" oninput="rvCorpCalc()" style="width:90px;padding:5px;border:1px solid #d8dde3;border-radius:4px;font-size:12px"></td>
    <td style="text-align:center"><button onclick="this.closest('tr').remove(); rvCorpCalc()" style="background:#fdecea;color:#c0392b;border:none;border-radius:4px;cursor:pointer;padding:3px 7px;font-size:12px">✕</button></td>
  </tr>`;
}

function rvCorpCalc() {
  let totV = 0, totC = 0;
  document.querySelectorAll('#rvc-lines .rv-corp-line').forEach(tr => {
    const q = rvNum(tr.querySelector('.rvc-qty').value);
    const p = rvNum(tr.querySelector('.rvc-precio').value);
    const c = rvNum(tr.querySelector('.rvc-costo').value);
    totV += q * p; totC += q * c;
  });
  const el = document.getElementById('rvc-total');
  if (el) el.innerHTML = `Total venta: <b style="color:#198c35">${rvMoney(totV)}</b> · Costo: ${rvMoney(totC)} · Margen: <b>${rvMoney(totV - totC)}</b>`;
}

function rvAgregarLineaCorp() {
  const tb = document.getElementById('rvc-lines');
  if (tb) { tb.insertAdjacentHTML('beforeend', rvCorpLineHTML()); rvCorpCalc(); }
}

function rvNuevaVentaCorpVolumen() {
  rvModal(`
    <h3 style="margin:0 0 12px 0">➕ Nueva Venta Corporativa (por volumen)</h3>
    <div style="display:flex;gap:8px">
      <div style="flex:2"><label style="${RV_LABEL}">Cliente *</label><input type="text" id="rvc-cliente" placeholder="Razón social" style="${RV_INPUT}"></div>
      <div style="flex:1"><label style="${RV_LABEL}">Fecha *</label><input type="date" id="rvc-fecha" style="${RV_INPUT}"></div>
    </div>
    <div style="display:flex;gap:8px">
      <div style="flex:1"><label style="${RV_LABEL}">Condición *</label><select id="rvc-cond" style="${RV_INPUT}"><option value="Contado">Contado</option><option value="Crédito">Crédito</option></select></div>
      <div style="flex:1"><label style="${RV_LABEL}">N° Operación / Comprobante</label><input type="text" id="rvc-nop" placeholder="Opcional" style="${RV_INPUT}"></div>
    </div>
    <label style="${RV_LABEL}">Productos de esta venta</label>
    <div style="overflow-x:auto;border:1px solid #eee;border-radius:6px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#0f2540;color:#fff"><th style="padding:6px">Modelo</th><th>Marca</th><th>Cant</th><th>P.Unit</th><th>Costo/u</th><th></th></tr></thead>
        <tbody id="rvc-lines"></tbody>
      </table>
    </div>
    <button onclick="rvAgregarLineaCorp()" style="margin-top:8px;background:#e3f0fb;border:1px solid #bdd7f3;border-radius:5px;padding:6px 12px;cursor:pointer;font-size:12px">➕ Agregar producto</button>
    <div id="rvc-total" style="margin-top:10px;padding:8px;background:#f4f6f9;border-radius:5px;font-size:13px;text-align:center">Total venta: <b>S/. 0.00</b></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="rvGuardarVentaCorpVolumen()" style="flex:1;padding:10px;background:#198c35;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600">💾 Guardar venta</button>
      <button onclick="closeRvModal()" style="flex:1;padding:10px;background:#eceff1;color:#333;border:none;border-radius:5px;cursor:pointer">Cancelar</button>
    </div>
  `, 700);
  document.getElementById('rvc-fecha').value = new Date().toISOString().slice(0, 10);
  rvAgregarLineaCorp();
}

function rvGuardarVentaCorpVolumen() {
  const cliente = document.getElementById('rvc-cliente').value.trim();
  const fecha = document.getElementById('rvc-fecha').value;
  const cond = document.getElementById('rvc-cond').value;
  const nop = document.getElementById('rvc-nop').value.trim();
  if (!cliente) { alert('❌ Ingresa el cliente'); return; }
  if (!fecha) { alert('❌ Selecciona la fecha'); return; }

  const lineas = [];
  document.querySelectorAll('#rvc-lines .rv-corp-line').forEach(tr => {
    const modelo = tr.querySelector('.rvc-modelo').value.trim();
    const qty = Math.max(1, Math.round(rvNum(tr.querySelector('.rvc-qty').value)));
    const precio = rvNum(tr.querySelector('.rvc-precio').value);
    const costo = rvNum(tr.querySelector('.rvc-costo').value);
    if (modelo && precio > 0) {
      lineas.push({ modelo, marca: tr.querySelector('.rvc-marca').value, qty, precio, costo });
    }
  });
  if (lineas.length === 0) { alert('❌ Agrega al menos un producto con precio'); return; }

  const grupo = 'CORP-' + Date.now();
  const mes = fecha.slice(0, 7);
  let ev = [];
  try { ev = JSON.parse(localStorage.getItem('rv_ventas') || '[]'); } catch (e) { ev = []; }
  lineas.forEach(l => {
    ev.push({
      fecha, mes, canal: 'Corporativo', cliente,
      modelo: l.modelo, marca: l.marca, qty: l.qty,
      venta: l.qty * l.precio, costo: l.qty * l.costo,
      condicion: cond, medio_pago: cond, n_operacion: nop, grupo
    });
  });
  localStorage.setItem('rv_ventas', JSON.stringify(ev));
  rvFlushVentas();  // guardar en la BD de inmediato
  closeRvModal();
  if (typeof rvRebuildTxns === 'function') rvRebuildTxns();
  rvRenderVentasCorpVolumen();
  if (typeof showToast === 'function') showToast('✅ Venta corporativa registrada (' + lineas.length + ' productos)');
}

// Lista de ventas corporativas por volumen, agrupadas, clickeables para ver detalle
function rvRenderVentasCorpVolumen() {
  const page = document.getElementById('page-corporativo');
  if (!page) return;
  let card = document.getElementById('rv-corp-volumen');
  if (!card) {
    card = document.createElement('div');
    card.id = 'rv-corp-volumen';
    card.className = 'card';
    card.style.cssText = 'margin-top:14px';
    page.appendChild(card);
  }
  let ev = [];
  try { ev = JSON.parse(localStorage.getItem('rv_ventas') || '[]'); } catch (e) { ev = []; }
  const corp = ev.filter(v => v.canal === 'Corporativo' && v.grupo);
  const grupos = {};
  corp.forEach(v => {
    if (!grupos[v.grupo]) grupos[v.grupo] = { grupo: v.grupo, cliente: v.cliente, fecha: v.fecha, condicion: v.condicion || 'Contado', nop: v.n_operacion || '', items: [], total: 0 };
    grupos[v.grupo].items.push(v);
    grupos[v.grupo].total += rvNum(v.venta);
  });
  const lista = Object.values(grupos).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  if (lista.length === 0) {
    card.innerHTML = `<div class="card-title">🏢 Ventas Corporativas por Volumen</div>
      <div style="font-size:12px;color:#999;padding:12px;text-align:center">Aún no hay ventas por volumen. Usa "➕ Nueva Venta Corporativa (por volumen)".</div>`;
    return;
  }
  const filas = lista.map(g => {
    const cond = g.condicion === 'Crédito'
      ? '<span style="background:#fef3e8;color:#e67e22;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">Crédito</span>'
      : '<span style="background:#ebf7ee;color:#155724;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">Contado</span>';
    const detId = 'rvcd-' + g.grupo;
    const det = g.items.map(it => `<tr style="font-size:11px;background:#fafbfc">
        <td style="padding:4px 8px">${rvEsc(it.modelo)}</td>
        <td>${rvEsc(it.marca)}</td>
        <td style="text-align:center">${it.qty}</td>
        <td style="text-align:right">${rvMoney(rvNum(it.venta) / (it.qty || 1))}</td>
        <td style="text-align:right;font-weight:600">${rvMoney(it.venta)}</td>
      </tr>`).join('');
    return `<tr style="cursor:pointer" onclick="rvToggleCorpDet('${detId}')" title="Click para ver el detalle de productos">
        <td style="font-size:12px"><b>${rvEsc(g.cliente)}</b></td>
        <td style="font-size:11px;color:#666">${rvDate(g.fecha)}</td>
        <td style="text-align:center">${g.items.length} item(s)</td>
        <td style="text-align:right;font-weight:700">${rvMoney(g.total)}</td>
        <td style="text-align:center">${cond}</td>
        <td style="text-align:center">▼</td>
      </tr>
      <tr id="${detId}" style="display:none"><td colspan="6" style="padding:0 8px 8px 8px">
        <table style="width:100%;border-collapse:collapse;margin-top:4px">
          <thead><tr style="font-size:10px;color:#888"><th style="text-align:left;padding:4px 8px">Modelo</th><th style="text-align:left">Marca</th><th>Cant</th><th style="text-align:right">P.Unit</th><th style="text-align:right">Subtotal</th></tr></thead>
          <tbody>${det}</tbody>
        </table>
      </td></tr>`;
  }).join('');
  card.innerHTML = `<div class="card-title">🏢 Ventas Corporativas por Volumen</div>
    <div style="font-size:12px;color:#455a64;margin-bottom:8px">Click en una venta para desplegar sus productos. La condición (contado/crédito) se muestra a la derecha.</div>
    <div style="overflow-x:auto"><table style="width:100%">
      <thead><tr><th>Cliente</th><th>Fecha</th><th>Productos</th><th style="text-align:right">Total</th><th style="text-align:center">Condición</th><th></th></tr></thead>
      <tbody>${filas}</tbody>
    </table></div>`;
}

function rvToggleCorpDet(id) {
  const row = document.getElementById(id);
  if (row) row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
}

// ── Corporativo: plantilla + importación por Excel (carga por bloque) ──
function rvDescargarPlantillaCorp() {
  if (typeof XLSX === 'undefined') { alert('❌ Librería XLSX no disponible'); return; }
  const hoy = new Date().toISOString().slice(0, 10);
  const ws = XLSX.utils.aoa_to_sheet([
    ['Cliente', 'Fecha', 'Condicion', 'N_Operacion', 'Modelo', 'Marca', 'Cantidad', 'PrecioUnit', 'CostoUnit'],
    ['ACME SAC (ejemplo, borrar)', hoy, 'Credito', 'OP-123', 'CS-H6C', 'EZVIZ', 5, 150, 100],
    ['ACME SAC (ejemplo, borrar)', hoy, 'Credito', 'OP-123', 'NVR 8ch', 'DAHUA', 1, 800, 500]
  ]);
  ws['!cols'] = [{ wch: 26 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 9 }, { wch: 11 }, { wch: 11 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'VentasCorp');
  XLSX.writeFile(wb, 'plantilla_ventas_corporativas.xlsx');
}
function rvImportarCorp() {
  if (typeof XLSX === 'undefined') { alert('❌ Librería XLSX no disponible'); return; }
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
  input.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const get = (r, names) => { for (const n of names) { if (r[n] !== undefined && r[n] !== '') return r[n]; } return undefined; };
        const grupos = {}; let seq = 0;
        rows.forEach(r => {
          const cliente = String(get(r, ['Cliente', 'cliente', 'CLIENTE']) || '').trim();
          const modelo = String(get(r, ['Modelo', 'modelo', 'MODELO', 'Producto', 'producto']) || '').trim();
          if (!cliente || !modelo || cliente.toLowerCase().includes('ejemplo')) return;
          const fecha = rvParseFecha(get(r, ['Fecha', 'fecha', 'FECHA'])) || new Date().toISOString().slice(0, 10);
          const cond = String(get(r, ['Condicion', 'Condición', 'condicion']) || 'Contado').toLowerCase().includes('cred') ? 'Crédito' : 'Contado';
          const nop = String(get(r, ['N_Operacion', 'N Operacion', 'NOperacion', 'Operacion', 'operacion']) || '').trim();
          const key = cliente + '|' + fecha + '|' + cond + '|' + nop;
          if (!grupos[key]) grupos[key] = { cliente, fecha, cond, nop, grupo: 'CORP-' + Date.now() + '-' + (seq++), lineas: [] };
          const qty = Math.max(1, Math.round(rvNum(get(r, ['Cantidad', 'cantidad', 'Qty', 'QTY']) || 1)));
          const precio = rvNum(get(r, ['PrecioUnit', 'Precio', 'precio', 'PRECIO', 'Precio Unit']));
          const marca = String(get(r, ['Marca', 'marca', 'MARCA']) || 'Otros').trim();
          let costo = rvNum(get(r, ['CostoUnit', 'Costo', 'costo', 'COSTO', 'Costo Unit']));
          if (costo <= 0) { const c = rvBuscarCostoCompra(modelo, marca); if (c != null) costo = c; }
          grupos[key].lineas.push({ modelo, marca, qty, precio, costo });
        });
        let ev2 = []; try { ev2 = JSON.parse(localStorage.getItem('rv_ventas') || '[]'); } catch (e) {}
        let ventas = 0, items = 0;
        Object.values(grupos).forEach(g => {
          const validas = g.lineas.filter(l => l.precio > 0);
          if (!validas.length) return; ventas++;
          validas.forEach(l => {
            items++;
            ev2.push({ fecha: g.fecha, mes: g.fecha.slice(0, 7), canal: 'Corporativo', cliente: g.cliente, modelo: l.modelo, marca: l.marca, qty: l.qty, venta: l.qty * l.precio, costo: l.qty * l.costo, condicion: g.cond, medio_pago: g.cond, n_operacion: g.nop, grupo: g.grupo });
          });
        });
        if (items === 0) { alert('No se encontraron filas válidas (revisa Cliente, Modelo y PrecioUnit).'); return; }
        localStorage.setItem('rv_ventas', JSON.stringify(ev2));
        rvFlushVentas();
        if (typeof rvRebuildTxns === 'function') rvRebuildTxns();
        rvRenderVentasCorpVolumen();
        alert('✅ Importado: ' + ventas + ' venta(s) corporativa(s) · ' + items + ' productos');
      } catch (err) { alert('❌ Error al leer el archivo: ' + err.message); }
    };
    reader.readAsBinaryString(file);
  };
  input.click();
}

// Parser de fechas robusto: acepta Date, número de serie de Excel, dd/mm/yyyy,
// yyyy-mm-dd, yyyy/mm/dd. Devuelve 'YYYY-MM-DD' (o '' si no se puede).
function rvParseFecha(raw) {
  if (raw == null || raw === '') return '';
  if (raw instanceof Date) return isNaN(raw) ? '' : raw.toISOString().slice(0, 10);
  if (typeof raw === 'number') {
    const d = new Date(Math.round((raw - 25569) * 86400000));
    return isNaN(d) ? '' : d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Número de serie de Excel guardado como texto (ej. "46199")
  if (/^\d{4,6}$/.test(s)) {
    const n = parseInt(s, 10);
    if (n > 20000 && n < 90000) {
      const d = new Date(Math.round((n - 25569) * 86400000));
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
    }
  }
  if (s.includes('/')) {
    const p = s.split('/');
    if (p.length === 3) {
      if (p[2].length === 4) return p[2] + '-' + String(p[1]).padStart(2, '0') + '-' + String(p[0]).padStart(2, '0'); // dd/mm/yyyy
      if (p[0].length === 4) return p[0] + '-' + String(p[1]).padStart(2, '0') + '-' + String(p[2]).padStart(2, '0'); // yyyy/mm/dd
    }
  }
  return s.slice(0, 10);
}
// Quita duplicados EXACTOS de ventas y corrige fechas mal importadas (serial Excel)
async function rvQuitarDuplicadosVentas() {
  // 1) Corregir fechas mal importadas (Excel serial → ISO) en rv_ventas
  let v = []; try { v = JSON.parse(localStorage.getItem('rv_ventas') || '[]'); } catch (e) { v = []; }
  let fechasCorr = 0;
  v.forEach(x => {
    const nf = rvParseFecha(x.fecha);
    if (nf && nf !== x.fecha) { x.fecha = nf; fechasCorr++; }
    if (x.fecha) x.mes = String(x.fecha).slice(0, 7);
  });
  if (fechasCorr > 0) {
    localStorage.setItem('rv_ventas', JSON.stringify(v));
    if (typeof extraVentas !== 'undefined' && Array.isArray(extraVentas)) { extraVentas.length = 0; v.forEach(x => extraVentas.push(x)); }
    if (typeof rvRebuildTxns === 'function') await rvRebuildTxns(); // refleja las fechas corregidas
  }
  // 2) Duplicados sobre el TOTAL visible (base histórica + extras). Se marcan
  //    con LÁPIDAS por firma (rv_eliminados.txn, conteo) → borrado REAL que
  //    sobrevive recargas y reconstrucciones. Antes solo se depuraba rv_ventas,
  //    por eso los duplicados de la data base reaparecían al actualizar.
  const rows = (typeof getDetalleData === 'function') ? getDetalleData().filter(t => !t.__proy) : [];
  const conteo = {};
  rows.forEach(t => { const s = rvSigTxn(t); conteo[s] = (conteo[s] || 0) + 1; });
  const el = rvEliminados();
  let quitar = 0;
  for (const s in conteo) {
    if (conteo[s] > 1) { const ex = conteo[s] - 1; el.txn[s] = (parseInt(el.txn[s]) || 0) + ex; quitar += ex; }
  }
  if (quitar <= 0 && fechasCorr === 0) { alert('No hay ventas duplicadas ni fechas por corregir.'); return; }
  let msg = '';
  if (quitar > 0) msg += 'Ventas duplicadas exactas: ' + quitar + '\n';
  if (fechasCorr > 0) msg += 'Fechas mal importadas corregidas: ' + fechasCorr + '\n';
  msg += '\n¿Aplicar? (los duplicados se eliminan de forma permanente)';
  if (quitar > 0 && !confirm(msg)) return;
  if (quitar > 0) {
    localStorage.setItem('rv_eliminados', JSON.stringify(el));
    if (window.rvEmpujarAhora) window.rvEmpujarAhora();
    rvAuditar('limpiar', 'ventas/detalle', 'Quitó ' + quitar + ' duplicados (lápidas), corrigió ' + fechasCorr + ' fechas');
  }
  if (typeof rvFlushVentas === 'function') rvFlushVentas();
  if (typeof rvRebuildTxns === 'function') await rvRebuildTxns();
  alert('✅ Listo. Duplicados eliminados: ' + quitar + (fechasCorr ? ' · fechas corregidas: ' + fechasCorr : '') + '.');
}
function rvInyectarBotonDuplicadosVentas() {
  const page = document.getElementById('page-detalle');
  if (!page || document.getElementById('rv-btn-dup-ventas')) return;
  const b = document.createElement('button');
  b.id = 'rv-btn-dup-ventas';
  b.className = 'btn btn-outline';
  b.style.cssText = 'margin:10px 0 10px 8px;font-size:12px';
  b.textContent = '🧹 Quitar duplicados / corregir fechas';
  b.onclick = rvQuitarDuplicadosVentas;
  const a = page.querySelector('.page-sub') || page.querySelector('.page-title');
  if (a) a.insertAdjacentElement('afterend', b);
}

// ══ GASTOS: plantilla + importación COMPLETAS (con comprobante, serie, N°) ══
window.__rvGid = window.__rvGid || Date.now();
(function rvOverrideGastosImport() {
  window.downloadGastosTemplate = function () {
    if (typeof XLSX === 'undefined') { alert('❌ Librería XLSX no disponible'); return; }
    const hoy = new Date().toISOString().slice(0, 10);
    const ws = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Categoria', 'Canal', 'Tipo_Comprobante', 'Serie', 'Numero', 'Descripcion', 'Responsable', 'Monto S/.', 'Comentarios'],
      [hoy, 'Movilidad', 'General', '', '', '', 'Taxi visita cliente', 'Cesar Yaipen', 30, ''],
      [hoy, 'Operación', 'General', 'FACTURA', 'F001', '123', 'Servicio de mantenimiento', '', 150, ''],
      [hoy, 'Materiales', 'Almacén', 'BOLETA', 'B002', '45', 'Compra de cables y conectores', '', 80, '']
    ]);
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 10 }, { wch: 36 }, { wch: 18 }, { wch: 11 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
    XLSX.writeFile(wb, 'Plantilla_Gastos_REVIONIX.xlsx');
    if (typeof showToast === 'function') showToast('Plantilla descargada · incluye Comprobante, Serie y N°');
  };
  window.handleGastosImport = function (event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        const g = (r, names) => { for (const n of names) { if (r[n] !== undefined && r[n] !== '') return r[n]; } return undefined; };
        let imported = 0, skipped = 0;
        let local = []; try { local = JSON.parse(localStorage.getItem('rv_gastos') || '[]'); } catch (e) {}
        rows.forEach(r => {
          const cat = String(g(r, ['Categoria', 'Categoría', 'categoria', 'CATEGORIA']) || '').trim();
          const desc = String(g(r, ['Descripcion', 'Descripción', 'descripcion', 'DESCRIPCION']) || '').trim();
          const monto = rvNum(g(r, ['Monto S/.', 'Monto', 'monto', 'MONTO', 'Monto S/']));
          if (!cat || !desc || monto <= 0) { skipped++; return; }
          const fecha = rvParseFecha(g(r, ['Fecha', 'fecha', 'FECHA']));
          if (!fecha) { skipped++; return; }
          local.push({
            id: (++window.__rvGid),
            fecha, mes: fecha.slice(0, 7),
            cat, canal: String(g(r, ['Canal', 'canal', 'CANAL']) || 'General').trim() || 'General',
            desc, resp: String(g(r, ['Responsable', 'responsable', 'RESPONSABLE']) || '').trim(),
            monto: Math.round(monto * 100) / 100,
            tipo_doc: String(g(r, ['Tipo_Comprobante', 'Tipo Comprobante', 'TipoComprobante', 'Comprobante', 'tipo_doc', 'Tipo']) || '').trim(),
            serie: String(g(r, ['Serie', 'serie', 'SERIE']) || '').trim(),
            numero: String(g(r, ['Numero', 'Número', 'numero', 'N', 'N°', 'Nro']) || '').trim(),
            comentarios: String(g(r, ['Comentarios', 'comentarios']) || '').trim()
          });
          imported++;
        });
        localStorage.setItem('rv_gastos', JSON.stringify(local));
        if (typeof gastosLocal !== 'undefined' && Array.isArray(gastosLocal)) { gastosLocal.length = 0; local.forEach(x => gastosLocal.push(x)); }
        if (typeof renderGastos === 'function') renderGastos();
        if (window.rvEmpujarAhora) window.rvEmpujarAhora();
        if (typeof rvFlushGastos === 'function') rvFlushGastos();
        alert('✅ Importación completa\n\n• ' + imported + ' gastos importados\n• ' + skipped + ' filas omitidas (sin categoría, descripción o monto válido)');
        event.target.value = '';
      } catch (err) { alert('Error al leer archivo: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  };
})();

// ══ CARGAR VENTAS: plantilla + importación COMPLETAS ══
// Reemplaza downloadTemplate/showImportPreview del sistema para incluir todos
// los campos: comprobante, serie, correlativo, N° operación, canal, qty, medio de pago.
(function rvOverrideImportVentas() {
  window.downloadTemplate = function () {
    if (typeof XLSX === 'undefined') { alert('❌ Librería XLSX no disponible'); return; }
    const ws = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Canal', 'Tipo_Comprobante', 'Serie', 'Correlativo', 'N_Operacion', 'Modelo', 'Marca', 'Qty', 'Venta_S/.', 'Costo_S/.', 'Medio_Pago', 'Cliente'],
      ['2026-05-01', 'Malvitec', 'BOLETA', 'B001', '12345', '', 'CS-H8C 5MP', 'EZVIZ', 1, 250, 169, 'YAPE/PLIN', ''],
      ['2026-05-02', 'Compuplaza', 'FACTURA', 'F001', '6789', 'OP-555', 'MSI Thin A15', 'MSI', 1, 3200, 2240, 'TRANSFERENCIA', 'ACME SAC']
    ]);
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 11 }, { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 6 }, { wch: 11 }, { wch: 11 }, { wch: 14 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, 'plantilla_ventas_revionix.xlsx');
  };
  window.showImportPreview = function (rows) {
    const g = (r, names) => { for (const n of names) { if (r[n] !== undefined && r[n] !== '') return r[n]; } return undefined; };
    const list = (rows || []).map(r => {
      const fecha = rvParseFecha(g(r, ['Fecha', 'fecha', 'FECHA']));
      const modelo = String(g(r, ['Modelo', 'modelo', 'MODELO', 'Producto', 'producto']) || '');
      const marca = String(g(r, ['Marca', 'marca', 'MARCA']) || 'Otros');
      const venta = rvNum(g(r, ['Venta_S/.', 'Venta', 'venta', 'Precio', 'Precio_Venta', 'PrecioVenta', 'Total', 'total']));
      const qty = Math.max(1, Math.round(rvNum(g(r, ['Qty', 'Cantidad', 'qty', 'cantidad', 'CANT']) || 1)));
      let costo = rvNum(g(r, ['Costo_S/.', 'Costo', 'costo', 'Costo_Unit', 'CostoUnit']));
      // El costo hallado en compras es UNITARIO → multiplicar por qty (la venta es total)
      if (costo <= 0) { const c = rvBuscarCostoCompra(modelo, marca); if (c != null) costo = c * qty; }
      return {
        fecha, canal: String(g(r, ['Canal', 'canal', 'CANAL']) || ''), modelo, marca,
        cliente: String(g(r, ['Cliente', 'cliente', 'CLIENTE']) || ''),
        tipo_doc: String(g(r, ['Tipo_Comprobante', 'Tipo Comprobante', 'TipoComprobante', 'Comprobante', 'tipo_doc', 'Tipo']) || ''),
        serie: String(g(r, ['Serie', 'serie', 'SERIE']) || ''),
        correlativo: String(g(r, ['Correlativo', 'Correl', 'correlativo', 'Numero', 'Número', 'N']) || ''),
        n_operacion: String(g(r, ['N_Operacion', 'N Operacion', 'NOperacion', 'Operacion', 'N_Operación', 'NroOperacion']) || ''),
        medio_pago: String(g(r, ['Medio_Pago', 'Medio Pago', 'MedioPago', 'medio_pago', 'Medio']) || ''),
        qty, venta, costo, mes: String(g(r, ['Mes', 'mes']) || fecha).slice(0, 7)
      };
    }).filter(r => r.venta > 0);
    importPending = list;
    const body = document.getElementById('import-preview-body');
    const F = (n) => (typeof fmt === 'function' ? fmt(n) : ('S/. ' + rvNum(n).toFixed(2)));
    if (body) {
      if (list.length === 0) {
        body.innerHTML = '<div style="background:#fdecea;color:#7b1d1d;padding:12px;border-radius:8px">No se encontraron ventas válidas. Revisa que la columna <b>Venta_S/.</b> tenga montos y que las cabeceras coincidan con la plantilla (descárgala con "Plantilla").</div>';
      } else {
        const totalV = list.reduce((s, r) => s + r.venta, 0);
        const totalM = list.reduce((s, r) => s + (r.venta - r.costo), 0);
        const pv = list.slice(0, 8);
        body.innerHTML = `<div class="alert alert-success" style="margin-bottom:14px">Se encontraron <strong>${list.length} registros</strong> · Total ventas: <strong>${F(totalV)}</strong> · Margen estimado: <strong>${F(totalM)}</strong></div>
          <div style="overflow-x:auto"><table style="font-size:11px"><thead><tr><th>Fecha</th><th>Canal</th><th>Comprob.</th><th>Serie</th><th>Correl.</th><th>N°Op</th><th>Modelo</th><th>Marca</th><th>Qty</th><th>Venta</th><th>Costo</th><th>Medio</th></tr></thead>
          <tbody>${pv.map(r => `<tr><td>${r.fecha}</td><td>${r.canal}</td><td>${r.tipo_doc}</td><td>${r.serie}</td><td>${r.correlativo}</td><td>${r.n_operacion}</td><td>${(r.modelo || '').slice(0, 24)}</td><td>${r.marca}</td><td style="text-align:center">${r.qty}</td><td>${F(r.venta)}</td><td>${F(r.costo)}</td><td>${r.medio_pago}</td></tr>`).join('')}</tbody></table></div>
          ${list.length > 8 ? `<p style="font-size:12px;color:#888;margin-top:8px">... y ${list.length - 8} registros más</p>` : ''}`;
      }
    }
    if (typeof openModal === 'function') openModal('modal-import');
  };
})();

// ══ PAGOS PENDIENTES → HISTORIAL MENSUAL DE GASTOS FIJOS (BD) ══
// Al marcar un pago como "Pagado", se registra en la tabla gastos_fijos
// del mes actual (idempotente: si ya existe ese mes, actualiza el monto).
function rvRegistrarPagoFijo(key) {
  let concepto = key, monto = 0;
  const tc = (typeof TC_FIJO !== 'undefined') ? TC_FIJO : 3.5;
  try {
    if (key.startsWith('alq_') && typeof PAGOS_FIJOS_DATA !== 'undefined') {
      const r = PAGOS_FIJOS_DATA[parseInt(key.slice(4))];
      if (r) { concepto = r.concepto; monto = r.moneda === 'USD' ? r.monto * tc : r.monto; }
    } else if (key.startsWith('plan_') && typeof PLANILLA_CUENTAS !== 'undefined') {
      const p = PLANILLA_CUENTAS[parseInt(key.slice(5))];
      if (p) { concepto = 'Planilla: ' + p.nombre; monto = p.rem; }
    }
  } catch (e) { console.error('[FIJOS]', e); }
  const now = new Date();
  fetch(`${RV_API}/gastos-fijos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mes: now.getMonth() + 1, ano: now.getFullYear(), descripcion: concepto, monto: monto })
  }).then(r => {
    if (r.ok) {
      rvRenderHistorialFijos();
      if (typeof showToast === 'function') showToast('✅ Registrado en historial mensual: ' + concepto);
    }
  }).catch(e => console.error('[FIJOS]', e));
}
// Historial mensual visible en la página Gastos Fijos
async function rvRenderHistorialFijos() {
  const page = document.getElementById('page-gastos-fijos');
  if (!page) return;
  let card = document.getElementById('rv-fijos-historial');
  if (!card) {
    card = document.createElement('div');
    card.id = 'rv-fijos-historial';
    card.className = 'card';
    card.style.cssText = 'margin-top:14px;padding:16px';
    page.appendChild(card);
  }
  try {
    const datos = await fetch(`${RV_API}/gastos-fijos`).then(r => r.json());
    if (!Array.isArray(datos)) return;
    const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const filas = datos.length
      ? datos.map(g => `<tr>
          <td>${g.ano}</td>
          <td>${meses[g.mes] || g.mes}</td>
          <td style="font-weight:500">${rvEsc(g.descripcion)}</td>
          <td style="font-weight:700">${rvMoney(g.monto)}</td>
          <td style="white-space:nowrap">
            ${g.ruta_comprobante ? `<button onclick="viewFile('${g.ruta_comprobante}')" style="padding:3px 7px;background:#e3f0fb;border:1px solid #bdd7f3;border-radius:4px;cursor:pointer;font-size:11px">📄</button>` : ''}
            <button onclick="rvUploadFijo(${g.id})" title="Subir comprobante" style="padding:3px 7px;background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">📤</button>
            <button onclick="rvBorrarFijo(${g.id})" title="Eliminar" style="padding:3px 7px;background:#fdecea;color:#c0392b;border:1px solid #f5c6cb;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>
          </td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:#999;padding:14px">Aún sin registros. Marca un pago como "✅ Pagado" en Pagos Pendientes y aparecerá aquí.</td></tr>';
    card.innerHTML = `
      <div class="card-title">Historial Mensual Registrado</div>
      <div style="font-size:12px;color:#455a64;margin-bottom:10px">Cada pago marcado como "Pagado" en Pagos Pendientes se registra aquí por mes. También puedes adjuntar el comprobante.</div>
      <div style="overflow-x:auto">
      <table style="width:100%">
        <thead><tr><th>Año</th><th>Mes</th><th>Concepto</th><th>Monto</th><th></th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      </div>`;
  } catch (e) { console.error('[FIJOS-HIST]', e); }
}
function rvUploadFijo(id) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.xml,.jpg,.png,.jpeg';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('ruta_comprobante', file);
    const r = await fetch(`${RV_API}/gastos-fijos/${id}`, { method: 'PUT', body: fd });
    if (r.ok) { rvRenderHistorialFijos(); if (typeof showToast === 'function') showToast('✅ Comprobante guardado'); }
    else alert('❌ Error al subir');
  };
  input.click();
}
async function rvBorrarFijo(id) {
  if (!confirm('¿Eliminar este registro mensual?')) return;
  await fetch(`${RV_API}/gastos-fijos/${id}`, { method: 'DELETE' });
  rvRenderHistorialFijos();
}

// ══ PLANILLA: plantilla XLS + importación masiva ══
function rvDescargarPlantillaPlanilla() {
  if (typeof XLSX === 'undefined') { alert('❌ Librería XLSX no disponible'); return; }
  const ws = XLSX.utils.aoa_to_sheet([
    ['Año', 'Mes', 'Empleado', 'Sueldo', 'Bonificacion', 'Descuentos'],
    [new Date().getFullYear(), new Date().getMonth() + 1, 'Juan Pérez (ejemplo, borrar)', 2500, 200, 150]
  ]);
  ws['!cols'] = [{ wch: 6 }, { wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 11 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Planilla');
  XLSX.writeFile(wb, 'plantilla_planilla_revionix.xlsx');
}
function rvImportarPlanilla() {
  if (typeof XLSX === 'undefined') { alert('❌ Librería XLSX no disponible'); return; }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        let ok = 0, fail = 0;
        for (const r of rows) {
          const get = (names) => { for (const n of names) { if (r[n] !== undefined && r[n] !== '') return r[n]; } return undefined; };
          const empleado = get(['Empleado', 'empleado', 'EMPLEADO', 'Nombre', 'nombre']);
          if (!empleado || String(empleado).toLowerCase().includes('ejemplo')) continue;
          const fd = new FormData();
          fd.append('ano', get(['Año', 'Ano', 'ano', 'AÑO', 'ANO']) || new Date().getFullYear());
          fd.append('mes', get(['Mes', 'mes', 'MES']) || (new Date().getMonth() + 1));
          fd.append('empleado', String(empleado).trim());
          fd.append('sueldo', rvNum(get(['Sueldo', 'sueldo', 'SUELDO'])));
          fd.append('bonificacion', rvNum(get(['Bonificacion', 'Bonificación', 'bonificacion'])));
          fd.append('descuentos', rvNum(get(['Descuentos', 'descuentos', 'DESCUENTOS'])));
          try {
            const res = await fetch(`${RV_API}/planilla`, { method: 'POST', body: fd });
            res.ok ? ok++ : fail++;
          } catch (err) { fail++; }
        }
        alert(`✅ Importación completada: ${ok} registros guardados${fail ? ' · ' + fail + ' con error' : ''}`);
        loadPlanilla();
      } catch (err) {
        alert('❌ Error al leer el archivo: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };
  input.click();
}

// ══ PERSISTENCIA DE COMPRAS MAYORISTAS / INVERSIÓN ══
// El sistema tenía COMPRAS_DATA solo en memoria (las nuevas compras se perdían
// al recargar). Aquí se guardan en rv_compras → se respaldan en la BD (app_storage)
// y se restauran al cargar.
const RV_BASE_COMPRAS_LEN = (typeof COMPRAS_DATA !== 'undefined') ? COMPRAS_DATA.length : 0;
let rvComprasRestauradas = false;
function rvRestaurarCompras() {
  if (typeof COMPRAS_DATA === 'undefined' || rvComprasRestauradas) return;
  rvComprasRestauradas = true;
  let uc = [];
  try { uc = JSON.parse(localStorage.getItem('rv_compras') || '[]'); } catch (e) { uc = []; }
  if (Array.isArray(uc) && uc.length && COMPRAS_DATA.length === RV_BASE_COMPRAS_LEN) {
    uc.forEach(c => COMPRAS_DATA.push(c));
    try { if (typeof recomputeFromCompras === 'function') recomputeFromCompras(); } catch (e) {}
    try { if (typeof filterCompras === 'function') filterCompras(); } catch (e) {}
    try { if (typeof renderInvInicial === 'function') renderInvInicial(); } catch (e) {}
    try { if (typeof renderInvRepos === 'function') renderInvRepos(); } catch (e) {}
    console.log('[COMPRAS] ✓ Restauradas', uc.length, 'compras de usuario desde la BD');
  }
}
function rvPersistirCompras() {
  if (typeof COMPRAS_DATA === 'undefined') return;
  const uc = COMPRAS_DATA.slice(RV_BASE_COMPRAS_LEN);
  localStorage.setItem('rv_compras', JSON.stringify(uc)); // Storage.setItem → respalda en BD
}

// ══ ACTIVACIÓN DE EXTENSIONES (envolver sin reemplazar) ══
(function rvActivarExtensiones() {
  function envolver(nombre, despues) {
    if (typeof window[nombre] === 'function') {
      const original = window[nombre];
      window[nombre] = function (...args) {
        const r = original.apply(this, args);
        try { despues.apply(this, args); } catch (e) { console.error('[RV-EXT]', nombre, e); }
        return r;
      };
      return true;
    }
    return false;
  }

  const activadas = [];
  if (envolver('renderGastos', rvDecorarGastos)) activadas.push('gastos-pdf');
  if (envolver('renderMesesTable', rvDecorarMeses)) activadas.push('meses-desglose');
  if (envolver('renderCorpTable', rvDecorarCorp)) activadas.push('corporativo');
  if (envolver('renderEcommerce', rvDecorarEcommerce)) activadas.push('ecommerce');
  if (envolver('renderGastosFijos', () => rvRenderHistorialFijos())) activadas.push('fijos-historial');
  if (envolver('togglePPEstado', (key) => {
    try {
      if (typeof PP_ESTADOS !== 'undefined' && PP_ESTADOS[key] === 'Pagado') rvRegistrarPagoFijo(key);
    } catch (e) { console.error('[RV-EXT] pp', e); }
  })) activadas.push('pagos→fijos');
  // Persistir compras mayoristas / inversión al guardar (saveEdit maneja compras)
  if (envolver('saveEdit', () => { rvPersistirCompras(); rvFlushCompras(); rvAuditar('editar', (typeof _editSource !== 'undefined' ? _editSource : ''), 'Edición de registro'); })) activadas.push('compras-persist');
  if (envolver('deleteTxn', () => { rvPersistirCompras(); rvFlushCompras(); })) { /* por si borran filas */ }

  // saveGasto: adjuntar comprobante al nuevo registro
  if (typeof window.saveGasto === 'function') {
    const saveGastoOriginal = window.saveGasto;
    window.saveGasto = function () {
      let antes = 0;
      try { antes = JSON.parse(localStorage.getItem('rv_gastos') || '[]').length; } catch (e) {}
      saveGastoOriginal();
      try {
        const despues = JSON.parse(localStorage.getItem('rv_gastos') || '[]');
        const fi = document.getElementById('rv-g-pdf');
        if (despues.length > antes && fi && fi.files[0]) {
          const nuevo = despues[despues.length - 1];
          rvSubirArchivo(fi.files[0]).then(ruta => {
            if (ruta) {
              rvGuardarPdfGasto('g' + nuevo.id, ruta);
              if (typeof window.renderGastos === 'function') window.renderGastos();
            }
            fi.value = '';
          });
        }
      } catch (e) { console.error('[RV-EXT] saveGasto', e); }
      setTimeout(rvFlushGastos, 60); // guardar gastos en la BD de inmediato
    };
    activadas.push('gasto-nuevo-pdf');
  }
  // clearGastos / deleteGasto → reflejar el borrado en la BD
  if (envolver('deleteGasto', () => setTimeout(rvFlushGastos, 60))) { /* borrar gasto */ }
  if (envolver('clearGastos', () => setTimeout(rvFlushGastos, 60))) { /* limpiar gastos */ }
  // Importación de Excel en Gastos → guardar en la BD tras leer el archivo
  if (envolver('handleGastosImport', () => setTimeout(rvFlushGastos, 1200))) { /* import gastos */ }

  // Primera pasada de decoración (el sistema pudo renderizar antes que app.js)
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        rvUnicidadGastos();
        rvInyectarBotonDuplicados();
        rvInyectarInputPdfGasto();
        rvDecorarGastos();
        rvDecorarMeses();
        rvDecorarCorp();
        rvDecorarEcommerce();
        rvInyectarBotonAgregar('page-detalle', 'rv-btn-det-add', '➕ Nueva Venta', '');
        rvInyectarBotonCostos();
        rvInyectarBotonDuplicadosVentas();
        rvInyectarBotonRecalc();
        rvRestaurarCompras();
        rvWireAutoCosto();
      } catch (e) { console.error('[RV-EXT] init', e); }
    }, 600);
  });

  console.log('[RV-EXT] ✓ Extensiones activas:', activadas.join(', '));
})();

// ═══════════════════════════════════════════════════════════════
// PROYECTOS → TRANSACCIONES (canal San Isidro)
// Inyecta cada proyecto (monto ejecutado) como transacción en
// TXNS_DATA para que sume a dashboard, mes a mes, canales y EBITDA.
// Idempotente: elimina las transacciones de proyectos previas (__proy)
// antes de reinyectar, evitando duplicados.
// ═══════════════════════════════════════════════════════════════
// Copia intacta de las transacciones base (seed), capturada antes de que
// entren ventas manuales/importadas/proyectos.
const RV_BASE_TXNS = (typeof TXNS_DATA !== 'undefined') ? TXNS_DATA.slice() : [];

// ═══════════════════════════════════════════════════════════════
// BORRADO REAL (lápidas persistentes) + AUDITORÍA OCULTA
// Lo eliminado se registra en rv_eliminados (se respalda en la BD y se
// filtra SIEMPRE al reconstruir), así no reaparece al recargar. Cada
// modificación/borrado se registra en la tabla auditoria (no visible).
// ═══════════════════════════════════════════════════════════════
function rvEliminados() {
  try {
    const o = JSON.parse(localStorage.getItem('rv_eliminados') || '{}');
    if (!o.txn) o.txn = {};
    if (!o.gasto) o.gasto = {};
    return o;
  } catch (e) { return { txn: {}, gasto: {} }; }
}
function rvUsuarioActual() {
  try { if (typeof CURRENT !== 'undefined' && CURRENT && CURRENT.username) return CURRENT.username; } catch (e) {}
  return 'desconocido';
}
function rvAuditar(accion, modulo, detalle) {
  try {
    fetch(`${RV_API}/audit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: rvUsuarioActual(), accion: accion, modulo: modulo, detalle: detalle })
    }).catch(() => {});
  } catch (e) {}
}
function rvSigTxn(t) {
  return [t.fecha || '', t.canal || '', t.modelo || '', t.marca || '', rvNum(t.venta), rvNum(t.costo), t.serie || '', t.correlativo || ''].join('|');
}
function rvMarcarEliminadoTxn(t) {
  const el = rvEliminados();
  const sig = rvSigTxn(t);
  // Cuenta CUÁNTOS eliminar por firma (no todos) → respeta duplicados idénticos
  el.txn[sig] = (parseInt(el.txn[sig]) || 0) + 1;
  localStorage.setItem('rv_eliminados', JSON.stringify(el));
  if (window.rvEmpujarAhora) window.rvEmpujarAhora();
  rvAuditar('eliminar', 'detalle/ventas', 'Venta: ' + (t.modelo || '') + ' | ' + (t.fecha || '') + ' | S/. ' + rvNum(t.venta));
}
function rvMarcarEliminadoGasto(id, g) {
  const el = rvEliminados();
  el.gasto[String(id)] = 1;
  localStorage.setItem('rv_eliminados', JSON.stringify(el));
  if (window.rvEmpujarAhora) window.rvEmpujarAhora();
  rvAuditar('eliminar', 'gastos/movilidad', 'Gasto id ' + id + (g ? ' | ' + (g.cat || '') + ' | ' + (g.desc || '') + ' | S/. ' + rvNum(g.monto) : ''));
}
// Expuesto para el filtro de renderGastos (inline)
window.rvGastoEliminado = function (id) {
  try { return !!rvEliminados().gasto[String(id)]; } catch (e) { return false; }
};

// ── EDICIONES persistentes de transacciones (detalle) ──
// Se guardan por FIRMA original (rv_ediciones_txn) y se re-aplican en cada
// reconstrucción de TXNS_DATA, así la modificación sobrevive recargas y
// sincroniza entre dispositivos. Real + auditoría oculta.
function rvEdicionesTxn() {
  try {
    const o = JSON.parse(localStorage.getItem('rv_ediciones_txn') || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch (e) { return {}; }
}
function rvCamposEditablesTxn(rec) {
  return {
    tipo_doc: rec.tipo_doc, serie: rec.serie, correlativo: rec.correlativo,
    canal: rec.canal, cliente: rec.cliente, mes: rec.mes, modelo: rec.modelo,
    marca: rec.marca, qty: rvNum(rec.qty), venta: rvNum(rec.venta),
    costo: rvNum(rec.costo), medio_pago: rec.medio_pago
  };
}
function rvMarcarEdicionTxn(sigAntes, rec) {
  if (!sigAntes || !rec) return;
  try {
    const o = rvEdicionesTxn();
    o[sigAntes] = rvCamposEditablesTxn(rec);
    localStorage.setItem('rv_ediciones_txn', JSON.stringify(o));
    if (window.rvEmpujarAhora) window.rvEmpujarAhora();
    rvAuditar('editar', 'detalle/ventas', 'Venta editada: ' + (rec.modelo || '') + ' | ' + (rec.fecha || '') + ' | S/. ' + rvNum(rec.venta));
  } catch (e) {}
}
window.rvMarcarEdicionTxn = rvMarcarEdicionTxn;

// Override: borrado REAL de transacciones (detalle) con lápida + auditoría
(function () {
  if (typeof window.deleteTxn === 'function') {
    window.deleteTxn = function (idx) {
      try {
        if (typeof CURRENT !== 'undefined' && CURRENT && CURRENT.role !== 'admin') return;
        const rows = window._lastDetalleRows || (typeof getDetalleData === 'function' ? getDetalleData() : []);
        const rec = rows && rows[idx];
        if (!rec) return;
        if (!confirm('¿Eliminar este registro?\n\n' + (rec.modelo || '') + ' — S/. ' + rec.venta)) return;
        rvMarcarEliminadoTxn(rec);
        if (typeof rvRebuildTxns === 'function') rvRebuildTxns();
      } catch (e) { console.error('[DEL-TXN]', e); }
    };
  }
})();

// Override: borrado REAL de gastos/movilidad con lápida + auditoría
(function () {
  if (typeof window.deleteGasto === 'function') {
    const orig = window.deleteGasto;
    window.deleteGasto = function (id) {
      let g = null;
      try {
        const seed = (typeof GASTOS_DATA !== 'undefined') ? GASTOS_DATA : [];
        let local = []; try { local = JSON.parse(localStorage.getItem('rv_gastos') || '[]'); } catch (e) {}
        g = seed.concat(local).find(x => x.id === id) || null;
      } catch (e) {}
      rvMarcarEliminadoGasto(id, g);
      try { orig(id); } catch (e) { if (typeof renderGastos === 'function') renderGastos(); }
      setTimeout(rvFlushGastos, 60);
    };
  }
})();

let rvSyncEnCurso = false;
// Reconstruye TXNS_DATA = base + ventas extra (corporativo/ecommerce/importadas)
// + proyectos (monto ejecutado). Así TODO suma una sola vez a dashboard,
// mes a mes, canales, marcas y EBITDA.
async function rvRebuildTxns() {
  if (typeof TXNS_DATA === 'undefined' || typeof recomputeSeedTotals !== 'function') return;
  if (rvSyncEnCurso) return;
  rvSyncEnCurso = true;
  try {
    // 1) Reset a base
    TXNS_DATA.length = 0;
    RV_BASE_TXNS.forEach(t => TXNS_DATA.push(t));

    // 2) Ventas extra (manuales + importadas) desde rv_ventas
    let ev = [];
    try {
      ev = (typeof extraVentas !== 'undefined' && Array.isArray(extraVentas))
        ? extraVentas
        : JSON.parse(localStorage.getItem('rv_ventas') || '[]');
    } catch (e) { ev = []; }
    ev.forEach(r => {
      const venta = rvNum(r.venta), costo = rvNum(r.costo);
      TXNS_DATA.push({
        canal: r.canal || '—', cliente: r.cliente || 'Tienda',
        mes: r.mes || (r.fecha || '').slice(0, 7), fecha: r.fecha || '',
        tipo_doc: r.tipo_doc || 'MANUAL', serie: r.serie || '', correlativo: r.correlativo || '',
        n_operacion: r.n_operacion || '', modelo: r.modelo || '—', marca: r.marca || '—',
        qty: r.qty || 1, venta, costo, margen: venta - costo,
        medio_pago: r.condicion || r.medio_pago || '', condicion: r.condicion || '',
        margen_pct: venta > 0 ? ((venta - costo) / venta * 100) : 0, __extra: true
      });
    });

    // 3) Proyectos (monto ejecutado → canal San Isidro)
    const proys = await fetch(`${RV_API}/proyectos`).then(r => r.json()).catch(() => []);
    if (Array.isArray(proys)) {
      proys.forEach(p => {
        const venta = rvNum(p.monto_ejecutado);
        if (venta <= 0) return;
        const costo = rvNum(p.costo);
        const cond = (p.condicion_pago === 'credito' || p.condicion_pago === 'crédito') ? 'Crédito' : 'Contado';
        TXNS_DATA.push({
          canal: 'Proyectos', cliente: p.cliente || 'Proyecto',
          mes: (p.fecha_oc || '').slice(0, 7), fecha: (p.fecha_oc || '').slice(0, 10),
          tipo_doc: 'OC', serie: p.numero_oc || '', correlativo: '', n_operacion: p.numero_oc || '',
          modelo: 'Proyecto: ' + (p.descripcion || p.numero_oc || ''), marca: 'Proyectos',
          qty: 1, venta, costo, margen: venta - costo, medio_pago: cond, condicion: cond,
          margen_pct: venta > 0 ? ((venta - costo) / venta * 100) : 0, __proy: p.id
        });
      });
    }

    // Aplicar EDICIONES persistentes (por firma original). Se procesan en el
    // orden en que se guardaron: ediciones encadenadas convergen al último valor.
    const _edic = rvEdicionesTxn();
    const _edicKeys = Object.keys(_edic);
    if (_edicKeys.length) {
      _edicKeys.forEach(sig => {
        const campos = _edic[sig];
        const i = TXNS_DATA.findIndex(t => rvSigTxn(t) === sig);
        if (i >= 0) {
          Object.assign(TXNS_DATA[i], campos);
          const v = rvNum(TXNS_DATA[i].venta), c = rvNum(TXNS_DATA[i].costo);
          TXNS_DATA[i].margen = v - c;
          TXNS_DATA[i].margen_pct = v > 0 ? ((v - c) / v * 100) : 0;
        }
      });
    }

    // Filtrar transacciones ELIMINADAS (lápidas) → borrado real persistente.
    // Se elimina SOLO la cantidad marcada por firma (respeta duplicados idénticos).
    const _elimTxn = rvEliminados().txn;
    if (Object.keys(_elimTxn).length) {
      const _restante = {};
      for (const k in _elimTxn) _restante[k] = parseInt(_elimTxn[k]) || 0;
      for (let i = TXNS_DATA.length - 1; i >= 0; i--) {
        const sig = rvSigTxn(TXNS_DATA[i]);
        if (_restante[sig] > 0) { TXNS_DATA.splice(i, 1); _restante[sig]--; }
      }
    }
    const nProy = TXNS_DATA.filter(t => t.__proy).length;
    rvAplicarOverridesCostos();  // re-aplica costos completados a datos históricos
    if (typeof SEED !== 'undefined') SEED.transacciones = TXNS_DATA;
    rvAsegurarMeses();       // crea filas de meses faltantes (hasta el mes real)
    recomputeSeedTotals();   // puebla esos meses desde las transacciones
    if (typeof renderAll === 'function') renderAll();
    if (typeof loadProyectos === 'function') loadProyectos();  // refresca tabla de proyectos
    if (typeof initCharts === 'function') setTimeout(initCharts, 120);
    // Feedback visible del resultado (junio + proyectos integrados)
    var jun = (typeof SEED !== 'undefined' && SEED.meses) ? SEED.meses.find(m => m.p === '2026-06') : null;
    var msg = '✓ Recalculado · Proyectos integrados: ' + nProy + (jun ? ' · Junio: ' + rvMoney(jun.v) : '');
    console.log('[TXNS] ' + msg + ' · total txns=' + TXNS_DATA.length);
    if (window.__rvManualRecalc) { window.__rvManualRecalc = false; if (typeof showToast === 'function') showToast(msg); else alert(msg); }
  } catch (e) {
    console.error('[TXNS] ERROR:', e);
    var banner = document.getElementById('debug-banner');
    if (banner) { banner.style.display = 'block'; var dm = document.getElementById('debug-message'); if (dm) dm.textContent = '❌ Error al integrar proyectos/junio: ' + e.message; }
    else alert('❌ Error al recalcular: ' + e.message);
  } finally {
    rvSyncEnCurso = false;
  }
}
// Alias usado por el CRUD de proyectos
async function rvSyncProyectos() { return rvRebuildTxns(); }

// ═══════════════════════════════════════════════════════════════
// MIGRACIÓN MÓDULO VENTAS → BASE DE DATOS (tabla reg_ventas)
// La BD es la fuente de verdad de las ventas de usuario: se cargan al
// iniciar sesión y cada venta nueva se envía de inmediato. La caché local
// (rv_ventas / extraVentas) se mantiene para que el resto del sistema
// (dashboard, canales, EBITDA, rvRebuildTxns) siga funcionando igual.
// ═══════════════════════════════════════════════════════════════
// Reconstruye registros desde las filas de la BD usando la columna raw (sin pérdida)
function rvDesdeRaw(rows) {
  return rows.map(r => { try { return JSON.parse(r.raw); } catch (e) { return r; } });
}
// Envía una clave rv_* a la BD de inmediato (sin esperar el debounce)
function rvFlushClave(clave) {
  try {
    const v = localStorage.getItem(clave);
    if (v == null) return;
    const body = {}; body[clave] = v;
    fetch(`${RV_API}/storage`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(() => console.log('[BD] ✓ Guardado', clave)).catch(() => {});
  } catch (e) {}
}
function rvFlushVentas() { rvFlushClave('rv_ventas'); }
function rvFlushGastos() { rvFlushClave('rv_gastos'); }
function rvFlushCompras() { rvFlushClave('rv_compras'); }

// VENTAS: BD como fuente de verdad
async function rvCargarVentasDesdeBD() {
  try {
    const rows = await fetch(`${RV_API}/reg/ventas`).then(r => r.json());
    if (!Array.isArray(rows)) return;
    let local = []; try { local = JSON.parse(localStorage.getItem('rv_ventas') || '[]'); } catch (e) {}
    if (rows.length === 0 && local.length > 0) { rvFlushVentas(); return; }
    const mapped = rvDesdeRaw(rows);
    localStorage.setItem('rv_ventas', JSON.stringify(mapped));
    if (typeof extraVentas !== 'undefined' && Array.isArray(extraVentas)) { extraVentas.length = 0; mapped.forEach(m => extraVentas.push(m)); }
    console.log('[VENTAS-BD] ✓', mapped.length, 'ventas desde la BD');
  } catch (e) { console.warn('[VENTAS-BD]', e.message); }
}

// GASTOS: BD como fuente de verdad
async function rvCargarGastosDesdeBD() {
  try {
    const rows = await fetch(`${RV_API}/reg/gastos`).then(r => r.json());
    if (!Array.isArray(rows)) return;
    let local = []; try { local = JSON.parse(localStorage.getItem('rv_gastos') || '[]'); } catch (e) {}
    if (rows.length === 0 && local.length > 0) { rvFlushGastos(); return; }
    const mapped = rvDesdeRaw(rows);
    localStorage.setItem('rv_gastos', JSON.stringify(mapped));
    if (typeof gastosLocal !== 'undefined' && Array.isArray(gastosLocal)) { gastosLocal.length = 0; mapped.forEach(m => gastosLocal.push(m)); }
    rvUnicidadGastos();  // garantiza id único por gasto → borrado granular
    if (typeof renderGastos === 'function') try { renderGastos(); } catch (e) {}
    console.log('[GASTOS-BD] ✓', mapped.length, 'gastos desde la BD');
  } catch (e) { console.warn('[GASTOS-BD]', e.message); }
}

// Garantiza que cada gasto tenga un id ÚNICO (repara ids duplicados de datos
// antiguos), para que borrar uno no borre todos los que comparten id.
let rvContadorId = Date.now();
function rvUnicidadGastos() {
  let g = []; try { g = JSON.parse(localStorage.getItem('rv_gastos') || '[]'); } catch (e) { return; }
  const vistos = {}; let cambio = false;
  g.forEach(x => {
    const k = String(x.id);
    if (x.id == null || vistos[k]) { x.id = ++rvContadorId; cambio = true; }
    vistos[String(x.id)] = 1;
  });
  if (cambio) {
    localStorage.setItem('rv_gastos', JSON.stringify(g));
    if (typeof gastosLocal !== 'undefined' && Array.isArray(gastosLocal)) { gastosLocal.length = 0; g.forEach(x => gastosLocal.push(x)); }
    if (window.rvEmpujarAhora) window.rvEmpujarAhora();
    console.log('[GASTOS] ids únicos reparados');
  }
}

// Firma de un gasto para detectar duplicados exactos
function rvSigGasto(g) {
  return [g.fecha || '', g.cat || '', g.desc || '', rvNum(g.monto), g.canal || '', g.resp || ''].join('||');
}
// Lápidas de duplicados de gastos por firma (conteo). Persisten en rv_gastos_dup
// (se respaldan en la BD) y ocultan las copias sobrantes en cada render.
function rvGastosDup() {
  try { const o = JSON.parse(localStorage.getItem('rv_gastos_dup') || '{}'); return (o && typeof o === 'object') ? o : {}; }
  catch (e) { return {}; }
}
// Aplica el ocultamiento de duplicados por firma a una lista de gastos.
// Devuelve la lista sin las copias marcadas (deja 1 por firma marcada).
window.rvGastosDupOcultar = function (list) {
  const dup = rvGastosDup();
  if (!Object.keys(dup).length) return list;
  const restante = {}; for (const k in dup) restante[k] = parseInt(dup[k]) || 0;
  const out = [];
  list.forEach(g => {
    const s = rvSigGasto(g);
    if (restante[s] > 0) { restante[s]--; return; } // ocultar esta copia duplicada
    out.push(g);
  });
  return out;
};

// Quita duplicados EXACTOS de gastos (mismo fecha+cat+desc+monto+canal+resp),
// dejando uno. Marca lápidas persistentes → NO reaparecen al actualizar.
// Funciona también sobre los gastos base (seed/BD), no solo los del usuario.
function rvQuitarDuplicadosGastos() {
  const seed = (typeof GASTOS_DATA !== 'undefined') ? GASTOS_DATA : [];
  let local = []; try { local = JSON.parse(localStorage.getItem('rv_gastos') || '[]'); } catch (e) { local = []; }
  // Lista visible actual: respeta borrados por id y duplicados ya ocultos
  let all = seed.concat(local).filter(g => !(window.rvGastoEliminado && window.rvGastoEliminado(g.id)));
  all = window.rvGastosDupOcultar(all);
  const conteo = {};
  all.forEach(g => { const s = rvSigGasto(g); conteo[s] = (conteo[s] || 0) + 1; });
  const dup = rvGastosDup();
  let quitar = 0;
  for (const s in conteo) {
    if (conteo[s] > 1) { const ex = conteo[s] - 1; dup[s] = (parseInt(dup[s]) || 0) + ex; quitar += ex; }
  }
  if (quitar <= 0) { alert('No hay gastos duplicados exactos.'); return; }
  if (!confirm('Se encontraron ' + quitar + ' gastos duplicados exactos.\n\n¿Quitar los duplicados de forma permanente y dejar solo los únicos?')) return;
  localStorage.setItem('rv_gastos_dup', JSON.stringify(dup)); // rv_ → se respalda en la BD
  if (window.rvEmpujarAhora) window.rvEmpujarAhora();
  rvAuditar('limpiar', 'gastos', 'Quitó ' + quitar + ' duplicados exactos (lápidas persistentes)');
  if (typeof renderGastos === 'function') renderGastos();
  alert('✅ Se quitaron ' + quitar + ' duplicados (permanente).');
}
// Botón "Quitar duplicados" en la página de Gastos
function rvInyectarBotonDuplicados() {
  const cont = document.querySelector('#page-gastos .btn-group');
  if (!cont || document.getElementById('rv-btn-dup-gastos')) return;
  const b = document.createElement('button');
  b.id = 'rv-btn-dup-gastos';
  b.className = 'btn btn-outline btn-sm';
  b.style.cssText = 'font-size:11px';
  b.textContent = '🧹 Quitar duplicados';
  b.onclick = rvQuitarDuplicadosGastos;
  cont.appendChild(b);
}

// COMPRAS: BD como fuente de verdad (reconstruye COMPRAS_DATA = base + BD)
async function rvCargarComprasDesdeBD() {
  try {
    const rows = await fetch(`${RV_API}/reg/compras`).then(r => r.json());
    if (!Array.isArray(rows)) return;
    let local = []; try { local = JSON.parse(localStorage.getItem('rv_compras') || '[]'); } catch (e) {}
    if (rows.length === 0 && local.length > 0) { rvFlushCompras(); return; }
    const mapped = rvDesdeRaw(rows);
    localStorage.setItem('rv_compras', JSON.stringify(mapped));
    if (typeof COMPRAS_DATA !== 'undefined') {
      COMPRAS_DATA.length = RV_BASE_COMPRAS_LEN;         // dejar solo las base (seed)
      mapped.forEach(c => COMPRAS_DATA.push(c));         // + las de la BD
      rvComprasRestauradas = true;
      try { if (typeof recomputeFromCompras === 'function') recomputeFromCompras(); } catch (e) {}
      try { if (typeof filterCompras === 'function') filterCompras(); } catch (e) {}
      try { if (typeof renderInvInicial === 'function') renderInvInicial(); } catch (e) {}
      try { if (typeof renderInvRepos === 'function') renderInvRepos(); } catch (e) {}
    }
    console.log('[COMPRAS-BD] ✓', mapped.length, 'compras desde la BD');
  } catch (e) { console.warn('[COMPRAS-BD]', e.message); }
}

// Carga los módulos migrados + gastos fijos/planilla por mes desde la BD
async function rvCargarTodoDesdeBD() {
  await rvCargarVentasDesdeBD();
  await rvCargarGastosDesdeBD();
  await rvCargarComprasDesdeBD();
  await rvCargarFijosPlanillaBD();
}

// Asegura que SEED.meses tenga una fila por cada mes con transacciones y hasta
// el mes real actual (para que Junio/Julio existan y se poblen). recomputeSeedTotals
// solo actualiza meses ya existentes, por eso hay que crearlos antes.
function rvAsegurarMeses() {
  if (typeof SEED === 'undefined' || !Array.isArray(SEED.meses)) return;
  const NOM = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const existentes = new Set(SEED.meses.map(m => m.p));
  const faltantes = new Set();
  // meses presentes en las transacciones
  TXNS_DATA.forEach(t => { if (t.mes && /^\d{4}-\d{2}$/.test(t.mes) && !existentes.has(t.mes)) faltantes.add(t.mes); });
  // hasta el mes actual real (incluye el mes en curso y el anterior)
  const hoy = new Date();
  const curP = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
  const prev = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const prevP = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0');
  if (!existentes.has(curP)) faltantes.add(curP);
  if (!existentes.has(prevP)) faltantes.add(prevP);
  faltantes.forEach(p => {
    const [y, mm] = p.split('-');
    SEED.meses.push({ m: NOM[parseInt(mm, 10) - 1] + '-' + y.slice(2), p, v: 0, c: 0, corp: 0, ec: 0 });
  });
  SEED.meses.sort((a, b) => (a.p < b.p ? -1 : a.p > b.p ? 1 : 0));
}

// Sincroniza los usuarios de la UI (USERS) a la BD, para que el login real los reconozca
function rvSyncUsuariosAPI() {
  if (typeof USERS === 'undefined') return;
  Object.keys(USERS).forEach(username => {
    const u = USERS[username];
    if (!u) return;
    fetch(`${RV_API}/auth/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: u.pass, nombre: u.name, role: u.role, canal: u.canal, activo: u.activo !== false })
    }).catch(() => {});
  });
}
// Trae los usuarios de la BD a la lista local (USERS) para que la pantalla de
// Usuarios los muestre a todos (incluido 'operaciones'). No toca contraseñas.
async function rvCargarUsuariosBD() {
  try {
    if (typeof USERS === 'undefined') return;
    const dbUsers = await fetch(`${RV_API}/auth/users`).then(r => r.json());
    if (!Array.isArray(dbUsers)) return;
    dbUsers.forEach(du => {
      const ex = USERS[du.username] || {};
      USERS[du.username] = { pass: ex.pass, role: du.role, canal: du.canal, name: du.nombre, email: ex.email || '', activo: du.activo !== 0 };
    });
    const pg = document.getElementById('page-usuarios');
    if (pg && pg.classList.contains('active') && typeof renderUsuarios === 'function') renderUsuarios();
    console.log('[USERS-BD] ✓', dbUsers.length, 'usuarios sincronizados a la lista');
  } catch (e) { console.warn('[USERS-BD]', e.message); }
}

// Botón manual de recálculo en el dashboard (fuerza integrar proyectos + junio)
function rvInyectarBotonRecalc() {
  const page = document.getElementById('page-dashboard');
  if (!page || document.getElementById('rv-btn-recalc')) return;
  const btn = document.createElement('button');
  btn.id = 'rv-btn-recalc';
  btn.className = 'btn btn-outline';
  btn.style.cssText = 'margin:8px 0;font-size:12px';
  btn.textContent = '🔄 Recalcular (integrar proyectos y junio)';
  btn.onclick = () => { window.__rvManualRecalc = true; rvRebuildTxns(); };
  const ancla = page.querySelector('.page-sub') || page.querySelector('.page-title');
  if (ancla) ancla.insertAdjacentElement('afterend', btn);
}

// Fecha/hora real en el encabezado
function rvActualizarFechaReal() {
  const el = document.getElementById('hdr-fecha');
  if (!el) return;
  const ahora = new Date();
  const f = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const h = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  el.textContent = 'Últ. actualización: ' + f + ' - ' + h;
}

// ── Rol "operaciones": edita compras/ventas/ecommerce/stock, pero SIN acceso a
// planilla, gastos fijos ni usuarios. (Edita como admin en lo demás.) ──
window.RV_ROL_REAL = '';
const RV_PAGINAS_BLOQUEADAS = ['planilla', 'gastos-fijos', 'pagos-pendientes', 'usuarios'];
function rvAplicarRestriccionesRol() {
  // Rol "pipeline": SOLO puede usar el módulo Pipeline de Visitas.
  if (window.RV_ROL_REAL === 'pipeline') {
    document.querySelectorAll('.nav-item').forEach(nav => {
      if (nav.getAttribute('data-page') !== 'pipeline') { nav.classList.add('nav-disabled'); nav.style.display = 'none'; }
    });
    document.querySelectorAll('.nav-section').forEach(sec => {
      if (!sec.querySelector('.nav-item[data-page="pipeline"]')) sec.style.display = 'none';
    });
    const nu = document.getElementById('nav-usuarios'); if (nu) nu.style.display = 'none';
    const bd = document.getElementById('hdr-badge'); if (bd) { bd.textContent = 'Pipeline'; bd.className = 'header-badge badge-tienda'; }
    if (typeof goPage === 'function') goPage('pipeline');
    return;
  }
  if (window.RV_ROL_REAL !== 'operaciones') return;
  RV_PAGINAS_BLOQUEADAS.forEach(pg => {
    const nav = document.querySelector('.nav-item[data-page="' + pg + '"]');
    if (nav) { nav.classList.add('nav-disabled'); nav.style.display = 'none'; }
  });
  const nu = document.getElementById('nav-usuarios'); if (nu) { nu.classList.add('nav-disabled'); nu.style.display = 'none'; }
  const bd = document.getElementById('hdr-badge'); if (bd) { bd.textContent = 'Operaciones'; bd.className = 'header-badge badge-tienda'; }
}

// ══ GASTOS / MOVILIDAD: formulario desplegable ══
function rvToggleGastoForm() {
  const wrap = document.getElementById('rv-gasto-form-wrap');
  if (!wrap) return;
  const visible = wrap.style.display !== 'none';
  wrap.style.display = visible ? 'none' : 'block';
  if (!visible) {
    const f = document.getElementById('g-fecha');
    if (f && !f.value) f.value = new Date().toISOString().slice(0, 10);
  }
}

// ══ STOCK INICIAL / REPOSICIÓN: comprobante por proveedor ══
function rvStockPdfs() {
  try { return JSON.parse(localStorage.getItem('rv_stock_pdfs') || '{}'); } catch (e) { return {}; }
}
function rvGuardarPdfStock(clave, ruta) {
  const m = rvStockPdfs();
  m[clave] = ruta;
  localStorage.setItem('rv_stock_pdfs', JSON.stringify(m));
  if (window.rvEmpujarAhora) window.rvEmpujarAhora();
}
async function rvSubirPdfStock(clave, recargar) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.xml,.jpg,.png,.jpeg';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ruta = await rvSubirArchivo(file);
    if (ruta) {
      rvGuardarPdfStock(clave, ruta);
      if (typeof window[recargar] === 'function') window[recargar]();
      if (typeof showToast === 'function') showToast('✅ Comprobante guardado');
    }
  };
  input.click();
}
// Decora las tablas de proveedores con acción de comprobante (📤/📄)
function rvDecorarTablaStock(tbodyId, prefijo, recargarFn) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const pdfs = rvStockPdfs();
  tbody.querySelectorAll('tr').forEach(tr => {
    const primera = tr.querySelector('td');
    if (!primera || tr.querySelector('.rv-stock-btn')) return;
    const prov = primera.textContent.trim();
    if (!prov) return;
    const clave = prefijo + prov;
    const ruta = pdfs[clave];
    const td = document.createElement('td');
    td.style.whiteSpace = 'nowrap';
    td.innerHTML =
      (ruta ? `<button class="rv-stock-btn" onclick="viewFile('${ruta}')" title="Ver comprobante" style="background:#e3f0fb;border:1px solid #bdd7f3;border-radius:4px;cursor:pointer;padding:2px 6px;font-size:11px">📄</button> ` : '') +
      `<button class="rv-stock-btn" onclick="rvSubirPdfStock('${clave.replace(/'/g, "\\'")}','${recargarFn}')" title="${ruta ? 'Reemplazar' : 'Subir'} comprobante" style="background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;padding:2px 6px;font-size:11px">📤</button>`;
    tr.appendChild(td);
  });
  // Asegurar encabezado "Comprobante" una sola vez
  const table = tbody.closest('table');
  if (table) {
    const headRow = table.querySelector('thead tr');
    if (headRow && !headRow.querySelector('.rv-stock-th')) {
      const th = document.createElement('th');
      th.className = 'rv-stock-th';
      th.textContent = 'Comprobante';
      headRow.appendChild(th);
    }
  }
}
function rvDecorarStock() {
  rvDecorarTablaStock('tbl-inv-inicial-body', 'ini_', 'renderInvInicial');
  rvDecorarTablaStock('tbl-inv-repos-body', 'rep_', 'renderInvRepos');
}

// ══ GASTOS FIJOS: registro manual mensual con comprobante ══
function rvAbrirRegistroFijo() {
  const now = new Date();
  const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesOpts = meses.map((m, i) => i === 0 ? '' : `<option value="${i}" ${now.getMonth() + 1 === i ? 'selected' : ''}>${m}</option>`).join('');
  rvModal(`
    <h3 style="margin:0 0 12px 0">➕ Registrar Gasto Fijo del Mes</h3>
    <div style="display:flex;gap:8px">
      <div style="flex:1"><label style="${RV_LABEL}">Mes *</label><select id="gf-mes" style="${RV_INPUT}">${mesOpts}</select></div>
      <div style="flex:1"><label style="${RV_LABEL}">Año *</label><input type="number" id="gf-ano" value="${now.getFullYear()}" min="2020" max="2100" style="${RV_INPUT}" /></div>
    </div>
    <label style="${RV_LABEL}">Descripción / Concepto *</label>
    <input type="text" id="gf-desc" placeholder="Ej: Alquiler local San Isidro" style="${RV_INPUT}" />
    <label style="${RV_LABEL}">Monto (S/.) *</label>
    <input type="number" id="gf-monto" placeholder="0.00" step="0.01" min="0" style="${RV_INPUT}" />
    <label style="${RV_LABEL}">📎 Comprobante de pago (opcional)</label>
    <input type="file" id="gf-file" accept=".pdf,.xml,.jpg,.png,.jpeg" style="${RV_INPUT}" />
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="rvGuardarFijoManual()" style="flex:1;padding:10px;background:#198c35;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600">💾 Guardar</button>
      <button onclick="closeRvModal()" style="flex:1;padding:10px;background:#eceff1;color:#333;border:none;border-radius:5px;cursor:pointer">Cancelar</button>
    </div>
  `);
}
async function rvGuardarFijoManual() {
  const mes = document.getElementById('gf-mes').value;
  const ano = document.getElementById('gf-ano').value;
  const desc = document.getElementById('gf-desc').value.trim();
  const monto = document.getElementById('gf-monto').value;
  if (!mes) { alert('❌ Selecciona el mes'); return; }
  if (!desc) { alert('❌ Ingresa la descripción'); return; }
  if (!monto || rvNum(monto) <= 0) { alert('❌ Ingresa un monto válido'); return; }
  const fd = new FormData();
  fd.append('mes', mes);
  fd.append('ano', ano);
  fd.append('descripcion', desc);
  fd.append('monto', rvNum(monto));
  const file = document.getElementById('gf-file').files[0];
  if (file) fd.append('ruta_comprobante', file);
  try {
    const r = await fetch(`${RV_API}/gastos-fijos`, { method: 'POST', body: fd });
    if (r.ok) {
      alert('✅ Gasto fijo registrado');
      closeRvModal();
      rvRenderHistorialFijos();
    } else {
      const d = await r.json().catch(() => ({}));
      alert('❌ ' + (d.error || 'Error del servidor'));
    }
  } catch (e) {
    alert('❌ Error: ' + e.message);
  }
}

// ══ PAGOS PENDIENTES: comprobante por concepto ══
function rvPpPdfs() {
  try { return JSON.parse(localStorage.getItem('rv_pp_pdfs') || '{}'); } catch (e) { return {}; }
}
async function rvSubirPdfPP(clave) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.xml,.jpg,.png,.jpeg';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ruta = await rvSubirArchivo(file);
    if (ruta) {
      const m = rvPpPdfs();
      m[clave] = ruta;
      localStorage.setItem('rv_pp_pdfs', JSON.stringify(m));
      if (window.rvEmpujarAhora) window.rvEmpujarAhora();
      if (typeof window.renderPPAlq === 'function') window.renderPPAlq();
      if (typeof showToast === 'function') showToast('✅ Comprobante de pago guardado');
    }
  };
  input.click();
}
function rvDecorarPP() {
  const tbody = document.getElementById('tbl-pp-alq-body');
  if (!tbody) return;
  const pdfs = rvPpPdfs();
  const table = tbody.closest('table');
  if (table) {
    const headRow = table.querySelector('thead tr');
    if (headRow && !headRow.querySelector('.rv-pp-th')) {
      const th = document.createElement('th');
      th.className = 'rv-pp-th';
      th.textContent = 'Comprobante';
      headRow.appendChild(th);
    }
  }
  tbody.querySelectorAll('tr').forEach(tr => {
    if (tr.querySelector('.rv-pp-btn')) return;
    const primera = tr.querySelector('td');
    if (!primera) return;
    const clave = 'pp_' + primera.textContent.trim().slice(0, 40);
    const ruta = pdfs[clave];
    const td = document.createElement('td');
    td.style.whiteSpace = 'nowrap';
    td.innerHTML =
      (ruta ? `<button class="rv-pp-btn" onclick="viewFile('${ruta}')" title="Ver comprobante" style="background:#e3f0fb;border:1px solid #bdd7f3;border-radius:4px;cursor:pointer;padding:2px 6px;font-size:11px">📄</button> ` : '') +
      `<button class="rv-pp-btn" onclick="rvSubirPdfPP('${clave.replace(/'/g, "\\'")}')" title="${ruta ? 'Reemplazar' : 'Subir'} comprobante" style="background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;padding:2px 6px;font-size:11px">📤</button>`;
    tr.appendChild(td);
  });
}

// ══ ACTIVACIÓN DE ESTAS EXTENSIONES ══
(function rvActivarExtensiones2() {
  function envolver(nombre, despues) {
    if (typeof window[nombre] === 'function') {
      const original = window[nombre];
      window[nombre] = function (...args) {
        const r = original.apply(this, args);
        try { despues.apply(this, args); } catch (e) { console.error('[RV-EXT2]', nombre, e); }
        return r;
      };
      return true;
    }
    return false;
  }

  // Evitar doble conteo: como ahora las ventas extra están DENTRO de TXNS_DATA
  // (y por tanto en SEED.tot_v tras recompute), computeTotals ya no debe
  // volver a sumar extraVentas.
  if (typeof window.computeTotals === 'function') {
    window.computeTotals = function () {
      if (typeof SEED === 'undefined') return { tot_v: 0, tot_c: 0, tot_m: 0 };
      return { tot_v: SEED.tot_v || 0, tot_c: SEED.tot_c || 0, tot_m: (SEED.tot_v || 0) - (SEED.tot_c || 0) };
    };
  }

  // Login → autenticación REAL contra la BD (contraseñas con hash en el servidor)
  if (typeof window.doLogin === 'function') {
    const inlineDoLogin = window.doLogin;
    window.doLogin = async function () {
      const uEl = document.getElementById('login-user');
      const pEl = document.getElementById('login-pass');
      const errEl = document.getElementById('login-error');
      const u = (uEl ? uEl.value : '').trim().toLowerCase();
      const p = pEl ? pEl.value : '';
      if (!u || !p) { if (errEl) errEl.textContent = 'Ingresa usuario y contraseña'; return; }
      try {
        const res = await fetch(`${RV_API}/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (data && data.ok) {
          window.RV_ROL_REAL = data.user.role;
          // Inyectar el usuario ya verificado para que el flujo interno prosiga.
          // 'operaciones' edita como admin (para ver botones de editar/borrar).
          if (typeof USERS !== 'undefined') {
            // 'operaciones' y 'pipeline' entran como admin interno (para ver los
            // botones de editar/guardar); la restricción real se aplica por RV_ROL_REAL.
            const rolInline = (data.user.role === 'operaciones' || data.user.role === 'pipeline') ? 'admin' : data.user.role;
            USERS[u] = { pass: p, role: rolInline, canal: data.user.canal, name: data.user.nombre, email: '', activo: true };
          }
          inlineDoLogin();
          rvAplicarRestriccionesRol();
          setTimeout(async () => { try { await rvCargarTodoDesdeBD(); rvRebuildTxns(); rvActualizarFechaReal(); rvAplicarRestriccionesRol(); rvCargarUsuariosBD(); } catch (e) {} }, 400);
        } else {
          if (errEl) errEl.textContent = (data && data.error) || 'Usuario o contraseña incorrectos';
        }
      } catch (e) {
        // Servidor no disponible → login interno de respaldo (evita bloqueo total)
        console.warn('[AUTH] Servidor no disponible, usando login local:', e.message);
        inlineDoLogin();
        setTimeout(async () => { try { await rvCargarTodoDesdeBD(); rvRebuildTxns(); rvActualizarFechaReal(); } catch (e2) {} }, 400);
      }
    };
  }

  // Sincronizar usuarios creados/editados en la UI hacia la BD (para que el login real los reconozca)
  if (typeof window.saveUsers === 'function') {
    const saveUsersOrig = window.saveUsers;
    window.saveUsers = function () {
      const r = saveUsersOrig.apply(this, arguments);
      try { rvSyncUsuariosAPI(); } catch (e) { console.error('[AUTH] sync users', e); }
      return r;
    };
  }

  // Tras registrar/importar ventas → reconstruir + guardar en BD de inmediato
  envolver('saveVenta', () => { setTimeout(() => { rvRebuildTxns(); rvFlushVentas(); }, 50); rvAuditar('agregar', 'ventas', 'Nueva venta registrada'); });
  envolver('confirmImport', () => setTimeout(() => { rvRebuildTxns(); rvFlushVentas(); }, 50));

  // Stock: decorar tras render
  envolver('renderInvInicial', () => rvDecorarStock());
  envolver('renderInvRepos', () => rvDecorarStock());
  // Pagos pendientes: comprobante por fila
  envolver('renderPPAlq', () => rvDecorarPP());
  // Detalle por Producto: botones (agregar venta + completar costos)
  envolver('filterDetalle', () => { rvInyectarBotonAgregar('page-detalle', 'rv-btn-det-add', '➕ Nueva Venta', ''); rvInyectarBotonCostos(); rvInyectarBotonDuplicadosVentas(); });

  console.log('[RV-EXT2] ✓ Extensiones v7 activas');
})();

// Botón "Registrar Gasto Fijo" en la tarjeta de historial (se añade al render)
(function () {
  const _histOrig = rvRenderHistorialFijos;
  rvRenderHistorialFijos = async function () {
    await _histOrig.apply(this, arguments);
    const card = document.getElementById('rv-fijos-historial');
    if (card && !card.querySelector('.rv-fijo-add')) {
      const t = card.querySelector('.card-title');
      if (t) {
        t.style.display = 'inline-block';
        const btn = document.createElement('button');
        btn.className = 'btn btn-success rv-fijo-add';
        btn.style.cssText = 'float:right;font-size:12px';
        btn.textContent = '➕ Registrar Gasto Fijo';
        btn.onclick = rvAbrirRegistroFijo;
        t.parentElement.insertBefore(btn, t.nextSibling);
      }
    }
  };
})();

// ═══════════════════════════════════════════════════════════════
// MÓDULO PIPELINE DE VISITAS (CRM de trabajadores híbridos)
// Registra cada visita/oportunidad con datos de contacto, dirección,
// oportunidad conseguida, monto y fecha estimada de cierre. Se guarda en
// rv_pipeline (respaldo automático en la BD, multi-dispositivo). Additivo.
// ═══════════════════════════════════════════════════════════════
window.__rvPid = window.__rvPid || Date.now();
const RV_PIPE_ETAPAS = ['Prospecto', 'Contactado', 'Calificado', 'Propuesta', 'Negociación', 'Ganado', 'Perdido'];
const RV_PIPE_COLOR = {
  'Prospecto': '#90A4AE', 'Contactado': '#0277BD', 'Calificado': '#7B1FA2',
  'Propuesta': '#E67E22', 'Negociación': '#F9A825', 'Ganado': '#198C35', 'Perdido': '#C0392B'
};
const RV_PIPE_PROB = { 'Prospecto': 10, 'Contactado': 25, 'Calificado': 40, 'Propuesta': 60, 'Negociación': 80, 'Ganado': 100, 'Perdido': 0 };
const RV_PIPE_ABIERTAS = ['Prospecto', 'Contactado', 'Calificado', 'Propuesta', 'Negociación'];
const RV_PIPE_CAMPOS = [
  { k: 'fecha_visita', lbl: 'Fecha de visita', type: 'date' },
  { k: 'trabajador', lbl: 'Trabajador (quien visitó)', type: 'text' },
  { k: 'empresa', lbl: 'Empresa / Cliente', type: 'text' },
  { k: 'contacto_nombre', lbl: 'Contacto (nombre)', type: 'text' },
  { k: 'contacto_cargo', lbl: 'Cargo del contacto', type: 'text' },
  { k: 'contacto_tel', lbl: 'Teléfono / WhatsApp', type: 'text' },
  { k: 'contacto_email', lbl: 'Email', type: 'text' },
  { k: 'direccion', lbl: 'Dirección', type: 'text' },
  { k: 'distrito', lbl: 'Distrito / Ciudad', type: 'text' },
  { k: 'oportunidad', lbl: 'Oportunidad conseguida', type: 'textarea' },
  { k: 'productos', lbl: 'Productos / servicios de interés', type: 'text' },
  { k: 'monto', lbl: 'Monto estimado de la oportunidad (S/.)', type: 'number' },
  { k: 'probabilidad', lbl: 'Probabilidad de cierre (%)', type: 'number' },
  { k: 'etapa', lbl: 'Etapa', type: 'select', opts: RV_PIPE_ETAPAS },
  { k: 'fecha_cierre', lbl: 'Fecha estimada de cierre', type: 'date' },
  { k: 'proxima_accion', lbl: 'Próxima acción', type: 'text' },
  { k: 'fecha_proxima', lbl: 'Fecha de próxima acción', type: 'date' },
  { k: 'notas', lbl: 'Notas / observaciones', type: 'textarea' }
];
function rvPipeData() {
  try { const o = JSON.parse(localStorage.getItem('rv_pipeline') || '[]'); return Array.isArray(o) ? o : []; }
  catch (e) { return []; }
}
function rvPipeGuardar(list) {
  localStorage.setItem('rv_pipeline', JSON.stringify(list));
  if (window.rvEmpujarAhora) window.rvEmpujarAhora();
}
function rvPipePuedeEditar() {
  try { return (typeof CURRENT !== 'undefined' && CURRENT && CURRENT.role === 'admin'); } catch (e) { return false; }
}
function rvRenderPipeline() {
  const page = document.getElementById('page-pipeline');
  if (!page) return;
  const data = rvPipeData();
  const fEtapa = (document.getElementById('pipe-f-etapa') || {}).value || '';
  const fTrab = (document.getElementById('pipe-f-trab') || {}).value || '';
  const fBusca = ((document.getElementById('pipe-f-busca') || {}).value || '').toLowerCase();
  const editable = rvPipePuedeEditar();

  // KPIs (sobre todo el pipeline, no el filtrado)
  const abiertas = data.filter(o => RV_PIPE_ABIERTAS.indexOf(o.etapa) !== -1);
  const montoPipe = abiertas.reduce((s, o) => s + rvNum(o.monto), 0);
  const ponderado = abiertas.reduce((s, o) => s + rvNum(o.monto) * (rvNum(o.probabilidad) / 100), 0);
  const ganado = data.filter(o => o.etapa === 'Ganado').reduce((s, o) => s + rvNum(o.monto), 0);

  // Lista de trabajadores para el filtro
  const trabajadores = [...new Set(data.map(o => o.trabajador).filter(Boolean))].sort();

  // Aplicar filtros a la tabla
  let filas = data.slice();
  if (fEtapa) filas = filas.filter(o => o.etapa === fEtapa);
  if (fTrab) filas = filas.filter(o => o.trabajador === fTrab);
  if (fBusca) filas = filas.filter(o => [o.empresa, o.contacto_nombre, o.oportunidad, o.productos, o.distrito, o.direccion].join(' ').toLowerCase().includes(fBusca));
  filas.sort((a, b) => String(b.fecha_visita || '').localeCompare(String(a.fecha_visita || '')));

  const kpi = (t, v, c) => `<div style="background:#fff;border:1px solid #e3e8ee;border-radius:10px;padding:12px 16px;flex:1;min-width:150px"><div style="font-size:11px;color:#78909c;font-weight:600;text-transform:uppercase;letter-spacing:.3px">${t}</div><div style="font-size:20px;font-weight:800;color:${c};margin-top:2px">${v}</div></div>`;

  const optEtapa = '<option value="">Todas las etapas</option>' + RV_PIPE_ETAPAS.map(e => `<option value="${e}" ${e === fEtapa ? 'selected' : ''}>${e}</option>`).join('');
  const optTrab = '<option value="">Todos los trabajadores</option>' + trabajadores.map(t => `<option value="${rvEsc(t)}" ${t === fTrab ? 'selected' : ''}>${rvEsc(t)}</option>`).join('');

  const filasHTML = filas.map(o => {
    const col = RV_PIPE_COLOR[o.etapa] || '#90A4AE';
    const prob = rvNum(o.probabilidad);
    let contacto = o.contacto_nombre ? rvEsc(o.contacto_nombre) : '';
    if (o.contacto_tel) contacto += `${contacto ? '<br>' : ''}<span style="color:#78909c;font-size:10px">📞 ${rvEsc(o.contacto_tel)}</span>`;
    if (o.contacto_email) contacto += `<br><span style="color:#78909c;font-size:10px">✉️ ${rvEsc(o.contacto_email)}</span>`;
    return `<tr>
      <td style="white-space:nowrap;font-size:12px">${rvEsc(o.fecha_visita || '—')}</td>
      <td style="font-size:12px">${rvEsc(o.trabajador || '—')}</td>
      <td><div style="font-weight:600;font-size:13px;color:#0f2540">${rvEsc(o.empresa || '—')}</div>${o.distrito ? `<div style="font-size:10px;color:#78909c">📍 ${rvEsc(o.distrito)}</div>` : ''}</td>
      <td style="font-size:11px">${contacto || '—'}</td>
      <td style="font-size:11px;max-width:220px">${rvEsc(o.oportunidad || '—')}${o.productos ? `<div style="font-size:10px;color:#78909c;margin-top:2px">🏷️ ${rvEsc(o.productos)}</div>` : ''}</td>
      <td style="text-align:right;font-weight:700;color:#198c35;white-space:nowrap">${o.monto ? rvMoney(o.monto) : '—'}</td>
      <td style="text-align:center;font-size:12px">${prob ? prob + '%' : '—'}</td>
      <td><span style="display:inline-block;background:${col}22;color:${col};font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;white-space:nowrap">${rvEsc(o.etapa || '—')}</span></td>
      <td style="white-space:nowrap;font-size:12px">${rvEsc(o.fecha_cierre || '—')}</td>
      ${editable ? `<td style="white-space:nowrap">
        <button onclick="rvPipeForm('${o.id}')" title="Editar" style="background:none;border:1.5px solid #d8dde3;border-radius:5px;cursor:pointer;padding:2px 7px;font-size:11px;margin-right:3px">✏️</button>
        <button onclick="rvPipeEliminar('${o.id}')" title="Eliminar" style="background:none;border:none;cursor:pointer;color:#c0392b;font-size:16px;padding:0 4px">×</button>
      </td>` : ''}
    </tr>`;
  }).join('');

  page.innerHTML = `
    <div class="page-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <span>📈 Pipeline de Visitas</span>
      ${editable ? `<button onclick="rvPipeForm()" style="background:#198c35;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;padding:10px 18px;font-size:13px;box-shadow:0 2px 8px rgba(25,140,53,.35);display:inline-flex;align-items:center;gap:6px">➕ Nueva oportunidad</button>` : ''}
    </div>
    <div class="page-sub" style="color:#607d8b;margin-bottom:14px">Registro de visitas de trabajadores híbridos y oportunidades comerciales conseguidas.</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      ${kpi('Oportunidades abiertas', abiertas.length, '#0f2540')}
      ${kpi('Monto en pipeline', rvMoney(montoPipe), '#0277BD')}
      ${kpi('Ponderado x prob.', rvMoney(ponderado), '#E67E22')}
      ${kpi('Ganado', rvMoney(ganado), '#198C35')}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <select id="pipe-f-etapa" onchange="rvRenderPipeline()" style="padding:8px 10px;border:1.5px solid #d8dde3;border-radius:8px;font-size:13px">${optEtapa}</select>
      <select id="pipe-f-trab" onchange="rvRenderPipeline()" style="padding:8px 10px;border:1.5px solid #d8dde3;border-radius:8px;font-size:13px">${optTrab}</select>
      <input id="pipe-f-busca" oninput="rvRenderPipeline()" value="${rvEsc(fBusca)}" placeholder="Buscar empresa, contacto, oportunidad..." style="padding:8px 10px;border:1.5px solid #d8dde3;border-radius:8px;font-size:13px;flex:1;min-width:200px">
    </div>
    ${filas.length ? `<div class="card" style="padding:0;overflow:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#0f2540;color:#fff;font-size:11px;text-align:left">
          <th style="padding:9px">Visita</th><th>Trabajador</th><th>Empresa</th><th>Contacto</th><th>Oportunidad</th><th style="text-align:right">Monto est.</th><th style="text-align:center">Prob.</th><th>Etapa</th><th>Cierre est.</th>${editable ? '<th></th>' : ''}
        </tr></thead>
        <tbody>${filasHTML}</tbody>
      </table></div>`
      : `<div style="text-align:center;padding:40px;color:#90a4ae;background:#fff;border:1px dashed #cfd8dc;border-radius:10px">Aún no hay oportunidades registradas.${editable ? ' Usa <b>➕ Nueva oportunidad</b> para empezar.' : ''}</div>`}
    <div style="font-size:11px;color:#90a4ae;margin-top:10px">${filas.length} de ${data.length} oportunidad(es)</div>
  `;
}
function rvPipeForm(id) {
  if (!rvPipePuedeEditar()) { alert('Solo usuarios con permiso pueden registrar oportunidades.'); return; }
  const data = rvPipeData();
  const rec = id ? (data.find(o => String(o.id) === String(id)) || {}) : {};
  const INP = 'width:100%;padding:9px 11px;border:1px solid #d8dde3;border-radius:7px;font-size:13px;box-sizing:border-box;outline:none;transition:border-color .12s,box-shadow .12s';
  const v = (k) => { const x = rec[k]; return x != null ? rvEsc(x) : ''; };
  const inp = (k, type, ph) => `<input id="pipe-${k}" type="${type || 'text'}" value="${v(k)}" placeholder="${ph || ''}" style="${INP}" onfocus="this.style.borderColor='#198c35';this.style.boxShadow='0 0 0 3px rgba(25,140,53,.12)'" onblur="this.style.borderColor='#d8dde3';this.style.boxShadow='none'">`;
  const ta = (k, ph) => `<textarea id="pipe-${k}" rows="2" placeholder="${ph || ''}" style="${INP};resize:vertical" onfocus="this.style.borderColor='#198c35';this.style.boxShadow='0 0 0 3px rgba(25,140,53,.12)'" onblur="this.style.borderColor='#d8dde3';this.style.boxShadow='none'">${v(k)}</textarea>`;
  const fld = (lbl, inner, full) => `<div style="${full ? 'grid-column:1/-1' : ''}"><label style="display:block;font-size:11px;font-weight:700;color:#607d8b;margin-bottom:3px">${lbl}</label>${inner}</div>`;
  const sec = (icon, title, inner) => `<div style="margin-top:16px"><div style="font-size:12px;font-weight:800;color:#0f2540;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid #eef2f6;padding-bottom:6px;margin-bottom:9px">${icon} ${title}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px 11px">${inner}</div></div>`;

  const etapaSel = rec.etapa || 'Prospecto';
  const chips = RV_PIPE_ETAPAS.map(e => {
    const col = RV_PIPE_COLOR[e]; const s = etapaSel === e;
    return `<div id="pipe-chip-${e}" onclick="rvPipeSetEtapa('${e}')" style="cursor:pointer;user-select:none;font-size:12px;font-weight:700;padding:6px 13px;border-radius:20px;border:2px solid ${col};color:${s ? '#fff' : col};background:${s ? col : 'transparent'};transition:all .12s">${e}</div>`;
  }).join('');
  const prob = (rec.probabilidad != null && rec.probabilidad !== '') ? rvNum(rec.probabilidad) : RV_PIPE_PROB[etapaSel];

  const cuerpo =
    sec('📅', 'Visita', fld('Fecha de visita', inp('fecha_visita', 'date')) + fld('Trabajador que visitó', inp('trabajador', 'text', 'Nombre del vendedor'))) +
    sec('🏢', 'Cliente', fld('Empresa / Cliente *', inp('empresa', 'text', 'Razón social o nombre'), true) + fld('Dirección', inp('direccion', 'text', 'Av. / Calle, número')) + fld('Distrito / Ciudad', inp('distrito', 'text', 'Ej. San Isidro'))) +
    sec('👤', 'Contacto', fld('Nombre del contacto', inp('contacto_nombre', 'text', 'Persona de contacto')) + fld('Cargo', inp('contacto_cargo', 'text', 'Ej. Jefe de compras')) + fld('Teléfono / WhatsApp', inp('contacto_tel', 'text', '+51 9...')) + fld('Email', inp('contacto_email', 'email', 'correo@empresa.com'))) +
    sec('💼', 'Oportunidad',
      fld('¿Qué oportunidad se consiguió?', ta('oportunidad', 'Describe la oportunidad detectada en la visita...'), true) +
      fld('Productos / servicios de interés', inp('productos', 'text', 'Cámaras, laptops, servicios...'), true) +
      fld('Monto estimado (S/.)', inp('monto', 'number', '0.00')) +
      fld('Etapa', `<input type="hidden" id="pipe-etapa" value="${etapaSel}"><div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:2px">${chips}</div>`, true) +
      fld('Probabilidad de cierre', `<div style="display:flex;align-items:center;gap:12px"><input type="range" id="pipe-probabilidad" min="0" max="100" step="5" value="${prob}" oninput="rvPipeProbLabel(this.value)" style="flex:1;accent-color:#198c35"><div id="pipe-prob-label" style="font-weight:800;font-size:16px;color:#0f2540;min-width:46px;text-align:right">${prob}%</div></div>`, true)
    ) +
    sec('📆', 'Seguimiento', fld('Fecha estimada de cierre', inp('fecha_cierre', 'date')) + fld('Fecha de próxima acción', inp('fecha_proxima', 'date')) + fld('Próxima acción', inp('proxima_accion', 'text', 'Ej. Enviar cotización'), true) + fld('Notas / observaciones', ta('notas', 'Cualquier detalle adicional...'), true));

  rvModal(`
    <h3 style="margin:0 0 4px 0;font-size:18px">${id ? '✏️ Editar' : '➕ Nueva'} oportunidad</h3>
    <div style="font-size:12px;color:#78909c;margin-bottom:4px">Completa todos los datos posibles de la visita. Solo la empresa es obligatoria.</div>
    <div style="max-height:62vh;overflow:auto;padding-right:6px">${cuerpo}</div>
    <div style="display:flex;gap:8px;margin-top:16px;position:sticky;bottom:0;background:#fff;padding-top:6px">
      <button onclick="rvPipeGuardarForm('${id || ''}')" style="flex:2;padding:12px;background:#198c35;color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:800;font-size:14px;box-shadow:0 2px 8px rgba(25,140,53,.3)">💾 Guardar oportunidad</button>
      <button onclick="closeRvModal()" style="flex:1;padding:12px;background:#eceff1;color:#455a64;border:none;border-radius:7px;cursor:pointer;font-weight:600">Cancelar</button>
    </div>
  `, 620);
}
// Interactividad del formulario de pipeline (etapa por chips + slider de probabilidad)
window.rvPipeSetEtapa = function (e) {
  const h = document.getElementById('pipe-etapa'); if (h) h.value = e;
  RV_PIPE_ETAPAS.forEach(x => {
    const c = document.getElementById('pipe-chip-' + x); if (!c) return;
    const col = RV_PIPE_COLOR[x]; const s = x === e;
    c.style.color = s ? '#fff' : col; c.style.background = s ? col : 'transparent';
  });
  const sl = document.getElementById('pipe-probabilidad');
  if (sl) { sl.value = RV_PIPE_PROB[e]; rvPipeProbLabel(sl.value); }
};
window.rvPipeProbLabel = function (val) {
  const l = document.getElementById('pipe-prob-label'); if (l) l.textContent = val + '%';
};
function rvPipeGuardarForm(id) {
  const get = (k) => { const el = document.getElementById('pipe-' + k); return el ? el.value : ''; };
  const empresa = get('empresa').trim();
  if (!empresa) { alert('La empresa / cliente es obligatoria.'); return; }
  const rec = {};
  RV_PIPE_CAMPOS.forEach(f => { rec[f.k] = f.type === 'number' ? rvNum(get(f.k)) : get(f.k).trim ? get(f.k).trim() : get(f.k); });
  if (!rec.etapa) rec.etapa = 'Prospecto';
  if (!rvNum(rec.probabilidad)) rec.probabilidad = RV_PIPE_PROB[rec.etapa] != null ? RV_PIPE_PROB[rec.etapa] : 0;
  const data = rvPipeData();
  if (id) {
    const i = data.findIndex(o => String(o.id) === String(id));
    if (i >= 0) { rec.id = data[i].id; rec.created_at = data[i].created_at; rec.updated_at = new Date().toISOString(); data[i] = rec; }
    else { rec.id = 'pl_' + (++window.__rvPid); rec.created_at = new Date().toISOString(); data.push(rec); }
  } else {
    rec.id = 'pl_' + (++window.__rvPid); rec.created_at = new Date().toISOString(); data.push(rec);
  }
  rvPipeGuardar(data);
  rvAuditar(id ? 'editar' : 'agregar', 'pipeline', 'Oportunidad: ' + empresa + ' | ' + (rec.etapa || '') + ' | S/. ' + rvNum(rec.monto));
  closeRvModal();
  rvRenderPipeline();
}
function rvPipeEliminar(id) {
  if (!rvPipePuedeEditar()) return;
  const data = rvPipeData();
  const rec = data.find(o => String(o.id) === String(id));
  if (!rec) return;
  if (!confirm('¿Eliminar esta oportunidad?\n\n' + (rec.empresa || '') + (rec.oportunidad ? '\n' + rec.oportunidad : ''))) return;
  const nueva = data.filter(o => String(o.id) !== String(id));
  rvPipeGuardar(nueva);
  rvAuditar('eliminar', 'pipeline', 'Oportunidad eliminada: ' + (rec.empresa || '') + ' | S/. ' + rvNum(rec.monto));
  rvRenderPipeline();
}
window.rvRenderPipeline = rvRenderPipeline;
window.rvPipeForm = rvPipeForm;
window.rvPipeGuardarForm = rvPipeGuardarForm;
window.rvPipeEliminar = rvPipeEliminar;

// Inyección del módulo en el sidebar + página + navegación (additivo)
(function rvInitPipeline() {
  // Página contenedora (hermana de page-proyectos)
  const pProy = document.getElementById('page-proyectos');
  if (pProy && !document.getElementById('page-pipeline')) {
    pProy.insertAdjacentHTML('afterend', '<div class="page" id="page-pipeline"></div>');
  }
  // Ítem de navegación debajo de "Proyectos / OC"
  const navProy = document.querySelector('.nav-item[data-page="proyectos"]');
  if (navProy && !document.querySelector('.nav-item[data-page="pipeline"]')) {
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.setAttribute('data-page', 'pipeline');
    el.setAttribute('onclick', "goPage('pipeline')");
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 9l-5 5-3-3-4 4"/></svg> Pipeline Visitas';
    navProy.insertAdjacentElement('afterend', el);
  }
  // Envolver goPage para renderizar el pipeline al abrirlo.
  // El rol "pipeline" queda confinado a esta página (cualquier otra → pipeline).
  if (typeof window.goPage === 'function') {
    const _gp = window.goPage;
    window.goPage = function (id) {
      if (window.RV_ROL_REAL === 'pipeline' && id !== 'pipeline') id = 'pipeline';
      const r = _gp.call(this, id);
      try { if (id === 'pipeline') rvRenderPipeline(); } catch (e) { console.error('[PIPELINE]', e); }
      return r;
    };
  }
})();

// ═══════════════════════════════════════════════════════════════
// PLANILLA DETALLADA (carga por Excel + registro automático)
// Campos completos (trabajador, cargo, ingreso, días, remuneración, bono,
// adelantos, vacaciones, liquidación, total, AFP/ONP, EsSalud, gratif, desc,
// cuenta). Se guarda en rv_planilla (respaldo automático en la BD). Calcula
// automáticamente descuentos de pensión, EsSalud, totales y neto. Additivo.
// ═══════════════════════════════════════════════════════════════
window.__rvPlnId = window.__rvPlnId || Date.now();
const RV_PLN_R2 = (x) => Math.round(rvNum(x) * 100) / 100;
const RV_PLAN_FIELDS = [
  { k: 'ano', lbl: 'Año', type: 'number', al: ['Año', 'Ano', 'ANO', 'AÑO', 'año', 'ano'] },
  { k: 'mes', lbl: 'Mes', type: 'number', al: ['Mes', 'mes', 'MES'] },
  { k: 'trabajador', lbl: 'Trabajador', type: 'text', al: ['Trabajador', 'trabajador', 'Empleado', 'empleado', 'Nombre', 'nombre'] },
  { k: 'cargo', lbl: 'Cargo', type: 'text', al: ['Cargo', 'cargo', 'Puesto', 'puesto'] },
  { k: 'fecha_ingreso', lbl: 'Fecha de ingreso', type: 'date', al: ['Fecha Ingreso', 'Fecha de Ingreso', 'fecha_ingreso', 'Ingreso', 'FechaIngreso'] },
  { k: 'dias', lbl: 'Días laborados', type: 'number', al: ['Dias Laborados', 'Días Laborados', 'dias', 'Dias', 'Días', 'DiasLaborados'] },
  { k: 'remuneracion', lbl: 'Remuneración', type: 'number', al: ['Remuneracion', 'Remuneración', 'remuneracion', 'Sueldo', 'sueldo'] },
  { k: 'bono', lbl: 'Bono', type: 'number', al: ['Bono', 'bono', 'Bonificacion', 'Bonificación'] },
  { k: 'adelantos', lbl: 'Adelantos', type: 'number', al: ['Adelantos', 'adelantos', 'Adelanto'] },
  { k: 'vacaciones', lbl: 'Vacaciones', type: 'number', al: ['Vacaciones', 'vacaciones'] },
  { k: 'liquidacion', lbl: 'Liquidación de servicio', type: 'number', al: ['Liquidacion Servicio', 'Liquidación de servicio', 'Liquidacion', 'Liquidación', 'liquidacion'] },
  { k: 'total', lbl: 'Total', type: 'number', al: ['Total', 'total'] },
  { k: 'sistema', lbl: 'Sistema pensión (AFP/ONP)', type: 'text', al: ['Sistema (AFP/ONP)', 'Sistema', 'sistema', 'AFP/ONP', 'Pension', 'Pensión'] },
  { k: 'desc_pension', lbl: 'Descuento AFP/ONP', type: 'number', al: ['Descuento AFP/ONP', 'Descuentos al trabajador', 'Desc AFP/ONP', 'Descuento Pension', 'desc_pension'] },
  { k: 'total_descuentos', lbl: 'Total de descuentos', type: 'number', al: ['Total Descuentos', 'Total de descuentos', 'total_descuentos'] },
  { k: 'neto', lbl: 'Neto a pagar', type: 'number', al: ['Neto a Pagar', 'Neto', 'neto', 'NetoAPagar'] },
  { k: 'essalud', lbl: 'EsSalud 9%', type: 'number', al: ['Essalud 9%', 'EsSalud 9%', 'Essalud', 'EsSalud', 'essalud'] },
  { k: 'gratif', lbl: 'Gratificación', type: 'number', al: ['Gratif', 'Gratif.', 'Gratificacion', 'Gratificación', 'gratif'] },
  { k: 'desc_otros', lbl: 'Otros descuentos (Desc)', type: 'number', al: ['Desc', 'desc', 'Otros Descuentos', 'OtrosDesc'] },
  { k: 'n_cuenta', lbl: 'N° de Cuenta', type: 'text', al: ['N Cuenta', 'N° Cuenta', '# de Cuentas', 'Cuenta', 'cuenta', 'NroCuenta', 'Nro Cuenta', 'Numero de Cuenta'] }
];
function rvPlanillaFull() {
  try { const o = JSON.parse(localStorage.getItem('rv_planilla') || '[]'); return Array.isArray(o) ? o : []; }
  catch (e) { return []; }
}
function rvPlanillaGuardar(list) {
  localStorage.setItem('rv_planilla', JSON.stringify(list));
  if (window.rvEmpujarAhora) window.rvEmpujarAhora();
}
function rvPlanKey(r) { return String(r.trabajador || '').toLowerCase().trim() + '|' + rvNum(r.mes) + '|' + rvNum(r.ano); }
// Calcula los campos derivados (respeta los que ya vengan con valor)
function rvPlanillaCalc(r) {
  const rem = rvNum(r.remuneracion), bono = rvNum(r.bono), grat = rvNum(r.gratif),
    vac = rvNum(r.vacaciones), liq = rvNum(r.liquidacion), adel = rvNum(r.adelantos);
  const total = rvNum(r.total) > 0 ? rvNum(r.total) : RV_PLN_R2(rem + bono + grat + vac + liq);
  const sisRaw = String(r.sistema || '').toUpperCase();
  const sistema = sisRaw.indexOf('ONP') >= 0 ? 'ONP' : (sisRaw.indexOf('AFP') >= 0 ? 'AFP' : (r.sistema || ''));
  const rate = sistema === 'ONP' ? 0.13 : (sistema === 'AFP' ? 0.1256 : 0);
  const desc_pension = rvNum(r.desc_pension) > 0 ? rvNum(r.desc_pension) : RV_PLN_R2(rem * rate);
  const desc_otros = rvNum(r.desc_otros);
  const total_descuentos = rvNum(r.total_descuentos) > 0 ? rvNum(r.total_descuentos) : RV_PLN_R2(desc_pension + adel + desc_otros);
  const neto = rvNum(r.neto) > 0 ? rvNum(r.neto) : RV_PLN_R2(total - total_descuentos);
  const essalud = rvNum(r.essalud) > 0 ? rvNum(r.essalud) : RV_PLN_R2(rem * 0.09);
  return Object.assign({}, r, {
    ano: rvNum(r.ano), mes: rvNum(r.mes), dias: rvNum(r.dias),
    remuneracion: rem, bono, gratif: grat, vacaciones: vac, liquidacion: liq, adelantos: adel,
    total, sistema, desc_pension, desc_otros, total_descuentos, neto, essalud
  });
}
// ── Plantilla Excel (rica) ──
window.rvDescargarPlantillaPlanilla = function () {
  if (typeof XLSX === 'undefined') { alert('❌ Librería XLSX no disponible'); return; }
  const hoy = new Date();
  const headers = ['Año', 'Mes', 'Trabajador', 'Cargo', 'Fecha Ingreso', 'Dias Laborados', 'Remuneracion', 'Bono', 'Adelantos', 'Vacaciones', 'Liquidacion Servicio', 'Total', 'Sistema (AFP/ONP)', 'Descuento AFP/ONP', 'Total Descuentos', 'Neto a Pagar', 'Essalud 9%', 'Gratif', 'Desc', 'N Cuenta'];
  const ejemplo = [hoy.getFullYear(), hoy.getMonth() + 1, 'Juan Pérez (ejemplo, borrar)', 'Vendedor', '2024-01-15', 30, 2500, 300, 0, 0, 0, '', 'AFP', '', '', '', '', 0, 0, '191-1234567890'];
  const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(9, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Planilla');
  XLSX.writeFile(wb, 'plantilla_planilla_revionix.xlsx');
  if (typeof showToast === 'function') showToast('Plantilla descargada · las columnas de cálculo (Total, AFP/ONP, Neto, EsSalud) se completan solas');
};
// ── Importar Excel (rica) → registra trabajadores automáticamente ──
window.rvImportarPlanilla = function () {
  if (typeof XLSX === 'undefined') { alert('❌ Librería XLSX no disponible'); return; }
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
  input.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        const data = rvPlanillaFull();
        const idx = {}; data.forEach((r, i) => { idx[rvPlanKey(r)] = i; });
        let ok = 0, skip = 0;
        rows.forEach(row => {
          const g = (al) => { for (const n of al) { if (row[n] !== undefined && row[n] !== '') return row[n]; } return ''; };
          const rec = {};
          RV_PLAN_FIELDS.forEach(f => { rec[f.k] = f.type === 'number' ? rvNum(g(f.al)) : String(g(f.al)).trim(); });
          if (!rec.trabajador || rec.trabajador.toLowerCase().includes('ejemplo')) { skip++; return; }
          if (!rec.ano) rec.ano = new Date().getFullYear();
          if (!rec.mes) rec.mes = new Date().getMonth() + 1;
          const calc = rvPlanillaCalc(rec);
          const key = rvPlanKey(calc);
          if (idx[key] !== undefined) { calc.id = data[idx[key]].id; data[idx[key]] = calc; }
          else { calc.id = 'pln_' + (++window.__rvPlnId); data.push(calc); idx[key] = data.length - 1; }
          ok++;
        });
        rvPlanillaGuardar(data);
        rvRenderPlanillaTabla();
        rvAuditar('importar', 'planilla', 'Importó/actualizó ' + ok + ' trabajadores');
        alert('✅ Planilla importada: ' + ok + ' trabajador(es) registrado(s)/actualizado(s)' + (skip ? ' · ' + skip + ' fila(s) omitidas' : ''));
      } catch (err) { alert('❌ Error al leer el archivo: ' + err.message); }
    };
    reader.readAsBinaryString(file);
  };
  input.click();
};
// ── Render de la tabla rica ──
function rvRenderPlanillaTabla() {
  const tabla = document.getElementById('tbl-planilla');
  if (!tabla) return;
  const editable = (typeof CURRENT !== 'undefined' && CURRENT && CURRENT.role === 'admin');
  const data = rvPlanillaFull().map(rvPlanillaCalc);
  data.sort((a, b) => (b.ano - a.ano) || (b.mes - a.mes) || String(a.trabajador || '').localeCompare(String(b.trabajador || '')));
  const M = (v) => rvNum(v) ? rvMoney(v) : '<span style="color:#c3ccd4">—</span>';
  const th = (t, extra) => `<th style="padding:7px 8px;white-space:nowrap;${extra || ''}">${t}</th>`;
  const cabecera = `<tr style="background:#0f2540;color:#fff;font-size:10.5px;text-align:left">
    ${th('Año')}${th('Mes')}${th('Trabajador')}${th('Cargo')}${th('Ingreso')}${th('Días')}${th('Remun.', 'text-align:right')}${th('Bono', 'text-align:right')}${th('Adel.', 'text-align:right')}${th('Vacac.', 'text-align:right')}${th('Liquid.', 'text-align:right')}${th('Gratif.', 'text-align:right')}${th('Total', 'text-align:right')}${th('Sist.')}${th('Desc.AFP/ONP', 'text-align:right')}${th('Otros', 'text-align:right')}${th('Tot.Desc', 'text-align:right')}${th('Neto', 'text-align:right')}${th('EsSalud', 'text-align:right')}${th('N° Cuenta')}${editable ? th('') : ''}
  </tr>`;
  const meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  const cuerpo = data.map(r => {
    const sisCol = r.sistema === 'ONP' ? '#455A64' : (r.sistema === 'AFP' ? '#1565C0' : '#90A4AE');
    return `<tr style="font-size:11px;border-bottom:1px solid #eef2f6">
      <td style="padding:5px 8px">${rvNum(r.ano) || '—'}</td>
      <td style="padding:5px 8px">${meses[rvNum(r.mes)] || r.mes || '—'}</td>
      <td style="padding:5px 8px;font-weight:600;color:#0f2540;white-space:nowrap">${rvEsc(r.trabajador)}</td>
      <td style="padding:5px 8px;color:#607d8b">${rvEsc(r.cargo) || '—'}</td>
      <td style="padding:5px 8px;white-space:nowrap">${rvEsc(r.fecha_ingreso) || '—'}</td>
      <td style="padding:5px 8px;text-align:center">${rvNum(r.dias) || '—'}</td>
      <td style="padding:5px 8px;text-align:right">${M(r.remuneracion)}</td>
      <td style="padding:5px 8px;text-align:right">${M(r.bono)}</td>
      <td style="padding:5px 8px;text-align:right;color:#c0392b">${M(r.adelantos)}</td>
      <td style="padding:5px 8px;text-align:right">${M(r.vacaciones)}</td>
      <td style="padding:5px 8px;text-align:right">${M(r.liquidacion)}</td>
      <td style="padding:5px 8px;text-align:right">${M(r.gratif)}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:700">${M(r.total)}</td>
      <td style="padding:5px 8px"><span style="font-size:10px;font-weight:700;color:${sisCol}">${rvEsc(r.sistema) || '—'}</span></td>
      <td style="padding:5px 8px;text-align:right;color:#c0392b">${M(r.desc_pension)}</td>
      <td style="padding:5px 8px;text-align:right;color:#c0392b">${M(r.desc_otros)}</td>
      <td style="padding:5px 8px;text-align:right;color:#c0392b;font-weight:600">${M(r.total_descuentos)}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:800;color:#198c35">${M(r.neto)}</td>
      <td style="padding:5px 8px;text-align:right;color:#7b1fa2">${M(r.essalud)}</td>
      <td style="padding:5px 8px;white-space:nowrap;font-size:10px;color:#607d8b">${rvEsc(r.n_cuenta) || '—'}</td>
      ${editable ? `<td style="padding:5px 8px;white-space:nowrap">
        <button onclick="rvPlanillaForm('${r.id}')" title="Editar" style="background:none;border:1.5px solid #d8dde3;border-radius:5px;cursor:pointer;padding:1px 6px;font-size:11px;margin-right:2px">✏️</button>
        <button onclick="rvPlanillaEliminar('${r.id}')" title="Eliminar" style="background:none;border:none;cursor:pointer;color:#c0392b;font-size:15px;padding:0 3px">×</button>
      </td>` : ''}
    </tr>`;
  }).join('');
  const sum = (k) => data.reduce((s, r) => s + rvNum(r[k]), 0);
  const totRow = data.length ? `<tr style="background:#f4f7fa;font-weight:800;font-size:11px;border-top:2px solid #cfd8dc">
    <td colspan="6" style="padding:7px 8px;text-align:right">TOTALES (${data.length}):</td>
    <td style="padding:7px 8px;text-align:right">${rvMoney(sum('remuneracion'))}</td>
    <td style="padding:7px 8px;text-align:right">${rvMoney(sum('bono'))}</td>
    <td style="padding:7px 8px;text-align:right">${rvMoney(sum('adelantos'))}</td>
    <td style="padding:7px 8px;text-align:right">${rvMoney(sum('vacaciones'))}</td>
    <td style="padding:7px 8px;text-align:right">${rvMoney(sum('liquidacion'))}</td>
    <td style="padding:7px 8px;text-align:right">${rvMoney(sum('gratif'))}</td>
    <td style="padding:7px 8px;text-align:right">${rvMoney(sum('total'))}</td>
    <td></td>
    <td style="padding:7px 8px;text-align:right">${rvMoney(sum('desc_pension'))}</td>
    <td style="padding:7px 8px;text-align:right">${rvMoney(sum('desc_otros'))}</td>
    <td style="padding:7px 8px;text-align:right">${rvMoney(sum('total_descuentos'))}</td>
    <td style="padding:7px 8px;text-align:right;color:#198c35">${rvMoney(sum('neto'))}</td>
    <td style="padding:7px 8px;text-align:right;color:#7b1fa2">${rvMoney(sum('essalud'))}</td>
    <td colspan="${editable ? 2 : 1}"></td>
  </tr>` : '';
  tabla.style.minWidth = '1100px';
  tabla.innerHTML = `<thead>${cabecera}</thead><tbody>${cuerpo || `<tr><td colspan="21" style="padding:26px;text-align:center;color:#90a4ae">Sin registros. Usa <b>📥 Plantilla XLS</b>, llénala y súbela con <b>📂 Importar XLS</b>.</td></tr>`}</tbody><tfoot>${totRow}</tfoot>`;
}
// ── Alta/edición manual (modal rico) ──
function rvPlanillaForm(id) {
  if (!(typeof CURRENT !== 'undefined' && CURRENT && CURRENT.role === 'admin')) { alert('Solo administradores.'); return; }
  const data = rvPlanillaFull();
  const rec = id ? (data.find(o => String(o.id) === String(id)) || {}) : { ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, sistema: 'AFP' };
  const INP = 'width:100%;padding:8px 10px;border:1px solid #d8dde3;border-radius:6px;font-size:13px;box-sizing:border-box;outline:none';
  const v = (k) => { const x = rec[k]; return x != null ? rvEsc(x) : ''; };
  const campos = RV_PLAN_FIELDS.map(f => {
    if (f.k === 'sistema') {
      const opts = ['', 'AFP', 'ONP'].map(o => `<option value="${o}" ${o === (rec.sistema || '') ? 'selected' : ''}>${o || '—'}</option>`).join('');
      return `<div><label style="display:block;font-size:11px;font-weight:700;color:#607d8b;margin-bottom:3px">${f.lbl}</label><select id="pln-${f.k}" style="${INP}">${opts}</select></div>`;
    }
    return `<div><label style="display:block;font-size:11px;font-weight:700;color:#607d8b;margin-bottom:3px">${f.lbl}</label><input id="pln-${f.k}" type="${f.type}" value="${v(f.k)}" style="${INP}"></div>`;
  }).join('');
  rvModal(`
    <h3 style="margin:0 0 4px 0">${id ? '✏️ Editar' : '➕ Nuevo'} trabajador (planilla)</h3>
    <div style="font-size:12px;color:#78909c;margin-bottom:8px">Total, descuento AFP/ONP, total de descuentos, neto y EsSalud se calculan solos si los dejas vacíos.</div>
    <div style="max-height:60vh;overflow:auto;padding-right:6px;display:grid;grid-template-columns:1fr 1fr;gap:9px 11px">${campos}</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="rvPlanillaGuardarForm('${id || ''}')" style="flex:2;padding:12px;background:#198c35;color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:800">💾 Guardar</button>
      <button onclick="closeRvModal()" style="flex:1;padding:12px;background:#eceff1;color:#455a64;border:none;border-radius:7px;cursor:pointer;font-weight:600">Cancelar</button>
    </div>
  `, 620);
}
function rvPlanillaGuardarForm(id) {
  const get = (k) => { const el = document.getElementById('pln-' + k); return el ? el.value : ''; };
  const rec = {};
  RV_PLAN_FIELDS.forEach(f => { rec[f.k] = f.type === 'number' ? rvNum(get(f.k)) : String(get(f.k)).trim(); });
  if (!rec.trabajador) { alert('El nombre del trabajador es obligatorio.'); return; }
  if (!rec.ano) rec.ano = new Date().getFullYear();
  if (!rec.mes) rec.mes = new Date().getMonth() + 1;
  const calc = rvPlanillaCalc(rec);
  const data = rvPlanillaFull();
  if (id) { const i = data.findIndex(o => String(o.id) === String(id)); if (i >= 0) { calc.id = data[i].id; data[i] = calc; } else { calc.id = 'pln_' + (++window.__rvPlnId); data.push(calc); } }
  else {
    const key = rvPlanKey(calc); const i = data.findIndex(o => rvPlanKey(o) === key);
    if (i >= 0) { calc.id = data[i].id; data[i] = calc; } else { calc.id = 'pln_' + (++window.__rvPlnId); data.push(calc); }
  }
  rvPlanillaGuardar(data);
  rvAuditar(id ? 'editar' : 'agregar', 'planilla', 'Trabajador: ' + rec.trabajador + ' | ' + rec.mes + '/' + rec.ano + ' | neto S/. ' + calc.neto);
  closeRvModal();
  rvRenderPlanillaTabla();
}
function rvPlanillaEliminar(id) {
  if (!(typeof CURRENT !== 'undefined' && CURRENT && CURRENT.role === 'admin')) return;
  const data = rvPlanillaFull();
  const rec = data.find(o => String(o.id) === String(id));
  if (!rec) return;
  if (!confirm('¿Eliminar de la planilla a ' + (rec.trabajador || '') + '?')) return;
  rvPlanillaGuardar(data.filter(o => String(o.id) !== String(id)));
  rvAuditar('eliminar', 'planilla', 'Trabajador eliminado: ' + (rec.trabajador || ''));
  rvRenderPlanillaTabla();
}
window.rvPlanillaForm = rvPlanillaForm;
window.rvPlanillaGuardarForm = rvPlanillaGuardarForm;
window.rvPlanillaEliminar = rvPlanillaEliminar;
window.openAddPlanilla = function () { rvPlanillaForm(); };
// Override de carga: migra registros básicos de la BD la 1ª vez y renderiza la tabla rica
window.loadPlanilla = async function () {
  try {
    let full = rvPlanillaFull();
    if (!full.length) {
      try {
        const db = await fetch(`${RV_API}/planilla`).then(r => r.json());
        if (Array.isArray(db) && db.length) {
          full = db.map(d => rvPlanillaCalc({ id: 'pln_' + (++window.__rvPlnId), ano: d.ano, mes: d.mes, trabajador: d.empleado, remuneracion: d.sueldo, bono: d.bonificacion, desc_otros: d.descuentos }));
          rvPlanillaGuardar(full);
          console.log('[PLANILLA] migrados', full.length, 'registros de la BD a la planilla detallada');
        }
      } catch (e) {}
    }
    rvRenderPlanillaTabla();
  } catch (e) { console.error('[PLANILLA]', e); }
};

console.log('[RV-API] ✓ Módulos API cargados sin conflictos');
