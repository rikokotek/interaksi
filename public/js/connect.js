/* ============================================================
   TikFlow - Connect TikTok Page
   ============================================================ */

function renderConnect() {
  const page = document.getElementById('page-connect');
  const s = AppState.connectionState || {};

  page.innerHTML = `
    <div class="fade-in">
      <div class="page-header" style="margin-bottom: 24px;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:flex-end;">
          <div>
            <h1 class="page-title">Connect Platform</h1>
            <p class="page-subtitle">Hubungkan akun TikTok atau YouTube LIVE kamu</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="disconnectTikTokPage()">Disconnect TikTok</button>
            <button class="btn btn-secondary btn-sm" onclick="disconnectYoutubePage()">Disconnect YT</button>
          </div>
        </div>
      </div>

      <div class="grid-2">
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

        <!-- YouTube Card -->
        <div class="card">
          <div class="connect-hero" style="background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(220,38,38,0.05) 100%); border-color: rgba(239,68,68,0.2);">
            <div class="connect-tiktok-icon" style="background: var(--red); box-shadow: 0 8px 16px rgba(239,68,68,0.3);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/>
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white"/>
              </svg>
            </div>
            <h2 style="font-size:18px;font-weight:700;margin-bottom:6px;">YouTube Live Connector</h2>
            <p style="color:var(--text3);font-size:13px;">Baca chat & superchat otomatis tanpa API Key</p>
          </div>

          <div id="yt-connect-status-banner">
            ${renderYtConnectBanner(AppState.ytConnectionState || {})}
          </div>

          <div class="form-group" style="margin-top:16px;">
            <label style="display:flex;align-items:center;gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2.5"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
              YouTube URL / @Username / ID
            </label>
            <input type="text" id="yt-channel-input" class="form-control" placeholder="Contoh: URL Live, @handle, atau UCxxx" value="${AppState.ytConnectionState?.channelId || ''}" />
          </div>

          <div class="form-group" style="margin-top:-10px;">
            <label class="checkbox-label" style="font-weight:normal; font-size:13px;">
              <input type="checkbox" id="yt-is-live-id" class="checkbox-input" />
              <span class="checkbox-custom"></span>
              Input di atas adalah Video ID / Live ID
            </label>
          </div>

          <div style="display:flex;gap:10px;margin-top:14px;">
            <button class="btn btn-primary w-full" style="background:var(--red);" id="yt-connect-btn" onclick="connectYoutube()" ${(AppState.ytConnectionState?.connecting) ? 'disabled' : ''}>
              ${(AppState.ytConnectionState?.connecting) ? `<span class="queue-spinner" style="width:14px;height:14px;"></span> Menghubungkan...` : `${svgIcon(ICONS.link)} Connect YouTube`}
            </button>
          </div>
          
          <div style="margin-top:16px;padding:12px 14px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:8px;">
            <div style="font-size:12.5px;color:var(--text3);display:flex;gap:8px;align-items:flex-start;">
              <span style="font-size:16px;flex-shrink:0;">⚠️</span>
              <div>
                <strong style="color:var(--text2);display:block;margin-bottom:3px;">Cara Mudah Connect YouTube</strong>
                Anda bebas memasukkan <strong>URL Channel, URL Live stream, @username,</strong> atau cukup Channel ID (UC...). Kami akan otomatis mendeteksinya!
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Event Log -->
      <div class="card" style="margin-top:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Live Event Log
          </h2>
          <button class="btn btn-secondary btn-sm" onclick="clearConnectLog()">Bersihkan</button>
        </div>
        <div id="connect-event-log" class="event-log-container">
          <span style="color:var(--text3);">[system] Menunggu event live stream...</span>
        </div>
      </div>
    </div>
  `;

  // Listen for events
  socket.on('tiktok_event', appendConnectLog);
  socket.on('youtube_event', appendConnectLog);
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
  else if (ev.type === 'superchat') msg = `SuperChat ${ev.amount}: "${(ev.message || '').substring(0, 40)}"`;
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


function renderYtConnectBanner(s) {
  if (s.waitingForLive) return `
    <div class="status-banner" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:var(--red);">
      <div class="pulse-ring" style="background:var(--red);"></div>
      <div>
        <strong>⏳ Menunggu LIVE (${s.channelId || 'YouTube'})</strong>
        <div style="font-size:12px;opacity:0.8;margin-top:2px;">Akun valid. Sistem akan terhubung otomatis saat stream dimulai.</div>
      </div>
    </div>`;
  if (s.isLive) return `
    <div class="status-banner live" style="background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.3); color:var(--red);">
      <div class="pulse-ring" style="background:var(--red);"></div>
      <div><strong>▶️ LIVE!</strong> Terhubung ke YouTube (${s.channelId})</div>
    </div>`;
  if (s.connecting) return `
    <div class="status-banner connecting" style="background:rgba(234,179,8,0.1); border-color:rgba(234,179,8,0.3); color:var(--yellow);">
      <div class="pulse-ring" style="background:var(--yellow);"></div>
      <div>Menghubungkan ke YouTube...</div>
    </div>`;
  if (s.error) return `
    <div class="status-banner" style="background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.3); color:var(--red);">
      <div><strong>⚠️ Gagal</strong> ${s.error}</div>
    </div>`;
  if (s.connected) return `
    <div class="status-banner connected">
      <div class="pulse-ring"></div>
      <div>Connected ⏳ Menunggu stream LIVE...</div>
    </div>`;
  return `
    <div class="status-banner offline">
      <div class="pulse-ring" style="background:var(--text3);"></div>
      <div>Belum terhubung ke YouTube</div>
    </div>`;
}


async function connectYoutube() {
  const channelInput = document.getElementById('yt-channel-input');
  const isLiveId = document.getElementById('yt-is-live-id')?.checked;
  const channelId = channelInput ? channelInput.value.trim() : '';

  if (!channelId) {
    showToast('Channel ID / Live ID tidak boleh kosong', 'error');
    return;
  }

  const btn = document.getElementById('yt-connect-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="queue-spinner" style="width:14px;height:14px;"></span> Menghubungkan...`;
  }

  try {
    await apiFetch('/api/youtube/connect', { method: 'POST', body: { channelId, isLiveId } });
  } catch (err) {
    showToast('Gagal connect: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = svgIcon(ICONS.link) + ' Connect YouTube'; }
  }
}

async function disconnectYoutubePage() {
  await apiFetch('/api/youtube/disconnect', { method: 'POST', body: {} });
  showToast('YouTube Disconnected', 'info');
  renderConnect();
}


function updateConnectPageUI() {
  if (AppState.currentPage !== 'connect') return;
  const tkBanner = document.getElementById('connect-status-banner');
  if (tkBanner) tkBanner.innerHTML = renderConnectBanner(AppState.connectionState || {});
  
  const tkBtn = document.getElementById('connect-btn');
  if (tkBtn) {
    const s = AppState.connectionState || {};
    tkBtn.disabled = s.connecting;
    tkBtn.innerHTML = s.connecting ? `<span class="queue-spinner" style="width:14px;height:14px;"></span> Menghubungkan...` : `${svgIcon(ICONS.link)} Simpan & Pantau LIVE`;
  }
  
  const ytBanner = document.getElementById('yt-connect-status-banner');
  if (ytBanner) ytBanner.innerHTML = renderYtConnectBanner(AppState.ytConnectionState || {});
  
  const ytBtn = document.getElementById('yt-connect-btn');
  if (ytBtn) {
    const ys = AppState.ytConnectionState || {};
    ytBtn.disabled = ys.connecting;
    ytBtn.innerHTML = ys.connecting ? `<span class="queue-spinner" style="width:14px;height:14px;"></span> Menghubungkan...` : `${svgIcon(ICONS.link)} Connect YouTube`;
  }
}
