const express = require('express');
const { LiveChat } = require('youtube-chat');

const { HttpsProxyAgent } = require('https-proxy-agent');
const axios = require('axios');
const originalAxiosGet = axios.get;
const originalAxiosPost = axios.post;

axios.get = async function(url, config) {
  if (global.ytProxyAgent && (url.includes('youtube.com') || url.includes('youtu.be'))) {
    config = config || {};
    config.httpsAgent = global.ytProxyAgent;
    config.proxy = false;
  }
  return originalAxiosGet.apply(this, arguments);
};

axios.post = async function(url, data, config) {
  if (global.ytProxyAgent && (url.includes('youtube.com') || url.includes('youtu.be'))) {
    config = config || {};
    config.httpsAgent = global.ytProxyAgent;
    config.proxy = false;
  }
  return originalAxiosPost.apply(this, arguments);
};

const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
// Library TikTok akan di-load secara dinamis untuk support ESM di Node 20+
let TikTokLiveConnectionClass = null;

async function getTikTokLiveConnection() {
  if (!TikTokLiveConnectionClass) {
    const tlc = await import('tiktok-live-connector');
    TikTokLiveConnectionClass = tlc.TikTokLiveConnection || tlc.WebcastPushConnection || tlc.default?.TikTokLiveConnection || tlc.default || tlc;
  }
  return TikTokLiveConnectionClass;
}
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
// ==================== AUTHENTICATION ====================
app.use((req, res, next) => {
  // Biarkan jalur publik terbuka untuk OBS dan Integrasi
  if (req.path.startsWith('/overlay/')) return next();
  if (req.path.startsWith('/screen/')) return next();
  if (req.path.startsWith('/api/webhook/')) return next();
  
  // Biarkan asset statis terbuka agar overlay bisa dirender di OBS
  if (req.path.startsWith('/css/')) return next();
  if (req.path.startsWith('/js/')) return next();
  if (req.path.startsWith('/uploads/')) return next();
  if (req.path.startsWith('/favicon.ico')) return next();
  
  // Biarkan GET API terbuka agar overlay bisa mengambil data awal
  if (req.path.startsWith('/api/') && req.method === 'GET') return next();

  // Untuk selain itu (UI Dashboard & ubah data API), minta otentikasi
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  
  const authConfig = readData('auth.json') || { username: 'admin', password: 'adminpassword', enabled: true };
  
  // Jika dimatikan, abaikan login
  if (!authConfig.enabled) return next();
  
  if (login && password && login === authConfig.username && password === authConfig.password) {
    return next();
  }
  
  res.set('WWW-Authenticate', 'Basic realm="TikFlow Dashboard"');
  res.status(401).send('Otentikasi diperlukan untuk mengakses Dashboard.');
});

app.use(express.static(path.join(__dirname, 'public')));

// ==================== DATA STORAGE ====================
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function readData(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch { return null; }
}

