const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Patch 1: connectTikTok definition
code = code.replace(
  `async function connectTikTok(username, silent = false) {
  if (tiktokClient) {
    try { tiktokClient.disconnect(); } catch {}
    tiktokClient = null;
  }`,
  `async function connectTikTok(username, silent = false, sessionId = null) {
  console.log(\`[TikTok] Mencoba connect ke @\${username}...\${sessionId ? ' (menggunakan Session ID)' : ''}\`);
  if (tiktokClient) {
    try { 
      tiktokClient.removeAllListeners();
      tiktokClient.disconnect(); 
    } catch (e) {}
    tiktokClient = null;
  }`
);

// Patch 2: tiktokClient options
code = code.replace(
  `    const options = {
      processInitialData: false,
      fetchRoomInfoOnConnect: false,
      enableExtendedGiftInfo: false,
      enableWebsocketUpgrade: true
    };
    
    tiktokClient = new TikTokLiveConnection(username, options);`,
  `    const options = {
      processInitialData: false,
      fetchRoomInfoOnConnect: false,
      enableExtendedGiftInfo: false,
      enableWebsocketUpgrade: true
    };
    if (sessionId) {
      options.session = { value: { sessionId: sessionId, ttTargetIdc: 'tiktok' } };
    }
    
    tiktokClient = new TikTokLiveConnection(username, options);`
);

// Patch 3: connected event
code = code.replace(
  `tiktokClient.on('connected', (state) => {`,
  `tiktokClient.on('connected', (state) => {
      console.log(\`[TikTok] CONNECTED ke @\${username}\`);`
);

// Patch 4: disconnected event
code = code.replace(
  `tiktokClient.on('disconnected', () => {`,
  `tiktokClient.on('disconnected', () => {
      console.log(\`[TikTok] DISCONNECTED dari @\${username}\`);`
);

// Patch 5: checkLiveStatus and startAutoDetect
code = code.replace(
  `async function checkLiveStatus(username) {
  if (!connectionState.isLive) {
    isAutoRetrying = true;
    try { await connectTikTok(username, true); } catch {}
  }
}

function startAutoDetect(username) {
  if (liveCheckInterval) clearInterval(liveCheckInterval);
  liveCheckInterval = setInterval(() => {
    if (!connectionState.isLive && username) {
      checkLiveStatus(username);
    }
  }, 30000);
}`,
  `async function checkLiveStatus(username, sessionId) {
  if (!connectionState.isLive) {
    isAutoRetrying = true;
    try { await connectTikTok(username, true, sessionId); } catch {}
  }
}

function startAutoDetect(username, sessionId) {
  if (liveCheckInterval) clearInterval(liveCheckInterval);
  liveCheckInterval = setInterval(() => {
    if (!connectionState.isLive && username) {
      checkLiveStatus(username, sessionId);
    }
  }, 30000);
}`
);

// Patch 6: API Routes & connect
code = code.replace(
  `// ==================== API ROUTES ====================

// --- TikTok ---
app.post('/api/tiktok/connect', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  connectionState.username = username;
  connectionState.waitingForLive = false;
  updateConfig({ tiktokUsername: username });
  isAutoRetrying = false;
  await connectTikTok(username.replace('@', ''));
  startAutoDetect(username.replace('@', ''));
  res.json({ message: 'Connection initiated', state: connectionState });
});`,
  `// ==================== API ROUTES ====================

// --- Healthcheck & Debug ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), timestamp: Date.now() });
});

app.get('/api/debug/runtime', (req, res) => {
  res.json({
    connectionState,
    memoryUsage: process.memoryUsage(),
    hasTikTokClient: !!tiktokClient,
    isAutoRetrying,
    autoDetectActive: !!liveCheckInterval
  });
});

// --- TikTok ---
app.post('/api/tiktok/connect', async (req, res) => {
  const { username, sessionId } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  connectionState.username = username;
  connectionState.waitingForLive = false;
  
  updateConfig({ tiktokUsername: username, sessionId: sessionId || '' });
  
  isAutoRetrying = false;
  await connectTikTok(username.replace('@', ''), false, sessionId);
  startAutoDetect(username.replace('@', ''), sessionId);
  res.json({ message: 'Connection initiated', state: connectionState });
});`
);

