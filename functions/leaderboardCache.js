// ⚡ FIREBASE FUNCTION: Season Leaderboard Cache System
// Provides sub-500ms leaderboard data following ESPN cache pattern

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!initializeApp.apps || initializeApp.apps.length === 0) {
    initializeApp();
}
const db = getFirestore();

// Cache configuration (matching ESPN cache pattern)
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_PATH = 'cache/season_leaderboard_2025';

/**
 * Generate and cache season leaderboard data
 * Following the same pattern as ESPN cache for consistent sub-500ms performance
 */
exports.generateSeasonLeaderboardCache = onRequest(
    { cors: true, timeoutSeconds: 120, memory: '512MiB' },
    async (req, res) => {
        console.log('🏆 Season Leaderboard Cache Generation Started');
        const startTime = Date.now();

        try {
            // Check if we have recent cached data
            const cacheRef = db.doc(CACHE_PATH);
            const cacheSnap = await cacheRef.get();

            if (cacheSnap.exists) {
                const cacheData = cacheSnap.data();
                const cacheAge = Date.now() - cacheData.generatedAt;

                if (cacheAge < CACHE_DURATION_MS) {
                    console.log(`✅ Cache hit - returning existing data (age: ${Math.round(cacheAge/1000)}s)`);
                    return res.status(200).json({
                        success: true,
                        data: cacheData.leaderboard,
                        cached: true,
                        cacheAge: Math.round(cacheAge/1000),
                        responseTime: Date.now() - startTime
                    });
                }
            }

            // Generate fresh leaderboard data
            console.log('🔄 Generating fresh season leaderboard data...');
            const leaderboardData = await generateLeaderboardData();

            // Cache the results
            const cacheDocument = {
                leaderboard: leaderboardData,
                generatedAt: Date.now(),
                generatedAtTimestamp: Timestamp.now(),
                version: '2025-season-v1'
            };

            await cacheRef.set(cacheDocument);

            const totalTime = Date.now() - startTime;
            console.log(`✅ Season leaderboard cached successfully in ${totalTime}ms`);

            res.status(200).json({
                success: true,
                data: leaderboardData,
                cached: false,
                responseTime: totalTime,
                nextRefresh: new Date(Date.now() + CACHE_DURATION_MS).toISOString()
            });

        } catch (error) {
            console.error('❌ Error generating season leaderboard cache:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime
            });
        }
    }
);

/**
 * Get cached season leaderboard data (FAST endpoint for frontend)
 */
exports.getSeasonLeaderboard = onRequest(
    { cors: true, timeoutSeconds: 30, memory: '256MiB' },
    async (req, res) => {
        const startTime = Date.now();

        try {
            // Get cached data
            const cacheRef = db.doc(CACHE_PATH);
            const cacheSnap = await cacheRef.get();

            if (!cacheSnap.exists) {
                // No cache exists - trigger generation
                console.log('⚠️ No cache found - triggering generation');
                return res.status(202).json({
                    success: false,
                    message: 'Cache not found - generating fresh data',
                    regenerating: true,
                    responseTime: Date.now() - startTime
                });
            }

            const cacheData = cacheSnap.data();
            const cacheAge = Date.now() - cacheData.generatedAt;
            const isStale = cacheAge > CACHE_DURATION_MS;

            // Return cached data (even if stale for speed)
            res.status(200).json({
                success: true,
                data: cacheData.leaderboard,
                cached: true,
                cacheAge: Math.round(cacheAge/1000),
                isStale,
                responseTime: Date.now() - startTime,
                lastGenerated: new Date(cacheData.generatedAt).toISOString()
            });

            // Trigger background refresh if stale
            if (isStale) {
                console.log('🔄 Cache is stale - triggering background refresh');
                // Note: In production, you'd trigger the generation function here
            }

        } catch (error) {
            console.error('❌ Error getting cached leaderboard:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime
            });
        }
    }
);

/**
 * Generate complete leaderboard data using same pattern as picks-viewer-auth.html
 */
