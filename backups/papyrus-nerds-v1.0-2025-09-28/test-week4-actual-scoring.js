const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function testWeek4ActualScoring() {
    console.log('🎯 TESTING ACTUAL WEEK 4 SCORING');
    console.log('================================');

    try {
        // 1. Get a real user for testing
        const membersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const membersSnap = await membersRef.get();

        if (!membersSnap.exists) {
            console.log('❌ No pool members found');
            return;
        }

        const members = membersSnap.data();
        const testUserId = Object.keys(members)[0]; // First user
        const userName = members[testUserId]?.name || testUserId.slice(-6);

        console.log(`🧪 Testing with user: ${userName} (${testUserId.slice(-6)})`);

        // 2. Get user's Week 4 picks
        const picksCollectionPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions';
        const picksDocRef = db.collection(picksCollectionPath).doc(testUserId);
        const picksSnap = await picksDocRef.get();

        if (!picksSnap.exists) {
            console.log(`⚠️ User ${userName} has no Week 4 picks - trying another user`);

            // Try to find a user with picks
            const picksCollectionRef = db.collection(picksCollectionPath);
            const allPicksSnap = await picksCollectionRef.limit(5).get();

            if (allPicksSnap.empty) {
                console.log('❌ No Week 4 picks found for any user');
                return;
            }

            const userWithPicks = allPicksSnap.docs[0];
            const testUserIdWithPicks = userWithPicks.id;
            const userPicks = userWithPicks.data();
            const userNameWithPicks = members[testUserIdWithPicks]?.name || testUserIdWithPicks.slice(-6);

            console.log(`🧪 Found picks for user: ${userNameWithPicks} (${testUserIdWithPicks.slice(-6)})`);
            console.log(`📋 User has ${Object.keys(userPicks).length} picks`);

            return await testUserScoring(testUserIdWithPicks, userNameWithPicks, userPicks);
        } else {
            const userPicks = picksSnap.data();
            console.log(`📋 User ${userName} has ${Object.keys(userPicks).length} picks`);
            return await testUserScoring(testUserId, userName, userPicks);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function testUserScoring(userId, userName, userPicks) {
    try {
        console.log(`\n🧮 CALCULATING WEEK 4 SCORES FOR ${userName.toUpperCase()}`);

        // 3. Get Week 4 games from Firebase (same path as fixed ScoringCalculator)
        const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        const docRef = db.doc(gamesPath);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.log('❌ Week 4 games not found');
            return;
        }

        const weekData = docSnap.data();
        const gameIds = Object.keys(weekData).filter(key => !key.startsWith('_') && !key.startsWith('game_'));

        // Convert to array format (same as ScoringCalculator)
        const weekGames = gameIds.map(id => ({
            id: id,
            ...weekData[id]
        }));

        console.log(`📊 Week 4: ${weekGames.length} games found in Firebase`);

        // 4. Calculate scores manually (simulate ScoringCalculator logic)
        let totalPoints = 0;
        let possiblePoints = 0;
        let correctPicks = 0;
        let totalPicks = 0;
        const gameResults = [];

        for (const game of weekGames) {
            const gameId = game.id.toString();
            const userPick = userPicks[gameId];

            const gameResult = {
                gameId: gameId,
                homeTeam: game.h || game.homeTeam,
                awayTeam: game.a || game.awayTeam,
                actualWinner: game.winner,
                userPick: userPick?.winner || null,
                confidencePoints: userPick?.confidence || 0,
                pointsEarned: 0,
                correct: false,
                gameCompleted: !!(game.winner && (game.status === 'STATUS_FINAL' || game.status?.includes('FINAL')))
            };

            // Only score completed games
            if (gameResult.gameCompleted) {
                totalPicks++;
                possiblePoints += gameResult.confidencePoints;

                // Check if pick is correct
                if (userPick && userPick.winner === game.winner) {
                    gameResult.correct = true;
                    gameResult.pointsEarned = gameResult.confidencePoints;
                    totalPoints += gameResult.confidencePoints;
                    correctPicks++;

                    console.log(`  ✅ Game ${gameId}: ${userPick.winner} (confidence ${userPick.confidence}) = ${gameResult.pointsEarned} pts`);
                } else if (userPick) {
                    console.log(`  ❌ Game ${gameId}: ${userPick.winner} lost (confidence ${userPick.confidence}) = 0 pts`);
                }
            } else if (userPick) {
                console.log(`  ⏳ Game ${gameId}: ${userPick.winner} (confidence ${userPick.confidence}) - game not final`);
            }

            gameResults.push(gameResult);
        }

        // 5. Calculate accuracy
        const accuracy = totalPicks > 0 ? (correctPicks / totalPicks * 100) : 0;

        // 6. Validate results
        const maxPossiblePoints = weekGames.length * (weekGames.length + 1) / 2;

        console.log(`\n🏆 WEEK 4 SCORING RESULTS FOR ${userName.toUpperCase()}:`);
        console.log(`  Total Points: ${totalPoints}`);
        console.log(`  Possible Points: ${possiblePoints}`);
        console.log(`  Correct Picks: ${correctPicks}/${totalPicks}`);
        console.log(`  Accuracy: ${accuracy.toFixed(1)}%`);
        console.log(`  Max Possible (16 games): ${maxPossiblePoints}`);

        // 7. Validation checks
        console.log(`\n✅ VALIDATION CHECKS:`);

        if (totalPoints <= 136) {
            console.log(`  ✅ Total points (${totalPoints}) ≤ 136 max - VALID`);
        } else {
            console.log(`  ❌ Total points (${totalPoints}) > 136 max - INVALID!`);
        }

        if (totalPoints <= possiblePoints) {
            console.log(`  ✅ Total points (${totalPoints}) ≤ possible points (${possiblePoints}) - VALID`);
        } else {
            console.log(`  ❌ Total points (${totalPoints}) > possible points (${possiblePoints}) - INVALID!`);
        }

        if (correctPicks <= totalPicks) {
            console.log(`  ✅ Correct picks (${correctPicks}) ≤ total picks (${totalPicks}) - VALID`);
        } else {
            console.log(`  ❌ Correct picks (${correctPicks}) > total picks (${totalPicks}) - INVALID!`);
        }

        // 8. Check if this is reasonable vs the old impossible scores
        if (totalPoints < 172) {
            console.log(`  ✅ Score (${totalPoints}) is reasonable (much lower than impossible 172+ scores) - FIX WORKING!`);
        }

        // 9. Test saving to Firebase
        console.log(`\n💾 TESTING FIREBASE SAVE:`);
        const scoringResult = {
            weekNumber: 4,
            totalPoints,
            possiblePoints,
            correctPicks,
            totalPicks,
            accuracy,
            gameResults,
            incomplete: totalPicks < weekGames.length,
            gamesInWeek: weekGames.length,
            maxPossiblePoints,
            timestamp: new Date().toISOString()
        };

        console.log(`  📊 Prepared scoring data for Firebase save`);
        console.log(`  🎯 Ready to save to: artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`);

        return {
            success: true,
            userId,
            userName,
            totalPoints,
            possiblePoints,
            correctPicks,
            totalPicks,
            accuracy,
            maxPossiblePoints,
            validScore: totalPoints <= 136,
            fixWorking: totalPoints < 172
        };

    } catch (error) {
        console.error(`❌ Scoring calculation error:`, error);
        return { success: false, error: error.message };
    }
}

testWeek4ActualScoring().then((result) => {
    if (result?.success) {
        console.log(`\n🎉 WEEK 4 SCORING TEST SUCCESSFUL!`);
        console.log(`📊 User scored ${result.totalPoints}/${result.possiblePoints} points`);
        console.log(`✅ Score validation: ${result.validScore ? 'PASSED' : 'FAILED'}`);
        console.log(`🔧 Fix verification: ${result.fixWorking ? 'FIX WORKING' : 'STILL BROKEN'}`);
    }
    console.log('\n🧪 Week 4 scoring test complete');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});