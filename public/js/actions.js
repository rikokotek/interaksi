/* ============================================================
   TikFlow - Actions & Events Page
   Satu halaman, 3 Tabel (Screens, Actions, Events)
   ============================================================ */

let actionsData = [];
let screensData = [];
let eventsData = [];

// ============================================================
// DATA & CONFIGS
// ============================================================
const ACTION_TYPES = [
  { key: 'audio',   icon: '🔊', label: 'Play Audio',   color: 'var(--cyan)',   bg: 'rgba(6,182,212,0.1)' },
  { key: 'video',   icon: '🎬', label: 'Play Video',   color: 'var(--pink)',   bg: 'rgba(236,72,153,0.1)' },
  { key: 'webhook', icon: '🌐', label: 'Webhook',       color: 'var(--blue)',   bg: 'rgba(59,130,246,0.1)' },
  { key: 'pending', icon: '⏳', label: 'Pending Time',  color: 'var(--yellow)', bg: 'rgba(245,158,11,0.1)' },
];

const EVENT_TRIGGERS = [
  { type: 'gift', label: 'Gift', icon: '🎁', color: 'var(--yellow)' },
  { type: 'follow', label: 'Follow', icon: '👤', color: 'var(--green)' },
  { type: 'like', label: 'Like', icon: '❤️', color: 'var(--red)' },
  { type: 'comment', label: 'Komentar', icon: '💬', color: 'var(--blue)' },
  { type: 'member', label: 'Join Room', icon: '🚀', color: 'var(--accent)' },
  { type: 'share', label: 'Share', icon: '📤', color: 'var(--cyan)' },
];

// TIKTOK_GIFTS removed, using global TIKTOK_GIFTS from app.js

