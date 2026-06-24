/* ============================================================
   TikFlow - Donations Log Page
   ============================================================ */

async function renderDonations() {
  const page = document.getElementById('page-donations');

  page.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Log Donasi</h1>
          <p class="page-subtitle">Riwayat donasi yang tersimpan secara permanen</p>
        </div>
        <button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:var(--red);" onclick="clearAllDonations()">
          🗑️ Hapus Semua
        </button>
      </div>

      <div class="card" style="margin-top: 20px;">
        <div class="card-header">
          <span class="card-title">🧾 Daftar Donasi</span>
          <span class="badge badge-gray" id="donations-page-count">0 Donasi</span>
        </div>
        <div id="donations-page-container" style="background: var(--surface); border-radius: 8px; padding: 20px;">
          <div style="font-size:12px;color:var(--text3);text-align:center;">Memuat log donasi...</div>
        </div>
      </div>
    </div>
  `;

  await loadDonationsPage();
}

async function loadDonationsPage() {
  const container = document.getElementById('donations-page-container');
  const countBadge = document.getElementById('donations-page-count');
  if (!container) return;

  try {
    const logs = await apiFetch('/api/donations');
    if (countBadge) countBadge.textContent = `${logs.length} Donasi`;

    let tbodyContent = '';
    if (logs.length === 0) {
      tbodyContent = `<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--text3);">Belum ada donasi yang tercatat.</td></tr>`;
    } else {
      tbodyContent = logs.map((log, idx) => {
        const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
        const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        const d = new Date(log.time);
        const timeStr = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        const icon = log.type === 'saweria'
          ? `<img src="/uploads/saweria_logo.png" style="width:22px;height:22px;object-fit:contain;" onerror="this.outerHTML='🦉'">`
          : `<svg width="22" height="22" viewBox="0 0 100 100"><path d="M72 22 C72 22 38 18 28 36 C20 50 48 52 52 52" stroke="#3ecf8e" stroke-width="16" stroke-linecap="round" fill="none"/><path d="M52 52 C52 52 72 54 68 70 C62 85 30 82 22 80" stroke="#22c55e" stroke-width="16" stroke-linecap="round" fill="none"/></svg>`;

        return `
          <tr id="donation-row-${idx}" style="border-bottom:1px solid var(--border2);">
            <td style="padding:14px 16px;display:flex;align-items:center;gap:12px;">
              <div style="width:32px;height:32px;border-radius:50%;background:${log.type === 'saweria' ? '#f59e0b22' : '#e8f8f0'};display:flex;align-items:center;justify-content:center;">
                ${icon}
              </div>
              <span style="color:var(--text2);">${timeStr}</span>
            </td>
            <td style="padding:14px 16px;">
              <strong style="color:var(--text1);">${log.user}</strong>
            </td>
            <td style="padding:14px 16px;">
              <span style="color:#10b981;background:rgba(16,185,129,0.15);padding:4px 8px;border-radius:4px;font-weight:600;font-size:13px;">Rp ${parseInt(log.amount || 0).toLocaleString('id')}</span>
            </td>
            <td style="padding:14px 16px;color:var(--text2);">
              ${log.message || '-'}
            </td>
            <td style="padding:14px 16px;text-align:center;">
              <button onclick="deleteDonation(${idx})" style="background:none;border:none;cursor:pointer;color:var(--red);padding:4px;border-radius:4px;transition:background 0.2s;" title="Hapus donasi ini" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='none'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid var(--border2);color:var(--text3);font-size:12px;text-transform:uppercase;">
              <th style="padding:16px;">Waktu</th>
              <th style="padding:16px;">Nama</th>
              <th style="padding:16px;">Jumlah</th>
              <th style="padding:16px;">Pesan</th>
              <th style="padding:16px;text-align:center;">Hapus</th>
            </tr>
          </thead>
          <tbody>
            ${tbodyContent}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div style="font-size:14px;color:var(--red);text-align:center;padding:40px;">Gagal memuat log donasi.</div>`;
  }
}

async function deleteDonation(idx) {
  const row = document.getElementById(`donation-row-${idx}`);
  if (row) row.style.opacity = '0.4';
  await apiFetch(`/api/donations/${idx}`, { method: 'DELETE' });
  await loadDonationsPage();
}

async function clearAllDonations() {
  openModal('Hapus Semua Donasi', `
    <p style="color:var(--text2);font-size:14px;line-height:1.6;">
      Apakah Anda yakin ingin menghapus <strong>seluruh riwayat donasi</strong>?<br/>
      <span style="color:var(--red);font-size:12px;">Tindakan ini tidak bisa dibatalkan.</span>
    </p>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" style="background:var(--red);border-color:var(--red);" onclick="confirmClearDonations()">Hapus Semua</button>
  `);
}

async function confirmClearDonations() {
  closeModal();
  await apiFetch('/api/donations', { method: 'DELETE' });
  showToast('Semua riwayat donasi telah dihapus.', 'success');
  await loadDonationsPage();
}

// Update realtime when viewing donations page
socket.on('new_donation_log', () => {
  if (AppState.currentPage === 'donations') {
    loadDonationsPage();
  }
});
