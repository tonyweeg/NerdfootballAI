/**
 * 🔍 EXAMINE ACTUAL ESPN DATA STRUCTURE
 *
 * Stop guessing - let's see exactly what ESPN data looks like for Week 2
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'nerdfootball'
    });
}

const db = admin.firestore();

async function examineRealESPNStructure() {
    console.log('🔍 EXAMINING REAL ESPN DATA STRUCTURE - WEEK 2');
    console.log('===============================================');

    try {
        // Get ESPN cache data
        const cacheDoc = await db.doc('cache/espn_current_data').get();
        const gameResults = cacheDoc.data();

        console.log('\n📊 ESPN Cache Overview:');
        console.log(`   Last Updated: ${new Date(gameResults.lastUpdated)}`);
        console.log(`   Total teamResults entries: ${Object.keys(gameResults.teamResults || {}).length}`);

        // Examine Week 2 data specifically
        console.log('\n🏈 ALL WEEK 2 TEAM RESULTS:');
        const week2Results = Object.entries(gameResults.teamResults || {})
            .filter(([key, result]) => key.includes('_2'))
            .sort();

        week2Results.forEach(([key, result]) => {
            console.log(`   ${key} → Winner: "${result.winner}" | Status: ${result.status || 'unknown'}`);
        });

        // Now let's look at a sample user's picks to see exact format
        console.log('\n👤 SAMPLE USER PICKS FORMAT:');
        const legacyPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks/2/submissions';
        const submissionsCollection = await db.collection(legacyPath).get();

        let sampleUserData = null;
        submissionsCollection.forEach(userDoc => {
            if (!sampleUserData) {
                sampleUserData = userDoc.data();
            }
        });

        if (sampleUserData && sampleUserData.picks) {
            console.log('   Sample user picks:');
            Object.entries(sampleUserData.picks).slice(0, 5).forEach(([gameKey, pick]) => {
                if (typeof pick === 'object' && pick.winner) {
                    console.log(`   ${gameKey}: "${pick.winner}" (confidence: ${pick.confidence})`);
                }
            });
        }

        // Try direct matching test
        console.log('\n🎯 DIRECT MATCHING TEST:');
        if (sampleUserData && sampleUserData.picks) {
            Object.entries(sampleUserData.picks).slice(0, 3).forEach(([gameKey, pick]) => {
                if (typeof pick === 'object' && pick.winner) {
                    console.log(`\n   Testing pick: "${pick.winner}"`);

                    // Test exact match in Week 2 results
                    const exactMatch = week2Results.find(([key, result]) =>
                        key === `${pick.winner}_2`
                    );

                    if (exactMatch) {
                        console.log(`   ✅ EXACT MATCH: ${exactMatch[0]} → Winner: ${exactMatch[1].winner}`);
                        if (exactMatch[1].winner === pick.winner) {
                            console.log(`   🏆 WOULD EARN: ${pick.confidence} points!`);
                        } else {
                            console.log(`   ❌ WOULD EARN: 0 points (wrong winner)`);
                        }
                    } else {
                        console.log(`   ❌ NO EXACT MATCH found for "${pick.winner}_2"`);

                        // Try partial matches
                        const partialMatches = week2Results.filter(([key, result]) =>
                            key.toLowerCase().includes(pick.winner.toLowerCase()) ||
                            pick.winner.toLowerCase().includes(key.split('_')[0].toLowerCase())
                        );

                        if (partialMatches.length > 0) {
                            console.log(`   🔍 PARTIAL MATCHES:`);
                            partialMatches.forEach(([key, result]) => {
                                console.log(`      ${key} → Winner: ${result.winner}`);
                            });
                        }
                    }
                }
            });
        }

        // Look at the actual games structure too
        console.log('\n🎮 GAMES STRUCTURE (if exists):');
        if (gameResults.games) {
            console.log(`   Found ${gameResults.games.length} games`);
            gameResults.games.slice(0, 3).forEach((game, index) => {
                console.log(`   Game ${index + 1}:`);
                console.log(`      Home: ${game.homeTeam || 'unknown'}`);
                console.log(`      Away: ${game.awayTeam || 'unknown'}`);
                console.log(`      Winner: ${game.winner || 'TBD'}`);
                console.log(`      Week: ${game.week || 'unknown'}`);
                console.log(`      Status: ${game.status || 'unknown'}`);
            });
        } else {
            console.log('   No games array found in ESPN data');
        }

    } catch (error) {
        console.error('💥 Examination failed:', error);
    }
}

examineRealESPNStructure().catch(console.error);