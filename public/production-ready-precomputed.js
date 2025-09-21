// 🚀 PRODUCTION-READY PRECOMPUTED DATA SYSTEM
// This replaces mock data with REAL Firebase-based precomputed results

class ProductionPrecomputedReader {
    constructor() {
        this.cache = new Map();
        this.enabled = true;
        this.fallbackToMock = false; // MUST be false in production
    }

    // 🏆 READ WEEK LEADERBOARD FROM FIREBASE (Production Path)
    async getWeekLeaderboard(weekNumber) {
        if (!this.enabled) return null;

        const cacheKey = `week-${weekNumber}-leaderboard`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // 🔥 FIREBASE PATH: completed-weeks/week-{N}
            const docPath = `completed-weeks/week-${weekNumber}`;
            const docRef = window.doc(window.db, docPath);
            const docSnap = await window.getDoc(docRef);

            if (!docSnap.exists()) {
                console.log(`⚠️ No precomputed data for Week ${weekNumber} in Firebase`);
                return await this.handleMissingData('week', weekNumber);
            }

            const weekData = docSnap.data();
            const leaderboard = weekData.confidence?.leaderboard;

            if (!leaderboard || leaderboard.length === 0) {
                console.log(`⚠️ Empty leaderboard for Week ${weekNumber}`);
                return await this.handleMissingData('week', weekNumber);
            }

            this.cache.set(cacheKey, leaderboard);
            console.log(`✅ Production Week ${weekNumber} leaderboard: ${leaderboard.length} users`);
            return leaderboard;

        } catch (error) {
            console.error(`❌ Failed to load Week ${weekNumber} from Firebase:`, error.message);
            return await this.handleMissingData('week', weekNumber);
        }
    }

    // 🏆 READ SEASON LEADERBOARD FROM FIREBASE (Production Path)
    async getSeasonLeaderboard() {
        if (!this.enabled) return null;

        const cacheKey = 'season-leaderboard';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // 🔥 FIREBASE PATH: completed-weeks/season-aggregate
            const docPath = 'completed-weeks/season-aggregate';
            const docRef = window.doc(window.db, docPath);
            const docSnap = await window.getDoc(docRef);

            if (!docSnap.exists()) {
                console.log(`⚠️ No precomputed season data in Firebase`);
                return await this.handleMissingData('season', null);
            }

            const seasonData = docSnap.data();
            const leaderboard = seasonData.confidence?.seasonLeaderboard;

            if (!leaderboard || leaderboard.length === 0) {
                console.log(`⚠️ Empty season leaderboard`);
                return await this.handleMissingData('season', null);
            }

            this.cache.set(cacheKey, leaderboard);
            console.log(`✅ Production season leaderboard: ${leaderboard.length} users`);
            return leaderboard;

        } catch (error) {
            console.error(`❌ Failed to load season data from Firebase:`, error.message);
            return await this.handleMissingData('season', null);
        }
    }

    // 🔄 HANDLE MISSING DATA (Fallback Strategy)
    async handleMissingData(type, weekNumber) {
        if (this.fallbackToMock) {
            console.log(`🔄 Falling back to mock data for ${type} ${weekNumber || ''}`);

            // ONLY for development - fallback to mock
            if (type === 'week') {
                try {
                    const response = await fetch(`mock-completed-week-${weekNumber}.json`);
                    if (response.ok) {
                        const data = await response.json();
                        return data.confidence.leaderboard;
                    }
                } catch (e) {
                    console.log(`⚠️ Mock fallback failed for Week ${weekNumber}`);
                }
            } else if (type === 'season') {
                try {
                    const response = await fetch('mock-season-aggregate.json');
                    if (response.ok) {
                        const data = await response.json();
                        return data.confidence.seasonLeaderboard;
                    }
                } catch (e) {
                    console.log(`⚠️ Mock fallback failed for season`);
                }
            }
        }

        // 🚨 PRODUCTION: Return null to trigger live calculation
        console.log(`🔄 No precomputed data available - triggering live calculation for ${type} ${weekNumber || ''}`);
        return null;
    }

    // 🎛️ DEVELOPMENT MODE CONTROLS
    setDevelopmentMode(enabled) {
        this.fallbackToMock = enabled;
        console.log(`🛠️ Development mode ${enabled ? 'ENABLED' : 'DISABLED'} - mock fallback ${enabled ? 'allowed' : 'blocked'}`);
    }

    // 🚀 PRODUCTION MODE (No fallbacks)
    setProductionMode() {
        this.fallbackToMock = false;
        this.enabled = true;
        console.log('🚀 PRODUCTION MODE: Only Firebase precomputed data allowed');
    }

    // 📊 STATUS CHECK
    getStatus() {
        return {
            enabled: this.enabled,
            fallbackToMock: this.fallbackToMock,
            cacheSize: this.cache.size,
            mode: this.fallbackToMock ? 'development' : 'production'
        };
    }
}

// 🌟 REPLACE MOCK SYSTEM WITH PRODUCTION SYSTEM
if (window.precomputedReader) {
    console.log('🔄 Replacing mock precomputed reader with production version...');
}

window.precomputedReader = new ProductionPrecomputedReader();

// 🚀 PRODUCTION CONVENIENCE FUNCTIONS
window.setPrecomputedDevelopmentMode = (enabled = true) => {
    window.precomputedReader.setDevelopmentMode(enabled);
};

window.setPrecomputedProductionMode = () => {
    window.precomputedReader.setProductionMode();
};

window.getPrecomputedStatus = () => {
    return window.precomputedReader.getStatus();
};

// 🚨 DEFAULT TO PRODUCTION MODE (No mock fallbacks)
window.precomputedReader.setProductionMode();

console.log('🚀 Production-ready precomputed system loaded - Firebase only, no mock fallbacks');