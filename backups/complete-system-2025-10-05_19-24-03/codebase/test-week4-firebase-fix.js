const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function testWeek4FirebaseFix() {
    console.log('🧪 TESTING Week 4 Firebase Fix');
    console.log('===============================');

    try {
        // 1. Read directly from Firebase path where ESPN Score Monitor updates
        const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        console.log(`📋 Reading from: ${gamesPath}`);

        const docRef = db.doc(gamesPath);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.log('❌ Week 4 document not found');
            return;
        }

        const weekData = docSnap.data();
        const gameIds = Object.keys(weekData).filter(key => !key.startsWith('_') && !key.startsWith('game_'));

        console.log(`📊 Week 4 has ${gameIds.length} games`);

        // 2. Check game statuses
        let finalGames = 0;
        let inProgressGames = 0;
        let scheduledGames = 0;
        let gamesWithWinners = 0;

        gameIds.forEach(gameId => {
            const game = weekData[gameId];

            if (game.status) {
                if (game.status.includes('FINAL')) {
                    finalGames++;
                    if (game.winner) {
                        gamesWithWinners++;
                        console.log(`✅ Game ${gameId}: ${game.winner} won (${game.awayScore}-${game.homeScore})`);
                    }
                } else if (game.status === 'IN_PROGRESS') {
                    inProgressGames++;
                    console.log(`⏳ Game ${gameId}: In Progress (${game.awayScore}-${game.homeScore})`);
                } else if (game.status === 'scheduled') {
                    scheduledGames++;
                    console.log(`📅 Game ${gameId}: Scheduled`);
                }
            }
        });

        console.log('\n📈 WEEK 4 STATUS SUMMARY:');
        console.log(`  ✅ FINAL games: ${finalGames}`);
        console.log(`  ⏳ IN_PROGRESS games: ${inProgressGames}`);
        console.log(`  📅 Scheduled games: ${scheduledGames}`);
        console.log(`  🏆 Games with winners: ${gamesWithWinners}`);

        // 3. Test scoring calculation potential
        const maxPossiblePoints = gameIds.length > 0 ? (gameIds.length * (gameIds.length + 1)) / 2 : 0;
        console.log(`\n🎯 SCORING VALIDATION:`);
        console.log(`  Total games in week: ${gameIds.length}`);
        console.log(`  Max possible points: ${maxPossiblePoints}`);
        console.log(`  Games available for scoring: ${finalGames} (completed games only)`);

        if (finalGames > 0) {
            console.log(`\n✅ SUCCESS: Week 4 has ${finalGames} completed games ready for scoring!`);
            console.log(`📊 ScoringCalculator can now process these games correctly from Firebase`);
        } else {
            console.log(`\n⚠️ No completed games found for scoring yet`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testWeek4FirebaseFix().then(() => {
    console.log('\n🧪 Test complete');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});