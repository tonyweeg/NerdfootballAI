// Test ESPN Score Sync Fix
const puppeteer = require('puppeteer');

async function testEspnSyncFix() {
    console.log('🔧 Testing ESPN Score Sync Fix...');
    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Log all console messages with timestamps
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        const timestamp = new Date().toISOString().slice(11, 19);
        console.log(`[${timestamp}][${type.toUpperCase()}] ${text}`);
    });
    
    try {
        // Load the local emulator version
        await page.goto('http://localhost:5002?view=admin', { waitUntil: 'networkidle0' });
        
        // Wait for full initialization
        console.log('⏳ Waiting for full Firebase and ESPN initialization...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check ESPN Score Sync initialization
        const syncStatus = await page.evaluate(() => {
            return {
                firebaseGlobals: {
                    db: typeof window.db !== 'undefined',
                    functions: typeof window.functions !== 'undefined',
                    getDoc: typeof window.getDoc !== 'undefined',
                    setDoc: typeof window.setDoc !== 'undefined',
                    doc: typeof window.doc !== 'undefined'
                },
                espnApi: typeof window.espnApi !== 'undefined' && window.espnApi !== null,
                espnScoreSync: typeof window.espnScoreSync !== 'undefined' && window.espnScoreSync !== null,
                espnSyncStatus: window.espnScoreSync ? window.espnScoreSync.syncStatus : null
            };
        });
        
        console.log('\n📊 Initialization Status:');
        console.log(`   Firebase DB: ${syncStatus.firebaseGlobals.db ? '✅' : '❌'}`);
        console.log(`   Firebase Functions: ${syncStatus.firebaseGlobals.functions ? '✅' : '❌'}`);
        console.log(`   Firestore getDoc: ${syncStatus.firebaseGlobals.getDoc ? '✅' : '❌'}`);
        console.log(`   Firestore setDoc: ${syncStatus.firebaseGlobals.setDoc ? '✅' : '❌'}`);
        console.log(`   Firestore doc: ${syncStatus.firebaseGlobals.doc ? '✅' : '❌'}`);
        console.log(`   ESPN API Client: ${syncStatus.espnApi ? '✅' : '❌'}`);
        console.log(`   ESPN Score Sync: ${syncStatus.espnScoreSync ? '✅' : '❌'}`);
        console.log(`   Sync Status: ${syncStatus.espnSyncStatus || 'Not available'}`);
        
        // Test manual ESPN sync
        if (syncStatus.espnScoreSync) {
            console.log('\n🧪 Testing manual ESPN sync...');
            
            const syncTest = await page.evaluate(async () => {
                try {
                    // Try to sync Week 1 scores
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
                console.log(`✅ Manual sync test: ${JSON.stringify(syncTest.result, null, 2)}`);
            } else {
                console.error(`❌ Manual sync failed: ${syncTest.error}`);
            }
        }
        
        const allSystemsWorking = syncStatus.firebaseGlobals.db && 
                                 syncStatus.firebaseGlobals.functions &&
                                 syncStatus.firebaseGlobals.getDoc &&
                                 syncStatus.firebaseGlobals.setDoc &&
                                 syncStatus.firebaseGlobals.doc &&
                                 syncStatus.espnApi && 
                                 syncStatus.espnScoreSync;
        
        if (allSystemsWorking) {
            console.log('\n🎉 ALL SYSTEMS WORKING! ESPN Score Sync fix successful.');
        } else {
            console.log('\n⚠️ Some systems still need attention.');
        }
        
        // Keep browser open for manual inspection
        console.log('\n👀 Browser kept open for inspection. Check admin ESPN API tab.');
        console.log('Press Ctrl+C to close when done inspecting...');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('Test failed:', error);
        await browser.close();
    }
}

testEspnSyncFix().catch(console.error);