function writeData(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// Init data files
if (!readData('actions.json')) writeData('actions.json', []);
if (!readData('events.json')) writeData('events.json', []);
if (!readData('screens.json')) writeData('screens.json', []);
if (!readData('auth.json')) writeData('auth.json', { enabled: true, username: 'admin', password: 'adminpassword' });
if (!readData('subathon.json')) writeData('subathon.json', {
  enabled: false,
  paused: true,
  timeSeconds: 3600,
  initialTimeSeconds: 3600,
  title: 'Subathon',
  saweria: { enabled: false, token: '' },
  sociabuzz: { enabled: false, token: '' },
  rules: [],
  overlayStyle: {
    bgColor: '#0a0a0f',
    textColor: '#a855f7',
    fontFamily: 'Inter',
    showTitle: true
  }
});
if (!readData('config.json')) writeData('config.json', {
  tiktokUsername: '',
  connected: false,
  isLive: false,
  webhookKey: uuidv4().replace(/-/g, '')
});
// Pastikan webhookKey selalu ada di config lama
const _cfg = readData('config.json');
if (!_cfg.webhookKey) { _cfg.webhookKey = uuidv4().replace(/-/g, ''); writeData('config.json', _cfg); }
if (!readData('stats.json')) writeData('stats.json', {
  viewers: 0, likes: 0, gifts: 0, comments: 0, follows: 0, totalGiftValue: 0
});

// ==================== MULTER UPLOAD ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==================== TIKTOK LIVE STATE ====================
const DEFAULT_USERNAME = 'roseanaa69'; // Username TikTok terkunci
const savedConfig = readData('config.json') || {};

let tiktokClient = null;
let screenStatuses = {}; // Tracks connection status for each screen
let ytLiveChat = null;
let ytConnectionState = {
  channelId: '',
  connected: false,
  connecting: false,
  isLive: false,
  error: null
};
let connectionState = {
  username: savedConfig.tiktokUsername || DEFAULT_USERNAME,
  connected: false,
  isLive: false,
  connecting: false,
  waitingForLive: false,
  demoMode: false,
  lastCheck: null,
    eulerApiKey: savedConfig.eulerApiKey || ''
};
let liveCheckInterval = null;
let stats = readData('stats.json') || {};
let recentEvents = [];

// ==================== ACTION QUEUE ====================
let actionQueue = [];
let isProcessingAction = false;

async function processActionQueue() {
  if (isProcessingAction || actionQueue.length === 0) return;
  isProcessingAction = true;

  const item = actionQueue.shift();
  io.emit('queue_update', { queue: actionQueue.length, current: item });

  try {
    await executeAction(item.action, item.triggerData);
  } catch (err) {
    console.error('Action error:', err);
  }

  isProcessingAction = false;
  // Small delay before next
  setTimeout(processActionQueue, 100);
}

async function executeAction(action, triggerData) {
  const actionName = action.name || action.type;
  const types = action.types && action.types.length > 0 ? action.types : [action.type].filter(Boolean);
  const configs = action.configs || { [action.type]: action.config };

  const pendingCfg = types.includes('pending') ? configs.pending : null;
  const activeTypes = types.filter(t => t !== 'pending');

  console.log(`▶ Action "${actionName}" | types: [${activeTypes.join('+')}]${pendingCfg ? ` | lock: ${pendingCfg.seconds}s` : ''}`);

  if (pendingCfg) {
    // === MODE ANTRIAN (QUEUE LOCK) ===
    // Semua action langsung tembak bersamaan (fire-and-forget),
    // lalu antrian dikunci selama pendingCfg.seconds sebelum action berikutnya jalan.
    // Ini MENCEGAH gift bentrok — gift ke-2 harus tunggu sampai pending selesai.
    activeTypes.forEach(type => {
      fireActionType(type, configs[type] || {}, triggerData, action);
    });

    const lockMs = (pendingCfg.seconds || 3) * 1000;
    io.emit('queue_lock', { seconds: pendingCfg.seconds, actionName });
    await new Promise(resolve => setTimeout(resolve, lockMs));
    io.emit('queue_lock', null);

  } else {
    // === MODE LANGSUNG (NO LOCK) ===
    // Semua tipe berjalan paralel dan menunggu sampai selesai secara alami.
    await Promise.all(activeTypes.map(type =>
      executeOneType(type, configs[type] || {}, triggerData, action)
    ));
  }

  console.log(`✅ Action "${actionName}" selesai`);
}

// Fire-and-forget (tidak await) — digunakan saat pending time aktif
function fireActionType(type, cfg, triggerData, action) {
  switch (type) {
    case 'audio':
      io.emit('play_audio', {
        url: cfg.fileUrl || cfg.url,
        volume: cfg.volume || 1.0,
        actionId: action.id
      });
      break;

    case 'video':
      io.emit('play_video', {
        url: cfg.fileUrl || cfg.directUrl || cfg.url,
        screenId: action.screenId,
        volume: cfg.volume || 1.0,
        actionId: action.id
      });
      break;

    case 'webhook':
      (() => {
        const isLocal = (cfg.url || '').includes('localhost') || (cfg.url || '').includes('127.0.0.1') || (cfg.url || '').includes('192.168.');
        let payload = {};
        try { payload = JSON.parse(cfg.payload || '{}'); } catch {}
        const data = { event: triggerData, timestamp: new Date().toISOString(), ...payload };

        if (isLocal) {
          // Suruh browser eksekusi webhook ini (karena server ada di VPS)
          io.emit('trigger_client_webhook', { method: cfg.method || 'POST', url: cfg.url, data, actionId: action.id, type });
        } else {
          // Tembak dari server VPS
          axios({
            method: cfg.method || 'POST',
            url: cfg.url,
            data: data,
            timeout: 10000
          }).then(() => {
            io.emit('action_executed', { action, type, status: 'success' });
          }).catch(err => {
            io.emit('action_executed', { action, type, status: 'error', error: err.message });
          });
        }
      })();
      break;
  }
}

// Await hingga selesai — digunakan saat TIDAK ada pending time
async function executeOneType(type, cfg, triggerData, action) {
  switch (type) {
    case 'audio':
      io.emit('play_audio', {
        url: cfg.fileUrl || cfg.url,
        volume: cfg.volume || 1.0,
        actionId: action.id
      });
      await new Promise(resolve => setTimeout(resolve, (cfg.duration || 5) * 1000));
      break;

    case 'video':
      io.emit('play_video', {
        url: cfg.fileUrl || cfg.directUrl || cfg.url,
        screenId: action.screenId,
        volume: cfg.volume || 1.0,
        actionId: action.id
      });
      await new Promise(resolve => setTimeout(resolve, (cfg.duration || 10) * 1000));
      break;

    case 'webhook':
      try {
        const isLocal = (cfg.url || '').includes('localhost') || (cfg.url || '').includes('127.0.0.1') || (cfg.url || '').includes('192.168.');
        let payload = {};
        try { payload = JSON.parse(cfg.payload || '{}'); } catch {}
        const data = { event: triggerData, timestamp: new Date().toISOString(), ...payload };

        if (isLocal) {
          io.emit('trigger_client_webhook', { method: cfg.method || 'POST', url: cfg.url, data, actionId: action.id, type });
          // Anggap sukses karena dipassing ke client
          io.emit('action_executed', { action, type, status: 'success' });
        } else {
          await axios({
            method: cfg.method || 'POST',
            url: cfg.url,
            data: data,
            timeout: 10000
          });
          io.emit('action_executed', { action, type, status: 'success' });
        }
      } catch (err) {
        io.emit('action_executed', { action, type, status: 'error', error: err.message });
      }
      break;

    default:
      break;
  }
}
function triggerEvent(eventType, eventData) {
  const events = readData('events.json') || [];
  const matchingEvents = events.filter(ev => {
    if (!ev.enabled) return false;
    if (ev.trigger.type !== eventType) return false;
    // Gift filter
    if (eventType === 'gift' && ev.trigger.giftId && ev.trigger.giftId !== 'any') {
      if (ev.trigger.giftId !== String(eventData.giftId)) return false;
    }
    // Comment filter
    if (eventType === 'comment' && ev.trigger.keyword) {
      if (!eventData.comment?.toLowerCase().includes(ev.trigger.keyword.toLowerCase())) return false;
    }
    // Donation filter (Saweria / Sociabuzz)
    if (eventType === 'saweria' || eventType === 'sociabuzz') {
      // Check token
      if (ev.trigger.token && ev.trigger.token.trim() !== '') {
        const receivedToken = eventData.token || '';
        if (receivedToken !== ev.trigger.token) return false;
      }
      // Check minimum amount
      const minAmount = ev.trigger.minAmount || 0;
      const amount = parseInt(eventData.amount || 0);
      if (amount < minAmount) return false;
    }
    return true;
  });

  if (matchingEvents.length === 0) return;

  const actions = readData('actions.json') || [];

  for (const ev of matchingEvents) {
    const action = actions.find(a => a.id === ev.actionId);
    if (!action) continue;
    actionQueue.push({ action, triggerData: eventData, eventId: ev.id });
    io.emit('event_triggered', { event: ev, trigger: eventData });
  }

  processActionQueue();
  io.emit('queue_size', actionQueue.length);
}

// ==================== TIKTOK CONNECTION ====================
let isAutoRetrying = false; // flag so auto-retry won't spam toasts

async function connectTikTok(username, silent = false, sessionId = null) {
  if (tiktokClient) {
    try { 
      tiktokClient.removeAllListeners();
      tiktokClient.disconnect(); 
    } catch {}
    tiktokClient = null;
  }

  connectionState.username = username;
  connectionState.connecting = true;
  connectionState.connected = false;
  connectionState.isLive = false;
  io.emit('connection_state', connectionState);

  try {
    const options = {
      processInitialData: false,
      fetchRoomInfoOnConnect: true,
      enableExtendedGiftInfo: false,
      enableWebsocketUpgrade: true
    };
    
    if (sessionId) {
      options.session = { cookie: { value: { sessionId: sessionId, ttTargetIdc: 'tiktok' } } };
    }
    
    const ConnectionClass = await getTikTokLiveConnection();
    tiktokClient = new ConnectionClass(username, options);

    tiktokClient.on('connected', async (state) => {
      console.log(`[TikTok] CONNECTED ke @${username}`);
      isAutoRetrying = false;
      connectionState.connected = true;
      connectionState.connecting = false;
      connectionState.isLive = true;
      io.emit('connection_state', connectionState);
      io.emit('toast', { type: 'success', message: `✅ Connected ke @${username} LIVE!` });
      updateConfig({ connected: true, isLive: true, tiktokUsername: username });
      resumeSubathonIfActive();
      
      // Auto-reset statistik saat streaming dimulai
      stats = { viewers: 0, likes: 0, gifts: 0, comments: 0, follows: 0, totalGiftValue: 0 };
      syncStats();
      resetGalleryItems();

      // Save gifts if available
      try {
        if (tiktokClient.availableGifts && tiktokClient.availableGifts.length > 0) {
          const formattedGifts = tiktokClient.availableGifts.map(g => ({
            id: g.id,
            name: g.name,
            diamonds: g.diamond_count || g.diamonds,
            image: g.image?.url_list?.[0] || g.image || '',
            emoji: '🎁'
          }));
          formattedGifts.sort((a, b) => a.diamonds - b.diamonds);
          writeData('gifts.json', formattedGifts);
        } else if (typeof tiktokClient.fetchAvailableGifts === 'function') {
          const apiGifts = await tiktokClient.fetchAvailableGifts();
          if (apiGifts && apiGifts.length > 0) {
            const formattedGifts = apiGifts.map(g => ({
              id: g.id,
              name: g.name,
              diamonds: g.diamond_count,
              image: g.image?.url_list?.[0] || '',
              emoji: '🎁'
            }));
            formattedGifts.sort((a, b) => a.diamonds - b.diamonds);
            writeData('gifts.json', formattedGifts);
          }
        }
      } catch (err) {
        console.log("[TikTok] Auto-fetch gifts tidak didukung di versi ini atau butuh key EulerStream.");
      }
    });

    tiktokClient.on('disconnected', () => {
      console.log(`[TikTok] DISCONNECTED dari @${username}`);
      connectionState.connected = false;
      connectionState.isLive = false;
      io.emit('connection_state', connectionState);
      if (!isAutoRetrying) {
        io.emit('toast', { type: 'warning', message: `Stream @${username} telah berakhir — menunggu LIVE berikutnya...` });
      }
      updateConfig({ connected: false, isLive: false });
      pauseSubathonIfActive();

      // Auto-reset statistik saat streaming berhenti
      stats = { viewers: 0, likes: 0, gifts: 0, comments: 0, follows: 0, totalGiftValue: 0 };
      syncStats();
      resetGalleryItems();
    });

    tiktokClient.on('error', (err) => {
      // Suppress noisy errors during auto-retry
      if (!isAutoRetrying) {
        const msg = (err.message || (typeof err === 'string' ? err : '')) || 'Unknown Error';
        const msgLower = msg.toLowerCase();
        const isNotLive = msgLower.includes('live') || msgLower.includes('ended') || msgLower.includes('offline') || msgLower.includes('online') || msgLower.includes('room not found') || msgLower.includes('unknown error');
        if (!isNotLive) {
          io.emit('toast', { type: 'error', message: 'TikTok error: ' + msg });
        }
      }
      connectionState.connecting = false;
      io.emit('connection_state', connectionState);
    });

    // Events
    const processedGifts = new Map();
    const getUser = (d) => d?.user?.displayId || d?.user?.nickname || d?.uniqueId || 'unknown';

    tiktokClient.on('chat', (data) => {
      stats.comments = (stats.comments || 0) + 1;
      const user = getUser(data);
      const msg = data.content || data.comment || '';
      const ev = { type: 'comment', user, message: msg, time: Date.now() };
      addRecentEvent(ev); io.emit('tiktok_event', ev); triggerEvent('comment', ev); syncStats();
    });

    tiktokClient.on('gift', (data) => {
      // 1. Dapatkan ID unik untuk transaksi gift ini
      const uniqueId = data.groupId || data.msgId || Date.now().toString();
      
      // 2. Dapatkan jumlah ketukan (taps) dari payload
      const currentRepeat = data.repeatCount || 1;
      const previousRepeat = processedGifts.get(uniqueId) || 0;
      
      // 3. Jika jumlah ketukan ini sama atau lebih kecil dari yang sudah diproses, abaikan! (INI ADALAH DUPLIKAT)
      if (currentRepeat <= previousRepeat) return;
      
      // 4. Hitung berapa banyak Mawar BARU yang dikirim pada ketukan ini
      const newGifts = currentRepeat - previousRepeat;
      
      // 5. Simpan jumlah ketukan terakhir ke dalam memori
      processedGifts.set(uniqueId, currentRepeat);
      
      stats.gifts = (stats.gifts || 0) + newGifts;
      const diamondCount = data.gift?.diamondCount || data.diamondCount || 0;
      stats.totalGiftValue = (stats.totalGiftValue || 0) + (diamondCount * newGifts);
      
      const user = getUser(data);
      const giftName = data.gift?.name || data.gift?.describe || data.giftName || 'Gift';
      const ev = { type: 'gift', user, giftName, giftId: data.giftId, diamondCount, repeatCount: newGifts, time: Date.now() };

      // Auto-save new gift to gifts.json
      const cachedGifts = readData('gifts.json') || [];
      if (!cachedGifts.some(g => g.id === data.giftId)) {
        cachedGifts.push({
          id: data.giftId,
          name: giftName,
          diamonds: diamondCount,
          image: data.giftPictureUrl || data.gift?.image?.url_list?.[0] || '',
          emoji: '🎁'
        });
        cachedGifts.sort((a, b) => a.diamonds - b.diamonds);
        writeData('gifts.json', cachedGifts);
        io.emit('gifts_update', cachedGifts);
      }

      addRecentEvent(ev); io.emit('tiktok_event', ev); triggerEvent('gift', ev); syncStats();
      processGalleryGift({ ...ev, uniqueId: user });
    });

    tiktokClient.on('follow', (data) => {
      stats.follows = (stats.follows || 0) + 1;
      const ev = { type: 'follow', user: getUser(data), time: Date.now() };
      addRecentEvent(ev); io.emit('tiktok_event', ev); triggerEvent('follow', ev); syncStats();
    });

    tiktokClient.on('like', (data) => {
      stats.likes = (stats.likes || 0) + (data.likeCount || 1);
      const ev = { type: 'like', user: getUser(data), count: data.likeCount, time: Date.now() };
      addRecentEvent(ev); io.emit('tiktok_event', ev); triggerEvent('like', ev); syncStats();
    });

    tiktokClient.on('member', (data) => {
      const ev = { type: 'member', user: getUser(data), time: Date.now() };
      addRecentEvent(ev); io.emit('tiktok_event', ev); triggerEvent('member', ev);
    });

    tiktokClient.on('roomUser', (data) => {
      if (typeof data.viewerCount === 'number') {
        stats.viewers = data.viewerCount;
        syncStats();
      }
    });

    await tiktokClient.connect();

  } catch (err) {
    connectionState.connecting = false;
    connectionState.connected = false;
    tiktokClient = null;
    io.emit('connection_state', connectionState);

    // Log error detail to console
    const rawMsg = (err.message || (typeof err === 'string' ? err : '')) || 'Unknown Error';
    console.error(`[TikTok Connect Error] @${username}: ${rawMsg}`);
    io.emit('event_log', { type: 'error', message: `[Connect Error] ${rawMsg}` });

    const msg = rawMsg.toLowerCase();
    const isNotLive = msg.includes('live') || msg.includes('ended') || msg.includes('offline')
      || msg.includes('currently not') || msg.includes('not streaming') || msg.includes('no live') || msg.includes('online') || msg.includes('room not found');
      
    const isBlocked = msg.includes('rate') || msg.includes('403') || msg.includes('429')
      || msg.includes('sign') || msg.includes('sessionid') || msg.includes('fetch')
      || msg.includes('failed') || msg.includes('unavailable');

    if (isNotLive) {
      connectionState.waitingForLive = true;
      io.emit('connection_state', connectionState);
      pauseSubathonIfActive();
      if (!silent) {
        io.emit('toast', { type: 'error', message: `<strong>TikTok Connection Failed</strong><br/><span style="font-size: 13px;">Please start your stream.</span>` });
      }
    } else if (isBlocked) {
      connectionState.waitingForLive = false; // STOP auto-retry jika diblokir
      io.emit('connection_state', connectionState);
      io.emit('toast', { type: 'error', message: `BLOKIR/SESSION ERROR: ${rawMsg}` }); // Paksa tampil walau silent
    } else {
      io.emit('toast', { type: 'error', message: 'Gagal connect: ' + rawMsg });
    }
  }
}

async function checkLiveStatus(username, sessionId) {
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
}

function pauseSubathonIfActive() {
  const sub = readData('subathon.json');
  if (sub && sub.enabled && !sub.paused) {
    sub.paused = true;
    writeData('subathon.json', sub);
    io.emit('subathon_update', sub);
    io.emit('toast', { type: 'info', message: 'Subathon paused - stream offline' });
  }
}

function resumeSubathonIfActive() {
  const sub = readData('subathon.json');
  if (!sub) return;

  if (sub.enabled && sub.paused) {
    sub.paused = false;
    writeData('subathon.json', sub);
    io.emit('subathon_update', sub);
    io.emit('toast', { type: 'success', message: 'Subathon resumed - stream is live!' });
  } else if (!sub.enabled) {
    sub.enabled = true;
    sub.paused = false;
    sub.timeSeconds = sub.initialTimeSeconds || 3600;
    writeData('subathon.json', sub);
    io.emit('subathon_update', sub);
    io.emit('toast', { type: 'success', message: 'Subathon otomatis dimulai ulang dari waktu awal!' });
  }
}

// ==================== GALLERY ====================

function resumeSubathonYtIfActive() {
  const sub = readData('subathon_yt.json');
  if (!sub) return;

  if (sub.enabled && sub.paused) {
    sub.paused = false;
    writeData('subathon_yt.json', sub);
    io.emit('subathon_yt_update', sub);
    io.emit('toast', { type: 'success', message: 'Subathon YouTube resumed - stream is live!' });
  } else if (!sub.enabled) {
    sub.enabled = true;
    sub.paused = false;
    sub.timeSeconds = sub.initialTimeSeconds || 3600;
    writeData('subathon_yt.json', sub);
    io.emit('subathon_yt_update', sub);
    io.emit('toast', { type: 'success', message: 'Subathon YouTube otomatis dimulai ulang dari waktu awal!' });
  }
}

function pauseSubathonYtIfActive() {
  const sub = readData('subathon_yt.json');
  if (sub && sub.enabled && !sub.paused) {
    sub.paused = true;
    writeData('subathon_yt.json', sub);
    io.emit('subathon_yt_update', sub);
    io.emit('toast', { type: 'info', message: 'Subathon YouTube paused - stream offline' });
  }
}

// ==================== GALLERY ====================
function resetGalleryItems() {
  const gallery = readData('gallery.json');
  if (!gallery || !gallery.items || gallery.items.length === 0) return;
  
  let updated = false;
  for (const item of gallery.items) {
    if (item.currentValue !== 0) {
      item.currentValue = 0;
      updated = true;
    }
  }
  
  if (updated) {
    writeData('gallery.json', gallery);
    io.emit('gallery_update', gallery);
  }
}

function processGalleryGift(data) {
  const gallery = readData('gallery.json');
  if (!gallery || !gallery.items || gallery.items.length === 0) return;

  let updated = false;
  const actionsToTrigger = [];

  for (const item of gallery.items) {
    const isMatch = (item.giftId && String(item.giftId) === String(data.giftId)) || 
                    (!item.giftId && item.giftName && data.giftName && item.giftName.toLowerCase() === data.giftName.toLowerCase());
    
    if (isMatch) {
      const prevValue = item.currentValue;
      item.currentValue += data.repeatCount || 1;
      updated = true;

      if (item.target > 0 && prevValue < item.target && item.currentValue >= item.target) {
        if (item.actionId) {
          actionsToTrigger.push(item.actionId);
        }
      }
    }
  }

  if (updated) {
    writeData('gallery.json', gallery);
    io.emit('gallery_update', gallery);
    
    if (actionsToTrigger.length > 0) {
      const actions = readData('actions.json') || [];
      for (const actionId of actionsToTrigger) {
        const action = actions.find(a => a.id === actionId);
        if (action) {
          actionQueue.push({ action, triggerData: { user: data.uniqueId, amount: data.repeatCount } });
          io.emit('event_triggered', { event: { name: 'Gallery Target Reached' }, trigger: data });
        }
      }
      processActionQueue();
    }
  }
}

// ==================== MOCK EVENTS ====================
let mockInterval = null;
function startMockEvents() {
  if (mockInterval) clearInterval(mockInterval);
  const users = ['user123', 'tiktoker99', 'fanboy_xl', 'streaming_pro', 'giftmaster'];
  const gifts = ['Rose', 'Lion', 'Universe', 'Galaxy', 'Panda'];
  const giftIds = [5655, 5806, 6000, 5869, 6368];

  mockInterval = setInterval(() => {
    if (!connectionState.isLive) return;
    const rand = Math.random();
    const user = users[Math.floor(Math.random() * users.length)];
    let ev;
    if (rand < 0.4) {
      ev = { type: 'comment', user, message: 'Helo! seru banget streamnya!', time: Date.now() };
    } else if (rand < 0.6) {
      const gi = Math.floor(Math.random() * gifts.length);
      ev = { type: 'gift', user, giftName: gifts[gi], giftId: giftIds[gi], diamondCount: Math.floor(Math.random() * 100) + 1, repeatCount: 1, time: Date.now() };
      stats.gifts = (stats.gifts || 0) + 1;
    } else if (rand < 0.75) {
      ev = { type: 'follow', user, time: Date.now() };
      stats.follows = (stats.follows || 0) + 1;
    } else if (rand < 0.9) {
      ev = { type: 'like', user, count: Math.floor(Math.random() * 10) + 1, time: Date.now() };
      stats.likes = (stats.likes || 0) + 5;
    } else {
      ev = { type: 'member', user, time: Date.now() };
    }
    stats.viewers = Math.floor(Math.random() * 500) + 100;
    addRecentEvent(ev);
    io.emit('tiktok_event', ev);
    triggerEvent(ev.type, ev);
    syncStats();
  }, 3000);
}

function addRecentEvent(ev) {
  recentEvents.unshift(ev);
  if (recentEvents.length > 100) recentEvents = recentEvents.slice(0, 100);
}

function syncStats() {
  writeData('stats.json', stats);
  io.emit('stats_update', stats);
}

// ==================== OUTGOING DONATION WEBHOOK ====================
// Kirim notifikasi ke endpoint eksternal setiap kali donasi baru masuk.
// Bersifat non-blocking — kegagalan webhook tidak akan merusak log donasi.
async function sendDonationWebhook(ev) {
  const cfg = readData('config.json') || {};
  const url = cfg.outgoingDonationWebhook;
  if (!url) return; // Jangan kirim jika belum diatur

  const payload = {
    name: ev.user || ev.name || "",
    amount: parseInt(ev.amount || ev.price || ev.nominal || 0) || 0,
    message: ev.message || ev.msg || ""
  };

  const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.');
  if (isLocal && typeof io !== 'undefined') {
    console.log("========== WEBHOOK DONATION DELEGATED TO CLIENT ==========");
    console.log("URL:", url);
    console.log("PAYLOAD:", payload);
    io.emit('trigger_client_webhook', { method: 'POST', url: url, data: payload, type: 'donation_webhook' });
    return;
  }

  console.log("========== WEBHOOK DONATION DEBUG ==========");
  console.log("DONATION EVENT ASLI:", ev);
  console.log("PAYLOAD KE FLASK:", payload);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    console.log("STATUS RESPONSE FLASK:", response.status);
    console.log("BODY RESPONSE FLASK:", text);
    console.log("========== WEBHOOK DONATION DEBUG END ==========");
  } catch (err) {
    console.error("GAGAL KIRIM WEBHOOK DONATION KE FLASK:", err);
    console.log("========== WEBHOOK DONATION DEBUG END ==========");
  }
}

