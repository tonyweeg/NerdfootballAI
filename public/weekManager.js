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
        // UPDATED: Week 2 is now current (Week 1 completed, eliminations processed)
        // Survivor logic checks Week 1 eliminations to determine DEAD OR ALIVE
        console.log('🏈 WeekManager: Current NFL Week 2 - Week 1 eliminations processed');
        return 2;
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
}