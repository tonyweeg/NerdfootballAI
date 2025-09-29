const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function emergencyRegenerateWeek4() {
    console.log('🚨 EMERGENCY WEEK 4 SCORE REGENERATION');
    console.log('====================================');

    try {
        // 1. Get all pool members
        console.log('👥 Getting pool members...');
        const membersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const membersSnap = await membersRef.get();

        if (!membersSnap.exists) {
            console.log('❌ No pool members found');
            return;
        }

        const members = membersSnap.data();
        const userIds = Object.keys(members);
        console.log(`✅ Found ${userIds.length} pool members`);

        // 2. Get Week 4 games from Firebase (same path as fixed ScoringCalculator)
        console.log('🎮 Getting Week 4 games from Firebase...');
        const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        const docRef = db.doc(gamesPath);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.log('❌ Week 4 games not found');
            return;
        }

        const weekData = docSnap.data();
        const gameIds = Object.keys(weekData).filter(key => !key.startsWith('_') && !key.startsWith('game_'));

        // Convert to array format (same as fixed ScoringCalculator)
        const weekGames = gameIds.map(id => ({
            id: id,
            ...weekData[id]
        }));

        const finalGames = weekGames.filter(g => g.status && g.status.includes('FINAL'));
        console.log(`✅ Week 4: ${weekGames.length} total games, ${finalGames.length} completed`);

        // 3. Process each user
        let processed = 0;
        let errors = 0;

        for (const userId of userIds) {
            try {
                const userName = members[userId]?.name || userId.slice(-6);

                // Get user's Week 4 picks
                const picksCollectionPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions';
                const picksDocRef = db.collection(picksCollectionPath).doc(userId);
                const picksSnap = await picksDocRef.get();

                if (!picksSnap.exists) {
                    console.log(`⚠️ ${userName}: No Week 4 picks`);
                    continue;
                }

                const userPicks = picksSnap.data();

                // Calculate scores (same logic as fixed ScoringCalculator)
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
                        }
                    }

                    gameResults.push(gameResult);
                }

                // Calculate accuracy
                const accuracy = totalPicks > 0 ? (correctPicks / totalPicks * 100) : 0;

                // Prepare scoring result (with fields expected by leaderboard)
                const scoringResult = {
                    weekNumber: 4,
                    totalPoints,
                    possiblePoints,
                    correctPicks,
                    totalPicks,
                    gamesWon: correctPicks,        // Leaderboard expects this field
                    gamesPlayed: totalPicks,       // Leaderboard expects this field
                    accuracy,
                    gameResults,
                    incomplete: totalPicks < finalGames.length,
                    gamesInWeek: weekGames.length,
                    maxPossiblePoints: weekGames.length * (weekGames.length + 1) / 2,
                    lastUpdated: new Date().toISOString(),
                    timestamp: new Date().toISOString()
                };

                // Save to Firebase
                const scoringPath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
                const scoringRef = db.doc(scoringPath);

                // Calculate total season points
                let seasonTotal = totalPoints;
                try {
                    const existingDoc = await scoringRef.get();
                    if (existingDoc.exists) {
                        const existingData = existingDoc.data();
                        const existingWeekly = existingData.weeklyPoints || {};

                        // Sum all other weeks
                        for (const [week, weekData] of Object.entries(existingWeekly)) {
                            if (parseInt(week) !== 4 && weekData.totalPoints) {
                                seasonTotal += weekData.totalPoints;
                            }
                        }
                    }
                } catch (calcError) {
                    // Use just this week's points
                }

                // Get existing data first
                const existingDoc = await scoringRef.get();
                let updateData = {
                    totalPoints: seasonTotal,
                    lastUpdated: new Date().toISOString()
                };

                if (existingDoc.exists) {
                    const existingData = existingDoc.data();
                    // Preserve existing weeklyPoints structure
                    updateData.weeklyPoints = {
                        ...(existingData.weeklyPoints || {}),
                        4: scoringResult
                    };
                } else {
                    updateData.weeklyPoints = {
                        4: scoringResult
                    };
                }

                await scoringRef.set(updateData, { merge: true });

                console.log(`✅ ${userName}: ${totalPoints}/${possiblePoints} points (${accuracy.toFixed(1)}% accuracy)`);
                processed++;

            } catch (userError) {
                console.error(`❌ Error processing user ${userId.slice(-6)}:`, userError.message);
                errors++;
            }
        }

        console.log(`\n🎯 REGENERATION COMPLETE:`);
        console.log(`  ✅ Users processed: ${processed}`);
        console.log(`  ❌ Errors: ${errors}`);
        console.log(`  📊 Week 4 scoring data regenerated with fixed ScoringCalculator`);

        return { processed, errors };

    } catch (error) {
        console.error('❌ Emergency regeneration failed:', error);
        throw error;
    }
}

emergencyRegenerateWeek4().then((result) => {
    console.log('\n🚨 Emergency Week 4 regeneration complete');
    if (result && result.processed > 0) {
        console.log('🎉 Week 4 scoreboard should now show correct scores!');
    }
    process.exit(0);
}).catch(error => {
    console.error('❌ Emergency regeneration error:', error);
    process.exit(1);
});