function updateConfig(data) {
  const cfg = readData('config.json') || {};
  writeData('config.json', { ...cfg, ...data });
}

// ==================== SUBATHON TIMER ====================
let subathonTimer = null;

function startSubathonTimer() {
  if (subathonTimer) clearInterval(subathonTimer);
  subathonTimer = setInterval(() => {
    const sub = readData('subathon.json');
    if (!sub || !sub.enabled || sub.paused) return;
    if (sub.timeSeconds <= 0) {
      sub.enabled = false;
      sub.paused = true;
      writeData('subathon.json', sub);
      io.emit('subathon_update', sub);
      io.emit('toast', { type: 'info', message: 'Subathon ended!' });

      if (sub.endWebhookUrl && sub.endWebhookUrl.trim() !== '') {
        const url = sub.endWebhookUrl.trim();
        const method = sub.endWebhookMethod || 'POST';
        const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.');
        if (isLocal) {
          io.emit('trigger_client_webhook', { method: method, url, data: { event: 'subathon_ended', timestamp: new Date().toISOString() }, actionId: 'subathon_end', type: 'webhook' });
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
    sub.timeSeconds -= 1;
    writeData('subathon.json', sub);
    io.emit('subathon_tick', { timeSeconds: sub.timeSeconds });
  }, 1000);
}

startSubathonTimer();

// ==================== API ROUTES ====================

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


// --- YouTube ---
let ytLiveCheckInterval = null;
let ytIsAutoRetrying = false;

async function doConnectYoutube(channelId, isLiveId, proxyUrl = '', silent = false) {
  if (ytLiveChat) {
    ytLiveChat.stop();
    ytLiveChat = null;
  }

  // Parse proxyUrl if exists
  if (proxyUrl) {
    try {
      let finalProxy = proxyUrl;
      if (!proxyUrl.startsWith('http')) {
        const parts = proxyUrl.split(':');
        if (parts.length === 4) {
          // ip:port:user:pass -> http://user:pass@ip:port
          finalProxy = `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
        } else {
          finalProxy = `http://${proxyUrl}`;
        }
      }
      global.ytProxyAgent = new (require('https-proxy-agent').HttpsProxyAgent)(finalProxy);
    } catch (err) {
      if (!silent) io.emit('toast', { type: 'error', message: 'Format Proxy tidak valid.' });
      return;
    }
  } else {
    global.ytProxyAgent = null;
  }

  ytConnectionState.channelId = channelId;
  ytConnectionState.isLiveId = isLiveId;
  ytConnectionState.proxyUrl = proxyUrl;
  ytConnectionState.connecting = true;
  ytConnectionState.error = null;
  if (!silent) io.emit('yt_connection_state', ytConnectionState);
  
  try {
    let config = {};
    if (isLiveId) {
      config = { liveId: channelId };
    } else if (channelId.startsWith('@')) {
      config = { handle: channelId };
    } else {
      config = { channelId: channelId };
    }
    ytLiveChat = new LiveChat(config);
    
    ytLiveChat.on('start', (liveId) => {
      console.log(`[YouTube] CONNECTED ke LiveID: ${liveId}`);
      ytConnectionState.connected = true;
      ytConnectionState.connecting = false;
      ytConnectionState.isLive = true;
      ytConnectionState.error = null;
      ytConnectionState.waitingForLive = false;
      io.emit('yt_connection_state', ytConnectionState);
      
      if (!ytIsAutoRetrying || !silent) {
        io.emit('toast', { type: 'success', message: `▶️ Connected ke YouTube LIVE!` });
      }
      
      resumeSubathonYtIfActive();
      });
    
    ytLiveChat.on('end', (reason) => {
      console.log(`[YouTube] DISCONNECTED`);
      ytConnectionState.connected = false;
      ytConnectionState.isLive = false;
      try { ytLiveChat.stop(); } catch {}
      io.emit('yt_connection_state', ytConnectionState);
      
      pauseSubathonYtIfActive();
      
      if (!ytLiveCheckInterval) startYtAutoDetect(channelId, isLiveId);
    });
    
    ytLiveChat.on('error', (err) => {
      console.error(`[YouTube Error]`, err);
      ytConnectionState.connecting = false;
      ytConnectionState.connected = false;
      ytConnectionState.isLive = false;
      ytConnectionState.error = err.message;
      try { ytLiveChat.stop(); } catch {}
      
      if (!silent) io.emit('yt_connection_state', ytConnectionState);
      if (!silent) io.emit('toast', { type: 'error', message: 'YouTube Error: ' + err.message });
      
      pauseSubathonYtIfActive();
      
      if (!ytLiveCheckInterval) startYtAutoDetect(channelId, isLiveId);
    });
    
    ytLiveChat.on('chat', (chatItem) => {
      const user = chatItem.author.name;
      const msg = chatItem.message.map(m => m.text || m.emojiText || '').join('');
      const ev = { type: 'comment', platform: 'youtube', user, message: msg, time: Date.now() };
      triggerEvent('comment', ev);
      io.emit('youtube_event', ev);
    });
    
    ytLiveChat.on('superchat', (superChatItem) => {
      const user = superChatItem.author.name;
      const amountStr = superChatItem.amount || '0';
      const msg = superChatItem.message?.map(m => m.text || m.emojiText || '').join('') || '';
      const ev = { type: 'superchat', platform: 'youtube', user, amount: amountStr, message: msg, time: Date.now() };
      
      const numMatch = amountStr.replace(/[^0-9]/g, '');
      const num = parseInt(numMatch) || 0;
      ev.amountNum = num;
      
      triggerEvent('superchat', ev);
      io.emit('youtube_event', ev);
      
      const donations = readData('donations.json') || [];
      donations.unshift({ type: 'superchat', platform: 'youtube', user, amount: num, message: msg, time: Date.now() });
      writeData('donations.json', donations);
      io.emit('new_donation_log', ev);
    });
    
    const ok = await ytLiveChat.start();
    if (!ok) {
      throw new Error("Gagal memulai listener. Pastikan stream sedang Live atau ID benar.");
    }
    
    return true;
  } catch (err) {
    ytConnectionState.connecting = false;
    ytConnectionState.connected = false;
    
    if (err.message && err.message.includes("Live Stream was not found")) {
      ytConnectionState.error = null;
      ytConnectionState.waitingForLive = true;
      if (!silent) io.emit('yt_connection_state', ytConnectionState);
      pauseSubathonYtIfActive();
      throw err;
    }

    if (err.message && err.message.includes("404")) {
      ytConnectionState.error = "Akun/URL tidak ditemukan (Error 404). Pastikan URL benar.";
    } else {
      ytConnectionState.error = err.message;
    }
    
    ytConnectionState.waitingForLive = false;
    if (!silent) io.emit('yt_connection_state', ytConnectionState);
    throw err;
  }
}

function startYtAutoDetect(channelId, isLiveId) {
  if (ytLiveCheckInterval) clearInterval(ytLiveCheckInterval);
  ytLiveCheckInterval = setInterval(async () => {
    if (!ytConnectionState.isLive && channelId) {
      ytIsAutoRetrying = true;
      try { await doConnectYoutube(channelId, isLiveId, ytConnectionState.proxyUrl || '', true); } catch {}
    }
  }, 30000);
}

app.post('/api/youtube/connect', async (req, res) => {
  let { channelId, isLiveId } = req.body;
  if (!channelId) return res.status(400).json({ error: 'Channel ID / Live ID required' });
  
  channelId = channelId.trim();

  if (channelId.includes('youtube.com/') || channelId.includes('youtu.be/')) {
    try {
      const url = new URL(channelId.startsWith('http') ? channelId : 'https://' + channelId);
      if (url.hostname === 'youtu.be') {
        channelId = url.pathname.substring(1);
        isLiveId = true;
      } else if (url.pathname.includes('/watch')) {
        channelId = url.searchParams.get('v') || channelId;
        isLiveId = true;
      } else if (url.pathname.includes('/live/')) {
        channelId = url.pathname.split('/live/')[1].split('?')[0];
        isLiveId = true;
      } else if (url.pathname.includes('/channel/')) {
        channelId = url.pathname.split('/channel/')[1].split('/')[0];
        isLiveId = false;
      } else if (url.pathname.startsWith('/@')) {
        channelId = '@' + url.pathname.split('/@')[1].split('/')[0];
        isLiveId = false;
      }
    } catch(e) {}
  }

  if (isLiveId) {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(channelId)) {
      return res.status(400).json({ error: 'Format Live ID tidak valid. Harus 11 karakter (contoh: dQw4w9WgXcQ)' });
    }
  } else {
    if (!channelId.startsWith('@') && !/^UC[a-zA-Z0-9_-]{22}$/.test(channelId)) {
      return res.status(400).json({ error: 'Format Channel ID tidak valid. Gunakan format UC... (24 karakter) atau @username' });
    }
  }
  
  ytIsAutoRetrying = false;
  
  try {
    await doConnectYoutube(channelId, isLiveId, false);
    
    const cfg = readData('config.json') || {};
    cfg.ytChannelId = channelId;
    cfg.ytIsLiveId = isLiveId;
    writeData('config.json', cfg);
    
    startYtAutoDetect(channelId, isLiveId);
    res.json({ message: 'YouTube Connection initiated', state: ytConnectionState });
  } catch (err) {
    const cfg = readData('config.json') || {};
    cfg.ytChannelId = channelId;
    cfg.ytIsLiveId = isLiveId;
    writeData('config.json', cfg);
    
    startYtAutoDetect(channelId, isLiveId);
    res.json({ message: 'YouTube Connection initiated with auto-detect', state: ytConnectionState });
  }
});

app.post('/api/youtube/disconnect', (req, res) => {
  if (ytLiveChat) { try { ytLiveChat.stop(); } catch {} ytLiveChat = null; }
  if (ytLiveCheckInterval) { clearInterval(ytLiveCheckInterval); ytLiveCheckInterval = null; }
  ytIsAutoRetrying = false;
  ytConnectionState.connected = false;
  ytConnectionState.isLive = false;
  ytConnectionState.connecting = false;
  ytConnectionState.waitingForLive = false;
  ytConnectionState.error = null;
  io.emit('yt_connection_state', ytConnectionState);
  res.json({ message: 'Disconnected from YouTube' });
});


// --- TikTok ---
app.post('/api/tiktok/connect', async (req, res) => {
  const { username, sessionId, eulerApiKey } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  connectionState.username = username;
  connectionState.waitingForLive = false;
  connectionState.eulerApiKey = eulerApiKey || '';
  
  updateConfig({ tiktokUsername: username, sessionId: sessionId || '', eulerApiKey: eulerApiKey || '' });
  
  isAutoRetrying = false;
  await connectTikTok(username.replace('@', ''), false, sessionId);
  startAutoDetect(username.replace('@', ''), sessionId);
  res.json({ message: 'Connection initiated', state: connectionState });
});

app.post('/api/tiktok/disconnect', (req, res) => {
  if (tiktokClient) { try { tiktokClient.disconnect(); } catch {} tiktokClient = null; }
  if (mockInterval) { clearInterval(mockInterval); mockInterval = null; }
  if (liveCheckInterval) { clearInterval(liveCheckInterval); liveCheckInterval = null; }
  isAutoRetrying = false;
  connectionState.connected = false;
  connectionState.isLive = false;
  connectionState.connecting = false;
  connectionState.waitingForLive = false;
  connectionState.demoMode = false;
  io.emit('connection_state', connectionState);
  res.json({ message: 'Disconnected' });
});

// Demo mode — simulate live events without real TikTok
app.post('/api/tiktok/demo', (req, res) => {
  if (mockInterval) { clearInterval(mockInterval); mockInterval = null; }
  const username = connectionState.username || 'demo_user';
  connectionState.connecting = false;
  connectionState.connected = true;
  connectionState.isLive = true;
  connectionState.demoMode = true;
  io.emit('connection_state', connectionState);
  io.emit('toast', { type: 'success', message: '🎮 Demo Mode aktif — events simulasi dimulai!' });
  startMockEvents();
  res.json({ message: 'Demo mode started' });
});

app.get('/api/tiktok/status', (req, res) => {
  res.json(connectionState);
});

// TikTok Gifts API
app.get('/api/gifts', (req, res) => {
  const gifts = readData('gifts.json') || [];
  res.json(gifts);
});



app.get('/api/download', async (req, res) => {
  const url = req.query.url;
  const filename = req.query.filename || 'download.png';
  if (!url) return res.status(400).send('URL is required');
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch image');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.send(buffer);
  } catch (e) {
    console.error('Download error:', e.message);
    res.status(500).send('Error downloading image');
  }
});

app.get('/api/config', (req, res) => {
  const cfg = readData('config.json') || {};
  // Expose webhookKey dan outgoingDonationWebhook
  res.json({ 
    webhookKey: cfg.webhookKey || '',
    outgoingDonationWebhook: cfg.outgoingDonationWebhook || ''
  });
});

app.post('/api/config', (req, res) => {
  const { outgoingDonationWebhook } = req.body;
  if (outgoingDonationWebhook !== undefined) {
    updateConfig({ outgoingDonationWebhook });
  }
  res.json({ success: true });
});



app.get('/api/stats', (req, res) => {
  res.json(readData('stats.json') || {});
});

app.get('/api/events/recent', (req, res) => {
  res.json(recentEvents.slice(0, 50));
});

// --- Actions ---
app.get('/api/actions', (req, res) => res.json(readData('actions.json') || []));

// GIFTS
app.get('/api/gifts', (req, res) => {
  const gifts = readData('gifts.json');
  if (gifts && gifts.length > 0) return res.json(gifts);
  // Fallback to minimal hardcoded list if none exists
  return res.json([
    { id: 5655, name: 'Rose', emoji: '🌹', diamonds: 1 },
    { id: 5806, name: 'TikTok', emoji: '🎵', diamonds: 1 },
  ]);
});

app.post('/api/gifts/update', async (req, res) => {
  const config = readData('config.json');
  if (!config.tiktokUsername) {
    return res.status(400).json({ error: 'Username TikTok belum diatur di menu Connect.' });
  }

  // Jika sedang LIVE dan punya data gift di memori, langsung gunakan
  if (tiktokClient && connectionState.connected && tiktokClient.availableGifts && tiktokClient.availableGifts.length > 0) {
    const formattedGifts = tiktokClient.availableGifts.map(g => ({
      id: g.id,
      name: g.name,
      diamonds: g.diamond_count || g.diamonds,
      image: g.image?.url_list?.[0] || g.image || '',
      emoji: '🎁'
    }));
    formattedGifts.sort((a, b) => a.diamonds - b.diamonds);
    writeData('gifts.json', formattedGifts);
    return res.json({ success: true, message: 'Gifts updated dari sesi LIVE saat ini.', gifts: formattedGifts });
  }

  try {
    const options = { enableExtendedGiftInfo: true, processInitialData: true, fetchRoomInfoOnConnect: true };
    if (config.sessionId) {
      options.session = { cookie: { value: { sessionId: config.sessionId, ttTargetIdc: 'tiktok' } } };
    }
    if (config.eulerApiKey) {
      options.signApiKey = config.eulerApiKey;
    }
    
    const ConnectionClass = await getTikTokLiveConnection();
    const conn = new ConnectionClass(config.tiktokUsername, options);
    
    // Ini akan melempar error jika API signature membutuhkan EulerStream business plan
    const apiGifts = await conn.fetchAvailableGifts();
    
    if (!apiGifts || apiGifts.length === 0) {
      throw new Error("Tidak ada data gift");
    }

    const formattedGifts = apiGifts.map(g => ({
      id: g.id,
      name: g.name,
      diamonds: g.diamond_count,
      image: g.image?.url_list?.[0] || '',
      emoji: '🎁'
    }));

    formattedGifts.sort((a, b) => a.diamonds - b.diamonds);
    writeData('gifts.json', formattedGifts);
    io.emit('toast', { message: `Berhasil mengambil ${formattedGifts.length} gift!`, type: 'success' });
    res.json(formattedGifts);
  } catch (error) {
    const cachedGifts = readData('gifts.json');
    if (cachedGifts && cachedGifts.length > 0) {
      return res.json({ success: true, message: 'Gagal update dari server TikTok, menggunakan data terakhir.', gifts: cachedGifts });
    }
    res.status(500).json({ error: 'Gagal mengambil data gift (API diblokir TikTok). Cobalah saat Anda LIVE.' });
  }
});

app.post('/api/actions', (req, res) => {
  const actions = readData('actions.json') || [];
  const action = { id: uuidv4(), ...req.body, createdAt: Date.now() };
  actions.push(action);
  writeData('actions.json', actions);
  res.json(action);
});

app.put('/api/actions/:id', (req, res) => {
  let actions = readData('actions.json') || [];
  const idx = actions.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  actions[idx] = { ...actions[idx], ...req.body };
  writeData('actions.json', actions);
  res.json(actions[idx]);
});

app.post('/api/actions/:id/test', (req, res) => {
  const actions = readData('actions.json') || [];
  const action = actions.find(a => a.id === req.params.id);
  if (!action) return res.status(404).json({ error: 'Action not found' });
  
  const mockTriggerData = {
    test: true,
    user: 'tester',
    message: 'Test action dijalankan'
  };
  
  actionQueue.push({ action, triggerData: mockTriggerData });
  io.emit('queue_size', actionQueue.length);
  processActionQueue();
  
  res.json({ message: 'Action added to queue for testing' });
});

app.delete('/api/actions/:id', (req, res) => {
  let actions = readData('actions.json') || [];
  actions = actions.filter(a => a.id !== req.params.id);
  writeData('actions.json', actions);
  res.json({ success: true });
});

// --- Donations Log ---
app.get('/api/donations', (req, res) => res.json(readData('donations.json') || []));

// Hapus satu donasi by index
app.delete('/api/donations/:index', (req, res) => {
  const idx = parseInt(req.params.index);
  const donations = readData('donations.json') || [];
  if (idx < 0 || idx >= donations.length) return res.status(404).json({ error: 'Not found' });
  donations.splice(idx, 1);
  writeData('donations.json', donations);
  res.json({ success: true });
});

// Hapus semua donasi (clear all)
app.delete('/api/donations', (req, res) => {
  writeData('donations.json', []);
  res.json({ success: true });
});


// --- Gallery ---
app.get('/api/gallery', (req, res) => res.json(readData('gallery.json') || { items: [], config: {} }));

app.put('/api/gallery/reorder', (req, res) => {
  const gallery = readData('gallery.json') || { items: [], config: {} };
  const { newOrderIds } = req.body;
  if (!newOrderIds || !Array.isArray(newOrderIds)) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  
  const newItems = [];
  for (const id of newOrderIds) {
    const item = (gallery.items || []).find(i => i.id === id);
    if (item) newItems.push(item);
  }
  
  for (const item of (gallery.items || [])) {
    if (!newItems.find(i => i.id === item.id)) {
      newItems.push(item);
    }
  }
  
  gallery.items = newItems;
  writeData('gallery.json', gallery);
  io.emit('gallery_update', gallery);
  res.json({ success: true });
});

app.post('/api/gallery/items', (req, res) => {
  const gallery = readData('gallery.json') || { items: [], config: {} };
  gallery.items = gallery.items || [];
  const item = { id: uuidv4(), currentValue: 0, ...req.body };
  gallery.items.push(item);
  writeData('gallery.json', gallery);
  io.emit('gallery_update', gallery);
  res.json(item);
});

app.put('/api/gallery/items/:id', (req, res) => {
  const gallery = readData('gallery.json') || { items: [], config: {} };
  gallery.items = gallery.items || [];
  const idx = gallery.items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  gallery.items[idx] = { ...gallery.items[idx], ...req.body };
  writeData('gallery.json', gallery);
  io.emit('gallery_update', gallery);
  res.json(gallery.items[idx]);
});

app.delete('/api/gallery/items/:id', (req, res) => {
  const gallery = readData('gallery.json') || { items: [], config: {} };
  gallery.items = (gallery.items || []).filter(i => i.id !== req.params.id);
  writeData('gallery.json', gallery);
  io.emit('gallery_update', gallery);
  res.json({ success: true });
});

app.put('/api/gallery/config', (req, res) => {
  const gallery = readData('gallery.json') || { items: [], config: {} };
  gallery.config = { ...gallery.config, ...req.body };
  writeData('gallery.json', gallery);
  io.emit('gallery_update', gallery);
  res.json(gallery.config);
});

// --- Events ---
app.get('/api/events', (req, res) => res.json(readData('events.json') || []));

app.post('/api/events', (req, res) => {
  const events = readData('events.json') || [];
  const ev = { id: uuidv4(), enabled: true, ...req.body, createdAt: Date.now() };
  events.push(ev);
  writeData('events.json', events);
  res.json(ev);
});

app.put('/api/events/:id', (req, res) => {
  let events = readData('events.json') || [];
  const idx = events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  events[idx] = { ...events[idx], ...req.body };
  writeData('events.json', events);
  res.json(events[idx]);
});

app.delete('/api/events/:id', (req, res) => {
  let events = readData('events.json') || [];
  events = events.filter(e => e.id !== req.params.id);
  writeData('events.json', events);
  res.json({ success: true });
});


// --- Screens ---
app.get('/api/screens', (req, res) => {
  let screens = readData('screens.json') || [];
  if (screens.length !== 10) {
    screens = Array.from({ length: 10 }, (_, i) => ({
      id: `screen-${i + 1}`,
      name: `Screen ${i + 1}`,
      enabled: true,
      maxQueue: 100,
      createdAt: Date.now()
    }));
    writeData('screens.json', screens);
  }
  res.json(screens);
});

app.put('/api/screens/:id', (req, res) => {
  let screens = readData('screens.json') || [];
  const idx = screens.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  screens[idx] = { ...screens[idx], ...req.body };
  writeData('screens.json', screens);
  io.emit('screen_update', screens[idx]);
  res.json(screens[idx]);
});

// --- File Upload ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.originalname, size: req.file.size });
});

