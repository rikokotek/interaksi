/* ============================================================
   TikFlow - Gift Gallery Page
   ============================================================ */

let galleryData = { items: [], config: {} };

async function loadGalleryData() {
  galleryData = await apiFetch('/api/gallery');
}

async function renderGallery() {
  const page = document.getElementById('page-gallery');
  await loadGalleryData();
  const origin = window.location.origin;

  page.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Gift Gallery</h1>
          <p class="page-subtitle">Pajang dan pantau target gift tertentu di layar Live Anda.</p>
        </div>
        <button class="btn btn-primary" onclick="openAddGalleryItemModal()">
          ${svgIcon(ICONS.plus)} Tambah Gift
        </button>
      </div>

      <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;">
        
        <!-- Settings Panel -->
        <div class="card" style="align-self: start;">
          <div class="card-header"><span class="card-title">Customize Overlay</span></div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div class="form-group">
              <label>Pilih Font</label>
              <select class="form-select" id="gal-fontFamily" onchange="saveGalleryConfig()">
                ${['Luckiest Guy', 'Inter', 'Orbitron', 'Bebas Neue', 'Titan One'].map(f => 
                  `<option ${galleryData.config.fontFamily === f ? 'selected' : ''}>${f}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Ukuran Font Judul</label>
              <input type="number" class="form-input" id="gal-titleSize" value="${galleryData.config.titleSize || 28}" onchange="saveGalleryConfig()">
            </div>
            <div class="form-group">
              <label>Ukuran Font Angka</label>
              <input type="number" class="form-input" id="gal-countSize" value="${galleryData.config.countSize || 36}" onchange="saveGalleryConfig()">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-group">
                <label>Warna Judul</label>
                <div style="display:flex;gap:8px;">
                  <input type="color" class="form-input" style="height:40px;width:50px;padding:4px;" id="gal-titleColor" value="${galleryData.config.titleColor || '#ffffff'}" onchange="document.getElementById('gal-titleColor-text').value=this.value; saveGalleryConfig()">
                  <input type="text" class="form-input" style="flex:1;" id="gal-titleColor-text" value="${galleryData.config.titleColor || '#ffffff'}" onchange="document.getElementById('gal-titleColor').value=this.value; saveGalleryConfig()" placeholder="#ffffff">
                </div>
              </div>
              <div class="form-group">
                <label>Warna Angka</label>
                <div style="display:flex;gap:8px;">
                  <input type="color" class="form-input" style="height:40px;width:50px;padding:4px;" id="gal-countColor" value="${galleryData.config.countColor || '#fbbf24'}" onchange="document.getElementById('gal-countColor-text').value=this.value; saveGalleryConfig()">
                  <input type="text" class="form-input" style="flex:1;" id="gal-countColor-text" value="${galleryData.config.countColor || '#fbbf24'}" onchange="document.getElementById('gal-countColor').value=this.value; saveGalleryConfig()" placeholder="#fbbf24">
                </div>
              </div>
            </div>
            
            <div style="margin-top:10px;padding-top:16px;border-top:1px solid var(--border2);">
              <label style="font-size:13px;font-weight:600;margin-bottom:8px;display:block;">URL OBS Overlay</label>
              <div style="display:flex;gap:8px;">
                <code style="flex:1;background:var(--bg);padding:8px;border-radius:6px;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid var(--border2);" id="gal-obs-url">${origin}/overlay/gallery.html</code>
                <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('gal-obs-url').textContent);showToast('Disalin')">Salin</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="card" style="align-self: start;">
          <div class="card-header"><span class="card-title">Daftar Gift</span></div>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;text-align:left;">
              <thead>
                <tr style="border-bottom:1px solid var(--border2);color:var(--text3);font-size:12px;text-transform:uppercase;">
                  <th style="padding:12px;">Gift</th>
                  <th style="padding:12px;">Judul</th>
                  <th style="padding:12px;text-align:center;">Saat Ini</th>
                  <th style="padding:12px;text-align:center;">Target</th>
                  <th style="padding:12px;text-align:center;">Diamond</th>
                  <th style="padding:12px;text-align:right;">Aksi</th>
                </tr>
              </thead>
              <tbody id="gal-items-tbody">
                ${galleryData.items.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text3);">Belum ada gift yang dilacak</td></tr>` : 
                  galleryData.items.map(item => `
                  <tr style="border-bottom:1px solid var(--border2); cursor: grab;"
                      draggable="true" 
                      data-id="${item.id}"
                      ondragstart="handleGalleryDragStart(event, '${item.id}')"
                      ondragover="handleGalleryDragOver(event)"
                      ondragleave="handleGalleryDragLeave(event)"
                      ondrop="handleGalleryDrop(event, '${item.id}')"
                      ondragend="handleGalleryDragEnd(event)">
                    <td style="padding:12px;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:40px;height:40px;background:var(--bg);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">
                          ${getGiftIcon(item.giftName)}
                        </div>
                        <div style="font-weight:600;">${item.giftName}</div>
                      </div>
                    </td>
                    <td style="padding:12px;font-weight:600;color:var(--text1);">${item.title}</td>
                    <td style="padding:12px;text-align:center;">
                      <span style="font-size:16px;font-weight:700;color:var(--yellow);">${item.currentValue}</span>
                    </td>
                    <td style="padding:12px;text-align:center;font-weight:600;color:${item.target > 0 && item.currentValue >= item.target ? 'var(--green)' : 'var(--text2)'};">
                      ${item.target > 0 ? item.target : '—'}
                    </td>
                    <td style="padding:12px;text-align:center;">
                      <span style="font-size:14px;font-weight:600;color:var(--yellow);">💎 ${getGiftDiamond(item.giftName)}</span>
                    </td>
                    <td style="padding:12px;text-align:right;display:flex;gap:4px;justify-content:flex-end;">
                      <button class="btn btn-secondary btn-sm" style="padding:6px;min-width:auto;" title="Reset" onclick="resetGalleryItemValue('${item.id}')">🔄</button>
                      <button class="btn btn-secondary btn-sm" style="padding:6px;min-width:auto;" onclick="openEditGalleryItemModal('${item.id}')">${svgIcon(ICONS.edit)}</button>
                      <button class="btn btn-danger btn-sm" style="padding:6px;min-width:auto;" onclick="deleteGalleryItem('${item.id}')">${svgIcon(ICONS.trash)}</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getGiftIcon(name) {
  const gift = TIKTOK_GIFTS.find(g => g.name.toLowerCase() === name.toLowerCase());
  if (gift && gift.image) return `<img src="${gift.image}" style="width:32px;height:32px;object-fit:contain;" />`;
  if (gift && gift.emoji) return gift.emoji;
  return '🎁';
}

function getGiftDiamond(name) {
  const gift = TIKTOK_GIFTS.find(g => g.name.toLowerCase() === name.toLowerCase());
  return gift ? gift.diamonds || 0 : 0;
}

async function saveGalleryConfig() {
  const config = {
    fontFamily: document.getElementById('gal-fontFamily').value,
    titleSize: parseInt(document.getElementById('gal-titleSize').value) || 28,
    countSize: parseInt(document.getElementById('gal-countSize').value) || 36,
    titleColor: document.getElementById('gal-titleColor-text').value,
    countColor: document.getElementById('gal-countColor-text').value
  };
  await apiFetch('/api/gallery/config', { method: 'PUT', body: config });
}

async function updateGalleryItemValue(id, delta) {
  const item = galleryData.items.find(i => i.id === id);
  if (!item) return;
  const newVal = Math.max(0, item.currentValue + delta);
  await apiFetch(`/api/gallery/items/${id}`, { method: 'PUT', body: { currentValue: newVal } });
}

async function resetGalleryItemValue(id) {
  await apiFetch(`/api/gallery/items/${id}`, { method: 'PUT', body: { currentValue: 0 } });
}

async function deleteGalleryItem(id) {
  if (!confirm('Hapus gift ini dari gallery?')) return;
  await apiFetch(`/api/gallery/items/${id}`, { method: 'DELETE' });
}

// Modal Form
async function openAddGalleryItemModal() {
  openEditGalleryItemModal(null);
}

async function openEditGalleryItemModal(id) {
  const item = id ? galleryData.items.find(i => i.id === id) : null;
  const actions = await apiFetch('/api/actions');
  
  const html = `
    <div style="display:flex;flex-direction:column;gap:16px;">
      ${renderGiftPicker(item ? (TIKTOK_GIFTS.find(g => g.name.toLowerCase() === item.giftName.toLowerCase())?.id || '') : '', false)}
      
      <div class="form-group">
        <label>Judul Tampilan (Di Overlay)</label>
        <input type="text" class="form-input" id="gal-title" placeholder="Contoh: Kentut" value="${item ? item.title : ''}" />
      </div>

      <div class="form-group">
        <label>Target Pencapaian</label>
        <input type="number" class="form-input" id="gal-target" placeholder="Contoh: 100" value="${item ? item.target : 0}" />
        <span style="font-size:12px;color:var(--text3);margin-top:4px;">Isi 0 jika tidak ada target.</span>
      </div>

      <div class="form-group">
        <label>Trigger Action (Opsional)</label>
        <select class="form-select" id="gal-actionId">
          <option value="">-- Jangan lakukan apa-apa --</option>
          ${actions.map(a => `<option value="${a.id}" ${item && item.actionId === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
        </select>
        <span style="font-size:12px;color:var(--text3);margin-top:4px;">Action yang akan berjalan otomatis saat target tercapai.</span>
      </div>
    </div>
  `;

  const buttons = `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="saveGalleryItem('${id || ''}')">Simpan</button>
  `;

  openModal(item ? 'Edit Gallery Gift' : 'Tambah Gallery Gift', html, buttons);
}

async function saveGalleryItem(id) {
  const giftId = document.getElementById('gift-id-input').value;
  const gift = TIKTOK_GIFTS.find(g => String(g.id) === giftId);

  const data = {
    giftId: gift ? gift.id : '',
    giftName: gift ? gift.name : '',
    title: document.getElementById('gal-title').value,
    target: parseInt(document.getElementById('gal-target').value) || 0,
    actionId: document.getElementById('gal-actionId').value
  };

  if (!data.giftId) return showToast('Pilih gift terlebih dahulu', 'error');

  if (id) {
    await apiFetch(`/api/gallery/items/${id}`, { method: 'PUT', body: data });
  } else {
    await apiFetch('/api/gallery/items', { method: 'POST', body: data });
  }
  closeModal();
}

function updateGalleryItemsUI(items) {
  const tbody = document.getElementById('gal-items-tbody');
  if (!tbody) return;
  tbody.innerHTML = items.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text3);">Belum ada gift yang dilacak</td></tr>` : 
    items.map(item => `
    <tr style="border-bottom:1px solid var(--border2); cursor: grab;"
        draggable="true" 
        data-id="${item.id}"
        ondragstart="handleGalleryDragStart(event, '${item.id}')"
        ondragover="handleGalleryDragOver(event)"
        ondragleave="handleGalleryDragLeave(event)"
        ondrop="handleGalleryDrop(event, '${item.id}')"
        ondragend="handleGalleryDragEnd(event)">
      <td style="padding:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:40px;height:40px;background:var(--bg);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">
            ${getGiftIcon(item.giftName)}
          </div>
          <div style="font-weight:600;">${item.giftName}</div>
        </div>
      </td>
      <td style="padding:12px;font-weight:600;color:var(--text1);">${item.title}</td>
      <td style="padding:12px;text-align:center;">
        <span style="font-size:16px;font-weight:700;color:var(--yellow);">${item.currentValue}</span>
      </td>
      <td style="padding:12px;text-align:center;font-weight:600;color:${item.target > 0 && item.currentValue >= item.target ? 'var(--green)' : 'var(--text2)'};">
        ${item.target > 0 ? item.target : '—'}
      </td>
      <td style="padding:12px;text-align:center;">
        <span style="font-size:14px;font-weight:600;color:var(--yellow);">💎 ${getGiftDiamond(item.giftName)}</span>
      </td>
      <td style="padding:12px;text-align:right;display:flex;gap:4px;justify-content:flex-end;">
        <button class="btn btn-secondary btn-sm" style="padding:6px;min-width:auto;" title="Reset" onclick="resetGalleryItemValue('${item.id}')">🔄</button>
        <button class="btn btn-secondary btn-sm" style="padding:6px;min-width:auto;" onclick="openEditGalleryItemModal('${item.id}')">${svgIcon(ICONS.edit)}</button>
        <button class="btn btn-danger btn-sm" style="padding:6px;min-width:auto;" onclick="deleteGalleryItem('${item.id}')">${svgIcon(ICONS.trash)}</button>
      </td>
    </tr>
  `).join('');
}

socket.on('gallery_update', (data) => {
  galleryData = data;
  if (AppState.currentPage === 'gallery') {
    updateGalleryItemsUI(data.items);
  }
});

let galleryDragSourceId = null;

function handleGalleryDragStart(e, id) {
  galleryDragSourceId = id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => e.target.style.opacity = '0.5', 0);
}

function handleGalleryDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const tr = e.target.closest('tr');
  if (tr && tr.dataset.id !== galleryDragSourceId) {
    tr.style.borderTop = '2px solid var(--primary)';
  }
}

function handleGalleryDragLeave(e) {
  const tr = e.target.closest('tr');
  if (tr) {
    tr.style.borderTop = '1px solid var(--border2)';
  }
}

async function handleGalleryDrop(e, targetId) {
  e.preventDefault();
  const tr = e.target.closest('tr');
  if (tr) {
    tr.style.borderTop = '1px solid var(--border2)';
  }
  
  if (galleryDragSourceId === targetId) return;
  
  const currentItems = galleryData.items;
  const sourceIdx = currentItems.findIndex(i => i.id === galleryDragSourceId);
  const targetIdx = currentItems.findIndex(i => i.id === targetId);
  
  if (sourceIdx > -1 && targetIdx > -1) {
    const [movedItem] = currentItems.splice(sourceIdx, 1);
    currentItems.splice(targetIdx, 0, movedItem);
    
    updateGalleryItemsUI(currentItems);
    
    const newOrderIds = currentItems.map(i => i.id);
    await apiFetch('/api/gallery/reorder', { method: 'PUT', body: { newOrderIds } });
  }
}

function handleGalleryDragEnd(e) {
  e.target.style.opacity = '1';
  galleryDragSourceId = null;
  document.querySelectorAll('#gal-items-tbody tr').forEach(tr => {
    tr.style.borderTop = '1px solid var(--border2)';
  });
}
