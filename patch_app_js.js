const fs = require('fs');
let c = fs.readFileSync('public/js/app.js', 'utf8');
c = c.replace(/if \(AppState\.currentPage === 'connect'\) renderConnect\(\);/g, `if (AppState.currentPage === 'connect') { if (typeof updateConnectPageUI === 'function') updateConnectPageUI(); else renderConnect(); }`);
fs.writeFileSync('public/js/app.js', c);
console.log("Patched app.js");
