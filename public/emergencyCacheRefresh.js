// 🚨 EMERGENCY CACHE REFRESH SYSTEM FOR LIVE GAMES
// Diamond Level emergency cache clearing for live game situations

class EmergencyCacheRefresh {
    constructor() {
        this.isRefreshing = false;
        this.lastRefresh = null;
    }

    // 🚨 MAIN EMERGENCY FUNCTION - Call this during live game issues
    async performEmergencyRefresh() {
        if (this.isRefreshing) {
            console.log('🚨 Emergency refresh already in progress...');
            return;
        }

        this.isRefreshing = true;
        console.log('🚨 STARTING EMERGENCY CACHE REFRESH - Live Game Situation');

        try {
            // Step 1: Clear all client-side caches
            this.clearAllClientCaches();

            // Step 2: Call Firebase cache clearing function
            await this.clearFirebaseCaches();

            // Step 3: Force refresh ESPN data
            await this.forceRefreshEspnData();

            // Step 4: Clear browser caches and refresh page elements
            this.refreshPageElements();

            console.log('✅ EMERGENCY REFRESH COMPLETE - Site should work properly now');
            this.lastRefresh = new Date();

        } catch (error) {
            console.error('❌ Emergency refresh failed:', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    // Clear all client-side caches
    clearAllClientCaches() {
        console.log('🧹 Clearing all client-side caches...');

        // Clear gameStateCache if it exists
        if (window.gameStateCache) {
            window.gameStateCache.emergencyClearAllCaches();
        }

        // Clear any other global caches
        if (window.allScheduleData) {
            delete window.allScheduleData;
            console.log('🗑️ Cleared window.allScheduleData');
        }

        if (window.allUserData) {
            delete window.allUserData;
            console.log('🗑️ Cleared window.allUserData');
        }

        // Clear any ESPN cache objects
        if (window.espnCacheManager) {
            if (typeof window.espnCacheManager.clearAllCaches === 'function') {
                window.espnCacheManager.clearAllCaches();
                console.log('🗑️ Cleared ESPN cache manager');
            }
        }

        console.log('✅ Client-side cache clearing complete');
    }

    // Call Firebase cache clearing function
    async clearFirebaseCaches() {
        console.log('☁️ Clearing Firebase caches...');

        try {
            if (typeof firebase !== 'undefined' && firebase.functions) {
                const functions = firebase.functions();
                const clearCaches = functions.httpsCallable('clearAllCaches');

                const result = await clearCaches();
                console.log('✅ Firebase caches cleared:', result.data);
                return result.data;
            } else {
                console.log('⚠️ Firebase functions not available, skipping server cache clear');
            }
        } catch (error) {
            console.error('❌ Firebase cache clear failed:', error);
        }
    }

    // Force refresh ESPN data
    async forceRefreshEspnData() {
        console.log('🔄 Force refreshing ESPN data...');

        try {
            if (typeof firebase !== 'undefined' && firebase.functions) {
                const functions = firebase.functions();
                const forceRefresh = functions.httpsCallable('forceRefreshEspnData');

                const result = await forceRefresh();
                console.log('✅ ESPN data force refreshed:', result.data);
                return result.data;
            } else {
                console.log('⚠️ Firebase functions not available, skipping ESPN refresh');
            }
        } catch (error) {
            console.error('❌ ESPN force refresh failed:', error);
        }
    }

    // Refresh critical page elements
    refreshPageElements() {
        console.log('🔄 Refreshing page elements...');

        // Force refresh any visible game data
        const gameElements = document.querySelectorAll('[data-game-id], .game-row, .team-score');
        gameElements.forEach(element => {
            element.style.opacity = '0.5';
            setTimeout(() => {
                element.style.opacity = '1';
            }, 100);
        });

        // Trigger any refresh functions that might exist
        if (window.refreshAllData && typeof window.refreshAllData === 'function') {
            console.log('🔄 Calling window.refreshAllData()');
            window.refreshAllData();
        }

        if (window.loadPicksSummary && typeof window.loadPicksSummary === 'function') {
            console.log('🔄 Refreshing picks summary');
            setTimeout(() => window.loadPicksSummary(), 500);
        }

        if (window.displayCurrentGames && typeof window.displayCurrentGames === 'function') {
            console.log('🔄 Refreshing current games display');
            setTimeout(() => window.displayCurrentGames(), 1000);
        }

        console.log('✅ Page elements refresh complete');
    }

    // Add emergency button to page for easy access
    addEmergencyButton() {
        if (document.getElementById('emergency-refresh-btn')) {
            return; // Button already exists
        }

        const button = document.createElement('button');
        button.id = 'emergency-refresh-btn';
        button.innerHTML = '🚨 Emergency Cache Refresh';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            background: #ff4444;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;

        button.onclick = () => {
            if (confirm('Clear all caches and refresh data? This will fix live game issues.')) {
                this.performEmergencyRefresh();
            }
        };

        document.body.appendChild(button);
        console.log('🚨 Emergency refresh button added to page');
    }

    // Check if emergency refresh is needed (call this periodically)
    shouldTriggerEmergencyRefresh() {
        // Check if we're in a live game window (Thursday-Monday during NFL season)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const isGameDay = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 4; // Sun, Mon, Thu

        // Check if it's been more than 5 minutes since last refresh during game days
        if (isGameDay && this.lastRefresh) {
            const timeSinceRefresh = now - this.lastRefresh;
            const fiveMinutes = 5 * 60 * 1000;

            if (timeSinceRefresh > fiveMinutes) {
                console.log('ℹ️ Auto-triggering cache refresh for live game day');
                return true;
            }
        }

        return false;
    }

    // Initialize emergency system
    initialize() {
        console.log('🚨 Emergency Cache Refresh System initialized');

        // Add emergency button in development or when URL contains 'debug'
        if (window.location.hostname === 'localhost' || window.location.search.includes('debug')) {
            this.addEmergencyButton();
        }

        // Check every 2 minutes during potential game times
        setInterval(() => {
            if (this.shouldTriggerEmergencyRefresh()) {
                this.performEmergencyRefresh();
            }
        }, 2 * 60 * 1000);
    }
}

// Create global emergency system
window.emergencyCacheRefresh = window.emergencyCacheRefresh || new EmergencyCacheRefresh();

// Initialize when DOM is ready with defensive error handling
function initializeEmergencySystem(retryCount = 0) {
    const maxRetries = 10;

    try {
        if (window.emergencyCacheRefresh && typeof window.emergencyCacheRefresh.initialize === 'function') {
            window.emergencyCacheRefresh.initialize();
        } else if (retryCount < maxRetries) {
            console.warn(`Emergency cache refresh system not ready for initialization (attempt ${retryCount + 1}/${maxRetries})`);
            // Retry after a short delay with increasing intervals
            setTimeout(() => initializeEmergencySystem(retryCount + 1), 100 * (retryCount + 1));
        } else {
            console.error('Emergency cache refresh system failed to initialize after maximum retries');
        }
    } catch (error) {
        console.warn('Error initializing emergency cache refresh system:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEmergencySystem);
} else {
    initializeEmergencySystem();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmergencyCacheRefresh;
}