const admin = require('firebase-admin');
const functions = require('firebase-functions');

// DIAMOND-LEVEL PICK ANALYTICS SYSTEM
// Comprehensive pick statistics and insights for NerdFootballAI

class PickAnalyticsEngine {
    constructor() {
        this.db = admin.firestore();
        this.batchSize = 500; // Firestore batch limit
    }

    // Core utility functions
    getPicksPath(poolId, week, userId) {
        // Maintain backward compatibility for legacy pools
        if (poolId === 'nerdfootball-2025' || poolId === 'nerduniverse-2025') {
            return `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions/${userId}`;
        }
        return `artifacts/nerdfootball/pools/${poolId}/weeks/${week}/picks/${userId}`;
    }

    getPoolMembersPath(poolId) {
        return `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    }

    getAnalyticsPath(poolId, week) {
        return `artifacts/nerdfootball/pools/${poolId}/analytics/weeks/${week}`;
    }

    // Get all pool members for a given pool
    async getPoolMembers(poolId) {
        try {
            const membersDoc = await this.db.doc(this.getPoolMembersPath(poolId)).get();
            if (!membersDoc.exists) {
                console.warn(`Pool members not found for pool: ${poolId}`);
                return [];
            }
            
            const membersData = membersDoc.data();
            return Object.entries(membersData)
                .filter(([key, value]) => key !== 'poolId' && typeof value === 'object' && value !== null)
                .map(([userId, userData]) => ({
                    userId,
                    displayName: userData.displayName || userData.name || 'Unknown',
                    email: userData.email || null
                }));
        } catch (error) {
            console.error(`Error fetching pool members for ${poolId}:`, error);
            return [];
        }
    }

    // Fetch all picks for a specific week and pool
    async getAllPicksForWeek(poolId, week) {
        try {
            const poolMembers = await this.getPoolMembers(poolId);
            if (poolMembers.length === 0) {
                return [];
            }

            const picksPromises = poolMembers.map(async (member) => {
                try {
                    const picksPath = this.getPicksPath(poolId, week, member.userId);
                    const picksDoc = await this.db.doc(picksPath).get();
                    
                    if (!picksDoc.exists) {
                        return null;
                    }

                    const picksData = picksDoc.data();
                    // Extract actual picks (filter out metadata)
                    const picks = {};
                    Object.entries(picksData).forEach(([key, value]) => {
                        if (key !== 'userId' && key !== 'poolId' && key !== 'weekNumber' && 
                            typeof value === 'object' && value !== null && 
                            value.hasOwnProperty('winner') && value.hasOwnProperty('confidence')) {
                            picks[key] = value;
                        }
                    });

                    return {
                        userId: member.userId,
                        displayName: member.displayName,
                        picks: picks
                    };
                } catch (error) {
                    console.warn(`Error fetching picks for user ${member.userId}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(picksPromises);
            return results.filter(result => result !== null && Object.keys(result.picks).length > 0);
        } catch (error) {
            console.error(`Error fetching all picks for week ${week}, pool ${poolId}:`, error);
            return [];
        }
    }

    // Calculate comprehensive analytics for a week
    async calculateWeeklyAnalytics(poolId, week) {
        const allPicks = await this.getAllPicksForWeek(poolId, week);
        
        if (allPicks.length === 0) {
            return {
                totalPicksets: 0,
                gameAnalytics: {},
                confidenceAnalytics: {},
                userSimilarity: {},
                pickClusters: {},
                metadata: {
                    poolId,
                    week,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                    dataQuality: 'no_data'
                }
            };
        }

        // Get all unique game IDs
        const allGameIds = new Set();
        allPicks.forEach(userPicks => {
            Object.keys(userPicks.picks).forEach(gameId => allGameIds.add(gameId));
        });

        const gameAnalytics = {};
        const confidenceAnalytics = {
            distribution: {},  // confidence level -> count
            averageByGame: {}, // gameId -> average confidence
            extremes: {
                highestConfidence: [],
                lowestConfidence: []
            }
        };

        // Calculate per-game analytics
        for (const gameId of allGameIds) {
            const gameData = {
                totalPicks: 0,
                teamPercentages: {},
                confidenceStats: {
                    average: 0,
                    distribution: {},
                    byTeam: {}
                },
                popularityScore: 0, // 0-100, higher = more consensus
                contrarian: {
                    picks: [],
                    score: 0
                }
            };

            const picksForGame = [];
            const teamCounts = {};
            const confidenceValues = [];

            // Gather all picks for this game
            allPicks.forEach(userPicks => {
                if (userPicks.picks[gameId]) {
                    const pick = userPicks.picks[gameId];
                    if (pick.winner && pick.confidence) {
                        picksForGame.push({
                            userId: userPicks.userId,
                            displayName: userPicks.displayName,
                            winner: pick.winner,
                            confidence: parseInt(pick.confidence)
                        });
                        
                        teamCounts[pick.winner] = (teamCounts[pick.winner] || 0) + 1;
                        confidenceValues.push(parseInt(pick.confidence));
                    }
                }
            });

            gameData.totalPicks = picksForGame.length;

            if (picksForGame.length > 0) {
                // Calculate team percentages
                Object.keys(teamCounts).forEach(team => {
                    gameData.teamPercentages[team] = {
                        count: teamCounts[team],
                        percentage: Math.round((teamCounts[team] / picksForGame.length) * 100)
                    };
                });

                // Calculate confidence statistics
                gameData.confidenceStats.average = Math.round(
                    confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length * 10
                ) / 10;

                // Confidence distribution
                confidenceValues.forEach(conf => {
                    gameData.confidenceStats.distribution[conf] = 
                        (gameData.confidenceStats.distribution[conf] || 0) + 1;
                });

                // Confidence by team
                Object.keys(teamCounts).forEach(team => {
                    const teamConfidences = picksForGame
                        .filter(p => p.winner === team)
                        .map(p => p.confidence);
                    
                    if (teamConfidences.length > 0) {
                        gameData.confidenceStats.byTeam[team] = {
                            average: Math.round(
                                teamConfidences.reduce((sum, conf) => sum + conf, 0) / teamConfidences.length * 10
                            ) / 10,
                            count: teamConfidences.length
                        };
                    }
                });

                // Calculate popularity score (how much consensus exists)
                const maxTeamPercentage = Math.max(...Object.values(gameData.teamPercentages).map(t => t.percentage));
                gameData.popularityScore = maxTeamPercentage;

                // Identify contrarian picks (picks with lower popularity)
                const minorityThreshold = 30; // Less than 30% = contrarian
                gameData.contrarian.picks = picksForGame.filter(pick => {
                    const teamPercentage = gameData.teamPercentages[pick.winner]?.percentage || 0;
                    return teamPercentage < minorityThreshold;
                });
                
                gameData.contrarian.score = Math.round(
                    (gameData.contrarian.picks.length / picksForGame.length) * 100
                );

                // Update global confidence analytics
                confidenceAnalytics.averageByGame[gameId] = gameData.confidenceStats.average;
            }

            gameAnalytics[gameId] = gameData;
        }

        // Calculate overall confidence distribution
        allPicks.forEach(userPicks => {
            Object.values(userPicks.picks).forEach(pick => {
                if (pick.confidence) {
                    const conf = parseInt(pick.confidence);
                    confidenceAnalytics.distribution[conf] = 
                        (confidenceAnalytics.distribution[conf] || 0) + 1;
                }
            });
        });

        // Find confidence extremes
        Object.entries(gameAnalytics).forEach(([gameId, gameData]) => {
            if (gameData.confidenceStats.average >= 12) {
                confidenceAnalytics.extremes.highestConfidence.push({
                    gameId,
                    average: gameData.confidenceStats.average,
                    totalPicks: gameData.totalPicks
                });
            }
            if (gameData.confidenceStats.average <= 6) {
                confidenceAnalytics.extremes.lowestConfidence.push({
                    gameId,
                    average: gameData.confidenceStats.average,
                    totalPicks: gameData.totalPicks
                });
            }
        });

        // Sort extremes
        confidenceAnalytics.extremes.highestConfidence.sort((a, b) => b.average - a.average);
        confidenceAnalytics.extremes.lowestConfidence.sort((a, b) => a.average - b.average);

        // Calculate user similarity (simplified Jaccard similarity for pick agreement)
        const userSimilarity = this.calculateUserSimilarity(allPicks);

        // Generate pick clusters (users with similar picking patterns)
        const pickClusters = this.generatePickClusters(allPicks, userSimilarity);

        return {
            totalPicksets: allPicks.length,
            gameAnalytics,
            confidenceAnalytics,
            userSimilarity,
            pickClusters,
            metadata: {
                poolId,
                week,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                dataQuality: allPicks.length > 0 ? 'complete' : 'no_data',
                uniqueGames: allGameIds.size
            }
        };
    }

    // Calculate user similarity based on pick agreement
    calculateUserSimilarity(allPicks) {
        if (allPicks.length < 2) return {};
        
        const similarities = {};
        
        for (let i = 0; i < allPicks.length; i++) {
            for (let j = i + 1; j < allPicks.length; j++) {
                const user1 = allPicks[i];
                const user2 = allPicks[j];
                
                const user1Games = new Set(Object.keys(user1.picks));
                const user2Games = new Set(Object.keys(user2.picks));
                const commonGames = [...user1Games].filter(game => user2Games.has(game));
                
                if (commonGames.length === 0) continue;
                
                let agreements = 0;
                commonGames.forEach(gameId => {
                    if (user1.picks[gameId].winner === user2.picks[gameId].winner) {
                        agreements++;
                    }
                });
                
                const similarityScore = Math.round((agreements / commonGames.length) * 100);
                
                const pairKey = [user1.userId, user2.userId].sort().join('_');
                similarities[pairKey] = {
                    users: [
                        { userId: user1.userId, displayName: user1.displayName },
                        { userId: user2.userId, displayName: user2.displayName }
                    ],
                    agreementPercentage: similarityScore,
                    commonGames: commonGames.length,
                    agreements: agreements
                };
            }
        }
        
        return similarities;
    }

    // Generate pick clusters based on similarity
    generatePickClusters(allPicks, userSimilarity) {
        const clusters = {
            highAgreement: [],    // >80% agreement
            moderateAgreement: [], // 60-80% agreement
            lowAgreement: [],     // 40-60% agreement
            contrarians: []       // <40% agreement with most users
        };

        // Group users by their similarity patterns
        const userAgreementScores = {};
        
        allPicks.forEach(user => {
            userAgreementScores[user.userId] = {
                user: { userId: user.userId, displayName: user.displayName },
                totalAgreements: 0,
                agreementCount: 0,
                averageAgreement: 0
            };
        });

        // Calculate average agreement for each user
        Object.values(userSimilarity).forEach(similarity => {
            const [user1, user2] = similarity.users;
            
            userAgreementScores[user1.userId].totalAgreements += similarity.agreementPercentage;
            userAgreementScores[user1.userId].agreementCount++;
            
            userAgreementScores[user2.userId].totalAgreements += similarity.agreementPercentage;
            userAgreementScores[user2.userId].agreementCount++;
        });

        // Calculate averages and categorize
        Object.values(userAgreementScores).forEach(userScore => {
            if (userScore.agreementCount > 0) {
                userScore.averageAgreement = Math.round(userScore.totalAgreements / userScore.agreementCount);
                
                if (userScore.averageAgreement >= 80) {
                    clusters.highAgreement.push(userScore);
                } else if (userScore.averageAgreement >= 60) {
                    clusters.moderateAgreement.push(userScore);
                } else if (userScore.averageAgreement >= 40) {
                    clusters.lowAgreement.push(userScore);
                } else {
                    clusters.contrarians.push(userScore);
                }
            }
        });

        // Sort clusters by agreement score
        ['highAgreement', 'moderateAgreement', 'lowAgreement', 'contrarians'].forEach(clusterType => {
            clusters[clusterType].sort((a, b) => b.averageAgreement - a.averageAgreement);
        });

        return clusters;
    }
}

