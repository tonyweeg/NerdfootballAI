// Debug script to test ESPN data in picks area
const puppeteer = require('puppeteer');

async function debugPicksEspnData() {
    console.log('🔍 DEBUG: ESPN Data in Picks Area');
    console.log('=================================');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 720 },
            args: ['--no-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('ESPN') || text.includes('enhanced') || text.includes('picks') || text.includes('ERROR') || text.includes('currentWeek')) {
                console.log('🌐 Browser:', text);
            }
        });
        
        console.log('📱 Loading NerdFootball...');
        await page.goto('https://nerdfootball.web.app', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // Check if we can access the picks area
        const picksExists = await page.$('#game-list');
        console.log(`Picks area exists: ${picksExists ? '✅' : '❌'}`);
        
        if (picksExists) {
            // Check for ESPN data containers
            const espnContainers = await page.$$('[id^="picks-espn-data-"]');
            console.log(`ESPN data containers found: ${espnContainers.length}`);
            
            // Test ESPN API availability
            const espnApiTest = await page.evaluate(() => {
                return {
                    espnApiExists: typeof window.espnApi !== 'undefined',
                    addEnhancedGameDataToPicksExists: typeof window.addEnhancedGameDataToPicks === 'function',
                    currentWeekValue: typeof currentWeek !== 'undefined' ? currentWeek : 'undefined'
                };
            });
            
            console.log('ESPN API available:', espnApiTest.espnApiExists ? '✅' : '❌');
            console.log('Enhanced picks function available:', espnApiTest.addEnhancedGameDataToPicksExists ? '✅' : '❌');
            console.log('currentWeek variable:', espnApiTest.currentWeekValue);
            
            // Try to manually trigger the function
            if (espnApiTest.espnApiExists && espnApiTest.addEnhancedGameDataToPicksExists) {
                console.log('\n🧪 Testing manual ESPN data load...');
                
                const testResult = await page.evaluate(async () => {
                    try {
                        // Find a game container
                        const gameContainers = document.querySelectorAll('[id^="picks-espn-data-"]');
                        if (gameContainers.length > 0) {
                            console.log('Found', gameContainers.length, 'ESPN containers');
                            
                            // Test the function with a mock game
                            const mockGame = { id: '101', away: 'BUF', home: 'MIA' };
                            await window.addEnhancedGameDataToPicks('101', mockGame, 'SCHEDULED');
                            
                            return { success: true, containers: gameContainers.length };
                        } else {
                            return { success: false, error: 'No ESPN containers found' };
                        }
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                });
                
                console.log('Manual test result:', testResult);
                
                // Wait a moment and check for populated data
                await page.waitForTimeout(2000);
                
                const populatedContainers = await page.evaluate(() => {
                    const containers = document.querySelectorAll('[id^="picks-espn-data-"]');
                    let populated = 0;
                    containers.forEach(container => {
                        if (container.innerHTML.trim() && !container.innerHTML.includes('ESPN data will be populated here')) {
                            populated++;
                        }
                    });
                    return { total: containers.length, populated };
                });
                
                console.log(`Data populated: ${populatedContainers.populated}/${populatedContainers.total} containers`);
            }
        }
        
        // Keep browser open for manual inspection
        console.log('\n⏳ Browser staying open for manual inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.log('❌ Debug error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

debugPicksEspnData().then(() => {
    console.log('✅ Debug complete');
}).catch(error => {
    console.error('❌ Debug failed:', error);
});