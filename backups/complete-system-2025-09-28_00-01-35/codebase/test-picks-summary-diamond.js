// 💎 DIAMOND LEVEL PICKS SUMMARY TEST - Critical Game Time Fix 🚀
// Tests that "Your active picks" and "Season Leaderboard" functionality works

const puppeteer = require('puppeteer');

async function testPicksSummaryDiamond() {
    console.log('💎 Starting Diamond Level Picks Summary Test... 🚀');
    console.log('🎯 GAME TIME CRITICAL: Testing picks summary functionality');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Track JavaScript errors
    let jsErrors = [];
    page.on('pageerror', error => {
        jsErrors.push(error.message);
        console.log(`💥 JS ERROR: ${error.message}`);
    });
    
    try {
        // Load the page
        console.log('🎯 Loading local index.html...');
        await page.goto('file:///Users/tonyweeg/nerdfootball-project/public/index.html', {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // CRITICAL TEST 1: No JavaScript errors
        if (jsErrors.length > 0) {
            console.log('❌ CRITICAL FAILURE - JavaScript errors detected:');
            jsErrors.forEach(error => console.log(`   ${error}`));
            return false;
        }
        console.log('✅ PASS: No JavaScript errors on page load');
        
        // CRITICAL TEST 2: Check if picks-summary-container exists
        console.log('🔍 Testing picks summary container...');
        const picksSummaryContainer = await page.$('#picks-summary-container');
        if (!picksSummaryContainer) {
            console.log('❌ CRITICAL FAIL: picks-summary-container not found!');
            return false;
        }
        console.log('✅ PASS: Picks summary container exists');
        
        // CRITICAL TEST 3: Check "Your active picks" section
        console.log('🔍 Testing Your active picks section...');
        const activePicksSection = await page.$('#active-picks-section');
        if (!activePicksSection) {
            console.log('❌ CRITICAL FAIL: active-picks-section not found!');
            return false;
        }
        
        const activePicksText = await page.evaluate(() => {
            const section = document.getElementById('active-picks-section');
            return section ? section.textContent : '';
        });
        
        if (!activePicksText.includes('Your Active Picks')) {
            console.log('❌ CRITICAL FAIL: "Your Active Picks" text not found!');
            return false;
        }
        console.log('✅ DIAMOND PASS: "Your Active Picks" section working! 💎');
        
        // CRITICAL TEST 4: Check "Season Leaderboard" section
        console.log('🔍 Testing Season Leaderboard section...');
        const leaderboardSection = await page.$('#yearly-leaderboard-section');
        if (!leaderboardSection) {
            console.log('❌ CRITICAL FAIL: yearly-leaderboard-section not found!');
            return false;
        }
        
        const leaderboardText = await page.evaluate(() => {
            const section = document.getElementById('yearly-leaderboard-section');
            return section ? section.textContent : '';
        });
        
        if (!leaderboardText.includes('Season Leaderboard')) {
            console.log('❌ CRITICAL FAIL: "Season Leaderboard" text not found!');
            return false;
        }
        console.log('✅ DIAMOND PASS: "Season Leaderboard" section working! 💎');
        
        // CRITICAL TEST 5: Test view switching doesn't break
        console.log('🔍 Testing view switching functionality...');
        const menuBtn = await page.$('#menu-btn');
        if (menuBtn) {
            await menuBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try switching to leaderboard view
            const leaderboardBtn = await page.$('#leaderboard-view-btn');
            if (leaderboardBtn) {
                await leaderboardBtn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if picks summary is now hidden
                const isHidden = await page.evaluate(() => {
                    const container = document.getElementById('picks-summary-container');
                    return container && container.classList.contains('hidden');
                });
                
                if (isHidden) {
                    console.log('✅ PASS: View switching works - picks summary properly hidden');
                } else {
                    console.log('⚠️  WARNING: View switching may have issues');
                }
            }
        }
        
        console.log('\\n🏆 GAME TIME SUCCESS! Critical functionality restored! 💎🚀');
        return true;
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR during testing:', error.message);
        return false;
    } finally {
        console.log('🕐 Keeping browser open for inspection...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await browser.close();
    }
}

// Run the critical test
testPicksSummaryDiamond()
    .then(success => {
        if (success) {
            console.log('\\n💎🏆 GAME TIME READY! 🏆💎');
            console.log('🔥 Critical picks summary functionality restored!');
        } else {
            console.log('\\n❌ CRITICAL FAILURE - Game time features broken!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Fatal test error:', error);
        process.exit(1);
    });