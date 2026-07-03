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
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:20px">Sin proyectos registrados. Usa ➕ Nuevo Proyecto.</td></tr>';
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
  const file = document.getElementById('proy-file').files[0];
  if (file) formData.append('ruta_oc', file);

  try {
    const response = await fetch(`${RV_API}/proyectos`, { method: 'POST', body: formData });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      alert('✅ Proyecto creado');
      closeRvModal();
      loadProyectos();
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
    <label style="${RV_LABEL}">Monto Ejecutado (S/.) — avance del proyecto</label>
    <input type="number" id="ep-ejec" value="${rvNum(p.monto_ejecutado)}" step="0.01" min="0" style="${RV_INPUT}" />
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
  formData.append('estado', document.getElementById('ep-estado').value);

  try {
    const response = await fetch(`${RV_API}/proyectos/${id}`, { method: 'PUT', body: formData });
    if (response.ok) {
      alert('✅ Proyecto actualizado');
      closeRvModal();
      loadProyectos();
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
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// PLANILLA (Base de datos)
// Fórmula: Neto = Sueldo + Bonificación − Descuentos
// ═══════════════════════════════════════════════════════════════
const RV_MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

async function loadPlanilla() {
  try {
    const planilla = await fetch(`${RV_API}/planilla`).then(r => r.json());
    const tbody = document.getElementById('tbl-planilla-body');
    if (!tbody) return;
    if (!Array.isArray(planilla)) return;

    tbody.innerHTML = '';
    if (planilla.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;padding:20px">Sin registros. Usa ➕ Agregar Empleado.</td></tr>';
      return;
    }

    planilla.forEach(p => {
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
    timer = setTimeout(empujar, 1000);
  }

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
      goPageOriginal(id);
      if (id === 'proyectos') loadProyectos();
      if (id === 'planilla') loadPlanilla();
    };
    console.log('[RV-API] ✓ Navegación integrada (proyectos, planilla)');
  } else {
    console.warn('[RV-API] goPage del sistema principal no encontrado');
  }
})();

console.log('[RV-API] ✓ Módulos API cargados sin conflictos');
