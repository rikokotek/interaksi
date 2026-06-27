/* ============================================================
   TikFlow - Subathon Page (Dual Platform)
   ============================================================ */

let subathonData = null;
let subathonYtData = null;

async function renderSubathon() {
  subathonData = await apiFetch('/api/subathon');
  subathonYtData = await apiFetch('/api/subathon_yt');
  const page = document.getElementById('page-subathon');
  if (!page) return;

  page.innerHTML = `
    <div class="page-header" style="margin-bottom: 24px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h2 class="page-title">Subathon Dual-Platform</h2>
        <p class="page-subtitle">Timer subathon terintegrasi untuk TikTok dan YouTube secara bersamaan.</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
      
      <!-- TIKTOK SECTION -->
      <div style="display:flex; flex-direction:column; gap:24px;">
        <!-- Timer Card -->
        <div class="card subathon-main-card">
          <div class="card-header" style="justify-content: space-between;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:18px;">🎵</span> <h3 class="card-title">TIMER TIKTOK</h3>
            </div>
            <div id="timer-status-badge" class="timer-status ${!subathonData.enabled ? 'stopped' : (subathonData.paused ? 'paused' : 'running')}">
              ${!subathonData.enabled ? '○ Stopped' : (subathonData.paused ? '⏸ Paused' : '● Berjalan')}
            </div>
          </div>
          <div class="card-body" style="display:flex; flex-direction:column; align-items:center; gap:32px; padding:40px 20px;">
            <div class="subathon-timer">
              <div class="timer-display" id="subathon-timer-display">
                ${formatTime(subathonData.timeSeconds || 0)}
              </div>
            </div>
            <div class="subathon-controls">
              ${!subathonData.enabled
                ? `<button class="btn btn-primary btn-lg" onclick="startSubathon('tiktok')">▶ Mulai Subathon</button>`
                : subathonData.paused
                  ? `<button class="btn btn-success btn-lg" onclick="resumeSubathon('tiktok')">▶ Lanjutkan</button>
                     <button class="btn btn-danger btn-sm" onclick="promptResetSubathon('tiktok')">⏹ Reset</button>`
                  : `<button class="btn btn-secondary btn-lg" onclick="pauseSubathon('tiktok')">⏸ Pause</button>
                     <button class="btn btn-danger btn-sm" onclick="promptResetSubathon('tiktok')">⏹ Reset</button>`
              }
            </div>
          </div>
          <!-- Add Time Manual -->
          <div class="card-footer" style="background: rgba(0,0,0,0.2); padding:20px;">
            <div style="font-size:13px; color:var(--text3); font-weight:600; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              ⚡ Tambah Waktu Manual (TikTok)
            </div>
            <div style="display:flex; gap:8px; margin-bottom:16px;">
              ${[60, 300, 600, 1800, 3600].map(s => `
                <button class="btn btn-secondary btn-sm" onclick="addTime(${s}, 'tiktok')">+${formatTimeDiff(s)}</button>
              `).join('')}
            </div>
            <div style="display:flex; gap:12px;">
              <input type="number" id="manual-time-input-tiktok" class="input-base" placeholder="Detik..." style="max-width:120px;" />
              <button class="btn btn-primary btn-sm" onclick="addCustomTime('tiktok')">Tambah</button>
            </div>
          </div>
        </div>

        <!-- Pengaturan TikTok -->
        <div class="card">
          <div class="card-header">
            <span style="font-size:16px;">⚙️</span> <h3 class="card-title">PENGATURAN TIKTOK</h3>
          </div>
          <div class="card-body" style="display:flex; flex-direction:column; gap:20px;">
            <div class="form-group">
              <label>JUDUL SUBATHON</label>
              <input type="text" id="subathon-title-input-tiktok" class="input-base" value="${subathonData.title || ''}" placeholder="Cth: Subathon 24 Jam" />
            </div>
            <div class="form-group">
              <label>WAKTU AWAL (MENIT)</label>
              <input type="number" id="subathon-initial-time-input-tiktok" class="input-base" value="${Math.floor((subathonData.initialTimeSeconds || 0)/60)}" />
            </div>
            <div class="form-group">
              <label>WEBHOOK URL (SAAT WAKTU HABIS)</label>
              <div style="display:flex; gap:8px;">
                <select id="subathon-end-webhook-method-tiktok" class="input-base" style="width:100px;">
                  <option value="POST" ${subathonData.endWebhookMethod==='POST'?'selected':''}>POST</option>
                  <option value="GET" ${subathonData.endWebhookMethod==='GET'?'selected':''}>GET</option>
                </select>
                <input type="text" id="subathon-end-webhook-url-tiktok" class="input-base" value="${subathonData.endWebhookUrl || ''}" placeholder="http://192.168.x.x:5000/subathon" />
                <button class="btn btn-secondary btn-sm" onclick="testSubathonWebhook('tiktok')">Tes Webhook</button>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="saveSubathonConfig('tiktok')">Simpan Config</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="justify-content: space-between;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>📺</span> <h3 class="card-title">OBS OVERLAY TIKTOK</h3>
            </div>
            <div class="status-badge status-running"><span class="status-dot"></span> Ready</div>
          </div>
          <div class="card-body">
            <div style="font-size:13px; color:var(--text3); margin-bottom:8px;">URL untuk OBS Browser Source:</div>
            <div style="display:flex; align-items:center; gap:12px; background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; border:1px solid var(--border);">
              <div id="subathon-overlay-url-tiktok" style="font-family:monospace; color:var(--accent); font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;"></div>
              <button class="btn btn-ghost btn-sm" onclick="copyText(window.location.origin + '/overlay/subathon')">
                ${svgIcon(ICONS.copy)}
              </button>
            </div>
            
            <div style="font-size:12px;color:var(--text3);margin-top:16px;">
              ✅ Auto-pause saat stream offline<br>
              ✅ Auto-resume saat kembali LIVE<br>
              ✅ Sync realtime via WebSocket
            </div>
            
            <!-- Overlay Style TikTok -->
            <div style="margin-top:24px; padding-top:16px; border-top:1px dashed var(--border2);">
              <span class="card-title" style="display:block; margin-bottom:16px;">🎨 Tampilan Overlay (TIKTOK)</span>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                <div class="form-group">
                  <label>Warna Background</label>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="color" id="overlay-bg-tiktok" value="${subathonData.overlayStyle?.bgColor || '#0a0a0f'}" style="width:32px;height:32px;padding:0;border:none;" onchange="document.getElementById('overlay-bg-text-tiktok').value=this.value;"/>
                    <input type="text" id="overlay-bg-text-tiktok" value="${subathonData.overlayStyle?.bgColor || '#0a0a0f'}" class="input-base" style="flex:1;" oninput="document.getElementById('overlay-bg-tiktok').value=this.value;"/>
                  </div>
                </div>
                <div class="form-group">
                  <label>Warna Teks</label>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="color" id="overlay-text-tiktok" value="${subathonData.overlayStyle?.textColor || '#a855f7'}" style="width:32px;height:32px;padding:0;border:none;" onchange="document.getElementById('overlay-text-text-tiktok').value=this.value;"/>
                    <input type="text" id="overlay-text-text-tiktok" value="${subathonData.overlayStyle?.textColor || '#a855f7'}" class="input-base" style="flex:1;" oninput="document.getElementById('overlay-text-tiktok').value=this.value;"/>
                  </div>
                </div>
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label>Font</label>
                <select class="input-base" id="overlay-font-tiktok">
                  ${['Inter', 'Orbitron', 'Rajdhani', 'Bebas Neue', 'Roboto Mono', 'Space Mono'].map(f =>
                    `<option ${subathonData.overlayStyle?.fontFamily === f ? 'selected' : ''}>${f}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label>Tampilkan Judul</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="toggle ${subathonData.overlayStyle?.showTitle !== false ? 'on' : ''}" id="overlay-title-toggle-tiktok" onclick="this.classList.toggle('on')"></div>
                  <span style="font-size:13px;color:var(--text3);">Tampilkan judul subathon</span>
                </div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                <div class="form-group">
                  <label>Ukuran Judul (px)</label>
                  <input type="number" class="input-base" id="overlay-title-size-tiktok" min="10" max="100" value="${subathonData.overlayStyle?.titleSize || 18}" />
                </div>
                <div class="form-group">
                  <label>Jarak Judul & Timer (px)</label>
                  <input type="number" class="input-base" id="overlay-title-spacing-tiktok" min="0" max="100" value="${subathonData.overlayStyle?.titleSpacing ?? 8}" />
                </div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="saveOverlayStyle('tiktok')">Simpan Style (TikTok)</button>
            </div>

          </div>
        </div>
      </div>

      <!-- YOUTUBE SECTION -->
      <div style="display:flex; flex-direction:column; gap:24px;">
        <!-- Timer Card -->
        <div class="card subathon-main-card">
          <div class="card-header" style="justify-content: space-between;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:18px;">🟥</span> <h3 class="card-title">TIMER YOUTUBE</h3>
            </div>
            <div id="timer-yt-status-badge" class="timer-status ${!subathonYtData.enabled ? 'stopped' : (subathonYtData.paused ? 'paused' : 'running')}">
              ${!subathonYtData.enabled ? '○ Stopped' : (subathonYtData.paused ? '⏸ Paused' : '● Berjalan')}
            </div>
          </div>
          <div class="card-body" style="display:flex; flex-direction:column; align-items:center; gap:32px; padding:40px 20px;">
            <div class="subathon-timer">
              <div class="timer-display" id="subathon-yt-timer-display" style="color:var(--red);">
                ${formatTime(subathonYtData.timeSeconds || 0)}
              </div>
            </div>
            <div class="subathon-controls">
              ${!subathonYtData.enabled
                ? `<button class="btn btn-primary btn-lg" onclick="startSubathon('yt')">▶ Mulai Subathon</button>`
                : subathonYtData.paused
                  ? `<button class="btn btn-success btn-lg" onclick="resumeSubathon('yt')">▶ Lanjutkan</button>
                     <button class="btn btn-danger btn-sm" onclick="promptResetSubathon('yt')">⏹ Reset</button>`
                  : `<button class="btn btn-secondary btn-lg" onclick="pauseSubathon('yt')">⏸ Pause</button>
                     <button class="btn btn-danger btn-sm" onclick="promptResetSubathon('yt')">⏹ Reset</button>`
              }
            </div>
          </div>
          <!-- Add Time Manual -->
          <div class="card-footer" style="background: rgba(0,0,0,0.2); padding:20px;">
            <div style="font-size:13px; color:var(--text3); font-weight:600; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              ⚡ Tambah Waktu Manual (YouTube)
            </div>
            <div style="display:flex; gap:8px; margin-bottom:16px;">
              ${[60, 300, 600, 1800, 3600].map(s => `
                <button class="btn btn-secondary btn-sm" onclick="addTime(${s}, 'yt')">+${formatTimeDiff(s)}</button>
              `).join('')}
            </div>
            <div style="display:flex; gap:12px;">
              <input type="number" id="manual-time-input-yt" class="input-base" placeholder="Detik..." style="max-width:120px;" />
              <button class="btn btn-primary btn-sm" onclick="addCustomTime('yt')">Tambah</button>
            </div>
          </div>
        </div>

        <!-- Pengaturan YouTube -->
        <div class="card">
          <div class="card-header">
            <span style="font-size:16px;">⚙️</span> <h3 class="card-title">PENGATURAN YOUTUBE</h3>
          </div>
          <div class="card-body" style="display:flex; flex-direction:column; gap:20px;">
            <div class="form-group">
              <label>JUDUL SUBATHON</label>
              <input type="text" id="subathon-title-input-yt" class="input-base" value="${subathonYtData.title || ''}" placeholder="Cth: Subathon 24 Jam YT" />
            </div>
            <div class="form-group">
              <label>WAKTU AWAL (MENIT)</label>
              <input type="number" id="subathon-initial-time-input-yt" class="input-base" value="${Math.floor((subathonYtData.initialTimeSeconds || 0)/60)}" />
            </div>
            <div class="form-group">
              <label>WEBHOOK URL (SAAT WAKTU HABIS)</label>
              <div style="display:flex; gap:8px;">
                <select id="subathon-end-webhook-method-yt" class="input-base" style="width:100px;">
                  <option value="POST" ${subathonYtData.endWebhookMethod==='POST'?'selected':''}>POST</option>
                  <option value="GET" ${subathonYtData.endWebhookMethod==='GET'?'selected':''}>GET</option>
                </select>
                <input type="text" id="subathon-end-webhook-url-yt" class="input-base" value="${subathonYtData.endWebhookUrl || ''}" placeholder="http://192.168.x.x:5000/subathon" />
                <button class="btn btn-secondary btn-sm" onclick="testSubathonWebhook('yt')">Tes Webhook</button>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="saveSubathonConfig('yt')">Simpan Config</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="justify-content: space-between;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>📺</span> <h3 class="card-title">OBS OVERLAY YOUTUBE</h3>
            </div>
            <div class="status-badge status-running"><span class="status-dot"></span> Ready</div>
          </div>
          <div class="card-body">
            <div style="font-size:13px; color:var(--text3); margin-bottom:8px;">URL untuk OBS Browser Source:</div>
            <div style="display:flex; align-items:center; gap:12px; background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; border:1px solid var(--border);">
              <div id="subathon-overlay-url-yt" style="font-family:monospace; color:var(--red); font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;"></div>
              <button class="btn btn-ghost btn-sm" onclick="copyText(window.location.origin + '/overlay/subathon_yt')">
                ${svgIcon(ICONS.copy)}
              </button>
            </div>
            
            <div style="font-size:12px;color:var(--text3);margin-top:16px;">
              ✅ Auto-pause saat stream offline<br>
              ✅ Auto-resume saat kembali LIVE<br>
              ✅ Sync realtime via WebSocket
            </div>
            
            <!-- Overlay Style YouTube -->
            <div style="margin-top:24px; padding-top:16px; border-top:1px dashed var(--border2);">
              <span class="card-title" style="display:block; margin-bottom:16px;">🎨 Tampilan Overlay (YOUTUBE)</span>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                <div class="form-group">
                  <label>Warna Background</label>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="color" id="overlay-bg-yt" value="${subathonYtData.overlayStyle?.bgColor || '#0a0a0f'}" style="width:32px;height:32px;padding:0;border:none;" onchange="document.getElementById('overlay-bg-text-yt').value=this.value;"/>
                    <input type="text" id="overlay-bg-text-yt" value="${subathonYtData.overlayStyle?.bgColor || '#0a0a0f'}" class="input-base" style="flex:1;" oninput="document.getElementById('overlay-bg-yt').value=this.value;"/>
                  </div>
                </div>
                <div class="form-group">
                  <label>Warna Teks</label>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="color" id="overlay-text-yt" value="${subathonYtData.overlayStyle?.textColor || '#ff0000'}" style="width:32px;height:32px;padding:0;border:none;" onchange="document.getElementById('overlay-text-text-yt').value=this.value;"/>
                    <input type="text" id="overlay-text-text-yt" value="${subathonYtData.overlayStyle?.textColor || '#ff0000'}" class="input-base" style="flex:1;" oninput="document.getElementById('overlay-text-yt').value=this.value;"/>
                  </div>
                </div>
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label>Font</label>
                <select class="input-base" id="overlay-font-yt">
                  ${['Inter', 'Orbitron', 'Rajdhani', 'Bebas Neue', 'Roboto Mono', 'Space Mono'].map(f =>
                    `<option ${subathonYtData.overlayStyle?.fontFamily === f ? 'selected' : ''}>${f}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label>Tampilkan Judul</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="toggle ${subathonYtData.overlayStyle?.showTitle !== false ? 'on' : ''}" id="overlay-title-toggle-yt" onclick="this.classList.toggle('on')"></div>
                  <span style="font-size:13px;color:var(--text3);">Tampilkan judul subathon</span>
                </div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                <div class="form-group">
                  <label>Ukuran Judul (px)</label>
                  <input type="number" class="input-base" id="overlay-title-size-yt" min="10" max="100" value="${subathonYtData.overlayStyle?.titleSize || 18}" />
                </div>
                <div class="form-group">
                  <label>Jarak Judul & Timer (px)</label>
                  <input type="number" class="input-base" id="overlay-title-spacing-yt" min="0" max="100" value="${subathonYtData.overlayStyle?.titleSpacing ?? 8}" />
                </div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="saveOverlayStyle('yt')">Simpan Style (YouTube)</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- SAWERIA & SOCIABUZZ (SHARED RULES) -->
      <div style="display:flex; flex-direction:column; gap:24px; grid-column: 1 / -1;">
        <h3 style="font-size:18px; margin: 12px 0 0 0; color:var(--text);">⚙️ PENGATURAN DONASI (BERLAKU UNTUK KEDUA TIMER)</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
          <!-- Setup Saweria -->
          <div class="card">
            <div class="card-header" style="justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 16px;">
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:36px; height:36px; background:#f4900c; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                  <span style="font-size:18px;">🦉</span>
                </div>
                <div>
                  <h3 class="card-title" style="margin-bottom:4px;">Setup Saweria</h3>
                  <a href="https://saweria.co" target="_blank" style="font-size:12px; color:var(--text3); text-decoration:none;">saweria.co ↗</a>
                </div>
              </div>
              <div id="saweria-dot" onclick="toggleSaweria()" style="width: 10px; height: 10px; border-radius: 50%; background: ${subathonData.saweria?.enabled ? '#34c759' : '#3a3a3c'}; cursor: pointer; transition: background 0.3s;" title="Klik untuk mengaktifkan/menonaktifkan"></div>
            </div>
            
            <div class="card-body">
              <div class="form-group">
                <label style="font-size: 11px; color: #8e8e93; margin-bottom: 8px; display: block;">Link Webhook</label>
                <div style="display: flex; align-items: center; background: #1c1c1e; padding: 10px 12px; border-radius: 8px; border: 1px solid #2c2c2e;">
                  <input type="text" id="saweria-webhook-display" readonly style="background:transparent; border:none; color:var(--text3); width:100%; font-size:13px; font-family:monospace; outline:none;" />
                  <button style="background: none; border: none; color: #8e8e93; cursor: pointer; padding: 0; margin-left: 8px;" onclick="copyText(document.getElementById('saweria-webhook-display').value)">
                    ${svgIcon(ICONS.copy, 16)}
                  </button>
                </div>
              </div>

              <div class="form-group" style="margin-top: 16px;">
                <label style="font-size: 11px; color: #8e8e93; margin-bottom: 8px; display: block;">Saweria Streamkey</label>
                <div style="display: flex; align-items: center; background: #1c1c1e; padding: 10px 12px; border-radius: 8px; border: 1px solid #2c2c2e;">
                  <input type="password" id="saweria-token" style="background:transparent; border:none; color:#fff; width:100%; font-size:13px; outline:none;" value="${subathonData.saweria?.token || ''}" placeholder="Paste streamkey dari Saweria di sini..." />
                  <button style="background: none; border: none; color: #8e8e93; cursor: pointer; padding: 0; margin-left: 8px;" onclick="const t = document.getElementById('saweria-token'); t.type = t.type === 'password' ? 'text' : 'password';">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
                <div style="font-size: 11px; color: #636366; margin-top: 8px; line-height: 1.4;">
                  Buka profil Saweria Anda > Overlay > Integration. Salin <strong>Streamkey</strong> dan paste di sini.
                </div>
              </div>

              <button style="width: 100%; background: #fff; color: #000; font-weight: 600; padding: 12px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="saveSaweriaToken(document.getElementById('saweria-token').value)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Simpan
              </button>

              <div style="margin-top:24px; padding-top:20px; border-top:1px dashed var(--border2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <h4 style="font-size:13px; font-weight:600; margin:0;">Aturan Penambahan Waktu</h4>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
                  ${renderSubathonRules('saweria')}
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="addSubathonRule('saweria')">
                    ${svgIcon(ICONS.plus)} Tambah Aturan
                  </button>
                  <button class="btn btn-primary btn-sm" style="flex:1; background:var(--primary); color:#000;" onclick="promptTestDonation('saweria')">
                    Test Donasi
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Setup Sociabuzz -->
          <div class="card">
            <div class="card-header" style="justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 16px;">
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:36px; height:36px; background:#1b95e0; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                  <span style="font-size:18px;">✨</span>
                </div>
                <div>
                  <h3 class="card-title" style="margin-bottom:4px;">Setup Sociabuzz</h3>
                  <a href="https://sociabuzz.com" target="_blank" style="font-size:12px; color:var(--text3); text-decoration:none;">sociabuzz.com ↗</a>
                </div>
              </div>
              <div id="sociabuzz-dot" onclick="toggleSociabuzz()" style="width: 10px; height: 10px; border-radius: 50%; background: ${subathonData.sociabuzz?.enabled ? '#34c759' : '#3a3a3c'}; cursor: pointer; transition: background 0.3s;" title="Klik untuk mengaktifkan/menonaktifkan"></div>
            </div>
            
            <div class="card-body">
              <div class="form-group">
                <label style="font-size: 11px; color: #8e8e93; margin-bottom: 8px; display: block;">Link Webhook</label>
                <div style="display: flex; align-items: center; background: #1c1c1e; padding: 10px 12px; border-radius: 8px; border: 1px solid #2c2c2e;">
                  <input type="text" id="sociabuzz-webhook-display" readonly style="background:transparent; border:none; color:var(--text3); width:100%; font-size:13px; font-family:monospace; outline:none;" />
                  <button style="background: none; border: none; color: #8e8e93; cursor: pointer; padding: 0; margin-left: 8px;" onclick="copyText(document.getElementById('sociabuzz-webhook-display').value)">
                    ${svgIcon(ICONS.copy, 16)}
                  </button>
                </div>
              </div>

              <div class="form-group" style="margin-top: 16px;">
                <label style="font-size: 11px; color: #8e8e93; margin-bottom: 8px; display: block;">Sociabuzz Secret Token</label>
                <div style="display: flex; align-items: center; background: #1c1c1e; padding: 10px 12px; border-radius: 8px; border: 1px solid #2c2c2e;">
                  <input type="password" id="sociabuzz-token" style="background:transparent; border:none; color:#fff; width:100%; font-size:13px; outline:none;" value="${subathonData.sociabuzz?.token || ''}" placeholder="Paste Secret Token dari Sociabuzz..." />
                  <button style="background: none; border: none; color: #8e8e93; cursor: pointer; padding: 0; margin-left: 8px;" onclick="const t = document.getElementById('sociabuzz-token'); t.type = t.type === 'password' ? 'text' : 'password';">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
                <div style="font-size: 11px; color: #636366; margin-top: 8px; line-height: 1.4;">
                  Tarik opsi Integrasi pada Sociabuzz > Webhook. Gunakan URL Webhook dan tambahkan Secret Token di sini untuk memverifikasi request.
                </div>
              </div>

              <button style="width: 100%; background: #fff; color: #000; font-weight: 600; padding: 12px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="saveSociabuzzToken(document.getElementById('sociabuzz-token').value)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Simpan
              </button>

              <div style="margin-top:24px; padding-top:20px; border-top:1px dashed var(--border2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <h4 style="font-size:13px; font-weight:600; margin:0;">Aturan Penambahan Waktu</h4>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
                  ${renderSubathonRules('sociabuzz')}
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="addSubathonRule('sociabuzz')">
                    ${svgIcon(ICONS.plus)} Tambah Aturan
                  </button>
                  <button class="btn btn-primary btn-sm" style="flex:1; background:var(--primary); color:#000;" onclick="promptTestDonation('sociabuzz')">
                    Test Donasi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const origin = window.location.origin;
    const key = subathonData?.webhookKey || '';
    
    // TIKTOK OVERLAY
    const ovTk = document.getElementById('subathon-overlay-url-tiktok');
    if (ovTk) ovTk.textContent = `${origin}/overlay/subathon`;

    // YT OVERLAY
    const ovYt = document.getElementById('subathon-overlay-url-yt');
    if (ovYt) ovYt.textContent = `${origin}/overlay/subathon_yt`;

    // Webhooks
    const swUrl = document.getElementById('saweria-webhook-display');
    if (swUrl) swUrl.value = `${origin}/api/webhook/saweria${key ? '?key=' + key : ''}`;

    const sbUrl = document.getElementById('sociabuzz-webhook-display');
    if (sbUrl) sbUrl.value = `${origin}/api/webhook/sociabuzz${key ? '?key=' + key : ''}`;
  }, 50);
}

async function startSubathon(target = 'tiktok') {
  const url = target === 'yt' ? '/api/subathon_yt/start' : '/api/subathon/start';
  const idPrefix = target === 'yt' ? '-yt' : '-tiktok';
  const inputEl = document.getElementById('subathon-initial-time-input' + idPrefix);
  const initialMins = inputEl ? parseInt(inputEl.value || '60') : 60;
  await apiFetch(url, { method: 'POST', body: { timeSeconds: initialMins * 60 } });
  showToast('Subathon dimulai!', 'success');
  await renderSubathon();
}

async function pauseSubathon(target = 'tiktok') {
  const url = target === 'yt' ? '/api/subathon_yt/pause' : '/api/subathon/pause';
  await apiFetch(url, { method: 'POST', body: {} });
  showToast('Subathon dijeda', 'warning');
  await renderSubathon();
}

async function resumeSubathon(target = 'tiktok') {
  const url = target === 'yt' ? '/api/subathon_yt/resume' : '/api/subathon/resume';
  await apiFetch(url, { method: 'POST', body: {} });
  showToast('Subathon dilanjutkan!', 'success');
  await renderSubathon();
}

async function promptResetSubathon(target = 'tiktok') {
  confirmModal(
    `Yakin ingin mereset Subathon <strong>${target.toUpperCase()}</strong> ke waktu awal?<br>Timer akan dihentikan dan dikembalikan ke waktu awal yang telah Anda atur.`,
    () => executeResetSubathon(target),
    {
      title: 'Reset Subathon ' + target.toUpperCase(),
      confirmText: 'Ya, Reset',
      icon: '🔄'
    }
  );
}

async function executeResetSubathon(target = 'tiktok') {
  closeModal();
  const idPrefix = target === 'yt' ? '-yt' : '-tiktok';
  const initialMins = parseInt(document.getElementById('subathon-initial-time-input' + idPrefix)?.value || '60');
  
  const url = target === 'yt' ? '/api/subathon_yt' : '/api/subathon';
  await apiFetch(url, {
    method: 'PUT',
    body: { timeSeconds: initialMins * 60, enabled: false, paused: true }
  });
  showToast('Subathon direset', 'info');
  await renderSubathon();
}

async function addTime(seconds, target = 'tiktok') {
  const url = target === 'yt' ? '/api/subathon_yt/add-time' : '/api/subathon/add-time';
  await apiFetch(url, {
    method: 'POST',
    body: { seconds }
  });
}

async function addCustomTime(target = 'tiktok') {
  const inputId = target === 'yt' ? 'manual-time-input-yt' : 'manual-time-input-tiktok';
  const input = document.getElementById(inputId);
  if (!input || !input.value) return;
  const url = target === 'yt' ? '/api/subathon_yt/add-time' : '/api/subathon/add-time';
  await apiFetch(url, {
    method: 'POST',
    body: { seconds: parseInt(input.value) || 0 }
  });
  input.value = '';
}

async function saveSubathonConfig(target = 'tiktok') {
  const idPrefix = target === 'yt' ? '-yt' : '-tiktok';
  const title = document.getElementById('subathon-title-input' + idPrefix).value;
  const initial = parseInt(document.getElementById('subathon-initial-time-input' + idPrefix).value) * 60 || 0;
  const webhookUrl = document.getElementById('subathon-end-webhook-url' + idPrefix).value;
  const webhookMethod = document.getElementById('subathon-end-webhook-method' + idPrefix).value;
  
  const url = target === 'yt' ? '/api/subathon_yt' : '/api/subathon';
  await apiFetch(url, {
    method: 'PUT',
    body: { title, initialTimeSeconds: initial, endWebhookUrl: webhookUrl, endWebhookMethod: webhookMethod }
  });
  showToast('Pengaturan subathon disimpan', 'success');
}

async function saveOverlayStyle(target = 'tiktok') {
  const idPrefix = target === 'yt' ? '-yt' : '-tiktok';
  const overlayStyle = {
    bgColor: document.getElementById('overlay-bg-text' + idPrefix)?.value || '#0a0a0f',
    textColor: document.getElementById('overlay-text-text' + idPrefix)?.value || (target === 'yt' ? '#ff0000' : '#a855f7'),
    fontFamily: document.getElementById('overlay-font' + idPrefix)?.value || 'Inter',
    showTitle: document.getElementById('overlay-title-toggle' + idPrefix)?.classList.contains('on'),
    titleSize: parseInt(document.getElementById('overlay-title-size' + idPrefix)?.value || '18'),
    titleSpacing: parseInt(document.getElementById('overlay-title-spacing' + idPrefix)?.value ?? '8'),
  };
  
  const url = target === 'yt' ? '/api/subathon_yt' : '/api/subathon';
  await apiFetch(url, {
    method: 'PUT',
    body: { overlayStyle }
  });
  showToast('Style overlay disimpan!', 'success');
}

async function testSubathonWebhook(target = 'tiktok') {
  const idPrefix = target === 'yt' ? '-yt' : '-tiktok';
  const urlInput = document.getElementById('subathon-end-webhook-url' + idPrefix).value;
  const methodInput = document.getElementById('subathon-end-webhook-method' + idPrefix).value;
  if (!urlInput) return showToast('Masukkan URL Webhook dulu', 'error');

  const apiUrl = target === 'yt' ? '/api/subathon_yt/test-webhook' : '/api/subathon/test-webhook';
  const res = await apiFetch(apiUrl, {
    method: 'POST',
    body: { url: urlInput, method: methodInput }
  });
}

async function saveSaweriaToken(token) {
  if (!subathonData.saweria) subathonData.saweria = {};
  subathonData.saweria.token = token;
  await apiFetch('/api/subathon', {
    method: 'PUT',
    body: subathonData
  });
  showToast('Token Saweria disimpan', 'success');
  await renderSubathon();
}

async function saveSociabuzzToken(token) {
  if (!subathonData.sociabuzz) subathonData.sociabuzz = {};
  subathonData.sociabuzz.token = token;
  await apiFetch('/api/subathon', {
    method: 'PUT',
    body: subathonData
  });
  showToast('Token Sociabuzz disimpan', 'success');
  await renderSubathon();
}

async function toggleSaweria() {
  if (!subathonData.saweria) subathonData.saweria = { enabled: false };
  subathonData.saweria.enabled = !subathonData.saweria.enabled;
  await apiFetch('/api/subathon', {
    method: 'PUT',
    body: subathonData
  });
  document.getElementById('saweria-dot').style.background = subathonData.saweria.enabled ? '#34c759' : '#3a3a3c';
}

async function toggleSociabuzz() {
  if (!subathonData.sociabuzz) subathonData.sociabuzz = { enabled: false };
  subathonData.sociabuzz.enabled = !subathonData.sociabuzz.enabled;
  await apiFetch('/api/subathon', {
    method: 'PUT',
    body: subathonData
  });
  document.getElementById('sociabuzz-dot').style.background = subathonData.sociabuzz.enabled ? '#34c759' : '#3a3a3c';
}

function renderSubathonRules(platform) {
  const rules = (subathonData.rules || []).filter(r => r.platform === platform);
  if (rules.length === 0) {
    return `<div style="font-size:12px; color:var(--text3); text-align:center; padding:12px; background:rgba(255,255,255,0.02); border-radius:6px; border:1px dashed var(--border2);">
      Belum ada aturan donasi.
    </div>`;
  }
  return rules.map((r, i) => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:rgba(255,255,255,0.03); border-radius:6px; border:1px solid var(--border2);">
      <div style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:14px; font-weight:600; color:#fff;">Rp${r.minAmount.toLocaleString('id-ID')}</span>
        <span style="color:var(--text3);">→</span>
        <span style="font-size:13px; color:var(--accent);">+${formatTimeDiff(r.secondsPerAmount)}</span>
      </div>
      <button class="btn btn-ghost btn-sm" style="color:#ff453a; padding:4px;" onclick="deleteSubathonRule('${platform}', ${i})">
        ${svgIcon(ICONS.trash, 14)}
      </button>
    </div>
  `).join('');
}

function addSubathonRule(platform) {
  openModal('Tambah Aturan Waktu (' + (platform==='saweria'?'Saweria':'Sociabuzz') + ')', `
    <div class="form-group">
      <label>Setiap Donasi Sebesar (Rp)</label>
      <input type="number" id="rule-amount" class="input-base" value="10000" />
    </div>
    <div class="form-group">
      <label>Tambah Waktu Berapa Detik?</label>
      <input type="number" id="rule-seconds" class="input-base" value="60" />
    </div>
    <p style="font-size:12px;color:var(--text3);">Contoh: Rp10.000 = +60 detik</p>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="saveSubathonRule('${platform}')">Tambah</button>
  `);
}

async function saveSubathonRule(platform) {
  const amount = parseInt(document.getElementById('rule-amount')?.value || '10000');
  const ruleSeconds = parseInt(document.getElementById('rule-seconds')?.value || '60');

  if (!subathonData.rules) subathonData.rules = [];
  subathonData.rules.push({
    platform,
    minAmount: amount,
    secondsPerAmount: ruleSeconds,
  });

  await apiFetch('/api/subathon', {
    method: 'PUT',
    body: { rules: subathonData.rules }
  });
  closeModal();
  showToast('Aturan berhasil ditambahkan', 'success');
  await renderSubathon();
}

async function deleteSubathonRule(platform, index) {
  const platformRules = (subathonData.rules || []).filter(r => r.platform === platform);
  const ruleToDelete = platformRules[index];
  
  subathonData.rules = subathonData.rules.filter(r => r !== ruleToDelete);
  
  await apiFetch('/api/subathon', {
    method: 'PUT',
    body: { rules: subathonData.rules }
  });
  showToast('Aturan dihapus', 'success');
  await renderSubathon();
}

function promptTestDonation(platform) {
  openModal('Test Donasi ' + (platform==='saweria'?'Saweria':'Sociabuzz'), `
    <div class="form-group">
      <label>Nominal Test (Rp)</label>
      <input type="number" id="test-donation-amount" class="input-base" value="50000" />
    </div>
    <p style="font-size:12px;color:var(--text3);">Ini akan mensimulasikan donasi masuk ke server dan menjalankan aturan penambahan waktu serta overlay.</p>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="submitTestDonation('${platform}')">Kirim Test</button>
  `);
}

function submitTestDonation(platform) {
  const amtInput = document.getElementById('test-donation-amount');
  if (amtInput) {
    const amt = parseInt(amtInput.value || '0');
    if (amt > 0) testDonation(platform, amt);
  }
  closeModal();
}

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimeDiff(s) {
  if (s < 60) return s + 'd';
  if (s < 3600) return (s / 60) + 'm';
  return (s / 3600) + 'j';
}

function updateSubathonUI(sub) {
  if (sub) subathonData = sub;
  const timerEl = document.getElementById('subathon-timer-display');
  if (timerEl) timerEl.textContent = formatTime(subathonData?.timeSeconds || 0);
  const statusBadge = document.getElementById('timer-status-badge');
  if (statusBadge && subathonData) {
    if (!subathonData.enabled) {
      statusBadge.innerHTML = '○ Stopped';
      statusBadge.className = 'timer-status stopped';
    } else if (subathonData.paused) {
      statusBadge.innerHTML = '⏸ Paused';
      statusBadge.className = 'timer-status paused';
    } else {
      statusBadge.innerHTML = '● Berjalan';
      statusBadge.className = 'timer-status running';
    }
  }
}

window.updateSubathonYtUI = function(subYt) {
  if (subYt) subathonYtData = subYt;
  const timerEl = document.getElementById('subathon-yt-timer-display');
  if (timerEl) timerEl.textContent = formatTime(subathonYtData?.timeSeconds || 0);
  const statusBadge = document.getElementById('timer-yt-status-badge');
  if (statusBadge && subathonYtData) {
    if (!subathonYtData.enabled) {
      statusBadge.innerHTML = '○ Stopped';
      statusBadge.className = 'timer-status stopped';
    } else if (subathonYtData.paused) {
      statusBadge.innerHTML = '⏸ Paused';
      statusBadge.className = 'timer-status paused';
    } else {
      statusBadge.innerHTML = '● Berjalan';
      statusBadge.className = 'timer-status running';
    }
  }
}

// Test donation (for dev)
async function testDonation(platform, amount) {
  let url = `/api/webhook/${platform}`;
  
  // Ambil key dari display URL agar tidak ter-blokir oleh proteksi webhook
  const displayUrl = document.getElementById(`${platform}-webhook-display`)?.value || '';
  const keyMatch = displayUrl.match(/\?key=([^&]+)/);
  if (keyMatch) {
    url += `?key=${keyMatch[1]}`;
  }

  const payload = platform === 'saweria' 
    ? {
        version: "1.0",
        created_at: new Date().toISOString(),
        data: {
          id: "test-" + Date.now(),
          type: "donation",
          amount_raw: amount,
          donator_name: "TestUser",
          message: "Test donation dari dashboard",
        }
      }
    : {
        id: "sb-" + Date.now(),
        type: "donation",
        amount: amount,
        supporter_name: "TestUserSB",
        message: "Test donation Sociabuzz"
      };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    showToast(`Test donasi ${platform} ${amount} berhasil!`, 'success');
  } else {
    showToast(`Gagal test donasi ${platform}`, 'error');
  }
}

