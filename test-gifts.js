const { WebcastPushConnection } = require('tiktok-live-connector');

const username = 'roseanaa69';

const connection = new WebcastPushConnection(username);

connection.connect().then(async state => {
    console.info(`Connected to roomId ${state.roomId}`);
    try {
        const gifts = await connection.getAvailableGifts();
        console.log(`Fetched ${gifts.length} gifts`);
        if (gifts.length > 0) {
            console.log("Sample gift:");
            console.log(JSON.stringify(gifts[0], null, 2));
            console.log("Sample gift 2:");
            console.log(JSON.stringify(gifts[1], null, 2));
        }
    } catch (e) {
        console.error("Failed to get gifts", e);
    }
    process.exit(0);
}).catch(err => {
    console.error('Failed to connect', err);
    process.exit(1);
})
