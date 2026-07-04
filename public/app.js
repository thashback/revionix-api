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
function rvDecorarGastos() {
  const tbody = document.getElementById('tbl-gastos-body');
  if (!tbody) return;
  const lista = rvGastosConClave();
  const pdfs = rvPdfsGastos();
  const filas = tbody.querySelectorAll('tr');
  filas.forEach((tr, i) => {
    const item = lista[i];
    if (!item) return;
    const celda = tr.lastElementChild;
    if (!celda || celda.querySelector('.rv-pdf-btn')) return;
    const ruta = pdfs[item.clave];
    const cont = document.createElement('span');
    cont.style.whiteSpace = 'nowrap';
    cont.innerHTML =
      (ruta ? `<button class="rv-pdf-btn" onclick="viewFile('${ruta}')" title="Ver comprobante" style="background:#e3f0fb;border:1.5px solid #bdd7f3;border-radius:5px;cursor:pointer;padding:1px 6px;font-size:11px;margin-left:3px">📄</button>` : '') +
      `<button class="rv-pdf-btn" onclick="rvSubirPdfGasto('${item.clave}')" title="${ruta ? 'Reemplazar' : 'Subir'} comprobante" style="background:none;border:1.5px solid var(--c-border,#d8dde3);border-radius:5px;cursor:pointer;padding:1px 6px;font-size:11px;margin-left:3px">📤</button>`;
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
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #eee;padding-bottom:10px">
      <h3 style="margin:0;color:#333">📅 Desglose de Ventas — ${rvEsc(etiqueta)}</h3>
      <button onclick="closeRvModal()" style="background:none;border:none;font-size:24px;cursor:pointer">×</button>
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
      t.costo = rvNum(ov[sig]);
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
    r.costo = m.costo;
    r.margen = rvNum(r.venta) - r.costo;
    r.margen_pct = r.venta ? (r.margen / r.venta * 100) : 0;
    ov[rvSigVenta(r)] = m.costo;
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
          const fecha = String(get(r, ['Fecha', 'fecha', 'FECHA']) || new Date().toISOString().slice(0, 10)).slice(0, 10);
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
      const fecha = String(g(r, ['Fecha', 'fecha', 'FECHA']) || '').slice(0, 10);
      const modelo = String(g(r, ['Modelo', 'modelo', 'MODELO', 'Producto', 'producto']) || '');
      const marca = String(g(r, ['Marca', 'marca', 'MARCA']) || 'Otros');
      const venta = rvNum(g(r, ['Venta_S/.', 'Venta', 'venta', 'Precio', 'Precio_Venta', 'PrecioVenta', 'Total', 'total']));
      let costo = rvNum(g(r, ['Costo_S/.', 'Costo', 'costo', 'Costo_Unit', 'CostoUnit']));
      if (costo <= 0) { const c = rvBuscarCostoCompra(modelo, marca); if (c != null) costo = c; }
      const qty = Math.max(1, Math.round(rvNum(g(r, ['Qty', 'Cantidad', 'qty', 'cantidad', 'CANT']) || 1)));
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
  if (envolver('saveEdit', () => { rvPersistirCompras(); rvFlushCompras(); })) activadas.push('compras-persist');
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
        rvInyectarInputPdfGasto();
        rvDecorarGastos();
        rvDecorarMeses();
        rvDecorarCorp();
        rvDecorarEcommerce();
        rvInyectarBotonAgregar('page-detalle', 'rv-btn-det-add', '➕ Nueva Venta', '');
        rvInyectarBotonCostos();
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
    if (typeof renderGastos === 'function') try { renderGastos(); } catch (e) {}
    console.log('[GASTOS-BD] ✓', mapped.length, 'gastos desde la BD');
  } catch (e) { console.warn('[GASTOS-BD]', e.message); }
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
            const rolInline = (data.user.role === 'operaciones') ? 'admin' : data.user.role;
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
  envolver('saveVenta', () => setTimeout(() => { rvRebuildTxns(); rvFlushVentas(); }, 50));
  envolver('confirmImport', () => setTimeout(() => { rvRebuildTxns(); rvFlushVentas(); }, 50));

  // Stock: decorar tras render
  envolver('renderInvInicial', () => rvDecorarStock());
  envolver('renderInvRepos', () => rvDecorarStock());
  // Pagos pendientes: comprobante por fila
  envolver('renderPPAlq', () => rvDecorarPP());
  // Detalle por Producto: botones (agregar venta + completar costos)
  envolver('filterDetalle', () => { rvInyectarBotonAgregar('page-detalle', 'rv-btn-det-add', '➕ Nueva Venta', ''); rvInyectarBotonCostos(); });

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

console.log('[RV-API] ✓ Módulos API cargados sin conflictos');
