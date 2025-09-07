class EspnNerdApiClient {
    constructor() {
        // Use the global functions instance if available (from main app)
        if (typeof functions !== 'undefined' && functions) {
            this.functions = functions;
        } else if (typeof firebase !== 'undefined' && firebase.functions) {
            // Fallback for standalone usage
            this.functions = firebase.functions();
        } else {
            console.error('Firebase Functions not initialized');
        }
        
        this.cache = new Map();
        this.CACHE_DURATION = {
            LIVE_GAMES: 30 * 1000,    // 30 seconds during live games
            PRE_GAME: 60 * 60 * 1000, // 1 hour before games start
            COMPLETED: Infinity,       // Never expire completed games
            TEAMS: 24 * 60 * 60 * 1000 // 24 hours for teams
        };
    }

    // Check if cache is valid
    isCacheValid(cacheKey, duration = this.CACHE_DURATION.PRE_GAME) {
        const cached = this.cache.get(cacheKey);
        if (!cached) return false;
        
        if (duration === Infinity) return true;
        
        const age = Date.now() - cached.timestamp;
        return age < duration;
    }

    // Store data in cache
    setCache(cacheKey, data, duration = this.CACHE_DURATION.PRE_GAME) {
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            duration
        });
    }

    // Get data from cache
    getCache(cacheKey) {
        const cached = this.cache.get(cacheKey);
        return cached ? cached.data : null;
    }

    // Call Firebase Function with error handling
    async callFunction(functionName, data = {}) {
        try {
            // Use global httpsCallable if available, otherwise use legacy API
            let callable;
            if (typeof window !== 'undefined' && window.httpsCallable) {
                callable = window.httpsCallable(this.functions, functionName);
            } else if (this.functions && this.functions.httpsCallable) {
                callable = this.functions.httpsCallable(functionName);
            } else {
                throw new Error('httpsCallable not available');
            }
            
            const result = await callable(data);
            
            if (!result.data.success) {
                throw new Error(result.data.error || 'Unknown error');
            }
            
            return result.data;
            
        } catch (error) {
            console.error(`ESPN API Function ${functionName} error:`, error);
            
            // Provide user-friendly error messages
            if (error.message.includes('Rate limit')) {
                throw new Error('ESPN API rate limit reached. Please try again in a few minutes.');
            } else if (error.message.includes('Network')) {
                throw new Error('Network error. Please check your connection and try again.');
            } else {
                throw new Error(`ESPN API Error: ${error.message}`);
            }
        }
    }

    // Get current NFL week
    getCurrentWeek() {
        const now = new Date();
        const seasonStart = new Date('2025-09-04'); // NFL Season start
        const weekMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
        
        if (now < seasonStart) return 1;
        
        const weeksDiff = Math.floor((now - seasonStart) / weekMs) + 1;
        return Math.min(Math.max(weeksDiff, 1), 18); // Clamp between 1 and 18
    }

    // Fetch games for current week with caching
    async getCurrentWeekGames(forceRefresh = false) {
        const currentWeek = this.getCurrentWeek();
        const cacheKey = `games_week_${currentWeek}`;
        
        // Check cache first unless forcing refresh
        if (!forceRefresh && this.isCacheValid(cacheKey)) {
            console.log(`ESPN: Serving Week ${currentWeek} games from cache`);
            return this.getCache(cacheKey);
        }
        
        try {
            console.log(`ESPN: Fetching Week ${currentWeek} games from API`);
            const result = await this.callFunction('fetchCurrentWeekGames', { week: currentWeek });
            
            // Determine cache duration based on game states
            const games = result.data;
            const now = new Date();
            let cacheDuration = this.CACHE_DURATION.PRE_GAME;
            
            // Check if any games are live or completed
            const hasLiveGames = games.some(game => {
                const gameTime = new Date(game.dt);
                return now >= gameTime && game.winner === 'TBD';
            });
            
            const allGamesCompleted = games.every(game => game.winner !== 'TBD');
            
            if (allGamesCompleted) {
                cacheDuration = this.CACHE_DURATION.COMPLETED;
            } else if (hasLiveGames) {
                cacheDuration = this.CACHE_DURATION.LIVE_GAMES;
            }
            
            this.setCache(cacheKey, games, cacheDuration);
            
            console.log(`ESPN: Cached Week ${currentWeek} games with ${cacheDuration === Infinity ? 'permanent' : cacheDuration/1000 + 's'} duration`);
            return games;
            
        } catch (error) {
            console.error('Error fetching current week games:', error);
            
            // Try to return cached data even if expired as fallback
            const cached = this.getCache(cacheKey);
            if (cached) {
                console.warn('ESPN: Returning expired cache data as fallback');
                return cached;
            }
            
            throw error;
        }
    }

    // Fetch games for specific week
    async getWeekGames(week, forceRefresh = false) {
        const cacheKey = `games_week_${week}`;
        
        if (!forceRefresh && this.isCacheValid(cacheKey)) {
            console.log(`ESPN: Serving Week ${week} games from cache`);
            return this.getCache(cacheKey);
        }
        
        try {
            console.log(`ESPN: Fetching Week ${week} games from API`);
            const result = await this.callFunction('fetchCurrentWeekGames', { week });
            
            const games = result.data;
            
            // Determine cache duration
            const allGamesCompleted = games.every(game => game.winner !== 'TBD');
            const cacheDuration = allGamesCompleted ? this.CACHE_DURATION.COMPLETED : this.CACHE_DURATION.PRE_GAME;
            
            this.setCache(cacheKey, games, cacheDuration);
            
            console.log(`ESPN: Cached Week ${week} games`);
            return games;
            
        } catch (error) {
            console.error(`Error fetching Week ${week} games:`, error);
            
            // Try fallback to cached data
            const cached = this.getCache(cacheKey);
            if (cached) {
                console.warn('ESPN: Returning expired cache data as fallback');
                return cached;
            }
            
            throw error;
        }
    }

    // Fetch games for specific date
    async getGamesByDate(date, forceRefresh = false) {
        const cacheKey = `games_date_${date}`;
        
        if (!forceRefresh && this.isCacheValid(cacheKey)) {
            console.log(`ESPN: Serving ${date} games from cache`);
            return this.getCache(cacheKey);
        }
        
        try {
            console.log(`ESPN: Fetching ${date} games from API`);
            const result = await this.callFunction('fetchGamesByDate', { date });
            
            const games = result.data;
            
            // Cache completed games permanently, others for 1 hour
            const gameDate = new Date(date);
            const isToday = gameDate.toDateString() === new Date().toDateString();
            const cacheDuration = isToday ? this.CACHE_DURATION.PRE_GAME : this.CACHE_DURATION.COMPLETED;
            
            this.setCache(cacheKey, games, cacheDuration);
            
            return games;
            
        } catch (error) {
            console.error(`Error fetching games for ${date}:`, error);
            
            const cached = this.getCache(cacheKey);
            if (cached) {
                console.warn('ESPN: Returning expired cache data as fallback');
                return cached;
            }
            
            throw error;
        }
    }

    // Fetch all NFL teams
    async getNflTeams(forceRefresh = false) {
        const cacheKey = 'nfl_teams';
        
        if (!forceRefresh && this.isCacheValid(cacheKey, this.CACHE_DURATION.TEAMS)) {
            console.log('ESPN: Serving NFL teams from cache');
            return this.getCache(cacheKey);
        }
        
        try {
            console.log('ESPN: Fetching NFL teams from API');
            const result = await this.callFunction('fetchNflTeams');
            
            const teams = result.data;
            this.setCache(cacheKey, teams, this.CACHE_DURATION.TEAMS);
            
            return teams;
            
        } catch (error) {
            console.error('Error fetching NFL teams:', error);
            
            const cached = this.getCache(cacheKey);
            if (cached) {
                console.warn('ESPN: Returning expired team cache as fallback');
                return cached;
            }
            
            throw error;
        }
    }

    // Get ESPN API status
    async getApiStatus() {
        try {
            const result = await this.callFunction('espnApiStatus');
            return result;
        } catch (error) {
            console.error('Error fetching ESPN API status:', error);
            return {
                success: false,
                status: 'error',
                error: error.message
            };
        }
    }

    // Admin function: Fetch complete season schedule
    async fetchSeasonSchedule() {
        try {
            console.log('ESPN: Fetching complete season schedule (Admin only)');
            const result = await this.callFunction('fetchSeasonSchedule');
            
            // Clear all week caches since we have fresh data
            for (let week = 1; week <= 18; week++) {
                this.cache.delete(`games_week_${week}`);
            }
            
            console.log(`ESPN: Season schedule fetch complete - ${result.gamesCount} games`);
            return result;
            
        } catch (error) {
            console.error('Error fetching season schedule:', error);
            throw error;
        }
    }

    // Transform ESPN data to NerdFootball format for compatibility
    transformToNerdFootballFormat(espnGames, weekNumber) {
        return espnGames.map((game, index) => ({
            id: (weekNumber * 100) + (index + 1),
            a: game.a, // Away team
            h: game.h, // Home team
            dt: game.dt, // DateTime
            stadium: game.stadium,
            winner: game.winner || 'TBD',
            homeScore: game.homeScore || 0,
            awayScore: game.awayScore || 0,
            kickoff: game.dt, // For compatibility with existing cache system
            espnId: game.espnId,
            lastUpdated: game.lastUpdated
        }));
    }

    // Get games in the format expected by existing NerdFootball components
    async getGamesForNerdFootball(weekNumber, forceRefresh = false) {
        try {
            const espnGames = await this.getWeekGames(weekNumber, forceRefresh);
            return this.transformToNerdFootballFormat(espnGames, weekNumber);
        } catch (error) {
            console.error(`Error getting NerdFootball format games for Week ${weekNumber}:`, error);
            throw error;
        }
    }

    // Invalidate specific cache entries
    invalidateCache(pattern = null) {
        if (pattern) {
            // Remove entries matching pattern
            const keysToDelete = [];
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => this.cache.delete(key));
            console.log(`ESPN: Invalidated ${keysToDelete.length} cache entries matching "${pattern}"`);
        } else {
            // Clear all cache
            const size = this.cache.size;
            this.cache.clear();
            console.log(`ESPN: Cleared all ${size} cache entries`);
        }
    }

    // Get cache statistics
    getCacheStats() {
        const stats = {
            totalEntries: this.cache.size,
            entries: {}
        };
        
        for (const [key, value] of this.cache.entries()) {
            const age = Date.now() - value.timestamp;
            const isExpired = value.duration !== Infinity && age > value.duration;
            
            stats.entries[key] = {
                age: Math.floor(age / 1000), // Age in seconds
                duration: value.duration === Infinity ? 'permanent' : Math.floor(value.duration / 1000),
                expired: isExpired,
                size: JSON.stringify(value.data).length
            };
        }
        
        return stats;
    }

    // Diagnostic method for testing
    async runDiagnostics() {
        const results = {
            timestamp: new Date().toISOString(),
            tests: []
        };

        // Test 1: API Status
        try {
            const status = await this.getApiStatus();
            results.tests.push({
                name: 'API Status',
                success: status.success,
                data: status
            });
        } catch (error) {
            results.tests.push({
                name: 'API Status',
                success: false,
                error: error.message
            });
        }

        // Test 2: Current Week Games
        try {
            const games = await this.getCurrentWeekGames(true); // Force refresh
            results.tests.push({
                name: 'Current Week Games',
                success: true,
                data: {
                    week: this.getCurrentWeek(),
                    gameCount: games.length,
                    sampleGame: games[0]
                }
            });
        } catch (error) {
            results.tests.push({
                name: 'Current Week Games',
                success: false,
                error: error.message
            });
        }

        // Test 3: NFL Teams
        try {
            const teams = await this.getNflTeams(true); // Force refresh
            results.tests.push({
                name: 'NFL Teams',
                success: true,
                data: {
                    teamCount: teams.length,
                    sampleTeam: teams[0]
                }
            });
        } catch (error) {
            results.tests.push({
                name: 'NFL Teams',
                success: false,
                error: error.message
            });
        }

        // Test 4: Cache Performance
        const cacheStats = this.getCacheStats();
        results.tests.push({
            name: 'Cache Performance',
            success: true,
            data: cacheStats
        });

        return results;
    }
}

// Global instance
window.espnApi = window.espnApi || new EspnNerdApiClient();

// Export for use across pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EspnNerdApiClient;
}