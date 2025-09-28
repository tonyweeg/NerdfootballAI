// DIAMOND LEVEL: Firebase Function for Automatic Survivor Cache Updates
// Triggers when ESPN game data changes to keep cache fresh

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// Trigger when ESPN game data is updated
exports.updateSurvivorCacheOnGameFinish = onDocumentUpdated({
    document: 'espn-games/{gameId}',
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60
}, async (event) => {
    const { before, after } = event.data;
    const gameId = event.params.gameId;
    
    // Check if game status changed to final
    const beforeStatus = before.data()?.status;
    const afterStatus = after.data()?.status;
    
    if (beforeStatus !== 'final' && (afterStatus === 'final' || afterStatus === 'Final' || afterStatus === 'FINAL')) {
        console.log(`🏈 Game ${gameId} finished - invalidating survivor caches`);
        
        try {
            await invalidateRelevantCaches(gameId, after.data());
        } catch (error) {
            console.error('❌ Cache invalidation error:', error);
        }
    }
});

// Scheduled function to refresh cache every 5 minutes during game days
exports.scheduledSurvivorCacheRefresh = onSchedule({
    schedule: 'every 5 minutes',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120
}, async (event) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 4 = Thursday, 1 = Monday
    const hour = now.getHours();
    
    // Only run during game days and times
    const isGameDay = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 4; // Sun, Mon, Thu
    const isGameTime = hour >= 10 && hour <= 23; // 10 AM to 11 PM
    
    if (isGameDay && isGameTime) {
        console.log('🔄 Scheduled survivor cache refresh');
        await refreshActiveCaches();
    }
});

// Invalidate caches that might be affected by a game finishing
async function invalidateRelevantCaches(gameId, gameData) {
    try {
        // Find all survivor caches that might track this game
        const cacheQuery = await db.collectionGroup('results')
            .where('gamesTracked.' + gameId, '!=', null)
            .get();
        
        const batch = db.batch();
        let invalidatedCount = 0;
        
        cacheQuery.docs.forEach(doc => {
            console.log(`🗑️  Invalidating cache: ${doc.ref.path}`);
            batch.delete(doc.ref);
            invalidatedCount++;
        });
        
        if (invalidatedCount > 0) {
            await batch.commit();
            console.log(`✅ Invalidated ${invalidatedCount} survivor caches for game ${gameId}`);

            // Trigger cache warming for active pools
            await warmCachesForActivePools();
        } else {
            console.log(`ℹ️  No caches found tracking game ${gameId}`);
        }

        // SUPER-SURVIVOR: Also clear the HTML display cache when games finish
        try {
            const superSurvivorCachePath = 'artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-survivor-display';
            await db.doc(superSurvivorCachePath).delete();
            console.log(`🔥 SUPER-SURVIVOR: Cleared HTML cache for game ${gameId} completion`);
        } catch (error) {
            console.log(`ℹ️  SUPER-SURVIVOR: No HTML cache to clear (${error.message})`);
        }
        
    } catch (error) {
        console.error('❌ Cache invalidation failed:', error);
        throw error;
    }
}

// Warm caches for active pools after invalidation
async function warmCachesForActivePools() {
    try {
        // Get active pools (could be configurable)
        const activePools = ['nerduniverse-2025']; // Add more pools as needed
        const currentWeek = getCurrentNFLWeek();
        
        for (const poolId of activePools) {
            try {
                console.log(`🔥 Warming cache for pool ${poolId}, week ${currentWeek}`);
                await computeAndCacheSurvivorResults(poolId, currentWeek);
            } catch (error) {
                console.error(`❌ Cache warming failed for ${poolId}:`, error);
            }
        }
    } catch (error) {
        console.error('❌ Cache warming error:', error);
    }
}

// Refresh active caches during game time
async function refreshActiveCaches() {
    try {
        // Find all caches from the last 6 hours
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        
        const recentCaches = await db.collectionGroup('results')
            .where('generatedAt', '>=', sixHoursAgo)
            .get();
        
        console.log(`🔍 Found ${recentCaches.size} recent caches to check`);
        
        for (const doc of recentCaches.docs) {
            const cacheData = doc.data();
            
            // Check if cache has games that might need updating
            const hasActiveGames = Object.values(cacheData.gamesTracked || {})
                .some(game => game.status !== 'final');
            
            if (hasActiveGames) {
                console.log(`🔄 Refreshing stale cache: ${doc.ref.path}`);
                // Delete cache - it will be regenerated on next request
                await doc.ref.delete();
            }
        }
        
    } catch (error) {
        console.error('❌ Scheduled refresh error:', error);
    }
}