// --- Subathon ---
app.get('/api/subathon', (req, res) => {
  const sub = readData('subathon.json') || {};
  const cfg = readData('config.json') || {};
  res.json({ ...sub, webhookKey: cfg.webhookKey || '' });
});

app.put('/api/subathon', (req, res) => {
  const sub = { ...readData('subathon.json'), ...req.body };
  writeData('subathon.json', sub);
  io.emit('subathon_update', sub);
  res.json(sub);
});

app.post('/api/subathon/start', (req, res) => {
  const sub = readData('subathon.json');
  sub.enabled = true;
  sub.paused = false;
  sub.timeSeconds = req.body.timeSeconds || sub.initialTimeSeconds;
  writeData('subathon.json', sub);
  io.emit('subathon_update', sub);
  res.json(sub);
});

app.post('/api/subathon/pause', (req, res) => {
  const sub = readData('subathon.json');
  sub.paused = true;
  writeData('subathon.json', sub);
  io.emit('subathon_update', sub);
  res.json(sub);
});

app.post('/api/subathon/resume', (req, res) => {
  const sub = readData('subathon.json');
  sub.paused = false;
  writeData('subathon.json', sub);
  io.emit('subathon_update', sub);
  res.json(sub);
});

app.post('/api/subathon/add-time', (req, res) => {
  const sub = readData('subathon.json');
  sub.timeSeconds = (sub.timeSeconds || 0) + (req.body.seconds || 0);
  writeData('subathon.json', sub);
  io.emit('subathon_update', sub);
  io.emit('subathon_tick', { timeSeconds: sub.timeSeconds });
  res.json(sub);
});

