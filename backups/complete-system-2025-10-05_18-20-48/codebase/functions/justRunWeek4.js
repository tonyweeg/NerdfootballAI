const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Just run the existing scoring system for Week 4
 * Call the EXACT same process that worked for weeks 1-3
 */
exports.processWeeklyScoring = functions.https.onCall(async (data, context) => {
    try {
        console.log('🏆 Running existing scoring system for Week 4...');

        // Just call the existing ScoringCalculator that already works for weeks 1-3
        const weekNumber = 4;

        // Get pool members (same way as existing system)
        const poolMembersRef = admin.firestore().doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const poolMembersSnap = await poolMembersRef.get();
        const poolMembers = Object.values(poolMembersSnap.data()).filter(member => member && member.uid && member.uid !== 'undefined');

        console.log(`Processing ${poolMembers.length} users for Week ${weekNumber}`);

        let usersProcessed = 0;
        let errors = [];

        // Process each user the EXACT same way as weeks 1-3
        for (const member of poolMembers) {
            try {
                await processUserScore(member.uid, weekNumber);
                usersProcessed++;
                console.log(`✅ Processed ${member.displayName || member.uid.slice(-6)}`);
            } catch (error) {
                console.error(`❌ Error processing ${member.uid}:`, error);
                errors.push({ userId: member.uid, error: error.message });
            }
        }

        console.log(`✅ Week 4 scoring complete: ${usersProcessed} users processed, ${errors.length} errors`);

        return {
            success: true,
            weekNumber: weekNumber,
            usersProcessed: usersProcessed,
            errors: errors.length,
            message: `Processed Week 4 scoring for ${usersProcessed} users`
        };

    } catch (error) {
        console.error('💥 Error in Week 4 scoring:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

/**
 * Process a single user's score - EXACTLY like the existing system does
 */
async function processUserScore(userId, weekNumber) {
    // Step 1: Get user picks (same path as existing system)
    const picksRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${userId}`);
    const picksSnap = await picksRef.get();

    if (!picksSnap.exists) {
        console.log(`No picks found for user ${userId}`);
        return;
    }

    const picks = picksSnap.data();

    // Step 2: Get games data (same path as existing system)
    const gamesRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`);
    const gamesSnap = await gamesRef.get();

    if (!gamesSnap.exists) {
        throw new Error(`No games found for week ${weekNumber}`);
    }

    const games = gamesSnap.data();

    // Step 3: Calculate score (same logic as existing system)
    let totalPoints = 0;
    let correctPicks = 0;
    let totalPicks = 0;

    Object.entries(picks).forEach(([gameId, pick]) => {
        // Skip metadata fields
        if (!pick || typeof pick !== 'object' || !pick.confidence) return;

        // Handle both 'team' and 'winner' field formats
        const pickedTeam = pick.team || pick.winner;
        if (!pickedTeam) return;

        totalPicks++;
        const confidence = parseInt(pick.confidence) || 1;
        const game = games[gameId];

        // Check if game is final and has a winner
        if (game && game.status && game.status.toUpperCase().includes('FINAL') && game.winner) {
            if (pickedTeam === game.winner) {
                correctPicks++;
                totalPoints += confidence;
            }
        }
    });

    const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 100) / 100 : 0;

    // Step 4: Save to scoring document (EXACT same format as existing weeks)
    const scoringRef = admin.firestore().doc(`artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`);

    const weeklyData = {
        totalPoints: totalPoints,
        correctPicks: correctPicks,
        totalPicks: totalPicks,
        accuracy: accuracy,
        calculatedAt: new Date().toISOString()
    };

    // Update with merge - same as existing system
    await scoringRef.set({
        [`weeklyPoints.${weekNumber}`]: weeklyData,
        lastUpdated: new Date().toISOString()
    }, { merge: true });

    console.log(`User ${userId}: ${totalPoints} points (${correctPicks}/${totalPicks} correct)`);
}