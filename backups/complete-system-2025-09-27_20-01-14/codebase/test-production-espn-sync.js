// Test Production ESPN Score Sync
const puppeteer = require('puppeteer');

async function testProductionEspnSync() {
    console.log('🚀 Testing Production ESPN Score Sync...');
    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Log all console messages with timestamps
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        const timestamp = new Date().toISOString().slice(11, 19);
        
        // Focus on ESPN-related messages
        if (text.includes('ESPN') || text.includes('Score Sync') || text.includes('Firebase') || type === 'error') {
            console.log(`[${timestamp}][${type.toUpperCase()}] ${text}`);
        }
    });
    
    try {
        // Test production site
        console.log('🌐 Loading production site...');
        await page.goto('https://nerdfootball.web.app?view=admin', { waitUntil: 'networkidle0' });
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Check ESPN Score Sync status
        const syncStatus = await page.evaluate(() => {
            return {
                espnScoreSync: typeof window.espnScoreSync !== 'undefined',
                syncStatus: window.espnScoreSync ? window.espnScoreSync.syncStatus : null,
                firebaseUser: window.auth ? window.auth.currentUser !== null : false
            };
        });
        
        console.log('\\n📊 Production Status:');
        console.log(`   ESPN Score Sync: ${syncStatus.espnScoreSync ? '✅' : '❌'}`);
        console.log(`   Sync Status: ${syncStatus.syncStatus || 'Not available'}`);
        console.log(`   User Authenticated: ${syncStatus.firebaseUser ? '✅' : '❌'}`);
        
        // Test manual sync if available
        if (syncStatus.espnScoreSync && syncStatus.firebaseUser) {
            console.log('\\n🧪 Testing manual ESPN sync on production...');
            
            const syncTest = await page.evaluate(async () => {
                try {
                    // Try manual sync for Week 1
                    const result = await window.espnScoreSync.handleManualSync(1);
                    return {
                        success: true,
                        result: result
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            });
            
            if (syncTest.success) {
                console.log(`✅ Production sync test: SUCCESS`);
                console.log(`   Updated games: ${syncTest.result.updatedCount || 0}`);
                console.log(`   Total games: ${syncTest.result.totalGames || 0}`);
            } else {
                console.error(`❌ Production sync failed: ${syncTest.error}`);
            }
        } else {
            console.log('⚠️ Cannot test sync - either ESPN Score Sync not available or user not authenticated');
        }
        
        const isWorking = syncStatus.espnScoreSync && syncStatus.firebaseUser;
        
        if (isWorking) {
            console.log('\\n🎉 PRODUCTION ESPN SCORE SYNC WORKING!');
            console.log('🔄 Automatic sync will run every 5 minutes during game days.');
            console.log('📱 Live scores will appear in active picks section.');
        } else {
            console.log('\\n⚠️ Production sync needs attention.');
        }
        
        // Keep browser open for manual inspection
        console.log('\\n👀 Browser kept open. Check ESPN API admin tab.');
        console.log('Press Ctrl+C when done...');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('Production test failed:', error);
        await browser.close();
    }
}

testProductionEspnSync().catch(console.error);