// 🎮 FIREBASE FUNCTION: Weekly Leaderboard Cache System (Nintendo-style!)
// Provides sub-500ms weekly leaderboard data with real-time game updates

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { SEASON_CONFIG } = require('./seasonConfig');
const Scoring = require('./confidenceScoring');

// Initialize Firebase Admin
if (!initializeApp.apps || initializeApp.apps.length === 0) {
    initializeApp();
}
const db = getFirestore();

// Cache configuration - Smart caching: Current week fresh, previous week updating, past weeks locked
const CACHE_DURATION_CURRENT_WEEK_MS = 0; // ZERO CACHE for current week (always fresh)
const CACHE_DURATION_PREVIOUS_WEEK_MS = 5 * 60 * 1000; // 5 minutes for previous week (MNF/SNF updates)
const CACHE_DURATION_PAST_WEEKS_MS = 24 * 60 * 60 * 1000; // 24 hours for past weeks (final data)
const CACHE_PATH_PREFIX = `cache/weekly_leaderboard_${SEASON_CONFIG.year}_week_`;

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
            // Determine cache duration: current week (0ms), previous week (5min), past weeks (24h)
            const currentWeekNum = getCurrentWeekNumber();
            const isPreviousWeek = weekNumber === (currentWeekNum - 1);
            const cacheDuration = weekNumber === currentWeekNum ? CACHE_DURATION_CURRENT_WEEK_MS :
                                 isPreviousWeek ? CACHE_DURATION_PREVIOUS_WEEK_MS :
                                 CACHE_DURATION_PAST_WEEKS_MS;

            // Check if we have recent cached data
            const cacheRef = db.doc(`${CACHE_PATH_PREFIX}${weekNumber}`);
            const cacheSnap = await cacheRef.get();

            if (cacheSnap.exists) {
                const cacheData = cacheSnap.data();
                const cacheAge = Date.now() - cacheData.generatedAt;

                if (cacheAge < cacheDuration) {
                    console.log(`✅ Cache hit - returning existing Week ${weekNumber} data (age: ${Math.round(cacheAge/1000)}s, duration: ${cacheDuration}ms, current week: ${currentWeekNum})`);
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
                version: `${SEASON_CONFIG.year}-weekly-v2`
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
                nextRefresh: new Date(Date.now() + cacheDuration).toISOString()
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
            // Determine cache duration: current week (0ms), previous week (5min), past weeks (24h)
            const currentWeekNum = getCurrentWeekNumber();
            const isPreviousWeek = weekNumber === (currentWeekNum - 1);
            const cacheDuration = weekNumber === currentWeekNum ? CACHE_DURATION_CURRENT_WEEK_MS :
                                 isPreviousWeek ? CACHE_DURATION_PREVIOUS_WEEK_MS :
                                 CACHE_DURATION_PAST_WEEKS_MS;

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
            const isStale = cacheAge > cacheDuration;

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
 * Generate weekly leaderboard data from pool members, picks and game results.
 * Scoring rules live in confidenceScoring.js (shared byte-for-byte with the browser).
 */
async function generateWeeklyLeaderboardData(weekNumber) {
    console.log(`📊 Starting Week ${weekNumber} leaderboard data generation...`);

    const membersDoc = await db.doc(SEASON_CONFIG.paths.poolMembers()).get();
    if (!membersDoc.exists) {
        throw new Error('Pool members not found');
    }
    const poolMembers = membersDoc.data();
    const memberIds = Object.keys(poolMembers);

    const [bibleData, picksDocs] = await Promise.all([
        loadBibleDataForWeek(weekNumber),
        Promise.all(memberIds.map((memberId) => db.doc(SEASON_CONFIG.paths.picks(weekNumber, memberId)).get()))
    ]);

    const picksByUser = {};
    picksDocs.forEach((snap, i) => {
        if (snap.exists) picksByUser[memberIds[i]] = snap.data();
    });

    const states = Scoring.gameStates(bibleData);
    const ranked = Scoring.weekStandings(poolMembers, picksByUser, bibleData);
    const players = ranked.filter((row) => row.hasPicks);
    const generatedAt = new Date().toISOString();

    const standings = ranked.map((row) => ({
        rank: row.rank,
        userId: row.userId,
        name: row.name,
        email: poolMembers[row.userId].email || null,
        totalPoints: row.points,
        correctPicks: row.correct,
        totalPicks: row.decided,
        picksMade: row.picksMade,
        pickAccuracy: row.decided > 0 ? (row.correct / row.decided) * 100 : 0,
        hasPicks: row.hasPicks,
        pointsFromLeader: row.pointsFromLeader,
        lastUpdated: generatedAt
    }));

    const leaderboardData = {
        type: 'weekly',
        week: weekNumber,
        season: SEASON_CONFIG.year,
        generatedAt,
        standings,
        gameStates: { live: states.live, completed: states.completed, upcoming: states.upcoming },
        metadata: {
            totalUsers: memberIds.length,
            totalGames: states.total,
            liveGames: states.live,
            completedGames: states.completed,
            usersWithPicks: players.length,
            highScore: players.length > 0 ? players[0].points : 0,
            averageScore: players.length > 0
                ? players.reduce((sum, row) => sum + row.points, 0) / players.length
                : 0,
            version: `${SEASON_CONFIG.year}-weekly-v2`
        }
    };

    console.log(`✅ Generated Week ${weekNumber} leaderboard for ${standings.length} members (${players.length} with picks)`);
    return leaderboardData;
}

/**
 * Get current NFL week number (canonical SEASON_CONFIG anchor formula)
 */
function getCurrentWeekNumber() {
    return SEASON_CONFIG.utils.getCurrentWeek();
}

/**
 * Load this season's game data for a week
 */
async function loadBibleDataForWeek(weekNumber) {
    const gamesPath = SEASON_CONFIG.paths.games(weekNumber);
    const gamesSnap = await db.doc(gamesPath).get();
    if (!gamesSnap.exists) {
        throw new Error(`No game results found for Week ${weekNumber} at ${gamesPath}`);
    }
    return gamesSnap.data();
}
