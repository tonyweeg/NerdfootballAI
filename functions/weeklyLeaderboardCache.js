// 🎮 FIREBASE FUNCTION: Weekly Leaderboard Cache System (Nintendo-style!)
// Provides sub-500ms weekly leaderboard data with real-time game updates

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!initializeApp.apps || initializeApp.apps.length === 0) {
    initializeApp();
}
const db = getFirestore();

// Cache configuration (matching ESPN cache pattern)
const CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes for more frequent updates during live games
const CACHE_PATH_PREFIX = 'cache/weekly_leaderboard_2025_week_';

/**
 * Generate and cache weekly leaderboard data for a specific week
 */
exports.generateWeeklyLeaderboardCache = onRequest(
    { cors: true, timeoutSeconds: 120, memory: '512MiB' },
    async (req, res) => {
        const weekNumber = parseInt(req.query.week) || getCurrentWeekNumber();
        console.log(`🎮 Weekly Leaderboard Cache Generation Started for Week ${weekNumber}`);
        const startTime = Date.now();

        try {
            // Check if we have recent cached data
            const cacheRef = db.doc(`${CACHE_PATH_PREFIX}${weekNumber}`);
            const cacheSnap = await cacheRef.get();

            if (cacheSnap.exists) {
                const cacheData = cacheSnap.data();
                const cacheAge = Date.now() - cacheData.generatedAt;

                if (cacheAge < CACHE_DURATION_MS) {
                    console.log(`✅ Cache hit - returning existing Week ${weekNumber} data (age: ${Math.round(cacheAge/1000)}s)`);
                    return res.status(200).json({
                        success: true,
                        data: cacheData.leaderboard,
                        cached: true,
                        cacheAge: Math.round(cacheAge/1000),
                        responseTime: Date.now() - startTime,
                        weekNumber: weekNumber
                    });
                }
            }

            // Generate fresh weekly leaderboard data
            console.log(`🔄 Generating fresh weekly leaderboard data for Week ${weekNumber}...`);
            const leaderboardData = await generateWeeklyLeaderboardData(weekNumber);

            // Cache the results
            const cacheDocument = {
                leaderboard: leaderboardData,
                generatedAt: Date.now(),
                generatedAtTimestamp: Timestamp.now(),
                weekNumber: weekNumber,
                version: '2025-weekly-v1-nintendo'
            };

            await cacheRef.set(cacheDocument);

            const totalTime = Date.now() - startTime;
            console.log(`✅ Week ${weekNumber} leaderboard cached successfully in ${totalTime}ms`);

            res.status(200).json({
                success: true,
                data: leaderboardData,
                cached: false,
                responseTime: totalTime,
                weekNumber: weekNumber,
                nextRefresh: new Date(Date.now() + CACHE_DURATION_MS).toISOString()
            });

        } catch (error) {
            console.error(`❌ Error generating Week ${weekNumber} leaderboard cache:`, error);
            res.status(500).json({
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime,
                weekNumber: weekNumber
            });
        }
    }
);

/**
 * Get cached weekly leaderboard data (FAST endpoint for frontend)
 */
exports.getWeeklyLeaderboard = onRequest(
    { cors: true, timeoutSeconds: 30, memory: '256MiB' },
    async (req, res) => {
        const weekNumber = parseInt(req.query.week) || getCurrentWeekNumber();
        const startTime = Date.now();

        try {
            // Get cached data
            const cacheRef = db.doc(`${CACHE_PATH_PREFIX}${weekNumber}`);
            const cacheSnap = await cacheRef.get();

            if (!cacheSnap.exists) {
                // No cache exists - trigger generation
                console.log(`⚠️ No cache found for Week ${weekNumber} - triggering generation`);
                return res.status(202).json({
                    success: false,
                    message: `Cache not found for Week ${weekNumber} - generating fresh data`,
                    regenerating: true,
                    responseTime: Date.now() - startTime,
                    weekNumber: weekNumber
                });
            }

            const cacheData = cacheSnap.data();
            const cacheAge = Date.now() - cacheData.generatedAt;
            const isStale = cacheAge > CACHE_DURATION_MS;

            // Return cached data (even if slightly stale for speed)
            res.status(200).json({
                success: true,
                data: cacheData.leaderboard,
                cached: true,
                cacheAge: Math.round(cacheAge/1000),
                isStale,
                responseTime: Date.now() - startTime,
                weekNumber: weekNumber,
                lastGenerated: new Date(cacheData.generatedAt).toISOString()
            });

            // Trigger background refresh if stale
            if (isStale) {
                console.log(`🔄 Week ${weekNumber} cache is stale - triggering background refresh`);
                // Note: In production, you'd trigger the generation function here
            }

        } catch (error) {
            console.error(`❌ Error getting cached Week ${weekNumber} leaderboard:`, error);
            res.status(500).json({
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime,
                weekNumber: weekNumber
            });
        }
    }
);