app.post('/api/subathon/test-webhook', (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const method = req.body.method || 'POST';
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.');
  if (isLocal) {
    io.emit('trigger_client_webhook', { method: method, url, data: { event: 'subathon_ended', test: true, timestamp: new Date().toISOString() }, actionId: 'subathon_end_test', type: 'webhook' });
  } else {
    if (method === 'GET') {
      axios.get(url, { timeout: 10000 }).catch(() => {});
    } else {
      axios.post(url, { event: 'subathon_ended', test: true, timestamp: new Date().toISOString() }, { timeout: 10000 }).catch(() => {});
    }
  }
  res.json({ success: true });
});

// Saweria webhook
app.post('/api/webhook/saweria', (req, res) => {
  const data = req.body;
  const token = req.headers['saweria-webhook-token'] || req.headers['webhook-token'] || req.headers['authorization'] || req.body.token || req.query.token || '';
  
  const sub = readData('subathon.json');

  // Validasi key dari URL (?key=...)
  const config = readData('config.json');
  const webhookKey = config?.webhookKey || '';
  if (webhookKey && req.query.key !== webhookKey) {
    return res.status(403).json({ error: 'Invalid webhook key. Gunakan URL yang benar dari dashboard.' });
  }

  io.emit('donation', { platform: 'saweria', ...data });
  const donorAmount = data.amount_raw || data.amount || 0;
  triggerEvent('saweria', { ...data, token, amount: donorAmount });

  const donorName = data.donator_name || data.sender_name || data.name || 'Seseorang';
  const ev = { type: 'saweria', user: donorName, amount: donorAmount, message: data.message || '', time: Date.now() };
  
  // Save permanently to donations log only if it's not a test
  if (data.message !== 'Test donation') {
    const donations = readData('donations.json') || [];
    donations.unshift(ev);
    writeData('donations.json', donations);
    io.emit('new_donation_log', ev);
  }
  sendDonationWebhook(ev); // non-blocking outgoing webhook

  addRecentEvent(ev);
  io.emit('tiktok_event', ev);

  if (sub && sub.enabled && sub.saweria.enabled) {
    let addSeconds = 0;
    for (const rule of (sub.rules || [])) {
      if (rule.platform === 'saweria') {
        addSeconds = Math.max(addSeconds, Math.round(rule.secondsPerAmount * (donorAmount / rule.minAmount)));
      }
    }
    if (addSeconds > 0) {
      sub.timeSeconds += addSeconds;
      writeData('subathon.json', sub);
      io.emit('subathon_update', sub);
      io.emit('toast', { type: 'success', message: `Saweria +${formatTime(addSeconds)}` });
    }
  }
  
    const subYt = readData('subathon_yt.json');
    if (subYt && subYt.enabled && sub.saweria.enabled) {
      let addSecondsYt = 0;
      for (const rule of (sub.rules || [])) {
        if (rule.platform === 'saweria') {
          addSecondsYt = Math.max(addSecondsYt, Math.round(rule.secondsPerAmount * (donorAmount / rule.minAmount)));
        }
      }
      if (addSecondsYt > 0) {
        subYt.timeSeconds += addSecondsYt;
        writeData('subathon_yt.json', subYt);
        io.emit('subathon_yt_update', subYt);
        io.emit('subathon_yt_tick', { timeSeconds: subYt.timeSeconds });
      }
    }
    res.json({ success: true });
});

