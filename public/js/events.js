/* ============================================================
   TikFlow - Events Page (Trigger Events)
   ============================================================ */

// TIKTOK_GIFTS dipindahkan ke app.js agar bisa dipakai bersama

const EVENT_TRIGGERS = [
  { type: 'gift', label: 'Gift', icon: '🎁', color: 'var(--yellow)' },
  { type: 'follow', label: 'Follow', icon: '👤', color: 'var(--green)' },
  { type: 'like', label: 'Like', icon: '❤️', color: 'var(--red)' },
  { type: 'comment', label: 'Komentar', icon: '💬', color: 'var(--blue)' },
  { type: 'member', label: 'Join Room', icon: '🚀', color: 'var(--accent)' },
  { type: 'share', label: 'Share', icon: '📤', color: 'var(--cyan)' },
];

let eventsData = [];

async function renderEvents() {
  const page = document.getElementById('page-events');
  page.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Events</h1>
          <p class="page-subtitle">Atur trigger yang memicu action</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateEvent()">
          ${svgIcon(ICONS.plus)} Buat Event
        </button>
      </div>

      <!-- Trigger Types Legend -->
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
        ${EVENT_TRIGGERS.map(t => `
          <div class="badge" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}33;gap:6px;padding:5px 12px;">
            ${t.icon} ${t.label}
          </div>
        `).join('')}
      </div>

      <!-- Events List -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Daftar Events</span>
          <span class="badge badge-purple" id="events-count">0 events</span>
        </div>
        <div id="events-list" class="content-list">
          <div class="empty-state">
            <div class="empty-state-icon">⚡</div>
            <h3>Memuat events...</h3>
          </div>
        </div>
      </div>
    </div>
  `;
  await loadEvents();
}

async function loadEvents() {
  try {
    eventsData = await apiFetch('/api/events');
    renderEventsList();
  } catch (err) {
    showToast('Gagal memuat events', 'error');
  }
}

function renderEventsList() {
  const list = document.getElementById('events-list');
  const count = document.getElementById('events-count');
  if (!list) return;
  if (count) count.textContent = `${eventsData.length} event${eventsData.length !== 1 ? 's' : ''}`;

  if (eventsData.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <h3>Belum ada event trigger</h3>
        <p>Buat event untuk menghubungkan trigger dengan action</p>
      </div>
    `;
    return;
  }

  list.innerHTML = eventsData.map(ev => {
    const trigCfg = EVENT_TRIGGERS.find(t => t.type === ev.trigger?.type) || EVENT_TRIGGERS[0];
    const action = actionsData.find(a => a.id === ev.actionId);

    let triggerDesc = trigCfg.label;
    if (ev.trigger?.type === 'gift' && ev.trigger?.giftId && ev.trigger?.giftId !== 'any') {
      const gift = TIKTOK_GIFTS.find(g => String(g.id) === String(ev.trigger.giftId));
      if (gift) triggerDesc = `${gift.emoji} ${gift.name}`;
    }

    const typeConfigs = {
      audio: { icon: '🔊', color: 'var(--cyan)' },
      video: { icon: '🎬', color: 'var(--pink)' },
      webhook: { icon: '🌐', color: 'var(--blue)' },
      pending: { icon: '⏳', color: 'var(--yellow)' },
    };
    const actionCfg = typeConfigs[action?.type] || { icon: '⚡', color: 'var(--accent)' };

    return `
      <div class="item-card" id="event-${ev.id}">
        <div class="item-icon" style="background:${trigCfg.color}22;font-size:20px;">
          ${trigCfg.icon}
        </div>
        <div class="item-info" style="flex:1;">
          <div class="item-name">${ev.name || 'Unnamed Event'}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
            <span class="badge" style="background:${trigCfg.color}22;color:${trigCfg.color};">
              ${triggerDesc}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
            ${action
              ? `<span class="badge" style="background:${actionCfg.color}22;color:${actionCfg.color};">${actionCfg.icon} ${action.name}</span>`
              : `<span class="badge badge-red">Action tidak ditemukan</span>`
            }
          </div>
        </div>
        <div class="item-actions" style="align-items:center;gap:10px;">
          <div class="toggle-wrap" onclick="toggleEvent('${ev.id}')">
            <div class="toggle ${ev.enabled ? 'on' : ''}" id="ev-toggle-${ev.id}"></div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="openEditEvent('${ev.id}')">${svgIcon(ICONS.edit, 14)}</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteEvent('${ev.id}')" style="color:var(--red);">${svgIcon(ICONS.trash, 14)}</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// CREATE / EDIT EVENT MODAL
// ============================================================
let editingEventId = null;
let selectedEventTriggerType = 'gift';

function openCreateEvent() {
  editingEventId = null;
  selectedEventTriggerType = 'gift';
  selectedGiftId = 'any';
  giftFilterText = '';
  openEventModal({ name: '', trigger: { type: 'gift', giftId: 'any' }, actionId: '' });
}

function openEditEvent(id) {
  const ev = eventsData.find(e => e.id === id);
  if (!ev) return;
  editingEventId = id;
  selectedEventTriggerType = ev.trigger?.type || 'gift';
  selectedGiftId = ev.trigger?.giftId || 'any';
  giftFilterText = '';
  openEventModal(ev);
}

function openEventModal(ev) {
  const content = `
    <div class="form-group">
      <label>Nama Event</label>
      <input type="text" class="form-input" id="event-name" placeholder="Contoh: Gift Rose → Putar SFX" value="${ev.name || ''}"/>
    </div>

    <!-- Trigger Type -->
    <div class="form-group">
      <label>Trigger (Pemicu)</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        ${EVENT_TRIGGERS.map(t => `
          <button class="badge ${selectedEventTriggerType === t.type ? '' : 'badge-gray'}"
                  style="${selectedEventTriggerType === t.type ? `background:${t.color}22;color:${t.color};border:1px solid ${t.color}44;` : ''}cursor:pointer;padding:7px 14px;border:1px solid var(--border2);"
                  onclick="selectEventTrigger('${t.type}')" id="etrig-${t.type}">
            ${t.icon} ${t.label}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Gift Picker (shown only for gift trigger) -->
    <div id="gift-picker-container">
      ${selectedEventTriggerType === 'gift' ? renderGiftPicker(ev.trigger?.giftId || 'any') : ''}
    </div>

    <!-- Comment filter -->
    <div id="comment-filter-container" style="${selectedEventTriggerType === 'comment' ? '' : 'display:none;'}">
      <div class="form-group">
        <label>Filter Kata Kunci (opsional)</label>
        <input type="text" class="form-input" id="comment-keyword" placeholder="Kosongkan untuk semua komentar" value="${ev.trigger?.keyword || ''}"/>
      </div>
    </div>

    <!-- Action Select -->
    <div class="form-group">
      <label>Action yang Dijalankan</label>
      <select class="form-select" id="event-action-id">
        <option value="">-- Pilih Action --</option>
        ${actionsData.map(a => {
          const typeIcons = { audio: '🔊', video: '🎬', webhook: '🌐', pending: '⏳' };
          return `<option value="${a.id}" ${ev.actionId === a.id ? 'selected' : ''}>${typeIcons[a.type] || '⚡'} ${a.name}</option>`;
        }).join('')}
      </select>
      ${actionsData.length === 0 ? `<p style="font-size:12px;color:var(--yellow);margin-top:6px;">⚠️ Buat Action dulu sebelum membuat event</p>` : ''}
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="saveEvent()">
      ${svgIcon(ICONS.check)} ${editingEventId ? 'Simpan' : 'Buat Event'}
    </button>
  `;

  openModal(editingEventId ? 'Edit Event' : 'Buat Event Baru', content, footer);
}

function selectEventTrigger(type) {
  selectedEventTriggerType = type;

  // Update button styles
  EVENT_TRIGGERS.forEach(t => {
    const btn = document.getElementById(`etrig-${t.type}`);
    if (btn) {
      if (t.type === type) {
        btn.style.cssText = `background:${t.color}22;color:${t.color};border:1px solid ${t.color}44;cursor:pointer;padding:7px 14px;`;
        btn.className = 'badge';
      } else {
        btn.style.cssText = 'cursor:pointer;padding:7px 14px;border:1px solid var(--border2);';
        btn.className = 'badge badge-gray';
      }
    }
  });

  // Show/hide gift picker
  const giftContainer = document.getElementById('gift-picker-container');
  if (giftContainer) {
    if (type === 'gift') {
      giftFilterText = '';
      giftContainer.innerHTML = renderGiftPicker('any');
    } else {
      giftContainer.innerHTML = '';
    }
  }

  // Show/hide comment filter
  const commentContainer = document.getElementById('comment-filter-container');
  if (commentContainer) {
    commentContainer.style.display = type === 'comment' ? '' : 'none';
  }
}

async function saveEvent() {
  const name = document.getElementById('event-name')?.value?.trim();
  const actionId = document.getElementById('event-action-id')?.value;

  if (!name) { showToast('Nama event wajib diisi', 'warning'); return; }
  if (!actionId) { showToast('Pilih action yang akan dijalankan', 'warning'); return; }

  const trigger = { type: selectedEventTriggerType };
  if (selectedEventTriggerType === 'gift') {
    trigger.giftId = document.getElementById('gift-id-input')?.value || 'any';
  }
  if (selectedEventTriggerType === 'comment') {
    trigger.keyword = document.getElementById('comment-keyword')?.value || '';
  }

  const body = { name, trigger, actionId, enabled: true };

  try {
    if (editingEventId) {
      await apiFetch(`/api/events/${editingEventId}`, { method: 'PUT', body });
      showToast('Event diperbarui!', 'success');
    } else {
      await apiFetch('/api/events', { method: 'POST', body });
      showToast('Event berhasil dibuat!', 'success');
    }
    closeModal();
    await loadEvents();
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
  }
}

async function toggleEvent(id) {
  const ev = eventsData.find(e => e.id === id);
  if (!ev) return;
  try {
    await apiFetch(`/api/events/${id}`, { method: 'PUT', body: { enabled: !ev.enabled } });
    ev.enabled = !ev.enabled;
    const toggle = document.getElementById(`ev-toggle-${id}`);
    if (toggle) toggle.classList.toggle('on', ev.enabled);
  } catch {}
}

async function deleteEvent(id) {
  const ev = eventsData.find(e => e.id === id);
  confirmModal(
    `Hapus event <b>${ev?.name || 'ini'}</b>?`,
    async () => {
      try {
        await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
        showToast('Event dihapus', 'info');
        await loadEvents();
      } catch {}
    },
    { title: 'Hapus Event', confirmText: 'Ya, Hapus', icon: '🎯' }
  );
}