// Firestore trigger to update analytics when picks change
exports.onPicksUpdate = functions.firestore.onDocumentWritten('artifacts/nerdfootball/pools/{poolId}/weeks/{week}/picks/{userId}', async (event) => {
    const { poolId, week, userId } = event.params;
    
    try {
        console.log(`Pick change detected for pool ${poolId}, week ${week}, user ${userId}`);
        
        const analytics = new PickAnalyticsEngine();
        const weeklyAnalytics = await analytics.calculateWeeklyAnalytics(poolId, week);
        
        // Store analytics in Firestore
        const analyticsPath = analytics.getAnalyticsPath(poolId, week);
        await analytics.db.doc(analyticsPath).set(weeklyAnalytics, { merge: true });
        
        console.log(`Analytics updated for pool ${poolId}, week ${week}`);
        
        return { success: true, message: 'Analytics updated successfully' };
    } catch (error) {
        console.error('Error updating analytics:', error);
        return { success: false, error: error.message };
    }
});

// Legacy picks path trigger for backward compatibility
exports.onLegacyPicksUpdate = functions.firestore.onDocumentWritten('artifacts/nerdfootball/public/data/nerdfootball_picks/{week}/submissions/{userId}', async (event) => {
    const { week, userId } = event.params;
    
    try {
        console.log(`Legacy pick change detected for week ${week}, user ${userId}`);
        
        // Determine pool ID for legacy data (default to nerduniverse-2025)
        const poolId = 'nerduniverse-2025';
        
        const analytics = new PickAnalyticsEngine();
        const weeklyAnalytics = await analytics.calculateWeeklyAnalytics(poolId, week);
        
        // Store analytics in new path structure
        const analyticsPath = analytics.getAnalyticsPath(poolId, week);
        await analytics.db.doc(analyticsPath).set(weeklyAnalytics, { merge: true });
        
        console.log(`Legacy analytics updated for pool ${poolId}, week ${week}`);
        
        return { success: true, message: 'Legacy analytics updated successfully' };
    } catch (error) {
        console.error('Error updating legacy analytics:', error);
        return { success: false, error: error.message };
    }
});

