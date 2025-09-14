const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Emergency cache clearing function for live game situations
exports.clearAllCaches = functions.https.onCall(async (data, context) => {
    try {
        const db = admin.firestore();

        console.log('🚨 EMERGENCY CACHE CLEAR - Starting complete cache flush');

        // Clear all cache documents
        const cacheCollection = db.collection('cache');
        const snapshot = await cacheCollection.get();

        const batch = db.batch();
        let deletedCount = 0;

        snapshot.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCount++;
            console.log(`Queued for deletion: cache/${doc.id}`);
        });

        await batch.commit();
        console.log(`✅ Deleted ${deletedCount} cache documents`);

        // Force ESPN data refresh by clearing specific cache keys
        const criticalCacheKeys = [
            'games_current',
            'games_live',
            'nfl_teams',
            'espn_current_data'
        ];

        for (const key of criticalCacheKeys) {
            try {
                await db.collection('cache').doc(key).delete();
                console.log(`✅ Force cleared critical cache: ${key}`);
            } catch (error) {
                console.log(`⚠️ Cache key ${key} already cleared or not found`);
            }
        }

        // Clear any ESPN game state caches for current week
        const currentWeek = getCurrentWeek();
        const weekCacheKeys = [
            `games_week_${currentWeek}`,
            `espn_week_${currentWeek}`,
            `survivor_week_${currentWeek}`
        ];

        for (const key of weekCacheKeys) {
            try {
                await db.collection('cache').doc(key).delete();
                console.log(`✅ Force cleared week cache: ${key}`);
            } catch (error) {
                console.log(`⚠️ Week cache key ${key} already cleared or not found`);
            }
        }

        console.log('🎯 EMERGENCY CACHE CLEAR COMPLETE - All caches flushed');

        return {
            success: true,
            message: 'Emergency cache clear completed',
            deletedCacheDocuments: deletedCount,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Emergency cache clear failed:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
});

// Helper function to get current NFL week (2025 season)
function getCurrentWeek() {
    const now = new Date();
    const seasonStart = new Date('2025-09-04'); // 2025 NFL Season starts Sept 4
    const weekMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

    if (now < seasonStart) return 1;

    const weeksDiff = Math.floor((now - seasonStart) / weekMs) + 1;
    return Math.min(Math.max(weeksDiff, 1), 18); // Clamp between 1 and 18
}

// Force refresh ESPN data function
exports.forceRefreshEspnData = functions.https.onCall(async (data, context) => {
    try {
        console.log('🔄 FORCE REFRESH ESPN DATA - Starting');

        const db = admin.firestore();

        // Clear all ESPN-related caches first
        const espnCacheKeys = [
            'games_current',
            'games_live',
            'nfl_teams',
            'espn_current_data'
        ];

        for (const key of espnCacheKeys) {
            await db.collection('cache').doc(key).delete();
            console.log(`🗑️ Cleared ESPN cache: ${key}`);
        }

        // Trigger fresh ESPN data fetch by calling our existing function
        const { EspnNerdApi } = require('./espnNerdApi');
        const espnApi = new EspnNerdApi();

        // Fetch current games with no cache
        const currentWeek = getCurrentWeek();
        console.log(`📥 Fetching fresh ESPN data for week ${currentWeek}`);

        const games = await espnApi.fetchGames();
        console.log(`✅ Fetched ${games.length} fresh games from ESPN`);

        // Store fresh data in cache
        await db.collection('cache').doc('games_current').set({
            data: games,
            timestamp: Date.now(),
            lastUpdated: new Date().toISOString(),
            emergencyRefresh: true
        });

        console.log('🎯 FORCE REFRESH COMPLETE - Fresh ESPN data loaded');

        return {
            success: true,
            message: 'ESPN data force refreshed',
            gamesCount: games.length,
            currentWeek,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Force refresh ESPN data failed:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
});