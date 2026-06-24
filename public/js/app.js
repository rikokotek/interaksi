/* ============================================================
   TikFlow - App Core (Router, Socket, Toast, Modal)
   ============================================================ */

const socket = io();

// ============================================================
// GLOBAL STATE
// ============================================================
const AppState = {
  currentPage: 'dashboard',
  connectionState: { connected: false, isLive: false, connecting: false, username: '' },
  stats: {},
  actionQueue: 0,
  subathon: null,
};

// ============================================================
// GLOBAL CONSTANTS
// ============================================================
let TIKTOK_GIFTS = [];

async function loadTikTokGifts() {
  try {
    TIKTOK_GIFTS = await apiFetch('/api/gifts');
  } catch (e) {
    console.error("Gagal memuat gifts:", e);
  }
}

// ============================================================
// SHARED GIFT PICKER
// ============================================================
let selectedGiftId = 'any';
let giftFilterText = '';

function renderGiftPicker(currentGiftId = 'any', allowAny = true) {
  selectedGiftId = currentGiftId;
  const filtered = TIKTOK_GIFTS.filter(g =>
    g.name.toLowerCase().includes(giftFilterText.toLowerCase())
  );

  return `
    <div class="form-group">
      <label>Pilih Gift</label>

      <!-- Any Gift Option -->
      ${allowAny ? `
      <div style="margin-bottom:8px;">
        <div class="gift-item ${selectedGiftId === 'any' ? 'selected' : ''}"
             style="flex-direction:row;padding:10px 14px;width:100%;justify-content:flex-start;gap:10px;"
             onclick="selectGift('any')">
          <span style="font-size:20px;">🎁</span>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text);">Semua Gift</div>
            <div style="font-size:11px;color:var(--text3);">Dipicu oleh gift apapun</div>
          </div>
          ${selectedGiftId === 'any' ? '<span style="margin-left:auto;color:var(--accent);">✓</span>' : ''}
        </div>
      </div>
      ` : ''}

      <!-- Search -->
      <div class="gift-search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" class="form-input" id="gift-search" placeholder="Cari gift..."
          oninput="filterGifts(this.value)"/>
      </div>

      <!-- Gift Grid -->
      <div class="gift-grid" id="gift-grid">
        ${filtered.map(g => `
          <div class="gift-item ${String(selectedGiftId) === String(g.id) ? 'selected' : ''}"
               onclick="selectGift('${g.id}')" id="gift-${g.id}" title="${g.name} (💎${g.diamonds})">
            ${g.image ? `<img src="${g.image}" style="width:32px;height:32px;object-fit:contain;margin-bottom:4px;border-radius:4px;" />` : `<span class="gift-emoji">${g.emoji}</span>`}
            <span class="gift-name" style="text-align:center;">${g.name}</span>
            <span class="gift-diamonds">💎${g.diamonds}</span>
          </div>
        `).join('')}
      </div>

      <!-- Selected badge -->
      <div id="gift-selected-badge" style="margin-top:8px;">
        ${renderSelectedGiftBadge(currentGiftId)}
      </div>
    </div>
    <input type="hidden" id="gift-id-input" value="${currentGiftId}"/>
  `;
}

function filterGifts(text) {
  giftFilterText = text;
  const grid = document.getElementById('gift-grid');
  if (!grid) return;
  const filtered = TIKTOK_GIFTS.filter(g => g.name.toLowerCase().includes(text.toLowerCase()));
  grid.innerHTML = filtered.map(g => `
    <div class="gift-item ${String(selectedGiftId) === String(g.id) ? 'selected' : ''}"
         onclick="selectGift('${g.id}')" id="gift-${g.id}" title="${g.name} (💎${g.diamonds})">
      ${g.image ? `<img src="${g.image}" style="width:32px;height:32px;object-fit:contain;margin-bottom:4px;border-radius:4px;" />` : `<span class="gift-emoji">${g.emoji}</span>`}
      <span class="gift-name" style="text-align:center;">${g.name}</span>
      <span class="gift-diamonds">💎${g.diamonds}</span>
    </div>
  `).join('');
}

function selectGift(id) {
  selectedGiftId = id;
  document.querySelectorAll('.gift-item').forEach(el => el.classList.remove('selected'));
  const el = document.getElementById(`gift-${id}`);
  if (el) el.classList.add('selected');
  const input = document.getElementById('gift-id-input');
  if (input) input.value = id;
  const badge = document.getElementById('gift-selected-badge');
  if (badge) badge.innerHTML = renderSelectedGiftBadge(id);
}