// Patch 7: server.listen
code = code.replace(
  `server.listen(PORT, async () => {
  console.log(\`\\n🚀 TikTok Dashboard running at http://localhost:\${PORT}\`);
  console.log(\`📺 Subathon overlay: http://localhost:\${PORT}/overlay/subathon\`);
  console.log(\`🔗 Saweria webhook: http://localhost:\${PORT}/api/webhook/saweria\`);
  console.log(\`🔗 Sociabuzz webhook: http://localhost:\${PORT}/api/webhook/sociabuzz\\n\`);

  // === AUTO CONNECT saat server start ===
  const autoUsername = connectionState.username || DEFAULT_USERNAME;
  if (autoUsername) {
    console.log(\`🔄 Auto-connecting ke @\${autoUsername}...\`);
    updateConfig({ tiktokUsername: autoUsername });
    connectionState.username = autoUsername;

    // Coba connect pertama kali (silent = tidak spam toast)
    await connectTikTok(autoUsername, true);

    // Mulai auto-detect setiap 30 detik
    startAutoDetect(autoUsername);
    console.log(\`⏳ Auto-detect aktif untuk @\${autoUsername} (setiap 30 detik)\`);
  }
});`,
  `server.listen(PORT, async () => {
  console.log(\`\\n[BOOT] 🚀 TikFlow Server v2.0 Production Ready berjalan di port \${PORT}\`);
  console.log(\`[BOOT] 📺 Subathon overlay: http://localhost:\${PORT}/overlay/subathon\`);
  console.log(\`[BOOT] 🔗 Saweria webhook: http://localhost:\${PORT}/api/webhook/saweria\`);
  console.log(\`[BOOT] 🔗 Sociabuzz webhook: http://localhost:\${PORT}/api/webhook/sociabuzz\\n\`);

  // === AUTO CONNECT saat server start ===
  const config = readData('config.json') || {};
  const autoUsername = connectionState.username || config.tiktokUsername || DEFAULT_USERNAME;
  const savedSessionId = config.sessionId || '';
  
  if (autoUsername) {
    console.log(\`[BOOT] 🔄 Auto-connecting ke @\${autoUsername}...\`);
    connectionState.username = autoUsername;

    // Coba connect pertama kali (silent = tidak spam toast)
    await connectTikTok(autoUsername, true, savedSessionId);

    // Mulai auto-detect setiap 30 detik
    startAutoDetect(autoUsername, savedSessionId);
    console.log(\`[BOOT] ⏳ Auto-detect aktif untuk @\${autoUsername} (setiap 30 detik)\`);
  }
});`
);

// Patch 8: Error log
code = code.replace(
  `    const rawMsg = err.message || '';
    console.error(\`[TikTok Connect Error] @\${username}: \${rawMsg}\`);`,
  `    const rawMsg = err.message || '';
    console.error(\`[TikTok] [ERROR] Gagal connect ke @\${username}: \${rawMsg}\`);`
);

// Patch 9: socket disconnect log
code = code.replace(
  `  socket.on('disconnect', () => {
    connectedClients--;
    io.emit('client_count', connectedClients);`,
  `  socket.on('disconnect', () => {
    console.log(\`[Socket] Client terputus: \${socket.id}\`);
    connectedClients--;
    io.emit('client_count', connectedClients);`
);

// Patch 10: socket connect log
code = code.replace(
  `io.on('connection', (socket) => {
  connectedClients++;
  io.emit('client_count', connectedClients);`,
  `io.on('connection', (socket) => {
  console.log(\`[Socket] Client terhubung: \${socket.id}\`);
  connectedClients++;
  io.emit('client_count', connectedClients);`
);

fs.writeFileSync('server.js', code, 'utf8');
console.log('Patch complete.');
