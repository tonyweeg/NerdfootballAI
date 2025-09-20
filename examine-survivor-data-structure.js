/**
 * 🔍 EXAMINE SURVIVOR SYSTEM DATA STRUCTURE
 *
 * MISSION: Understand how survivor picks and eliminations are stored
 * CRITICAL: Survivor eliminations are permanent - accuracy is life or death!
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

class SurvivorDataStructureExaminer {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
    }

    async examineSurvivorStructure() {
        console.log('🔍 SURVIVOR SYSTEM DATA STRUCTURE EXAMINATION');
        console.log('=============================================');
        console.log('🎯 MISSION: Map survivor data storage and logic');

        try {
            // Check various possible survivor data locations
            await this.checkLegacySurvivorStructure();
            await this.checkUnifiedSurvivorStructure();
            await this.checkSurvivorCacheStructure();
            await this.checkSurvivorStatusData();
            await this.examineSampleSurvivorPicks();
            await this.examineESPNDataForSurvivor();

        } catch (error) {
            console.error('💥 Structure examination failed:', error);
        }
    }

    async checkLegacySurvivorStructure() {
        console.log('\n📊 CHECKING LEGACY SURVIVOR STRUCTURE');
        console.log('======================================');

        try {
            // Check legacy survivor picks path
            const legacyPath = 'artifacts/nerdfootball/public/data';

            // Look for survivor picks
            const survivorPicksCollection = await db.collection(`${legacyPath}/nerdSurvivor_picks`).listDocuments();
            console.log(`✅ Found ${survivorPicksCollection.length} legacy survivor pick documents`);

            if (survivorPicksCollection.length > 0) {
                // Show sample user IDs
                console.log('   Sample survivor pick user IDs:');
                survivorPicksCollection.slice(0, 5).forEach(doc => {
                    console.log(`      • ${doc.id}`);
                });

                // Examine a sample document
                const sampleDoc = await survivorPicksCollection[0].get();
                if (sampleDoc.exists) {
                    const sampleData = sampleDoc.data();
                    console.log('\n   📋 Sample survivor pick document structure:');
                    console.log(`      User ID: ${sampleDoc.id}`);
                    console.log(`      Data keys: ${Object.keys(sampleData).join(', ')}`);

                    // Show sample pick structure
                    if (sampleData.picks) {
                        console.log('      Pick structure:');
                        Object.entries(sampleData.picks).slice(0, 3).forEach(([week, pick]) => {
                            console.log(`         Week ${week}: ${JSON.stringify(pick)}`);
                        });
                    }
                }
            }

            // Check survivor status
            const statusDoc = await db.doc(`${legacyPath}/nerdSurvivor_status/status`).get();
            if (statusDoc.exists) {
                const statusData = statusDoc.data();
                console.log(`\n   ✅ Found survivor status document with ${Object.keys(statusData).length} entries`);

                // Show sample status entries
                console.log('   Sample status entries:');
                Object.entries(statusData).slice(0, 5).forEach(([userId, status]) => {
                    console.log(`      • ${userId}: ${JSON.stringify(status)}`);
                });
            } else {
                console.log('   ❌ No legacy survivor status found');
            }

        } catch (error) {
            console.log(`   ❌ Legacy survivor structure check failed: ${error.message}`);
        }
    }

    async checkUnifiedSurvivorStructure() {
        console.log('\n📊 CHECKING UNIFIED SURVIVOR STRUCTURE');
        console.log('=======================================');

        try {
            const unifiedPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${this.season}`;

            // Check weeks collection
            const weeksCollection = await db.collection(`${unifiedPath}/weeks`).listDocuments();
            console.log(`✅ Found ${weeksCollection.length} unified survivor week documents`);

            if (weeksCollection.length > 0) {
                console.log('   Available weeks:');
                weeksCollection.forEach(doc => {
                    console.log(`      • Week ${doc.id}`);
                });

                // Examine a sample week
                const sampleWeekDoc = await weeksCollection[0].get();
                if (sampleWeekDoc.exists) {
                    const weekData = sampleWeekDoc.data();
                    console.log(`\n   📋 Sample unified week structure (Week ${sampleWeekDoc.id}):`);
                    console.log(`      Data keys: ${Object.keys(weekData).join(', ')}`);

                    if (weekData.picks) {
                        console.log(`      User picks: ${Object.keys(weekData.picks).length} users`);
                        // Show sample picks
                        Object.entries(weekData.picks).slice(0, 3).forEach(([userId, pick]) => {
                            console.log(`         ${userId}: ${JSON.stringify(pick)}`);
                        });
                    }
                }
            }

            // Check compiled sheets
            const compiledDoc = await db.doc(`${unifiedPath}/compiled_sheets`).get();
            if (compiledDoc.exists) {
                const compiledData = compiledDoc.data();
                console.log(`\n   ✅ Found compiled sheets with keys: ${Object.keys(compiledData).join(', ')}`);
            } else {
                console.log('   ❌ No compiled sheets found');
            }

        } catch (error) {
            console.log(`   ❌ Unified survivor structure check failed: ${error.message}`);
        }
    }

    async checkSurvivorCacheStructure() {
        console.log('\n📊 CHECKING SURVIVOR CACHE STRUCTURE');
        console.log('=====================================');

        try {
            const cachePath = `survivor-cache/${this.poolId}/results`;
            const cacheCollection = await db.collection(cachePath).listDocuments();
            console.log(`✅ Found ${cacheCollection.length} survivor cache documents`);

            if (cacheCollection.length > 0) {
                console.log('   Cached weeks:');
                cacheCollection.forEach(doc => {
                    console.log(`      • Week ${doc.id}`);
                });

                // Examine sample cache
                const sampleCacheDoc = await cacheCollection[0].get();
                if (sampleCacheDoc.exists) {
                    const cacheData = sampleCacheDoc.data();
                    console.log(`\n   📋 Sample cache structure (Week ${sampleCacheDoc.id}):`);
                    console.log(`      Cache keys: ${Object.keys(cacheData).join(', ')}`);
                }
            }

        } catch (error) {
            console.log(`   ❌ Survivor cache check failed: ${error.message}`);
        }
    }

    async checkSurvivorStatusData() {
        console.log('\n📊 CHECKING CURRENT SURVIVOR STATUS');
        console.log('====================================');

        try {
            // Check pool member participation flags
            const poolMembersPath = `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
            const poolMembersDoc = await db.doc(poolMembersPath).get();

            if (poolMembersDoc.exists) {
                const membersData = poolMembersDoc.data();
                console.log(`✅ Found pool members document with ${Object.keys(membersData).length} members`);

                // Check for survivor participation flags
                let survivorParticipants = 0;
                Object.entries(membersData).forEach(([userId, userData]) => {
                    if (userData.participation && userData.participation.survivor) {
                        survivorParticipants++;
                    }
                });

                console.log(`   Survivor participants (via participation flags): ${survivorParticipants}`);

                // Show sample member data
                console.log('\n   Sample member data:');
                Object.entries(membersData).slice(0, 3).forEach(([userId, userData]) => {
                    console.log(`      ${userData.displayName}: ${JSON.stringify(userData.participation || {})}`);
                });
            }

        } catch (error) {
            console.log(`   ❌ Survivor status check failed: ${error.message}`);
        }
    }

    async examineSampleSurvivorPicks() {
        console.log('\n📊 EXAMINING SAMPLE SURVIVOR PICKS');
        console.log('===================================');

        try {
            // Get user names for context
            const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
            const usersCollection = await db.collection(usersPath).get();
            const userNames = {};
            usersCollection.forEach(userDoc => {
                const userData = userDoc.data();
                userNames[userDoc.id] = userData.displayName || userData.name || `User-${userDoc.id}`;
            });

            // Examine survivor picks from legacy structure
            const survivorPicksCollection = await db.collection('artifacts/nerdfootball/public/data/nerdSurvivor_picks').get();

            if (!survivorPicksCollection.empty) {
                console.log(`✅ Found ${survivorPicksCollection.size} survivor pick documents`);

                console.log('\n   📋 Detailed pick analysis:');
                let usersWithPicks = 0;
                let totalWeeks = new Set();
                let samplePicks = [];

                survivorPicksCollection.forEach(userDoc => {
                    const userData = userDoc.data();
                    const userId = userDoc.id;
                    const displayName = userNames[userId] || `User-${userId}`;

                    if (userData.picks && Object.keys(userData.picks).length > 0) {
                        usersWithPicks++;

                        Object.entries(userData.picks).forEach(([week, pick]) => {
                            totalWeeks.add(week);
                            if (samplePicks.length < 10) {
                                samplePicks.push({
                                    user: displayName,
                                    week,
                                    pick: pick
                                });
                            }
                        });
                    }
                });

                console.log(`      Users with picks: ${usersWithPicks}`);
                console.log(`      Weeks with data: ${Array.from(totalWeeks).sort().join(', ')}`);

                console.log('\n   🎯 Sample picks:');
                samplePicks.forEach(sample => {
                    console.log(`      ${sample.user} Week ${sample.week}: ${JSON.stringify(sample.pick)}`);
                });
            }

        } catch (error) {
            console.log(`   ❌ Sample picks examination failed: ${error.message}`);
        }
    }

    async examineESPNDataForSurvivor() {
        console.log('\n📊 EXAMINING ESPN DATA FOR SURVIVOR LOGIC');
        console.log('==========================================');

        try {
            const cacheDoc = await db.doc('cache/espn_current_data').get();
            if (cacheDoc.exists) {
                const gameResults = cacheDoc.data();
                console.log(`✅ Found ESPN cache data, updated: ${new Date(gameResults.lastUpdated)}`);

                // Show Week 1 and 2 results relevant to survivor
                console.log('\n   🏈 Week 1 team results (for survivor elimination logic):');
                const week1Results = Object.entries(gameResults.teamResults || {})
                    .filter(([key, result]) => key.includes('_1'))
                    .slice(0, 8);

                week1Results.forEach(([key, result]) => {
                    const team = key.replace('_1', '');
                    const outcome = result.winner === team ? 'WON' : result.winner === 'null' ? 'LOST' : 'TIE';
                    console.log(`      ${team}: ${outcome} (ESPN result: ${result.winner})`);
                });

                console.log('\n   🏈 Week 2 team results (for survivor elimination logic):');
                const week2Results = Object.entries(gameResults.teamResults || {})
                    .filter(([key, result]) => key.includes('_2'))
                    .slice(0, 8);

                week2Results.forEach(([key, result]) => {
                    const team = key.replace('_2', '');
                    const outcome = result.winner === team ? 'WON' : result.winner === 'null' ? 'LOST' : 'TIE';
                    console.log(`      ${team}: ${outcome} (ESPN result: ${result.winner})`);
                });

                // Count total winners/losers by week
                const week1Winners = Object.entries(gameResults.teamResults || {})
                    .filter(([key, result]) => key.includes('_1') && result.winner !== 'null' && result.winner === key.replace('_1', '')).length;
                const week1Losers = Object.entries(gameResults.teamResults || {})
                    .filter(([key, result]) => key.includes('_1') && result.winner === 'null').length;

                const week2Winners = Object.entries(gameResults.teamResults || {})
                    .filter(([key, result]) => key.includes('_2') && result.winner !== 'null' && result.winner === key.replace('_2', '')).length;
                const week2Losers = Object.entries(gameResults.teamResults || {})
                    .filter(([key, result]) => key.includes('_2') && result.winner === 'null').length;

                console.log(`\n   📊 Game outcome summary:`);
                console.log(`      Week 1: ${week1Winners} winners, ${week1Losers} losers`);
                console.log(`      Week 2: ${week2Winners} winners, ${week2Losers} losers`);

                console.log(`\n   🎯 Survivor implication:`);
                console.log(`      Week 1: Users who picked losing teams should be eliminated`);
                console.log(`      Week 2: Remaining users who picked losing teams should be eliminated`);
            }

        } catch (error) {
            console.log(`   ❌ ESPN data examination failed: ${error.message}`);
        }
    }
}

async function runSurvivorStructureExamination() {
    const examiner = new SurvivorDataStructureExaminer();
    await examiner.examineSurvivorStructure();
}

runSurvivorStructureExamination().catch(console.error);