function renderSelectedGiftBadge(id) {
  if (id === 'any' || !id) return `<div class="selected-gift-badge">🎁 Dipicu oleh semua gift</div>`;
  const gift = TIKTOK_GIFTS.find(g => String(g.id) === String(id));
  if (!gift) return '';
  const iconHtml = gift.image ? `<img src="${gift.image}" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;border-radius:2px;" />` : gift.emoji;
  return `<div class="selected-gift-badge">${iconHtml} Dipilih: <strong>${gift.name}</strong> (💎${gift.diamonds})</div>`;
}

// ============================================================
// ROUTER
// ============================================================
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.getElementById(`nav-${page}`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  AppState.currentPage = page;
  window.location.hash = page;

  // Render page
  if (page === 'dashboard') renderDashboard();
  else if (page === 'connect') renderConnect();
  else if (page === 'actions') renderActions();
  else if (page === 'subathon') renderSubathon();
  else if (page === 'gallery') renderGallery();
  else if (page === 'donations') renderDonations();
  else if (page === 'top-donate') renderTopDonate();
}

// Nav click + initial route — wait for ALL scripts to load first
window.addEventListener('load', async () => {
  await loadTikTokGifts();
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigate(item.dataset.page);
    });
  });

  // Hash routing
  const initialPage = window.location.hash.replace('#', '') || 'dashboard';
  navigate(initialPage);
});

// ============================================================
// SOCKET EVENTS
// ============================================================
socket.on('connection_state', (state) => {
  AppState.connectionState = state;
  updateConnectionUI(state);
});

socket.on('stats_update', (stats) => {
  AppState.stats = stats;
  updateStatsUI(stats);
});

socket.on('tiktok_event', (ev) => {
  addEventToFeed(ev);
});

socket.on('recent_events', (events) => {
  if (window._eventFeedBuffer) {
    window._eventFeedBuffer = [...events, ...window._eventFeedBuffer];
  }
});

socket.on('subathon_update', (sub) => {
  AppState.subathon = sub;
  if (AppState.currentPage === 'subathon') updateSubathonUI(sub);
});

socket.on('subathon_tick', ({ timeSeconds }) => {
  if (AppState.subathon) AppState.subathon.timeSeconds = timeSeconds;
  const timerEl = document.getElementById('subathon-timer-display');
  if (timerEl) timerEl.textContent = formatTime(timeSeconds);
});

socket.on('queue_update', ({ queue, current }) => {
  AppState.actionQueue = queue;
  updateQueueIndicator(queue, current);
});

socket.on('queue_size', (size) => {
  AppState.actionQueue = size;
  updateQueueIndicator(size);
});

// Queue lock countdown (Pending Time sedang berjalan)
let _queueLockTimer = null;
socket.on('queue_lock', (data) => {
  if (!data) {
    // Lock selesai
    if (_queueLockTimer) { clearInterval(_queueLockTimer); _queueLockTimer = null; }
    updateQueueIndicator(AppState.actionQueue);
    return;
  }
  let remaining = data.seconds;
  if (_queueLockTimer) clearInterval(_queueLockTimer);
  _queueLockTimer = setInterval(() => {
    remaining--;
    const qi = document.getElementById('qi-action');
    const qiLock = document.getElementById('qi-lock');
    if (qi) qi.textContent = `🔒 ${data.actionName}`;
    if (qiLock) {
      qiLock.textContent = `⏳ ${remaining}s`;
      qiLock.style.color = remaining <= 3 ? 'var(--red)' : 'var(--yellow)';
    }
    if (remaining <= 0) { clearInterval(_queueLockTimer); _queueLockTimer = null; }
  }, 1000);
  // Show immediately
  if (!queueIndicator) {
    queueIndicator = document.createElement('div');
    queueIndicator.className = 'queue-indicator';
    document.body.appendChild(queueIndicator);
  }
  queueIndicator.innerHTML = `
    <div class="queue-spinner"></div>
    <div style="flex:1;">
      <div style="font-size:12.5px;font-weight:700;color:var(--text)" id="qi-action">🔒 ${data.actionName}</div>
      <div style="font-size:11.5px;color:var(--text3)">Queue: ${AppState.actionQueue}</div>
    </div>
    <div id="qi-lock" style="font-size:16px;font-weight:800;color:var(--yellow);min-width:36px;text-align:right;">⏳ ${remaining}s</div>
  `;
  queueIndicator.classList.add('visible');
});


