const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkGridCacheContent() {
    try {
        console.log('Checking Grid cache content for Week 4...\n');

        const week4CachePath = 'artifacts/nerdfootball/pools/nerduniverse-2025/cache/grid-week-4';
        const cacheRef = db.doc(week4CachePath);
        const cacheSnap = await cacheRef.get();

        if (!cacheSnap.exists) {
            console.log('No cache exists for Week 4');
            process.exit(0);
        }

        const cacheData = cacheSnap.data();
        const created = new Date(cacheData.createdDate);
        console.log('Cache Info:');
        console.log('   Created:', created.toLocaleString());
        console.log('   Games:', cacheData.gameIds.length);
        console.log('   Players:', Object.keys(cacheData.allPicks).length);
        console.log('');

        const andyId = 'bEVzcZtSExT8cIjamWnGbWZ3J5s1';
        if (cacheData.allPicks[andyId]) {
            console.log('Andy cached picks:');
            const andyPicks = cacheData.allPicks[andyId];
            for (const [gameId, pick] of Object.entries(andyPicks)) {
                if (gameId.startsWith('_') || !pick.winner) continue;
                console.log('   Game', gameId + ':', pick.winner, '(confidence', pick.confidence + ')');
            }
        } else {
            console.log('Andy not found in cache');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkGridCacheContent();
