// Test Firebase Functions Connectivity
const puppeteer = require('puppeteer');

async function testFunctionsConnectivity() {
    console.log('🔧 Testing Firebase Functions Connectivity...');
    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Log console messages
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        console.log(`[${type.toUpperCase()}] ${text}`);
    });
    
    try {
        // Load the production site
        await page.goto('https://nerdfootball.web.app', { waitUntil: 'networkidle0' });
        
        // Wait for Firebase initialization
        await page.waitForFunction(() => {
            return typeof db !== 'undefined' && typeof functions !== 'undefined';
        }, { timeout: 10000 });
        
        console.log('✅ Firebase initialized');
        
        // Test Firebase Functions availability
        const functionsTest = await page.evaluate(async () => {
            try {
                // Check if functions is available globally
                const functionsAvailable = typeof window.functions !== 'undefined';
                const httpsCallableAvailable = typeof window.httpsCallable !== 'undefined';
                
                if (!functionsAvailable) {
                    return { error: 'window.functions not available' };
                }
                
                if (!httpsCallableAvailable) {
                    return { error: 'window.httpsCallable not available' };
                }
                
                console.log('Testing ESPN API status function...');
                
                // Test calling the ESPN API status function
                const espnApiStatus = window.httpsCallable(window.functions, 'espnApiStatus');
                const result = await espnApiStatus();
                
                return {
                    success: true,
                    functionsAvailable,
                    httpsCallableAvailable,
                    testResult: result.data
                };
            } catch (error) {
                return { 
                    error: error.message,
                    functionsAvailable: typeof window.functions !== 'undefined',
                    httpsCallableAvailable: typeof window.httpsCallable !== 'undefined'
                };
            }
        });
        
        console.log('\n📊 Firebase Functions Test Results:');
        if (functionsTest.error) {
            console.error(`❌ Error: ${functionsTest.error}`);
            console.log(`   Functions Available: ${functionsTest.functionsAvailable}`);
            console.log(`   HttpsCallable Available: ${functionsTest.httpsCallableAvailable}`);
        } else {
            console.log(`✅ Functions Available: ${functionsTest.functionsAvailable}`);
            console.log(`✅ HttpsCallable Available: ${functionsTest.httpsCallableAvailable}`);
            console.log(`✅ ESPN API Status: ${JSON.stringify(functionsTest.testResult, null, 2)}`);
        }
        
        // Test ESPN API client with fixed Functions
        if (functionsTest.success) {
            console.log('\n🧪 Testing ESPN API Client...');
            
            const espnApiTest = await page.evaluate(async () => {
                try {
                    if (!window.espnApi) {
                        return { error: 'ESPN API client not available' };
                    }
                    
                    console.log('Testing ESPN API current week...');
                    const currentWeek = window.espnApi.getCurrentWeek();
                    console.log(`Current week: ${currentWeek}`);
                    
                    console.log('Testing ESPN API games fetch...');
                    const games = await window.espnApi.getWeekGames(1, true); // Force refresh Week 1
                    
                    return {
                        success: true,
                        currentWeek,
                        gameCount: games ? games.length : 0,
                        firstGame: games && games.length > 0 ? games[0] : null
                    };
                } catch (error) {
                    return { error: error.message };
                }
            });
            
            if (espnApiTest.error) {
                console.error(`❌ ESPN API Error: ${espnApiTest.error}`);
            } else {
                console.log(`✅ ESPN API Current Week: ${espnApiTest.currentWeek}`);
                console.log(`✅ ESPN API Games Count: ${espnApiTest.gameCount}`);
                if (espnApiTest.firstGame) {
                    console.log(`✅ Sample Game: ${espnApiTest.firstGame.a} @ ${espnApiTest.firstGame.h}`);
                }
            }
        }
        
        console.log('\n🎯 Summary:');
        console.log(`Firebase Functions: ${functionsTest.success ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`ESPN API Integration: ${!functionsTest.error ? '✅ READY' : '❌ NEEDS FIX'}`);
        
        if (functionsTest.success) {
            console.log('\n🏆 ALL SYSTEMS GO! Firebase Functions are properly connected.');
            console.log('🔄 ESPN Score Sync should now work properly.');
        } else {
            console.log('\n⚠️ Firebase Functions need attention. Check the errors above.');
        }
        
        // Keep browser open for inspection
        console.log('\n👀 Browser kept open for inspection. Press Ctrl+C to exit.');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testFunctionsConnectivity().catch(console.error);