// ============================================================
// MAIN RENDER
// ============================================================
async function renderActions() {
  const page = document.getElementById('page-actions');
  page.innerHTML = `
    <div class="fade-in">
      <div class="page-header" style="margin-bottom:20px;">
        <div>
          <h1 class="page-title">Actions & Events</h1>
          <p class="page-subtitle">Kelola tindakan dan pemicu dalam satu tempat</p>
        </div>
      </div>

      <!-- ACTIONS SECTION -->
      <div class="card" style="margin-bottom:24px; border: 1px solid rgba(168,85,247,0.3);">
        <div class="card-header" style="background: rgba(168,85,247,0.05); justify-content:space-between; border-bottom: 1px solid rgba(168,85,247,0.1);">
          <div>
            <span class="card-title" style="color:var(--accent);">⚡ Actions</span>
            <div style="font-size:12px;color:var(--text3);margin-top:2px;">Apa yang akan terjadi? Buat efek audio/video di sini.</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openCreateAction()">
            ${svgIcon(ICONS.plus, 14)} Create new Action
          </button>
        </div>
        <div id="actions-list" class="content-list">
          <div class="empty-state">
            <div class="empty-state-icon">⚡</div>
            <h3>Memuat actions...</h3>
          </div>
        </div>
      </div>

      <!-- EVENTS SECTION -->
      <div class="card" style="margin-bottom:24px; border: 1px solid rgba(6,182,212,0.3);">
        <div class="card-header" style="background: rgba(6,182,212,0.05); justify-content:space-between; border-bottom: 1px solid rgba(6,182,212,0.1);">
          <div>
            <span class="card-title" style="color:var(--cyan);">🎯 Events</span>
            <div style="font-size:12px;color:var(--text3);margin-top:2px;">Apa yang memicu action? Hubungkan pemicu dengan action di sini.</div>
          </div>
          <button class="btn btn-primary btn-sm" style="background:var(--cyan);border-color:var(--cyan);" onclick="openCreateEvent()">
            ${svgIcon(ICONS.plus, 14)} Create new Event
          </button>
        </div>
        <div id="events-list" class="content-list">
          <div class="empty-state">
            <div class="empty-state-icon">🎯</div>
            <h3>Memuat events...</h3>
          </div>
        </div>
      </div>

      <!-- SCREENS SECTION -->
      <div class="card" style="border: 1px solid rgba(255,255,255,0.1);">
        <div class="card-header" style="background: rgba(255,255,255,0.02); justify-content:space-between; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div>
            <span class="card-title">🖥️ Overlay Screen Settings</span>
            <div style="font-size:12px;color:var(--text3);margin-top:2px;">To make your actions visible in OBS or Live Studio you need to include at least one overlay screen (widget).</div>
          </div>
        </div>
        <div style="padding:0;">
          <div id="screens-grid">
            <div class="empty-state" style="padding:20px;">Memuat screens...</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  await Promise.all([loadScreens(), loadActions(), loadEvents()]);
}

// ============================================================
// SCREENS MANAGEMENT
// ============================================================
async function loadScreens() {
  try {
    screensData = await apiFetch('/api/screens');
    renderScreensGrid();
  } catch (err) {
    console.error('Failed to load screens', err);
  }
}

let currentScreenStatuses = {};

function renderScreensGrid() {
  const grid = document.getElementById('screens-grid');
  if (!grid) return;

  if (screensData.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="padding:30px;">
        <p style="font-size:13px;">Belum ada screen OBS yang dibuat. Tambahkan screen untuk menampilkan Action Video.</p>
      </div>
    `;
    return;
  }

  let tableHtml = `
    <table style="width:100%; border-collapse: collapse; text-align: left; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border); color: var(--text3);">
          <th style="padding: 12px 16px; font-weight: 500;">Screen Name</th>
          <th style="padding: 12px 16px; font-weight: 500;">Screen URL (widget for OBS or Live Studio)</th>
          <th style="padding: 12px 16px; font-weight: 500; width: 150px;">Max. queue length</th>
          <th style="padding: 12px 16px; font-weight: 500; width: 120px;">Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  tableHtml += screensData.map(screen => {
    const url = `${window.location.origin}/screen/${screen.id}`;
    const status = currentScreenStatuses[screen.id] || 'Offline';
    
    let statusColor = 'var(--red)';
    if (status === 'Ready') statusColor = 'var(--green)';
    if (status === 'Playing') statusColor = 'var(--cyan)';

    return `
      <tr style="border-bottom: 1px solid var(--border2); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
        <td style="padding: 12px 16px; font-weight: 600; color: var(--text);">${screen.name}</td>
        <td style="padding: 12px 16px;">
          <a href="#" onclick="copyScreenUrl('${screen.id}'); return false;" style="color: var(--cyan); text-decoration: none; word-break: break-all;">${url}</a>
        </td>
        <td style="padding: 12px 16px;">
          <input type="number" min="1" max="100" value="${screen.maxQueue || 5}" 
                 onchange="updateScreenMaxQueue('${screen.id}', this.value)"
                 style="background: var(--background); border: 1px solid var(--border); color: var(--text); padding: 6px; border-radius: 4px; width: 70px;">
        </td>
        <td style="padding: 12px 16px; color: ${statusColor}; font-weight: 600;" id="status-${screen.id}">
          ${status}
        </td>
      </tr>
    `;
  }).join('');

  tableHtml += `</tbody></table>`;
  grid.innerHTML = tableHtml;
}

async function updateScreenMaxQueue(id, value) {
  try {
    const maxQueue = parseInt(value) || 5;
    await apiFetch(`/api/screens/${id}`, { method: 'PUT', body: { maxQueue } });
    showToast('Max queue diperbarui', 'success');
  } catch (err) {
    showToast('Gagal update queue', 'error');
  }
}

socket.on('screen_statuses', (statuses) => {
  currentScreenStatuses = statuses;
  if (AppState.currentPage === 'actions') {
    Object.keys(statuses).forEach(id => {
      const el = document.getElementById(`status-${id}`);
      if (el) {
        const status = statuses[id];
        el.textContent = status;
        if (status === 'Offline') el.style.color = 'var(--red)';
        else if (status === 'Ready') el.style.color = 'var(--green)';
        else if (status === 'Playing') el.style.color = 'var(--cyan)';
      }
    });
  }
});

// Screen manipulation removed, screens are locked to 1-10

async function toggleScreen(id) {
  const screen = screensData.find(s => s.id === id);
  if (!screen) return;
  try {
    await apiFetch(`/api/screens/${id}`, { method: 'PUT', body: { enabled: !screen.enabled } });
    screen.enabled = !screen.enabled;
    document.getElementById(`screen-toggle-${id}`)?.classList.toggle('on', screen.enabled);
  } catch {}
}

socket.on('screen_update', (screen) => {
  const idx = screensData.findIndex(s => s.id === screen.id);
  if (idx !== -1) {
    screensData[idx] = screen;
    if (AppState.currentPage === 'actions') renderScreensGrid();
  }
});

// ============================================================
// ACTIONS MANAGEMENT
// ============================================================
async function loadActions() {
  try {
    actionsData = await apiFetch('/api/actions');
    renderActionsList();
  } catch (err) {
    showToast('Gagal memuat actions', 'error');
  }
}

function renderActionsList() {
  const list = document.getElementById('actions-list');
  if (!list) return;

  if (actionsData.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚡</div>
        <h3>Belum ada Action</h3>
        <p>Buat action untuk audio/video efek.</p>
        <button class="btn btn-primary" style="margin-top:14px;" onclick="openCreateAction()">
          ${svgIcon(ICONS.plus)} Create new Action
        </button>
      </div>
    `;
    return;
  }

  list.innerHTML = actionsData.map(action => {
    const types = action.types || [action.type].filter(Boolean);
    const configs = action.configs || { [action.type]: action.config };

    const typeBadges = types.map(t => {
      const cfg = ACTION_TYPES.find(a => a.key === t) || { icon: '⚡', color: 'var(--accent)', label: t };
      return `<span class="badge" style="background:${cfg.bg || 'rgba(168,85,247,0.1)'};color:${cfg.color};gap:4px;">${cfg.icon} ${cfg.label}</span>`;
    }).join('');

    return `
      <div class="item-card" id="action-${action.id}" style="padding: 10px 16px;">
        <div class="item-actions" style="margin-right: 16px;">
          <button class="btn btn-primary btn-sm" onclick="testAction('${action.id}')" title="Test Action" style="border-radius: 4px; padding: 4px 8px;">
            ▶️
          </button>
        </div>
        <div class="item-info" style="flex:1; display:flex; align-items:center; gap:16px;">
          <div class="item-name" style="width: 200px;">${action.name}</div>
          <div style="display:flex;gap:4px;flex:1;">${typeBadges}</div>
        </div>
        <div class="item-actions">
          <div class="toggle-wrap" onclick="toggleAction('${action.id}')" style="margin-right:8px;">
            <div class="toggle ${action.enabled !== false ? 'on' : ''}" id="action-toggle-${action.id}"></div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="openEditAction('${action.id}')" title="Edit">
            ${svgIcon(ICONS.edit, 14)}
          </button>
          <button class="btn btn-ghost btn-sm" onclick="deleteAction('${action.id}')" title="Hapus" style="color:var(--red);">
            ${svgIcon(ICONS.trash, 14)}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

let editingActionId = null;
let selectedTypes = new Set();

function openCreateAction() {
  editingActionId = null;
  selectedTypes = new Set();
  openActionModal({ name: '', types: [], configs: {} });
}

function openEditAction(id) {
  const action = actionsData.find(a => a.id === id);
  if (!action) return;
  editingActionId = id;
  const types = action.types || [action.type].filter(Boolean);
  const configs = action.configs || { [action.type]: action.config };
  selectedTypes = new Set(types);
  openActionModal({ name: action.name, types, configs });
}

function openActionModal(action) {
  const content = `
    <div class="form-group">
      <label>Action Name</label>
      <input type="text" class="form-input" id="action-name" placeholder="Name your action..." value="${action.name || ''}"/>
    </div>

    <!-- TARGET SCREEN SECTION -->
    <div class="form-group" style="padding-bottom:12px; border-bottom:1px solid var(--border);">
      <label>Target Screen <span style="font-weight:normal;color:var(--text3);font-size:12px;">(Di layar mana action ini akan muncul)</span></label>
      <select class="form-select" id="action-global-screen-id">
        <option value="">-- Semua Screen --</option>
        ${screensData.map(s => `<option value="${s.id}" ${action.screenId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
      </select>
    </div>

    <!-- ACTION TYPES SECTION -->
    <div class="form-group">
      <label>Pilih Efek Action <span style="font-weight:normal;color:var(--text3);font-size:12px;">(Bisa pilih >1)</span></label>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px;">
        ${ACTION_TYPES.map(t => {
          const isSelected = selectedTypes.has(t.key);
          return `
            <div class="action-multi-btn ${isSelected ? 'selected' : ''}"
                 id="amulti-${t.key}"
                 onclick="toggleActionType('${t.key}')"
                 style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:8px;
                        background:${isSelected ? t.bg : 'var(--background)'};
                        border:2px solid ${isSelected ? t.color : 'var(--border2)'};
                        cursor:pointer;transition:all 0.2s;">
              <span style="font-size:22px;">${t.icon}</span>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:700;color:${isSelected ? t.color : 'var(--text2)'};">${t.label}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div id="action-configs-container">
        ${renderAllConfigs(action.configs || {})}
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="saveAction()">
      ${svgIcon(ICONS.check)} ${editingActionId ? 'Save Action' : 'Create Action'}
    </button>
  `;

  openModal(editingActionId ? 'Edit Action' : 'Create new Action', content, footer);
}

function toggleActionType(key) {
  if (selectedTypes.has(key)) selectedTypes.delete(key);
  else selectedTypes.add(key);

  const t = ACTION_TYPES.find(a => a.key === key);
  const isSelected = selectedTypes.has(key);
  const btn = document.getElementById(`amulti-${key}`);

  if (btn) {
    btn.style.background = isSelected ? t.bg : 'var(--background)';
    btn.style.border = `2px solid ${isSelected ? t.color : 'var(--border2)'}`;
  }

  const container = document.getElementById('action-configs-container');
  if (container) container.innerHTML = renderAllConfigs(getCurrentConfigs());
}

function renderAllConfigs(configs) {
  if (selectedTypes.size === 0) return '';
  return `
    <div style="border-top:1px solid var(--border);margin-top:16px;padding-top:16px;">
      ${[...selectedTypes].map(key => {
        const t = ACTION_TYPES.find(a => a.key === key);
        const cfg = configs[key] || {};
        return `
          <div style="border:1px solid ${t.color}44;border-radius:10px;padding:14px 16px;margin-bottom:12px;background:${t.bg};">
            <div style="font-size:13px;font-weight:700;color:${t.color};margin-bottom:12px;display:flex;align-items:center;gap:8px;">
              <span>${t.icon}</span> Konfigurasi ${t.label}
            </div>
            ${renderSingleConfig(key, cfg)}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSingleConfig(type, cfg) {
  if (type === 'audio') return `
    <div class="form-group" style="margin-bottom:10px;">
      <label>File Audio</label>
      <div class="upload-area" onclick="triggerUpload('audio')" id="audio-upload-area" style="padding:12px;">
        ${cfg.fileUrl
          ? `<div style="color:var(--green);">✅ ${cfg.fileUrl.split('/').pop()}</div>`
          : `<div style="font-size:20px;margin-bottom:4px;">🎵</div><div style="font-size:13px;">Klik upload audio (.mp3)</div>`
        }
        <input type="file" id="file-upload-audio" style="display:none;" accept="audio/*" onchange="handleFileUpload(this,'audio')"/>
      </div>
      <input type="hidden" id="action-audio-url" value="${cfg.fileUrl || ''}"/>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label>Volume (${Math.round((cfg.volume || 1) * 100)}%)</label>
      <input type="range" id="action-audio-volume" min="0" max="1" step="0.05" value="${cfg.volume || 1}"
        style="width:100%;accent-color:var(--cyan);" oninput="this.previousElementSibling.textContent='Volume ('+Math.round(this.value*100)+'%)'"/>
    </div>
  `;

  if (type === 'video') return `
    <div class="form-group" style="margin-bottom:10px;">
      <label>File Video</label>
      <div class="upload-area" onclick="triggerUpload('video')" id="video-upload-area" style="padding:12px;">
        ${cfg.fileUrl
          ? `<div style="color:var(--green);">✅ ${cfg.fileUrl.split('/').pop()}</div>`
          : `<div style="font-size:20px;margin-bottom:4px;">🎬</div><div style="font-size:13px;">Klik upload video (.mp4)</div>`
        }
        <input type="file" id="file-upload-video" style="display:none;" accept="video/*" onchange="handleFileUpload(this,'video')"/>
      </div>
      <input type="hidden" id="action-video-url" value="${cfg.fileUrl || ''}"/>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label>Atau URL Langsung</label>
      <input type="text" class="form-input" id="action-video-direct-url" placeholder="https://..." value="${cfg.directUrl || ''}"/>
    </div>
  `;

  if (type === 'webhook') return `
    <div class="form-group" style="margin-bottom:10px;">
      <label>URL Webhook</label>
      <input type="text" class="form-input" id="action-webhook-url" placeholder="https://..." value="${cfg.url || ''}"/>
    </div>
    <div class="form-row">
      <div class="form-group" style="margin-bottom:0;">
        <label>Method</label>
        <select class="form-select" id="action-webhook-method">
          <option ${cfg.method === 'POST' || !cfg.method ? 'selected' : ''}>POST</option>
          <option ${cfg.method === 'GET' ? 'selected' : ''}>GET</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Payload (opsional)</label>
        <input type="text" class="form-input" id="action-webhook-payload" placeholder='{"key":"value"}' value="${cfg.payload || ''}"/>
      </div>
    </div>
  `;

  if (type === 'pending') return `
    <div class="form-group" style="margin-bottom:0;">
      <label>⏳ Durasi Lock Antrian (detik)</label>
      <input type="number" class="form-input" id="action-pending-seconds" min="1" max="3600" value="${cfg.seconds || 8}" style="font-size:18px;font-weight:700;text-align:center;color:var(--yellow);"/>
      <div style="font-size:11.5px;color:var(--text3);margin-top:6px;">
        Antrian akan dikunci selama durasi ini sebelum trigger berikutnya dijalankan.
      </div>
    </div>
  `;

  return '';
}

function getCurrentConfigs() {
  const configs = {};
  if (selectedTypes.has('audio')) {
    configs.audio = {
      fileUrl: document.getElementById('action-audio-url')?.value || '',
      volume: parseFloat(document.getElementById('action-audio-volume')?.value || '1')
    };
  }
  if (selectedTypes.has('video')) {
    configs.video = {
      fileUrl: document.getElementById('action-video-url')?.value || '',
      directUrl: document.getElementById('action-video-direct-url')?.value || ''
    };
  }
  if (selectedTypes.has('webhook')) {
    configs.webhook = {
      url: document.getElementById('action-webhook-url')?.value || '',
      method: document.getElementById('action-webhook-method')?.value || 'POST',
      payload: document.getElementById('action-webhook-payload')?.value || ''
    };
  }
  if (selectedTypes.has('pending')) {
    configs.pending = {
      seconds: parseInt(document.getElementById('action-pending-seconds')?.value || '3')
    };
  }
  return configs;
}

// UPLOAD
function triggerUpload(type) {
  document.getElementById(`file-upload-${type}`)?.click();
}

async function handleFileUpload(input, type) {
  const file = input.files[0];
  if (!file) return;

  const area = document.getElementById(`${type}-upload-area`);
  if (area) area.innerHTML = `<div class="queue-spinner" style="margin:0 auto;"></div><div style="margin-top:8px;">Mengupload...</div>`;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    document.getElementById(`action-${type}-url`).value = data.url;
    if (area) area.innerHTML = `
      <div style="color:var(--green);">✅ ${file.name}</div>
      <code style="font-size:11px;color:var(--text3);">${data.url}</code>
      <input type="file" id="file-upload-${type}" style="display:none;" accept="${type}/*" onchange="handleFileUpload(this,'${type}')"/>
    `;
    showToast('Upload sukses', 'success');
  } catch (err) {
    showToast('Upload gagal', 'error');
  }
}

async function saveAction() {
  const name = document.getElementById('action-name')?.value?.trim();
  const screenId = document.getElementById('action-global-screen-id')?.value || '';
  if (!name) { showToast('Action name is required', 'warning'); return; }
  if (selectedTypes.size === 0) { showToast('Pilih minimal satu tipe action', 'warning'); return; }

  const configs = getCurrentConfigs();
  const types = [...selectedTypes];

  const body = { name, screenId, types, configs, enabled: true };

  try {
    if (editingActionId) {
      await apiFetch(`/api/actions/${editingActionId}`, { method: 'PUT', body });
    } else {
      await apiFetch('/api/actions', { method: 'POST', body });
    }
    closeModal();
    await loadActions();
    showToast('Action saved', 'success');
  } catch (err) {
    showToast('Gagal: ' + err.message, 'error');
  }
}

async function deleteAction(id) {
  const action = actionsData.find(a => a.id === id);
  confirmModal(`Hapus action <b>${action?.name || 'ini'}</b>?`, async () => {
    try {
      await apiFetch(`/api/actions/${id}`, { method: 'DELETE' });
      await loadActions();
      showToast('Action deleted', 'info');
    } catch {}
  }, { title: 'Hapus Action', icon: '⚡' });
}

async function toggleAction(id) {
  const action = actionsData.find(a => a.id === id);
  if (!action) return;
  try {
    const enabled = action.enabled === false ? true : false;
    await apiFetch(`/api/actions/${id}`, { method: 'PUT', body: { enabled } });
    action.enabled = enabled;
    document.getElementById(`action-toggle-${id}`)?.classList.toggle('on', enabled);
  } catch {}
}

async function testAction(id) {
  try {
    await apiFetch(`/api/actions/${id}/test`, { method: 'POST' });
  } catch (err) {
    showToast('Gagal test', 'error');
  }
}

// ============================================================
// EVENTS MANAGEMENT
// ============================================================
async function loadEvents() {
  try {
    eventsData = await apiFetch('/api/events');
    renderEventsList();
  } catch (err) {
    console.error('Failed to load events', err);
  }
}

function renderEventsList() {
  const list = document.getElementById('events-list');
  if (!list) return;

  if (eventsData.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <h3>Belum ada Event</h3>
        <p>Hubungkan pemicu ke action.</p>
        <button class="btn btn-primary" style="margin-top:14px;background:var(--cyan);border-color:var(--cyan);" onclick="openCreateEvent()">
          ${svgIcon(ICONS.plus)} Create new Event
        </button>
      </div>
    `;
    return;
  }

  list.innerHTML = eventsData.map(ev => {
    const trigCfg = EVENT_TRIGGERS.find(t => t.type === ev.trigger?.type) || EVENT_TRIGGERS[0];
    const action = actionsData.find(a => a.id === ev.actionId);

    let triggerDesc = trigCfg.label;
    let mainIconHtml = trigCfg.icon;
    
    if (ev.trigger?.type === 'gift' && ev.trigger?.giftId && ev.trigger?.giftId !== 'any') {
      const gift = TIKTOK_GIFTS.find(g => String(g.id) === String(ev.trigger.giftId));
      if (gift) {
        const iconHtml = gift.image ? `<img src="${gift.image}" style="width:16px;height:16px;vertical-align:middle;border-radius:2px;margin-right:4px;">` : gift.emoji + ' ';
        triggerDesc = `${iconHtml}${gift.name}`;
        
        if (gift.image) {
          mainIconHtml = `<img src="${gift.image}" style="width:28px;height:28px;object-fit:contain;">`;
        } else if (gift.emoji) {
          mainIconHtml = gift.emoji;
        }
      }
    }

    return `
      <div class="item-card" id="event-${ev.id}" style="padding: 10px 16px;">
        <div class="item-icon" style="background:${trigCfg.color}22;color:${trigCfg.color};font-size:20px;">
          ${mainIconHtml}
        </div>
        <div class="item-info" style="flex:1; display:flex; align-items:center; gap:16px;">
          <div style="width: 200px; display:flex; flex-direction:column; gap:4px;">
            <div class="item-name">${ev.name || 'Unnamed Event'}</div>
            <div style="font-size:12px;color:${trigCfg.color};font-weight:600;">${triggerDesc}</div>
          </div>
          
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
          
          <div style="flex:1;">
            ${action 
              ? `<div style="font-weight:600;font-size:13px;color:var(--text);">${action.name}</div>`
              : `<div style="font-weight:600;font-size:13px;color:var(--red);">Action Not Found</div>`
            }
          </div>
        </div>
        <div class="item-actions">
          <div class="toggle-wrap" onclick="toggleEvent('${ev.id}')" style="margin-right:8px;">
            <div class="toggle ${ev.enabled !== false ? 'on' : ''}" id="event-toggle-${ev.id}"></div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="openEditEvent('${ev.id}')" title="Edit">
            ${svgIcon(ICONS.edit, 14)}
          </button>
          <button class="btn btn-ghost btn-sm" onclick="deleteEvent('${ev.id}')" title="Hapus" style="color:var(--red);">
            ${svgIcon(ICONS.trash, 14)}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

let editingEventId = null;
let selectedTriggerType = 'gift';

function openCreateEvent() {
  editingEventId = null;
  selectedTriggerType = 'gift';
  selectedGiftId = 'any';
  giftFilterText = '';
  openEventModal({ name: '', trigger: { type: 'gift', giftId: 'any' }, actionId: '' });
}

function openEditEvent(id) {
  const ev = eventsData.find(e => e.id === id);
  if (!ev) return;
  editingEventId = id;
  selectedTriggerType = ev.trigger?.type || 'gift';
  selectedGiftId = ev.trigger?.giftId || 'any';
  giftFilterText = '';
  openEventModal(ev);
}

function openEventModal(ev) {
  const content = `
    <div class="form-group">
      <label>Event Name</label>
      <input type="text" class="form-input" id="event-name" placeholder="Name your event..." value="${ev.name || ''}"/>
    </div>

    <!-- TRIGGER SELECT -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;">
      <div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:12px;">Trigger (What causes this event)</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        ${EVENT_TRIGGERS.map(t => `
          <button class="badge ${selectedTriggerType === t.type ? '' : 'badge-gray'}"
                  style="${selectedTriggerType === t.type ? `background:${t.color}22;color:${t.color};border:1px solid ${t.color}44;` : ''}cursor:pointer;padding:8px 14px;border:1px solid var(--border2);"
                  onclick="selectTriggerType('${t.type}')" id="trigbtn-${t.type}">
            ${t.icon} ${t.label}
          </button>
        `).join('')}
      </div>
      <div id="trigger-config-container">
        ${renderTriggerConfig(selectedTriggerType, ev.trigger)}
      </div>
    </div>

    <!-- ACTION SELECT -->
    <div class="form-group">
      <label>Action to Run</label>
      <select class="form-select" id="event-action-id">
        <option value="">-- Select an Action --</option>
        ${actionsData.map(a => `<option value="${a.id}" ${ev.actionId === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
      </select>
      ${actionsData.length === 0 ? `<p style="font-size:12px;color:var(--yellow);margin-top:6px;">⚠️ Buat Action dulu di bagian atas</p>` : ''}
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" style="background:var(--cyan);border-color:var(--cyan);" onclick="saveEvent()">
      ${svgIcon(ICONS.check)} ${editingEventId ? 'Save Event' : 'Create Event'}
    </button>
  `;

  openModal(editingEventId ? 'Edit Event' : 'Create new Event', content, footer);
}

function selectTriggerType(type) {
  selectedTriggerType = type;
  EVENT_TRIGGERS.forEach(t => {
    const btn = document.getElementById(`trigbtn-${t.type}`);
    if (btn) {
      if (t.type === type) {
        btn.style.cssText = `background:${t.color}22;color:${t.color};border:1px solid ${t.color}44;cursor:pointer;padding:8px 14px;`;
        btn.className = 'badge';
      } else {
        btn.style.cssText = 'cursor:pointer;padding:8px 14px;border:1px solid var(--border2);';
        btn.className = 'badge badge-gray';
      }
    }
  });

  const container = document.getElementById('trigger-config-container');
  if (container) {
    container.innerHTML = renderTriggerConfig(type, { type, giftId: 'any' });
  }
}

function renderTriggerConfig(type, currentTrigger) {
  if (type === 'gift') {
    return renderGiftPicker(currentTrigger?.giftId || 'any');
  }
  if (type === 'comment') {
    return `
      <div class="form-group" style="margin-top:10px;">
        <label>Keyword Filter (optional)</label>
        <input type="text" class="form-input" id="trigger-keyword" placeholder="Contoh: !play (kosongkan untuk semua komentar)" value="${currentTrigger?.keyword || ''}"/>
      </div>
    `;
  }
  return `<div style="font-size:12px;color:var(--text3);margin-top:10px;">Pemicu ini tidak memerlukan konfigurasi tambahan.</div>`;
}

// Using shared renderGiftPicker, filterGifts, and selectGift from app.js

async function saveEvent() {
  const name = document.getElementById('event-name')?.value?.trim();
  const actionId = document.getElementById('event-action-id')?.value;

  if (!name) { showToast('Event name is required', 'warning'); return; }
  if (!actionId) { showToast('Action is required', 'warning'); return; }

  const trigger = { type: selectedTriggerType };
  if (selectedTriggerType === 'gift') {
    trigger.giftId = document.getElementById('gift-id-input')?.value || 'any';
  } else if (selectedTriggerType === 'comment') {
    trigger.keyword = document.getElementById('trigger-keyword')?.value || '';
  }

  const body = { name, trigger, actionId, enabled: true };

  try {
    if (editingEventId) {
      await apiFetch(`/api/events/${editingEventId}`, { method: 'PUT', body });
    } else {
      await apiFetch('/api/events', { method: 'POST', body });
    }
    closeModal();
    await loadEvents();
    showToast('Event saved', 'success');
  } catch (err) {
    showToast('Gagal: ' + err.message, 'error');
  }
}

async function deleteEvent(id) {
  const ev = eventsData.find(e => e.id === id);
  confirmModal(`Hapus event <b>${ev?.name || 'ini'}</b>?`, async () => {
    try {
      await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
      await loadEvents();
      showToast('Event deleted', 'info');
    } catch {}
  }, { title: 'Hapus Event', icon: '🎯' });
}

async function toggleEvent(id) {
  const ev = eventsData.find(e => e.id === id);
  if (!ev) return;
  try {
    const enabled = ev.enabled === false ? true : false;
    await apiFetch(`/api/events/${id}`, { method: 'PUT', body: { enabled } });
    ev.enabled = enabled;
    document.getElementById(`event-toggle-${id}`)?.classList.toggle('on', enabled);
  } catch {}
}
