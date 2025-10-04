const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Process weekly scoring for completed games
 * This function will be called by the automated system when games complete
 */
exports.processWeeklyScoring = functions.https.onCall(async (data, context) => {
    try {
        console.log('🏆 Starting weekly scoring process...');

        const { weekNumber, forceRecalculate = false } = data || {};

        // If no week specified, determine current week
        const currentWeek = weekNumber || getCurrentWeek();

        console.log(`📊 Processing scoring for Week ${currentWeek}...`);

        // Check if week has completed games that need scoring
        const completedGames = await getCompletedGamesForWeek(currentWeek);

        if (!completedGames || completedGames.length === 0 && !forceRecalculate) {
            console.log(`📅 No completed games found for Week ${currentWeek} - skipping scoring`);
            return {
                success: true,
                weekNumber: currentWeek,
                message: 'No completed games to score',
                completedGames: 0,
                usersProcessed: 0
            };
        }

        console.log(`🎯 Found ${completedGames ? completedGames.length : 0} completed games for Week ${currentWeek}`);

        // Get all pool members
        const poolMembers = await getPoolMembers();
        if (!poolMembers) {
            throw new Error('Failed to get pool members');
        }
        console.log(`👥 Processing scoring for ${poolMembers.length} users`);

        const results = {
            weekNumber: currentWeek,
            completedGames: completedGames ? completedGames.length : 0,
            usersProcessed: 0,
            usersWithPicks: 0,
            usersSkipped: 0,
            errors: [],
            startTime: new Date().toISOString()
        };

        // Process each user's scoring for this week
        for (const member of poolMembers) {
            try {
                console.log(`🎯 Processing ${member.displayName || member.uid.slice(-6)}...`);

                // Check if user has picks for this week
                const userPicks = await getUserPicksForWeek(member.uid, currentWeek);

                if (!userPicks || Object.keys(userPicks).length === 0) {
                    console.log(`  📭 No picks found - skipping`);
                    results.usersSkipped++;
                    continue;
                }

                results.usersWithPicks++;

                // Calculate user's score for this week
                const scoreResult = await calculateUserWeeklyScore(member.uid, currentWeek, userPicks, completedGames);

                if (scoreResult.success) {
                    // Save the weekly scoring data
                    await saveUserWeeklyScore(member.uid, currentWeek, scoreResult);
                    results.usersProcessed++;
                    console.log(`  ✅ Scored: ${scoreResult.totalPoints} points (${scoreResult.correctPicks}/${scoreResult.totalPicks} correct)`);
                } else {
                    console.log(`  ❌ Scoring failed: ${scoreResult.error}`);
                    results.errors.push({
                        userId: member.uid,
                        error: scoreResult.error
                    });
                }

            } catch (userError) {
                console.error(`❌ Error processing user ${member.uid}:`, userError);
                results.errors.push({
                    userId: member.uid,
                    error: userError.message
                });
            }
        }

        results.endTime = new Date().toISOString();

        console.log('🏆 Weekly scoring complete:');
        console.log(`  📊 Week: ${currentWeek}`);
        console.log(`  🎯 Users processed: ${results.usersProcessed}`);
        console.log(`  📋 Users with picks: ${results.usersWithPicks}`);
        console.log(`  ⏭️ Users skipped: ${results.usersSkipped}`);
        console.log(`  ❌ Errors: ${results.errors.length}`);

        return {
            success: true,
            ...results
        };

    } catch (error) {
        console.error('💥 Weekly scoring process failed:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
});

/**
 * Get current NFL week based on season start
 */
function getCurrentWeek() {
    const seasonStart = new Date('2025-09-04');
    const now = new Date();
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const weeksSinceStart = Math.floor(daysSinceStart / 7);
    return Math.max(1, Math.min(18, weeksSinceStart + 1));
}

/**
 * Get completed games for a specific week
 */
async function getCompletedGamesForWeek(weekNumber) {
    try {
        const gamesRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`);
        const gamesSnap = await gamesRef.get();

        if (!gamesSnap.exists()) {
            return [];
        }

        const games = gamesSnap.data();
        const completedGames = [];

        Object.entries(games).forEach(([gameId, game]) => {
            if (!gameId.startsWith('_') && game.status && game.status.toUpperCase().includes('FINAL')) {
                completedGames.push({
                    gameId,
                    ...game
                });
            }
        });

        return completedGames;
    } catch (error) {
        console.error(`Error getting completed games for week ${weekNumber}:`, error);
        return [];
    }
}

/**
 * Get pool members
 */
async function getPoolMembers() {
    try {
        const membersRef = admin.firestore().doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const membersSnap = await membersRef.get();

        if (membersSnap.exists()) {
            const allMembers = Object.values(membersSnap.data());
            return allMembers.filter(member => member && member.uid && member.uid !== 'undefined');
        }
        return [];
    } catch (error) {
        console.error('Error fetching pool members:', error);
        return [];
    }
}

/**
 * Get user picks for a specific week
 */
async function getUserPicksForWeek(userId, weekNumber) {
    try {
        const picksRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${userId}`);
        const picksSnap = await picksRef.get();

        if (picksSnap.exists()) {
            return picksSnap.data();
        }
        return null;
    } catch (error) {
        console.error(`Error getting picks for user ${userId}, week ${weekNumber}:`, error);
        return null;
    }
}

/**
 * Calculate user's weekly score
 */
async function calculateUserWeeklyScore(userId, weekNumber, userPicks, completedGames) {
    try {
        let totalPoints = 0;
        let correctPicks = 0;
        let totalPicks = 0;
        const pickResults = {};

        // Process each pick against completed games
        Object.entries(userPicks).forEach(([gameId, pick]) => {
            if (!pick || (!pick.team && !pick.winner) || !pick.confidence) {
                return; // Skip invalid picks
            }

            // Support both 'team' and 'winner' field names
            const userPickedTeam = pick.team || pick.winner;

            totalPicks++;
            const confidence = parseInt(pick.confidence) || 1;

            // Find the corresponding completed game
            const completedGame = completedGames.find(g => g.gameId === gameId);

            if (completedGame) {
                // TIE GAME LOGIC: If winner is null or undefined, it's a tie - everyone gets points
                if (!completedGame.winner) {
                    correctPicks++;
                    totalPoints += confidence;

                    pickResults[gameId] = {
                        team: userPickedTeam,
                        confidence: confidence,
                        correct: true,
                        points: confidence,
                        gameWinner: 'TIE',
                        isTie: true
                    };
                } else {
                    // Normal game with winner
                    const isCorrect = userPickedTeam === completedGame.winner;

                    if (isCorrect) {
                        correctPicks++;
                        totalPoints += confidence;
                    }

                    pickResults[gameId] = {
                        team: userPickedTeam,
                        confidence: confidence,
                        correct: isCorrect,
                        points: isCorrect ? confidence : 0,
                        gameWinner: completedGame.winner
                    };
                }
            }
        });

        const accuracy = totalPicks > 0 ? (correctPicks / totalPicks * 100) : 0;

        return {
            success: true,
            totalPoints,
            correctPicks,
            totalPicks,
            accuracy: Math.round(accuracy * 100) / 100,
            pickResults,
            weekNumber,
            calculatedAt: new Date().toISOString()
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Save user's weekly score to scoring-users document
 */
async function saveUserWeeklyScore(userId, weekNumber, scoreResult) {
    try {
        const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
        const scoreRef = admin.firestore().doc(scorePath);

        // Prepare the weekly data
        const weeklyData = {
            totalPoints: scoreResult.totalPoints,
            correctPicks: scoreResult.correctPicks,
            totalPicks: scoreResult.totalPicks,
            accuracy: scoreResult.accuracy,
            pickResults: scoreResult.pickResults,
            calculatedAt: scoreResult.calculatedAt
        };

        // Update the document with merge to preserve other weeks
        const updateData = {
            [`weeklyPoints.${weekNumber}`]: weeklyData,
            lastUpdated: new Date().toISOString()
        };

        await scoreRef.set(updateData, { merge: true });

        console.log(`  💾 Saved Week ${weekNumber} scoring data for user ${userId}`);

    } catch (error) {
        console.error(`Error saving weekly score for user ${userId}:`, error);
        throw error;
    }
}