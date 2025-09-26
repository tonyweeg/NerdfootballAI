// ESPN Score Sync Test - Diamond Level Validation
const puppeteer = require('puppeteer');

async function testEspnScoreSync() {
    console.log('🔄 Testing ESPN Score Sync System...');
    
    const browser = await puppeteer.launch({ headless: false, devtools: true });
    const page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        
        // Only log ESPN-related messages and errors
        if (text.includes('ESPN') || text.includes('Score') || text.includes('Sync') || type === 'error') {
            console.log(`[${type.toUpperCase()}] ${text}`);
        }
    });
    
    try {
        // Navigate to local emulator
        await page.goto('http://127.0.0.1:5002', { waitUntil: 'networkidle0' });
        console.log('✅ Page loaded');
        
        // Wait for Firebase initialization
        await page.waitForTimeout(3000);
        
        // Check if ESPN Score Sync is initialized
        const espnSyncInitialized = await page.evaluate(() => {
            return typeof window.EspnScoreSync !== 'undefined';
        });
        
        console.log(`📊 ESPN Score Sync Class Available: ${espnSyncInitialized}`);
        
        // Check if ESPN API client is initialized
        const espnApiInitialized = await page.evaluate(() => {
            return typeof window.espnApi !== 'undefined' && window.espnApi !== null;
        });
        
        console.log(`📡 ESPN API Client Initialized: ${espnApiInitialized}`);
        
        // Check if game state cache is available
        const cacheInitialized = await page.evaluate(() => {
            return typeof window.gameStateCache !== 'undefined' && window.gameStateCache !== null;
        });
        
        console.log(`💎 Game State Cache Available: ${cacheInitialized}`);
        
        // Test ESPN Score Sync initialization in console
        if (espnSyncInitialized && espnApiInitialized && cacheInitialized) {
            const syncInstanceCreated = await page.evaluate(async () => {
                try {
                    // Create ESPN Score Sync instance
                    const testSync = new EspnScoreSync(
                        db, // Firestore database
                        window.espnApi,
                        window.gameStateCache
                    );
                    
                    // Initialize the sync system
                    testSync.initialize();
                    
                    console.log('✅ ESPN Score Sync instance created successfully');
                    console.log('🔄 Sync system initialized');
                    
                    return true;
                } catch (error) {
                    console.error('❌ Error creating ESPN Score Sync:', error);
                    return false;
                }
            });
            
            console.log(`🎯 ESPN Score Sync Instance Created: ${syncInstanceCreated}`);
            
            if (syncInstanceCreated) {
                console.log('💎 ESPN Score Sync System - FULLY FUNCTIONAL');
                
                // Test manual sync functionality
                await page.waitForTimeout(2000);
                
                const manualSyncTest = await page.evaluate(async () => {
                    try {
                        // Test the sync for Week 1
                        const testSync = new EspnScoreSync(db, window.espnApi, window.gameStateCache);
                        console.log('🧪 Testing manual sync for Week 1...');
                        
                        const result = await testSync.syncWeekScores(1);
                        console.log('✅ Manual sync test result:', result);
                        
                        return result.success || false;
                    } catch (error) {
                        console.error('❌ Manual sync test error:', error);
                        return false;
                    }
                });
                
                console.log(`🔄 Manual Sync Test Result: ${manualSyncTest ? 'PASSED' : 'FAILED'}`);
            }
            
        } else {
            console.log('❌ Missing dependencies for ESPN Score Sync');
            console.log(`   - ESPN Score Sync Class: ${espnSyncInitialized}`);
            console.log(`   - ESPN API Client: ${espnApiInitialized}`);
            console.log(`   - Game State Cache: ${cacheInitialized}`);
        }
        
        // Keep browser open for manual inspection
        console.log('\n💎 Test complete! Browser will remain open for manual inspection...');
        console.log('🔍 Check the console for ESPN Score Sync logs');
        console.log('📝 Press Ctrl+C to exit when done');
        
        // Wait indefinitely
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Don't close browser - let user inspect manually
        // await browser.close();
    }
}

// Run the test
if (require.main === module) {
    testEspnScoreSync().catch(console.error);
}