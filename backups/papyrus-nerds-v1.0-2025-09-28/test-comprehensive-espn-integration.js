// Comprehensive QA Test for ESPN Data Integration
// Tests all enhanced data points and UI integration

const puppeteer = require('puppeteer');
const https = require('https');

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

async function testEspnDataIntegration() {
    console.log('🧪 COMPREHENSIVE ESPN DATA INTEGRATION QA TEST');
    console.log('===============================================');
    
    let browser;
    let testResults = {
        functionsApi: false,
        frontendApi: false,
        uiIntegration: false,
        dataDisplay: false,
        enhancedFeatures: false
    };
    
    try {
        // Test 1: Firebase Functions API
        console.log('\n1. 🔧 Testing Firebase Functions ESPN API...');
        try {
            const functionsResponse = await makeRequest('https://us-central1-nerdfootball.cloudfunctions.net/fetchCurrentWeekGames');
            
            if (functionsResponse && functionsResponse.length > 0) {
                const sampleGame = functionsResponse[0];
                console.log('✅ Functions API responding');
                
                // Check for enhanced data fields
                const hasWeather = sampleGame.weather !== undefined;
                const hasVenue = sampleGame.venue !== undefined;
                const hasTeamRecords = sampleGame.teamRecords !== undefined;
                const hasBroadcasts = sampleGame.broadcasts !== undefined;
                
                console.log(`   Weather data: ${hasWeather ? '✅' : '❌'}`);
                console.log(`   Venue data: ${hasVenue ? '✅' : '❌'}`);
                console.log(`   Team records: ${hasTeamRecords ? '✅' : '❌'}`);
                console.log(`   Broadcast data: ${hasBroadcasts ? '✅' : '❌'}`);
                
                if (hasWeather && hasVenue && hasTeamRecords && hasBroadcasts) {
                    testResults.functionsApi = true;
                    console.log('✅ Firebase Functions API - PASS');
                } else {
                    console.log('❌ Firebase Functions API - Missing enhanced data');
                }
            } else {
                console.log('❌ Firebase Functions API - No data returned');
            }
        } catch (error) {
            console.log('❌ Firebase Functions API Error:', error.message);
        }
        
        // Test 2: Frontend Integration
        console.log('\n2. 🌐 Testing Frontend ESPN Integration...');
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 720 },
            args: ['--no-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('ESPN') || text.includes('enhanced') || text.includes('weather')) {
                console.log('   Browser:', text);
            }
        });
        
        // Navigate to application
        console.log('   Loading application...');
        await page.goto('https://nerdfootball.web.app', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait for authentication and data loading
        await page.waitForTimeout(3000);
        
        // Check if ESPN API is loaded
        const espnApiLoaded = await page.evaluate(() => {
            return typeof window.espnApi !== 'undefined' && 
                   typeof window.espnApi.getWeekGames === 'function';
        });
        
        console.log(`   ESPN API loaded: ${espnApiLoaded ? '✅' : '❌'}`);
        
        // Check if enhanced data display is loaded
        const enhancedDisplayLoaded = await page.evaluate(() => {
            return typeof window.addEnhancedGameData === 'function';
        });
        
        console.log(`   Enhanced display loaded: ${enhancedDisplayLoaded ? '✅' : '❌'}`);
        
        if (espnApiLoaded && enhancedDisplayLoaded) {
            testResults.frontendApi = true;
            console.log('✅ Frontend Integration - PASS');
        } else {
            console.log('❌ Frontend Integration - FAIL');
        }
        
        // Test 3: UI Integration
        console.log('\n3. 🎨 Testing UI Integration...');
        
        try {
            // Try to sign in or check if already signed in
            const isSignedIn = await page.evaluate(() => {
                return window.currentUser !== null;
            });
            
            if (!isSignedIn) {
                console.log('   Need to authenticate for full UI test');
                // For now, continue with what we can test
            }
            
            // Check if active picks section exists
            const activePicksExists = await page.$('#active-picks-section');
            console.log(`   Active picks section: ${activePicksExists ? '✅' : '❌'}`);
            
            // Check if game list exists
            const gameListExists = await page.$('#game-list');
            console.log(`   Game list section: ${gameListExists ? '✅' : '❌'}`);
            
            if (activePicksExists && gameListExists) {
                testResults.uiIntegration = true;
                console.log('✅ UI Integration - PASS');
            }
        } catch (error) {
            console.log('❌ UI Integration Error:', error.message);
        }
        
        // Test 4: Enhanced Data Display
        console.log('\n4. 📊 Testing Enhanced Data Display...');
        
        try {
            // Test ESPN API call
            const espnDataTest = await page.evaluate(async () => {
                try {
                    if (window.espnApi) {
                        const games = await window.espnApi.getWeekGames(1);
                        if (games && games.length > 0) {
                            const game = games[0];
                            return {
                                hasWeather: !!game.weather,
                                hasVenue: !!game.venue,
                                hasTeamRecords: !!game.teamRecords,
                                hasBroadcasts: !!game.broadcasts,
                                hasProbability: !!game.probability,
                                sampleData: {
                                    weather: game.weather,
                                    venue: game.venue?.name
                                }
                            };
                        }
                    }
                    return { error: 'ESPN API not available' };
                } catch (error) {
                    return { error: error.message };
                }
            });
            
            if (espnDataTest.error) {
                console.log('❌ ESPN Data Test Error:', espnDataTest.error);
            } else {
                console.log(`   Weather data: ${espnDataTest.hasWeather ? '✅' : '❌'}`);
                console.log(`   Venue data: ${espnDataTest.hasVenue ? '✅' : '❌'}`);
                console.log(`   Team records: ${espnDataTest.hasTeamRecords ? '✅' : '❌'}`);
                console.log(`   Broadcast data: ${espnDataTest.hasBroadcasts ? '✅' : '❌'}`);
                
                if (espnDataTest.sampleData.weather) {
                    console.log(`   Sample weather: ${espnDataTest.sampleData.weather.temperature}°F`);
                }
                if (espnDataTest.sampleData.venue) {
                    console.log(`   Sample venue: ${espnDataTest.sampleData.venue}`);
                }
                
                if (espnDataTest.hasWeather && espnDataTest.hasVenue) {
                    testResults.dataDisplay = true;
                    console.log('✅ Enhanced Data Display - PASS');
                } else {
                    console.log('❌ Enhanced Data Display - Missing data');
                }
            }
        } catch (error) {
            console.log('❌ Enhanced Data Display Error:', error.message);
        }
        
        // Test 5: Enhanced Features
        console.log('\n5. ⚡ Testing Enhanced Features...');
        
        try {
            // Test if enhanced game data function works
            const enhancedFeaturesTest = await page.evaluate(() => {
                // Check if all enhanced features are available
                const hasEspnScoreSync = typeof window.EspnScoreSync !== 'undefined';
                const hasGameStateCache = typeof window.GameStateCache !== 'undefined';
                const hasEnhancedDisplay = typeof window.addEnhancedGameData === 'function';
                
                return {
                    espnScoreSync: hasEspnScoreSync,
                    gameStateCache: hasGameStateCache,
                    enhancedDisplay: hasEnhancedDisplay
                };
            });
            
            console.log(`   ESPN Score Sync: ${enhancedFeaturesTest.espnScoreSync ? '✅' : '❌'}`);
            console.log(`   Game State Cache: ${enhancedFeaturesTest.gameStateCache ? '✅' : '❌'}`);
            console.log(`   Enhanced Display: ${enhancedFeaturesTest.enhancedDisplay ? '✅' : '❌'}`);
            
            if (enhancedFeaturesTest.espnScoreSync && 
                enhancedFeaturesTest.gameStateCache && 
                enhancedFeaturesTest.enhancedDisplay) {
                testResults.enhancedFeatures = true;
                console.log('✅ Enhanced Features - PASS');
            } else {
                console.log('❌ Enhanced Features - FAIL');
            }
        } catch (error) {
            console.log('❌ Enhanced Features Error:', error.message);
        }
        
    } catch (error) {
        console.log('❌ Critical Test Error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    // Final Results
    console.log('\n🎯 COMPREHENSIVE TEST RESULTS');
    console.log('==============================');
    
    const passed = Object.values(testResults).filter(Boolean).length;
    const total = Object.keys(testResults).length;
    
    Object.entries(testResults).forEach(([test, result]) => {
        console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
    });
    
    console.log(`\n📊 Overall Score: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 ALL TESTS PASSED - ESPN Data Integration is ready for production!');
    } else {
        console.log('⚠️  Some tests failed - Review and fix issues before production use');
    }
    
    return testResults;
}

// Run the comprehensive test
testEspnDataIntegration().then(results => {
    console.log('\n✅ Comprehensive ESPN Data Integration QA Test Complete');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});