// Sociabuzz webhook
app.post('/api/webhook/sociabuzz', (req, res) => {
  const data = req.body;
  const token = req.headers['sb-webhook-token'] || req.headers['sociabuzz-webhook-token'] || req.headers['webhook-token'] || req.headers['authorization'] || req.body.token || req.query.token || '';
  
  const sub = readData('subathon.json');

  // Validasi key dari URL (?key=...)
  const config = readData('config.json');
  const webhookKey = config?.webhookKey || '';
  if (webhookKey && req.query.key !== webhookKey) {
    return res.status(403).json({ error: 'Invalid webhook key. Gunakan URL yang benar dari dashboard.' });
  }

  io.emit('donation', { platform: 'sociabuzz', ...data });
  triggerEvent('sociabuzz', { ...data, token, amount: data.amount || 0 });

  // Debug: tulis raw body ke file sementara (hapus setelah selesai debug)
  // fs.writeFileSync(path.join(DATA_DIR, 'debug_sociabuzz.json'), JSON.stringify({ headers: req.headers, body: data }, null, 2));

  const donorName = data.supporter || data.supporter_name || data.donator_name || data.sender_name || 
                    data.name || data.from || data.username || 'Seseorang';
  const donorAmount = data.amount || data.price || data.total || 0;
  const donorMessage = data.message || data.note || data.comment || '';
  const ev = { type: 'sociabuzz', user: donorName, amount: donorAmount, message: donorMessage, time: Date.now() };
  
  // Save permanently to donations log only if it's not a test
  if (donorMessage !== 'Test donation') {
    const donations = readData('donations.json') || [];
    donations.unshift(ev);
    writeData('donations.json', donations);
    io.emit('new_donation_log', ev);
  }
  sendDonationWebhook(ev); // non-blocking outgoing webhook

  addRecentEvent(ev);
  io.emit('tiktok_event', ev);

  if (sub && sub.enabled && sub.sociabuzz.enabled) {
    const amount = data.amount || 0;
    let addSeconds = 0;
    for (const rule of (sub.rules || [])) {
      if (rule.platform === 'sociabuzz') {
        addSeconds = Math.max(addSeconds, Math.round(rule.secondsPerAmount * (amount / rule.minAmount)));
      }
    }
    if (addSeconds > 0) {
      sub.timeSeconds += addSeconds;
      writeData('subathon.json', sub);
      io.emit('subathon_update', sub);
      io.emit('toast', { type: 'success', message: `Sociabuzz +${formatTime(addSeconds)}` });
    }
  }
  
    const subYt = readData('subathon_yt.json');
    if (subYt && subYt.enabled && sub.sociabuzz.enabled) {
      let addSecondsYt = 0;
      for (const rule of (sub.rules || [])) {
        if (rule.platform === 'sociabuzz') {
          addSecondsYt = Math.max(addSecondsYt, Math.round(rule.secondsPerAmount * (donorAmount / rule.minAmount)));
        }
      }
      if (addSecondsYt > 0) {
        subYt.timeSeconds += addSecondsYt;
        writeData('subathon_yt.json', subYt);
        io.emit('subathon_yt_update', subYt);
        io.emit('subathon_yt_tick', { timeSeconds: subYt.timeSeconds });
      }
    }
    res.json({ success: true });
});