// HTTP function to manually trigger analytics calculation
exports.calculateAnalytics = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { poolId, week, force = false } = data;
    
    if (!poolId || !week) {
        throw new functions.https.HttpsError('invalid-argument', 'poolId and week are required');
    }
    
    try {
        const analytics = new PickAnalyticsEngine();
        
        // Check if analytics already exist and are recent (unless forced)
        if (!force) {
            const existingDoc = await analytics.db.doc(analytics.getAnalyticsPath(poolId, week)).get();
            if (existingDoc.exists) {
                const existingData = existingDoc.data();
                const lastUpdated = existingData.metadata?.lastUpdated;
                if (lastUpdated) {
                    const hoursSinceUpdate = (Date.now() - lastUpdated.toMillis()) / (1000 * 60 * 60);
                    if (hoursSinceUpdate < 1) { // Less than 1 hour old
                        return { success: true, message: 'Analytics are recent, skipping calculation', cached: true };
                    }
                }
            }
        }
        
        const weeklyAnalytics = await analytics.calculateWeeklyAnalytics(poolId, week);
        
        // Store analytics
        const analyticsPath = analytics.getAnalyticsPath(poolId, week);
        await analytics.db.doc(analyticsPath).set(weeklyAnalytics, { merge: true });
        
        return { 
            success: true, 
            message: 'Analytics calculated successfully',
            analytics: weeklyAnalytics,
            cached: false
        };
        
    } catch (error) {
        console.error('Error calculating analytics:', error);
        throw new functions.https.HttpsError('internal', 'Error calculating analytics: ' + error.message);
    }
});

