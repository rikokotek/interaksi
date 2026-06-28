const fs = require('fs');
let c = fs.readFileSync('public/js/connect.js', 'utf8');
const searchIndex = c.indexOf('function updateConnectPageUI');
if (searchIndex !== -1) {
    c = c.substring(0, searchIndex);
}

const correctFunction = `
function updateConnectPageUI() {
  if (AppState.currentPage !== 'connect') return;
  const tkBanner = document.getElementById('connect-status-banner');
  if (tkBanner) tkBanner.innerHTML = renderConnectBanner(AppState.connectionState || {});
  
  const tkBtn = document.getElementById('connect-btn');
  if (tkBtn) {
    const s = AppState.connectionState || {};
    tkBtn.disabled = s.connecting;
    tkBtn.innerHTML = s.connecting ? \`<span class="queue-spinner" style="width:14px;height:14px;"></span> Menghubungkan...\` : \`\${svgIcon(ICONS.link)} Simpan & Pantau LIVE\`;
  }
  
  const ytBanner = document.getElementById('yt-connect-status-banner');
  if (ytBanner) ytBanner.innerHTML = renderYtConnectBanner(AppState.ytConnectionState || {});
  
  const ytBtn = document.getElementById('yt-connect-btn');
  if (ytBtn) {
    const ys = AppState.ytConnectionState || {};
    ytBtn.disabled = ys.connecting;
    ytBtn.innerHTML = ys.connecting ? \`<span class="queue-spinner" style="width:14px;height:14px;"></span> Menghubungkan...\` : \`\${svgIcon(ICONS.link)} Connect YouTube\`;
  }
}
`;

c += correctFunction;
fs.writeFileSync('public/js/connect.js', c);
console.log("Patched connect.js successfully");
