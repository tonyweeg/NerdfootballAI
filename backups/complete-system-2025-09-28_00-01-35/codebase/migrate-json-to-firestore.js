const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });

/**
 * NERD SCORE BIBLE FIX - September 26, 2025
 * Migrate static JSON files to Firestore for single source of truth
 */

async function migrateJsonToFirestore() {
    console.log('🏈 NERD SCORE BIBLE FIX - Starting migration...');
    console.log('📋 Following plan: nerd-score-bible-fix-2025-26-9.md');

    const weeks = [1, 2, 3];
    const migrationResults = {};

    for (const week of weeks) {
        try {
            console.log(`\n🔄 MIGRATING WEEK ${week}...`);

            // Step 1: Load static JSON data
            const jsonUrl = `https://nerdfootball.web.app/nfl_2025_week_${week}.json`;
            console.log(`📥 Loading: ${jsonUrl}`);

            const response = await fetch(jsonUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch Week ${week}: ${response.status}`);
            }

            const jsonData = await response.json();
            console.log(`✅ Loaded Week ${week} JSON data`);

            // Step 2: Convert to Firestore structure
            let firestoreData;

            if (week === 3) {
                // Special handling for Week 3 nested structure
                console.log('🔧 Converting Week 3 nested structure...');
                firestoreData = convertWeek3Structure(jsonData);
                console.log('⚠️  Week 3 games converted but NEED MANUAL WINNER ASSIGNMENT');
            } else {
                // Weeks 1-2 are already in correct flat structure
                console.log(`✅ Week ${week} already in correct structure`);
                firestoreData = jsonData;
            }

            // Step 3: Add metadata
            firestoreData._metadata = {
                week: week,
                totalGames: Object.keys(firestoreData).filter(k => !k.startsWith('_')).length,
                lastUpdated: new Date().toISOString(),
                dataSource: 'migrated-from-json',
                migrationDate: '2025-09-26',
                migrationScript: 'migrate-json-to-firestore.js'
            };

            // Step 4: Upload to Firestore
            const firestorePath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
            console.log(`📤 Uploading to: ${firestorePath}`);

            const docRef = admin.firestore().doc(firestorePath);
            await docRef.set(firestoreData);

            // Step 5: Verify upload
            const verifySnap = await docRef.get();
            if (verifySnap.exists) {
                const gameCount = Object.keys(verifySnap.data()).filter(k => !k.startsWith('_')).length;
                console.log(`✅ Week ${week} uploaded successfully: ${gameCount} games`);

                migrationResults[week] = {
                    success: true,
                    gameCount: gameCount,
                    hasWinners: week !== 3 || checkForWinners(verifySnap.data()),
                    path: firestorePath
                };
            } else {
                throw new Error('Upload verification failed');
            }

        } catch (error) {
            console.error(`❌ Week ${week} migration failed:`, error.message);
            migrationResults[week] = {
                success: false,
                error: error.message
            };
        }
    }

    // Migration Summary
    console.log('\n📊 MIGRATION SUMMARY:');
    for (const [week, result] of Object.entries(migrationResults)) {
        if (result.success) {
            console.log(`✅ Week ${week}: ${result.gameCount} games migrated to ${result.path}`);
            if (week === '3' && !result.hasWinners) {
                console.log(`⚠️  Week 3: MANUAL ACTION REQUIRED - Add winners to games`);
            }
        } else {
            console.log(`❌ Week ${week}: Failed - ${result.error}`);
        }
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Manually add winners to Week 3 games using nerd-game-updater.html');
    console.log('2. Update admin-scoring-audit.html to use Firestore');
    console.log('3. Update picks-viewer-auth.html to use Firestore');
    console.log('4. Test all systems');
    console.log('5. Deploy to production');

    process.exit(0);
}

function convertWeek3Structure(jsonData) {
    console.log('🔧 Converting Week 3 from nested to flat structure...');

    if (!jsonData.games || !Array.isArray(jsonData.games)) {
        console.error('❌ Week 3 data missing games array');
        return {};
    }

    const firestoreData = {};

    jsonData.games.forEach(game => {
        const gameId = game.id.toString();
        firestoreData[gameId] = {
            id: gameId,
            a: game.a,                    // away team
            h: game.h,                    // home team
            dt: game.dt,                  // datetime
            stadium: game.stadium,        // stadium
            awayScore: null,              // TO BE FILLED MANUALLY
            homeScore: null,              // TO BE FILLED MANUALLY
            status: 'scheduled',          // TO BE UPDATED MANUALLY
            winner: null                  // TO BE FILLED MANUALLY
        };
    });

    console.log(`✅ Converted ${jsonData.games.length} Week 3 games to flat structure`);
    console.log('⚠️  Game winners, scores, and status need manual assignment');

    return firestoreData;
}

function checkForWinners(data) {
    const games = Object.keys(data).filter(k => !k.startsWith('_'));
    const gamesWithWinners = games.filter(gameId => data[gameId].winner);
    return gamesWithWinners.length > 0;
}

// Add manual Week 3 winner assignment helper
function displayWeek3WinnerTemplate() {
    console.log('\n📝 WEEK 3 WINNER ASSIGNMENT TEMPLATE:');
    console.log('Use nerd-game-updater.html to set these winners:');
    console.log('Game 302: Winner = ?');
    console.log('Game 303: Winner = ?');
    console.log('Game 304: Winner = ?');
    console.log('// ... continue for all 15 games');
}

migrateJsonToFirestore().catch(console.error);