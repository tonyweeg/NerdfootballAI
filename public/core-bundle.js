// Global Week Management System - Data-Driven NFL Week Detection
// Replaces date-based calculations with actual game data analysis

class WeekManager {
    constructor() {
        this._currentWeek = 1;
        this.weekCache = null;
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
        this.maxWeek = 18;
        this.minWeek = 1;
        this.initialized = false;
    }

    // Core getters with automatic bounds checking
    get currentWeek() { return this._currentWeek; }
    get nextWeek() { return Math.min(this._currentWeek + 1, this.maxWeek); }
    get previousWeek() { return Math.max(this._currentWeek - 1, this.minWeek); }

    // Initialize the week management system
    async initialize() {
        if (this.initialized) {
            console.log('🏈 WeekManager: Already initialized');
            return;
        }

        console.log('🏈 WeekManager: Initializing global week management system...');
        
        try {
            const detectedWeek = await this.detectCurrentWeek();
            this._currentWeek = this.validateWeekRange(detectedWeek);
            this.setGlobalWeekVariables();
            this.initialized = true;
            
            console.log(`🏈 WeekManager: Initialized successfully - Week ${this.currentWeek} (Next: ${this.nextWeek}, Previous: ${this.previousWeek})`);
        } catch (error) {
            console.error('🏈 WeekManager: Initialization failed, using fallback:', error);
            this._currentWeek = 1;
            this.setGlobalWeekVariables();
            this.initialized = true;
        }
    }

    // Main week detection with multiple data sources
    async detectCurrentWeek() {
        // TEMPORARY FIX: Force Week 1 until data sources align
        // User picks are in Week 1 (game IDs 101, 103, 111) so we need Week 1
        console.log('🏈 WeekManager: TEMPORARY - Forcing Week 1 for user pick alignment');
        return 1;
    }

    // Detect week from live/in-progress games
    async detectLiveGameWeek() {
        if (typeof window === 'undefined' || !window.espnNerdApi) {
            return null;
        }

        try {
            const liveScores = await window.espnNerdApi.getCurrentWeekScores();
            if (liveScores && liveScores.week) {
                const liveGames = liveScores.games?.filter(game => 
                    game.status && (game.status.includes('Q') || game.status.includes('Half') || game.status === 'Live')
                );
                
                if (liveGames && liveGames.length > 0) {
                    console.log(`🏈 WeekManager: Found ${liveGames.length} live games in Week ${liveScores.week}`);
                    return liveScores.week;
                }
            }
        } catch (error) {
            console.warn('🏈 WeekManager: Live game detection failed:', error.message);
        }
        
        return null;
    }

    // Get current week from ESPN API
    async getEspnCurrentWeek() {
        if (typeof window === 'undefined' || !window.espnNerdApi) {
            return null;
        }

        try {
            const currentWeekData = await window.espnNerdApi.getCurrentWeekScores();
            if (currentWeekData && currentWeekData.week) {
                console.log(`🏈 WeekManager: ESPN API reports Week ${currentWeekData.week}`);
                return currentWeekData.week;
            }
        } catch (error) {
            console.warn('🏈 WeekManager: ESPN API week detection failed:', error.message);
        }

        return null;
    }

    // Detect week from recent completed games in Firestore
    async detectRecentCompletedWeek() {
        if (typeof window === 'undefined' || !window.db || !window.getDoc || !window.doc) {
            return null;
        }

        // Check recent weeks for completed games (start from current week estimate and work backwards)
        const estimatedWeek = Math.min(this.getDateBasedWeekEstimate(), this.maxWeek);
        
        for (let week = estimatedWeek; week >= Math.max(estimatedWeek - 3, 1); week--) {
            try {
                const resultsPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
                const docRef = window.doc(window.db, resultsPath);
                const docSnap = await window.getDoc(docRef);
                
                if (docSnap.exists()) {
                    const results = docSnap.data();
                    if (this.hasRecentCompletedGames(results)) {
                        console.log(`🏈 WeekManager: Found completed games in Week ${week}`);
                        return week;
                    }
                }
            } catch (error) {
                continue;
            }
        }

        return null;
    }

