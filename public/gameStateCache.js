// 💎 Diamond-Level Game-State-Aware Caching System 🚀✨
// Eliminates unnecessary server calls based on intelligent game state detection

class GameStateCache {
    constructor() {
        this.cache = new Map();
        this.memoryCache = new Map();
        this.gameStates = new Map(); // Track each game's completion state
        this.weekStates = new Map(); // Track each week's overall state
        this.lastCacheUpdate = new Map();
        
        // Cache keys
        this.KEYS = {
            SCHEDULE: 'schedule_week_',
            USERS: 'users_data',
            PICKS: 'picks_week_',
            RESULTS: 'results_week_',
            GRID_DATA: 'grid_week_',
            SURVIVOR_DATA: 'survivor_week_'
        };
        
        // Cache duration constants (in milliseconds)
        this.CACHE_DURATION = {
            PRE_GAME: 24 * 60 * 60 * 1000, // 24 hours - games haven't started
            IN_PROGRESS: 5 * 60 * 1000,    // 5 minutes - games in progress
            COMPLETED: Infinity,            // Forever - game is over
            WEEK_COMPLETE: Infinity         // Forever - entire week is over
        };
    }

    // 🎯 Intelligent Game State Detection
    getGameState(game) {
        const now = new Date();
        // Handle both raw JSON format (dt) and processed format (kickoff)
        const gameTime = game.kickoff || game.dt;

        // 🔧 CRITICAL FIX: ESPN timestamps with "Z" are actually Eastern Time (not UTC)
        let kickoff;
        if (window.easternTimeParser) {
            kickoff = window.easternTimeParser.parseESPNTimestamp(gameTime);
        } else {
            // ESPN USES EST AS ZULU! "Z" = Eastern Time, NOT UTC!
            // ESPN "2025-09-18T20:15:00Z" = 8:15 PM EASTERN (ESPN's "Zulu" = Eastern)
            const cleanTime = gameTime.replace('Z', '');
            const easternTime = new Date(cleanTime);
            const year = easternTime.getFullYear();
            const month = easternTime.getMonth();
            const day = easternTime.getDate();
            const hours = easternTime.getHours();
            const minutes = easternTime.getMinutes();
            const seconds = easternTime.getSeconds();

            // Determine DST: Sept 18 is EDT (UTC-4)
            const gameDate = new Date(year, month, day);
            const isDST = gameDate >= new Date(year, 2, 9) && gameDate < new Date(year, 10, 2);
            const offsetHours = isDST ? 4 : 5; // EDT = UTC-4, EST = UTC-5

            kickoff = new Date(Date.UTC(year, month, day, hours + offsetHours, minutes, seconds));

            console.log(`⏰ GameState ESPN ZULU=EST: ${gameTime} = ${hours}:${String(minutes).padStart(2,'0')} EASTERN → UTC ${kickoff.toISOString()}`);
        }

        if (now < kickoff) {
            return 'PRE_GAME';
        } else if (game.winner && game.winner !== 'TBD') {
            return 'COMPLETED';
        } else {
            return 'IN_PROGRESS';
        }
    }

    // 📊 Week State Analysis - Diamond Level Logic!
    analyzeWeekState(weekNumber, games) {
        if (!games || games.length === 0) return 'UNKNOWN';
        
        const now = new Date();
        const gameStates = games.map(game => this.getGameState(game));
        
        // If no games have started yet - PURE STATIC DATA! 🔥
        if (gameStates.every(state => state === 'PRE_GAME')) {
            this.weekStates.set(weekNumber, 'PRE_GAME');
            return 'PRE_GAME';
        }
        
        // If all games are complete - PERMANENT CACHE! 💎
        if (gameStates.every(state => state === 'COMPLETED')) {
            this.weekStates.set(weekNumber, 'COMPLETED');
            return 'COMPLETED';
        }
        
        // Mixed state - some games done, some pending
        this.weekStates.set(weekNumber, 'IN_PROGRESS');
        return 'IN_PROGRESS';
    }

    // 🚀 Smart Cache Key Generation
    getCacheKey(type, identifier, subKey = '') {
        return `${type}${identifier}${subKey ? '_' + subKey : ''}`;
    }

    // 💎 Intelligent Cache Duration Based on Game State
    getCacheDuration(weekNumber, gameState = null) {
        const weekState = this.weekStates.get(weekNumber);
        
        if (weekState === 'PRE_GAME') {
            return this.CACHE_DURATION.PRE_GAME; // 24 hours - nothing changing!
        } else if (weekState === 'COMPLETED') {
            return this.CACHE_DURATION.COMPLETED; // Forever - week is done!
        } else if (gameState === 'COMPLETED') {
            return this.CACHE_DURATION.COMPLETED; // Forever - specific data is final
        } else {
            return this.CACHE_DURATION.IN_PROGRESS; // 5 minutes - active monitoring
        }
    }

