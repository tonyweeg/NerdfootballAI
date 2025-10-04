// ESPN CACHE PERFORMANCE TEST
// Tests the sub-500ms performance target for survivor pool loading

const puppeteer = require('puppeteer');

async function testESPNCachePerformance() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('🚀 Testing ESPN Cache Performance...');
        
        // Navigate to local server
        await page.goto('http://localhost:5003', { waitUntil: 'networkidle0' });
        
        // Wait for Firebase and cache manager to initialize
        await page.waitForFunction(() => window.espnCacheManager && window.db, { timeout: 10000 });
        
        console.log('✅ Page loaded and ESPN Cache Manager initialized');
        
        // Test cache status
        const cacheStatus = await page.evaluate(async () => {
            return await window.getESPNCacheStatus();
        });
        
        console.log('📊 Cache Status:', cacheStatus);
        
        // Initialize cache if needed
        if (!cacheStatus.exists || !cacheStatus.isFresh) {
            console.log('🏗️ Setting up ESPN cache...');
            const setupResult = await page.evaluate(async () => {
                return await window.setupESPNCache();
            });
            console.log('Setup Result:', setupResult);
        }
        
        // Test cache read performance
        console.log('⏱️ Testing cache read performance...');
        const performanceTest = await page.evaluate(async () => {
            const results = [];
            const teams = ['Patriots', 'Bills', 'Cowboys', 'Giants', 'Packers'];
            
            for (const team of teams) {
                const startTime = Date.now();
                const result = await window.espnCacheManager.getCachedTeamResult(team, 1);
                const endTime = Date.now();
                
                results.push({
                    team,
                    timeMs: endTime - startTime,
                    found: !!result
                });
            }
            
            return results;
        });
        
        console.log('🏁 Cache Performance Results:');
        performanceTest.forEach(result => {
            const status = result.found ? '✅ HIT' : '❌ MISS';
            console.log(`  ${result.team}: ${result.timeMs}ms ${status}`);
        });
        
        const avgTime = performanceTest.reduce((sum, r) => sum + r.timeMs, 0) / performanceTest.length;
        console.log(`📊 Average cache read time: ${avgTime.toFixed(1)}ms`);
        
        if (avgTime < 100) {
            console.log('🎯 TARGET MET: Cache reads under 100ms!');
        } else if (avgTime < 500) {
            console.log('⚠️ ACCEPTABLE: Cache reads under 500ms');
        } else {
            console.log('❌ TARGET MISSED: Cache reads over 500ms');
        }
        
        // Test survivor pool loading (if possible)
        console.log('🏃 Testing survivor pool loading...');
        
        // Navigate to survivor view
        await page.goto('http://localhost:5003?view=survivor', { waitUntil: 'networkidle0' });
        
        // Wait for survivor system to initialize
        await page.waitForFunction(() => window.simpleSurvivorSystem, { timeout: 5000 });
        
        // Test survivor table loading performance
        const survivorTest = await page.evaluate(async () => {
            const startTime = Date.now();
            
            try {
                const results = await window.simpleSurvivorSystem.getSurvivorTable('nerduniverse-2025');
                const endTime = Date.now();
                
                return {
                    success: true,
                    timeMs: endTime - startTime,
                    userCount: results.length
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    timeMs: Date.now() - startTime
                };
            }
        });
        
        console.log('🏆 Survivor Pool Loading Results:');
        if (survivorTest.success) {
            console.log(`  ✅ Loaded ${survivorTest.userCount} users in ${survivorTest.timeMs}ms`);
            
            if (survivorTest.timeMs < 500) {
                console.log('🎯 TARGET MET: Survivor pool loads in under 500ms!');
            } else if (survivorTest.timeMs < 2000) {
                console.log('⚠️ IMPROVEMENT: Much better than 14+ seconds, but not optimal');
            } else {
                console.log('❌ STILL SLOW: Loading over 2 seconds');
            }
        } else {
            console.log(`  ❌ Error: ${survivorTest.error} (${survivorTest.timeMs}ms)`);
        }
        
        console.log('🎯 Performance Test Complete!');
        
        return {
            cachePerformance: performanceTest,
            survivorPerformance: survivorTest,
            avgCacheTime: avgTime
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
testESPNCachePerformance()
    .then(results => {
        console.log('\n📊 FINAL RESULTS:');
        console.log(`Cache Performance: ${results.avgCacheTime.toFixed(1)}ms average`);
        console.log(`Survivor Loading: ${results.survivorPerformance.timeMs}ms for ${results.survivorPerformance.userCount || 0} users`);
        
        // Determine if we met our performance targets
        const cacheTarget = results.avgCacheTime < 100;
        const survivorTarget = results.survivorPerformance.success && results.survivorPerformance.timeMs < 500;
        
        if (cacheTarget && survivorTarget) {
            console.log('🏆 ALL TARGETS MET: ESPN cache system is working perfectly!');
        } else if (results.survivorPerformance.timeMs < 2000) {
            console.log('✅ MAJOR IMPROVEMENT: Survivor loading much faster than before');
        } else {
            console.log('⚠️ NEEDS WORK: Performance targets not met');
        }
    })
    .catch(error => {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
    });