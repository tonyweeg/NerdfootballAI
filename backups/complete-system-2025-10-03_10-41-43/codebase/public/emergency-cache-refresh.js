/**
 * 🚨 EMERGENCY CACHE REFRESH - Live Game Emergency Tool
 *
 * Use during live games when cache issues occur
 * Call: window.emergencyCacheRefresh()
 */

window.emergencyCacheRefresh = async function() {
    console.log('🚨 EMERGENCY CACHE REFRESH INITIATED');

    try {
        // Clear all browser caches
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ Browser storage cleared');

        // Clear gameStateCache if available
        if (window.gameStateCache) {
            window.gameStateCache.cache.clear();
            window.gameStateCache.memoryCache.clear();
            window.gameStateCache.weekStates.clear();
            console.log('✅ GameStateCache cleared');
        }

        // Clear ESPN cache if available
        if (window.espnCache) {
            window.espnCache.cache.clear();
            console.log('✅ ESPN cache cleared');
        }

        // Clear any core bundle caches
        if (window.coreBundle && window.coreBundle.cache) {
            window.coreBundle.cache.clear();
            console.log('✅ Core bundle cache cleared');
        }

        // Force page reload to get fresh data
        console.log('🔄 Forcing page reload with cache bypass...');
        window.location.reload(true);

    } catch (error) {
        console.error('❌ Emergency cache refresh failed:', error);
        // Force hard reload as fallback
        window.location.href = window.location.href + '?t=' + Date.now();
    }
};

// Also provide quick access
window.clearCache = window.emergencyCacheRefresh;

console.log('🚨 Emergency cache refresh tool loaded - Use: window.emergencyCacheRefresh()');