/* ============================================================
   TikFlow - Subathon Page
   ============================================================ */

let subathonData = null;

async function renderSubathon() {
  subathonData = await apiFetch('/api/subathon');
  const page = document.getElementById('page-subathon');

  page.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Subathon</h1>
          <p class="page-subtitle">Timer subathon terintegrasi Saweria & Sociabuzz</p>
        </div>
        <div style="display:flex;gap:8px;">
          <a href="/overlay/subathon" target="_blank" class="btn btn-secondary">
            ${svgIcon(ICONS.link)} Buka Overlay
          </a>
          <button class="btn btn-ghost btn-sm" onclick="copyText(window.location.origin + '/overlay/subathon')">
            ${svgIcon(ICONS.copy)} Copy OBS URL
          </button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <!-- Timer Panel -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="card">
            <div class="card-header">
              <span class="card-title">⏱️ Timer</span>
              <span class="badge ${subathonData.enabled && !subathonData.paused ? 'badge-green' : subathonData.enabled && subathonData.paused ? 'badge-yellow' : 'badge-gray'}">
                ${subathonData.enabled && !subathonData.paused ? '▶ Berjalan' : subathonData.enabled && subathonData.paused ? '⏸ Dijeda' : '⏹ Berhenti'}
              </span>
            </div>

            <div class="subathon-timer">
              <div class="timer-display" id="subathon-timer-display">
                ${formatTime(subathonData.timeSeconds || 0)}
              </div>
              <div>
                <span class="timer-status ${subathonData.enabled && !subathonData.paused ? 'running' : subathonData.enabled && subathonData.paused ? 'paused' : 'stopped'}" id="timer-status-badge">
                  ${subathonData.enabled && !subathonData.paused ? '● Running' : subathonData.enabled && subathonData.paused ? '⏸ Paused' : '○ Stopped'}
                </span>
              </div>
            </div>

            <div class="subathon-controls">
              ${!subathonData.enabled
                ? `<button class="btn btn-primary btn-lg" onclick="startSubathon()">▶ Mulai Subathon</button>`
                : subathonData.paused
                  ? `<button class="btn btn-success btn-lg" onclick="resumeSubathon()">▶ Lanjutkan</button>
                     <button class="btn btn-danger btn-sm" onclick="resetSubathon()">🔄 Reset</button>`
                  : `<button class="btn btn-secondary btn-lg" onclick="pauseSubathon()">⏸ Pause</button>
                     <button class="btn btn-danger btn-sm" onclick="resetSubathon()">🔄 Reset</button>`
              }
            </div>

            <!-- Add time manually -->
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border2);">
              <div style="font-size:12.5px;font-weight:600;color:var(--text2);margin-bottom:10px;">⚡ Tambah Waktu Manual</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${[60, 300, 600, 1800, 3600].map(s => `
                  <button class="btn btn-secondary btn-sm" onclick="addTime(${s})">+${formatTimeDiff(s)}</button>
                `).join('')}
              </div>
              <div style="display:flex;gap:8px;margin-top:10px;">
                <input type="number" class="form-input" id="custom-time-input" placeholder="Detik..." min="1" style="flex:1;"/>
                <button class="btn btn-primary btn-sm" onclick="addCustomTime()">Tambah</button>
              </div>
            </div>
          </div>

          <!-- OBS Info Card -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">📺 OBS Overlay</span>
              <span class="badge badge-green">Ready</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div style="background:var(--surface);border-radius:8px;padding:12px;border:1px solid var(--border2);">
                <div style="font-size:11.5px;color:var(--text3);margin-bottom:6px;">URL untuk OBS Browser Source:</div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <code style="font-size:12px;color:var(--accent);flex:1;" id="obs-url-display"></code>
                  <button class="btn btn-ghost btn-sm" onclick="copyText(window.location.origin + '/overlay/subathon')">
                    ${svgIcon(ICONS.copy, 13)}
                  </button>
                </div>
              </div>
              <div style="font-size:12px;color:var(--text3);">
                ✅ Auto-pause saat stream offline<br>
                ✅ Auto-resume saat kembali LIVE<br>
                ✅ Sync realtime via WebSocket
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Panel -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <!-- Config -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">⚙️ Pengaturan Timer</span>
            </div>
            <div class="form-group">
              <label>Judul Subathon</label>
              <input type="text" class="form-input" id="sub-title" value="${subathonData.title || 'Subathon'}" placeholder="Subathon"/>
            </div>
            <div class="form-group">
              <label>Waktu Awal (menit)</label>
              <input type="number" class="form-input" id="sub-initial-minutes" value="${Math.floor((subathonData.initialTimeSeconds || 3600) / 60)}" min="1"/>
            </div>
            <div class="form-group" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border2);">
              <label>Webhook URL (Saat Waktu Habis)</label>
              <div style="display:flex;gap:8px;">
                <input type="text" class="form-input" id="sub-end-webhook-url" value="${subathonData.endWebhookUrl || ''}" placeholder="http://localhost:8080/... (opsional)"/>
                <button class="btn btn-secondary btn-sm" onclick="testSubathonWebhook()">Tes Webhook</button>
              </div>
              <div style="font-size: 11px; color: var(--text3); margin-top: 4px;">Akan otomatis ditembak ketika timer mencapai 0.</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="saveSubathonConfig()">Simpan Config</button>
          </div>

          <!-- Saweria Integration -->
          <div class="card" style="background:#1c1c1e; border: 1px solid #2c2c2e; border-radius: 12px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <div style="width: 40px; height: 40px; background: #f59e0b22; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;"><img src="/uploads/saweria_logo.png" style="width: 32px; height: 32px; object-fit: contain;" alt="Saweria" onerror="this.outerHTML='🦉'"></div>
                <div>
                  <div style="font-size: 16px; font-weight: 600; color: #fff;">Setup Saweria</div>
                  <a href="https://saweria.co" target="_blank" style="font-size: 12px; color: #8e8e93; display: flex; align-items: center; gap: 4px; text-decoration: none;">saweria.co <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>
                </div>
              </div>
              <div id="saweria-dot" onclick="toggleSaweria()" style="width: 10px; height: 10px; border-radius: 50%; background: ${subathonData.saweria?.enabled ? '#34c759' : '#3a3a3c'}; cursor: pointer; transition: background 0.3s;" title="Klik untuk mengaktifkan/menonaktifkan"></div>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="font-size: 13px; color: #8e8e93; margin-bottom: 8px; display: block;">Link Webhook</label>
              <div style="display: flex; align-items: center; background: #151515; border: 1px dashed #3a3a3c; border-radius: 8px; padding: 10px 12px;">
                <input type="text" id="saweria-webhook-display" readonly style="background: transparent; border: none; color: #8e8e93; font-size: 13px; flex: 1; outline: none; cursor: default; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <button style="background: none; border: none; color: #8e8e93; cursor: pointer; padding: 0; margin-left: 8px;" onclick="copyText(document.getElementById('saweria-webhook-display').value)">
                  ${svgIcon(ICONS.copy, 16)}
                </button>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="font-size: 13px; color: #8e8e93; margin-bottom: 8px; display: block;">Saweria Streamkey</label>
              <div style="display: flex; align-items: center; background: #151515; border: 1px solid #2c2c2e; border-radius: 8px; padding: 10px 12px;">
                <input type="password" id="saweria-token" value="${subathonData.saweria?.token || ''}" style="background: transparent; border: none; color: #fff; font-size: 13px; flex: 1; outline: none;">
                <button style="background: none; border: none; color: #8e8e93; cursor: pointer; padding: 0; margin-left: 8px;" onclick="const t = document.getElementById('saweria-token'); t.type = t.type === 'password' ? 'text' : 'password';">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
            </div>

            <p style="font-size: 12px; color: #8e8e93; line-height: 1.5; margin-bottom: 20px;">
              Jaga link webhook dan streamkey Anda tetap aman, jangan sampai orang lain mengetahui data tersebut. Jika terlanjur bocor kamu bisa request link baru ke admin.
            </p>

            <button style="width: 100%; background: #fff; color: #000; font-weight: 600; padding: 12px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="saveSaweriaToken(document.getElementById('saweria-token').value)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Simpan
            </button>

            <!-- Rules Section -->
            <div style="margin-top: 20px; border-top: 1px solid #2c2c2e; padding-top: 16px;">
              <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 12px;">Aturan Donasi (Subathon)</div>
              <div id="saweria-rules" style="display:flex;flex-direction:column;gap:8px; margin-bottom: 12px;">
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

          <!-- Sociabuzz Integration -->
          <div class="card" style="background:#1c1c1e; border: 1px solid #2c2c2e; border-radius: 12px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <div style="width: 40px; height: 40px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow:hidden;">
                  <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <!-- Top arc of S - teal -->
                    <path d="M72 22 C72 22 38 18 28 36 C20 50 48 52 52 52" stroke="#3ecf8e" stroke-width="16" stroke-linecap="round" fill="none"/>
                    <!-- Bottom arc of S - green -->
                    <path d="M52 52 C52 52 72 54 68 70 C62 85 30 82 22 80" stroke="#22c55e" stroke-width="16" stroke-linecap="round" fill="none"/>
                  </svg>
                </div>
                <div>
                  <div style="font-size: 16px; font-weight: 600; color: #fff;">Setup Sociabuzz</div>
                  <a href="https://sociabuzz.com" target="_blank" style="font-size: 12px; color: #8e8e93; display: flex; align-items: center; gap: 4px; text-decoration: none;">sociabuzz.com <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>
                </div>
              </div>
              <div id="sociabuzz-dot" onclick="toggleSociabuzz()" style="width: 10px; height: 10px; border-radius: 50%; background: ${subathonData.sociabuzz?.enabled ? '#34c759' : '#3a3a3c'}; cursor: pointer; transition: background 0.3s;" title="Klik untuk mengaktifkan/menonaktifkan"></div>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="font-size: 13px; color: #8e8e93; margin-bottom: 8px; display: block;">Link Webhook</label>
              <div style="display: flex; align-items: center; background: #151515; border: 1px dashed #3a3a3c; border-radius: 8px; padding: 10px 12px;">
                <input type="text" id="sociabuzz-webhook-display" readonly style="background: transparent; border: none; color: #8e8e93; font-size: 13px; flex: 1; outline: none; cursor: default; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <button style="background: none; border: none; color: #8e8e93; cursor: pointer; padding: 0; margin-left: 8px;" onclick="copyText(document.getElementById('sociabuzz-webhook-display').value)">
                  ${svgIcon(ICONS.copy, 16)}
                </button>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="font-size: 13px; color: #8e8e93; margin-bottom: 8px; display: block;">Sociabuzz Webhook Token</label>
              <div style="display: flex; align-items: center; background: #151515; border: 1px solid #2c2c2e; border-radius: 8px; padding: 10px 12px;">
                <input type="password" id="sociabuzz-token" value="${subathonData.sociabuzz?.token || ''}" style="background: transparent; border: none; color: #fff; font-size: 13px; flex: 1; outline: none;">
                <button style="background: none; border: none; color: #8e8e93; cursor: pointer; padding: 0; margin-left: 8px;" onclick="const t = document.getElementById('sociabuzz-token'); t.type = t.type === 'password' ? 'text' : 'password';">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
            </div>

            <p style="font-size: 12px; color: #8e8e93; line-height: 1.5; margin-bottom: 20px;">
              Jaga link webhook dan token Anda tetap aman, jangan sampai orang lain mengetahui data tersebut. Jika terlanjur bocor kamu bisa request link baru ke admin.
            </p>

            <button style="width: 100%; background: #fff; color: #000; font-weight: 600; padding: 12px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="saveSociabuzzToken(document.getElementById('sociabuzz-token').value)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Simpan
            </button>

            <!-- Rules Section -->
            <div style="margin-top: 20px; border-top: 1px solid #2c2c2e; padding-top: 16px;">
              <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 12px;">Aturan Donasi (Subathon)</div>
              <div id="sociabuzz-rules" style="display:flex;flex-direction:column;gap:8px; margin-bottom: 12px;">
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

          <!-- Overlay Style -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">🎨 Tampilan Overlay</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Warna Background</label>
                <div class="color-picker-wrap" style="display:flex;gap:8px;align-items:center;">
                  <input type="color" id="overlay-bg" value="${subathonData.overlayStyle?.bgColor || '#0a0a0f'}" style="width:32px;height:32px;padding:0;border:none;" onchange="document.getElementById('overlay-bg-text').value=this.value;"/>
                  <input type="text" id="overlay-bg-text" value="${subathonData.overlayStyle?.bgColor || '#0a0a0f'}" class="form-input" style="flex:1;font-size:12px;padding:4px 8px;" oninput="document.getElementById('overlay-bg').value=this.value;"/>
                </div>
              </div>
              <div class="form-group">
                <label>Warna Teks</label>
                <div class="color-picker-wrap" style="display:flex;gap:8px;align-items:center;">
                  <input type="color" id="overlay-text" value="${subathonData.overlayStyle?.textColor || '#a855f7'}" style="width:32px;height:32px;padding:0;border:none;" onchange="document.getElementById('overlay-text-text').value=this.value;"/>
                  <input type="text" id="overlay-text-text" value="${subathonData.overlayStyle?.textColor || '#a855f7'}" class="form-input" style="flex:1;font-size:12px;padding:4px 8px;" oninput="document.getElementById('overlay-text').value=this.value;"/>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>Font</label>
              <select class="form-select" id="overlay-font">
                ${['Inter', 'Orbitron', 'Rajdhani', 'Bebas Neue', 'Roboto Mono', 'Space Mono'].map(f =>
                  `<option ${subathonData.overlayStyle?.fontFamily === f ? 'selected' : ''}>${f}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Tampilkan Judul</label>
              <div class="toggle-wrap">
                <div class="toggle ${subathonData.overlayStyle?.showTitle !== false ? 'on' : ''}" id="overlay-title-toggle"
                     onclick="this.classList.toggle('on')"></div>
                <span style="font-size:13px;color:var(--text3);">Tampilkan judul subathon</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Ukuran Judul (px)</label>
                <input type="number" class="form-input" id="overlay-title-size" min="10" max="100" value="${subathonData.overlayStyle?.titleSize || 18}" />
              </div>
              <div class="form-group">
                <label>Jarak Judul & Timer (px)</label>
                <input type="number" class="form-input" id="overlay-title-spacing" min="0" max="100" value="${subathonData.overlayStyle?.titleSpacing ?? 8}" />
              </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="saveOverlayStyle()">Simpan Style</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Update dynamic URLs after render
  setTimeout(() => {
    const origin = window.location.origin;
    const webhookKey = subathonData?.webhookKey || '';
    const keyParam = webhookKey ? `?key=${webhookKey}` : '';
    const saweriaWebhook = document.getElementById('saweria-webhook-display');
    if (saweriaWebhook) saweriaWebhook.value = `${origin}/api/webhook/saweria${keyParam}`;
    const sociabuzzWebhook = document.getElementById('sociabuzz-webhook-display');
    if (sociabuzzWebhook) sociabuzzWebhook.value = `${origin}/api/webhook/sociabuzz${keyParam}`;
    document.getElementById('obs-url-display').textContent = `${origin}/overlay/subathon`;
  }, 0);
}

function renderSubathonRules(platform) {
  if (!subathonData) return '';
  const rules = (subathonData.rules || []).filter(r => r.platform === platform);
  if (rules.length === 0) return `<div style="font-size:12px;color:var(--text3);text-align:center;padding:10px;">Belum ada aturan</div>`;
  return rules.map((r, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:10px;background:var(--surface);border-radius:8px;border:1px solid var(--border2);">
      <div style="flex:1;font-size:13px;">
        <span style="color:var(--text2);">Rp${(r.perAmount || 0).toLocaleString('id')}</span>
        <span style="color:var(--text3);"> → </span>
        <span style="color:var(--green);">+${formatTimeDiff(r.secondsPerAmount || 60)}</span>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="deleteSubathonRule('${platform}',${i})" style="color:var(--red);">
        ${svgIcon(ICONS.trash, 13)}
      </button>
    </div>
  `).join('');
}

