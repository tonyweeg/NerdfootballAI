const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * BULLETPROOF WEEKLY SCORING - Works for ALL weeks
 * Calculates scores in real-time from picks + bible data
 * Can be called manually or automatically
 */
exports.processWeeklyScoring = onCall(
    { cors: true, timeoutSeconds: 300, memory: '512MiB' },
    async (request) => {
        try {
            console.log('🏆 BULLETPROOF Weekly Scoring Started');

            // Get week from data or use current week
            const data = request.data || {};
            const weekNumber = parseInt(data.week) || getCurrentWeek();
            console.log(`📊 Processing Week ${weekNumber}...`);

            // Get pool members
            const poolMembersRef = admin.firestore().doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
            const poolMembersSnap = await poolMembersRef.get();

            if (!poolMembersSnap.exists) {
                throw new Error('Pool members not found');
            }

            const poolMembers = Object.values(poolMembersSnap.data()).filter(
                member => member && member.uid && member.uid !== 'undefined'
            );

            console.log(`👥 Processing ${poolMembers.length} users`);

            // Get bible data for this week
            const bibleRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`);
            const bibleSnap = await bibleRef.get();

            if (!bibleSnap.exists) {
                throw new Error(`No game data found for Week ${weekNumber}`);
            }

            const bible = bibleSnap.data();
            const gameIds = Object.keys(bible).filter(k => k !== '_metadata');
            console.log(`🎮 ${gameIds.length} games in Week ${weekNumber}`);

            let usersProcessed = 0;
            let errors = [];

            // Process each user
            for (const member of poolMembers) {
                try {
                    await processUserScore(member.uid, weekNumber, bible);
                    usersProcessed++;
                } catch (error) {
                    console.error(`❌ Error processing ${member.uid}:`, error);
                    errors.push({ userId: member.uid, error: error.message });
                }
            }

            const result = {
                success: true,
                weekNumber,
                usersProcessed,
                totalUsers: poolMembers.length,
                errors: errors.length,
                errorDetails: errors,
                timestamp: new Date().toISOString()
            };

            console.log(`✅ Week ${weekNumber} scoring complete: ${usersProcessed}/${poolMembers.length} users`);

            return result;

        } catch (error) {
            console.error('💥 Scoring process failed:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
);

/**
 * Process a single user's score - BULLETPROOF calculation
 */
async function processUserScore(userId, weekNumber, bible) {
    // Get user picks
    const picksRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${userId}`);
    const picksSnap = await picksRef.get();

    if (!picksSnap.exists) {
        console.log(`  ⚠️ No picks for ${userId}`);
        return;
    }

    const picks = picksSnap.data();

    // Filter out metadata fields - BULLETPROOF approach
    const pickGameIds = Object.keys(picks).filter(key =>
        !['userName', 'submittedAt', 'weekNumber', 'timestamp', 'mondayNightPoints',
          'mnfTotalPoints', 'tiebreaker', 'totalPoints', 'userId', 'lastUpdated',
          'poolId', 'survivorPick', 'createdAt', 'week', 'games'].includes(key)
    );

    let totalPoints = 0;
    let correctPicks = 0;
    let totalPicks = pickGameIds.length;
    let gamesWon = 0;
    let gamesPlayed = 0;

    // Calculate score from each pick
    for (const gameId of pickGameIds) {
        const pick = picks[gameId];
        if (!pick || !pick.winner || !pick.confidence) continue;

        const game = bible[gameId];
        if (!game) continue;

        const userPick = pick.winner;
        const confidence = parseInt(pick.confidence) || 0;

        // Only count games that have finished
        if (game.status && (game.status === 'STATUS_FINAL' || game.status === 'final')) {
            gamesPlayed++;

            const actualWinner = game.winner;
            const isCorrect = actualWinner === userPick;

            if (isCorrect) {
                correctPicks++;
                gamesWon++;
                totalPoints += confidence;
            }
        }
    }

    const accuracy = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100 * 100) / 100 : 0;

    // Save to scoring document
    const scoringRef = admin.firestore().doc(`artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`);

    const weeklyData = {
        totalPoints,
        gamesWon,
        gamesPlayed,
        correctPicks,
        totalPicks,
        accuracy,
        lastUpdated: new Date().toISOString()
    };

    await scoringRef.set({
        [`weeklyPoints.${weekNumber}`]: weeklyData,
        lastUpdated: new Date().toISOString()
    }, { merge: true });

    console.log(`  ✅ ${userId.slice(-6)}: ${totalPoints} points (${gamesWon}/${gamesPlayed} correct)`);
}

/**
 * Get current NFL week number
 */
function getCurrentWeek() {
    const today = new Date();
    const seasonStart = new Date('2025-09-04'); // Week 1 starts Sept 4, 2025
    const daysSinceStart = Math.floor((today - seasonStart) / (1000 * 60 * 60 * 24));
    const weeksSinceStart = Math.floor(daysSinceStart / 7);
    return Math.max(1, Math.min(18, weeksSinceStart + 1));
}
