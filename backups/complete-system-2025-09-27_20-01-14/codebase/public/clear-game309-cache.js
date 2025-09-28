// EMERGENCY CACHE CLEAR - Fix Game 309 corruption
console.log('🚨 CLEARING ALL GAME CACHES - ESPN Field Matching Fix');

// Clear all possible cache layers
if (typeof localStorage !== 'undefined') {
    localStorage.clear();
    console.log('✅ localStorage cleared');
}

if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
}

// Clear gameStateCache if available
if (window.gameStateCache) {
    window.gameStateCache.clearAllCache();
    console.log('✅ gameStateCache cleared');
}

// Clear ESPN API cache if available
if (window.espnApi && window.espnApi.clearCache) {
    window.espnApi.clearCache();
    console.log('✅ ESPN API cache cleared');
}

// Clear any Week 3 specific caches
for (let i = 0; i < 50; i++) {
    const key = `week_3_cache_${i}`;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
}

// Clear ESPN mapping cache
for (let week = 1; week <= 18; week++) {
    localStorage.removeItem(`espn_week_${week}`);
    sessionStorage.removeItem(`espn_week_${week}`);
    localStorage.removeItem(`espn_cache_${week}`);
    sessionStorage.removeItem(`espn_cache_${week}`);
}

console.log('🎯 Cache clearing complete - ESPN field matching fix should now take effect');
console.log('💡 Refresh the page to load fresh data with correct Game 309 teams');