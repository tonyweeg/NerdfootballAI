const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

async function verifyWeeksData() {
    console.log('🔍 Verifying NFL game data for Weeks 1, 2, and 3...');

    const weeks = [1, 2, 3];

    for (const week of weeks) {
        console.log(`\n=== WEEK ${week} ===`);
        try {
            const docRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${week}`);
            const doc = await docRef.get();

            if (!doc.exists) {
                console.log(`❌ Week ${week}: Document does not exist`);
                continue;
            }

            const weekData = doc.data();
            const games = Object.keys(weekData);
            console.log(`📊 Week ${week}: ${games.length} games found`);

            let finalGames = 0;
            let validStructure = 0;

            for (const gameId of games) {
                const game = weekData[gameId];

                // Check structure
                if (game.a && game.h && game.hasOwnProperty('status')) {
                    validStructure++;
                    if (game.status === 'final' && game.winner) {
                        finalGames++;
                        console.log(`✅ Game ${gameId}: ${game.a} @ ${game.h} - Winner: ${game.winner}`);
                    }
                } else {
                    console.log(`❌ Game ${gameId}: Invalid structure`);
                    console.log(`   Data:`, JSON.stringify(game, null, 2));
                }
            }

            console.log(`📈 Week ${week} Summary:`);
            console.log(`   Valid structure: ${validStructure}/${games.length}`);
            console.log(`   Final games: ${finalGames}/${games.length}`);

            if (validStructure === games.length && finalGames === games.length) {
                console.log(`🎯 Week ${week}: PERFECT DATA ✨`);
            } else {
                console.log(`⚠️  Week ${week}: NEEDS ATTENTION`);
            }

        } catch (error) {
            console.error(`💥 Error checking Week ${week}:`, error);
        }
    }
}

// Run verification
verifyWeeksData()
    .then(() => {
        console.log('\n🏁 Data verification complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Verification failed:', error);
        process.exit(1);
    });