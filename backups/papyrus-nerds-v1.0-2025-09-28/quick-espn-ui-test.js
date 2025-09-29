// Quick ESPN UI Integration Test
const puppeteer = require('puppeteer');

async function quickEspnUiTest() {
    console.log('🧪 Quick ESPN UI Integration Test');
    console.log('===================================');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        console.log('📱 Loading NerdFootball app...');
        await page.goto('https://nerdfootball.web.app', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Test 1: Check if ESPN API is loaded
        const espnApiLoaded = await page.evaluate(() => {
            return typeof window.espnApi !== 'undefined';
        });
        console.log(`ESPN API loaded: ${espnApiLoaded ? '✅' : '❌'}`);
        
        // Test 2: Check if enhanced display is loaded
        const enhancedDisplayLoaded = await page.evaluate(() => {
            return typeof window.addEnhancedGameData === 'function';
        });
        console.log(`Enhanced display loaded: ${enhancedDisplayLoaded ? '✅' : '❌'}`);
        
        // Test 3: Check if ESPN Score Sync is loaded
        const espnScoreSyncLoaded = await page.evaluate(() => {
            return typeof window.EspnScoreSync !== 'undefined';
        });
        console.log(`ESPN Score Sync loaded: ${espnScoreSyncLoaded ? '✅' : '❌'}`);
        
        // Test 4: Try ESPN API call
        const espnApiTest = await page.evaluate(async () => {
            try {
                if (window.espnApi) {
                    const games = await window.espnApi.getWeekGames(1);
                    if (games && games.length > 0) {
                        const game = games[0];
                        return {
                            success: true,
                            hasWeather: !!game.weather,
                            hasVenue: !!game.venue,
                            hasTeamRecords: !!game.teamRecords,
                            hasBroadcasts: !!game.broadcasts,
                            sampleWeather: game.weather?.temperature,
                            sampleVenue: game.venue?.name
                        };
                    }
                }
                return { success: false, error: 'No games returned' };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        if (espnApiTest.success) {
            console.log('ESPN API call: ✅');
            console.log(`  Weather data: ${espnApiTest.hasWeather ? '✅' : '❌'}`);
            console.log(`  Venue data: ${espnApiTest.hasVenue ? '✅' : '❌'}`);
            console.log(`  Team records: ${espnApiTest.hasTeamRecords ? '✅' : '❌'}`);
            console.log(`  Broadcasts: ${espnApiTest.hasBroadcasts ? '✅' : '❌'}`);
            
            if (espnApiTest.sampleWeather) {
                console.log(`  Sample temp: ${espnApiTest.sampleWeather}°F`);
            }
            if (espnApiTest.sampleVenue) {
                console.log(`  Sample venue: ${espnApiTest.sampleVenue}`);
            }
        } else {
            console.log(`ESPN API call: ❌ (${espnApiTest.error})`);
        }
        
        const allPassed = espnApiLoaded && 
                         enhancedDisplayLoaded && 
                         espnScoreSyncLoaded && 
                         espnApiTest.success;
        
        console.log('\n🎯 Summary:');
        console.log(`Overall status: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
        
        return allPassed;
        
    } catch (error) {
        console.log('❌ Test error:', error.message);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

quickEspnUiTest().then(success => {
    console.log(`\n${success ? '🎉' : '⚠️'} Quick ESPN UI test ${success ? 'passed' : 'failed'}`);
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});