// ============================================================
// REAL-TIME UI UPDATES VIA WEBSOCKET
// ============================================================
if (typeof socket !== 'undefined') {
  socket.on('subathon_tick', ({ timeSeconds }) => {
    if (subathonData) subathonData.timeSeconds = timeSeconds;
    const timerEl = document.getElementById('subathon-timer-display');
    if (timerEl) timerEl.textContent = formatTime(timeSeconds);
  });

  socket.on('subathon_yt_tick', ({ timeSeconds }) => {
    if (subathonYtData) subathonYtData.timeSeconds = timeSeconds;
    const timerEl = document.getElementById('subathon-yt-timer-display');
    if (timerEl) timerEl.textContent = formatTime(timeSeconds);
  });

  socket.on('subathon_update', (sub) => {
    subathonData = sub;
    const statusBadge = document.getElementById('timer-status-badge');
    if (statusBadge) {
      if (!subathonData.enabled) {
        statusBadge.innerHTML = '○ Stopped';
        statusBadge.className = 'timer-status stopped';
      } else if (subathonData.paused) {
        statusBadge.innerHTML = '⏸ Paused';
        statusBadge.className = 'timer-status paused';
      } else {
        statusBadge.innerHTML = '● Berjalan';
        statusBadge.className = 'timer-status running';
      }
    }
  });

  socket.on('subathon_yt_update', (sub) => {
    subathonYtData = sub;
    const statusBadge = document.getElementById('timer-yt-status-badge');
    if (statusBadge) {
      if (!subathonYtData.enabled) {
        statusBadge.innerHTML = '○ Stopped';
        statusBadge.className = 'timer-status stopped';
      } else if (subathonYtData.paused) {
        statusBadge.innerHTML = '⏸ Paused';
        statusBadge.className = 'timer-status paused';
      } else {
        statusBadge.innerHTML = '● Berjalan';
        statusBadge.className = 'timer-status running';
      }
    }
  });
}