function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}


// ==================== ANALYTICS API ====================
app.get('/api/analytics', (req, res) => {
  const analytics = readData('analytics.json') || {};
  res.json(analytics);
});

// ==================== TOP DONATE ====================
app.get('/api/top-donate', (req, res) => {
  const period = req.query.period || 'all'; // 'day' | 'month' | 'all'
  const limit = parseInt(req.query.limit || '10');

  const donations = readData('donations.json') || [];

  // Filter by period
  const now = Date.now();
  const filtered = donations.filter(d => {
    if (period === 'day') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return d.time >= startOfDay.getTime();
    } else if (period === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      return d.time >= startOfMonth.getTime();
    }
    return true; // 'all'
  });

  // Group by name (case-sensitive, exact match)
  const map = {};
  for (const d of filtered) {
    const name = d.user || 'Seseorang';
    const amt = parseFloat(d.amount || 0);
    if (!map[name]) {
      map[name] = { name, totalAmount: 0, count: 0 };
    }
    map[name].totalAmount += amt;
    map[name].count += 1;
  }

  // Sort by totalAmount DESC, take top N
  const leaderboard = Object.values(map)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);

  res.json({ period, leaderboard });
});

// Top Donate Config
app.get('/api/top-donate-config', (req, res) => {
  const cfg = readData('top-donate-config.json') || {
    title: 'Top Donate',
    defaultPeriod: 'all',
    limit: 10,
    overlayLimit: 5,
    showCount: false,
  };
  res.json(cfg);
});

