/**
 * Real-Time Game Sync Cloud Function
 * Fetches ESPN data and publishes to Firebase Realtime Database
 * Triggers instant client updates via WebSocket
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const rtdb = admin.database();
const firestore = admin.firestore();

// Import our existing realtimePublisher
const realtimePublisher = require('./realtimePublisher');

/**
 * Manual trigger function for testing - HTTP endpoint with CORS
 */
exports.syncGameDataRealtime = onRequest({
    cors: {
        origin: ['https://nerdfootball.web.app', 'https://nerdfootball.firebaseapp.com'],
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
}, async (req, res) => {
    try {
        logger.info('🔄 Manual real-time sync triggered');
        
        // Handle preflight OPTIONS request
        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Origin', 'https://nerdfootball.web.app');
            res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.status(204).send('');
            return;
        }
        
        const { week = 1, forceRefresh = false } = req.body || {};
        
        const result = await syncWeekData(week, forceRefresh);
        
        logger.info('✅ Manual sync complete', result);
        
        res.set('Access-Control-Allow-Origin', 'https://nerdfootball.web.app');
        res.json({ success: true, ...result });
        
    } catch (error) {
        logger.error('❌ Manual sync failed:', error);
        res.set('Access-Control-Allow-Origin', 'https://nerdfootball.web.app');
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Scheduled function - runs every 30 seconds during game days
 */
exports.scheduledGameSync = onSchedule('every 30 seconds', async (event) => {
    try {
        logger.info('⏰ Scheduled real-time sync started');
        
        const currentWeek = getCurrentNflWeek();
        const result = await syncWeekData(currentWeek, false);
        
        logger.info('✅ Scheduled sync complete', result);
        return result;
        
    } catch (error) {
        logger.error('❌ Scheduled sync failed:', error);
        throw error;
    }
});

/**
 * Core sync function - fetches from ESPN and publishes to RTDB
 */
async function syncWeekData(weekNumber, forceRefresh = false) {
    const startTime = Date.now();
    logger.info(`🏈 Syncing Week ${weekNumber} game data...`);
    
    try {
        // 1. Check if there are live games this week
        const liveGames = await checkForLiveGames(weekNumber);
        if (!liveGames.hasLiveGames && !forceRefresh) {
            logger.info(`⏸️ No live games for Week ${weekNumber}, skipping sync`);
            return { 
                success: true, 
                week: weekNumber, 
                liveGames: 0, 
                message: 'No live games' 
            };
        }
        
        // 2. Fetch fresh game data from ESPN
        const espnData = await fetchEspnGameData(weekNumber);
        if (!espnData || !espnData.games) {
            throw new Error('No ESPN data received');
        }
        
        // 3. Process and publish each game to RTDB
        const publishPromises = espnData.games.map(game => 
            publishGameToRTDB(weekNumber, game)
        );
        
        const publishResults = await Promise.allSettled(publishPromises);
        
        // 4. Count successes and failures
        const successful = publishResults.filter(r => r.status === 'fulfilled').length;
        const failed = publishResults.filter(r => r.status === 'rejected').length;
        
        // 5. Update metadata
        await updateWeekMetadata(weekNumber, {
            lastSync: admin.database.ServerValue.TIMESTAMP,
            activeGames: liveGames.count,
            totalGames: espnData.games.length,
            syncDuration: Date.now() - startTime
        });
        
        logger.info(`✅ Week ${weekNumber} sync: ${successful} games published, ${failed} failed`);
        
        return {
            success: true,
            week: weekNumber,
            gamesProcessed: espnData.games.length,
            successful,
            failed,
            duration: Date.now() - startTime
        };
        
    } catch (error) {
        logger.error(`❌ Week ${weekNumber} sync failed:`, error);
        throw error;
    }
}

/**
 * Check for live games this week
 */
async function checkForLiveGames(weekNumber) {
    try {
        // Quick check from Firestore first
        const gamesDoc = await firestore
            .doc(`artifacts/nerdfootball/public/data/nerdfootball_games/week${weekNumber}`)
            .get();
            
        if (!gamesDoc.exists) {
            return { hasLiveGames: false, count: 0 };
        }
        
        const games = gamesDoc.data();
        let liveCount = 0;
        
        Object.entries(games).forEach(([gameId, game]) => {
            if (gameId !== 'lastUpdated' && gameId !== 'weekNumber') {
                const status = game.status?.toLowerCase() || '';
                if (status.includes('live') || status.includes('progress') || status.includes('halftime')) {
                    liveCount++;
                }
            }
        });
        
        return {
            hasLiveGames: liveCount > 0,
            count: liveCount
        };
        
    } catch (error) {
        logger.warn('Error checking live games, proceeding with sync:', error);
        return { hasLiveGames: true, count: 0 }; // Default to true to ensure sync
    }
}

/**
 * Fetch game data from ESPN (or existing Firestore)
 */
async function fetchEspnGameData(weekNumber) {
    try {
        // For now, fetch from our existing Firestore data
        // TODO: Add direct ESPN API integration later
        const gamesDoc = await firestore
            .doc(`artifacts/nerdfootball/public/data/nerdfootball_games/week${weekNumber}`)
            .get();
            
        if (!gamesDoc.exists) {
            throw new Error(`No game data found for week ${weekNumber}`);
        }
        
        const gamesData = gamesDoc.data();
        const games = [];
        
        // Convert Firestore format to standardized format
        Object.entries(gamesData).forEach(([gameId, game]) => {
            if (gameId !== 'lastUpdated' && gameId !== 'weekNumber') {
                games.push({
                    gameId,
                    status: game.status || 'pregame',
                    quarter: game.quarter || '',
                    timeRemaining: game.clock || '',
                    homeTeam: game.homeTeam,
                    awayTeam: game.awayTeam,
                    homeScore: parseInt(game.homeScore) || 0,
                    awayScore: parseInt(game.awayScore) || 0,
                    possession: game.possession || '',
                    redzone: game.redzone || false,
                    lastUpdate: game.lastUpdated || Date.now()
                });
            }
        });
        
        return { games };
        
    } catch (error) {
        logger.error('Error fetching ESPN data:', error);
        throw error;
    }
}

/**
 * Publish individual game to RTDB
 */
async function publishGameToRTDB(weekNumber, game) {
    try {
        const result = await realtimePublisher.publishGameUpdate(
            weekNumber, 
            game.gameId, 
            game
        );
        
        if (!result.success) {
            throw new Error(result.error || 'Publish failed');
        }
        
        logger.info(`📡 Published game ${game.gameId}: ${game.awayTeam} @ ${game.homeTeam} (${game.status})`);
        return result;
        
    } catch (error) {
        logger.error(`Failed to publish game ${game.gameId}:`, error);
        throw error;
    }
}

/**
 * Update week metadata in RTDB
 */
async function updateWeekMetadata(weekNumber, metadata) {
    try {
        const metaPath = `nerdfootball/live/2025/week_${weekNumber}/metadata`;
        const metaRef = rtdb.ref(metaPath);
        
        await metaRef.update(metadata);
        
        logger.info(`📊 Updated metadata for week ${weekNumber}`);
        
    } catch (error) {
        logger.error('Error updating metadata:', error);
        // Don't throw - metadata update failure shouldn't stop sync
    }
}

/**
 * Get current NFL week number
 */
function getCurrentNflWeek() {
    const seasonStart = new Date('2025-09-04'); // Week 1 starts Sept 4, 2025
    const now = new Date();
    const diffTime = Math.abs(now - seasonStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.ceil(diffDays / 7);
    return Math.min(Math.max(1, weekNumber), 18);
}