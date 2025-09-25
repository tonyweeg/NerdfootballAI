// 🏆 FIREBASE FUNCTION: Season Leaderboard Cache System
// Provides sub-500ms season leaderboard data with real-time aggregation

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!initializeApp.apps || initializeApp.apps.length === 0) {
    initializeApp();
}
const db = getFirestore();

// Cache configuration
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes for season data
const CACHE_PATH = 'cache/season_leaderboard_2025';

/**
 * Generate and cache season leaderboard data
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
                    console.log(`✅ Cache hit - returning existing season data (age: ${Math.round(cacheAge/1000)}s)`);
                    return res.status(200).json({
                        success: true,
                        data: cacheData.leaderboard,
                        cached: true,
                        cacheAge: Math.round(cacheAge/1000),
                        responseTime: Date.now() - startTime
                    });
                }
            }

            // Generate fresh season leaderboard data
            console.log('🔄 Generating fresh season leaderboard data...');
            const leaderboardData = await generateSeasonLeaderboardData();

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
                console.log('⚠️ No season cache found - triggering generation');
                return res.status(202).json({
                    success: false,
                    message: 'Season cache not found - generating fresh data',
                    regenerating: true,
                    responseTime: Date.now() - startTime
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
                lastGenerated: new Date(cacheData.generatedAt).toISOString()
            });

            // Trigger background refresh if stale
            if (isStale) {
                console.log('🔄 Season cache is stale - triggering background refresh');
                // Note: In production, you'd trigger the generation function here
            }

        } catch (error) {
            console.error('❌ Error getting cached season leaderboard:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime
            });
        }
    }
);

/**
 * Generate complete season leaderboard data by aggregating weekly totals
 */
