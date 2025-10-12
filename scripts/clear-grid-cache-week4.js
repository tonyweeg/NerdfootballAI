const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearWeek4GridCache() {
    try {
        console.log('🗑️ GRID_CACHE: Clearing Week 4 cache...');

        const week4CachePath = 'artifacts/nerdfootball/pools/nerduniverse-2025/cache/grid-week-4';
        const cacheRef = db.doc(week4CachePath);

        // Check if cache exists
        const cacheSnap = await cacheRef.get();
        if (cacheSnap.exists) {
            const cacheData = cacheSnap.data();
            const created = new Date(cacheData.createdDate);
            const age = Math.floor((Date.now() - created.getTime()) / 1000);

            console.log('📊 GRID_CACHE: Current cache info:');
            console.log(`   Created: ${created.toLocaleString()}`);
            console.log(`   Age: ${Math.floor(age / 60)} minutes (${age} seconds)`);
            console.log(`   Games: ${cacheData.gameIds.length}`);
            console.log(`   Players: ${Object.keys(cacheData.allPicks).length}`);

            // Delete the cache
            await cacheRef.delete();
            console.log('✅ GRID_CACHE: Week 4 cache deleted successfully');
            console.log('🔄 GRID_CACHE: Next Grid load will generate fresh data with corrected tie game logic');
        } else {
            console.log('⚠️ GRID_CACHE: No cache found for Week 4 (already cleared or never created)');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ GRID_CACHE: Error clearing cache:', error);
        process.exit(1);
    }
}

clearWeek4GridCache();
