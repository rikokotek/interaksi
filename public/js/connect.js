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

      <div style="max-width:500px; margin-top: 20px;">
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

          <!-- Username Input -->
          <div class="form-group" style="margin-top:16px;">
            <label style="display:flex;align-items:center;gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Username TikTok
            </label>
            <input type="text" id="tiktok-username-input" class="form-control" placeholder="Contoh: roseanaa69" value="${s.username || ''}" />
          </div>

          <div style="display:flex;gap:10px;margin-top:4px;">
            <button class="btn btn-primary w-full" id="connect-btn" onclick="connectTikTok()" ${s.connecting ? 'disabled' : ''}>
              ${s.connecting ? `<span class="queue-spinner" style="width:14px;height:14px;"></span> Menghubungkan...` : `${svgIcon(ICONS.link)} Simpan & Pantau LIVE`}
            </button>
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

        </div>
      </div>
    </div>
  `;

  // Listen for events
  socket.on('tiktok_event', appendConnectLog);
}

function renderConnectBanner(s) {
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
  log.appendChild(line);
  while (log.children.length > 80) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

function clearConnectLog() {
  const log = document.getElementById('connect-event-log');
  if (log) log.innerHTML = '<span style="color:var(--text3);">[system] Log dibersihkan</span>';
}

async function connectTikTok() {
  const usernameInput = document.getElementById('tiktok-username-input');
  const username = usernameInput ? usernameInput.value.trim() : '';

  if (!username) {
    showToast('Username TikTok tidak boleh kosong', 'error');
    return;
  }

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
