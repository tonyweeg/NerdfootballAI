const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Emergency function to clear ESPN cache during live games
exports.clearESPNCache = functions.https.onCall(async (data, context) => {
    try {
        console.log('🚨 EMERGENCY: Clearing ESPN cache for live game data');

        const db = admin.firestore();

        // Clear the main ESPN cache document
        await db.doc('cache/espn_current_data').delete();

        // Clear any additional cache documents
        const cacheCollection = await db.collection('cache').get();
        const deletePromises = [];

        cacheCollection.forEach(doc => {
            if (doc.id.startsWith('espn_') || doc.id.startsWith('games_')) {
                deletePromises.push(doc.ref.delete());
            }
        });

        await Promise.all(deletePromises);

        console.log(`✅ Cleared ${deletePromises.length + 1} cache documents`);

        return {
            success: true,
            message: 'ESPN cache cleared successfully',
            documentsDeleted: deletePromises.length + 1
        };

    } catch (error) {
        console.error('❌ Emergency cache clear failed:', error);
        return { success: false, error: error.message };
    }
});

// Force fresh ESPN data fetch
exports.forceFreshESPNData = functions.https.onCall(async (data, context) => {
    try {
        console.log('⚡ FORCE FRESH: Fetching live ESPN data');

        // This will bypass all caching and hit ESPN API directly
        const EspnNerdApi = require('./espnNerdApi').EspnNerdApi;
        const espnApi = new EspnNerdApi();

        // Get current games without any caching
        const endpoint = '/scoreboard';
        const freshData = await espnApi.makeRequest(endpoint);

        if (!freshData.events || !Array.isArray(freshData.events)) {
            throw new Error('No live games data from ESPN');
        }

        const currentWeek = espnApi.getCurrentWeek();
        const games = freshData.events.map(game => espnApi.transformGameData(game, currentWeek * 100));

        // Store fresh data directly (bypassing normal cache logic)
        const db = admin.firestore();
        await db.doc('cache/espn_live_override').set({
            data: games,
            timestamp: Date.now(),
            lastUpdated: new Date().toISOString(),
            isLiveOverride: true,
            week: currentWeek
        });

        console.log(`✅ Fresh ESPN data cached: ${games.length} games`);

        return {
            success: true,
            gamesCount: games.length,
            week: currentWeek,
            message: 'Fresh ESPN data fetched and cached'
        };

    } catch (error) {
        console.error('❌ Force fresh data failed:', error);
        return { success: false, error: error.message };
    }
});