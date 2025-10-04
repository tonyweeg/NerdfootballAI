const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function checkWeek4Games() {
    try {
        console.log('🏈 Checking Week 4 games status...');

        const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        const gamesRef = db.doc(gamesPath);

        const snapshot = await gamesRef.get();
        if (!snapshot.exists) {
            console.log('❌ No Week 4 games found');
            return;
        }

        const data = snapshot.data();
        const gameIds = Object.keys(data).filter(key => !key.startsWith('_'));

        console.log(`📊 Found ${gameIds.length} games in Week 4:`);

        let finalGames = 0;
        let inProgressGames = 0;
        let scheduledGames = 0;

        gameIds.forEach(gameId => {
            const game = data[gameId];
            const status = game.status || 'scheduled';
            console.log(`Game ${gameId}: ${game.a} @ ${game.h} - Status: ${status}`);

            if (status.includes('FINAL')) {
                finalGames++;
            } else if (status === 'IN_PROGRESS') {
                inProgressGames++;
            } else {
                scheduledGames++;
            }
        });

        console.log(`\n📈 Summary:`);
        console.log(`   FINAL: ${finalGames}`);
        console.log(`   IN_PROGRESS: ${inProgressGames}`);
        console.log(`   SCHEDULED: ${scheduledGames}`);

        // If all games are final, check if scoring was processed
        if (finalGames > 0 && scheduledGames === 0 && inProgressGames === 0) {
            console.log(`\n🎯 All Week 4 games appear to be final - scoring should have been processed`);

            // Check if a specific user has Week 4 scoring data
            const userId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Tony's user ID from the question
            const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
            const scoreRef = db.doc(scorePath);
            const scoreSnap = await scoreRef.get();

            if (scoreSnap.exists()) {
                const scoreData = scoreSnap.data();
                const weeklyPoints = scoreData.weeklyPoints || {};
                console.log(`\n👤 User ${userId} scoring data:`);
                console.log('   Week 1:', weeklyPoints['1'] || 'No data');
                console.log('   Week 2:', weeklyPoints['2'] || 'No data');
                console.log('   Week 3:', weeklyPoints['3'] || 'No data');
                console.log('   Week 4:', weeklyPoints['4'] || 'No data');

                if (!weeklyPoints['4']) {
                    console.log(`\n❌ CONFIRMED: Week 4 scoring data missing despite games being final`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error checking Week 4 games:', error);
    }
}

checkWeek4Games();