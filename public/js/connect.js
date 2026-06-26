/* ============================================================
   TikFlow - Connect TikTok Page
   ============================================================ */

function renderConnect() {
  const page = document.getElementById('page-connect');
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
