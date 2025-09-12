// ESPN FIREBASE CACHE MANAGER - Sub-100ms Performance
// Eliminates 14+ second ESPN API timeout disasters
// Single Firebase document structure for instant cache reads

class ESPNCacheManager {
    constructor(db) {
        this.db = db;
        this.cacheDocPath = 'cache/espn_current_data';
        this.cacheMaxAge = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        
        // Current season info
        this.currentSeason = 2025;
        this.seasonStartWeek = 1; // Week 1 starts Sept 4-10, 2025
        this.totalWeeks = 18;
        
        // Cache structure template
        this.emptyCacheStructure = {
            lastUpdated: null,
            currentWeek: 1,
            currentSeason: this.currentSeason,
            allGamesData: {}, // Format: { "1": [...games], "2": [...games] }
            teamResults: {}, // Format: { "Patriots_1": {winner: "Patriots", homeScore: 24, ...} }
            updateInProgress: false,
            version: "1.0"
        };
    }

    // LIGHTNING FAST: Get cached team result (target <10ms)
    async getCachedTeamResult(teamName, weekNumber) {
        try {
            const startTime = Date.now();
            
            // Single Firebase read for entire cache
            const cacheDoc = await getDoc(doc(this.db, this.cacheDocPath));
            
            if (!cacheDoc.exists()) {
                console.warn('⚡ ESPN Cache: No cache document found');
                return null;
            }

            const cacheData = cacheDoc.data();
            const normalizedTeam = this.normalizeTeamName(teamName);
            const cacheKey = `${normalizedTeam}_${weekNumber}`;
            
            const result = cacheData.teamResults[cacheKey] || null;
            const readTime = Date.now() - startTime;
            
            if (result) {
                console.log(`⚡ ESPN Cache HIT: ${cacheKey} (${readTime}ms)`);
            } else {
                console.log(`⚡ ESPN Cache MISS: ${cacheKey} (${readTime}ms)`);
            }
            
            return result;
            
        } catch (error) {
            console.error('⚡ ESPN Cache read error:', error);
            return null;
        }
    }

    // Check if cache is fresh (within max age)
    async isCacheFresh() {
        try {
            const cacheDoc = await getDoc(doc(this.db, this.cacheDocPath));
            if (!cacheDoc.exists()) return false;
            
            const cacheData = cacheDoc.data();
            if (!cacheData.lastUpdated) return false;
            
            const cacheAge = Date.now() - cacheData.lastUpdated;
            return cacheAge < this.cacheMaxAge;
            
        } catch (error) {
            console.error('⚡ Cache freshness check error:', error);
            return false;
        }
    }

    // Get cache status for admin dashboard
    async getCacheStatus() {
        try {
            const cacheDoc = await getDoc(doc(this.db, this.cacheDocPath));
            
            if (!cacheDoc.exists()) {
                return {
                    exists: false,
                    lastUpdated: null,
                    currentWeek: null,
                    totalResults: 0,
                    isFresh: false,
                    ageMinutes: null
                };
            }
            
            const cacheData = cacheDoc.data();
            const ageMs = cacheData.lastUpdated ? (Date.now() - cacheData.lastUpdated) : null;
            const ageMinutes = ageMs ? Math.floor(ageMs / (1000 * 60)) : null;
            
            return {
                exists: true,
                lastUpdated: new Date(cacheData.lastUpdated).toLocaleString(),
                currentWeek: cacheData.currentWeek,
                totalResults: Object.keys(cacheData.teamResults || {}).length,
                isFresh: ageMs < this.cacheMaxAge,
                ageMinutes: ageMinutes,
                updateInProgress: cacheData.updateInProgress || false
            };
            
        } catch (error) {
            console.error('⚡ Cache status error:', error);
            return { exists: false, error: error.message };
        }
    }

