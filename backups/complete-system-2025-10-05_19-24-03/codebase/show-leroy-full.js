const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function showLeroyFull() {
    const week = 5;
    const picksBasePath = 'artifacts/nerdfootball/public/data/nerdfootball_picks/' + week + '/submissions';
    const leroyId = 'vIuhLHwJ7thZae2mWBSjS5Orr6k2';

    console.log('\n🔍 LEROY LUTZ FULL DOCUMENT\n');
    console.log('='.repeat(80));

    const picksDoc = await db.doc(picksBasePath + '/' + leroyId).get();
    const leroyData = picksDoc.exists ? picksDoc.data() : {};

    console.log('\nFULL DOCUMENT:\n');
    console.log(JSON.stringify(leroyData, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 ANALYSIS:');
    console.log('Total fields: ' + Object.keys(leroyData).length);

    const gameKeys = Object.keys(leroyData).filter(k => /^\d+$/.test(k));
    console.log('GAME picks (501, 502, etc.): ' + gameKeys.length);

    if (gameKeys.length > 0) {
        console.log('\nGame picks:');
        gameKeys.forEach(gameId => {
            const pick = leroyData[gameId];
            console.log('  Game ' + gameId + ': ' + pick.winner + ' (confidence: ' + pick.confidence + ')');
        });
    }

    console.log('\n' + '='.repeat(80));
    process.exit(0);
}

showLeroyFull();
