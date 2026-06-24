/* ============================================================
   TikFlow - Top Donate Page
   ============================================================ */

let topDonateConfig = {};
let topDonatePeriod = 'all';
let topDonateRefreshTimer = null;

async function renderTopDonate() {
  const page = document.getElementById('page-top-donate');
  topDonateConfig = await apiFetch('/api/top-donate-config') || {};
  topDonatePeriod = topDonateConfig.defaultPeriod || 'all';

  const origin = window.location.origin;
  const overlayUrl = `${origin}/overlay/top-donate`;

  page.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">🏆 Top Donate</h1>
          <p class="page-subtitle">Peringkat donatur terbesar (Saweria + Sociabuzz)</p>
        </div>
        <div style="display:flex;gap:8px;">
          <a href="/overlay/top-donate" target="_blank" class="btn btn-secondary">
            ${svgIcon(ICONS.link)} Buka Overlay
          </a>
          <button class="btn btn-ghost btn-sm" onclick="copyText('${overlayUrl}')">
            ${svgIcon(ICONS.copy)} Copy OBS URL
          </button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start;">

        <!-- LEFT: Leaderboard -->
        <div style="display:flex;flex-direction:column;gap:16px;">

          <!-- Filter period -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">📊 Leaderboard</span>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-sm" id="td-btn-day"   onclick="setTopDonatePeriod('day')"   >Hari Ini</button>
                <button class="btn btn-sm" id="td-btn-month" onclick="setTopDonatePeriod('month')" >Bulan Ini</button>
                <button class="btn btn-sm" id="td-btn-all"   onclick="setTopDonatePeriod('all')"   >Semua</button>
                <button class="btn btn-ghost btn-sm" onclick="loadTopDonateData()" title="Refresh">🔄</button>
              </div>
            </div>
            <div id="top-donate-table" style="padding:4px 0;">
              <div style="font-size:12px;color:var(--text3);text-align:center;padding:24px 0;">Memuat...</div>
            </div>
          </div>

        </div>

        <!-- RIGHT: Settings Panel -->
        <div style="display:flex;flex-direction:column;gap:16px;">

          <div class="card">
            <div class="card-header">
              <span class="card-title">⚙️ Pengaturan Overlay</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px;padding-top:4px;">

              <!-- Judul -->
              <div class="form-group">
                <label>Judul Overlay</label>
                <input type="text" class="form-input" id="td-title" value="${topDonateConfig.title || 'Top Donate'}" placeholder="Top Donate"/>
              </div>

              <!-- Periode default overlay -->
              <div class="form-group">
                <label>Periode Default Overlay</label>
                <select class="form-input" id="td-default-period">
                  <option value="day"   ${(topDonateConfig.defaultPeriod||'all')==='day'   ? 'selected':''}>Hari Ini</option>
                  <option value="month" ${(topDonateConfig.defaultPeriod||'all')==='month' ? 'selected':''}>Bulan Ini</option>
                  <option value="all"   ${(topDonateConfig.defaultPeriod||'all')==='all'   ? 'selected':''}>Sepanjang Masa</option>
                </select>
              </div>

              <!-- Jumlah tampil overlay -->
              <div class="form-group">
                <label>Tampilkan (Overlay OBS)</label>
                <input type="number" class="form-input" id="td-overlay-limit" min="1" max="20" value="${topDonateConfig.overlayLimit || 5}" placeholder="5"/>
                <div style="font-size:11px;color:var(--text3);margin-top:4px;">Jumlah donatur yang tampil di Overlay OBS</div>
              </div>

              <!-- Jumlah tampil dashboard -->
              <div class="form-group">
                <label>Tampilkan (Dashboard)</label>
                <input type="number" class="form-input" id="td-limit" min="1" max="50" value="${topDonateConfig.limit || 10}" placeholder="10"/>
              </div>

              <!-- Tampilkan jumlah transaksi -->
              <div style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="td-show-count" ${topDonateConfig.showCount ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary);"/>
                <label for="td-show-count" style="font-size:13px;color:var(--text2);cursor:pointer;">Tampilkan jumlah transaksi</label>
              </div>

              <!-- Warna Font -->
              <div style="border-top:1px solid var(--border2);padding-top:14px;">
                <div style="font-size:12px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">🎨 Warna &amp; Ukuran Font</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                  <div class="form-group">
                    <label style="font-size:11px;">Judul — Warna</label>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <input type="color" id="td-title-color" value="${topDonateConfig.titleColor || '#a855f7'}" style="width:32px;height:32px;border:none;background:none;cursor:pointer;padding:0;border-radius:6px;"/>
                      <input type="text" id="td-title-color-hex" value="${topDonateConfig.titleColor || '#a855f7'}" class="form-input" style="font-size:11px;padding:6px 8px;" oninput="document.getElementById('td-title-color').value=this.value"/>
                    </div>
                  </div>
                  <div class="form-group">
                    <label style="font-size:11px;">Judul — Ukuran (px)</label>
                    <input type="number" class="form-input" id="td-title-size" min="8" max="72" value="${topDonateConfig.titleSize || 16}" style="font-size:12px;"/>
                  </div>
                  <div class="form-group">
                    <label style="font-size:11px;">Nama &amp; Nominal — Warna</label>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <input type="color" id="td-content-color" value="${topDonateConfig.contentColor || '#ffffff'}" style="width:32px;height:32px;border:none;background:none;cursor:pointer;padding:0;border-radius:6px;"/>
                      <input type="text" id="td-content-color-hex" value="${topDonateConfig.contentColor || '#ffffff'}" class="form-input" style="font-size:11px;padding:6px 8px;" oninput="document.getElementById('td-content-color').value=this.value"/>
                    </div>
                  </div>
                  <div class="form-group">
                    <label style="font-size:11px;">Nama &amp; Nominal — Ukuran (px)</label>
                    <input type="number" class="form-input" id="td-content-size" min="8" max="48" value="${topDonateConfig.contentSize || 13}" style="font-size:12px;"/>
                  </div>
                  <div class="form-group" style="grid-column:1/-1;">
                    <label style="font-size:11px;">Jarak Antar Baris (px)</label>
                    <input type="number" class="form-input" id="td-row-gap" min="0" max="60" value="${topDonateConfig.rowGap ?? 6}" style="font-size:12px;"/>
                  </div>
                </div>
              </div>

              <button class="btn btn-primary" style="width:100%;" onclick="saveTopDonateConfig()">
                ${svgIcon(ICONS.save)} Simpan Pengaturan
              </button>
            </div>
          </div>

          <!-- OBS URL Card -->
          <div class="card" style="background:#1c1c1e;border:1px solid #2c2c2e;">
            <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:12px;">📺 OBS Browser Source</div>
            <div style="font-size:11px;color:#8e8e93;margin-bottom:8px;">URL Overlay (salin ke OBS):</div>
            <div style="display:flex;align-items:center;background:#151515;border:1px dashed #3a3a3c;border-radius:8px;padding:8px 10px;gap:8px;">
              <input type="text" readonly id="td-obs-url" value="${overlayUrl}" style="background:transparent;border:none;color:#8e8e93;font-size:11px;flex:1;outline:none;overflow:hidden;text-overflow:ellipsis;"/>
              <button style="background:none;border:none;color:#8e8e93;cursor:pointer;padding:0;" onclick="copyText(document.getElementById('td-obs-url').value)">
                ${svgIcon(ICONS.copy, 14)}
              </button>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-top:10px;line-height:1.5;">
              Tambahkan <code style="color:#a855f7">?period=day</code>, <code style="color:#a855f7">?period=month</code>, atau <code style="color:#a855f7">?period=all</code> di URL untuk override periode
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  updateTopDonatePeriodButtons();
  loadTopDonateData();

  if (topDonateRefreshTimer) clearInterval(topDonateRefreshTimer);
  topDonateRefreshTimer = setInterval(loadTopDonateData, 30000);
}

