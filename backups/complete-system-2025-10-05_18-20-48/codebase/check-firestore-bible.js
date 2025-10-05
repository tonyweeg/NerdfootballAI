const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkBibleData() {
    const week = 5;
    const biblePath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
    const bibleDoc = await db.doc(biblePath).get();
    const bibleData = bibleDoc.data();

    console.log('\n📖 FIRESTORE BIBLE DATA - WEEK 5:\n');
    console.log('='.repeat(80));

    // Show all games with their full data
    Object.keys(bibleData)
        .filter(k => !k.startsWith('_') && k !== '000')
        .sort()
        .forEach(gameId => {
            const game = bibleData[gameId];
            console.log(`\nGame ${gameId}:`);
            console.log(`  Away: ${game.a} (${game.awayScore || 0})`);
            console.log(`  Home: ${game.h} (${game.homeScore || 0})`);
            console.log(`  Status: "${game.status}"`);
            console.log(`  Winner: ${game.winner || 'TBD'}`);
            console.log(`  ESPN ID: ${game.espnId || 'none'}`);
            console.log(`  Date/Time: ${game.dt || game.d || 'NOT SET'}`);
            console.log(`  Last Updated: ${game.lastUpdated || 'never'}`);
        });

    console.log('\n' + '='.repeat(80));
    process.exit(0);
}

checkBibleData();