// Compute and cache survivor results (backend version)
async function computeAndCacheSurvivorResults(poolId, week) {
    try {
        const startTime = Date.now();
        
        // 1. Get pool members
        const membersDoc = await db.doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`).get();
        if (!membersDoc.exists) {
            throw new Error(`Pool ${poolId} not found`);
        }
        const members = membersDoc.data();
        
        // 2. Get elimination statuses
        const statusDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_status/status`).get();
        const allStatuses = statusDoc.exists ? statusDoc.data() : {};
        
        // 3. Get user picks (batch read)
        const userIds = Object.keys(members);
        const pickPromises = userIds.map(uid => 
            db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`).get()
        );
        const pickDocs = await Promise.all(pickPromises);
        
        // 4. Get ESPN game data (would need ESPN API integration on backend)
        // For now, just create cache structure with current data
        
        const results = {};
        const stats = { totalPlayers: 0, activePlayers: 0, eliminatedPlayers: 0, pendingPlayers: 0 };
        
        userIds.forEach((uid, index) => {
            const member = members[uid];
            const pickDoc = pickDocs[index];
            const userPicks = pickDoc.exists ? pickDoc.data().picks || {} : {};
            const userPick = userPicks[week];
            const status = allStatuses[uid];
            
            // Build result (simplified for backend)
            if (status?.eliminated) {
                results[uid] = {
                    uid,
                    displayName: member.displayName || member.email,
                    status: 'eliminated',
                    eliminatedWeek: status.eliminatedWeek,
                    eliminationReason: status.eliminationReason,
                    currentPick: 'Eliminated',
                    isEliminated: true
                };
                stats.eliminatedPlayers++;
            } else {
                results[uid] = {
                    uid,
                    displayName: member.displayName || member.email,
                    status: 'pending', // Would need ESPN integration for real status
                    reason: 'Cache computation in progress',
                    currentPick: userPick?.team || 'No pick',
                    gameId: userPick?.gameId,
                    isEliminated: false
                };
                stats.activePlayers++;
            }
            
            stats.totalPlayers++;
        });
        
        // 5. Store in cache
        const cacheDoc = {
            week,
            poolId,
            generatedAt: FieldValue.serverTimestamp(),
            lastGameUpdate: FieldValue.serverTimestamp(),
            cacheVersion: `backend-${Date.now()}`,
            gamesTracked: {}, // Would be populated with ESPN data
            results,
            stats,
            metadata: {
                computationTimeMs: Date.now() - startTime,
                apiCalls: { firestore: userIds.length + 2, espn: 0 },
                generatedBy: 'firebase-function'
            }
        };
        
        await db.doc(`survivor-cache/${poolId}/results/week${week}`).set(cacheDoc);
        console.log(`✅ Cache warmed for ${poolId} week ${week} in ${Date.now() - startTime}ms`);
        
    } catch (error) {
        console.error(`❌ Cache computation failed for ${poolId}:`, error);
        throw error;
    }
}

// Simple NFL week calculation
function getCurrentNFLWeek() {
    // Week 1 starts September 4, 2025 (simplified calculation)
    const week1Start = new Date('2025-09-04');
    const now = new Date();
    const diffInMs = now.getTime() - week1Start.getTime();
    const diffInWeeks = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000));
    
    return Math.max(1, Math.min(18, diffInWeeks + 1));
}

// Manual cache refresh trigger (can be called via HTTP)
exports.refreshSurvivorCache = onRequest({
    cors: true,
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 120
}, async (req, res) => {
    try {
        const poolId = req.query.poolId || 'nerduniverse-2025';
        const week = parseInt(req.query.week) || getCurrentNFLWeek();
        const force = req.query.force === 'true';
        
        if (force) {
            // Delete existing cache first
            await db.doc(`survivor-cache/${poolId}/results/week${week}`).delete();
            console.log(`🗑️  Forced cache deletion for ${poolId} week ${week}`);
        }
        
        await computeAndCacheSurvivorResults(poolId, week);
        
        res.json({
            success: true,
            message: `Cache refreshed for ${poolId} week ${week}`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Manual refresh error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});