socket.on('play_audio', ({ url, volume }) => {
  const audio = new Audio(url);
  audio.volume = volume || 1;
  audio.play().catch(() => {});
});

socket.on('event_triggered', ({ event, trigger }) => {
  showToast(`🎯 Triggered: ${event.name || event.trigger?.type}`, 'info');
});

socket.on('donation', (data) => {
  showToast(`💰 ${data.platform}: ${data.supporter_name || data.from} - Rp${(data.amount || 0).toLocaleString('id')}`, 'success');
});

socket.on('toast', ({ type, message }) => {
  showToast(message, type);
});

// ============================================================
// CONNECTION UI
// ============================================================
function updateConnectionUI(state) {
  const dot = document.getElementById('nav-live-dot');
  const badge = document.getElementById('sidebar-live-badge');
  const statusText = document.getElementById('sidebar-status-text');

  if (dot) dot.classList.toggle('visible', state.isLive);

  if (badge) {
    badge.className = 'live-indicator';
    if (state.isLive) {
      badge.classList.add('live');
      if (statusText) statusText.textContent = 'LIVE';
    } else if (state.connecting) {
      if (statusText) statusText.textContent = 'Connecting...';
    } else if (state.connected) {
      if (statusText) statusText.textContent = 'Connected';
    } else {
      if (statusText) statusText.textContent = 'Offline';
    }
  }

  if (AppState.currentPage === 'connect') renderConnect();
}

function updateStatsUI(stats) {
  const viewers = document.getElementById('stat-viewers');
  const likes = document.getElementById('stat-likes');
  const gifts = document.getElementById('stat-gifts');
  const comments = document.getElementById('stat-comments');
  const follows = document.getElementById('stat-follows');

  if (viewers) animateNumber(viewers, stats.viewers || 0);
  if (likes) animateNumber(likes, stats.likes || 0);
  if (gifts) animateNumber(gifts, stats.gifts || 0);
  if (comments) animateNumber(comments, stats.comments || 0);
  if (follows) animateNumber(follows, stats.follows || 0);

  const viewerCount = document.getElementById('viewer-count-text');
  if (viewerCount) viewerCount.textContent = (stats.viewers || 0).toLocaleString('id');
}

// ============================================================
// EVENTS FEED
// ============================================================
window._eventFeedBuffer = [];

function addEventToFeed(ev) {
  const allowedTypes = ['comment', 'saweria', 'sociabuzz'];
  if (!allowedTypes.includes(ev.type)) return;

  window._eventFeedBuffer.unshift(ev);
  if (window._eventFeedBuffer.length > 100) window._eventFeedBuffer.pop();

  const feed = document.getElementById('events-feed');
  if (!feed) return;

  const item = createEventItem(ev);
  feed.appendChild(item);

  // Keep max 50 items
  while (feed.children.length > 50) feed.removeChild(feed.firstChild);
  
  feed.scrollTop = feed.scrollHeight;
}

