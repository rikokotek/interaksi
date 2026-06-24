/* ============================================================
   TikFlow - Connect TikTok Page
   ============================================================ */

function renderConnect() {
  const page = document.getElementById('page-connect');
  const s = AppState.connectionState;

  page.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Connect TikTok</h1>
          <p class="page-subtitle">Hubungkan akun TikTok LIVE kamu</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px;">
        <!-- Connection Card -->
        <div class="card">
          <div class="connect-hero">
            <div class="connect-tiktok-icon">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.77 1.52V6.73a4.85 4.85 0 01-1-.04z" fill="white"/>
              </svg>
            </div>
            <h2 style="font-size:18px;font-weight:700;margin-bottom:6px;">TikTok Live Connector</h2>
            <p style="color:var(--text3);font-size:13px;">Auto-detect status LIVE & reconnect otomatis</p>
          </div>

          <!-- Status Banner -->
          <div id="connect-status-banner">
            ${renderConnectBanner(s)}
          </div>

          <!-- Locked Username -->
          <div class="form-group" style="margin-top:16px;">
            <label style="display:flex;align-items:center;gap:6px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Username TikTok (Terkunci)
            </label>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(168,85,247,0.07);border:1px solid rgba(168,85,247,0.25);border-radius:8px;">
              <span style="font-size:20px;">🎵</span>
              <div>
                <div style="font-weight:700;font-size:15px;color:var(--accent);">@roseanaa69</div>
                <div style="font-size:11.5px;color:var(--text3);margin-top:1px;">Auto-connect setiap kali server start</div>
              </div>
              <span class="badge badge-purple" style="margin-left:auto;">🔒 Locked</span>
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-top:4px;">
            ${!s.isLive && !s.connecting && !s.waitingForLive ? `
              <button class="btn btn-primary w-full" id="connect-btn" onclick="connectTikTok()">
                ${svgIcon(ICONS.link)} Coba Connect Sekarang
              </button>
            ` : s.connecting ? `
              <button class="btn btn-primary w-full" disabled>
                <span class="queue-spinner" style="width:14px;height:14px;"></span> Menghubungkan...
              </button>
            ` : `
              <button class="btn btn-danger w-full" onclick="disconnectTikTokPage()">
                ${svgIcon(ICONS.x)} Stop & Reset
              </button>
            `}
          </div>

          <!-- Demo Mode -->
          ${!s.isLive ? `
          <div style="margin-top:10px;">
            <button class="btn btn-secondary w-full" onclick="activateDemoMode()" style="border-color:rgba(168,85,247,0.3);color:var(--accent);">
              🎮 Test Demo Mode (tanpa perlu LIVE)
            </button>
          </div>
          ` : ''}

          <!-- Update Gifts Database -->
          <div style="margin-top:10px;">
            <button class="btn btn-secondary w-full" onclick="updateGiftsData()" id="btn-update-gifts">
              🔄 Update Data Gift TikTok
            </button>
            <div style="font-size:11.5px;color:var(--text3);margin-top:6px;text-align:center;">Mendownload daftar terbaru gift beserta harganya dari akun TikTok kamu.</div>
          </div>

          <!-- Auto-detect info -->
          <div style="margin-top:16px;padding:12px 14px;background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.15);border-radius:8px;">
            <div style="font-size:12.5px;color:var(--text3);display:flex;gap:8px;align-items:flex-start;">
              <span style="font-size:16px;flex-shrink:0;">💡</span>
              <div>
                <strong style="color:var(--text2);display:block;margin-bottom:3px;">Auto-detect aktif</strong>
                Sistem akan otomatis mendeteksi saat kamu mulai LIVE dan reconnect setiap 30 detik jika terputus.
              </div>
            </div>
          </div>
        </div>

        <!-- Event Log + Info -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <!-- Live Stats Quick View -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Statistik Live</span>
              <span class="badge ${s.isLive ? 'badge-green' : 'badge-gray'}">${s.isLive ? '🔴 LIVE' : 'Offline'}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              ${[
                { label: 'Viewers', id: 'cs-viewers', icon: '👁', val: AppState.stats.viewers || 0 },
                { label: 'Likes', id: 'cs-likes', icon: '❤️', val: AppState.stats.likes || 0 },
                { label: 'Gifts', id: 'cs-gifts', icon: '🎁', val: AppState.stats.gifts || 0 },
                { label: 'Follows', id: 'cs-follows', icon: '👤', val: AppState.stats.follows || 0 },
              ].map(st => `
                <div style="padding:12px;background:var(--surface);border-radius:8px;border:1px solid var(--border2);">
                  <div style="font-size:18px;margin-bottom:5px;">${st.icon}</div>
                  <div style="font-size:20px;font-weight:800;color:var(--text)" id="${st.id}">${(st.val).toLocaleString('id')}</div>
                  <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;">${st.label}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Event Log -->
          <div class="card" style="flex:1;">
            <div class="card-header">
              <span class="card-title">Event Log</span>
              <button class="btn btn-ghost btn-sm" onclick="clearConnectLog()">Clear</button>
            </div>
            <div id="connect-event-log" style="font-family:monospace;font-size:12px;color:var(--text3);display:flex;flex-direction:column;gap:4px;max-height:220px;overflow-y:auto;">
              ${s.isLive
                ? `<span style="color:var(--green);">[${new Date().toLocaleTimeString()}] ✅ Connected to @${s.username}</span>`
                : `<span style="color:var(--text3);">[system] Menunggu koneksi...</span>`
              }
            </div>
          </div>

          <!-- Webhook URLs -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Webhook URLs</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${[
                { name: 'Saweria', url: `${window.location.origin}/api/webhook/saweria`, color: 'var(--yellow)' },
                { name: 'Sociabuzz', url: `${window.location.origin}/api/webhook/sociabuzz`, color: 'var(--pink)' },
              ].map(w => `
                <div style="background:var(--surface);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;">
                  <div style="font-size:12px;font-weight:700;color:${w.color};margin-bottom:4px;">${w.name}</div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <code style="font-size:11px;color:var(--text3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${w.url}</code>
                    <button class="btn btn-ghost btn-sm" style="padding:4px 8px;" onclick="copyText('${w.url}')">
                      ${svgIcon(ICONS.copy, 13)}
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Listen for events
  socket.on('tiktok_event', appendConnectLog);
}

function renderConnectBanner(s) {
  if (s.isLive && s.demoMode) return `
    <div class="status-banner" style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.25);color:var(--accent);">
      <div class="pulse-ring"></div>
      <div><strong>🎮 Demo Mode Aktif</strong> — Events simulasi berjalan</div>
    </div>`;
  if (s.isLive) return `
    <div class="status-banner live">
      <div class="pulse-ring"></div>
      <div><strong>🔴 LIVE!</strong> Terhubung ke @${s.username}</div>
    </div>`;
  if (s.connecting) return `
    <div class="status-banner connecting">
      <div class="pulse-ring"></div>
      <div>Menghubungkan ke @${s.username || '...'}...</div>
    </div>`;
  if (s.waitingForLive) return `
    <div class="status-banner" style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);color:var(--cyan);">
      <div class="pulse-ring" style="background:var(--cyan);"></div>
      <div>
        <strong>⏳ Menunggu @${s.username} LIVE</strong>
        <div style="font-size:12px;opacity:0.8;margin-top:2px;">Auto-retry setiap 30 detik. Akan connect otomatis saat mulai LIVE.</div>
      </div>
    </div>`;
  if (s.connected) return `
    <div class="status-banner connected">
      <div class="pulse-ring"></div>
      <div>Connected — Menunggu stream LIVE...</div>
    </div>`;
  return `
    <div class="status-banner offline">
      <div class="pulse-ring" style="background:var(--text3);"></div>
      <div>Belum terhubung ke TikTok</div>
    </div>`;
}


function appendConnectLog(ev) {
  if (AppState.currentPage !== 'connect') return;
  const log = document.getElementById('connect-event-log');
  if (!log) return;
  const icons = { gift: '🎁', follow: '👤', like: '❤️', comment: '💬', member: '🚀' };
  const colors = { gift: 'var(--yellow)', follow: 'var(--green)', like: 'var(--red)', comment: 'var(--blue)', member: 'var(--accent)' };
  const line = document.createElement('span');
  line.style.color = colors[ev.type] || 'var(--text3)';
  let msg = '';
  if (ev.type === 'gift') msg = `${ev.giftName} ×${ev.repeatCount || 1}`;
  else if (ev.type === 'comment') msg = `"${(ev.message || '').substring(0, 40)}"`;
  else if (ev.type === 'like') msg = `+${ev.count} likes`;
  else msg = '';
  line.textContent = `[${new Date(ev.time).toLocaleTimeString()}] ${icons[ev.type] || '•'} @${ev.user} ${ev.type} ${msg}`;
  log.prepend(line);
  while (log.children.length > 80) log.removeChild(log.lastChild);
}

function clearConnectLog() {
  const log = document.getElementById('connect-event-log');
  if (log) log.innerHTML = '<span style="color:var(--text3);">[system] Log dibersihkan</span>';
}

async function connectTikTok() {
  const username = 'roseanaa69';

  const btn = document.getElementById('connect-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="queue-spinner" style="width:14px;height:14px;"></span> Menghubungkan...`;
  }

  try {
    await apiFetch('/api/tiktok/connect', { method: 'POST', body: { username } });
    showToast(`Mencoba connect ke @${username}...`, 'info');
  } catch (err) {
    showToast('Gagal connect: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = svgIcon(ICONS.link) + ' Coba Connect Sekarang'; }
  }
}


async function disconnectTikTokPage() {
  await apiFetch('/api/tiktok/disconnect', { method: 'POST', body: {} });
  showToast('Disconnected', 'info');
  renderConnect();
}

async function updateGiftsData() {
  const btn = document.getElementById('btn-update-gifts');
  const ogText = btn.innerHTML;
  btn.innerHTML = '<span class="queue-spinner" style="width:14px;height:14px;"></span> Mengambil data...';
  btn.disabled = true;

  try {
    const gifts = await apiFetch('/api/gifts/update', { method: 'POST' });
    if (gifts && gifts.length > 0) {
      TIKTOK_GIFTS = gifts;
    }
  } catch (err) {
    // Error is handled by apiFetch toast
  } finally {
    btn.innerHTML = ogText;
    btn.disabled = false;
  }
}

async function activateDemoMode() {
  await apiFetch('/api/tiktok/demo', { method: 'POST', body: {} });
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Disalin!', 'success'));
}