async function generateLeaderboardData() {
    console.log('📊 Starting leaderboard data generation...');

    // Get pool members
    const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
    const membersDoc = await db.doc(poolMembersPath).get();

    if (!membersDoc.exists) {
        throw new Error('Pool members not found');
    }

    const poolMembers = membersDoc.data();
    const memberIds = Object.keys(poolMembers);

    // Define completed weeks (update as season progresses)
    const completedWeeks = [1, 2]; // TODO: Make this dynamic based on current week

    const leaderboardData = {
        type: 'season',
        weeks: completedWeeks,
        generatedAt: new Date().toISOString(),
        standings: [],
        metadata: {
            totalUsers: memberIds.length,
            totalWeeks: completedWeeks.length,
            completedWeeks: completedWeeks,
            averageScore: 0,
            highScore: 0,
            version: '2025-season-cache-v2-picks-based'
        }
    };

    // Process each user using same data access as picks-viewer-auth.html
    const userTotals = [];

    for (const memberId of memberIds) {
        try {
            const memberInfo = poolMembers[memberId];

            let totalPoints = 0;
            let totalCorrectPicks = 0;
            let totalPicks = 0;
            let weeksPlayed = 0;
            let weeklyBreakdown = {};

            // Process each completed week using picks-viewer-auth.html pattern
            for (const weekNumber of completedWeeks) {
                try {
                    // Load bible data for this week (same as picks-viewer-auth.html)
                    const bibleData = await loadBibleDataForWeek(weekNumber);

                    // Get user's picks for this week (same path as picks-viewer-auth.html)
                    const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${memberId}`;
                    const userPicksDoc = await db.doc(picksPath).get();

                    if (userPicksDoc.exists) {
                        const picks = userPicksDoc.data();

                        // Analyze picks using same logic as picks-viewer-auth.html
                        const analysis = analyzePicksForScoring(picks, bibleData);

                        totalPoints += analysis.totalPointsEarned || 0;
                        totalCorrectPicks += analysis.correctPicks || 0;
                        totalPicks += analysis.totalPicks || 0;
                        weeksPlayed++;

                        weeklyBreakdown[weekNumber] = {
                            points: analysis.totalPointsEarned || 0,
                            correct: analysis.correctPicks || 0,
                            total: analysis.totalPicks || 0
                        };
                    }
                } catch (weekError) {
                    console.error(`❌ Error processing week ${weekNumber} for user ${memberId}:`, weekError);
                    // Continue with other weeks
                }
            }

            userTotals.push({
                userId: memberId,
                name: memberInfo.name || memberInfo.email || 'Unknown',
                email: memberInfo.email,
                totalPoints,
                totalCorrectPicks,
                totalPicks,
                weeksPlayed,
                averagePoints: weeksPlayed > 0 ? (totalPoints / weeksPlayed) : 0,
                pickAccuracy: totalPicks > 0 ? ((totalCorrectPicks / totalPicks) * 100) : 0,
                weeklyBreakdown
            });

        } catch (userError) {
            console.error(`❌ Error processing user ${memberId}:`, userError);
            // Continue processing other users
        }
    }

    // Sort by total points (descending)
    userTotals.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add rankings and calculate metadata
    let totalScore = 0;
    leaderboardData.standings = userTotals.map((user, index) => {
        totalScore += user.totalPoints;
        return {
            rank: index + 1,
            ...user,
            pointsFromLeader: index === 0 ? 0 : userTotals[0].totalPoints - user.totalPoints
        };
    });

    // Update metadata
    leaderboardData.metadata.averageScore = userTotals.length > 0 ? (totalScore / userTotals.length) : 0;
    leaderboardData.metadata.highScore = userTotals.length > 0 ? userTotals[0].totalPoints : 0;

    console.log(`✅ Generated leaderboard for ${userTotals.length} users across ${completedWeeks.length} weeks`);
    console.log(`🏆 Leader: ${userTotals[0]?.name} with ${userTotals[0]?.totalPoints} points`);

    return leaderboardData;
}

/**
 * Admin function to manually refresh cache
 */
exports.refreshSeasonLeaderboard = onRequest(
    { cors: true, timeoutSeconds: 180, memory: '512MiB' },
    async (req, res) => {
        // Add admin authentication check here if needed
        console.log('🔧 Manual cache refresh triggered');

        try {
            const leaderboardData = await generateLeaderboardData();

            const cacheDocument = {
                leaderboard: leaderboardData,
                generatedAt: Date.now(),
                generatedAtTimestamp: Timestamp.now(),
                version: '2025-season-manual-refresh'
            };

            await db.doc(CACHE_PATH).set(cacheDocument);

            res.status(200).json({
                success: true,
                message: 'Cache refreshed successfully',
                data: leaderboardData
            });

        } catch (error) {
            console.error('❌ Manual refresh failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * Load bible data for a specific week (same as picks-viewer-auth.html)
 */
async function loadBibleDataForWeek(weekNumber) {
    try {
        const https = require('https');
        const url = `https://nerdfootball.web.app/nfl_2025_week_${weekNumber}.json?v=${Date.now()}`;

        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => {
                    try {
                        const bibleData = JSON.parse(data);
                        console.log(`✅ Loaded Week ${weekNumber} bible data:`, Object.keys(bibleData).filter(k => k !== '_metadata').length, 'games');
                        resolve(bibleData);
                    } catch (parseError) {
                        console.error(`❌ Error parsing Week ${weekNumber} bible data:`, parseError);
                        reject(parseError);
                    }
                });
                response.on('error', reject);
            }).on('error', reject);
        });
    } catch (error) {
        console.error(`❌ Error loading Week ${weekNumber} bible data:`, error);
        throw error;
    }
}

/**
 * Analyze picks for scoring (same logic as picks-viewer-auth.html)
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

            pickResults[gameId] = { isValid: true, isCorrect };

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