app.put('/api/top-donate-config', (req, res) => {
  const existing = readData('top-donate-config.json') || {};
  const updated = { ...existing, ...req.body };
  writeData('top-donate-config.json', updated);
  res.json({ success: true, config: updated });
});

// Overlay
app.get('/overlay/subathon', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'subathon.html'));
});

app.get('/overlay/top-donate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'top-donate.html'));
});

// Screen overlay
app.get('/screen/:id', (req, res) => {
  const screens = readData('screens.json') || [];
  const screen = screens.find(s => s.id === req.params.id);
  if (!screen) return res.status(404).send('Screen not found');

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${screen.name}</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background: #000; width:100vw; height:100vh; overflow:hidden; }
    #content-frame { width:100%; height:100%; border:none; display:${screen.url ? 'block' : 'none'}; }
    #video-overlay { position:fixed; inset:0; background:#000; display:none; align-items:center; justify-content:center; z-index:100; }
    #video-overlay.visible { display:flex; }
    #video-overlay video { max-width:100%; max-height:100%; }
  </style>
</head>
<body>
  ${screen.url ? `<iframe id="content-frame" src="${screen.url}" allowfullscreen></iframe>` : ''}
  <div id="video-overlay">
    <video id="overlay-video" autoplay></video>
  </div>
  <script>
    const socket = io();
    const screenId = '${screen.id}';
    const overlay = document.getElementById('video-overlay');
    const video = document.getElementById('overlay-video');

    socket.emit('register_screen', screenId);

    socket.on('play_video', (data) => {
      if (data.screenId && data.screenId !== screenId) return;
      const url = data.url;
      if (!url) return;
      video.src = url;
      video.volume = data.volume || 1;
      overlay.classList.add('visible');
      socket.emit('screen_playing', screenId);
      video.play().catch(err => {
        console.error("Autoplay diblokir browser:", err);
        overlay.classList.remove('visible');
        video.src = '';
        socket.emit('screen_ready', screenId);
      });
      video.onended = () => { 
        overlay.classList.remove('visible'); 
        video.src = ''; 
        socket.emit('screen_ready', screenId);
      };
    });

    socket.on('play_audio', (data) => {
      if (data.screenId && data.screenId !== screenId) return;
      const url = data.url;
      if (!url) return;
      const audio = new Audio(url);
      audio.volume = data.volume || 1;
      socket.emit('screen_playing', screenId);
      audio.play().catch(err => {
        console.error("Audio diblokir browser:", err);
        socket.emit('screen_ready', screenId);
      });
      audio.onended = () => {
        socket.emit('screen_ready', screenId);
      };
    });
  </script>
</body>
</html>`);
});

// Reset stats
app.post('/api/stats/reset', (req, res) => {
  stats = { viewers: 0, likes: 0, gifts: 0, comments: 0, follows: 0, totalGiftValue: 0 };
  writeData('stats.json', stats);
  io.emit('stats_update', stats);
  res.json({ success: true });
});

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial state
  socket.emit('connection_state', connectionState);
  socket.emit('yt_connection_state', ytConnectionState);
  socket.emit('stats_update', readData('stats.json') || {});
  socket.emit('subathon_update', readData('subathon.json'));
    socket.emit('subathon_yt_update', readData('subathon_yt.json') || {});
  socket.emit('recent_events', recentEvents.slice(0, 50));
  socket.emit('screen_statuses', screenStatuses);

  socket.on('register_screen', (id) => {
    socket.screenId = id;
    screenStatuses[id] = 'Ready';
    io.emit('screen_statuses', screenStatuses);
  });

  socket.on('screen_playing', (id) => {
    screenStatuses[id] = 'Playing';
    io.emit('screen_statuses', screenStatuses);
  });

  socket.on('screen_ready', (id) => {
    if (screenStatuses[id] === 'Playing') {
      screenStatuses[id] = 'Ready';
      io.emit('screen_statuses', screenStatuses);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.screenId) {
      screenStatuses[socket.screenId] = 'Offline';
      io.emit('screen_statuses', screenStatuses);
    }
  });

  socket.on('request_stats', () => {
    socket.emit('stats_update', readData('stats.json') || {});
  });
});


// ==================== SUBATHON YT TIMER ====================
let subathonYtTimer = null;

if (!readData('subathon_yt.json')) writeData('subathon_yt.json', {
  enabled: false,
  paused: true,
  title: 'Subathon YouTube',
  timeSeconds: 3600,
  initialTimeSeconds: 3600
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
          const axios = require('axios');
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
  res.json(sub);
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
    const axios = require('axios');
    if (method === 'GET') {
      axios.get(url, { timeout: 10000 }).catch(() => {});
    } else {
      axios.post(url, { event: 'subathon_ended', test: true, timestamp: new Date().toISOString() }, { timeout: 10000 }).catch(() => {});
    }
  }
  res.json({ success: true });
});

app.get('/overlay/subathon_yt', (req, res) => {
  const path = require('path');
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'subathon_yt.html'));
});


// ==================== START SERVER ====================
const PORT = process.env.PORT || 3005;
server.listen(PORT, async () => {
  console.log(`\n[BOOT] 🚀 TikFlow Server v2.0 Production Ready berjalan di port ${PORT}`);
  console.log(`[BOOT] 📺 Subathon overlay: http://localhost:${PORT}/overlay/subathon`);
  console.log(`[BOOT] 🔗 Saweria webhook: http://localhost:${PORT}/api/webhook/saweria`);
  console.log(`[BOOT] 🔗 Sociabuzz webhook: http://localhost:${PORT}/api/webhook/sociabuzz\n`);

  // === AUTO CONNECT saat server start ===
  const config = readData('config.json') || {};
  const autoUsername = connectionState.username || config.tiktokUsername || DEFAULT_USERNAME;
  const savedSessionId = config.sessionId || '';
    const savedYtId = config.ytChannelId || '';
    const savedYtIsLiveId = !!config.ytIsLiveId;
  
  if (autoUsername) {
    console.log(`[BOOT] 🔄 Auto-connecting ke @${autoUsername}...`);
    connectionState.username = autoUsername;

    // Coba connect pertama kali (silent = tidak spam toast)
    await connectTikTok(autoUsername, true, savedSessionId);

    // Mulai auto-detect setiap 30 detik
    startAutoDetect(autoUsername, savedSessionId);
    console.log(`[BOOT] ⏳ Auto-detect aktif untuk @${autoUsername} (setiap 30 detik)`);
  }

  if (savedYtId) {
    console.log(`[BOOT] 🔄 Auto-connecting ke YouTube ID: ${savedYtId}...`);
    try {
      await doConnectYoutube(savedYtId, savedYtIsLiveId, true);
    } catch(err) {
      console.log(`[BOOT] ⏳ YouTube tidak live, memulai auto-detect...`);
    }
    startYtAutoDetect(savedYtId, savedYtIsLiveId);
  }
});
// Forced update for VPS sync

