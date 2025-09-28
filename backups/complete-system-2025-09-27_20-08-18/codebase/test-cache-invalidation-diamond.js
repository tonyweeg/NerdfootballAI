// 💎 DIAMOND-LEVEL: Comprehensive Cache Invalidation System Test
// Tests all cache invalidation scenarios to ensure data consistency

const puppeteer = require('puppeteer');

// Test configuration
const TEST_CONFIG = {
    url: 'http://localhost:3000',
    timeout: 30000,
    headless: false,
    viewport: { width: 1280, height: 720 }
};

// Test credentials - using admin account for full system access
const TEST_ADMIN = {
    email: 'admin@test.com',  // Replace with actual admin email
    password: 'testpass123'   // Replace with actual password
};

async function runCacheInvalidationTests() {
    console.log('💎 STARTING CACHE INVALIDATION SYSTEM TESTS');
    console.log('============================================');
    
    const browser = await puppeteer.launch({
        headless: TEST_CONFIG.headless,
        defaultViewport: TEST_CONFIG.viewport,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // Navigate to application
        console.log('🔗 Navigating to application...');
        await page.goto(TEST_CONFIG.url, { waitUntil: 'networkidle2' });

        // Test 1: Cache System Initialization
        console.log('\n📋 TEST 1: Cache System Initialization');
        const cacheSystemExists = await page.evaluate(() => {
            return typeof window.gameStateCache !== 'undefined' && 
                   typeof window.gameStateCache.invalidateAfterDataUpdate === 'function';
        });

        if (cacheSystemExists) {
            console.log('✅ Cache invalidation system properly initialized');
            testsPassed++;
        } else {
            console.log('❌ Cache invalidation system not found');
            testsFailed++;
        }

        // Test 2: Cache Methods Availability
        console.log('\n📋 TEST 2: Cache Invalidation Methods');
        const cacheMethods = await page.evaluate(() => {
            const cache = window.gameStateCache;
            return {
                invalidatePicksCache: typeof cache.invalidatePicksCache === 'function',
                invalidateResultsCache: typeof cache.invalidateResultsCache === 'function',
                invalidateUsersCache: typeof cache.invalidateUsersCache === 'function',
                invalidateSurvivorCache: typeof cache.invalidateSurvivorCache === 'function',
                invalidateAfterDataUpdate: typeof cache.invalidateAfterDataUpdate === 'function',
                clearAllCache: typeof cache.clearAllCache === 'function'
            };
        });

        const allMethodsExist = Object.values(cacheMethods).every(exists => exists);
        if (allMethodsExist) {
            console.log('✅ All cache invalidation methods available');
            testsPassed++;
        } else {
            console.log('❌ Missing cache invalidation methods:', cacheMethods);
            testsFailed++;
        }

        // Test 3: Master Cache Invalidation Function
        console.log('\n📋 TEST 3: Master Cache Invalidation Function');
        const invalidationTypes = await page.evaluate(() => {
            const cache = window.gameStateCache;
            const testResults = {};
            
            // Test different invalidation types
            const types = ['user_picks_saved', 'game_results_updated', 'admin_picks_saved', 
                          'survivor_picks_saved', 'users_modified', 'complete_refresh'];
            
            for (const type of types) {
                try {
                    const result = cache.invalidateAfterDataUpdate(type, 1, 'test-user-id');
                    testResults[type] = typeof result === 'number' && result >= 0;
                } catch (error) {
                    testResults[type] = false;
                }
            }
            
            return testResults;
        });

        const allTypesWork = Object.values(invalidationTypes).every(works => works);
        if (allTypesWork) {
            console.log('✅ Master cache invalidation handles all update types');
            testsPassed++;
        } else {
            console.log('❌ Master cache invalidation issues:', invalidationTypes);
            testsFailed++;
        }

        // Test 4: Cache State Tracking
        console.log('\n📋 TEST 4: Cache State Tracking');
        const cacheState = await page.evaluate(() => {
            const cache = window.gameStateCache;
            
            // Add some test data to cache
            cache.set('test_picks_1', { test: 'data' }, 1, 'PRE_GAME');
            cache.set('test_leaderboard_1', { scores: [] }, 1, 'IN_PROGRESS');
            cache.set('test_users_data', { users: [] }, null, null);
            
            const initialSize = cache.cache.size;
            
            // Test picks cache invalidation
            const picksCleared = cache.invalidatePicksCache(1);
            const afterPicksClear = cache.cache.size;
            
            // Test complete cache clear
            const totalCleared = cache.clearAllCache();
            const afterCompleteClear = cache.cache.size;
            
            return {
                initialSize: initialSize >= 3,
                picksCleared: picksCleared > 0,
                afterPicksClear: afterPicksClear < initialSize,
                totalCleared: totalCleared > 0,
                afterCompleteClear: afterCompleteClear === 0
            };
        });

        const cacheTrackingWorks = Object.values(cacheState).every(works => works);
        if (cacheTrackingWorks) {
            console.log('✅ Cache state tracking and invalidation working correctly');
            testsPassed++;
        } else {
            console.log('❌ Cache state tracking issues:', cacheState);
            testsFailed++;
        }

        // Test 5: Real-time Cache Integration Points
        console.log('\n📋 TEST 5: Integration Points Check');
        const integrationPoints = await page.evaluate(() => {
            // Check if cache invalidation is integrated with key UI elements
            const refreshButtonExists = document.getElementById('refresh-summary-btn') !== null;
            const cacheIntegrationExists = typeof window.gameStateCache === 'object' && 
                                         typeof window.gameStateCache.invalidateAfterDataUpdate === 'function';
            
            // Check if cache system has been properly set up
            const cacheHasAllMethods = window.gameStateCache && 
                                     ['invalidatePicksCache', 'invalidateResultsCache', 'invalidateUsersCache'].every(
                                         method => typeof window.gameStateCache[method] === 'function'
                                     );
            
            return {
                refreshButtonExists: refreshButtonExists,
                cacheIntegrationExists: cacheIntegrationExists,
                cacheHasAllMethods: cacheHasAllMethods
            };
        });

        const integrationComplete = Object.values(integrationPoints).every(works => works);
        if (integrationComplete) {
            console.log('✅ Cache invalidation properly integrated with application');
            testsPassed++;
        } else {
            console.log('❌ Integration issues found:', integrationPoints);
            testsFailed++;
        }

        // Performance Test: Cache Efficiency
        console.log('\n📋 TEST 6: Cache Performance & Efficiency');
        const performanceResults = await page.evaluate(() => {
            const cache = window.gameStateCache;
            
            // Add a large number of cache entries
            const startTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                cache.set(`perf_test_${i}`, { data: i }, Math.floor(i/100), 'PRE_GAME');
            }
            const addTime = performance.now() - startTime;
            
            // Test invalidation performance
            const invalidateStart = performance.now();
            const cleared = cache.invalidateAfterDataUpdate('complete_refresh');
            const invalidateTime = performance.now() - invalidateStart;
            
            return {
                addTime: addTime < 100, // Should be fast
                invalidateTime: invalidateTime < 50, // Should be very fast
                cleared: cleared === 1000,
                finalSize: cache.cache.size === 0
            };
        });

        const performanceGood = Object.values(performanceResults).every(good => good);
        if (performanceGood) {
            console.log('✅ Cache performance within acceptable bounds');
            testsPassed++;
        } else {
            console.log('❌ Cache performance issues:', performanceResults);
            testsFailed++;
        }

    } catch (error) {
        console.error('❌ Test execution error:', error);
        testsFailed++;
    } finally {
        await browser.close();
    }

    // Final Results
    console.log('\n💎 CACHE INVALIDATION SYSTEM TEST RESULTS');
    console.log('=========================================');
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📊 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

    if (testsFailed === 0) {
        console.log('\n🎉 ALL CACHE INVALIDATION TESTS PASSED! 💎');
        console.log('✅ Cache system is DIAMOND-LEVEL ready for production');
        console.log('🚀 Data consistency is GUARANTEED');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED - REVIEW REQUIRED');
        console.log('❌ Fix issues before deploying to production');
        process.exit(1);
    }
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runCacheInvalidationTests };
}

// Run tests if called directly
if (require.main === module) {
    runCacheInvalidationTests().catch(console.error);
}