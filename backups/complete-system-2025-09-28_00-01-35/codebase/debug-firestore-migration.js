const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });

async function debugFirestoreMigration() {
    console.log('🔍 DEBUGGING FIRESTORE MIGRATION DATA...');

    for (const week of [1, 2, 3]) {
        try {
            console.log(`\n📊 CHECKING WEEK ${week}:`);

            const docPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
            console.log(`  Path: ${docPath}`);

            const docRef = admin.firestore().doc(docPath);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const data = docSnap.data();
                const games = Object.keys(data).filter(k => !k.startsWith('_'));

                console.log(`  ✅ Document exists`);
                console.log(`  📈 Total keys: ${Object.keys(data).length}`);
                console.log(`  🎮 Game keys: ${games.length}`);
                console.log(`  🎯 Game IDs: ${games.slice(0, 5).join(', ')}${games.length > 5 ? '...' : ''}`);

                if (data._metadata) {
                    console.log(`  📝 Metadata: Week ${data._metadata.week}, ${data._metadata.totalGames} games`);
                    console.log(`  🕒 Last updated: ${data._metadata.lastUpdated}`);
                }

                // Check first game structure
                if (games.length > 0) {
                    const firstGame = data[games[0]];
                    console.log(`  🎮 First game (${games[0]}):`, JSON.stringify(firstGame, null, 2));
                }

                // Check for winners
                const gamesWithWinners = games.filter(gameId => data[gameId].winner);
                console.log(`  🏆 Games with winners: ${gamesWithWinners.length}/${games.length}`);

            } else {
                console.log(`  ❌ Document does not exist`);
            }

        } catch (error) {
            console.error(`  ❌ Error checking Week ${week}:`, error.message);
        }
    }

    // Also check what nerd-game-updater expects
    console.log('\n🔍 CHECKING WHAT NERD-GAME-UPDATER EXPECTS:');
    console.log('nerd-game-updater.html createEmptyWeekStructure() creates games like:');
    console.log(`  "401": { a: '', h: '', dt: '', stadium: '', awayScore: null, homeScore: null, status: '', winner: '' }`);

    process.exit(0);
}

debugFirestoreMigration().catch(console.error);