const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugGridDisplay() {
    const userId = 'bEVzcZtSExT8cIjamWnGbWZ3J5s1'; // NerdMamma
    const week = 5;
    const gameId = '501';

    console.log(`\n🔍 DEBUG: Why isn't NerdMamma's pick showing on the Grid?`);

    try {
        // 1. Check picks
        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions/${userId}`;
        const picksDoc = await db.doc(picksPath).get();
        
        if (picksDoc.exists) {
            const picks = picksDoc.data();
            console.log(`\n✅ PICKS EXIST for Week ${week}:`);
            console.log(`   - Game ${gameId}:`, picks[gameId]);
        } else {
            console.log(`\n❌ NO PICKS FOUND at ${picksPath}`);
        }

        // 2. Check bible data (game info)
        const biblePath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
        const bibleDoc = await db.doc(biblePath).get();
        
        if (bibleDoc.exists) {
            const bibleData = bibleDoc.data();
            console.log(`\n✅ BIBLE DATA EXISTS for Week ${week}:`);
            
            if (bibleData[gameId]) {
                const game = bibleData[gameId];
                console.log(`\n   Game ${gameId} (${game.a} @ ${game.h}):`);
                console.log(`   - Status: ${game.s}`);
                console.log(`   - Date: ${game.d}`);
                console.log(`   - Time: ${game.t}`);
                console.log(`   - Score: ${game.a} ${game.as || 0} - ${game.hs || 0} ${game.h}`);
                console.log(`   - Has game started? ${game.s !== 'scheduled'}`);
                console.log(`   - Is complete? ${game.s === 'final'}`);
            } else {
                console.log(`\n❌ Game ${gameId} NOT FOUND in bible data`);
                console.log(`   Available game IDs:`, Object.keys(bibleData).filter(k => k.match(/^\d+$/)));
            }
        } else {
            console.log(`\n❌ NO BIBLE DATA at ${biblePath}`);
        }

        // 3. Check Grid cache
        const cachePath = `artifacts/nerdfootball/pools/nerduniverse-2025/cache/grid-week-${week}`;
        const cacheDoc = await db.doc(cachePath).get();
        
        if (cacheDoc.exists) {
            const cache = cacheDoc.data();
            console.log(`\n💾 GRID CACHE EXISTS:`);
            console.log(`   - Created: ${cache.createdDate}`);
            console.log(`   - Age: ${Math.round((Date.now() - new Date(cache.createdDate).getTime()) / 1000 / 60)} minutes`);
            
            if (cache.allPicks && cache.allPicks[userId]) {
                console.log(`\n   Cached picks for NerdMamma:`);
                console.log(`   - Game ${gameId}:`, cache.allPicks[userId][gameId] || 'NOT FOUND');
            }
            
            if (cache.gameIds) {
                console.log(`\n   Cached gameIds:`, cache.gameIds.join(', '));
            }
        } else {
            console.log(`\n💾 NO GRID CACHE found`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

debugGridDisplay();