    // UPDATE CACHE: Fetch from ESPN and store in Firebase (background operation)
    async updateCache(weekNumber = null, force = false) {
        try {
            console.log('⚡ ESPN Cache: Starting cache update...');
            const startTime = Date.now();
            
            // Check if update already in progress
            const cacheDoc = await getDoc(doc(this.db, this.cacheDocPath));
            if (cacheDoc.exists() && cacheDoc.data().updateInProgress && !force) {
                console.log('⚡ ESPN Cache: Update already in progress, skipping');
                return { success: false, reason: 'Update already in progress' };
            }
            
            // Mark update as in progress
            await setDoc(doc(this.db, this.cacheDocPath), { updateInProgress: true }, { merge: true });
            
            // Get current cache or create empty structure
            const currentCache = cacheDoc.exists() ? cacheDoc.data() : { ...this.emptyCacheStructure };
            
            // Determine which week to update
            const targetWeek = weekNumber || this.getCurrentWeek();
            console.log(`⚡ ESPN Cache: Updating week ${targetWeek}`);
            
            // Fetch ESPN data if available
            if (typeof window.espnNerdApi !== 'undefined') {
                const espnGames = await window.espnNerdApi.getWeekGames(targetWeek);
                
                if (espnGames && Array.isArray(espnGames)) {
                    // Update games data
                    currentCache.allGamesData[targetWeek] = espnGames;
                    
                    // Process each game to extract team results
                    espnGames.forEach(game => {
                        if (game.home_team && game.away_team) {
                            // Cache result for home team
                            const homeKey = `${this.normalizeTeamName(game.home_team)}_${targetWeek}`;
                            currentCache.teamResults[homeKey] = {
                                winner: game.winner || 'TBD',
                                homeScore: game.home_score || 0,
                                awayScore: game.away_score || 0,
                                homeTeam: game.home_team,
                                awayTeam: game.away_team,
                                status: game.status || 'scheduled',
                                week: targetWeek,
                                lastUpdated: Date.now()
                            };
                            
                            // Cache result for away team (same data)
                            const awayKey = `${this.normalizeTeamName(game.away_team)}_${targetWeek}`;
                            currentCache.teamResults[awayKey] = { ...currentCache.teamResults[homeKey] };
                        }
                    });
                    
                    console.log(`⚡ ESPN Cache: Processed ${espnGames.length} games for week ${targetWeek}`);
                }
            }
            
            // Update cache metadata
            currentCache.lastUpdated = Date.now();
            currentCache.currentWeek = targetWeek;
            currentCache.updateInProgress = false;
            
            // Save to Firebase
            await setDoc(doc(this.db, this.cacheDocPath), currentCache);
            
            const updateTime = Date.now() - startTime;
            console.log(`⚡ ESPN Cache: Update completed (${updateTime}ms)`);
            
            return { 
                success: true, 
                week: targetWeek,
                gamesProcessed: espnGames?.length || 0,
                updateTimeMs: updateTime
            };
            
        } catch (error) {
            console.error('⚡ ESPN Cache update error:', error);
            
            // Clear update lock on error
            try {
                await setDoc(doc(this.db, this.cacheDocPath), { updateInProgress: false }, { merge: true });
            } catch (unlockError) {
                console.error('⚡ ESPN Cache: Failed to clear update lock:', unlockError);
            }
            
            return { success: false, error: error.message };
        }
    }

    // Get current NFL week based on date
    getCurrentWeek() {
        // Week 1 starts September 4, 2025
        // 18 weeks total, ending January 7, 2026
        const now = new Date();
        const seasonStart = new Date('2025-09-04'); // Sept 4, 2025
        const weekMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        if (now < seasonStart) return 1; // Pre-season
        
        const weeksSinceStart = Math.floor((now - seasonStart) / weekMs) + 1;
        return Math.min(Math.max(weeksSinceStart, 1), this.totalWeeks);
    }

