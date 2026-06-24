/* ============================================================
   TikFlow - Screens Page
   ============================================================ */

let screensData = [];

async function renderScreens() {
  const page = document.getElementById('page-screens');
  page.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Screens</h1>
          <p class="page-subtitle">Kelola layar overlay untuk video & konten</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateScreen()">
          ${svgIcon(ICONS.plus)} Tambah Screen
        </button>
      </div>

      <!-- Info Banner -->
      <div style="padding:14px 18px;background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.15);border-radius:10px;margin-bottom:22px;display:flex;gap:12px;align-items:flex-start;">
        <span style="font-size:20px;flex-shrink:0;">💡</span>
        <div>
          <div style="font-weight:600;color:var(--cyan);margin-bottom:3px;">Cara menggunakan Screen</div>
          <div style="font-size:12.5px;color:var(--text3);">
            Buka URL screen di browser terpisah atau tambahkan sebagai Browser Source di OBS.
            Action "Play Video" akan menampilkan video di screen yang dipilih secara bergantian.
          </div>
        </div>
      </div>

      <!-- Screens Grid -->
      <div id="screens-grid" class="grid-3">
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">🖥️</div>
          <h3>Memuat screens...</h3>
        </div>
      </div>
    </div>
  `;
  await loadScreens();
}

async function loadScreens() {
  try {
    screensData = await apiFetch('/api/screens');
    renderScreensGrid();
  } catch {
    showToast('Gagal memuat screens', 'error');
  }
}

function renderScreensGrid() {
  const grid = document.getElementById('screens-grid');
  if (!grid) return;

  if (screensData.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">🖥️</div>
        <h3>Belum ada screen</h3>
        <p>Tambah screen untuk menampilkan video overlay</p>
        <button class="btn btn-primary" style="margin-top:14px;" onclick="openCreateScreen()">
          ${svgIcon(ICONS.plus)} Tambah Screen
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = screensData.map(screen => `
    <div class="screen-card" id="screen-${screen.id}">
      <div class="screen-preview">
        ${screen.url
          ? `<iframe src="${screen.url}" sandbox="allow-scripts allow-same-origin"></iframe>`
          : `<div class="screen-preview-placeholder">
              <span style="font-size:36px;">🖥️</span>
              <span style="font-size:12px;color:var(--text3);">Tidak ada preview</span>
            </div>`
        }
        <!-- Status badge -->
        <div style="position:absolute;top:8px;right:8px;">
          <span class="badge ${screen.enabled ? 'badge-green' : 'badge-gray'}" style="font-size:10px;">
            ${screen.enabled ? '● ON' : '○ OFF'}
          </span>
        </div>
      </div>
      <div class="screen-card-body">
        <div style="font-weight:700;font-size:15px;color:var(--text);">${screen.name}</div>
        
        <!-- OBS URL Display -->
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;background:rgba(6,182,212,0.08);padding:8px 10px;border-radius:6px;border:1px solid rgba(6,182,212,0.2);">
           <span style="font-size:11px;font-weight:800;color:var(--cyan);letter-spacing:0.5px;">OBS URL</span>
           <code style="font-size:11.5px;color:var(--text2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${window.location.origin}/screen/${screen.id}</code>
        </div>

        <!-- Default Content URL (if exists) -->
        ${screen.url ? `
          <div style="font-size:11px;color:var(--text3);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            <span style="font-weight:600;">Default Konten:</span> ${screen.url}
          </div>
        ` : ''}

        ${screen.queueCount > 0 ? `
          <div style="margin-top:8px;" class="badge badge-yellow">
            ⏳ ${screen.queueCount} item di antrian
          </div>
        ` : ''}
      </div>
      <div class="screen-card-footer">
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="openScreenUrl('${screen.id}')" title="Buka Screen">
            ${svgIcon(ICONS.link, 13)} Buka
          </button>
          <button class="btn btn-secondary btn-sm" onclick="copyScreenUrl('${screen.id}')" title="Copy URL">
            ${svgIcon(ICONS.copy, 13)} Copy
          </button>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <div class="toggle-wrap" onclick="toggleScreen('${screen.id}')">
            <div class="toggle ${screen.enabled ? 'on' : ''}" id="screen-toggle-${screen.id}"></div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="openEditScreen('${screen.id}')">${svgIcon(ICONS.edit, 14)}</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteScreen('${screen.id}')" style="color:var(--red);">${svgIcon(ICONS.trash, 14)}</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// SCREEN MODAL
// ============================================================
let editingScreenId = null;

function openCreateScreen() {
  editingScreenId = null;
  openScreenModal({ name: '', url: '', enabled: true });
}

function openEditScreen(id) {
  const screen = screensData.find(s => s.id === id);
  if (!screen) return;
  editingScreenId = id;
  openScreenModal(screen);
}

function openScreenModal(screen) {
  const content = `
    <div class="form-group">
      <label>Nama Screen</label>
      <input type="text" class="form-input" id="screen-name" placeholder="Contoh: Screen Utama" value="${screen.name || ''}"/>
    </div>
    <div class="form-group">
      <label>URL Konten (opsional)</label>
      <input type="text" class="form-input" id="screen-url" placeholder="https://... atau kosongkan" value="${screen.url || ''}"/>
      <p style="font-size:12px;color:var(--text3);margin-top:5px;">URL yang ditampilkan di iframe screen ini</p>
    </div>

    <div style="padding:14px;background:var(--surface);border-radius:8px;margin-top:8px;">
      <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px;">📌 Screen URL di OBS</div>
      <div style="display:flex;align-items:center;gap:8px;">
        <code id="screen-obs-url" style="font-size:11.5px;color:var(--accent);flex:1;">
          (URL akan tersedia setelah screen dibuat)
        </code>
      </div>
      <p style="font-size:11.5px;color:var(--text3);margin-top:6px;">Tambahkan sebagai Browser Source di OBS</p>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="saveScreen()">
      ${svgIcon(ICONS.check)} ${editingScreenId ? 'Simpan' : 'Tambah Screen'}
    </button>
  `;

  openModal(editingScreenId ? 'Edit Screen' : 'Tambah Screen Baru', content, footer);

  if (editingScreenId) {
    const obsUrl = document.getElementById('screen-obs-url');
    if (obsUrl) obsUrl.textContent = `${window.location.origin}/screen/${editingScreenId}`;
  }
}

async function saveScreen() {
  const name = document.getElementById('screen-name')?.value?.trim();
  const url = document.getElementById('screen-url')?.value?.trim();

  if (!name) { showToast('Nama screen wajib diisi', 'warning'); return; }

  const body = { name, url, enabled: true };

  try {
    if (editingScreenId) {
      await apiFetch(`/api/screens/${editingScreenId}`, { method: 'PUT', body });
      showToast('Screen diperbarui!', 'success');
    } else {
      await apiFetch('/api/screens', { method: 'POST', body });
      showToast('Screen berhasil ditambahkan!', 'success');
    }
    closeModal();
    await loadScreens();
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
  }
}

async function toggleScreen(id) {
  const screen = screensData.find(s => s.id === id);
  if (!screen) return;
  try {
    await apiFetch(`/api/screens/${id}`, { method: 'PUT', body: { enabled: !screen.enabled } });
    screen.enabled = !screen.enabled;
    const toggle = document.getElementById(`screen-toggle-${id}`);
    if (toggle) toggle.classList.toggle('on', screen.enabled);
    showToast(`Screen ${screen.enabled ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
  } catch {}
}

async function deleteScreen(id) {
  const screen = screensData.find(s => s.id === id);
  confirmModal(
    `Hapus screen <b>${screen?.name || 'ini'}</b>?`,
    async () => {
      try {
        await apiFetch(`/api/screens/${id}`, { method: 'DELETE' });
        showToast('Screen dihapus', 'info');
        await loadScreens();
      } catch {}
    },
    { title: 'Hapus Screen', confirmText: 'Ya, Hapus', icon: '🖥️' }
  );
}

function openScreenUrl(id) {
  window.open(`/screen/${id}`, '_blank', 'width=1280,height=720');
}

function copyScreenUrl(id) {
  const url = `${window.location.origin}/screen/${id}`;
  navigator.clipboard.writeText(url).then(() => showToast('URL disalin!', 'success'));
}

// Screen overlay endpoint (served by backend)
// Backend akan melayani /screen/:id sebagai halaman overlay

// Socket update
socket.on('screen_update', (screen) => {
  const idx = screensData.findIndex(s => s.id === screen.id);
  if (idx !== -1) {
    screensData[idx] = screen;
    if (AppState.currentPage === 'screens') renderScreensGrid();
  }
});

socket.on('play_video', ({ url, screenId }) => {
  // If we have a screen window open, signal it
  if (window._screenWindows && window._screenWindows[screenId]) {
    // handled by screen overlay page
  }
});
