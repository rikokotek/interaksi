const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const ytSubathonCode = \
// ==================== SUBATHON YT TIMER ====================
let subathonYtTimer = null;

if (!readData('subathon_yt.json')) writeData('subathon_yt.json', {
  enabled: false,
  paused: true,
  title: 'Subathon YouTube',
  saweria: { enabled: false, token: '' },
  sociabuzz: { enabled: false, token: '' },
  timeSeconds: 3600,
  initialTimeSeconds: 3600,
  rules: []
});

function startSubathonYtTimer() {
  if (subathonYtTimer) clearInterval(subathonYtTimer);
  subathonYtTimer = setInterval(() => {
    const sub = readData('subathon_yt.json');
    if (!sub || !sub.enabled || sub.paused) return;
    if (sub.timeSeconds <= 0) {
      sub.enabled = false;
      sub.paused = true;
      writeData('subathon_yt.json', sub);
      io.emit('subathon_yt_update', sub);
      io.emit('toast', { type: 'info', message: 'Subathon YouTube ended!' });

      if (sub.endWebhookUrl && sub.endWebhookUrl.trim() !== '') {
        const url = sub.endWebhookUrl.trim();
        const method = sub.endWebhookMethod || 'POST';
        const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.');
        if (isLocal) {
          io.emit('trigger_client_webhook', { method: method, url, data: { event: 'subathon_ended', timestamp: new Date().toISOString() }, actionId: 'subathon_yt_end', type: 'webhook' });
        } else {
          if (method === 'GET') {
            axios.get(url, { timeout: 10000 }).catch(() => {});
          } else {
            axios.post(url, { event: 'subathon_ended', timestamp: new Date().toISOString() }, { timeout: 10000 }).catch(() => {});
          }
        }
      }
      return;
    }
    sub.timeSeconds--;
    writeData('subathon_yt.json', sub);
    io.emit('subathon_yt_tick', { timeSeconds: sub.timeSeconds });
  }, 1000);
}
startSubathonYtTimer();

// --- Subathon YouTube API ---
app.get('/api/subathon_yt', (req, res) => {
  const sub = readData('subathon_yt.json') || {};
  const cfg = readData('config.json') || {};
  res.json({ ...sub, webhookKey: cfg.webhookKey || '' });
});

app.put('/api/subathon_yt', (req, res) => {
  const sub = { ...readData('subathon_yt.json'), ...req.body };
  writeData('subathon_yt.json', sub);
  io.emit('subathon_yt_update', sub);
  res.json(sub);
});

app.post('/api/subathon_yt/start', (req, res) => {
  const sub = readData('subathon_yt.json');
  sub.enabled = true;
  sub.paused = false;
  sub.timeSeconds = req.body.timeSeconds || sub.initialTimeSeconds;
  writeData('subathon_yt.json', sub);
  io.emit('subathon_yt_update', sub);
  res.json(sub);
});

app.post('/api/subathon_yt/pause', (req, res) => {
  const sub = readData('subathon_yt.json');
  sub.paused = true;
  writeData('subathon_yt.json', sub);
  io.emit('subathon_yt_update', sub);
  res.json(sub);
});

app.post('/api/subathon_yt/resume', (req, res) => {
  const sub = readData('subathon_yt.json');
  sub.paused = false;
  writeData('subathon_yt.json', sub);
  io.emit('subathon_yt_update', sub);
  res.json(sub);
});

app.post('/api/subathon_yt/add-time', (req, res) => {
  const sub = readData('subathon_yt.json');
  sub.timeSeconds = (sub.timeSeconds || 0) + (req.body.seconds || 0);
  writeData('subathon_yt.json', sub);
  io.emit('subathon_yt_update', sub);
  io.emit('subathon_yt_tick', { timeSeconds: sub.timeSeconds });
  res.json(sub);
});

app.post('/api/subathon_yt/test-webhook', (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const method = req.body.method || 'POST';
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.');
  if (isLocal) {
    io.emit('trigger_client_webhook', { method: method, url, data: { event: 'subathon_ended', test: true, timestamp: new Date().toISOString() }, actionId: 'subathon_yt_end_test', type: 'webhook' });
  } else {
    if (method === 'GET') {
      axios.get(url, { timeout: 10000 }).catch(() => {});
    } else {
      axios.post(url, { event: 'subathon_ended', test: true, timestamp: new Date().toISOString() }, { timeout: 10000 }).catch(() => {});
    }
  }
  res.json({ success: true });
});

// Saweria webhook YT
app.post('/api/webhook/saweria_yt', (req, res) => {
  const data = req.body;
  const sub = readData('subathon_yt.json');
  const config = readData('config.json');
  const webhookKey = config?.webhookKey || '';
  if (webhookKey && req.query.key !== webhookKey) return res.status(403).json({ error: 'Invalid webhook key.' });

  const donorAmount = data.amount_raw || data.amount || 0;
  if (sub && sub.enabled && sub.saweria.enabled) {
    let addSeconds = 0;
    for (const rule of (sub.rules || [])) {
      if (rule.platform === 'saweria') {
        addSeconds = Math.max(addSeconds, Math.round(rule.secondsPerAmount * (donorAmount / rule.perAmount)));
      }
    }
    if (addSeconds > 0) {
      sub.timeSeconds += addSeconds;
      writeData('subathon_yt.json', sub);
      io.emit('subathon_yt_update', sub);
      io.emit('toast', { type: 'success', message: \Saweria YT + \ d\ });
    }
  }
  res.json({ success: true });
});

// Sociabuzz webhook YT
app.post('/api/webhook/sociabuzz_yt', (req, res) => {
  const data = req.body;
  const sub = readData('subathon_yt.json');
  const config = readData('config.json');
  const webhookKey = config?.webhookKey || '';
  if (webhookKey && req.query.key !== webhookKey) return res.status(403).json({ error: 'Invalid webhook key.' });

  const donorAmount = data.amount || data.price || data.total || 0;
  if (sub && sub.enabled && sub.sociabuzz.enabled) {
    let addSeconds = 0;
    for (const rule of (sub.rules || [])) {
      if (rule.platform === 'sociabuzz') {
        addSeconds = Math.max(addSeconds, Math.round(rule.secondsPerAmount * (donorAmount / rule.perAmount)));
      }
    }
    if (addSeconds > 0) {
      sub.timeSeconds += addSeconds;
      writeData('subathon_yt.json', sub);
      io.emit('subathon_yt_update', sub);
      io.emit('toast', { type: 'success', message: \Sociabuzz YT + \ d\ });
    }
  }
  res.json({ success: true });
});

app.get('/overlay/subathon_yt', (req, res) => {
  const path = require('path');
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'subathon_yt.html'));
});

\

code = code.replace('// ==================== START SERVER ====================', ytSubathonCode + '\n// ==================== START SERVER ====================');

// Add socket emit for subathon_yt on initial connection
code = code.replace("socket.emit('subathon_update', readData('subathon.json'));", "socket.emit('subathon_update', readData('subathon.json'));\\n    socket.emit('subathon_yt_update', readData('subathon_yt.json'));");

fs.writeFileSync('server.js', code);
console.log('server.js patched');