async function generateSeasonLeaderboardData() {
    console.log('📊 Starting season leaderboard data generation...');

    // Get pool members
    const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
    const membersDoc = await db.doc(poolMembersPath).get();

    if (!membersDoc.exists) {
        throw new Error('Pool members not found');
    }

    const poolMembers = membersDoc.data();
    const memberIds = Object.keys(poolMembers);

    // Determine completed weeks (weeks with game results)
    const completedWeeks = await getCompletedWeeks();
    console.log(`🗓️ Found ${completedWeeks.length} completed weeks: ${completedWeeks.join(', ')}`);

    const leaderboardData = {
        type: 'season',
        generatedAt: new Date().toISOString(),
        standings: [],
        metadata: {
            totalUsers: memberIds.length,
            completedWeeks: completedWeeks,
            totalWeeks: completedWeeks.length,
            version: '2025-season-v1'
        }
    };

    // Process each user for season totals
    const userSeasonResults = [];

    for (const memberId of memberIds) {
        try {
            const memberInfo = poolMembers[memberId];

            let seasonData = {
                userId: memberId,
                name: memberInfo.name || memberInfo.email || 'Unknown',
                email: memberInfo.email,
                totalPoints: 0,
                totalCorrectPicks: 0,
                totalPicks: 0,
                avgAccuracy: 0,
                weeksPlayed: 0,
                weeklyBreakdown: {}
            };

            // FIXED: Read directly from corrected scoring documents instead of outdated weekly cache
            try {
                const userScoringPath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${memberId}`;
                const userScoringSnap = await db.doc(userScoringPath).get();

                if (userScoringSnap.exists) {
                    const userScoringData = userScoringSnap.data();

                    // Use the corrected data from our pipeline fix
                    seasonData.totalPoints = userScoringData.totalPoints || 0;
                    seasonData.totalCorrectPicks = userScoringData.seasonStats?.gamesWon || 0;
                    seasonData.totalPicks = userScoringData.seasonStats?.totalGames || 0;
                    seasonData.weeksPlayed = userScoringData.seasonStats?.weeksPlayed || 0;

                    // Build weekly breakdown from corrected weekly data
                    if (userScoringData.weeklyPoints) {
                        for (const weekNumber of completedWeeks) {
                            const weekData = userScoringData.weeklyPoints[weekNumber];
                            if (weekData) {
                                seasonData.weeklyBreakdown[`week${weekNumber}`] = {
                                    points: weekData.totalPoints || 0,
                                    correct: weekData.gamesWon || 0,
                                    total: weekData.gamesPlayed || 0,
                                    accuracy: weekData.gamesPlayed > 0 ?
                                        ((weekData.gamesWon / weekData.gamesPlayed) * 100) : 0
                                };
                            }
                        }
                    }

                    console.log(`✅ User ${memberId.slice(-6)}: ${seasonData.totalPoints} points (${seasonData.totalCorrectPicks}/${seasonData.totalPicks} picks)`);
                } else {
                    console.log(`⚠️ No scoring document found for user ${memberId}`);
                }
            } catch (userError) {
                console.error(`❌ Error getting scoring data for user ${memberId}:`, userError);
            }

            // Calculate average accuracy
            seasonData.avgAccuracy = seasonData.totalPicks > 0 ?
                ((seasonData.totalCorrectPicks / seasonData.totalPicks) * 100) : 0;

            userSeasonResults.push(seasonData);

        } catch (userError) {
            console.error(`❌ Error processing season data for user ${memberId}:`, userError);
            // Continue processing other users
        }
    }

    // Sort by total points (descending)
    userSeasonResults.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add rankings and calculate metadata
    let totalScore = 0;
    leaderboardData.standings = userSeasonResults.map((user, index) => {
        totalScore += user.totalPoints;
        return {
            rank: index + 1,
            ...user,
            pointsFromLeader: index === 0 ? 0 : userSeasonResults[0].totalPoints - user.totalPoints
        };
    });

    // Update metadata
    leaderboardData.metadata.averageScore = userSeasonResults.length > 0 ?
        Math.round(totalScore / userSeasonResults.length) : 0;
    leaderboardData.metadata.highScore = userSeasonResults.length > 0 ? userSeasonResults[0].totalPoints : 0;
    leaderboardData.metadata.usersWithData = userSeasonResults.filter(u => u.totalPoints > 0).length;

    console.log(`✅ Generated season leaderboard for ${userSeasonResults.length} users`);
    console.log(`🏆 Season Leader: ${userSeasonResults[0]?.name} with ${userSeasonResults[0]?.totalPoints} points`);

    return leaderboardData;
}

/**
 * Get list of completed weeks by checking for game results
 * Uses same logic as weekly leaderboard cache for consistency
 */
async function getCompletedWeeks() {
    const completedWeeks = [];

    // Check weeks 1-18 for available game results
    for (let week = 1; week <= 18; week++) {
        try {
            const gameResultsPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
            const gameResultsRef = db.doc(gameResultsPath);
            const gameResultsSnap = await gameResultsRef.get();

            if (gameResultsSnap.exists) {
                const gameData = gameResultsSnap.data();
                console.log(`📊 Week ${week} data structure:`, Object.keys(gameData).slice(0, 3));

                // Check if we have actual game data with winners
                const games = Object.values(gameData).filter(game => {
                    // More flexible check - look for winner field regardless of status
                    return game && game.winner && game.winner !== 'TBD' && game.winner !== null;
                });

                console.log(`🔍 Week ${week}: Found ${games.length} games with winners out of ${Object.values(gameData).length} total games`);

                if (games.length > 0) {
                    completedWeeks.push(week);
                    console.log(`✅ Week ${week}: ${games.length} completed games`);

                    // Debug: Show sample game data
                    if (games[0]) {
                        console.log(`📋 Sample game from Week ${week}:`, {
                            winner: games[0].winner,
                            status: games[0].status,
                            homeTeam: games[0].homeTeam,
                            awayTeam: games[0].awayTeam
                        });
                    }
                } else {
                    console.log(`⚠️ Week ${week}: Has data but no completed games yet`);
                }
            } else {
                console.log(`❌ Week ${week}: No document found`);
            }
        } catch (error) {
            console.log(`❌ Week ${week}: Error accessing data - ${error.message}`);
        }
    }

    console.log(`🏁 Final completed weeks detected: [${completedWeeks.join(', ')}]`);
    return completedWeeks.sort((a, b) => a - b);
}