function setTopDonatePeriod(period) {
  topDonatePeriod = period;
  updateTopDonatePeriodButtons();
  loadTopDonateData();
}

function updateTopDonatePeriodButtons() {
  const periods = ['day','month','all'];
  periods.forEach(p => {
    const btn = document.getElementById(`td-btn-${p}`);
    if (!btn) return;
    if (p === topDonatePeriod) {
      btn.className = 'btn btn-primary btn-sm';
    } else {
      btn.className = 'btn btn-secondary btn-sm';
    }
  });
}

async function loadTopDonateData() {
  const limitVal = topDonateConfig.limit || 10;
  const data = await apiFetch(`/api/top-donate?period=${topDonatePeriod}&limit=${limitVal}`);
  const el = document.getElementById('top-donate-table');
  if (!el) return;

  const leaderboard = data?.leaderboard || [];
  if (!leaderboard.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:24px 0;">Belum ada donasi pada periode ini</div>';
    return;
  }

  const rankBg  = ['rgba(245,158,11,0.08)','rgba(148,163,184,0.06)','rgba(180,83,9,0.06)'];
  const rankClr = ['#f59e0b','#94a3b8','#cd7c3a'];
  const rankLbl = ['🥇','🥈','🥉'];
  const showCount = topDonateConfig.showCount;

  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="color:var(--text3);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
          <th style="text-align:left;padding:6px 12px;">#</th>
          <th style="text-align:left;padding:6px 12px;">Nama</th>
          <th style="text-align:right;padding:6px 12px;">Total</th>
          ${showCount ? '<th style="text-align:right;padding:6px 12px;">Transaksi</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${leaderboard.map((d,i) => `
          <tr style="border-top:1px solid var(--border2);background:${rankBg[i]||'transparent'};transition:background 0.2s;"
              onmouseover="this.style.background='rgba(255,255,255,0.03)'"
              onmouseout="this.style.background='${rankBg[i]||'transparent'}'">
            <td style="padding:10px 12px;font-weight:700;color:${rankClr[i]||'var(--text3)'};">${rankLbl[i]||(i+1)}</td>
            <td style="padding:10px 12px;font-weight:600;color:var(--text1);">${d.name}</td>
            <td style="padding:10px 12px;text-align:right;font-weight:700;color:var(--primary);">Rp${parseInt(d.totalAmount).toLocaleString('id')}</td>
            ${showCount ? `<td style="padding:10px 12px;text-align:right;color:var(--text3);">${d.count}x</td>` : ''}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function saveTopDonateConfig() {
  const title         = document.getElementById('td-title')?.value || 'Top Donate';
  const defaultPeriod = document.getElementById('td-default-period')?.value || 'all';
  const overlayLimit  = parseInt(document.getElementById('td-overlay-limit')?.value || '5');
  const limit         = parseInt(document.getElementById('td-limit')?.value || '10');
  const showCount     = document.getElementById('td-show-count')?.checked || false;
  const titleColor    = document.getElementById('td-title-color')?.value || '#a855f7';
  const contentColor  = document.getElementById('td-content-color')?.value || '#ffffff';
  const titleSize     = parseInt(document.getElementById('td-title-size')?.value || '16');
  const contentSize   = parseInt(document.getElementById('td-content-size')?.value || '13');
  const rowGap        = parseInt(document.getElementById('td-row-gap')?.value ?? '6');

  topDonateConfig = { title, defaultPeriod, overlayLimit, limit, showCount, titleColor, contentColor, titleSize, contentSize, rowGap };
  await apiFetch('/api/top-donate-config', { method: 'PUT', body: topDonateConfig });
  showToast('Pengaturan Top Donate tersimpan!', 'success');
  loadTopDonateData();
}
