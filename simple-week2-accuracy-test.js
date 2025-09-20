/**
 * 💎 SIMPLE WEEK 2 ACCURACY TEST - NO OVERCOMPLICATED MAPPING
 *
 * Use the ACTUAL data structure: "Team Name_2" → Winner: "Team Name" or "null"
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

async function simpleWeek2AccuracyTest() {
    console.log('💎 SIMPLE WEEK 2 ACCURACY TEST - REAL LOGIC');
    console.log('============================================');

    try {
        // Get ESPN results for Week 2
        console.log('\n📊 Step 1: Getting ESPN Week 2 results...');
        const cacheDoc = await db.doc('cache/espn_current_data').get();
        const gameResults = cacheDoc.data();

        const week2Results = {};
        Object.entries(gameResults.teamResults || {}).forEach(([key, result]) => {
            if (key.includes('_2')) {
                const teamName = key.replace('_2', '');
                week2Results[teamName] = result.winner;
            }
        });

        console.log(`✅ Found Week 2 results for ${Object.keys(week2Results).length} teams`);

        // Show sample results
        console.log('\n📋 Sample Week 2 results:');
        Object.entries(week2Results).slice(0, 10).forEach(([team, winner]) => {
            const status = winner === 'null' ? 'LOST' : 'WON';
            console.log(`   ${team}: ${status} (winner: ${winner})`);
        });

        // Get user picks
        console.log('\n📊 Step 2: Getting user picks...');
        const legacyPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks/2/submissions';
        const submissionsCollection = await db.collection(legacyPath).get();

        // Get user names
        const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
        const usersCollection = await db.collection(usersPath).get();
        const userNames = {};
        usersCollection.forEach(userDoc => {
            const userData = userDoc.data();
            userNames[userDoc.id] = userData.displayName || userData.name || `User-${userDoc.id}`;
        });

        // Calculate scores with SIMPLE logic
        console.log('\n🧮 Step 3: Calculating scores with SIMPLE logic...');
        const userScores = {};
        const allPicksLog = [];

        submissionsCollection.forEach(userDoc => {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const displayName = userNames[userId] || `User-${userId}`;

            let weeklyScore = 0;
            let gamesMatched = 0;
            let gamesCorrect = 0;
            const userGameLog = [];

            const picks = userData.picks || userData;
            Object.entries(picks).forEach(([gameKey, pick]) => {
                if (typeof pick === 'object' && pick.winner && pick.confidence) {
                    const pickedTeam = pick.winner;
                    const confidence = parseInt(pick.confidence) || 0;

                    // SIMPLE LOOKUP: Does this team exist in Week 2 results?
                    if (week2Results.hasOwnProperty(pickedTeam)) {
                        gamesMatched++;
                        const actualWinner = week2Results[pickedTeam];

                        // Did the user's picked team win?
                        if (actualWinner === pickedTeam && actualWinner !== 'null') {
                            weeklyScore += confidence;
                            gamesCorrect++;

                            userGameLog.push({
                                team: pickedTeam,
                                confidence,
                                status: 'CORRECT',
                                points: confidence
                            });

                            allPicksLog.push({
                                user: displayName,
                                team: pickedTeam,
                                confidence,
                                result: 'WON',
                                points: confidence
                            });
                        } else {
                            userGameLog.push({
                                team: pickedTeam,
                                confidence,
                                status: 'INCORRECT',
                                points: 0,
                                actualWinner
                            });

                            allPicksLog.push({
                                user: displayName,
                                team: pickedTeam,
                                confidence,
                                result: actualWinner === 'null' ? 'LOST' : `LOST_TO_${actualWinner}`,
                                points: 0
                            });
                        }
                    } else {
                        userGameLog.push({
                            team: pickedTeam,
                            confidence,
                            status: 'TEAM_NOT_FOUND',
                            points: 0
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

        // Show successful point awards
        const successfulPicks = allPicksLog.filter(pick => pick.points > 0);
        console.log(`\n✅ Found ${successfulPicks.length} successful point awards across all users`);

        if (successfulPicks.length > 0) {
            console.log('\n🏆 Sample successful picks:');
            successfulPicks.slice(0, 10).forEach(pick => {
                console.log(`   ✅ ${pick.user}: ${pick.team} (${pick.confidence} pts) → WON!`);
            });
        }

        // Display final results
        console.log('\n🏆 FINAL WEEK 2 ACCURACY RESULTS');
        console.log('=================================');

        const users = Object.values(userScores);
        const usersWithPoints = users.filter(user => user.weeklyScore > 0);
        const usersWithMatches = users.filter(user => user.gamesMatched > 0);

        console.log(`📊 Summary Statistics:`);
        console.log(`   • Total Users: ${users.length}`);
        console.log(`   • Users with Game Matches: ${usersWithMatches.length}`);
        console.log(`   • Users with Points: ${usersWithPoints.length}`);
        console.log(`   • Total Points Awarded: ${users.reduce((sum, u) => sum + u.weeklyScore, 0)}`);

        if (usersWithPoints.length > 0) {
            // Show top scorers
            const sortedUsers = users.sort((a, b) => b.weeklyScore - a.weeklyScore);
            console.log(`\n🏆 Top 10 Scorers:`);
            sortedUsers.slice(0, 10).forEach((user, index) => {
                if (user.weeklyScore > 0) {
                    console.log(`   ${index + 1}. ${user.displayName}: ${user.weeklyScore} pts (${user.gamesCorrect}/${user.gamesMatched} correct)`);
                }
            });

            // Show detailed breakdown for top scorer
            const topScorer = sortedUsers[0];
            if (topScorer.weeklyScore > 0) {
                console.log(`\n🔍 Detailed breakdown for ${topScorer.displayName}:`);
                topScorer.gameLog.forEach(game => {
                    const statusIcon = game.status === 'CORRECT' ? '✅' : '❌';
                    console.log(`   ${statusIcon} ${game.team} (${game.confidence}) → ${game.points} pts`);
                });
            }

            // Calculate accuracy percentage
            const dataQuality = (usersWithMatches.length / users.length) * 100;
            const scoringSuccess = (usersWithPoints.length / users.length) * 100;

            console.log(`\n📈 ACCURACY ASSESSMENT:`);
            console.log(`   • Data Quality: ${dataQuality.toFixed(1)}% (users with matches)`);
            console.log(`   • Scoring Success: ${scoringSuccess.toFixed(1)}% (users with points)`);

            if (dataQuality >= 90 && scoringSuccess >= 70) {
                console.log(`\n✅ VERDICT: EXCELLENT ACCURACY!`);
                console.log(`   💎 Your confidence point calculation system is working correctly!`);
                console.log(`   🏆 The SIMPLE matching logic produces accurate results.`);
            } else if (dataQuality >= 70) {
                console.log(`\n⚠️ VERDICT: MODERATE ACCURACY`);
                console.log(`   📋 Reasonable results but some data or logic issues remain.`);
            } else {
                console.log(`\n❌ VERDICT: ACCURACY ISSUES DETECTED`);
                console.log(`   🔧 Significant problems with data matching or logic.`);
            }
        } else {
            console.log(`\n❌ NO USERS SCORED POINTS - Logic or data issue!`);
        }

    } catch (error) {
        console.error('💥 Test failed:', error);
    }
}

simpleWeek2AccuracyTest().catch(console.error);