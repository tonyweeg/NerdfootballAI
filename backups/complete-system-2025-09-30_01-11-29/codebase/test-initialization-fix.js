// Test Firebase Initialization Fix
const puppeteer = require('puppeteer');

async function testInitializationFix() {
    console.log('🔧 Testing Firebase Initialization Fixes...');
    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Log console messages with timestamps
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        const timestamp = new Date().toISOString().slice(11, 19);
        
        // Only log relevant messages
        if (text.includes('ESPN') || text.includes('Firebase') || text.includes('Score') || 
            text.includes('Functions') || text.includes('initialized') || type === 'error') {
            console.log(`[${timestamp}][${type.toUpperCase()}] ${text}`);
        }
    });
    
    try {
        // Load the production site
        await page.goto('https://nerdfootball.web.app', { waitUntil: 'networkidle0' });
        
        // Wait for full initialization (give it time for all the setTimeout delays)
        console.log('⏳ Waiting for full initialization...');
        await page.waitForTimeout ? await page.waitForTimeout(5000) : await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check initialization status
        const status = await page.evaluate(() => {
            return {
                firebaseFunctions: typeof window.functions !== 'undefined',
                firebaseDb: typeof window.db !== 'undefined',
                espnApi: typeof window.espnApi !== 'undefined' && window.espnApi !== null,
                espnScoreSync: typeof window.espnScoreSync !== 'undefined' && window.espnScoreSync !== null,
                liveGameRefresh: typeof window.liveGameRefresh !== 'undefined' && window.liveGameRefresh !== null
            };
        });
        
        console.log('\n📊 Initialization Status:');
        console.log(`   Firebase Functions: ${status.firebaseFunctions ? '✅' : '❌'}`);
        console.log(`   Firebase DB: ${status.firebaseDb ? '✅' : '❌'}`);
        console.log(`   ESPN API Client: ${status.espnApi ? '✅' : '❌'}`);
        console.log(`   ESPN Score Sync: ${status.espnScoreSync ? '✅' : '❌'}`);
        console.log(`   Live Game Refresh: ${status.liveGameRefresh ? '✅' : '❌'}`);
        
        // Test ESPN API functionality if it's initialized
        if (status.espnApi) {
            console.log('\n🧪 Testing ESPN API functionality...');
            const apiTest = await page.evaluate(async () => {
                try {
                    const currentWeek = window.espnApi.getCurrentWeek();
                    const statusResult = await window.espnApi.getApiStatus();
                    return {
                        success: true,
                        currentWeek: currentWeek,
                        apiStatus: statusResult
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            });
            
            if (apiTest.success) {
                console.log(`✅ ESPN API Working: Week ${apiTest.currentWeek}, Status: ${apiTest.apiStatus.status}`);
            } else {
                console.error(`❌ ESPN API Error: ${apiTest.error}`);
            }
        }
        
        const allSystemsWorking = status.firebaseFunctions && status.firebaseDb && 
                                 status.espnApi && status.espnScoreSync && status.liveGameRefresh;
        
        if (allSystemsWorking) {
            console.log('\n🎉 ALL SYSTEMS WORKING! Initialization fixes successful.');
        } else {
            console.log('\n⚠️ Some systems still need attention.');
        }
        
        // Keep browser open briefly for manual inspection
        console.log('\n👀 Browser will close in 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        await browser.close();
        
    } catch (error) {
        console.error('Test failed:', error);
        await browser.close();
    }
}

testInitializationFix().catch(console.error);