    // Team name normalization (matches ESPN API and SimpleSurvivorSystem)
    normalizeTeamName(teamName) {
        if (!teamName) return null;
        
        // Team name mapping for consistency with ESPN data
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

    // Initialize empty cache (for first-time setup)
    async initializeCache() {
        try {
            const cacheDoc = await getDoc(doc(this.db, this.cacheDocPath));
            
            if (!cacheDoc.exists()) {
                const initialCache = {
                    ...this.emptyCacheStructure,
                    lastUpdated: Date.now(),
                    currentWeek: this.getCurrentWeek()
                };
                
                await setDoc(doc(this.db, this.cacheDocPath), initialCache);
                console.log('⚡ ESPN Cache: Initialized empty cache structure');
                return { success: true, initialized: true };
            }
            
            return { success: true, initialized: false };
            
        } catch (error) {
            console.error('⚡ ESPN Cache initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    // ADMIN HELPER: Clear entire cache (for testing or reset)
    async clearCache() {
        try {
            await setDoc(doc(this.db, this.cacheDocPath), this.emptyCacheStructure);
            console.log('⚡ ESPN Cache: Cache cleared');
            return { success: true };
        } catch (error) {
            console.error('⚡ ESPN Cache clear error:', error);
            return { success: false, error: error.message };
        }
    }

    // ADMIN HELPER: Manually set team result (for corrections)
    async setTeamResult(teamName, weekNumber, winner, homeTeam, awayTeam, homeScore, awayScore, status = 'final') {
        try {
            const cacheDoc = await getDoc(doc(this.db, this.cacheDocPath));
            const currentCache = cacheDoc.exists() ? cacheDoc.data() : { ...this.emptyCacheStructure };
            
            const normalizedTeam = this.normalizeTeamName(teamName);
            const cacheKey = `${normalizedTeam}_${weekNumber}`;
            
            currentCache.teamResults[cacheKey] = {
                winner,
                homeScore,
                awayScore,
                homeTeam,
                awayTeam,
                status,
                week: weekNumber,
                lastUpdated: Date.now(),
                manualOverride: true
            };
            
            await setDoc(doc(this.db, this.cacheDocPath), currentCache);
            console.log(`⚡ ESPN Cache: Manually set result for ${cacheKey}`);
            
            return { success: true };
            
        } catch (error) {
            console.error('⚡ ESPN Cache manual set error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Global initialization
window.espnCacheManager = null;

async function initializeESPNCache() {
    if (typeof window.db === 'undefined') {
        setTimeout(initializeESPNCache, 500);
        return;
    }

    window.espnCacheManager = new ESPNCacheManager(window.db);
    
    // Initialize cache structure if it doesn't exist
    await window.espnCacheManager.initializeCache();
    
    console.log('⚡ ESPN Cache Manager: Initialized and ready');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeESPNCache);
} else {
    initializeESPNCache();
}

// ===== ADMIN CONSOLE COMMANDS =====
// These can be run in browser console for cache management

window.updateESPNCache = async function(weekNumber = null) {
    if (!window.espnCacheManager) {
        console.error('ESPN Cache Manager not initialized');
        return;
    }
    
    console.log('🚀 Starting ESPN cache update...');
    const result = await window.espnCacheManager.updateCache(weekNumber);
    
    if (result.success) {
        console.log(`✅ Cache updated successfully! Week ${result.week}, ${result.gamesProcessed} games processed in ${result.updateTimeMs}ms`);
    } else {
        console.error(`❌ Cache update failed: ${result.error || result.reason}`);
    }
    
    return result;
};

window.getESPNCacheStatus = async function() {
    if (!window.espnCacheManager) {
        console.error('ESPN Cache Manager not initialized');
        return;
    }
    
    const status = await window.espnCacheManager.getCacheStatus();
    console.log('📊 ESPN Cache Status:', status);
    return status;
};

window.clearESPNCache = async function() {
    if (!window.espnCacheManager) {
        console.error('ESPN Cache Manager not initialized');
        return;
    }
    
    console.log('🗑️ Clearing ESPN cache...');
    const result = await window.espnCacheManager.clearCache();
    
    if (result.success) {
        console.log('✅ Cache cleared successfully');
    } else {
        console.error(`❌ Cache clear failed: ${result.error}`);
    }
    
    return result;
};

window.testCachePerformance = async function(teamName = 'Patriots', weekNumber = 1) {
    if (!window.espnCacheManager) {
        console.error('ESPN Cache Manager not initialized');
        return;
    }
    
    console.log(`⏱️ Testing cache performance for ${teamName} Week ${weekNumber}...`);
    
    const startTime = Date.now();
    const result = await window.espnCacheManager.getCachedTeamResult(teamName, weekNumber);
    const endTime = Date.now();
    
    console.log(`⚡ Cache read took ${endTime - startTime}ms`);
    console.log('Result:', result);
    
    return { result, timeMs: endTime - startTime };
};

// Quick setup command for first-time cache initialization
window.setupESPNCache = async function() {
    console.log('🏗️ Setting up ESPN cache for the first time...');
    
    // Check status
    const status = await window.getESPNCacheStatus();
    
    if (!status.exists) {
        console.log('📝 Initializing cache structure...');
        await window.espnCacheManager.initializeCache();
    }
    
    // Update current week
    console.log('📡 Updating cache with current week data...');
    const updateResult = await window.updateESPNCache();
    
    if (updateResult.success) {
        console.log('✅ ESPN cache setup complete!');
        console.log('💡 Use window.getESPNCacheStatus() to check cache status');
        console.log('💡 Use window.updateESPNCache(weekNumber) to update specific weeks');
        console.log('💡 Use window.testCachePerformance() to test read speed');
    } else {
        console.error('❌ ESPN cache setup failed');
    }
    
    return updateResult;
};