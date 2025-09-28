/**
 * 🏆 WEEK 1 SURVIVOR ELIMINATION ACCURACY TEST
 *
 * Test survivor elimination logic for Week 1 with Diamond Level precision
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

class Week1SurvivorEliminationTester {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
        this.weekNumber = 1;
    }

    async testWeek1Eliminations() {
        console.log('🏆 WEEK 1 SURVIVOR ELIMINATION ACCURACY TEST');
        console.log('============================================');
        console.log('🎯 MISSION: Verify Week 1 elimination accuracy with ESPN results');

        try {
            // Get Week 1 survivor picks
            const week1Picks = await this.getWeek1SurvivorPicks();
            console.log(`✅ Found ${Object.keys(week1Picks).length} Week 1 survivor picks`);

            // Get user names for readable output
            const userNames = await this.getUserNames();

            // Get ESPN Week 1 results
            const espnResults = await this.getESPNWeek1Results();

            // Get survivor status document
            const survivorStatus = await this.getSurvivorStatus();

            // Analyze eliminations
            await this.analyzeSurvivorEliminations(week1Picks, userNames, espnResults, survivorStatus);

        } catch (error) {
            console.error('💥 Week 1 survivor test failed:', error);
        }
    }

    async getWeek1SurvivorPicks() {
        const picks = {};

        // Try legacy structure first
        try {
            const survivorPicksCollection = await db.collection('artifacts/nerdfootball/public/data/nerdSurvivor_picks').get();

            survivorPicksCollection.forEach(userDoc => {
                const userData = userDoc.data();
                const userId = userDoc.id;

                if (userData.picks && userData.picks['1']) {
                    picks[userId] = userData.picks['1'];
                }
            });

            console.log(`   📋 Legacy picks found: ${Object.keys(picks).length}`);
        } catch (error) {
            console.log(`   ⚠️ Legacy picks failed: ${error.message}`);
        }

        // Try unified structure if legacy failed
        if (Object.keys(picks).length === 0) {
            try {
                const unifiedPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${this.season}/weeks/1`;
                const weekDoc = await db.doc(unifiedPath).get();

                if (weekDoc.exists) {
                    const weekData = weekDoc.data();
                    Object.entries(weekData).forEach(([userId, pick]) => {
                        if (pick && typeof pick === 'object' && pick.team) {
                            picks[userId] = pick;
                        }
                    });
                    console.log(`   📋 Unified picks found: ${Object.keys(picks).length}`);
                }
            } catch (error) {
                console.log(`   ⚠️ Unified picks failed: ${error.message}`);
            }
        }

        return picks;
    }

    async getUserNames() {
        const userNames = {};
        try {
            const usersCollection = await db.collection('artifacts/nerdfootball/public/data/nerdfootball_users').get();
            usersCollection.forEach(userDoc => {
                const userData = userDoc.data();
                userNames[userDoc.id] = userData.displayName || userData.name || `User-${userDoc.id}`;
            });
            console.log(`   👥 Found ${Object.keys(userNames).length} user profiles`);
        } catch (error) {
            console.log(`   ⚠️ User names failed: ${error.message}`);
        }
        return userNames;
    }

    async getESPNWeek1Results() {
        try {
            const cacheDoc = await db.doc('cache/espn_current_data').get();
            if (cacheDoc.exists) {
                const gameResults = cacheDoc.data();
                console.log(`✅ ESPN cache found, last updated: ${new Date(gameResults.lastUpdated)}`);

                // Extract Week 1 team results
                const week1Results = {};
                Object.entries(gameResults.teamResults || {}).forEach(([key, result]) => {
                    if (key.includes('_1')) {
                        const team = key.replace('_1', '');
                        week1Results[team] = result;
                    }
                });

                console.log(`   🏈 Week 1 team results found: ${Object.keys(week1Results).length}`);
                return { teamResults: week1Results, fullData: gameResults };
            }
        } catch (error) {
            console.log(`   ❌ ESPN data failed: ${error.message}`);
        }
        return { teamResults: {}, fullData: {} };
    }

    async getSurvivorStatus() {
        try {
            const statusDoc = await db.doc('artifacts/nerdfootball/public/data/nerdSurvivor_status/status').get();
            if (statusDoc.exists) {
                const statusData = statusDoc.data();
                console.log(`✅ Found survivor status with ${Object.keys(statusData).length} entries`);
                return statusData;
            }
        } catch (error) {
            console.log(`   ❌ Survivor status failed: ${error.message}`);
        }
        return {};
    }

    async analyzeSurvivorEliminations(picks, userNames, espnResults, survivorStatus) {
        console.log('\n🔍 WEEK 1 SURVIVOR ELIMINATION ANALYSIS');
        console.log('========================================');

        const eliminationAnalysis = {
            shouldBeEliminated: [],
            shouldBeAlive: [],
            statusMismatches: [],
            pickAnalysis: {}
        };

        // Team name normalization for matching
        const normalizeTeamName = (teamName) => {
            const normalizations = {
                'Denver Broncos': 'Denver Broncos',
                'Philadelphia Eagles': 'Philadelphia Eagles',
                'Los Angeles Chargers': 'Los Angeles Chargers',
                'Arizona Cardinals': 'Arizona Cardinals',
                'Las Vegas Raiders': 'Las Vegas Raiders',
                'Jacksonville Jaguars': 'Jacksonville Jaguars',
                'Indianapolis Colts': 'Indianapolis Colts',
                'Washington Commanders': 'Washington Commanders',
                'Cincinnati Bengals': 'Cincinnati Bengals',
                // Add more as needed
            };
            return normalizations[teamName] || teamName;
        };

        // Analyze each user's Week 1 pick
        console.log('\n📊 INDIVIDUAL PICK ANALYSIS:');
        console.log('Team Picked → ESPN Result → Expected Status');
        console.log('---------------------------------------------');

        Object.entries(picks).forEach(([userId, pick]) => {
            const userName = userNames[userId] || `User-${userId}`;
            const pickedTeam = pick.team;
            const normalizedTeam = normalizeTeamName(pickedTeam);

            // Find ESPN result for this team
            const espnResult = espnResults.teamResults[normalizedTeam];
            let gameOutcome = 'UNKNOWN';
            let shouldBeEliminated = false;

            if (espnResult) {
                // Check if team won or lost
                if (espnResult.winner === normalizedTeam && espnResult.winner !== 'null') {
                    gameOutcome = 'WON';
                    shouldBeEliminated = false; // Team won, user survives
                } else if (espnResult.winner === 'null') {
                    gameOutcome = 'LOST';
                    shouldBeEliminated = true; // Team lost, user eliminated
                } else if (espnResult.winner && espnResult.winner !== normalizedTeam) {
                    gameOutcome = 'LOST';
                    shouldBeEliminated = true; // Different team won, user eliminated
                } else {
                    gameOutcome = 'TIE/UNKNOWN';
                }
            } else {
                gameOutcome = 'NO ESPN DATA';
                console.log(`   ⚠️ No ESPN data found for team: ${normalizedTeam}`);
            }

            // Check actual status
            const actualStatus = survivorStatus[userId];
            const isActuallyEliminated = actualStatus?.eliminated === true;
            const eliminatedWeek = actualStatus?.eliminatedWeek;

            console.log(`${userName}: ${pickedTeam} → ${gameOutcome} → ${shouldBeEliminated ? 'ELIMINATED' : 'ALIVE'}`);
            console.log(`   Actual Status: ${isActuallyEliminated ? 'ELIMINATED' : 'ALIVE'}${eliminatedWeek ? ` (Week ${eliminatedWeek})` : ''}`);

            // Track analysis
            eliminationAnalysis.pickAnalysis[userId] = {
                userName,
                pickedTeam,
                normalizedTeam,
                gameOutcome,
                shouldBeEliminated,
                isActuallyEliminated,
                eliminatedWeek,
                statusMatch: shouldBeEliminated === isActuallyEliminated
            };

            if (shouldBeEliminated) {
                eliminationAnalysis.shouldBeEliminated.push(userId);
            } else {
                eliminationAnalysis.shouldBeAlive.push(userId);
            }

            if (shouldBeEliminated !== isActuallyEliminated) {
                eliminationAnalysis.statusMismatches.push({
                    userId,
                    userName,
                    pickedTeam,
                    expected: shouldBeEliminated ? 'ELIMINATED' : 'ALIVE',
                    actual: isActuallyEliminated ? 'ELIMINATED' : 'ALIVE'
                });
            }

            console.log(`   Status Match: ${shouldBeEliminated === isActuallyEliminated ? '✅ CORRECT' : '❌ MISMATCH'}\n`);
        });

        // Summary analysis
        console.log('\n📋 WEEK 1 ELIMINATION SUMMARY:');
        console.log('===============================');
        console.log(`Total picks analyzed: ${Object.keys(picks).length}`);
        console.log(`Should be eliminated: ${eliminationAnalysis.shouldBeEliminated.length}`);
        console.log(`Should be alive: ${eliminationAnalysis.shouldBeAlive.length}`);
        console.log(`Status mismatches: ${eliminationAnalysis.statusMismatches.length}`);

        if (eliminationAnalysis.statusMismatches.length > 0) {
            console.log('\n❌ STATUS MISMATCHES DETECTED:');
            eliminationAnalysis.statusMismatches.forEach((mismatch, index) => {
                console.log(`   ${index + 1}. ${mismatch.userName} (${mismatch.pickedTeam})`);
                console.log(`      Expected: ${mismatch.expected}, Actual: ${mismatch.actual}`);
            });
        } else {
            console.log('\n✅ ALL ELIMINATION STATUSES CORRECT!');
        }

        // ESPN data quality check
        console.log('\n🔍 ESPN DATA QUALITY CHECK:');
        console.log('============================');
        const espnTeamCount = Object.keys(espnResults.teamResults).length;
        const winnersCount = Object.values(espnResults.teamResults).filter(result =>
            result.winner && result.winner !== 'null'
        ).length;
        const losersCount = Object.values(espnResults.teamResults).filter(result =>
            result.winner === 'null'
        ).length;

        console.log(`ESPN teams in Week 1: ${espnTeamCount}`);
        console.log(`Teams marked as winners: ${winnersCount}`);
        console.log(`Teams marked as losers: ${losersCount}`);

        if (winnersCount === espnTeamCount && losersCount === 0) {
            console.log('⚠️ SUSPICIOUS: ALL teams marked as winners - ESPN data may be incorrect!');
        } else if (winnersCount === losersCount) {
            console.log('✅ Normal: Equal winners and losers (typical for NFL)');
        } else {
            console.log(`ℹ️ Uneven split: ${winnersCount} winners, ${losersCount} losers (check for ties/byes)`);
        }

        return eliminationAnalysis;
    }
}

async function runWeek1SurvivorTest() {
    const tester = new Week1SurvivorEliminationTester();
    await tester.testWeek1Eliminations();
}

runWeek1SurvivorTest().catch(console.error);