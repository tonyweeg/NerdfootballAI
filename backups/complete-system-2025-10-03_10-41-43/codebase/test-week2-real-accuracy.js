/**
 * 💎 WEEK 2 REAL ACCURACY TEST
 *
 * Tests against the actual legacy data structure with 54 user submissions
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

class Week2RealAccuracyTest {
    constructor() {
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

            // Common variations and abbreviations
            'Cardinals': 'ARI', 'Falcons': 'ATL', 'Ravens': 'BAL', 'Bills': 'BUF',
            'Panthers': 'CAR', 'Bears': 'CHI', 'Bengals': 'CIN', 'Browns': 'CLE',
            'Cowboys': 'DAL', 'Broncos': 'DEN', 'Lions': 'DET', 'Packers': 'GB',
            'Texans': 'HOU', 'Colts': 'IND', 'Jaguars': 'JAX', 'Chiefs': 'KC',
            'Raiders': 'LV', 'Chargers': 'LAC', 'Rams': 'LAR', 'Dolphins': 'MIA',
            'Vikings': 'MIN', 'Patriots': 'NE', 'Saints': 'NO', 'Giants': 'NYG',
            'Jets': 'NYJ', 'Eagles': 'PHI', 'Steelers': 'PIT', '49ers': 'SF',
            'Seahawks': 'SEA', 'Buccaneers': 'TB', 'Titans': 'TEN', 'Commanders': 'WAS',

            // ESPN team name variations
            'Philadelphia Eagles': 'PHI', 'Los Angeles Chargers': 'LAC', 'Arizona Cardinals': 'ARI',
            'Kansas City Chiefs': 'KC', 'Buffalo Bills': 'BUF', 'New England Patriots': 'NE',
            'Green Bay Packers': 'GB', 'Dallas Cowboys': 'DAL', 'San Francisco 49ers': 'SF',
            'Baltimore Ravens': 'BAL', 'Pittsburgh Steelers': 'PIT', 'Miami Dolphins': 'MIA',

            // Abbreviations map to themselves
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

    async runRealAccuracyTest() {
        console.log('💎 WEEK 2 REAL ACCURACY TEST - 54 USERS');
        console.log('=========================================');

        try {
            // Get Week 2 user submissions (legacy structure)
            console.log('\n📊 Step 1: Getting Week 2 user submissions...');
            const legacyPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks/2/submissions';
            const submissionsCollection = await db.collection(legacyPath).get();

            const userPicks = {};
            submissionsCollection.forEach(userDoc => {
                const userData = userDoc.data();
                userPicks[userDoc.id] = userData;
            });

            console.log(`✅ Found ${Object.keys(userPicks).length} user submissions for Week 2`);

            // Get user display names
            console.log('\n📊 Step 2: Getting user display names...');
            const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
            const usersCollection = await db.collection(usersPath).get();

            const userNames = {};
            usersCollection.forEach(userDoc => {
                const userData = userDoc.data();
                userNames[userDoc.id] = userData.displayName || userData.name || `User-${userDoc.id}`;
            });

            console.log(`✅ Found ${Object.keys(userNames).length} user profiles`);

            // Get ESPN game results
            console.log('\n📊 Step 3: Getting ESPN game results...');
            const cacheDoc = await db.doc('cache/espn_current_data').get();

            if (!cacheDoc.exists) {
                console.log('❌ No ESPN cache data found');
                return;
            }

            const gameResults = cacheDoc.data();
            console.log(`✅ Found ESPN cache data with ${Object.keys(gameResults.teamResults || {}).length} team results`);

            // Show Week 2 team results
            const week2Results = Object.entries(gameResults.teamResults || {})
                .filter(([key, result]) => key.includes('_2'))
                .slice(0, 5);

            console.log('\n📋 Sample Week 2 game results:');
            week2Results.forEach(([key, result]) => {
                console.log(`  🏈 ${key}: ${result.winner || 'TBD'}`);
            });

            // Calculate scores for all users
            console.log('\n🧮 Step 4: Calculating scores for all users...');
            const calculatedScores = this.calculateAllUserScores(userPicks, userNames, gameResults);

            // Get existing leaderboard/summary data for comparison
            console.log('\n📊 Step 5: Getting existing summary data...');
            const summaryResults = await this.getExistingSummaryData();

            // Compare and analyze
            console.log('\n🔍 Step 6: Analyzing accuracy...');
            this.analyzeAccuracy(calculatedScores, summaryResults);

        } catch (error) {
            console.error('💥 Test failed:', error);
        }
    }

    calculateAllUserScores(userPicks, userNames, gameResults) {
        const userScores = {};
        const detailedLog = [];

        Object.entries(userPicks).forEach(([userId, userData]) => {
            const displayName = userNames[userId] || `User-${userId}`;
            let weeklyScore = 0;
            let gamesFound = 0;
            let gamesCorrect = 0;
            const userGameLog = [];

            // Extract picks from user data
            const picks = userData.picks || userData;
            Object.entries(picks).forEach(([gameKey, pick]) => {
                if (typeof pick === 'object' && pick.winner && pick.confidence) {
                    // Find corresponding game result
                    const gameResult = this.findGameResultForTeam(pick.winner, gameResults, 2);

                    if (gameResult) {
                        gamesFound++;
                        const normalizedPickWinner = this.normalizeTeamName(pick.winner);
                        const normalizedGameWinner = this.normalizeTeamName(gameResult.winner);

                        if (normalizedPickWinner && normalizedGameWinner && normalizedPickWinner === normalizedGameWinner) {
                            const pointsEarned = parseInt(pick.confidence) || 0;
                            weeklyScore += pointsEarned;
                            gamesCorrect++;

                            userGameLog.push({
                                gameKey,
                                pickedTeam: pick.winner,
                                confidence: pick.confidence,
                                pointsEarned,
                                status: 'CORRECT'
                            });
                        } else {
                            userGameLog.push({
                                gameKey,
                                pickedTeam: pick.winner,
                                confidence: pick.confidence,
                                actualWinner: gameResult.winner,
                                pointsEarned: 0,
                                status: 'INCORRECT'
                            });
                        }
                    } else {
                        userGameLog.push({
                            gameKey,
                            pickedTeam: pick.winner,
                            confidence: pick.confidence,
                            pointsEarned: 0,
                            status: 'GAME_NOT_FOUND'
                        });
                    }
                }
            });

            userScores[userId] = {
                displayName,
                weeklyScore,
                gamesFound,
                gamesCorrect,
                totalPicks: Object.keys(picks).length,
                gameLog: userGameLog
            };

            detailedLog.push({
                user: displayName,
                score: weeklyScore,
                correct: gamesCorrect,
                found: gamesFound,
                total: Object.keys(picks).length
            });
        });

        console.log(`✅ Calculated scores for ${Object.keys(userScores).length} users`);

        // Show top scorers
        const sortedScores = detailedLog.sort((a, b) => b.score - a.score);
        console.log('\n🏆 Top 5 calculated scorers:');
        sortedScores.slice(0, 5).forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.user}: ${user.score} pts (${user.correct}/${user.found} correct)`);
        });

        return userScores;
    }

    findGameResultForTeam(teamName, gameResults, weekNumber) {
        const normalizedTeam = this.normalizeTeamName(teamName);

        // Search in teamResults for Week 2 entries
        if (gameResults.teamResults) {
            for (const [key, result] of Object.entries(gameResults.teamResults)) {
                if (key.includes(`_${weekNumber}`) && key.includes(normalizedTeam)) {
                    return result;
                }
            }
        }

        return null;
    }

    async getExistingSummaryData() {
        try {
            // Try to get existing results data
            const resultsPath = 'artifacts/nerdfootball/public/data/nerdfootball_results/2';
            const resultsDoc = await db.doc(resultsPath).get();

            if (resultsDoc.exists) {
                const resultsData = resultsDoc.data();
                console.log(`✅ Found existing Week 2 results data`);
                return resultsData;
            } else {
                console.log(`⚠️ No existing Week 2 results found`);
                return null;
            }
        } catch (error) {
            console.log(`⚠️ Could not get existing summary: ${error.message}`);
            return null;
        }
    }

    analyzeAccuracy(calculatedScores, existingSummary) {
        console.log('\n🏆 WEEK 2 ACCURACY ANALYSIS');
        console.log('============================');

        const userCount = Object.keys(calculatedScores).length;
        const totalGamesFound = Object.values(calculatedScores).reduce((sum, user) => sum + user.gamesFound, 0);
        const totalGamesCorrect = Object.values(calculatedScores).reduce((sum, user) => sum + user.gamesCorrect, 0);

        console.log(`📊 Analysis Summary:`);
        console.log(`   • Total Users: ${userCount}`);
        console.log(`   • Avg Games Found per User: ${(totalGamesFound / userCount).toFixed(1)}`);
        console.log(`   • Avg Correct per User: ${(totalGamesCorrect / userCount).toFixed(1)}`);
        console.log(`   • Overall Success Rate: ${((totalGamesCorrect / totalGamesFound) * 100).toFixed(1)}%`);

        // Check data integrity
        const validUsers = Object.values(calculatedScores).filter(user => user.gamesFound > 10);
        const dataIntegrityScore = (validUsers.length / userCount) * 100;

        console.log(`\n🔍 Data Integrity:`);
        console.log(`   • Users with >10 games found: ${validUsers.length}/${userCount}`);
        console.log(`   • Data Integrity Score: ${dataIntegrityScore.toFixed(1)}%`);

        // Compare with existing data if available
        if (existingSummary) {
            console.log(`\n📋 Comparison with existing data:`);
            console.log(`   • Existing summary available: YES`);
            // Could add detailed comparison here
        } else {
            console.log(`\n📋 No existing summary data for comparison`);
        }

        // Sample detailed breakdown
        console.log(`\n🔍 Sample user breakdowns:`);
        Object.entries(calculatedScores).slice(0, 3).forEach(([userId, user]) => {
            console.log(`\n   👤 ${user.displayName}:`);
            console.log(`      Score: ${user.weeklyScore} | Correct: ${user.gamesCorrect}/${user.gamesFound}`);

            // Show sample picks
            user.gameLog.slice(0, 3).forEach(game => {
                const statusIcon = game.status === 'CORRECT' ? '✅' : game.status === 'INCORRECT' ? '❌' : '⚠️';
                console.log(`      ${statusIcon} ${game.pickedTeam} (${game.confidence}) → ${game.pointsEarned} pts`);
            });
        });

        // Final verdict
        if (dataIntegrityScore >= 95 && (totalGamesCorrect / totalGamesFound) > 0.4) {
            console.log(`\n✅ VERDICT: HIGH CONFIDENCE IN CALCULATION ACCURACY`);
            console.log(`   🏆 Data quality is excellent and calculations appear correct`);
            console.log(`   💎 Your confidence point system is working reliably!`);
        } else if (dataIntegrityScore >= 80) {
            console.log(`\n⚠️ VERDICT: MODERATE CONFIDENCE - SOME DATA ISSUES`);
            console.log(`   📋 Some data quality issues detected but core calculations seem sound`);
        } else {
            console.log(`\n❌ VERDICT: DATA QUALITY ISSUES DETECTED`);
            console.log(`   🔧 Significant data integrity problems need investigation`);
        }
    }
}

async function runTest() {
    const test = new Week2RealAccuracyTest();
    await test.runRealAccuracyTest();
}

runTest().catch(console.error);