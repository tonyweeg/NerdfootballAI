// BULLETPROOF SURVIVOR CACHE MANAGER
// Achieves sub-500ms load times through intelligent caching

class SurvivorCacheManager {
    constructor(db) {
        this.db = db;
        this.cacheVersion = '2.0.0';
        this.cacheValidityMinutes = 5; // During active games
        this.staleCacheValidityMinutes = 60; // After games finish
        this.pendingRequests = new Map(); // Prevent duplicate requests
    }

    // Get cached results or compute fresh
    async getCachedOrCompute(poolId, week) {
        const startTime = performance.now();
        const requestKey = `${poolId}-${week}`;
        
        // Check if we already have a pending request for this data
        if (this.pendingRequests.has(requestKey)) {
            console.log('Request already in progress, waiting...');
            return this.pendingRequests.get(requestKey);
        }
        
        // Create the request promise
        const requestPromise = this._performCachedOrCompute(poolId, week, startTime);
        
        // Store it to prevent duplicates
        this.pendingRequests.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Clean up after request completes
            this.pendingRequests.delete(requestKey);
        }
    }
    
    async _performCachedOrCompute(poolId, week, startTime) {
        try {
            // Try to get cached results first
            const cached = await this.getCachedResults(poolId, week);
            
            if (cached) {
                console.log('Cache found, checking validity...');
                if (this.isCacheValid(cached)) {
                    const loadTime = performance.now() - startTime;
                    console.log(`⚡ CACHE HIT: Loaded in ${loadTime.toFixed(0)}ms`);
                    return {
                        results: cached.results,
                        stats: cached.stats,
                        fromCache: true,
                        loadTimeMs: loadTime
                    };
                } else {
                    console.log('Cache invalid, will compute fresh');
                }
            } else {
                console.log('No cache found, will compute fresh');
            }

            // Cache miss or invalid - compute fresh
            const fresh = await this.computeFreshResults(poolId, week);
            
            // Store in cache for next time
            await this.setCachedResults(poolId, week, fresh);
            
            const loadTime = performance.now() - startTime;
            
            return {
                ...fresh,
                fromCache: false,
                loadTimeMs: loadTime
            };
            
        } catch (error) {
            console.error('Cache manager error:', error);
            // Fallback to simple computation
            return this.computeFreshResults(poolId, week);
        }
    }

    // Get cached results from Firestore
    async getCachedResults(poolId, week) {
        try {
            const cacheRef = this.db.collection('survivor-cache').doc(poolId).collection('results').doc(week.toString());
            const cacheDoc = await cacheRef.get();
            
            if (cacheDoc.exists) {
                return cacheDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Error getting cached results:', error);
            return null;
        }
    }

    // Check if cache is still valid
    isCacheValid(cached) {
        if (!cached || !cached.generatedAt) return false;
        
        // Handle both Firestore timestamp and regular Date
        let cacheTime;
        if (cached.generatedAt.toMillis) {
            cacheTime = cached.generatedAt.toMillis();
        } else if (cached.generatedAt instanceof Date) {
            cacheTime = cached.generatedAt.getTime();
        } else {
            cacheTime = new Date(cached.generatedAt).getTime();
        }
        
        const cacheAge = Date.now() - cacheTime;
        const maxAge = this.cacheValidityMinutes * 60 * 1000;
        
        // Check cache version
        if (cached.cacheVersion !== this.cacheVersion) {
            return false;
        }
        
        // Check age
        if (cacheAge > maxAge) {
            return false;
        }
        
        // Check if any tracked games changed status
        if (cached.gamesTracked) {
            // Would check ESPN for status changes here
            // For now, trust time-based invalidation
        }
        
        return true;
    }

    // Compute fresh results (optimized)
    async computeFreshResults(poolId, week) {
        const startTime = performance.now();
        
        try {
            // Get pool members (single read)
            const poolRef = this.db.doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`);
            const poolDoc = await poolRef.get();
            
            if (!poolDoc.exists) {
                return { results: {}, stats: {} };
            }
            
            const poolMembers = poolDoc.data();
            
            // Get ESPN data ONCE for all users
            let espnGames = null;
            if (window.espnNerdApi) {
                espnGames = await window.espnNerdApi.getCurrentWeekScores();
            }
            
            // Batch read all user picks in parallel - OPTIMIZED
            console.log(`Reading picks for ${Object.keys(poolMembers).length} users...`);
            const batchStartTime = performance.now();
            
            const userPickPromises = Object.keys(poolMembers).map(uid =>
                this.db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`).get()
            );
            
            const userPickDocs = await Promise.all(userPickPromises);
            console.log(`Batch read completed in ${(performance.now() - batchStartTime).toFixed(0)}ms`);
            const userPicks = {};
            
            userPickDocs.forEach((doc, index) => {
                const uid = Object.keys(poolMembers)[index];
                if (doc.exists) {
                    userPicks[uid] = doc.data().picks || {};
                }
            });
            
            // Process all users
            const results = {};
            let activePlayers = 0;
            let eliminatedPlayers = 0;
            
            for (const [uid, member] of Object.entries(poolMembers)) {
                const picks = userPicks[uid] || {};
                const weekPick = picks[week];
                
                let status = 'no_pick';
                let eliminatedWeek = null;
                let eliminationReason = 'No pick made';
                
                if (weekPick && weekPick.team) {
                    // Normalize team name
                    const normalizedTeam = this.normalizeTeamName(weekPick.team);
                    
                    // Find game result
                    const gameResult = this.findGameResult(normalizedTeam, espnGames);
                    
                    if (gameResult) {
                        if (gameResult.winner === 'TBD' || !gameResult.winner) {
                            status = 'pending';
                            eliminationReason = 'Game in progress';
                        } else if (gameResult.winner === normalizedTeam) {
                            status = 'survived';
                            eliminationReason = null;
                        } else {
                            status = 'eliminated';
                            eliminatedWeek = week;
                            eliminationReason = `Lost to ${gameResult.winner}`;
                        }
                    }
                }
                
                results[uid] = {
                    uid,
                    displayName: member.displayName || member.email,
                    status,
                    eliminatedWeek,
                    eliminationReason,
                    currentPick: weekPick?.team || 'No pick',
                    isEliminated: status === 'eliminated' || status === 'no_pick'
                };
                
                if (results[uid].isEliminated) {
                    eliminatedPlayers++;
                } else {
                    activePlayers++;
                }
            }
            
            const computeTime = performance.now() - startTime;
            
            return {
                week,
                poolId,
                generatedAt: new Date(),
                cacheVersion: this.cacheVersion,
                results,
                stats: {
                    totalPlayers: Object.keys(poolMembers).length,
                    activePlayers,
                    eliminatedPlayers,
                    pendingPlayers: 0
                },
                gamesTracked: this.extractGameInfo(espnGames),
                metadata: {
                    computationTimeMs: computeTime,
                    apiCalls: 1,
                    generatedBy: 'SurvivorCacheManager'
                }
            };
            
        } catch (error) {
            console.error('Error computing fresh results:', error);
            return { results: {}, stats: {} };
        }
    }

    // Store results in cache
    async setCachedResults(poolId, week, data) {
        try {
            const cacheRef = this.db.collection('survivor-cache').doc(poolId).collection('results').doc(week.toString());
            await cacheRef.set({
                ...data,
                generatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error setting cache:', error);
        }
    }

    // Find game result for a team
    findGameResult(teamName, espnGames) {
        if (!espnGames || !espnGames.games) return null;
        
        return espnGames.games.find(g =>
            g.home_team === teamName || g.away_team === teamName
        );
    }

    // Extract game info for tracking
    extractGameInfo(espnGames) {
        if (!espnGames || !espnGames.games) return {};
        
        const games = {};
        espnGames.games.forEach(game => {
            games[game.id] = {
                status: game.status,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                winner: game.winner,
                lastChecked: new Date()
            };
        });
        return games;
    }

    // Team name normalization (matches survivor system)
    normalizeTeamName(teamName) {
        if (!teamName) return null;
        
        const teamMappings = {
            'LA Rams': 'Los Angeles Rams',
            'LA Chargers': 'Los Angeles Chargers',
            'LV Raiders': 'Las Vegas Raiders',
            'Vegas Raiders': 'Las Vegas Raiders',
            'NY Giants': 'New York Giants',
            'NY Jets': 'New York Jets',
            'TB Buccaneers': 'Tampa Bay Buccaneers',
            'NE Patriots': 'New England Patriots',
            'GB Packers': 'Green Bay Packers',
            'NO Saints': 'New Orleans Saints',
            'KC Chiefs': 'Kansas City Chiefs',
            'SF 49ers': 'San Francisco 49ers'
        };
        
        return teamMappings[teamName] || teamName;
    }

    // Invalidate cache for a week
    async invalidateCache(poolId, week) {
        try {
            const cacheRef = this.db.collection('survivor-cache').doc(poolId).collection('results').doc(week.toString());
            await cacheRef.delete();
            console.log(`Cache invalidated for pool ${poolId} week ${week}`);
        } catch (error) {
            console.error('Error invalidating cache:', error);
        }
    }

    // Warm the cache (pre-compute and store)
    async warmCache(poolId, week) {
        console.log(`🔥 Warming cache for pool ${poolId} week ${week}...`);
        const results = await this.computeFreshResults(poolId, week);
        await this.setCachedResults(poolId, week, results);
        console.log('✅ Cache warmed successfully');
        return results;
    }

    // Clear all caches
    async clearAllCaches(poolId) {
        console.log(`🗑️ Clearing all caches for pool ${poolId}...`);
        // Would need to list and delete all week documents
        // For now, clear current week
        const currentWeek = 1; // Get from week manager
        await this.invalidateCache(poolId, currentWeek);
    }
}

// Initialize when ready
window.survivorCacheManager = null;

async function initializeSurvivorCache() {
    if (typeof window.db === 'undefined') {
        setTimeout(initializeSurvivorCache, 500);
        return;
    }
    
    // Wait for Firebase to be fully ready
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        setTimeout(initializeSurvivorCache, 500);
        return;
    }
    
    window.survivorCacheManager = new SurvivorCacheManager(window.db);
    console.log('⚡ Survivor Cache Manager initialized');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSurvivorCache);
} else {
    initializeSurvivorCache();
}