function addSubathonRule(platform) {
  openModal(`Tambah Aturan ${platform.charAt(0).toUpperCase() + platform.slice(1)}`, `
    <div class="form-row">
      <div class="form-group">
        <label>Per Donasi (Rp)</label>
        <input type="number" class="form-input" id="rule-amount" min="1000" step="1000" value="10000" placeholder="10000"/>
      </div>
      <div class="form-group">
        <label>Tambah Waktu (detik)</label>
        <input type="number" class="form-input" id="rule-seconds" min="1" value="60" placeholder="60"/>
      </div>
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
    perAmount: amount,
    minAmount: amount,
    secondsPerAmount: ruleSeconds,
  });

  await apiFetch('/api/subathon', { method: 'PUT', body: { rules: subathonData.rules } });
  closeModal();
  showToast('Aturan ditambahkan!', 'success');
  await renderSubathon();
}

async function deleteSubathonRule(platform, index) {
  const rules = (subathonData.rules || []).filter(r => r.platform === platform);
  const allRules = subathonData.rules || [];
  // Find and remove
  let count = 0;
  subathonData.rules = allRules.filter(r => {
    if (r.platform !== platform) return true;
    return count++ !== index;
  });
  await apiFetch('/api/subathon', { method: 'PUT', body: { rules: subathonData.rules } });
  showToast('Aturan dihapus', 'info');
  await renderSubathon();
}

async function startSubathon() {
  const initialMins = parseInt(document.getElementById('sub-initial-minutes')?.value || '60');
  await apiFetch('/api/subathon/start', { method: 'POST', body: { timeSeconds: initialMins * 60 } });
  showToast('Subathon dimulai!', 'success');
  await renderSubathon();
}

async function pauseSubathon() {
  await apiFetch('/api/subathon/pause', { method: 'POST', body: {} });
  showToast('Subathon dijeda', 'warning');
  await renderSubathon();
}

async function resumeSubathon() {
  await apiFetch('/api/subathon/resume', { method: 'POST', body: {} });
  showToast('Subathon dilanjutkan!', 'success');
  await renderSubathon();
}

async function resetSubathon() {
  const initialMins = parseInt(document.getElementById('sub-initial-minutes')?.value || '60');
  const initialTime = initialMins * 60;
  await apiFetch('/api/subathon', { method: 'PUT', body: { enabled: false, paused: true, timeSeconds: initialTime, initialTimeSeconds: initialTime } });
  showToast('Subathon direset ke waktu awal', 'info');
  await renderSubathon();
}

async function addTime(seconds) {
  await apiFetch('/api/subathon/add-time', { method: 'POST', body: { seconds } });
  showToast(`+${formatTimeDiff(seconds)} ditambahkan`, 'success');
}

async function addCustomTime() {
  const input = document.getElementById('custom-time-input');
  const seconds = parseInt(input?.value || '0');
  if (!seconds || seconds < 1) { showToast('Masukkan jumlah detik yang valid', 'warning'); return; }
  await addTime(seconds);
  if (input) input.value = '';
}

async function saveSubathonConfig() {
  const title = document.getElementById('sub-title')?.value?.trim() || 'Subathon';
  const initialMinutes = parseInt(document.getElementById('sub-initial-minutes')?.value || '60');
  const endWebhookUrl = document.getElementById('sub-end-webhook-url')?.value?.trim() || '';
  await apiFetch('/api/subathon', { method: 'PUT', body: { title, initialTimeSeconds: initialMinutes * 60, endWebhookUrl } });
  showToast('Config disimpan!', 'success');
}

async function testSubathonWebhook() {
  const url = document.getElementById('sub-end-webhook-url')?.value?.trim();
  if (!url) {
    showToast('Masukkan URL Webhook terlebih dahulu!', 'warning');
    return;
  }
  await apiFetch('/api/subathon/test-webhook', { method: 'POST', body: { url } });
  showToast('Test webhook dikirim!', 'info');
}

async function saveOverlayStyle() {
  const overlayStyle = {
    bgColor: document.getElementById('overlay-bg-text')?.value || '#0a0a0f',
    textColor: document.getElementById('overlay-text-text')?.value || '#a855f7',
    fontFamily: document.getElementById('overlay-font')?.value || 'Inter',
    showTitle: document.getElementById('overlay-title-toggle')?.classList.contains('on'),
    titleSize: parseInt(document.getElementById('overlay-title-size')?.value || '18'),
    titleSpacing: parseInt(document.getElementById('overlay-title-spacing')?.value ?? '8'),
  };
  await apiFetch('/api/subathon', { method: 'PUT', body: { overlayStyle } });
  showToast('Style overlay disimpan!', 'success');
}

async function toggleSaweria() {
  const enabled = !subathonData.saweria?.enabled;
  subathonData.saweria = { ...subathonData.saweria, enabled };
  await apiFetch('/api/subathon', { method: 'PUT', body: { saweria: subathonData.saweria } });
  const dot = document.getElementById('saweria-dot');
  if (dot) dot.style.background = enabled ? '#34c759' : '#3a3a3c';
  showToast(`Saweria ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
}

async function toggleSociabuzz() {
  const enabled = !subathonData.sociabuzz?.enabled;
  subathonData.sociabuzz = { ...subathonData.sociabuzz, enabled };
  await apiFetch('/api/subathon', { method: 'PUT', body: { sociabuzz: subathonData.sociabuzz } });
  const dot = document.getElementById('sociabuzz-dot');
  if (dot) dot.style.background = enabled ? '#34c759' : '#3a3a3c';
  showToast(`Sociabuzz ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
}

async function saveSaweriaToken(token) {
  subathonData.saweria = { ...subathonData.saweria, token };
  await apiFetch('/api/subathon', { method: 'PUT', body: { saweria: subathonData.saweria } });
  showToast('Token Saweria disimpan', 'success');
}

async function saveSociabuzzToken(token) {
  subathonData.sociabuzz = { ...subathonData.sociabuzz, token };
  await apiFetch('/api/subathon', { method: 'PUT', body: { sociabuzz: subathonData.sociabuzz } });
  showToast('Token Sociabuzz disimpan', 'success');
}

function formatTimeDiff(s) {
  if (s < 60) return `${s}d`;
  if (s < 3600) return `${Math.floor(s/60)}m`;
  return `${Math.floor(s/3600)}j${Math.floor((s%3600)/60) > 0 ? ' '+Math.floor((s%3600)/60)+'m' : ''}`;
}

function updateSubathonUI(sub) {
  if (!sub) return;
  subathonData = sub;
  const timerEl = document.getElementById('subathon-timer-display');
  if (timerEl) timerEl.textContent = formatTime(sub.timeSeconds || 0);
  const statusBadge = document.getElementById('timer-status-badge');
  if (statusBadge) {
    if (sub.enabled && !sub.paused) {
      statusBadge.className = 'timer-status running';
      statusBadge.textContent = '● Running';
    } else if (sub.enabled && sub.paused) {
      statusBadge.className = 'timer-status paused';
      statusBadge.textContent = '⏸ Paused';
    } else {
      statusBadge.className = 'timer-status stopped';
      statusBadge.textContent = '○ Stopped';
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

  await apiFetch(url, {
    method: 'POST',
    body: { amount, supporter_name: 'TestUser', from: 'TestUser', message: 'Test donation' }
  });
  showToast(`Test ${platform} Rp${amount.toLocaleString('id')} terkirim`, 'info');
}

function promptTestDonation(platform) {
  const title = `Test Donasi ${platform === 'saweria' ? 'Saweria' : 'Sociabuzz'}`;
  openModal(title, `
    <div style="margin-bottom:16px;">
      <p style="color:var(--text2);font-size:13px;margin-bottom:12px;">Masukkan nominal donasi untuk disimulasikan:</p>
      <div class="form-group">
        <label>Nominal (Rp)</label>
        <input type="number" class="form-input" id="test-donation-amount" value="10000" min="1" step="1000"/>
      </div>
    </div>
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

