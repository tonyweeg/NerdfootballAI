const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkGameTimes() {
    const week = 5;
    const biblePath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
    const bibleDoc = await db.doc(biblePath).get();
    const bibleData = bibleDoc.data();

    console.log('\n📅 WEEK 5 GAME SCHEDULE:\n');

    ['501', '502', '503', '504', '505'].forEach(gameId => {
        if (bibleData[gameId]) {
            const game = bibleData[gameId];
            console.log(`Game ${gameId}: ${game.a} @ ${game.h}`);
            console.log(`  Date/Time: ${game.dt || game.d || 'NOT SET'}`);
            console.log(`  Status: ${game.status || game.s || 'unknown'}`);
            console.log(`  ESPN ID: ${game.espnId || 'none'}`);
            console.log('');
        }
    });

    process.exit(0);
}

checkGameTimes();
