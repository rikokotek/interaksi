(async () => {
  const tlc = await import('tiktok-live-connector');
  const TikTokLiveConnection = tlc.TikTokLiveConnection || tlc.WebcastPushConnection || tlc.default?.TikTokLiveConnection || tlc.default || tlc;

  const username = process.argv[2] || 'roseanaa69';
  const sessionId = process.argv[3];

  console.log(`\n=== TIKTOK LIVE CONNECTION TEST ===`);
  console.log(`Username   : @${username}`);
  console.log(`Session ID : ${sessionId ? sessionId.substring(0, 5) + '...' + sessionId.slice(-5) : 'KOSONG'}\n`);

  const options = {
    processInitialData: false,
    fetchRoomInfoOnConnect: false,
    enableExtendedGiftInfo: false,
    enableWebsocketUpgrade: true
  };

  if (sessionId) {
    options.session = { cookie: { value: { sessionId: sessionId, ttTargetIdc: 'tiktok' } } };
  }

  const client = new TikTokLiveConnection(username, options);

  client.on('connected', () => {
    console.log(`✅ BERHASIL CONNECT KE @${username}!`);
    process.exit(0);
  });

  client.on('error', (err) => {
    console.log(`❌ EVENT ERROR TERJADI:`);
    console.log(err.message);
    console.log(err.stack);
  });

  console.log(`⏳ Sedang mencoba connect...`);
  client.connect().then(() => {
    console.log(`✅ PROMISE CONNECT BERHASIL!`);
  }).catch(err => {
    console.log(`❌ PROMISE ERROR TERJADI:`);
    console.log(err.message);
    if (err.message.includes('offline') || err.message.includes('live')) {
      console.log(`\n⚠️ PENTING: Library mengira streamer OFFLINE. Ini biasanya terjadi jika:`);
      console.log(`1. Streamer memang tidak sedang LIVE.`);
      console.log(`2. IP diblokir oleh TikTok (Error 403 / kosong), dan library salah mengira itu offline.`);
      console.log(`3. Session ID salah/expired sehingga terbaca sebagai guest anonim yang diblokir.`);
    }
    process.exit(1);
  });
})();