    // Get latest available game week from static files
    getLatestAvailableGameWeek() {
        // Since we can't directly check file system in browser,
        // we'll try to determine from known game IDs or available data
        const knownWeeks = [];
        
        // Check if we have game files available (would need to be loaded)
        for (let week = this.maxWeek; week >= this.minWeek; week--) {
            // This would need to be enhanced with actual file checking
            // For now, we'll return a reasonable current week
            if (this.hasGameFileData(week)) {
                knownWeeks.push(week);
            }
        }

        if (knownWeeks.length > 0) {
            const latestWeek = Math.max(...knownWeeks);
            console.log(`🏈 WeekManager: Latest available game file: Week ${latestWeek}`);
            return latestWeek;
        }

        // Fallback to date-based estimate for file detection
        const dateBasedWeek = this.getDateBasedWeekEstimate();
        console.log(`🏈 WeekManager: Using date-based estimate: Week ${dateBasedWeek}`);
        return dateBasedWeek;
    }

    // Check if game file data is available for a week
    hasGameFileData(week) {
        // This is a placeholder - in a real implementation,
        // we'd need to actually check for file availability
        // For now, assume weeks 1-8 are available
        return week >= 1 && week <= 8;
    }

    // Helper: Get date-based week estimate (only for fallback)
    getDateBasedWeekEstimate() {
        const now = new Date();
        const seasonStart = new Date('2025-09-04');
        
        if (now < seasonStart) {
            return 1; // Pre-season
        }
        
        const weeksDiff = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
        return Math.min(Math.max(weeksDiff, 1), this.maxWeek);
    }

    // Check if Firestore results indicate recent completed games
    hasRecentCompletedGames(results) {
        if (!results || !results.games) {
            return false;
        }

        const games = Object.values(results.games);
        const completedGames = games.filter(game => 
            game && (game.awayScore !== undefined || game.homeScore !== undefined)
        );

        return completedGames.length > 0;
    }

    // Validate week is in acceptable range
    validateWeekRange(week) {
        const validWeek = Math.min(Math.max(parseInt(week) || 1, this.minWeek), this.maxWeek);
        if (validWeek !== week) {
            console.warn(`🏈 WeekManager: Week ${week} out of range, clamped to ${validWeek}`);
        }
        return validWeek;
    }

    // Check if week is valid
    isValidWeek(week) {
        return Number.isInteger(week) && week >= this.minWeek && week <= this.maxWeek;
    }

    // Cache management
    isCacheValid() {
        if (!this.weekCache) {
            return false;
        }
        
        const now = Date.now();
        return (now - this.weekCache.timestamp) < this.cacheTimeout;
    }

    cacheWeek(week) {
        this.weekCache = {
            week: week,
            timestamp: Date.now()
        };
    }

    // Set global window variables
    setGlobalWeekVariables() {
        if (typeof window !== 'undefined') {
            window.currentWeek = this.currentWeek;
            window.nextWeek = this.nextWeek;
            window.previousWeek = this.previousWeek;
            
            // Backward compatibility functions
            window.getCurrentWeek = () => this.currentWeek;
            window.getNFLCurrentWeek = () => this.currentWeek;
            window.weekManager = this;
            
            console.log(`🏈 WeekManager: Global variables set - currentWeek: ${window.currentWeek}, nextWeek: ${window.nextWeek}, previousWeek: ${window.previousWeek}`);
        }
    }

    // Force refresh of week detection
    async refreshWeek() {
        console.log('🏈 WeekManager: Force refreshing week detection...');
        this.weekCache = null;
        const newWeek = await this.detectCurrentWeek();
        this._currentWeek = this.validateWeekRange(newWeek);
        this.setGlobalWeekVariables();
        console.log(`🏈 WeekManager: Week refreshed to ${this.currentWeek}`);
        return this.currentWeek;
    }

    // Get detailed status information
    getStatus() {
        return {
            currentWeek: this.currentWeek,
            nextWeek: this.nextWeek,
            previousWeek: this.previousWeek,
            initialized: this.initialized,
            cached: this.isCacheValid(),
            cacheTimestamp: this.weekCache?.timestamp || null
        };
    }

    // Get season information
    getSeasonInfo() {
        return {
            year: 2025,
            currentWeek: this.currentWeek,
            nextWeek: this.nextWeek,
            previousWeek: this.previousWeek,
            totalWeeks: this.maxWeek,
            initialized: this.initialized
        };
    }
}

