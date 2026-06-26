/* ============================================================
   TikFlow - Dashboard Page
   ============================================================ */

function renderDashboard() {
  const page = document.getElementById('page-dashboard');
  page.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Statistik real-time TikTok LIVE kamu</p>
        </div>
        <div class="flex gap-2 items-center">
          <div id="dash-connection-badge"></div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card" style="--stat-color:var(--cyan);--stat-bg:rgba(6,182,212,0.12);cursor:pointer;" onclick="showStatDetails('viewers')" title="Klik untuk melihat detail">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div class="stat-value" id="stat-viewers">0</div>
          <div class="stat-label">Viewers</div>
        </div>

        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:rgba(239,68,68,0.12);cursor:pointer;" onclick="showStatDetails('likes')" title="Klik untuk melihat detail">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div class="stat-value" id="stat-likes">0</div>
          <div class="stat-label">Likes</div>
        </div>

        <div class="stat-card" style="--stat-color:var(--yellow);--stat-bg:rgba(245,158,11,0.12);cursor:pointer;" onclick="showStatDetails('gifts')" title="Klik untuk melihat detail">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div class="stat-value" id="stat-gifts">0</div>
          <div class="stat-label">Gifts</div>
        </div>

        <div class="stat-card" style="--stat-color:var(--blue);--stat-bg:rgba(59,130,246,0.12);cursor:pointer;" onclick="showStatDetails('comments')" title="Klik untuk melihat detail">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="stat-value" id="stat-comments">0</div>
          <div class="stat-label">Comments</div>
        </div>

        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:rgba(16,185,129,0.12);cursor:pointer;" onclick="showStatDetails('follows')" title="Klik untuk melihat detail">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <div class="stat-value" id="stat-follows">0</div>
          <div class="stat-label">Follows</div>
        </div>

        <div class="stat-card" style="--stat-color:var(--accent);--stat-bg:rgba(168,85,247,0.12);cursor:pointer;" onclick="showStatDetails('queue')" title="Klik untuk melihat detail">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div class="stat-value" id="stat-queue">${AppState.actionQueue}</div>
          <div class="stat-label">Action Queue</div>
        </div>
      </div>

      <!-- Bottom Grid -->
      <div class="grid-2">
        <!-- Live Events Feed -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Live Event Feed</span>
            <button class="btn btn-ghost btn-sm" onclick="clearEventFeed()">Clear</button>
          </div>
          <div class="events-feed" id="events-feed">
            ${window._eventFeedBuffer && window._eventFeedBuffer.length > 0
              ? window._eventFeedBuffer.slice(0,20).map(ev => createEventItem(ev).outerHTML || '').join('')
              : `<div class="empty-state">
                  <div class="empty-state-icon">📡</div>
                  <h3>Belum ada events</h3>
                  <p>Connect TikTok Live untuk melihat events real-time</p>
                </div>`
            }
          </div>
        </div>

        <!-- Quick Actions + Status -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <!-- Quick Stats -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Quick Info</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div class="flex justify-between items-center">
                <span style="color:var(--text3);font-size:13px;">Action Queue</span>
                <span class="badge badge-purple" id="dash-queue-badge">${AppState.actionQueue} items</span>
              </div>
              <div class="flex justify-between items-center">
                <span style="color:var(--text3);font-size:13px;">Subathon</span>
                <span id="dash-subathon-badge" class="badge badge-gray">-</span>
              </div>
              <div class="flex justify-between items-center">
                <span style="color:var(--text3);font-size:13px;">Active Screens</span>
                <span id="dash-screens-badge" class="badge badge-gray">-</span>
              </div>
            </div>
          </div>

          <!-- Top Gifters -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Recent Gifts</span>
            </div>
            <div id="recent-gifts-list" style="display:flex;flex-direction:column;gap:8px;">
              <div class="empty-state" style="padding:20px;">
                <div class="empty-state-icon" style="font-size:28px;">🎁</div>
                <p>Belum ada gift</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Update from state
  updateStatsUI(AppState.stats);
  updateDashboardStatus();
  loadDashboardExtras();
}

