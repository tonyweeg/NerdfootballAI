const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearWeek4Cache() {
    try {
        console.log('🔥 Deleting Week 4 cache to force regeneration...');

        const cachePath = 'cache/weekly_leaderboard_2025_week_4';
        await db.doc(cachePath).delete();

        console.log('✅ Week 4 cache deleted successfully');
        console.log('🔄 Now triggering regeneration...');

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\n📊 You can now call the generateWeeklyLeaderboardCache function');
        console.log('   URL: https://generateweeklyleaderboardcache-np7uealtnq-uc.a.run.app?week=4');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

clearWeek4Cache();