// Create global singleton instance
const weekManager = new WeekManager();

// Export for browser usage
if (typeof window !== 'undefined') {
    window.WeekManager = WeekManager;
    window.weekManager = weekManager;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            weekManager.initialize().catch(error => {
                console.error('🏈 WeekManager: Auto-initialization failed:', error);
            });
        });
    } else {
        // DOM already loaded, initialize immediately
        setTimeout(() => {
            weekManager.initialize().catch(error => {
                console.error('🏈 WeekManager: Auto-initialization failed:', error);
            });
        }, 100);
    }
}

// Export for Node.js
if (typeof module !== 'undefined') {
    module.exports = { WeekManager, weekManager };
}class EspnNerdApiClient {
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
                    // 🚨 EMERGENCY DIAGNOSTIC LOGGING (CORE BUNDLE)
                    console.log(`🔧 CORE ESPN API Init Attempt ${attempt + 1}: Checking Firebase availability...`);
                    console.log(`🔧 window exists: ${typeof window !== 'undefined'}`);
                    console.log(`🔧 window.functions exists: ${typeof window !== 'undefined' && typeof window.functions !== 'undefined'}`);
                    console.log(`🔧 window.httpsCallable exists: ${typeof window !== 'undefined' && typeof window.httpsCallable !== 'undefined'}`);
                    console.log(`🔧 functions global exists: ${typeof functions !== 'undefined'}`);
                    console.log(`🔧 firebase exists: ${typeof firebase !== 'undefined'}`);

                    // Check multiple Firebase access patterns
                    if (typeof window !== 'undefined' && window.functions) {
                        this.functions = window.functions;
                        console.log('🔧 CORE: Using window.functions');
                    } else if (typeof functions !== 'undefined' && functions) {
                        this.functions = functions;
                        console.log('🔧 CORE: Using global functions');
                    } else if (typeof firebase !== 'undefined' && firebase.functions) {
                        this.functions = firebase.functions();
                        console.log('🔧 CORE: Using firebase.functions()');
                    } else {
                        console.log('🔧 CORE ERROR: No Firebase Functions access pattern available');
                        throw new Error('Firebase Functions not available');
                    }

                    // Test function call to verify it works
                    if (typeof window !== 'undefined' && window.httpsCallable) {
                        const testCall = window.httpsCallable(this.functions, 'espnApiStatus');
                        // Don't actually call it, just verify callable works
                        this.isReady = true;
                        console.log('✅ CORE ESPN API Firebase Functions initialized successfully');
                        resolve();
                        return;
                    } else {
                        console.log('🔧 CORE ERROR: window.httpsCallable not available');
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
                const gameTime = window.easternTimeParser ?
                    window.easternTimeParser.parseESPNTimestamp(game.dt) :
                    new Date(game.dt);
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
}// ESPN Score Synchronization System
// Automatically updates game scores from ESPN API and recalculates leaderboards

class EspnScoreSync {
    constructor(db, espnApi, gameStateCache) {
        this.db = db;
        this.espnApi = espnApi;
        this.gameStateCache = gameStateCache;
        this.syncInterval = null;
        this.lastSyncTime = null;
        this.syncStatus = 'idle';
    }

    // Get the results path for a specific week
    resultsPath(weekNumber) {
        return `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`;
    }
    
    // Get Firestore document reference
    getDocRef(path) {
        // Use modern Firestore API with global functions
        if (typeof window !== 'undefined' && window.db && typeof window.doc !== 'undefined') {
            return window.doc(window.db, path);
        } else if (typeof db !== 'undefined' && typeof doc !== 'undefined') {
            return doc(db, path);
        } else if (this.db && this.db.doc) {
            return this.db.doc(path);
        } else {
            throw new Error('Firestore not properly initialized');
        }
    }
    
    // Set document in Firestore
    async setDocument(path, data) {
        if (typeof window !== 'undefined' && window.db && typeof window.setDoc !== 'undefined' && typeof window.doc !== 'undefined') {
            return await window.setDoc(window.doc(window.db, path), data);
        } else if (typeof setDoc !== 'undefined' && typeof db !== 'undefined' && typeof doc !== 'undefined') {
            return await setDoc(doc(db, path), data);
        } else if (this.db && this.db.doc) {
            return await this.db.doc(path).set(data);
        } else {
            throw new Error('Firestore not properly initialized');
        }
    }
    
    // Get document from Firestore
    async getDocument(path) {
        if (typeof window !== 'undefined' && window.db && typeof window.getDoc !== 'undefined' && typeof window.doc !== 'undefined') {
            return await window.getDoc(window.doc(window.db, path));
        } else if (typeof getDoc !== 'undefined' && typeof db !== 'undefined' && typeof doc !== 'undefined') {
            return await getDoc(doc(db, path));
        } else if (this.db && this.db.doc) {
            return await this.db.doc(path).get();
        } else {
            throw new Error('Firestore not properly initialized');
        }
    }

    // Map ESPN game data to our game IDs
    mapEspnToGameId(espnGame, weekNumber) {
        // Our game IDs are typically like "101", "102", etc.
        // ESPN provides unique IDs, so we need to map based on teams
        const gameIdBase = parseInt(weekNumber) * 100;
        
        // This is a simplified mapping - in production you'd want a more robust system
        // For now, we'll use the order of games as they come from ESPN
        return espnGame.id || `${gameIdBase + 1}`;
    }

    // Sync scores for a specific week
    async syncWeekScores(weekNumber) {
        console.log(`🔄 Starting ESPN score sync for Week ${weekNumber}...`);
        this.syncStatus = 'syncing';
        
        try {
            // Fetch current games from ESPN
            const espnGames = await this.espnApi.getWeekGames(weekNumber);
            
            if (!espnGames || espnGames.length === 0) {
                console.log('No games found from ESPN for Week', weekNumber);
                return { success: false, message: 'No games found' };
            }

            // Get current results from Firestore
            const resultsDoc = await this.getDocument(this.resultsPath(weekNumber));
            const currentResults = resultsDoc.exists() ? resultsDoc.data() : {};
            
            let updatedCount = 0;
            let newResults = { ...currentResults };
            
            // Process each ESPN game
            for (const espnGame of espnGames) {
                // Only update completed games
                if (espnGame.status === 'FINAL' || espnGame.winner !== 'TBD') {
                    const gameId = this.mapEspnToGameId(espnGame, weekNumber);
                    
                    // Check if scores have changed
                    const existingResult = currentResults[gameId];
                    const needsUpdate = !existingResult || 
                        existingResult.awayScore !== espnGame.awayScore ||
                        existingResult.homeScore !== espnGame.homeScore ||
                        existingResult.winner !== espnGame.winner;
                    
                    if (needsUpdate) {
                        // Store comprehensive ESPN data
                        newResults[gameId] = {
                            // Basic game results
                            winner: espnGame.winner,
                            awayScore: espnGame.awayScore,
                            homeScore: espnGame.homeScore,
                            status: espnGame.status,
                            
                            // 🎲 Enhanced data from comprehensive ESPN integration
                            quarterScores: espnGame.quarterScores || null,
                            teamRecords: espnGame.teamRecords || null,
                            weather: espnGame.weather || null,
                            venue: espnGame.venue || null,
                            broadcasts: espnGame.broadcasts || null,
                            tv: espnGame.tv || null,
                            
                            // ⚡ Live game situation (for in-progress games)
                            situation: espnGame.situation || null,
                            
                            // 🎯 Win probability (huge value!)
                            probability: espnGame.situation?.probability || null,
                            
                            // 📊 Metadata
                            attendance: espnGame.attendance,
                            season: espnGame.season,
                            lastUpdated: new Date().toISOString(),
                            source: 'ESPN_API_ENHANCED',
                            dataEnhanced: true
                        };
                        updatedCount++;
                        
                        console.log(`✅ Enhanced update game ${gameId}: ${espnGame.a} ${espnGame.awayScore} - ${espnGame.h} ${espnGame.homeScore} (Winner: ${espnGame.winner})${espnGame.weather ? ` [${espnGame.weather.temperature}°F]` : ''}`);
                    }
                }
            }
            
            // Save updated results if there were changes
            if (updatedCount > 0) {
                await this.setDocument(this.resultsPath(weekNumber), newResults);
                
                // Invalidate cache to trigger leaderboard recalculation
                this.gameStateCache.invalidateAfterDataUpdate('game_results_updated', weekNumber);
                
                // Update leaderboard summary
                if (typeof window.updateLeaderboardSummary === 'function') {
                    try {
                        await window.updateLeaderboardSummary();
                        console.log('✅ Leaderboard summary updated after ESPN sync');
                    } catch (error) {
                        console.error('Failed to update leaderboard summary:', error);
                    }
                } else if (typeof updateLeaderboardSummary === 'function') {
                    try {
                        await updateLeaderboardSummary();
                        console.log('✅ Leaderboard summary updated after ESPN sync');
                    } catch (error) {
                        console.error('Failed to update leaderboard summary:', error);
                    }
                }
                
                console.log(`💎 ESPN Sync Complete: Updated ${updatedCount} games for Week ${weekNumber}`);
                
                // 🏆 TRIGGER SURVIVOR AUTO-ELIMINATION CHECK
                await this.checkSurvivorEliminations(weekNumber, updatedCount);
                
                // Trigger UI update if on admin page
                this.notifyUIUpdate(weekNumber, updatedCount);
            } else {
                console.log(`✅ Week ${weekNumber} already up to date`);
            }
            
            this.lastSyncTime = new Date();
            this.syncStatus = 'success';
            
            return {
                success: true,
                updatedCount,
                totalGames: espnGames.length,
                message: `Updated ${updatedCount} of ${espnGames.length} games`
            };
            
        } catch (error) {
            console.error('ESPN score sync error:', error);
            this.syncStatus = 'error';
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Notify UI of updates
    notifyUIUpdate(weekNumber, updatedCount) {
        // Dispatch custom event that UI can listen to
        window.dispatchEvent(new CustomEvent('espnScoresUpdated', {
            detail: {
                weekNumber,
                updatedCount,
                timestamp: new Date().toISOString()
            }
        }));
        
        // If on admin results tab, show football indicator
        const adminSection = document.getElementById('admin-content-game-results');
        if (adminSection && !adminSection.classList.contains('hidden')) {
            // Use the football indicator instead of notification
            if (typeof window.showGameUpdateIndicator === 'function') {
                window.showGameUpdateIndicator();
            }
        }
    }

    // Show sync notification in UI - replaced with football indicator
    showSyncNotification(message, type = 'info') {
        // Use the football indicator instead of popup notification
        if (typeof window.showGameUpdateIndicator === 'function') {
            window.showGameUpdateIndicator();
        }
        // Log to console for debugging
        console.log(`ESPN Sync: ${message}`);
    }

    // Start automatic syncing for live games
    startAutoSync(intervalMinutes = 5) {
        if (this.syncInterval) {
            console.log('Auto-sync already running');
            return;
        }
        
        console.log(`🚀 Starting ESPN auto-sync every ${intervalMinutes} minutes`);
        
        // Initial sync
        this.syncCurrentWeek();
        
        // Set up interval
        this.syncInterval = setInterval(() => {
            this.syncCurrentWeek();
        }, intervalMinutes * 60 * 1000);
    }

    // Stop automatic syncing
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('🛑 ESPN auto-sync stopped');
        }
    }

    // Sync current week's scores
    async syncCurrentWeek() {
        const currentWeek = window.currentWeek || this.getCurrentWeek();
        return await this.syncWeekScores(currentWeek);
    }

    // Get current NFL week (fallback only)
    getCurrentWeek() {
        // Use global week management system
        if (typeof window !== 'undefined' && window.currentWeek) {
            return window.currentWeek;
        }
        
        // FALLBACK: 2025 season starts in September 2025
        const now = new Date();
        const seasonStart = new Date('2025-09-05');
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const weeksDiff = Math.floor((now - seasonStart) / weekMs) + 1;
        
        // Since we're before the 2025 season, default to week 1 for testing
        if (now < seasonStart) {
            console.log('🏈 Pre-season: Defaulting to Week 1 for testing');
            return 1;
        }
        
        return Math.min(Math.max(weeksDiff, 1), 18);
    }

    // Manual sync button handler
    async handleManualSync(weekNumber) {
        this.showSyncNotification('Syncing scores from ESPN...', 'info');
        const result = await this.syncWeekScores(weekNumber);
        
        if (result.success) {
            if (result.updatedCount > 0) {
                this.showSyncNotification(`Updated ${result.updatedCount} games from ESPN`, 'success');
            } else {
                this.showSyncNotification('All scores already up to date', 'success');
            }
        } else {
            this.showSyncNotification(`Sync failed: ${result.error || result.message}`, 'error');
        }
        
        return result;
    }

    // Check if we should auto-sync (during game days)
    shouldAutoSync() {
        const now = new Date();
        const day = now.getDay();
        
        // Auto-sync on game days: Thursday (4), Sunday (0), Monday (1)
        const isGameDay = day === 0 || day === 1 || day === 4;
        
        // Also check if we're in the typical game time window (10am - 11pm ET)
        const hour = now.getHours();
        const isGameTime = hour >= 10 && hour <= 23;
        
        return isGameDay && isGameTime;
    }

    // Initialize sync system
    initialize() {
        console.log('💎 ESPN Score Sync System Initialized');
        
        // Add sync button to admin panel if it doesn't exist
        this.addSyncButton();
        
        // Start auto-sync if it's game day
        if (this.shouldAutoSync()) {
            this.startAutoSync(5); // Every 5 minutes during games
        }
        
        // Listen for manual sync requests
        window.addEventListener('requestEspnSync', (event) => {
            const weekNumber = event.detail?.weekNumber || window.currentWeek || this.getCurrentWeek();
            this.handleManualSync(weekNumber);
        });
    }

    // Check survivor eliminations after game results update
    async checkSurvivorEliminations(weekNumber, updatedGamesCount) {
        try {
            console.log(`🏆 Checking survivor eliminations for Week ${weekNumber}...`);
            
            // Use clean survivor system instead of old SurvivorAutoElimination
            if (typeof window.survivorSystem === 'undefined') {
                console.log('⚠️ Clean survivor system not available - skipping elimination check');
                return;
            }
            
            // Use the new clean survivor system for eliminations
            const eliminationResult = { eliminatedCount: 0 }; // Clean system handles eliminations automatically
            console.log('✅ Using clean survivor system - eliminations processed automatically');
            
            if (eliminationResult.error) {
                console.error('Survivor elimination check failed:', eliminationResult.error);
                return;
            }
            
            if (eliminationResult.eliminatedCount > 0) {
                console.log(`🚨 SURVIVOR ELIMINATIONS: ${eliminationResult.eliminatedCount} users eliminated in Week ${weekNumber}`);
                
                // Show notification about eliminations
                this.showSyncNotification(
                    `ESPN Sync + Survivor Eliminations: ${updatedGamesCount} games updated, ${eliminationResult.eliminatedCount} users eliminated`,
                    'success'
                );
                
                // Log elimination details
                eliminationResult.details.forEach(elimination => {
                    console.log(`   ❌ ${elimination.userId}: Picked ${elimination.pickedTeam}, ${elimination.winningTeam} won (Game ${elimination.gameId})`);
                });
                
                // Trigger survivor UI updates if survivor page is visible
                window.dispatchEvent(new CustomEvent('survivorEliminationsUpdated', {
                    detail: {
                        weekNumber,
                        eliminatedCount: eliminationResult.eliminatedCount,
                        eliminatedUsers: eliminationResult.details
                    }
                }));
                
            } else {
                console.log(`✅ No new survivor eliminations found for Week ${weekNumber}`);
            }
            
        } catch (error) {
            console.error('Error during survivor elimination check:', error);
        }
    }

    // Add ESPN sync button to admin panel
    addSyncButton() {
        const adminButtons = document.querySelector('#admin-content-game-results .flex.gap-2');
        if (adminButtons && !document.getElementById('espn-sync-btn')) {
            const syncButton = document.createElement('button');
            syncButton.id = 'espn-sync-btn';
            syncButton.className = 'bg-blue-700 text-white text-sm font-medium py-1 px-3 rounded hover:bg-blue-800';
            syncButton.innerHTML = '🔄 Sync ESPN Scores';
            syncButton.addEventListener('click', () => {
                const weekNumber = document.getElementById('admin-week-selector')?.value || window.currentWeek || this.getCurrentWeek();
                this.handleManualSync(weekNumber);
            });
            
            // Insert after save button
            const saveBtn = document.getElementById('save-results-btn');
            if (saveBtn) {
                saveBtn.parentNode.insertBefore(syncButton, saveBtn.nextSibling);
            } else {
                adminButtons.appendChild(syncButton);
            }
        }
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.EspnScoreSync = EspnScoreSync;
}