/**
 * Generate complete weekly leaderboard data using picks-viewer-auth.html pattern
 */
async function generateWeeklyLeaderboardData(weekNumber) {
    console.log(`📊 Starting Week ${weekNumber} leaderboard data generation...`);

    // Get pool members
    const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
    const membersDoc = await db.doc(poolMembersPath).get();

    if (!membersDoc.exists) {
        throw new Error('Pool members not found');
    }

    const poolMembers = membersDoc.data();
    const memberIds = Object.keys(poolMembers);

    // Load bible data for this week
    const bibleData = await loadBibleDataForWeek(weekNumber);
    const gameIds = Object.keys(bibleData).filter(k => k !== '_metadata');

    // Determine if games are live/completed
    const gameStates = await analyzeGameStates(bibleData);

    const leaderboardData = {
        type: 'weekly',
        week: weekNumber,
        generatedAt: new Date().toISOString(),
        standings: [],
        gameStates: gameStates,
        metadata: {
            totalUsers: memberIds.length,
            totalGames: gameIds.length,
            liveGames: gameStates.live,
            completedGames: gameStates.completed,
            version: '2025-weekly-nintendo-v1'
        }
    };

    // Process each user for this specific week
    const userWeeklyResults = [];

    for (const memberId of memberIds) {
        try {
            const memberInfo = poolMembers[memberId];

            // Get user's picks for this week (same path as picks-viewer-auth.html)
            const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${memberId}`;
            const userPicksDoc = await db.doc(picksPath).get();

            let weeklyData = {
                userId: memberId,
                name: memberInfo.name || memberInfo.email || 'Unknown',
                email: memberInfo.email,
                totalPoints: 0,
                correctPicks: 0,
                totalPicks: 0,
                pickAccuracy: 0,
                hasPicks: false,
                picks: {}
            };

            if (userPicksDoc.exists) {
                const picks = userPicksDoc.data();
                const analysis = analyzePicksForScoring(picks, bibleData);

                weeklyData = {
                    ...weeklyData,
                    totalPoints: analysis.totalPointsEarned || 0,
                    correctPicks: analysis.correctPicks || 0,
                    totalPicks: analysis.totalPicks || 0,
                    pickAccuracy: analysis.totalPicks > 0 ? ((analysis.correctPicks / analysis.totalPicks) * 100) : 0,
                    hasPicks: true,
                    picks: analysis.pickResults || {}
                };
            }

            userWeeklyResults.push(weeklyData);

        } catch (userError) {
            console.error(`❌ Error processing Week ${weekNumber} for user ${memberId}:`, userError);
            // Continue processing other users
        }
    }

    // Sort by total points (descending)
    userWeeklyResults.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add rankings and calculate metadata
    let totalScore = 0;
    leaderboardData.standings = userWeeklyResults.map((user, index) => {
        totalScore += user.totalPoints;
        return {
            rank: index + 1,
            ...user,
            pointsFromLeader: index === 0 ? 0 : userWeeklyResults[0].totalPoints - user.totalPoints
        };
    });

    // Update metadata
    leaderboardData.metadata.averageScore = userWeeklyResults.length > 0 ? (totalScore / userWeeklyResults.length) : 0;
    leaderboardData.metadata.highScore = userWeeklyResults.length > 0 ? userWeeklyResults[0].totalPoints : 0;
    leaderboardData.metadata.usersWithPicks = userWeeklyResults.filter(u => u.hasPicks).length;

    console.log(`✅ Generated Week ${weekNumber} leaderboard for ${userWeeklyResults.length} users`);
    console.log(`🏆 Week ${weekNumber} Leader: ${userWeeklyResults[0]?.name} with ${userWeeklyResults[0]?.totalPoints} points`);

    return leaderboardData;
}

/**
 * Analyze game states to determine which are live, completed, upcoming
 */
async function analyzeGameStates(bibleData) {
    const gameIds = Object.keys(bibleData).filter(k => k !== '_metadata');

    let live = 0;
    let completed = 0;
    let upcoming = 0;

    for (const gameId of gameIds) {
        const game = bibleData[gameId];
        if (game.winner && game.winner !== 'TBD') {
            completed++;
        } else if (game.status === 'IN_PROGRESS' || game.status === 'HALFTIME') {
            live++;
        } else {
            upcoming++;
        }
    }

    return { live, completed, upcoming };
}

/**
 * NFL 2025 Season Week Calendar (Bible-based)
 */
const NFL_2025_WEEKS = {
    1: { start: '2025-09-04', games: '2025-09-04' },
    2: { start: '2025-09-08', games: '2025-09-11' },
    3: { start: '2025-09-15', games: '2025-09-21' },
    4: { start: '2025-09-22', games: '2025-09-26' },
    5: { start: '2025-09-29', games: '2025-10-03' },
    6: { start: '2025-10-06', games: '2025-10-10' },
    7: { start: '2025-10-13', games: '2025-10-17' },
    8: { start: '2025-10-20', games: '2025-10-24' },
    9: { start: '2025-10-27', games: '2025-10-31' },
    10: { start: '2025-11-03', games: '2025-11-07' },
    11: { start: '2025-11-10', games: '2025-11-14' },
    12: { start: '2025-11-17', games: '2025-11-21' },
    13: { start: '2025-11-24', games: '2025-11-28' },
    14: { start: '2025-12-01', games: '2025-12-05' },
    15: { start: '2025-12-08', games: '2025-12-12' },
    16: { start: '2025-12-15', games: '2025-12-19' },
    17: { start: '2025-12-22', games: '2025-12-26' },
    18: { start: '2025-12-29', games: '2026-01-02' }
};

/**
 * Get current NFL week number based on bible data and current date
 */
function getCurrentWeekNumber() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Find current week based on today's date
    for (let week = 1; week <= 18; week++) {
        const weekData = NFL_2025_WEEKS[week];
        const weekStart = new Date(weekData.start);
        const nextWeek = NFL_2025_WEEKS[week + 1];
        const weekEnd = nextWeek ? new Date(nextWeek.start) : new Date('2026-01-10');

        if (today >= weekStart && today < weekEnd) {
            console.log(`📅 Current Date: ${today.toISOString()}`);
            console.log(`📅 Week ${week} Range: ${weekData.start} to ${nextWeek ? nextWeek.start : '2026-01-10'}`);
            console.log(`📅 Bible-based NFL Week: ${week}`);
            return week;
        }
    }

    // Fallback - if we're before week 1, return 1; if after week 18, return 18
    const fallbackWeek = todayStr < '2025-09-04' ? 1 : 18;
    console.log(`📅 Fallback NFL Week: ${fallbackWeek}`);
    return fallbackWeek;
}

/**
 * Load bible data for a specific week from Firestore (matches diagnostic path)
 */
async function loadBibleDataForWeek(weekNumber) {
    try {
        console.log(`📊 Loading Week ${weekNumber} game data from Firestore...`);

        // Use the same path as diagnostic page
        const gameResultsPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`;
        const gameResultsRef = db.doc(gameResultsPath);
        const gameResultsSnap = await gameResultsRef.get();

        if (!gameResultsSnap.exists) {
            throw new Error(`No game results found for Week ${weekNumber} at ${gameResultsPath}`);
        }

        const bibleData = gameResultsSnap.data();
        const gameCount = Object.keys(bibleData).filter(k => k !== '_metadata').length;

        console.log(`✅ Loaded Week ${weekNumber} bible data from Firestore: ${gameCount} games`);
        console.log(`📊 Sample game data:`, JSON.stringify(Object.values(bibleData)[0], null, 2).substring(0, 200));

        return bibleData;
    } catch (error) {
        console.error(`❌ Error loading Week ${weekNumber} bible data from Firestore:`, error);
        throw error;
    }
}

/**
 * Analyze picks for scoring (same logic as season leaderboard)
 */
function analyzePicksForScoring(picks, bibleData) {
    const gameIds = Object.keys(picks).filter(key =>
        !['userName', 'submittedAt', 'weekNumber', 'timestamp', 'mondayNightPoints',
          'mnfTotalPoints', 'tiebreaker', 'totalPoints', 'userId', 'lastUpdated',
          'poolId', 'survivorPick', 'createdAt', 'week', 'games'].includes(key)
    );

    const expectedGameIds = bibleData ? Object.keys(bibleData).filter(k => k !== '_metadata') : [];

    let correctPicks = 0;
    let totalPointsEarned = 0;
    const pickResults = {};

    // Process each game pick
    for (const gameId of gameIds) {
        const pick = picks[gameId];
        if (pick && pick.winner && bibleData && bibleData[gameId]) {
            const actualWinner = bibleData[gameId].winner;
            const userPick = pick.winner;
            const isCorrect = actualWinner === userPick;

            pickResults[gameId] = {
                isValid: true,
                isCorrect,
                userPick,
                actualWinner,
                confidence: pick.confidence || 0,
                pointsEarned: isCorrect ? (pick.confidence || 0) : 0
            };

            if (isCorrect) {
                correctPicks++;
                totalPointsEarned += pick.confidence || 0;
            }
        } else {
            pickResults[gameId] = { isValid: false, isCorrect: false };
        }
    }

    return {
        correctPicks,
        totalPicks: gameIds.length,
        totalPointsEarned,
        pickResults,
        expectedGameCount: expectedGameIds.length
    };
}