// Leaderboard Integration with Comprehensive Scoring System
// Connects the leaderboard page to the new scoring system data

window.LeaderboardScoringIntegration = {

    /**
     * Get weekly leaderboard from comprehensive scoring system
     * @param {number} weekNumber - Week number (1-18)
     * @returns {Object} Leaderboard data or null
     */
    async getWeeklyLeaderboard(weekNumber) {
        try {
            console.log('🔍 DEBUG: Getting weekly leaderboard for week:', weekNumber);
            console.log('🔍 DEBUG: Firebase available - db:', !!window.db, 'doc:', !!window.doc, 'getDoc:', !!window.getDoc);

            const leaderboardPath = `artifacts/nerdfootball/pools/nerduniverse-2025/leaderboards/weekly-${weekNumber}`;
            console.log('🔍 DEBUG: Leaderboard path:', leaderboardPath);

            const docRef = window.doc(window.db, leaderboardPath);
            const docSnap = await window.getDoc(docRef);
            console.log('🔍 DEBUG: Document exists:', docSnap.exists());

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('🔍 DEBUG: Document data:', data ? `${data.standings?.length || 0} standings` : 'no data');
                return data;
            }
            return null;
        } catch (error) {
            console.error(`❌ Error getting weekly leaderboard for week ${weekNumber}:`, error);
            return null;
        }
    },

    /**
     * Get season leaderboard from comprehensive scoring system
     * @returns {Object} Season leaderboard data or null
     */
    async getSeasonLeaderboard() {
        try {
            const leaderboardPath = `artifacts/nerdfootball/pools/nerduniverse-2025/leaderboards/season-2025`;
            const docRef = window.doc(window.db, leaderboardPath);
            const docSnap = await window.getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error(`❌ Error getting season leaderboard:`, error);
            return null;
        }
    },

    /**
     * Get user scoring data from comprehensive scoring system
     * @param {string} userId - User ID
     * @returns {Object} User scoring data or null
     */
    async getUserScoringData(userId) {
        try {
            const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
            const docRef = window.doc(window.db, scorePath);
            const docSnap = await window.getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error(`❌ Error getting user scoring data for ${userId}:`, error);
            return null;
        }
    },

    /**
     * Load leaderboard data for display
     * @param {number|null} weekNumber - Week number for weekly view, null for season
     * @returns {Array} Formatted leaderboard standings
     */
    async loadLeaderboardData(weekNumber = null) {
        try {
            console.log(`📊 Loading leaderboard data from scoring system (${weekNumber ? `Week ${weekNumber}` : 'Season'})`);

            let leaderboardData;

            if (weekNumber) {
                // Get weekly leaderboard
                leaderboardData = await this.getWeeklyLeaderboard(weekNumber);
            } else {
                // Get season leaderboard
                leaderboardData = await this.getSeasonLeaderboard();
            }

            if (!leaderboardData || !leaderboardData.standings) {
                console.warn(`⚠️ No leaderboard data found for ${weekNumber ? `Week ${weekNumber}` : 'Season'}`);
                return [];
            }

            console.log(`✅ Loaded ${leaderboardData.standings.length} users from scoring system`);
            return leaderboardData.standings;

        } catch (error) {
            console.error(`❌ Error loading leaderboard data:`, error);
            return [];
        }
    },

    /**
     * Check if comprehensive scoring system data is available
     * @param {number|null} weekNumber - Week to check
     * @returns {boolean} True if data is available
     */
    async hasLeaderboardData(weekNumber = null) {
        try {
            console.log('🔍 DEBUG: Checking for leaderboard data for week:', weekNumber);

            if (weekNumber) {
                const weeklyData = await this.getWeeklyLeaderboard(weekNumber);
                console.log('🔍 DEBUG: Weekly data found:', !!weeklyData, weeklyData ? `${weeklyData.standings?.length || 0} users` : 'no data');
                return !!(weeklyData && weeklyData.standings && weeklyData.standings.length > 0);
            } else {
                const seasonData = await this.getSeasonLeaderboard();
                console.log('🔍 DEBUG: Season data found:', !!seasonData, seasonData ? `${seasonData.standings?.length || 0} users` : 'no data');
                return !!(seasonData && seasonData.standings && seasonData.standings.length > 0);
            }
        } catch (error) {
            console.error('🔍 DEBUG: Error checking leaderboard data:', error);
            return false;
        }
    },

    /**
     * Replace the legacy leaderboard calculation with scoring system data
     * @param {number|null} weekNumber - Week number or null for season
     */
    async replaceLeaderboardCalculation(weekNumber = null) {
        try {
            console.log('🔍 DEBUG: replaceLeaderboardCalculation called for week:', weekNumber);

            // Check if comprehensive scoring system has data
            const hasData = await this.hasLeaderboardData(weekNumber);
            console.log('🔍 DEBUG: hasData result:', hasData);

            if (hasData) {
                console.log(`🏆 Using comprehensive scoring system for ${weekNumber ? `Week ${weekNumber}` : 'Season'} leaderboard`);
                const standings = await this.loadLeaderboardData(weekNumber);
                console.log('🔍 DEBUG: Loaded standings:', standings?.length || 0, 'users');
                return standings;
            } else {
                console.log(`📊 Comprehensive scoring system data not available, falling back to legacy calculation`);
                return null; // Let legacy system handle it
            }

        } catch (error) {
            console.error(`❌ Error in leaderboard replacement:`, error);
            return null; // Fall back to legacy system
        }
    }
};

console.log('🏆 Leaderboard Scoring Integration loaded');