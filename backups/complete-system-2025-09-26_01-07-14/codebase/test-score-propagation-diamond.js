// DIAMOND Level Score Propagation Test
// Tests ESPN API → Score Sync → Leaderboard Updates → UI Refresh flow

const puppeteer = require('puppeteer');

async function testScorePropagation() {
    console.log('💎 DIAMOND Level Score Propagation Test Starting...');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: true,
        args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    const page = await browser.newPage();
    
    // Set up comprehensive console logging
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        
        // Log all ESPN, Score, Sync, Leaderboard, and error messages
        if (text.includes('ESPN') || text.includes('Score') || text.includes('Sync') || 
            text.includes('Leaderboard') || text.includes('Live') || text.includes('Refresh') ||
            type === 'error' || type === 'warn') {
            const timestamp = new Date().toISOString().slice(11, 19);
            console.log(`[${timestamp}][${type.toUpperCase()}] ${text}`);
        }
    });
    
    try {
        // Navigate to production site (to test with real data)
        console.log('🌍 Loading NerdFootball production site...');
        await page.goto('https://nerdfootball.web.app', { waitUntil: 'networkidle0' });
        
        // Wait for Firebase initialization
        console.log('⏳ Waiting for Firebase initialization...');
        await page.waitForTimeout(5000);
        
        // Check system initialization
        const systemStatus = await page.evaluate(() => {
            return {
                espnApiClient: typeof window.espnApi !== 'undefined' && window.espnApi !== null,
                espnScoreSync: typeof window.EspnScoreSync !== 'undefined',
                liveGameRefresh: typeof window.LiveGameRefresh !== 'undefined',
                gameStateCache: typeof window.gameStateCache !== 'undefined' && window.gameStateCache !== null,
                firebase: typeof db !== 'undefined' && db !== null,
                updateLeaderboard: typeof updateLeaderboardSummary === 'function' || typeof window.updateLeaderboardSummary === 'function'
            };
        });
        
        console.log('📊 System Status Check:');
        Object.entries(systemStatus).forEach(([component, status]) => {
            console.log(`   ${status ? '✅' : '❌'} ${component}: ${status}`);
        });
        
        if (!systemStatus.espnApiClient) {
            throw new Error('ESPN API Client not initialized');
        }
        
        // Test 1: ESPN API Current Week Detection
        console.log('\n🧪 TEST 1: ESPN API Current Week Detection');
        const currentWeek = await page.evaluate(() => {
            if (window.espnApi && window.espnApi.getCurrentWeek) {
                return window.espnApi.getCurrentWeek();
            }
            return null;
        });
        console.log(`📅 Current Week Detected: ${currentWeek}`);
        
        if (currentWeek < 1 || currentWeek > 18) {
            console.warn(`⚠️ Current week (${currentWeek}) seems out of range`);
        }
        
        // Test 2: ESPN API Game Fetch
        console.log('\n🧪 TEST 2: ESPN API Game Fetch');
        const gamesResult = await page.evaluate(async (week) => {
            try {
                if (!window.espnApi) return { error: 'ESPN API not available' };
                
                console.log(`Fetching games for Week ${week}...`);
                const games = await window.espnApi.getWeekGames(week, true); // Force refresh
                
                return {
                    success: true,
                    gameCount: games ? games.length : 0,
                    firstGame: games && games.length > 0 ? {
                        id: games[0].id,
                        away: games[0].a,
                        home: games[0].h,
                        winner: games[0].winner
                    } : null
                };
            } catch (error) {
                return { error: error.message };
            }
        }, currentWeek);
        
        if (gamesResult.error) {
            console.error(`❌ ESPN API Error: ${gamesResult.error}`);
        } else {
            console.log(`✅ ESPN API Success: ${gamesResult.gameCount} games fetched`);
            if (gamesResult.firstGame) {
                console.log(`   Sample Game: ${gamesResult.firstGame.away} @ ${gamesResult.firstGame.home} (Winner: ${gamesResult.firstGame.winner || 'TBD'})`);
            }
        }
        
        // Test 3: ESPN Score Sync Creation and Manual Sync
        console.log('\n🧪 TEST 3: ESPN Score Sync System');
        const syncResult = await page.evaluate(async (week) => {
            try {
                if (!window.EspnScoreSync) return { error: 'EspnScoreSync class not available' };
                if (!window.espnApi) return { error: 'ESPN API not available' };
                if (!window.gameStateCache) return { error: 'Game State Cache not available' };
                if (!db) return { error: 'Firebase DB not available' };
                
                console.log('Creating ESPN Score Sync instance...');
                const scoreSync = new EspnScoreSync(db, window.espnApi, window.gameStateCache);
                
                console.log(`Testing manual sync for Week ${week}...`);
                const result = await scoreSync.syncWeekScores(week);
                
                return {
                    success: result.success,
                    updatedCount: result.updatedCount || 0,
                    totalGames: result.totalGames || 0,
                    message: result.message || 'No message'
                };
            } catch (error) {
                return { error: error.message };
            }
        }, currentWeek);
        
        if (syncResult.error) {
            console.error(`❌ Score Sync Error: ${syncResult.error}`);
        } else if (syncResult.success) {
            console.log(`✅ Score Sync Success: ${syncResult.updatedCount}/${syncResult.totalGames} games updated`);
            console.log(`   Message: ${syncResult.message}`);
        } else {
            console.warn(`⚠️ Score Sync Warning: ${syncResult.message}`);
        }
        
        // Test 4: Live Game Refresh System
        console.log('\n🧪 TEST 4: Live Game Refresh System');
        const liveRefreshResult = await page.evaluate(async (week) => {
            try {
                if (!window.LiveGameRefresh) return { error: 'LiveGameRefresh class not available' };
                
                console.log('Creating Live Game Refresh instance...');
                const liveRefresh = new LiveGameRefresh();
                
                console.log('Checking for live games...');
                const hasLive = await liveRefresh.hasLiveGames(week);
                
                console.log('Getting refresh system status...');
                const status = liveRefresh.getStatus();
                
                return {
                    success: true,
                    hasLiveGames: hasLive,
                    status: status
                };
            } catch (error) {
                return { error: error.message };
            }
        }, currentWeek);
        
        if (liveRefreshResult.error) {
            console.error(`❌ Live Refresh Error: ${liveRefreshResult.error}`);
        } else {
            console.log(`✅ Live Refresh System: Working`);
            console.log(`   Has Live Games: ${liveRefreshResult.hasLiveGames}`);
            console.log(`   Current Week: ${liveRefreshResult.status.currentWeek}`);
            console.log(`   Active: ${liveRefreshResult.status.isActive}`);
        }
        
        // Test 5: Leaderboard Update Function Availability
        console.log('\n🧪 TEST 5: Leaderboard Update Integration');
        const leaderboardTest = await page.evaluate(() => {
            const hasGlobalFunction = typeof window.updateLeaderboardSummary === 'function';
            const hasLocalFunction = typeof updateLeaderboardSummary === 'function';
            
            return {
                globalFunction: hasGlobalFunction,
                localFunction: hasLocalFunction,
                available: hasGlobalFunction || hasLocalFunction
            };
        });
        
        console.log(`✅ Leaderboard Update Function Available: ${leaderboardTest.available}`);
        console.log(`   Global: ${leaderboardTest.globalFunction}, Local: ${leaderboardTest.localFunction}`);
        
        // Test 6: End-to-End Integration Test
        console.log('\n🧪 TEST 6: End-to-End Integration');
        const e2eResult = await page.evaluate(async (week) => {
            try {
                // Create a complete flow test
                console.log('Starting end-to-end test...');
                
                // 1. Create systems
                const scoreSync = new EspnScoreSync(db, window.espnApi, window.gameStateCache);
                const liveRefresh = new LiveGameRefresh();
                
                // 2. Test score sync
                console.log('Testing score sync...');
                const syncResult = await scoreSync.syncWeekScores(week);
                
                // 3. Test cache invalidation
                console.log('Testing cache invalidation...');
                const cacheResult = window.gameStateCache ? 
                    window.gameStateCache.invalidateAfterDataUpdate('test_integration', week) : 0;
                
                // 4. Test leaderboard update trigger
                console.log('Testing leaderboard update...');
                let leaderboardResult = false;
                if (typeof window.updateLeaderboardSummary === 'function') {
                    await window.updateLeaderboardSummary();
                    leaderboardResult = true;
                } else if (typeof updateLeaderboardSummary === 'function') {
                    await updateLeaderboardSummary();
                    leaderboardResult = true;
                }
                
                return {
                    success: true,
                    syncWorked: syncResult.success,
                    cacheCleared: cacheResult > 0,
                    leaderboardUpdated: leaderboardResult,
                    details: {
                        syncUpdates: syncResult.updatedCount || 0,
                        cacheEntries: cacheResult,
                        syncMessage: syncResult.message
                    }
                };
            } catch (error) {
                return { error: error.message };
            }
        }, currentWeek);
        
        if (e2eResult.error) {
            console.error(`❌ End-to-End Test Error: ${e2eResult.error}`);
        } else {
            console.log(`🎯 END-TO-END TEST RESULTS:`);
            console.log(`   Overall Success: ${e2eResult.success}`);
            console.log(`   Score Sync: ${e2eResult.syncWorked ? '✅' : '❌'}`);
            console.log(`   Cache Clear: ${e2eResult.cacheCleared ? '✅' : '❌'}`);
            console.log(`   Leaderboard Update: ${e2eResult.leaderboardUpdated ? '✅' : '❌'}`);
            console.log(`   Details: ${e2eResult.details.syncUpdates} updates, ${e2eResult.details.cacheEntries} cache entries cleared`);
        }
        
        // Final Summary
        console.log('\n💎 DIAMOND LEVEL SCORE PROPAGATION TEST COMPLETE');
        console.log('🔍 Systems Status:');
        console.log(`   ESPN API: ${systemStatus.espnApiClient ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   Score Sync: ${!syncResult.error ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   Live Refresh: ${!liveRefreshResult.error ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   Leaderboard Integration: ${leaderboardTest.available ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   End-to-End Flow: ${e2eResult.success && !e2eResult.error ? '✅ WORKING' : '❌ FAILED'}`);
        
        const allSystemsWorking = systemStatus.espnApiClient && 
                                 !syncResult.error && 
                                 !liveRefreshResult.error && 
                                 leaderboardTest.available && 
                                 e2eResult.success && !e2eResult.error;
        
        if (allSystemsWorking) {
            console.log('\n🏆 ALL SYSTEMS OPERATIONAL - ESPN SCORE PROPAGATION FULLY FUNCTIONAL!');
        } else {
            console.log('\n⚠️ SOME SYSTEMS NEED ATTENTION - Check logs above for details');
        }
        
        // Keep browser open for manual inspection
        console.log('\n👀 Browser will remain open for manual inspection...');
        console.log('🔍 Check the browser console and network tab for more details');
        console.log('📝 Press Ctrl+C to exit when done');
        
        // Wait indefinitely
        await new Promise(() => {});
        
    } catch (error) {
        console.error('💥 Test Failed:', error);
        console.log('\n📋 Debug checklist:');
        console.log('   1. Is the Firebase emulator running?');
        console.log('   2. Are all scripts loaded properly?');
        console.log('   3. Is the ESPN API accessible?');
        console.log('   4. Check browser console for JavaScript errors');
    }
}

// Run the test
if (require.main === module) {
    testScorePropagation().catch(console.error);
}