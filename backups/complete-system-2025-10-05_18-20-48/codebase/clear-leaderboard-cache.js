const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function clearLeaderboardCache() {
    try {
        console.log('🧹 Clearing leaderboard cache to force refresh with corrected data...');

        // Clear season leaderboard cache
        const seasonCachePath = 'cache/season_leaderboard_2025';
        await db.doc(seasonCachePath).delete();
        console.log('✅ Cleared season leaderboard cache');

        // Clear weekly leaderboard caches for weeks 1-4
        for (let week = 1; week <= 4; week++) {
            const weeklyCachePath = `cache/weekly_leaderboard_2025_week_${week}`;
            await db.doc(weeklyCachePath).delete();
            console.log(`✅ Cleared Week ${week} leaderboard cache`);
        }

        console.log('🎉 All leaderboard caches cleared! Next requests will regenerate with corrected scoring data.');

    } catch (error) {
        console.error('❌ Error clearing cache:', error);
    }
}

clearLeaderboardCache();