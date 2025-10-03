/**
 * 🏆 WEEK 2 SURVIVOR ELIMINATION & DUPLICATE TEAM TEST
 *
 * Test Week 2 eliminations AND duplicate team prevention logic
 * CRITICAL: Users cannot pick the same team twice in survivor!
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

class Week2SurvivorEliminationTester {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
        this.weekNumber = 2;
    }

    async testWeek2Eliminations() {
        console.log('🏆 WEEK 2 SURVIVOR ELIMINATION & DUPLICATE TEAM TEST');
        console.log('===================================================');
        console.log('🎯 MISSION: Verify Week 2 eliminations + duplicate team prevention');

        try {
            // Get all survivor picks for both weeks
            const allPicks = await this.getAllSurvivorPicks();
            console.log(`✅ Found picks across ${Object.keys(allPicks.byWeek).length} weeks`);

            // Get user names
            const userNames = await this.getUserNames();

            // Get ESPN Week 2 results
            const espnResults = await this.getESPNWeek2Results();

            // Get survivor status
            const survivorStatus = await this.getSurvivorStatus();

            // Test duplicate team prevention
            await this.testDuplicateTeamPrevention(allPicks, userNames);

            // Test Week 2 eliminations
            await this.analyzeWeek2Eliminations(allPicks, userNames, espnResults, survivorStatus);

        } catch (error) {
            console.error('💥 Week 2 survivor test failed:', error);
        }
    }

    async getAllSurvivorPicks() {
        const picksByUser = {};
        const picksByWeek = {};

        try {
            const survivorPicksCollection = await db.collection('artifacts/nerdfootball/public/data/nerdSurvivor_picks').get();

            survivorPicksCollection.forEach(userDoc => {
                const userData = userDoc.data();
                const userId = userDoc.id;

                if (userData.picks) {
                    picksByUser[userId] = userData.picks;

                    // Organize by week
                    Object.entries(userData.picks).forEach(([week, pick]) => {
                        if (!picksByWeek[week]) {
                            picksByWeek[week] = {};
                        }
                        picksByWeek[week][userId] = pick;
                    });
                }
            });

            console.log(`   📋 Total users with picks: ${Object.keys(picksByUser).length}`);
            console.log(`   📋 Weeks with data: ${Object.keys(picksByWeek).sort().join(', ')}`);
        } catch (error) {
            console.log(`   ❌ Picks retrieval failed: ${error.message}`);
        }

        return { byUser: picksByUser, byWeek: picksByWeek };
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

    async getESPNWeek2Results() {
        try {
            const cacheDoc = await db.doc('cache/espn_current_data').get();
            if (cacheDoc.exists) {
                const gameResults = cacheDoc.data();
                console.log(`✅ ESPN cache found, last updated: ${new Date(gameResults.lastUpdated)}`);

                // Extract Week 2 team results
                const week2Results = {};
                Object.entries(gameResults.teamResults || {}).forEach(([key, result]) => {
                    if (key.includes('_2')) {
                        const team = key.replace('_2', '');
                        week2Results[team] = result;
                    }
                });

                console.log(`   🏈 Week 2 team results found: ${Object.keys(week2Results).length}`);
                return { teamResults: week2Results, fullData: gameResults };
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

    async testDuplicateTeamPrevention(allPicks, userNames) {
        console.log('\n🚫 DUPLICATE TEAM PREVENTION TEST');
        console.log('==================================');
        console.log('🎯 Rule: Each user can only pick each team ONCE per season');

        const duplicateViolations = [];
        let totalViolations = 0;

        Object.entries(allPicks.byUser).forEach(([userId, userPicks]) => {
            const userName = userNames[userId] || `User-${userId}`;
            const teamsUsed = {};
            const userViolations = [];

            // Track teams used by week
            Object.entries(userPicks).forEach(([week, pick]) => {
                const team = pick.team;
                if (teamsUsed[team]) {
                    userViolations.push({
                        team,
                        firstWeek: teamsUsed[team],
                        duplicateWeek: week
                    });
                    totalViolations++;
                } else {
                    teamsUsed[team] = week;
                }
            });

            if (userViolations.length > 0) {
                duplicateViolations.push({
                    userId,
                    userName,
                    violations: userViolations,
                    teamsUsed: Object.keys(teamsUsed)
                });

                console.log(`❌ ${userName}:`);
                userViolations.forEach(violation => {
                    console.log(`   • ${violation.team}: Week ${violation.firstWeek} AND Week ${violation.duplicateWeek}`);
                });
            }
        });

        console.log(`\n📊 DUPLICATE TEAM SUMMARY:`);
        console.log(`   Users checked: ${Object.keys(allPicks.byUser).length}`);
        console.log(`   Users with violations: ${duplicateViolations.length}`);
        console.log(`   Total violations: ${totalViolations}`);

        if (duplicateViolations.length === 0) {
            console.log(`   ✅ NO DUPLICATE TEAM VIOLATIONS DETECTED!`);
        } else {
            console.log(`   ❌ DUPLICATE TEAM VIOLATIONS FOUND!`);
            console.log(`\n🔍 DETAILED VIOLATION ANALYSIS:`);
            duplicateViolations.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.userName} (${user.violations.length} violations)`);
                console.log(`      Teams used: ${user.teamsUsed.join(', ')}`);
                user.violations.forEach(v => {
                    console.log(`      • VIOLATION: ${v.team} used in Week ${v.firstWeek} and Week ${v.duplicateWeek}`);
                });
            });
        }

        return duplicateViolations;
    }

    async analyzeWeek2Eliminations(allPicks, userNames, espnResults, survivorStatus) {
        console.log('\n🔍 WEEK 2 SURVIVOR ELIMINATION ANALYSIS');
        console.log('========================================');

        const week2Picks = allPicks.byWeek['2'] || {};
        console.log(`Week 2 picks to analyze: ${Object.keys(week2Picks).length}`);

        if (Object.keys(week2Picks).length === 0) {
            console.log('⚠️ No Week 2 picks found for analysis');
            return;
        }

        const eliminationAnalysis = {
            shouldBeEliminated: [],
            shouldBeAlive: [],
            statusMismatches: [],
            pickAnalysis: {}
        };

        // Normalize team names for ESPN matching
        const normalizeTeamName = (teamName) => {
            const normalizations = {
                'Green Bay Packers': 'Green Bay Packers',
                'Arizona Cardinals': 'Arizona Cardinals',
                'Baltimore Ravens': 'Baltimore Ravens',
                'Buffalo Bills': 'Buffalo Bills',
                'Cincinnati Bengals': 'Cincinnati Bengals',
                'Dallas Cowboys': 'Dallas Cowboys',
                'Detroit Lions': 'Detroit Lions',
                'Indianapolis Colts': 'Indianapolis Colts',
                'Denver Broncos': 'Denver Broncos',
                'Philadelphia Eagles': 'Philadelphia Eagles',
                'Los Angeles Chargers': 'Los Angeles Chargers',
                'Las Vegas Raiders': 'Las Vegas Raiders',
                'Jacksonville Jaguars': 'Jacksonville Jaguars',
                'Washington Commanders': 'Washington Commanders',
                'Tampa Bay Buccaneers': 'Tampa Bay Buccaneers',
                'Pittsburgh Steelers': 'Pittsburgh Steelers',
                'Miami Dolphins': 'Miami Dolphins',
                'New England Patriots': 'New England Patriots',
                'San Francisco 49ers': 'San Francisco 49ers',
                'Houston Texans': 'Houston Texans'
            };
            return normalizations[teamName] || teamName;
        };

        console.log('\n📊 INDIVIDUAL WEEK 2 PICK ANALYSIS:');
        console.log('Team Picked → ESPN Result → Expected Status');
        console.log('--------------------------------------------');

        Object.entries(week2Picks).forEach(([userId, pick]) => {
            const userName = userNames[userId] || `User-${userId}`;
            const pickedTeam = pick.team;
            const normalizedTeam = normalizeTeamName(pickedTeam);

            // Find ESPN result for this team
            const espnResult = espnResults.teamResults[normalizedTeam];
            let gameOutcome = 'UNKNOWN';
            let shouldBeEliminated = false;

            if (espnResult) {
                if (espnResult.winner === normalizedTeam && espnResult.winner !== 'null') {
                    gameOutcome = 'WON';
                    shouldBeEliminated = false;
                } else if (espnResult.winner === 'null') {
                    gameOutcome = 'LOST';
                    shouldBeEliminated = true;
                } else if (espnResult.winner && espnResult.winner !== normalizedTeam) {
                    gameOutcome = 'LOST';
                    shouldBeEliminated = true;
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

            // Consider Week 1 eliminations too
            const shouldCheckWeek2 = eliminatedWeek !== 1; // Only check Week 2 if not eliminated in Week 1

            console.log(`${userName}: ${pickedTeam} → ${gameOutcome} → ${shouldBeEliminated ? 'ELIMINATED' : 'ALIVE'}`);

            if (eliminatedWeek === 1) {
                console.log(`   Actual Status: ELIMINATED (Week 1) - Week 2 pick irrelevant`);
            } else {
                console.log(`   Actual Status: ${isActuallyEliminated ? 'ELIMINATED' : 'ALIVE'}${eliminatedWeek ? ` (Week ${eliminatedWeek})` : ''}`);
            }

            // Track analysis
            eliminationAnalysis.pickAnalysis[userId] = {
                userName,
                pickedTeam,
                normalizedTeam,
                gameOutcome,
                shouldBeEliminated: shouldCheckWeek2 ? shouldBeEliminated : false,
                isActuallyEliminated,
                eliminatedWeek,
                statusMatch: shouldCheckWeek2 ? (shouldBeEliminated === isActuallyEliminated) : true
            };

            if (shouldCheckWeek2) {
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
            }

            const statusMatch = shouldCheckWeek2 ? (shouldBeEliminated === isActuallyEliminated) : true;
            console.log(`   Status Match: ${statusMatch ? '✅ CORRECT' : '❌ MISMATCH'}\n`);
        });

        // Summary analysis
        console.log('\n📋 WEEK 2 ELIMINATION SUMMARY:');
        console.log('===============================');
        console.log(`Total Week 2 picks analyzed: ${Object.keys(week2Picks).length}`);
        console.log(`Should be eliminated in Week 2: ${eliminationAnalysis.shouldBeEliminated.length}`);
        console.log(`Should be alive after Week 2: ${eliminationAnalysis.shouldBeAlive.length}`);
        console.log(`Week 2 status mismatches: ${eliminationAnalysis.statusMismatches.length}`);

        if (eliminationAnalysis.statusMismatches.length > 0) {
            console.log('\n❌ WEEK 2 STATUS MISMATCHES DETECTED:');
            eliminationAnalysis.statusMismatches.forEach((mismatch, index) => {
                console.log(`   ${index + 1}. ${mismatch.userName} (${mismatch.pickedTeam})`);
                console.log(`      Expected: ${mismatch.expected}, Actual: ${mismatch.actual}`);
            });
        } else {
            console.log('\n✅ ALL WEEK 2 ELIMINATION STATUSES CORRECT!');
        }

        return eliminationAnalysis;
    }
}

async function runWeek2SurvivorTest() {
    const tester = new Week2SurvivorEliminationTester();
    await tester.testWeek2Eliminations();
}

runWeek2SurvivorTest().catch(console.error);