// HTTP function to get analytics data
exports.getAnalytics = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { poolId, week } = data;
    
    if (!poolId || !week) {
        throw new functions.https.HttpsError('invalid-argument', 'poolId and week are required');
    }
    
    try {
        const analytics = new PickAnalyticsEngine();
        const analyticsPath = analytics.getAnalyticsPath(poolId, week);
        const analyticsDoc = await analytics.db.doc(analyticsPath).get();
        
        if (!analyticsDoc.exists) {
            // Try to calculate analytics on-demand
            const weeklyAnalytics = await analytics.calculateWeeklyAnalytics(poolId, week);
            await analytics.db.doc(analyticsPath).set(weeklyAnalytics, { merge: true });
            
            return {
                success: true,
                analytics: weeklyAnalytics,
                generated: true
            };
        }
        
        return {
            success: true,
            analytics: analyticsDoc.data(),
            generated: false
        };
        
    } catch (error) {
        console.error('Error getting analytics:', error);
        throw new functions.https.HttpsError('internal', 'Error getting analytics: ' + error.message);
    }
});

// Trigger for game score/result updates
exports.onGameResultUpdate = functions.firestore.onDocumentWritten('artifacts/nerdfootball/public/data/nerdfootball_games/{week}', async (event) => {
    const { week } = event.params;
    
    try {
        console.log(`Game results updated for week ${week} - triggering analytics recalculation`);
        
        // Get all pools that might be affected
        const poolsSnapshot = await admin.firestore().collection('artifacts/nerdfootball/pools').get();
        const analyticsEngine = new PickAnalyticsEngine();
        
        // Recalculate analytics for all active pools
        const recalculationPromises = [];
        poolsSnapshot.forEach(poolDoc => {
            const poolId = poolDoc.id;
            console.log(`Recalculating analytics for pool ${poolId}, week ${week}`);
            recalculationPromises.push(
                analyticsEngine.calculateWeekAnalytics(poolId, parseInt(week)).catch(error => {
                    console.error(`Failed to recalculate analytics for pool ${poolId}, week ${week}:`, error);
                })
            );
        });
        
        await Promise.allSettled(recalculationPromises);
        console.log(`Analytics recalculation completed for week ${week} across all pools`);
        
    } catch (error) {
        console.error(`Error in game result trigger for week ${week}:`, error);
    }
});

// Trigger for individual game updates (scores, status changes)
exports.onIndividualGameUpdate = functions.firestore.onDocumentWritten('artifacts/nerdfootball/games/{gameId}', async (event) => {
    const { gameId } = event.params;
    
    try {
        console.log(`Individual game ${gameId} updated - checking for analytics impact`);
        
        // Get game data to determine week
        const gameDoc = await admin.firestore().doc(`artifacts/nerdfootball/games/${gameId}`).get();
        if (!gameDoc.exists) {
            console.log(`Game ${gameId} not found, skipping analytics update`);
            return;
        }
        
        const gameData = gameDoc.data();
        const week = gameData.week;
        
        if (!week) {
            console.log(`No week found for game ${gameId}, skipping analytics update`);
            return;
        }
        
        // Get all pools and recalculate analytics
        const poolsSnapshot = await admin.firestore().collection('artifacts/nerdfootball/pools').get();
        const analyticsEngine = new PickAnalyticsEngine();
        
        const recalculationPromises = [];
        poolsSnapshot.forEach(poolDoc => {
            const poolId = poolDoc.id;
            console.log(`Recalculating analytics for pool ${poolId}, week ${week} due to game ${gameId} update`);
            recalculationPromises.push(
                analyticsEngine.calculateWeekAnalytics(poolId, week).catch(error => {
                    console.error(`Failed to recalculate analytics for pool ${poolId}, week ${week}:`, error);
                })
            );
        });
        
        await Promise.allSettled(recalculationPromises);
        console.log(`Analytics recalculation completed for week ${week} due to game ${gameId} update`);
        
    } catch (error) {
        console.error(`Error in individual game update trigger for game ${gameId}:`, error);
    }
});

// Export the analytics engine for use in other functions
module.exports = { PickAnalyticsEngine };