/**
 * 💎 FIXED WEEK 2 ACCURACY TEST
 *
 * Fixed team matching logic to properly match ESPN data format
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

class FixedWeek2AccuracyTest {
    constructor() {
        this.teamNameMap = this.buildComprehensiveTeamMap();
    }

    buildComprehensiveTeamMap() {
        return {
            // Full ESPN names (what we see in the cache keys)
            'Green Bay Packers': 'GB', 'Arizona Cardinals': 'ARI', 'Baltimore Ravens': 'BAL',
            'Buffalo Bills': 'BUF', 'Cincinnati Bengals': 'CIN', 'Dallas Cowboys': 'DAL',
            'Philadelphia Eagles': 'PHI', 'Los Angeles Chargers': 'LAC', 'Kansas City Chiefs': 'KC',
            'New England Patriots': 'NE', 'San Francisco 49ers': 'SF', 'Pittsburgh Steelers': 'PIT',
            'Miami Dolphins': 'MIA', 'Washington Commanders': 'WAS', 'New York Giants': 'NYG',
            'Seattle Seahawks': 'SEA', 'Los Angeles Rams': 'LAR', 'Denver Broncos': 'DEN',
            'Las Vegas Raiders': 'LV', 'Minnesota Vikings': 'MIN', 'Chicago Bears': 'CHI',
            'Detroit Lions': 'DET', 'Carolina Panthers': 'CAR', 'Atlanta Falcons': 'ATL',
            'New York Jets': 'NYJ', 'Indianapolis Colts': 'IND', 'Tennessee Titans': 'TEN',
            'Jacksonville Jaguars': 'JAX', 'Houston Texans': 'HOU', 'Cleveland Browns': 'CLE',
            'New Orleans Saints': 'NO', 'Tampa Bay Buccaneers': 'TB',

            // Common variations and abbreviations
            'Packers': 'GB', 'Cardinals': 'ARI', 'Ravens': 'BAL', 'Bills': 'BUF',
            'Bengals': 'CIN', 'Cowboys': 'DAL', 'Eagles': 'PHI', 'Chargers': 'LAC',
            'Chiefs': 'KC', 'Patriots': 'NE', '49ers': 'SF', 'Steelers': 'PIT',
            'Dolphins': 'MIA', 'Commanders': 'WAS', 'Giants': 'NYG', 'Seahawks': 'SEA',
            'Rams': 'LAR', 'Broncos': 'DEN', 'Raiders': 'LV', 'Vikings': 'MIN',
            'Bears': 'CHI', 'Lions': 'DET', 'Panthers': 'CAR', 'Falcons': 'ATL',
            'Jets': 'NYJ', 'Colts': 'IND', 'Titans': 'TEN', 'Jaguars': 'JAX',
            'Texans': 'HOU', 'Browns': 'CLE', 'Saints': 'NO', 'Buccaneers': 'TB',

            // Abbreviations
            'GB': 'GB', 'ARI': 'ARI', 'BAL': 'BAL', 'BUF': 'BUF', 'CIN': 'CIN',
            'DAL': 'DAL', 'PHI': 'PHI', 'LAC': 'LAC', 'KC': 'KC', 'NE': 'NE',
            'SF': 'SF', 'PIT': 'PIT', 'MIA': 'MIA', 'WAS': 'WAS', 'NYG': 'NYG',
            'SEA': 'SEA', 'LAR': 'LAR', 'DEN': 'DEN', 'LV': 'LV', 'MIN': 'MIN',
            'CHI': 'CHI', 'DET': 'DET', 'CAR': 'CAR', 'ATL': 'ATL', 'NYJ': 'NYJ',
            'IND': 'IND', 'TEN': 'TEN', 'JAX': 'JAX', 'HOU': 'HOU', 'CLE': 'CLE',
            'NO': 'NO', 'TB': 'TB'
        };
    }

    normalizeTeamName(teamName) {
        if (!teamName) return null;
        return this.teamNameMap[teamName] || teamName;
    }

    async runFixedAccuracyTest() {
        console.log('💎 FIXED WEEK 2 ACCURACY TEST - REAL RESULTS');
        console.log('=============================================');

        try {
            // Get Week 2 user submissions
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

            // Get ESPN game results and analyze structure
            console.log('\n📊 Step 3: Analyzing ESPN game results structure...');
            const cacheDoc = await db.doc('cache/espn_current_data').get();
            const gameResults = cacheDoc.data();

            // Show all Week 2 team result keys for debugging
            const week2Keys = Object.keys(gameResults.teamResults || {})
                .filter(key => key.includes('_2'))
                .sort();

            console.log(`✅ Found ${week2Keys.length} Week 2 team results:`);
            week2Keys.forEach(key => {
                const result = gameResults.teamResults[key];
                console.log(`   🏈 ${key} → Winner: ${result.winner}`);
            });

            // Calculate scores with improved matching
            console.log('\n🧮 Step 4: Calculating scores with improved matching...');
            const calculatedScores = this.calculateScoresWithImprovedMatching(userPicks, userNames, gameResults);

            // Analyze and display results
            console.log('\n🏆 Step 5: Final accuracy analysis...');
            this.displayFinalResults(calculatedScores);

        } catch (error) {
            console.error('💥 Test failed:', error);
        }
    }

    calculateScoresWithImprovedMatching(userPicks, userNames, gameResults) {
        const userScores = {};
        const gameMatchLog = [];

        Object.entries(userPicks).forEach(([userId, userData]) => {
            const displayName = userNames[userId] || `User-${userId}`;
            let weeklyScore = 0;
            let gamesMatched = 0;
            let gamesCorrect = 0;
            const userGameLog = [];

            const picks = userData.picks || userData;
            Object.entries(picks).forEach(([gameKey, pick]) => {
                if (typeof pick === 'object' && pick.winner && pick.confidence) {
                    // Improved game result finding
                    const gameResult = this.findGameResultImproved(pick.winner, gameResults);

                    if (gameResult) {
                        gamesMatched++;
                        const normalizedPickWinner = this.normalizeTeamName(pick.winner);
                        const normalizedGameWinner = this.normalizeTeamName(gameResult.winner);

                        if (normalizedPickWinner === normalizedGameWinner) {
                            const pointsEarned = parseInt(pick.confidence) || 0;
                            weeklyScore += pointsEarned;
                            gamesCorrect++;

                            userGameLog.push({
                                pickedTeam: pick.winner,
                                confidence: pick.confidence,
                                pointsEarned,
                                status: 'CORRECT',
                                actualWinner: gameResult.winner
                            });
                        } else {
                            userGameLog.push({
                                pickedTeam: pick.winner,
                                confidence: pick.confidence,
                                pointsEarned: 0,
                                status: 'INCORRECT',
                                actualWinner: gameResult.winner
                            });
                        }

                        gameMatchLog.push({
                            user: displayName,
                            pickedTeam: pick.winner,
                            normalizedPick: normalizedPickWinner,
                            actualWinner: gameResult.winner,
                            normalizedActual: normalizedGameWinner,
                            confidence: pick.confidence,
                            points: normalizedPickWinner === normalizedGameWinner ? pick.confidence : 0,
                            correct: normalizedPickWinner === normalizedGameWinner
                        });
                    } else {
                        userGameLog.push({
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
                gamesMatched,
                gamesCorrect,
                gameLog: userGameLog
            };
        });

        // Show some successful matches for verification
        const successfulMatches = gameMatchLog.filter(match => match.correct);
        console.log(`\n✅ Found ${successfulMatches.length} successful point awards across all users`);
        console.log('📋 Sample successful matches:');
        successfulMatches.slice(0, 10).forEach(match => {
            console.log(`   ✅ ${match.user}: ${match.pickedTeam} → ${match.actualWinner} (${match.confidence} pts)`);
        });

        return userScores;
    }

    findGameResultImproved(pickedTeam, gameResults) {
        if (!gameResults.teamResults) return null;

        const normalizedPickedTeam = this.normalizeTeamName(pickedTeam);

        // Strategy 1: Direct team name lookup in Week 2 results
        for (const [key, result] of Object.entries(gameResults.teamResults)) {
            if (key.includes('_2')) { // Week 2 games only
                const normalizedResultWinner = this.normalizeTeamName(result.winner);
                const normalizedKeyTeam = this.normalizeTeamName(key.split('_')[0]);

                // Check if picked team matches either the key team or the winner
                if (normalizedPickedTeam === normalizedKeyTeam || normalizedPickedTeam === normalizedResultWinner) {
                    return result;
                }
            }
        }

        // Strategy 2: Fuzzy matching on team names in the key
        for (const [key, result] of Object.entries(gameResults.teamResults)) {
            if (key.includes('_2')) {
                const keyTeamName = key.split('_')[0];
                if (keyTeamName.toLowerCase().includes(pickedTeam.toLowerCase()) ||
                    pickedTeam.toLowerCase().includes(keyTeamName.toLowerCase())) {
                    return result;
                }
            }
        }

        return null;
    }

    displayFinalResults(calculatedScores) {
        console.log('\n🏆 FINAL WEEK 2 ACCURACY RESULTS');
        console.log('=================================');

        const users = Object.values(calculatedScores);
        const usersWithMatches = users.filter(user => user.gamesMatched > 0);
        const usersWithScore = users.filter(user => user.weeklyScore > 0);

        console.log(`📊 Overall Statistics:`);
        console.log(`   • Total Users Analyzed: ${users.length}`);
        console.log(`   • Users with Game Matches: ${usersWithMatches.length}`);
        console.log(`   • Users with Points Scored: ${usersWithScore.length}`);

        if (usersWithMatches.length > 0) {
            const avgMatches = usersWithMatches.reduce((sum, user) => sum + user.gamesMatched, 0) / usersWithMatches.length;
            const avgCorrect = usersWithMatches.reduce((sum, user) => sum + user.gamesCorrect, 0) / usersWithMatches.length;
            const avgScore = usersWithScore.reduce((sum, user) => sum + user.weeklyScore, 0) / (usersWithScore.length || 1);

            console.log(`   • Avg Games Matched per User: ${avgMatches.toFixed(1)}`);
            console.log(`   • Avg Correct Picks per User: ${avgCorrect.toFixed(1)}`);
            console.log(`   • Avg Score (users with points): ${avgScore.toFixed(1)}`);
        }

        // Show top scorers
        const sortedUsers = users.sort((a, b) => b.weeklyScore - a.weeklyScore);
        console.log(`\n🏆 Top 10 Scorers:`);
        sortedUsers.slice(0, 10).forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.displayName}: ${user.weeklyScore} pts (${user.gamesCorrect}/${user.gamesMatched} correct)`);
        });

        // Show sample detailed breakdown for top scorer
        if (sortedUsers[0] && sortedUsers[0].weeklyScore > 0) {
            console.log(`\n🔍 Detailed breakdown for top scorer (${sortedUsers[0].displayName}):`);
            sortedUsers[0].gameLog.slice(0, 5).forEach(game => {
                const statusIcon = game.status === 'CORRECT' ? '✅' : game.status === 'INCORRECT' ? '❌' : '⚠️';
                console.log(`   ${statusIcon} ${game.pickedTeam} (${game.confidence}) → ${game.pointsEarned} pts`);
                if (game.actualWinner) {
                    console.log(`      Actual winner: ${game.actualWinner}`);
                }
            });
        }

        // Final accuracy verdict
        const dataQualityScore = (usersWithMatches.length / users.length) * 100;
        console.log(`\n📈 ACCURACY VERDICT:`);
        console.log(`   • Data Quality Score: ${dataQualityScore.toFixed(1)}%`);

        if (dataQualityScore >= 90 && usersWithScore.length > users.length * 0.8) {
            console.log(`   ✅ EXCELLENT: High data quality and successful score calculations`);
            console.log(`   💎 Your confidence point calculation system is working accurately!`);
        } else if (dataQualityScore >= 70) {
            console.log(`   ⚠️ MODERATE: Reasonable data quality with some calculation issues`);
        } else {
            console.log(`   ❌ POOR: Significant data quality or calculation issues detected`);
        }
    }
}

async function runTest() {
    const test = new FixedWeek2AccuracyTest();
    await test.runFixedAccuracyTest();
}

runTest().catch(console.error);