window.showStatDetails = function(type) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (!overlay || !content) return;

  let title = '';
  let events = [];
  
  if (type === 'viewers') {
    title = 'Data Viewers';
  } else if (type === 'likes') {
    title = 'Recent Likes';
    events = (window._eventFeedBuffer || []).filter(e => e.type === 'like');
  } else if (type === 'gifts') {
    title = 'Recent Gifts';
    events = (window._eventFeedBuffer || []).filter(e => e.type === 'gift');
  } else if (type === 'comments') {
    title = 'Recent Comments';
    events = (window._eventFeedBuffer || []).filter(e => e.type === 'comment');
  } else if (type === 'follows') {
    title = 'Recent Follows';
    events = (window._eventFeedBuffer || []).filter(e => e.type === 'follow');
  } else if (type === 'queue') {
    title = 'Action Queue';
  }

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border2); padding-bottom:12px;">
      <h2 style="font-size:18px; font-weight:bold; margin:0; color:var(--text);">${title}</h2>
      <button class="btn btn-ghost btn-sm" onclick="closeModal()" style="padding:4px 8px; font-size:16px;">✕</button>
    </div>
  `;

  if (type === 'viewers') {
    html += `<div style="padding:20px; text-align:center; color:var(--text3);">
      <div style="font-size:48px; margin-bottom:12px; color:var(--cyan);">👁</div>
      <p style="font-size:14px; line-height:1.5;">TikTok tidak memberikan daftar profil penonton secara individual demi privasi.<br>Sistem hanya dapat menerima <strong>total jumlah penonton</strong> secara <em>real-time</em>.</p>
    </div>`;
  } else if (type === 'queue') {
    html += `<div style="padding:20px; text-align:center; color:var(--text3);">
      <div style="font-size:48px; margin-bottom:12px; color:var(--accent);">⚡</div>
      <p style="font-size:14px;">Terdapat <strong>${AppState.actionQueue}</strong> aksi yang sedang antri untuk dieksekusi.</p>
      <button class="btn btn-primary" style="margin-top:16px;" onclick="closeModal(); navigateTo('actions')">Kelola Actions</button>
    </div>`;
  } else {
    if (events.length === 0) {
      html += `<div class="empty-state" style="margin:20px 0;">
        <div class="empty-state-icon" style="font-size:32px;">📭</div>
        <div style="font-size:14px;">Belum ada data event <strong>${type}</strong> terbaru.</div>
      </div>`;
    } else {
      html += `<div class="events-feed" style="max-height: 400px; overflow-y: auto; padding-right:8px; margin-top:10px;">`;
      // Kita manfaatkan createEventItem untuk render itemnya
      events.forEach(ev => {
        const el = createEventItem(ev);
        if (el) html += el.outerHTML;
      });
      html += `</div>`;
    }
  }

  content.innerHTML = html;
  overlay.classList.remove('hidden');
  // Just in case overlay uses 'visible' class in this UI (like in actions.js)
  overlay.classList.add('visible');
};

function updateDashboardStatus() {
  const badge = document.getElementById('dash-connection-badge');
  if (badge) {
    const s = AppState.connectionState;
    if (s.isLive) {
      badge.innerHTML = `<span class="badge badge-green" style="font-size:13px; padding:6px 12px;">🔴 LIVE - @${s.username}</span>`;
    } else if (s.connecting) {
      badge.innerHTML = `<span class="badge badge-yellow" style="font-size:13px; padding:6px 12px;">🟠 Menghubungkan ke @${s.username}...</span>`;
    } else if (s.connected) {
      badge.innerHTML = `<span class="badge badge-purple" style="font-size:13px; padding:6px 12px;">🟢 Connected - @${s.username}</span>`;
    } else {
      badge.innerHTML = `<span class="badge badge-gray" style="font-size:13px; padding:6px 12px;">⚪ Offline${s.username ? ` - @${s.username}` : ''}</span>`;
    }
  }
}

async function loadDashboardExtras() {
  try {
    const [screens, subathon] = await Promise.all([
      apiFetch('/api/screens'),
      apiFetch('/api/subathon')
    ]);

    const screenBadge = document.getElementById('dash-screens-badge');
    if (screenBadge) {
      const active = screens.filter(s => s.enabled).length;
      screenBadge.textContent = `${active}/${screens.length}`;
      screenBadge.className = `badge ${active > 0 ? 'badge-green' : 'badge-gray'}`;
    }

    const subBadge = document.getElementById('dash-subathon-badge');
    if (subBadge && subathon) {
      if (subathon.enabled && !subathon.paused) {
        subBadge.textContent = `Running - ${formatTime(subathon.timeSeconds)}`;
        subBadge.className = 'badge badge-green';
      } else if (subathon.enabled && subathon.paused) {
        subBadge.textContent = `Paused - ${formatTime(subathon.timeSeconds)}`;
        subBadge.className = 'badge badge-yellow';
      } else {
        subBadge.textContent = 'Off';
        subBadge.className = 'badge badge-gray';
      }
    }
  } catch {}
}

function clearEventFeed() {
  window._eventFeedBuffer = [];
  const feed = document.getElementById('events-feed');
  if (feed) feed.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📡</div>
      <h3>Feed dibersihkan</h3>
    </div>
  `;
}

socket.on('tiktok_event', (ev) => {
  if (ev.type === 'gift') {
    const list = document.getElementById('recent-gifts-list');
    if (list) {
      const existing = list.querySelector('.empty-state');
      if (existing) existing.remove();

      const item = document.createElement('div');
      item.className = 'flex items-center gap-2 fade-in';
      item.style.cssText = 'padding:8px;background:rgba(245,158,11,0.07);border-radius:8px;border:1px solid rgba(245,158,11,0.15);';
      item.innerHTML = `
        <span style="font-size:20px;">🎁</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;">@${ev.user}</div>
          <div style="font-size:12px;color:var(--text3);">${ev.giftName} ×${ev.repeatCount || 1}</div>
        </div>
        <div style="font-size:12px;color:var(--yellow);font-weight:600;">💎${ev.diamondCount}</div>
      `;
      list.prepend(item);
      while (list.children.length > 8) list.removeChild(list.lastChild);
    }
  }
  // Update queue badge
  const queueEl = document.getElementById('stat-queue');
  if (queueEl) queueEl.textContent = AppState.actionQueue;
  const queueBadge = document.getElementById('dash-queue-badge');
  if (queueBadge) queueBadge.textContent = `${AppState.actionQueue} items`;
});

async function disconnectTikTok() {
  await apiFetch('/api/tiktok/disconnect', { method: 'POST', body: {} });
  showToast('Disconnected dari TikTok', 'info');
}
