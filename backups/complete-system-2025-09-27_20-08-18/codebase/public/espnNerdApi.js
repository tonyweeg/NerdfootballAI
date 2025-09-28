class EspnNerdApiClient {
    constructor() {
        // DIAMOND LEVEL: Deferred initialization pattern
        this.functions = null;
        this.isReady = false;
        this.initPromise = null;
        
        // Start initialization but don't require it immediately
        this.initializeFirebase();
        
        this.cache = new Map();
        this.CACHE_DURATION = {
            LIVE_GAMES: 30 * 1000,    // 30 seconds during live games
            PRE_GAME: 60 * 60 * 1000, // 1 hour before games start
            COMPLETED: Infinity,       // Never expire completed games
            TEAMS: 24 * 60 * 60 * 1000 // 24 hours for teams
        };
    }

    // DIAMOND LEVEL: Firebase initialization with retry logic
    async initializeFirebase() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise(async (resolve, reject) => {
            const maxRetries = 20;
            const retryDelay = 250;
            
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    // 🚨 EMERGENCY DIAGNOSTIC LOGGING
                    console.log(`🔧 ESPN API Init Attempt ${attempt + 1}: Checking Firebase availability...`);
                    console.log(`🔧 window exists: ${typeof window !== 'undefined'}`);
                    console.log(`🔧 window.functions exists: ${typeof window !== 'undefined' && typeof window.functions !== 'undefined'}`);
                    console.log(`🔧 window.httpsCallable exists: ${typeof window !== 'undefined' && typeof window.httpsCallable !== 'undefined'}`);
                    console.log(`🔧 functions global exists: ${typeof functions !== 'undefined'}`);
                    console.log(`🔧 firebase exists: ${typeof firebase !== 'undefined'}`);

                    // Check multiple Firebase access patterns
                    if (typeof window !== 'undefined' && window.functions) {
                        this.functions = window.functions;
                        console.log('🔧 Using window.functions');
                    } else if (typeof functions !== 'undefined' && functions) {
                        this.functions = functions;
                        console.log('🔧 Using global functions');
                    } else if (typeof firebase !== 'undefined' && firebase.functions) {
                        this.functions = firebase.functions();
                        console.log('🔧 Using firebase.functions()');
                    } else {
                        console.log('🔧 ERROR: No Firebase Functions access pattern available');
                        throw new Error('Firebase Functions not available');
                    }

                    // Test function call to verify it works
                    if (typeof window !== 'undefined' && window.httpsCallable) {
                        const testCall = window.httpsCallable(this.functions, 'espnApiStatus');
                        // Don't actually call it, just verify callable works
                        this.isReady = true;
                        console.log('✅ ESPN API Firebase Functions initialized successfully');
                        resolve();
                        return;
                    } else {
                        console.log('🔧 ERROR: window.httpsCallable not available');
                        throw new Error('httpsCallable not available');
                    }
                } catch (error) {
                    if (attempt < maxRetries - 1) {
                        console.log(`⏳ ESPN API Firebase retry ${attempt + 1}/${maxRetries} in ${retryDelay}ms`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    } else {
                        console.error('❌ ESPN API Firebase initialization failed after all retries:', error);
                        reject(error);
                    }
                }
            }
        });
        
        return this.initPromise;
    }

    // Ensure Firebase is ready before any API calls
    async ensureReady() {
        if (this.isReady) return;
        await this.initializeFirebase();
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

    // DIAMOND LEVEL: Call Firebase Function with initialization check and error handling
    async callFunction(functionName, data = {}) {
        try {
            // Ensure Firebase is ready before any calls
            await this.ensureReady();
            
            // Use global httpsCallable if available, otherwise use legacy API
            let callable;
            if (typeof window !== 'undefined' && window.httpsCallable) {
                callable = window.httpsCallable(this.functions, functionName);
            } else if (this.functions && this.functions.httpsCallable) {
                callable = this.functions.httpsCallable(functionName);
            } else {
                throw new Error('httpsCallable not available after initialization');
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

    // Get current NFL week using global week management
    getCurrentWeek() {
        // Use global week management system
        if (typeof window !== 'undefined' && window.currentWeek) {
            return window.currentWeek;
        }
        
        // Fallback implementation with 2025 season dates
        const now = new Date();
        const seasonStart = new Date('2025-09-04'); // NFL 2025 Season start (Week 1)
        const weekMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
        
        // Before season starts - return Week 1 for pre-season testing
        if (now < seasonStart) return 1;
        
        const timeDiff = now.getTime() - seasonStart.getTime();
        const weeksDiff = Math.floor(timeDiff / weekMs) + 1;
        return Math.min(Math.max(weeksDiff, 1), 18); // Clamp between 1 and 18
    }

    // Fetch games for current week with caching
    async getCurrentWeekGames(forceRefresh = false) {
        const currentWeek = window.currentWeek || this.getCurrentWeek();
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
                // ESPN Z = Eastern time, treat directly as Eastern
                const cleanTime = game.dt.replace('Z', '');
                const gameTime = new Date(cleanTime);
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

    // DIAMOND LEVEL: Enhanced ESPN data transformation with comprehensive team mapping
    transformToNerdFootballFormat(espnGames, weekNumber) {
        return espnGames.map((game, index) => ({
            id: (weekNumber * 100) + (index + 1),
            a: this.normalizeTeamName(game.a || game.away_team || game.awayTeam), // Away team
            h: this.normalizeTeamName(game.h || game.home_team || game.homeTeam), // Home team
            dt: game.dt, // DateTime
            stadium: game.stadium,
            winner: game.winner ? this.normalizeTeamName(game.winner) : 'TBD',
            homeScore: game.homeScore || game.home_score || 0,
            awayScore: game.awayScore || game.away_score || 0,
            kickoff: game.dt, // For compatibility with existing cache system
            espnId: game.espnId || game.id,
            lastUpdated: game.lastUpdated,
            // Add comprehensive team info for survivor matching
            home_team: this.normalizeTeamName(game.h || game.home_team || game.homeTeam),
            away_team: this.normalizeTeamName(game.a || game.away_team || game.awayTeam),
            home_score: game.homeScore || game.home_score || 0,
            away_score: game.awayScore || game.away_score || 0,
            status: game.status || (game.winner && game.winner !== 'TBD' ? 'Final' : 'Not Started')
        }));
    }

    // DIAMOND LEVEL: Comprehensive team name normalization
    normalizeTeamName(teamName) {
        if (!teamName) return null;
        
        // Team name mapping for consistency
        const teamMappings = {
            // Handle common variations
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
            'SF 49ers': 'San Francisco 49ers',
            
            // Handle ESPN abbreviations to full names
            'ARI': 'Arizona Cardinals',
            'ATL': 'Atlanta Falcons', 
            'BAL': 'Baltimore Ravens',
            'BUF': 'Buffalo Bills',
            'CAR': 'Carolina Panthers',
            'CHI': 'Chicago Bears',
            'CIN': 'Cincinnati Bengals',
            'CLE': 'Cleveland Browns',
            'DAL': 'Dallas Cowboys',
            'DEN': 'Denver Broncos',
            'DET': 'Detroit Lions',
            'GB': 'Green Bay Packers',
            'HOU': 'Houston Texans',
            'IND': 'Indianapolis Colts',
            'JAX': 'Jacksonville Jaguars',
            'KC': 'Kansas City Chiefs',
            'LV': 'Las Vegas Raiders',
            'LAC': 'Los Angeles Chargers',
            'LAR': 'Los Angeles Rams',
            'MIA': 'Miami Dolphins',
            'MIN': 'Minnesota Vikings',
            'NE': 'New England Patriots',
            'NO': 'New Orleans Saints',
            'NYG': 'New York Giants',
            'NYJ': 'New York Jets',
            'PHI': 'Philadelphia Eagles',
            'PIT': 'Pittsburgh Steelers',
            'SEA': 'Seattle Seahawks',
            'SF': 'San Francisco 49ers',
            'TB': 'Tampa Bay Buccaneers',
            'TEN': 'Tennessee Titans',
            'WSH': 'Washington Commanders'
        };
        
        // Direct mapping if exists
        if (teamMappings[teamName]) {
            return teamMappings[teamName];
        }
        
        // Return as-is if already in full form
        return teamName;
    }

    // DIAMOND LEVEL: Enhanced current week scores with comprehensive team info
    async getCurrentWeekScores() {
        try {
            await this.ensureReady();
            const games = await this.getCurrentWeekGames();
            
            // Transform to comprehensive format for survivor system
            return {
                games: games.map(game => ({
                    id: game.espnId || game.id,
                    home_team: this.normalizeTeamName(game.h || game.home_team || game.homeTeam),
                    away_team: this.normalizeTeamName(game.a || game.away_team || game.awayTeam),
                    home_score: game.homeScore || game.home_score || 0,
                    away_score: game.awayScore || game.away_score || 0,
                    winner: game.winner ? this.normalizeTeamName(game.winner) : 'TBD',
                    status: game.status || (game.winner && game.winner !== 'TBD' ? 'Final' : 'Not Started'),
                    dt: game.dt
                }))
            };
        } catch (error) {
            console.error('Error getting current week scores:', error);
            throw error;
        }
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

    // Fetch NFL news
    async getNflNews(limit = 20, forceRefresh = false) {
        const cacheKey = `nfl_news_${limit}`;
        
        if (!forceRefresh && this.isCacheValid(cacheKey, 2 * 60 * 60 * 1000)) {
            console.log('ESPN: Serving NFL news from cache');
            return this.getCache(cacheKey);
        }
        
        try {
            console.log('ESPN: Fetching NFL news from API');
            const result = await this.callFunction('fetchNflNews', { limit });
            
            const news = result.data;
            this.setCache(cacheKey, news, 2 * 60 * 60 * 1000); // 2 hour cache
            
            console.log(`ESPN: Cached ${news.length} news articles`);
            return news;
            
        } catch (error) {
            console.error('Error fetching NFL news:', error);
            
            const cached = this.getCache(cacheKey);
            if (cached) {
                console.warn('ESPN: Returning expired news cache as fallback');
                return cached;
            }
            
            throw error;
        }
    }

    // Get enhanced game data with all ESPN features
    async getEnhancedGameData(weekNumber, forceRefresh = false) {
        try {
            const games = await this.getWeekGames(weekNumber, forceRefresh);
            
            // Enhanced games should now include all the comprehensive data
            // from our updated Firebase Functions
            console.log(`ESPN: Retrieved ${games.length} enhanced games for Week ${weekNumber}`);
            return games;
            
        } catch (error) {
            console.error(`Error getting enhanced game data for Week ${weekNumber}:`, error);
            throw error;
        }
    }

    // Extract specific data features from enhanced game data
    extractGameFeatures(game) {
        return {
            // Core game info
            basic: {
                id: game.id,
                teams: { away: game.a, home: game.h },
                scores: { away: game.awayScore, home: game.homeScore },
                winner: game.winner,
                status: game.status
            },
            
            // 🎲 Win Probability (if available)
            probability: game.situation?.probability ? {
                homeWin: game.situation.probability.homeWinPercentage,
                awayWin: game.situation.probability.awayWinPercentage,
                tie: game.situation.probability.tiePercentage
            } : null,
            
            // ⛈️ Weather conditions
            weather: game.weather ? {
                temperature: game.weather.temperature,
                condition: game.weather.condition,
                description: game.weather.description
            } : null,
            
            // 🏟️ Venue details
            venue: game.venue ? {
                name: game.venue.name,
                location: `${game.venue.city}, ${game.venue.state}`,
                indoor: game.venue.indoor
            } : null,
            
            // 📺 Broadcast info
            broadcasts: game.broadcasts || [],
            primaryNetwork: game.tv,
            
            // 🏆 Team records
            records: game.teamRecords ? {
                home: game.teamRecords.home,
                away: game.teamRecords.away
            } : null,
            
            // 📊 Quarter scores
            quarterScores: game.quarterScores || null,
            
            // ⚡ Live game situation
            situation: game.situation ? {
                possession: game.situation.possession,
                down: game.situation.down,
                distance: game.situation.distance,
                yardLine: game.situation.yardLine,
                timeRemaining: game.situation.timeRemaining,
                lastPlay: game.situation.lastPlay?.text
            } : null
        };
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

// DIAMOND LEVEL: Safe global instance initialization
if (typeof window !== 'undefined') {
    // Initialize ESPN API with proper error handling
    if (!window.espnApi || !window.espnApi.isReady) {
        window.espnApi = new EspnNerdApiClient();
    }
    
    // Also create espnNerdApi alias for survivor system compatibility
    window.espnNerdApi = window.espnApi;
}

// Export for use across pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EspnNerdApiClient;
}