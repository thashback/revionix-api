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
    <div style="display:flex;gap:8px">
      <div style="flex:1"><label style="${RV_LABEL}">Monto Ejecutado (S/.)</label><input type="number" id="proy-ejec" placeholder="0.00" step="0.01" min="0" value="0" style="${RV_INPUT}" /></div>
      <div style="flex:1"><label style="${RV_LABEL}">Costo (S/.)</label><input type="number" id="proy-costo" placeholder="0.00" step="0.01" min="0" value="0" style="${RV_INPUT}" /></div>
    </div>
    <div style="background:#e3f0fb;padding:8px;border-radius:5px;font-size:11px;color:#455a64;margin-top:4px">💡 El <b>monto ejecutado</b> se suma como venta del canal <b>San Isidro</b> en el dashboard y EBITDA. El <b>costo</b> define el margen.</div>
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
    <div style="background:#e3f0fb;padding:8px;border-radius:5px;font-size:11px;color:#455a64;margin-bottom:4px">💡 El monto ejecutado suma como venta de <b>San Isidro</b>; el costo define el margen para EBITDA.</div>
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
  rvInyectarBotonAgregar('page-corporativo', 'rv-btn-corp-add', '➕ Nueva Venta Corporativa', 'Corporativo');
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
      <div class="card-title">📚 Historial Mensual Registrado (Base de Datos)</div>
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
    };
    activadas.push('gasto-nuevo-pdf');
  }

  // Primera pasada de decoración (el sistema pudo renderizar antes que app.js)
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        rvInyectarInputPdfGasto();
        rvDecorarGastos();
        rvDecorarMeses();
        rvDecorarCorp();
        rvDecorarEcommerce();
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
        TXNS_DATA.push({
          canal: 'San Isidro', cliente: p.cliente || 'Proyecto',
          mes: (p.fecha_oc || '').slice(0, 7), fecha: (p.fecha_oc || '').slice(0, 10),
          tipo_doc: 'OC', serie: p.numero_oc || '', correlativo: '', n_operacion: p.numero_oc || '',
          modelo: 'Proyecto: ' + (p.descripcion || p.numero_oc || ''), marca: 'Proyectos',
          qty: 1, venta, costo, margen: venta - costo,
          margen_pct: venta > 0 ? ((venta - costo) / venta * 100) : 0, __proy: p.id
        });
      });
    }

    if (typeof SEED !== 'undefined') SEED.transacciones = TXNS_DATA;
    recomputeSeedTotals();
    if (typeof renderAll === 'function') renderAll();
    if (typeof initCharts === 'function') setTimeout(initCharts, 120);
    console.log('[TXNS] ✓ Reconstruido: base + extras + proyectos =', TXNS_DATA.length, 'transacciones');
  } catch (e) {
    console.error('[TXNS]', e);
  } finally {
    rvSyncEnCurso = false;
  }
}
// Alias usado por el CRUD de proyectos
async function rvSyncProyectos() { return rvRebuildTxns(); }

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

  // Login → reconstruir transacciones (extras + proyectos) y recalcular todo
  if (typeof window.doLogin === 'function') {
    const doLoginOriginal = window.doLogin;
    window.doLogin = function (...args) {
      const r = doLoginOriginal.apply(this, args);
      setTimeout(() => { try { rvRebuildTxns(); } catch (e) {} }, 400);
      return r;
    };
  }

  // Tras registrar/importar ventas → reconstruir para evitar duplicados
  envolver('saveVenta', () => setTimeout(rvRebuildTxns, 50));
  envolver('confirmImport', () => setTimeout(rvRebuildTxns, 50));

  // Stock: decorar tras render
  envolver('renderInvInicial', () => rvDecorarStock());
  envolver('renderInvRepos', () => rvDecorarStock());
  // Pagos pendientes: comprobante por fila
  envolver('renderPPAlq', () => rvDecorarPP());

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
