// Find Denver Broncos Game in ESPN Results
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nerdfootball-dd237-default-rtdb.firebaseio.com/'
});

const db = admin.firestore();

async function findDenverGame() {
    console.log('🔍 FINDING DENVER BRONCOS GAME IN ESPN RESULTS');
    console.log('='.repeat(60));

    try {
        // Get Week 1 game results
        const week1Doc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/1').get();
        const week1Data = week1Doc.data();

        console.log('🏈 SEARCHING FOR DENVER BRONCOS GAME:');
        console.log('Expected: Tennessee Titans @ Denver Broncos (Internal Game 111)');
        console.log('');

        let foundDenverGame = false;

        for (const [gameId, gameData] of Object.entries(week1Data)) {
            console.log(`Game ${gameId}:`);

            // Try to extract team names from the game data
            let teams = [];
            if (gameData.homeTeam) teams.push(`Home: ${gameData.homeTeam}`);
            if (gameData.awayTeam) teams.push(`Away: ${gameData.awayTeam}`);

            // Check additional fields that might contain team info
            const allKeys = Object.keys(gameData);
            console.log(`   Fields: ${allKeys.join(', ')}`);
            console.log(`   ${teams.join(', ')}`);
            console.log(`   Score: ${gameData.awayScore || '?'} - ${gameData.homeScore || '?'}`);
            console.log(`   Status: ${gameData.status || 'Unknown'}`);
            console.log(`   Winner: ${gameData.winner || 'TBD'}`);

            // Check if this could be the Denver game
            const gameText = JSON.stringify(gameData).toLowerCase();
            if (gameText.includes('denver') || gameText.includes('broncos') || gameText.includes('titans') || gameText.includes('tennessee')) {
                console.log(`   🎯 POTENTIAL DENVER GAME FOUND!`);
                console.log(`   Full data: ${JSON.stringify(gameData, null, 2)}`);
                foundDenverGame = true;
            }

            console.log('');
        }

        if (!foundDenverGame) {
            console.log('❌ NO DENVER BRONCOS GAME FOUND IN ESPN RESULTS');
            console.log('');
            console.log('🔍 This confirms the ID mapping bug:');
            console.log('   - User picked Denver Broncos in internal Game 111');
            console.log('   - ESPN results contain games with IDs 2224-2237');
            console.log('   - No mapping exists between internal ID 111 and ESPN IDs');
            console.log('   - System cannot find game result, assumes elimination');
        }

        // Check if there's a Week 2 to see if games are stored under wrong week
        console.log('🔍 CHECKING WEEK 2 FOR DENVER GAME:');
        try {
            const week2Doc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/2').get();
            if (week2Doc.exists()) {
                const week2Data = week2Doc.data();
                console.log(`Week 2 has ${Object.keys(week2Data).length} games`);

                for (const [gameId, gameData] of Object.entries(week2Data)) {
                    const gameText = JSON.stringify(gameData).toLowerCase();
                    if (gameText.includes('denver') || gameText.includes('broncos') || gameText.includes('titans') || gameText.includes('tennessee')) {
                        console.log(`   🎯 DENVER GAME FOUND IN WEEK 2! Game ${gameId}`);
                        console.log(`   Full data: ${JSON.stringify(gameData, null, 2)}`);
                        foundDenverGame = true;
                    }
                }
            } else {
                console.log('Week 2 data not found');
            }
        } catch (error) {
            console.log('Error checking Week 2:', error.message);
        }

    } catch (error) {
        console.error('❌ Search failed:', error);
    }
}

// Run if called directly
if (require.main === module) {
    findDenverGame().then(() => {
        process.exit(0);
    });
}

module.exports = { findDenverGame };