function createEventItem(ev) {
  const icons = { gift: '🎁', follow: '👤', like: '❤️', comment: '💬', member: '🚀', share: '📤', saweria: '💛', sociabuzz: '💗' };
  const colors = { gift: '#f59e0b', follow: '#10b981', like: '#ef4444', comment: '#3b82f6', member: '#a855f7', share: '#06b6d4', saweria: '#f59e0b', sociabuzz: '#3ecf8e' };
  const color = colors[ev.type] || '#64748b';
  const timeStr = new Date(ev.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Platform logo icon untuk Saweria dan Sociabuzz
  let iconHTML = '';
  if (ev.type === 'saweria') {
    iconHTML = `<img src="/uploads/saweria_logo.png" style="width:20px;height:20px;object-fit:contain;" onerror="this.outerHTML='🦉'">`;
  } else if (ev.type === 'sociabuzz') {
    iconHTML = `<svg width="20" height="20" viewBox="0 0 100 100"><path d="M72 22 C72 22 38 18 28 36 C20 50 48 52 52 52" stroke="#3ecf8e" stroke-width="16" stroke-linecap="round" fill="none"/><path d="M52 52 C52 52 72 54 68 70 C62 85 30 82 22 80" stroke="#22c55e" stroke-width="16" stroke-linecap="round" fill="none"/></svg>`;
  } else {
    iconHTML = `<span>${icons[ev.type] || '📌'}</span>`;
  }

  let msg = '';
  if (ev.type === 'gift') msg = `${ev.giftName} ×${ev.repeatCount || 1} (💎${ev.diamondCount || 0})`;
  else if (ev.type === 'comment') msg = ev.message;
  else if (ev.type === 'like') msg = `+${ev.count || 1} likes`;
  else if (ev.type === 'follow') msg = 'Followed!';
  else if (ev.type === 'member') msg = 'Joined the room';
  else if (ev.type === 'saweria' || ev.type === 'sociabuzz') msg = `Rp${parseInt(ev.amount || 0).toLocaleString('id')} - ${ev.message || 'Tanpa pesan'}`;

  const div = document.createElement('div');
  div.className = 'event-item fade-in';
  div.innerHTML = `
    <div class="event-icon" style="background:${color}22;">
      ${iconHTML}
    </div>
    <div style="flex:1;min-width:0;">
      <div class="event-user">@${ev.user || 'unknown'}</div>
      <div class="event-msg">${msg}</div>
    </div>
    <div class="event-time">${timeStr}</div>
  `;
  return div;
}

// ============================================================
// QUEUE INDICATOR
// ============================================================
let queueIndicator = null;

function updateQueueIndicator(count, current) {
  if (!queueIndicator) {
    queueIndicator = document.createElement('div');
    queueIndicator.className = 'queue-indicator';
    queueIndicator.innerHTML = `
      <div class="queue-spinner"></div>
      <div>
        <div style="font-size:12.5px;font-weight:700;color:var(--text)" id="qi-action">Processing...</div>
        <div style="font-size:11.5px;color:var(--text3)" id="qi-queue">Queue: 0</div>
      </div>
    `;
    document.body.appendChild(queueIndicator);
  }

  if (count > 0 || current) {
    queueIndicator.classList.add('visible');
    const qiAction = document.getElementById('qi-action');
    const qiQueue = document.getElementById('qi-queue');
    if (current && qiAction) qiAction.textContent = current.action?.name || 'Running action...';
    if (qiQueue) qiQueue.textContent = `Queue: ${count}`;
  } else {
    queueIndicator.classList.remove('visible');
  }
}

// ============================================================
// CONFIRM MODAL (pengganti confirm() native yang sering diblokir browser)
// ============================================================
function confirmModal(message, onConfirm, options = {}) {
  const title = options.title || 'Konfirmasi';
  const confirmText = options.confirmText || 'Ya, Hapus';
  const cancelText = options.cancelText || 'Batal';
  const danger = options.danger !== false;

  const content = `
    <div style="text-align:center;padding:10px 0 6px;">
      <div style="font-size:40px;margin-bottom:14px;">${options.icon || '🗑️'}</div>
      <p style="color:var(--text2);font-size:14.5px;line-height:1.6;">${message}</p>
    </div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">${cancelText}</button>
    <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" onclick="closeModal();(window._confirmCb||function(){})()">
      ${confirmText}
    </button>
  `;

  window._confirmCb = onConfirm;
  openModal(title, content, footer);
}

// ============================================================
// MODAL
// ============================================================
function openModal(title, content, footer = '') {

  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-content');

  container.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${title}</h2>
      <button class="modal-close" onclick="closeModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="modal-body">${content}</div>
    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
  `;

  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('visible');
  setTimeout(() => overlay.classList.add('hidden'), 200);
}

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// UTILITIES
// ============================================================
function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}

function animateNumber(el, target) {
  const current = parseInt(el.textContent.replace(/\D/g, '')) || 0;
  if (current === target) return;
  const step = (target - current) / 15;
  let val = current;
  const timer = setInterval(() => {
    val += step;
    if ((step > 0 && val >= target) || (step < 0 && val <= target)) {
      val = target;
      clearInterval(timer);
    }
    el.textContent = Math.round(val).toLocaleString('id');
  }, 30);
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
  return `${Math.floor(sec/3600)}h ago`;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function svgIcon(path, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${path}</svg>`;
}

const ICONS = {
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
};
