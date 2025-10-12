const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWeeklyLeaderboardCache() {
    try {
        console.log('🔍 Checking for Week 4 leaderboard cache...\n');

        // Check for weekly leaderboard cache
        const weeklyPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/cache/weekly-leaderboard-4';
        const weeklyDoc = await db.doc(weeklyPath).get();

        if (weeklyDoc.exists) {
            const data = weeklyDoc.data();
            console.log('✅ FOUND WEEKLY LEADERBOARD CACHE');
            console.log('   Created:', new Date(data.createdDate).toLocaleString());
            console.log('   Age:', Math.round((Date.now() - new Date(data.createdDate).getTime()) / 1000 / 60), 'minutes');

            const andyId = 'bEVzcZtSExT8cIjamWnGbWZ3J5s1';
            const andyData = data.leaderboard?.find(p => p.userId === andyId);

            if (andyData) {
                console.log('\n🔍 Andy Anderson cached data:');
                console.log('   Points:', andyData.points);
                console.log('   Correct Picks:', andyData.correctPicks);
            } else {
                console.log('\n❌ Andy not found in cached leaderboard');
            }
        } else {
            console.log('❌ No weekly leaderboard cache found');
        }

        // Check Grid cache too
        const gridPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/cache/grid-week-4';
        const gridDoc = await db.doc(gridPath).get();

        if (gridDoc.exists) {
            const data = gridDoc.data();
            console.log('\n✅ FOUND GRID CACHE');
            console.log('   Created:', new Date(data.createdDate).toLocaleString());
            console.log('   Age:', Math.round((Date.now() - new Date(data.createdDate).getTime()) / 1000 / 60), 'minutes');
        } else {
            console.log('\n❌ No Grid cache found');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkWeeklyLeaderboardCache();
