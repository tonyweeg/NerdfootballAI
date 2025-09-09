/**
 * Real-Time Publisher for Firebase Realtime Database
 * Publishes game updates from ESPN to RTDB with sub-200ms latency
 */

const admin = require('firebase-admin');
const { logger } = require('firebase-functions');

class RealtimePublisher {
    constructor() {
        // Initialize RTDB reference
        this.db = admin.database();
        
        // Rate limiting
        this.lastUpdateTime = {};
        this.minUpdateInterval = 100; // Minimum 100ms between updates per game
        
        // Batch updates
        this.pendingUpdates = new Map();
        this.batchTimer = null;
        this.batchInterval = 500; // Batch updates every 500ms
    }

    /**
     * Publish game update to RTDB
     */
    async publishGameUpdate(weekNumber, gameId, gameData) {
        try {
            // Rate limiting check
            const now = Date.now();
            const lastUpdate = this.lastUpdateTime[gameId] || 0;
            if (now - lastUpdate < this.minUpdateInterval) {
                logger.warn(`Rate limiting game ${gameId} - too frequent updates`);
                return { success: false, reason: 'rate_limited' };
            }
            
            // Prepare update data
            const update = {
                gameId: gameId,
                status: gameData.status || 'pregame',
                quarter: gameData.quarter || '',
                timeRemaining: gameData.timeRemaining || '',
                homeTeam: gameData.homeTeam,
                awayTeam: gameData.awayTeam,
                homeScore: gameData.homeScore || 0,
                awayScore: gameData.awayScore || 0,
                possession: gameData.possession || '',
                redzone: gameData.redzone || false,
                updateTimestamp: admin.database.ServerValue.TIMESTAMP
            };
            
            // Add last scoring if available
            if (gameData.lastScoring) {
                update.lastScoring = {
                    team: gameData.lastScoring.team,
                    type: gameData.lastScoring.type,
                    timestamp: gameData.lastScoring.timestamp
                };
            }
            
            // Path for this game
            const gamePath = `nerdfootball/live/2025/week_${weekNumber}/games/${gameId}`;
            const metaPath = `nerdfootball/live/2025/week_${weekNumber}/metadata`;
            
            // Atomic multi-path update
            const updates = {};
            updates[gamePath] = update;
            updates[`${metaPath}/lastUpdate`] = admin.database.ServerValue.TIMESTAMP;
            updates[`${metaPath}/version`] = admin.database.ServerValue.increment(1);
            
            // Check for active games count
            const activeGames = await this.countActiveGames(weekNumber);
            updates[`${metaPath}/activeGames`] = activeGames;
            updates[`${metaPath}/status`] = activeGames > 0 ? 'live' : 'final';
            
            // Execute update
            await this.db.ref('/').update(updates);
            
            // Update rate limiting
            this.lastUpdateTime[gameId] = now;
            
            logger.info(`✅ Published game update for ${gameId} in week ${weekNumber}`);
            return { success: true, gameId, timestamp: now };
            
        } catch (error) {
            logger.error('Failed to publish game update:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Publish leaderboard delta
     */
    async publishLeaderboardDelta(weekNumber, userId, deltaData) {
        try {
            const deltaPath = `nerdfootball/live/2025/week_${weekNumber}/leaderboard/deltas/${userId}`;
            
            const delta = {
                previousPoints: deltaData.previousPoints || 0,
                currentPoints: deltaData.currentPoints || 0,
                change: deltaData.currentPoints - deltaData.previousPoints,
                timestamp: admin.database.ServerValue.TIMESTAMP
            };
            
            await this.db.ref(deltaPath).set(delta);
            
            logger.info(`📊 Published leaderboard delta for user ${userId}`);
            return { success: true };
            
        } catch (error) {
            logger.error('Failed to publish leaderboard delta:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Batch publish multiple updates
     */
    async batchPublish(updates) {
        try {
            const batchUpdates = {};
            
            for (const update of updates) {
                if (update.type === 'game') {
                    const gamePath = `nerdfootball/live/2025/week_${update.week}/games/${update.gameId}`;
                    batchUpdates[gamePath] = {
                        ...update.data,
                        updateTimestamp: admin.database.ServerValue.TIMESTAMP
                    };
                } else if (update.type === 'leaderboard') {
                    const deltaPath = `nerdfootball/live/2025/week_${update.week}/leaderboard/deltas/${update.userId}`;
                    batchUpdates[deltaPath] = {
                        ...update.data,
                        timestamp: admin.database.ServerValue.TIMESTAMP
                    };
                }
            }
            
            // Add metadata update
            const weekNumbers = [...new Set(updates.map(u => u.week))];
            for (const week of weekNumbers) {
                const metaPath = `nerdfootball/live/2025/week_${week}/metadata`;
                batchUpdates[`${metaPath}/lastUpdate`] = admin.database.ServerValue.TIMESTAMP;
                batchUpdates[`${metaPath}/version`] = admin.database.ServerValue.increment(1);
            }
            
            // Execute batch update
            await this.db.ref('/').update(batchUpdates);
            
            logger.info(`✅ Batch published ${updates.length} updates`);
            return { success: true, count: updates.length };
            
        } catch (error) {
            logger.error('Batch publish failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Add update to pending batch
     */
    addToBatch(update) {
        const key = `${update.type}_${update.week}_${update.gameId || update.userId}`;
        this.pendingUpdates.set(key, update);
        
        // Start batch timer if not running
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => this.flushBatch(), this.batchInterval);
        }
    }

    /**
     * Flush pending batch updates
     */
    async flushBatch() {
        if (this.pendingUpdates.size === 0) {
            this.batchTimer = null;
            return;
        }
        
        const updates = Array.from(this.pendingUpdates.values());
        this.pendingUpdates.clear();
        this.batchTimer = null;
        
        await this.batchPublish(updates);
    }

    /**
     * Count active games for a week
     */
    async countActiveGames(weekNumber) {
        try {
            const gamesRef = this.db.ref(`nerdfootball/live/2025/week_${weekNumber}/games`);
            const snapshot = await gamesRef.once('value');
            const games = snapshot.val() || {};
            
            let activeCount = 0;
            Object.values(games).forEach(game => {
                if (game.status === 'live' || game.status === 'in_progress') {
                    activeCount++;
                }
            });
            
            return activeCount;
        } catch (error) {
            logger.error('Error counting active games:', error);
            return 0;
        }
    }

    /**
     * Clear all data for a week (for testing/reset)
     */
    async clearWeekData(weekNumber) {
        try {
            const weekPath = `nerdfootball/live/2025/week_${weekNumber}`;
            await this.db.ref(weekPath).remove();
            logger.info(`Cleared data for week ${weekNumber}`);
            return { success: true };
        } catch (error) {
            logger.error('Failed to clear week data:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync game data from Firestore to RTDB
     */
    async syncFromFirestore(weekNumber) {
        try {
            // Get game data from Firestore
            const firestore = admin.firestore();
            const gamesDoc = await firestore
                .doc(`artifacts/nerdfootball/public/data/nerdfootball_games/week${weekNumber}`)
                .get();
            
            if (!gamesDoc.exists) {
                logger.warn(`No Firestore data for week ${weekNumber}`);
                return { success: false, reason: 'no_data' };
            }
            
            const gamesData = gamesDoc.data();
            const updates = [];
            
            // Convert Firestore format to RTDB format
            Object.entries(gamesData).forEach(([gameId, game]) => {
                if (gameId !== 'lastUpdated' && gameId !== 'weekNumber') {
                    updates.push({
                        type: 'game',
                        week: weekNumber,
                        gameId: gameId,
                        data: {
                            gameId: gameId,
                            status: game.status || 'pregame',
                            quarter: game.quarter || '',
                            timeRemaining: game.clock || '',
                            homeTeam: game.homeTeam,
                            awayTeam: game.awayTeam,
                            homeScore: game.homeScore || 0,
                            awayScore: game.awayScore || 0,
                            possession: game.possession || '',
                            redzone: game.redzone || false
                        }
                    });
                }
            });
            
            // Batch publish all games
            if (updates.length > 0) {
                await this.batchPublish(updates);
                logger.info(`✅ Synced ${updates.length} games from Firestore to RTDB`);
                return { success: true, gamesCount: updates.length };
            }
            
            return { success: false, reason: 'no_games' };
            
        } catch (error) {
            logger.error('Firestore sync failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const realtimePublisher = new RealtimePublisher();

module.exports = realtimePublisher;