    // 🎯 Check if Cache is Valid
    isCacheValid(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (!cached) return false;
        
        const now = Date.now();
        const age = now - cached.timestamp;
        
        // For completed games/weeks, cache never expires
        if (cached.duration === Infinity) return true;
        
        return age < cached.duration;
    }

    // 💾 Store Data with Intelligent Expiration
    set(cacheKey, data, weekNumber, gameState = null) {
        const duration = this.getCacheDuration(weekNumber, gameState);
        
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            duration,
            weekNumber,
            gameState
        });
        
        // Also store in memory for ultra-fast access
        this.memoryCache.set(cacheKey, data);
    }

    // ⚡ Get Data with State-Aware Validation
    get(cacheKey) {
        if (!this.isCacheValid(cacheKey)) {
            this.cache.delete(cacheKey);
            this.memoryCache.delete(cacheKey);
            return null;
        }
        
        // Memory cache is fastest
        return this.memoryCache.get(cacheKey);
    }

    // 🔥 Schedule Caching - Perfect for Static Pre-Game Data
    async cacheSchedule(weekNumber, fetchFunction) {
        const cacheKey = this.getCacheKey(this.KEYS.SCHEDULE, weekNumber);
        
        // Check cache first
        let cached = this.get(cacheKey);
        if (cached) {
            console.log(`💎 Schedule Week ${weekNumber} served from cache! No server call needed! 🚀`);
            return cached;
        }
        
        // Fetch and analyze
        const data = await fetchFunction();
        const weekState = this.analyzeWeekState(weekNumber, data);
        
        // Cache with appropriate duration
        this.set(cacheKey, data, weekNumber, weekState);
        
        console.log(`💎 Schedule Week ${weekNumber} cached with state: ${weekState} 🔥`);
        return data;
    }

    // 📊 Grid Data Caching - Ultimate Performance!
    async cacheGridData(weekNumber, fetchFunction) {
        const cacheKey = this.getCacheKey(this.KEYS.GRID_DATA, weekNumber);
        
        // Check cache first
        let cached = this.get(cacheKey);
        if (cached) {
            console.log(`💎 Grid Week ${weekNumber} served from memory! Zero server calls! ⚡`);
            return cached;
        }
        
        // Fetch and cache
        const data = await fetchFunction();
        const weekState = this.weekStates.get(weekNumber) || 'IN_PROGRESS';
        
        this.set(cacheKey, data, weekNumber, weekState);
        
        console.log(`💎 Grid Week ${weekNumber} cached! State: ${weekState} 🚀`);
        return data;
    }

    // 👥 User Data Caching - Optimize Repeated Queries
    async cacheUsers(fetchFunction) {
        const cacheKey = this.KEYS.USERS;
        
        let cached = this.get(cacheKey);
        if (cached) {
            console.log(`💎 User data served from cache! 🔥`);
            return cached;
        }
        
        const data = await fetchFunction();
        
        // Users change less frequently, cache for 10 minutes
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            duration: 10 * 60 * 1000 // 10 minutes
        });
        this.memoryCache.set(cacheKey, data);
        
        console.log(`💎 User data cached! ✨`);
        return data;
    }

    // 🎮 Picks/Results Caching with Game State Awareness
    async cachePicks(weekNumber, fetchFunction) {
        const cacheKey = this.getCacheKey(this.KEYS.PICKS, weekNumber);
        
        let cached = this.get(cacheKey);
        if (cached) {
            const weekState = this.weekStates.get(weekNumber);
            console.log(`💎 Picks Week ${weekNumber} from cache! State: ${weekState} 🚀`);
            return cached;
        }
        
        const data = await fetchFunction();
        const weekState = this.weekStates.get(weekNumber) || 'IN_PROGRESS';
        
        this.set(cacheKey, data, weekNumber, weekState);
        
        console.log(`💎 Picks Week ${weekNumber} cached! State: ${weekState} ⚡`);
        return data;
    }

    // 🧹 Smart Cache Invalidation
    invalidateWeek(weekNumber) {
        const keysToDelete = [];
        for (const [key, value] of this.cache.entries()) {
            if (value.weekNumber === weekNumber && value.duration !== Infinity) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.memoryCache.delete(key);
        });
        
        console.log(`💎 Invalidated ${keysToDelete.length} cache entries for Week ${weekNumber} 🔥`);
    }
    
    // 💎 DIAMOND CRITICAL: Clear all leaderboard and scoring cache after data cleanup
    clearAllLeaderboardCache() {
        const keysToDelete = [];
        
        // Clear all cached data that affects leaderboard calculations
        for (const [key, value] of this.cache.entries()) {
            // Clear picks, grid data, users, and any scoring-related cache
            if (key.includes('picks_') || key.includes('grid_') || key.includes('users_') || 
                key.includes('results_') || key.includes('leaderboard_')) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.memoryCache.delete(key);
        });
        
        console.log(`💎 CRITICAL CACHE CLEAR: Invalidated ${keysToDelete.length} leaderboard-related cache entries 🚨`);
        return keysToDelete.length;
    }
    
    // 💎 Force complete cache flush for data integrity fixes
    clearAllCache() {
        const totalEntries = this.cache.size + this.memoryCache.size;

        this.cache.clear();
        this.memoryCache.clear();
        this.weekStates.clear();
        this.gameStates.clear();

        console.log(`💎 COMPLETE CACHE FLUSH: Cleared all ${totalEntries} cache entries 🔥`);
        return totalEntries;
    }

    // 🚨 EMERGENCY CACHE CLEAR - For live game situations
    emergencyClearAllCaches() {
        console.log('🚨 EMERGENCY CACHE CLEAR - Live game situation detected');

        // Clear all in-memory caches
        const totalCleared = this.clearAllCache();

        // Clear browser storage caches
        try {
            if (typeof localStorage !== 'undefined') {
                const lsKeys = Object.keys(localStorage);
                const clearedLS = [];
                lsKeys.forEach(key => {
                    if (key.includes('espn') || key.includes('game') || key.includes('cache') ||
                        key.includes('nerdfootball') || key.includes('schedule') || key.includes('picks')) {
                        localStorage.removeItem(key);
                        clearedLS.push(key);
                    }
                });
                console.log(`🗑️ Cleared ${clearedLS.length} localStorage entries:`, clearedLS);
            }
        } catch (error) {
            console.log('ℹ️ Could not access localStorage:', error.message);
        }

        try {
            if (typeof sessionStorage !== 'undefined') {
                const ssKeys = Object.keys(sessionStorage);
                const clearedSS = [];
                ssKeys.forEach(key => {
                    if (key.includes('espn') || key.includes('game') || key.includes('cache') ||
                        key.includes('nerdfootball') || key.includes('schedule') || key.includes('picks')) {
                        sessionStorage.removeItem(key);
                        clearedSS.push(key);
                    }
                });
                console.log(`🗑️ Cleared ${clearedSS.length} sessionStorage entries:`, clearedSS);
            }
        } catch (error) {
            console.log('ℹ️ Could not access sessionStorage:', error.message);
        }

        console.log(`🚨 EMERGENCY CACHE CLEAR COMPLETE: ${totalCleared} total entries cleared`);
        return totalCleared;
    }

    // 💎 CRITICAL SYSTEM: Comprehensive Cache Invalidation Management 🚨
    // This system ensures NO stale cache when underlying data changes
    
    // Clear all pick-related cache (when user saves picks)
    invalidatePicksCache(weekNumber = null, userId = null) {
        const keysToDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            // Clear picks cache for specific week or all weeks
            if (key.includes('picks_')) {
                if (!weekNumber || key.includes(`picks_${weekNumber}`)) {
                    keysToDelete.push(key);
                }
            }
            
            // Clear leaderboard cache (picks affect standings)
            if (key.includes('leaderboard_') || key.includes('grid_') || key.includes('season_standings')) {
                keysToDelete.push(key);
            }
            
            // Clear user-specific data if provided
            if (userId && key.includes(userId)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.memoryCache.delete(key);
        });
        
        console.log(`💎 PICKS CACHE INVALIDATED: Cleared ${keysToDelete.length} entries (Week: ${weekNumber || 'All'}, User: ${userId || 'All'}) 🚨`);
        return keysToDelete.length;
    }
    
    // Clear all game results cache (when admin updates scores)
    invalidateResultsCache(weekNumber = null) {
        const keysToDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            // Clear results cache for specific week or all weeks
            if (key.includes('results_')) {
                if (!weekNumber || key.includes(`results_${weekNumber}`)) {
                    keysToDelete.push(key);
                }
            }
            
            // Clear schedule cache (scores affect game state)
            if (key.includes('schedule_')) {
                if (!weekNumber || key.includes(`schedule_${weekNumber}`)) {
                    keysToDelete.push(key);
                }
            }
            
            // Clear ALL leaderboard and grid cache (results change everything)
            if (key.includes('leaderboard_') || key.includes('grid_') || 
                key.includes('season_standings') || key.includes('week_standings')) {
                keysToDelete.push(key);
            }
        }
        
        // Reset week state to force recalculation
        if (weekNumber) {
            this.weekStates.delete(weekNumber);
            this.gameStates.delete(weekNumber);
        }
        
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.memoryCache.delete(key);
        });
        
        console.log(`💎 RESULTS CACHE INVALIDATED: Cleared ${keysToDelete.length} entries (Week: ${weekNumber || 'All'}) 🚨`);
        return keysToDelete.length;
    }
    
    // Clear all user-related cache (when users are added/removed from pool)
    invalidateUsersCache() {
        const keysToDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            // Clear all user data cache
            if (key.includes('users_') || key.includes('pool_members_')) {
                keysToDelete.push(key);
            }
            
            // Clear ALL cache that depends on user list
            if (key.includes('leaderboard_') || key.includes('grid_') || 
                key.includes('picks_') || key.includes('season_standings')) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.memoryCache.delete(key);
        });
        
        console.log(`💎 USERS CACHE INVALIDATED: Cleared ${keysToDelete.length} entries 🚨`);
        return keysToDelete.length;
    }
    
    // Clear survivor pool cache (when survivor picks change)
    invalidateSurvivorCache(weekNumber = null) {
        const keysToDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            // Clear survivor cache for specific week or all weeks
            if (key.includes('survivor_')) {
                if (!weekNumber || key.includes(`survivor_${weekNumber}`)) {
                    keysToDelete.push(key);
                }
            }
        }
        
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.memoryCache.delete(key);
        });
        
        console.log(`💎 SURVIVOR CACHE INVALIDATED: Cleared ${keysToDelete.length} entries (Week: ${weekNumber || 'All'}) 🚨`);
        return keysToDelete.length;
    }
    
    // 💎 MASTER CACHE INVALIDATION: Call this for any major data change
    invalidateAfterDataUpdate(updateType, weekNumber = null, userId = null) {
        let totalCleared = 0;
        
        console.log(`💎 MASTER CACHE INVALIDATION triggered: ${updateType} (Week: ${weekNumber || 'All'}, User: ${userId || 'All'}) 🚨`);
        
        switch (updateType) {
            case 'user_picks_saved':
                totalCleared += this.invalidatePicksCache(weekNumber, userId);
                break;
                
            case 'game_results_updated':
                totalCleared += this.invalidateResultsCache(weekNumber);
                break;
                
            case 'admin_picks_saved':
                totalCleared += this.invalidatePicksCache(weekNumber, userId);
                break;
                
            case 'survivor_picks_saved':
                totalCleared += this.invalidateSurvivorCache(weekNumber);
                break;
                
            case 'users_modified':
                totalCleared += this.invalidateUsersCache();
                break;
                
            case 'complete_refresh':
                totalCleared += this.clearAllCache();
                break;
                
            default:
                // Conservative approach - clear all leaderboard-related cache
                totalCleared += this.clearAllLeaderboardCache();
        }
        
        console.log(`💎 MASTER CACHE INVALIDATION COMPLETE: ${totalCleared} entries cleared 🔥`);
        return totalCleared;
    }

    // 📈 Cache Statistics for Performance Monitoring
    getStats() {
        const stats = {
            totalEntries: this.cache.size,
            memoryEntries: this.memoryCache.size,
            weekStates: Object.fromEntries(this.weekStates),
            cacheHitRatio: this.calculateHitRatio()
        };
        
        console.log('💎 Cache Performance Stats:', stats);
        return stats;
    }

    calculateHitRatio() {
        // Implementation would track hits vs misses
        return 'Diamond Level! 💎🔥';
    }

    // 🚀 Initialize Cache with Current Week State
    async initialize(currentWeek, gameDataFetcher) {
        console.log('💎 Initializing Diamond-Level Cache System... 🚀');
        
        try {
            // Analyze current week state
            const weekData = await gameDataFetcher(currentWeek);
            this.analyzeWeekState(currentWeek, weekData);
            
            console.log(`💎 Cache initialized! Week ${currentWeek} state determined. ✨`);
        } catch (error) {
            console.error('Cache initialization error:', error);
        }
    }
}

// 🌟 Global Cache Instance - Diamond Singleton Pattern
window.gameStateCache = window.gameStateCache || new GameStateCache();

// 💎 Export for use across all pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStateCache;
}