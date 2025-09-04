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
        const kickoff = new Date(game.kickoff);
        
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