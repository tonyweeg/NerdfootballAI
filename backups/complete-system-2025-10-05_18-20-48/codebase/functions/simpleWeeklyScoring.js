const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * SIMPLE Weekly Scoring - No fancy error handling, just works
 */
exports.processWeeklyScoring = functions.https.onCall(async (data, context) => {
    try {
        console.log('🏆 Starting SIMPLE weekly scoring...');

        const weekNumber = (data && data.weekNumber) ? data.weekNumber : 4;
        console.log(`📊 Processing Week ${weekNumber}...`);

        // STEP 1: Get Week 4 games
        console.log('Step 1: Getting games...');
        const gamesRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`);
        const gamesSnap = await gamesRef.get();

        if (!gamesSnap.exists) {
            console.log('No games found');
            return { success: false, error: `No games found for Week ${weekNumber}` };
        }

        const gamesData = gamesSnap.data();
        const finalGames = [];

        // Find FINAL games
        for (const [gameId, game] of Object.entries(gamesData)) {
            if (!gameId.startsWith('_') && game.status && game.status.toUpperCase().includes('FINAL')) {
                finalGames.push({ gameId, ...game });
            }
        }

        console.log(`Found ${finalGames.length} FINAL games`);

        if (finalGames.length === 0) {
            return {
                success: true,
                message: `No final games yet for Week ${weekNumber}`,
                completedGames: 0,
                usersProcessed: 0
            };
        }

        // STEP 2: Get Tony's picks for this week
        console.log('Step 2: Getting Tony\'s picks...');
        const tonyUID = 'WxSPmEildJdqs6T5hIpBUZrscwt2';
        const picksRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${tonyUID}`);
        const picksSnap = await picksRef.get();

        if (!picksSnap.exists) {
            console.log('Tony has no picks for this week');
            return {
                success: true,
                message: 'No picks found for Tony',
                completedGames: finalGames.length,
                usersProcessed: 0
            };
        }

        const picks = picksSnap.data();
        console.log(`Tony has ${Object.keys(picks).length} picks`);

        // STEP 3: Calculate Tony's score
        console.log('Step 3: Calculating score...');
        let totalPoints = 0;
        let correctPicks = 0;
        let totalPicks = 0;

        for (const [gameId, pick] of Object.entries(picks)) {
            if (!pick || !pick.team || !pick.confidence) continue;

            totalPicks++;
            const confidence = parseInt(pick.confidence) || 1;

            // Find the final game
            const finalGame = finalGames.find(g => g.gameId === gameId);
            if (finalGame && finalGame.winner && pick.team === finalGame.winner) {
                correctPicks++;
                totalPoints += confidence;
                console.log(`✅ Game ${gameId}: ${pick.team} won (+${confidence} points)`);
            } else if (finalGame) {
                console.log(`❌ Game ${gameId}: ${pick.team} lost, winner was ${finalGame.winner}`);
            }
        }

        const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 100) / 100 : 0;

        console.log(`Final score: ${totalPoints} points (${correctPicks}/${totalPicks} correct, ${accuracy}% accuracy)`);

        // STEP 4: Save to scoring document
        console.log('Step 4: Saving score...');
        const scoringRef = admin.firestore().doc(`artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${tonyUID}`);

        const weeklyData = {
            totalPoints: totalPoints,
            correctPicks: correctPicks,
            totalPicks: totalPicks,
            accuracy: accuracy,
            calculatedAt: new Date().toISOString()
        };

        // Update with merge to preserve other weeks
        await scoringRef.set({
            [`weeklyPoints.${weekNumber}`]: weeklyData,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        console.log('✅ Score saved successfully!');

        return {
            success: true,
            weekNumber: weekNumber,
            completedGames: finalGames.length,
            usersProcessed: 1,
            tonyScore: {
                totalPoints: totalPoints,
                correctPicks: correctPicks,
                totalPicks: totalPicks,
                accuracy: accuracy
            }
        };

    } catch (error) {
        console.error('💥 Error in simple weekly scoring:', error);
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
});