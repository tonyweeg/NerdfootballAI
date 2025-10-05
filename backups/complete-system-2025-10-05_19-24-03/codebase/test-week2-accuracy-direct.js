/**
 * 💎 DIRECT WEEK 2 ACCURACY TEST
 *
 * Tests against actual Firebase data using the same approach as the audit interface
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin with service account
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'nerdfootball'
    });
}

const db = admin.firestore();

class Week2AccuracyTest {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
        this.teamNameMap = this.buildTeamNameMap();
    }

    buildTeamNameMap() {
        return {
            // Full team names to abbreviations
            'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
            'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
            'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
            'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
            'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
            'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
            'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
            'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
            'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
            'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
            'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS',

            // Common variations
            'Cardinals': 'ARI', 'Falcons': 'ATL', 'Ravens': 'BAL', 'Bills': 'BUF',
            'Panthers': 'CAR', 'Bears': 'CHI', 'Bengals': 'CIN', 'Browns': 'CLE',
            'Cowboys': 'DAL', 'Broncos': 'DEN', 'Lions': 'DET', 'Packers': 'GB',
            'Texans': 'HOU', 'Colts': 'IND', 'Jaguars': 'JAX', 'Chiefs': 'KC',
            'Raiders': 'LV', 'Chargers': 'LAC', 'Rams': 'LAR', 'Dolphins': 'MIA',
            'Vikings': 'MIN', 'Patriots': 'NE', 'Saints': 'NO', 'Giants': 'NYG',
            'Jets': 'NYJ', 'Eagles': 'PHI', 'Steelers': 'PIT', '49ers': 'SF',
            'Seahawks': 'SEA', 'Buccaneers': 'TB', 'Titans': 'TEN', 'Commanders': 'WAS',

            // Abbreviations (map to themselves)
            'ARI': 'ARI', 'ATL': 'ATL', 'BAL': 'BAL', 'BUF': 'BUF', 'CAR': 'CAR',
            'CHI': 'CHI', 'CIN': 'CIN', 'CLE': 'CLE', 'DAL': 'DAL', 'DEN': 'DEN',
            'DET': 'DET', 'GB': 'GB', 'HOU': 'HOU', 'IND': 'IND', 'JAX': 'JAX',
            'KC': 'KC', 'LV': 'LV', 'LAC': 'LAC', 'LAR': 'LAR', 'MIA': 'MIA',
            'MIN': 'MIN', 'NE': 'NE', 'NO': 'NO', 'NYG': 'NYG', 'NYJ': 'NYJ',
            'PHI': 'PHI', 'PIT': 'PIT', 'SF': 'SF', 'SEA': 'SEA', 'TB': 'TB',
            'TEN': 'TEN', 'WAS': 'WAS'
        };
    }

    normalizeTeamName(teamName) {
        if (!teamName) return null;
        return this.teamNameMap[teamName] || teamName;
    }

    async testWeek2Accuracy() {
        console.log('💎 WEEK 2 ACCURACY TEST - REAL DATA');
        console.log('====================================');

        try {
            // Get Week 2 picks data
            console.log('\n📊 Step 1: Getting Week 2 picks data...');
            const picksPath = `artifacts/nerdfootball/pools/${this.poolId}/confidence/${this.season}/weeks/2`;
            const picksDoc = await db.doc(picksPath).get();

            if (!picksDoc.exists) {
                console.log('❌ No Week 2 picks data found');
                return;
            }

            const picksData = picksDoc.data();
            const userCount = Object.keys(picksData).length;
            console.log(`✅ Found ${userCount} users with Week 2 picks`);

            // Get ESPN game results
            console.log('\n📊 Step 2: Getting ESPN game results...');
            const cachePath = 'cache/espn_current_data';
            const cacheDoc = await db.doc(cachePath).get();

            if (!cacheDoc.exists) {
                console.log('❌ No ESPN cache data found');
                return;
            }

            const gameResults = cacheDoc.data();
            console.log(`✅ Found ESPN cache data, updated: ${new Date(gameResults.lastUpdated)}`);

            // Get displayed scores from summary
            console.log('\n📊 Step 3: Getting displayed scores...');
            const summaryPath = `artifacts/nerdfootball/pools/${this.poolId}/confidence/${this.season}/summary`;
            const summaryDoc = await db.doc(summaryPath).get();

            let displayedScores = {};
            if (summaryDoc.exists) {
                const summaryData = summaryDoc.data();
                displayedScores = summaryData.weeklyTotals?.['2'] || {};
                console.log(`✅ Found displayed scores for ${Object.keys(displayedScores).length} users`);
            } else {
                console.log('⚠️ No summary data found');
            }

            // Calculate fresh scores
            console.log('\n🧮 Step 4: Calculating fresh scores...');
            const calculatedScores = this.calculateScores(picksData, gameResults);

            // Compare results
            console.log('\n🔍 Step 5: Comparing calculated vs displayed scores...');
            this.compareScores(calculatedScores, displayedScores, picksData);

        } catch (error) {
            console.error('💥 Test failed:', error);
        }
    }

    calculateScores(picksData, gameResults) {
        const userScores = {};
        const gameMatchLog = [];

        Object.entries(picksData).forEach(([userId, userData]) => {
            if (!userData.picks) return;

            let userScore = 0;
            const userDisplayName = userData.meta?.displayName || `User-${userId}`;

            Object.entries(userData.picks).forEach(([gameId, pick]) => {
                if (!pick.winner || !pick.confidence) return;

                // Find game result using multiple strategies
                const gameResult = this.findGameResult(gameId, pick.winner, gameResults);

                if (gameResult) {
                    const normalizedPickWinner = this.normalizeTeamName(pick.winner);
                    const normalizedGameWinner = this.normalizeTeamName(gameResult.winner);

                    if (normalizedPickWinner && normalizedGameWinner && normalizedPickWinner === normalizedGameWinner) {
                        const pointsEarned = parseInt(pick.confidence) || 0;
                        userScore += pointsEarned;

                        gameMatchLog.push({
                            user: userDisplayName,
                            gameId,
                            pickedTeam: pick.winner,
                            normalizedPick: normalizedPickWinner,
                            gameWinner: gameResult.winner,
                            normalizedGameWinner,
                            confidence: pick.confidence,
                            pointsEarned,
                            status: 'CORRECT'
                        });
                    } else {
                        gameMatchLog.push({
                            user: userDisplayName,
                            gameId,
                            pickedTeam: pick.winner,
                            normalizedPick: normalizedPickWinner,
                            gameWinner: gameResult.winner,
                            normalizedGameWinner,
                            confidence: pick.confidence,
                            pointsEarned: 0,
                            status: 'INCORRECT'
                        });
                    }
                } else {
                    gameMatchLog.push({
                        user: userDisplayName,
                        gameId,
                        pickedTeam: pick.winner,
                        confidence: pick.confidence,
                        pointsEarned: 0,
                        status: 'GAME_NOT_FOUND'
                    });
                }
            });

            userScores[userId] = {
                userId,
                displayName: userDisplayName,
                weeklyScore: userScore
            };
        });

        console.log(`✅ Calculated scores for ${Object.keys(userScores).length} users`);

        // Show some sample game matches
        console.log('\n📋 Sample game matches:');
        gameMatchLog.slice(0, 5).forEach(match => {
            console.log(`  ${match.status === 'CORRECT' ? '✅' : match.status === 'INCORRECT' ? '❌' : '⚠️'} ${match.user}: ${match.pickedTeam} → ${match.status} (${match.pointsEarned} pts)`);
        });

        return userScores;
    }

    findGameResult(gameId, pickedTeam, gameResults) {
        // Strategy 1: Direct gameId lookup
        if (gameResults[gameId]) {
            return gameResults[gameId];
        }

        // Strategy 2: Search by team name in teamResults
        const normalizedPickedTeam = this.normalizeTeamName(pickedTeam);

        if (gameResults.teamResults) {
            for (const [key, result] of Object.entries(gameResults.teamResults)) {
                if (key.includes(normalizedPickedTeam) && key.includes('_2')) { // Week 2
                    return result;
                }
            }
        }

        // Strategy 3: Search through game objects
        if (gameResults.games) {
            for (const game of gameResults.games) {
                if (game.homeTeam || game.awayTeam) {
                    const normalizedHome = this.normalizeTeamName(game.homeTeam);
                    const normalizedAway = this.normalizeTeamName(game.awayTeam);

                    if (normalizedHome === normalizedPickedTeam || normalizedAway === normalizedPickedTeam) {
                        return game;
                    }
                }
            }
        }

        return null;
    }

    compareScores(calculatedScores, displayedScores, picksData) {
        const discrepancies = [];
        const matches = [];

        Object.entries(calculatedScores).forEach(([userId, calculated]) => {
            const displayed = displayedScores[userId] || 0;
            const difference = calculated.weeklyScore - displayed;

            if (difference !== 0) {
                discrepancies.push({
                    user: calculated.displayName,
                    calculated: calculated.weeklyScore,
                    displayed,
                    difference
                });
            } else {
                matches.push({
                    user: calculated.displayName,
                    score: calculated.weeklyScore
                });
            }
        });

        // Results summary
        console.log('\n🏆 WEEK 2 ACCURACY RESULTS');
        console.log('==========================');
        console.log(`📊 Total Users: ${Object.keys(calculatedScores).length}`);
        console.log(`✅ Perfect Matches: ${matches.length}`);
        console.log(`⚠️ Discrepancies: ${discrepancies.length}`);

        if (discrepancies.length === 0) {
            console.log('\n🎯 PERFECT ACCURACY! All calculated scores match displayed scores exactly.');
            console.log('💎 Your confidence point system is working flawlessly!');
        } else {
            console.log('\n🔍 DISCREPANCIES FOUND:');
            discrepancies.forEach(disc => {
                console.log(`  ⚠️ ${disc.user}: Calculated=${disc.calculated}, Displayed=${disc.displayed}, Diff=${disc.difference > 0 ? '+' : ''}${disc.difference}`);
            });
        }

        // Show sample matches
        if (matches.length > 0) {
            console.log('\n✅ Sample Perfect Matches:');
            matches.slice(0, 5).forEach(match => {
                console.log(`  ✅ ${match.user}: ${match.score} points`);
            });
        }

        // Calculate accuracy percentage
        const accuracyPercentage = (matches.length / Object.keys(calculatedScores).length) * 100;
        console.log(`\n📈 ACCURACY SCORE: ${accuracyPercentage.toFixed(1)}%`);

        if (accuracyPercentage >= 95) {
            console.log('🏆 VERDICT: EXCELLENT ACCURACY - System is highly reliable!');
        } else if (accuracyPercentage >= 85) {
            console.log('✅ VERDICT: GOOD ACCURACY - Minor discrepancies detected');
        } else {
            console.log('⚠️ VERDICT: ACCURACY ISSUES - Investigation needed');
        }
    }
}

async function runTest() {
    const test = new Week2AccuracyTest();
    await test.testWeek2Accuracy();
}

runTest().catch(console.error);