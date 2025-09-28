// Test ESPN Data Structure to see if probability data is available
const puppeteer = require('puppeteer');

async function testEspnDataStructure() {
    console.log('🔍 Testing ESPN Data Structure...');
    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Load production site
        await page.goto('https://nerdfootball.web.app?view=admin', { waitUntil: 'networkidle0' });
        
        // Wait for ESPN API to initialize
        await page.waitForFunction(() => {
            return typeof window.espnApi !== 'undefined' && window.espnApi !== null;
        }, { timeout: 10000 });
        
        console.log('✅ ESPN API loaded, testing data structure...');
        
        // Test ESPN API data structure
        const espnData = await page.evaluate(async () => {
            try {
                // Force refresh to get fresh data
                const games = await window.espnApi.getWeekGames(1, true);
                
                return {
                    success: true,
                    gameCount: games.length,
                    sampleGame: games[0], // Get full structure of first game
                    gameKeys: games[0] ? Object.keys(games[0]) : [],
                    allGames: games.slice(0, 3) // Get first 3 games for comparison
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        
        if (espnData.success) {
            console.log('\\n📊 ESPN API Data Structure:');
            console.log(`Games found: ${espnData.gameCount}`);
            console.log('\\n🎯 Sample Game Data:');
            console.log(JSON.stringify(espnData.sampleGame, null, 2));
            console.log('\\n🔑 Available Keys:', espnData.gameKeys);
            
            // Check specifically for probability data
            const hasProbability = espnData.gameKeys.some(key => 
                key.toLowerCase().includes('prob') || 
                key.toLowerCase().includes('chance') ||
                key.toLowerCase().includes('odds') ||
                key.toLowerCase().includes('favorite')
            );
            
            console.log(`\\n🎲 Probability Data Available: ${hasProbability ? '✅ YES' : '❌ NO'}`);
            
            if (hasProbability) {
                const probFields = espnData.gameKeys.filter(key => 
                    key.toLowerCase().includes('prob') || 
                    key.toLowerCase().includes('chance') ||
                    key.toLowerCase().includes('odds') ||
                    key.toLowerCase().includes('favorite')
                );
                console.log(`🎯 Probability Fields: ${probFields.join(', ')}`);
            }
            
        } else {
            console.error('❌ Failed to get ESPN data:', espnData.error);
        }
        
        // Keep browser open for inspection
        console.log('\\n👀 Browser kept open for manual inspection...');
        console.log('Press Ctrl+C to close');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('Test failed:', error);
        await browser.close();
    }
}

testEspnDataStructure().catch(console.error);