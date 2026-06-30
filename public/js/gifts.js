function renderGiftsPage() {
  const container = document.getElementById('page-gifts');
  
  container.innerHTML = `
    <div class="page-header">
      <div style="flex: 1;">
        <h2>TikTok Gifts & Stickers</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Database tiktok gift berdasarkan username tiktok kamu</p>
      </div>
      <div>
        <button id="btn-update-gifts" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
          </svg>
          Update Data
        </button>
      </div>
    </div>
    
    <div style="color: var(--success); font-size: 13px; margin-bottom: 20px;">
      Membutuhkan data gift terbaru? Pastikan Anda sedang LIVE dan klik tombol update di atas.
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <div class="card-header">
        <h3 style="display: flex; align-items: center; gap: 8px;">
          Sticker Fan Club 
          <span id="stickers-count" style="background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">0</span>
        </h3>
      </div>
      <div class="card-body">
        <div id="stickers-grid" class="gifts-grid">
          <div class="empty-state">Belum ada data sticker.</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 style="display: flex; align-items: center; gap: 8px;">
          TikTok Gifts Data 
          <span id="gifts-count" style="background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">0</span>
        </h3>
      </div>
      <div class="card-body">
        <div id="gifts-grid" class="gifts-grid">
          <div class="empty-state">Loading data...</div>
        </div>
      </div>
    </div>
    
    <style>
      .gifts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 16px;
        margin-top: 10px;
      }
      .gift-card {
        background: var(--bg-dark);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: transform 0.2s;
      }
      .gift-card:hover {
        transform: translateY(-2px);
        border-color: var(--primary-color);
      }
      .gift-image {
        width: 80px;
        height: 80px;
        object-fit: contain;
        margin-bottom: 12px;
      }
      .gift-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
        color: var(--text-light);
      }
      .gift-coin {
        color: #facc15;
        font-weight: bold;
        font-size: 13px;
        margin-bottom: 4px;
      }
      .gift-id {
        font-size: 11px;
        color: var(--text-muted);
        margin-bottom: 12px;
      }
      .btn-download {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-color);
        color: var(--text-light);
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        text-decoration: none;
        width: 100%;
        justify-content: center;
        transition: background 0.2s;
      }
      .btn-download:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    </style>
  `;

  document.getElementById('btn-update-gifts').addEventListener('click', async () => {
    try {
      const btn = document.getElementById('btn-update-gifts');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="queue-spinner" style="width:14px;height:14px;"></span> Mengambil data dari TikTok...';
      btn.disabled = true;

      const res = await fetch('/api/gifts/update', { method: 'POST' });
      const data = await res.json();
      
      if (data.gifts && data.gifts.length > 0) {
        showToast(data.message || `Berhasil! ${data.gifts.length} gift tersimpan.`, data.success ? 'success' : 'warning');
        loadGiftsData();
      } else if (data.success) {
        showToast(data.message || 'Berhasil mengupdate data', 'success');
        loadGiftsData();
      } else {
        showToast(data.error || data.message || 'Gagal mengupdate data. Pastikan host sedang LIVE dan Euler API Key terisi.', 'error');
      }
      
      btn.innerHTML = originalText;
      btn.disabled = false;
    } catch (e) {
      showToast('Terjadi kesalahan jaringan', 'error');
      const btn = document.getElementById('btn-update-gifts');
      if (btn) btn.disabled = false;
    }
  });

  loadGiftsData();
}

async function loadGiftsData() {
  try {
    const res = await fetch('/api/gifts');
    const gifts = await res.json();
    
    const giftsGrid = document.getElementById('gifts-grid');
    const stickersGrid = document.getElementById('stickers-grid');
    
    if (!gifts || gifts.length === 0) {
      giftsGrid.innerHTML = '<div class="empty-state">Belum ada data gift. Silakan mulai LIVE dan klik Update Data.</div>';
      stickersGrid.innerHTML = '<div class="empty-state">Belum ada data sticker.</div>';
      return;
    }

    const regularGifts = gifts.filter(g => g.type !== 3); 
    const stickers = gifts.filter(g => g.type === 3);

    const renderCard = (g) => {
      let imgUrl = '';
      if (g.image?.urlList?.[0]) imgUrl = g.image.urlList[0];
      else if (g.image?.url_list?.[0]) imgUrl = g.image.url_list[0];
      else if (g.icon?.urlList?.[0]) imgUrl = g.icon.urlList[0];
      else if (g.icon?.url_list?.[0]) imgUrl = g.icon.url_list[0];
      else if (typeof g.image === 'string') imgUrl = g.image;
      else if (typeof g.icon === 'string') imgUrl = g.icon;
      else if (g.picture_url) imgUrl = g.picture_url;
      let safeName = (g.name || 'gift').replace(/[^a-zA-Z0-9_-]/g, '_');
      let downloadUrl = `/api/download?url=${encodeURIComponent(imgUrl)}&filename=${encodeURIComponent(safeName)}.png`;
      
      return `
      <div class="gift-card">
        <a href="${downloadUrl}" title="Klik untuk mendownload gambar PNG">
          <img src="${imgUrl}" alt="${g.name}" class="gift-image" onerror="this.src='/uploads/placeholder.png'" style="cursor: pointer;">
        </a>
        <div class="gift-name">${g.name}</div>
        <div class="gift-coin">${g.diamond_count ?? g.diamondCount ?? g.diamonds ?? g.coin_count ?? 0} Coin</div>
        <div class="gift-id">ID: ${g.id}</div>
        <a href="${downloadUrl}" class="btn-download">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Image
        </a>
      </div>
      `;};

    giftsGrid.innerHTML = regularGifts.length > 0 
      ? regularGifts.map(renderCard).join('') 
      : '<div class="empty-state">Tidak ada gift ditemukan.</div>';
      
    stickersGrid.innerHTML = stickers.length > 0 
      ? stickers.map(renderCard).join('') 
      : '<div class="empty-state">Tidak ada sticker ditemukan dalam data saat ini.</div>';
      
    document.getElementById('gifts-count').textContent = regularGifts.length;
    document.getElementById('stickers-count').textContent = stickers.length;
      
  } catch (e) {
    document.getElementById('gifts-grid').innerHTML = '<div class="empty-state">Gagal memuat data gift.</div>';
  }
}
