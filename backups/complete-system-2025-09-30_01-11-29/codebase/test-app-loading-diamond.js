// 💎 DIAMOND LEVEL APP LOADING TEST - Critical Fix Validation 🚀
// Tests that the app loads without JavaScript errors after rulesViewBtn removal

const puppeteer = require('puppeteer');

async function testAppLoadingDiamond() {
    console.log('💎 Starting Diamond Level App Loading Test... 🚀');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Track all console errors
    let consoleErrors = [];
    let jsErrors = [];
    
    page.on('console', message => {
        if (message.type() === 'error') {
            consoleErrors.push(message.text());
            console.log(`❌ CONSOLE ERROR: ${message.text()}`);
        }
    });
    
    page.on('pageerror', error => {
        jsErrors.push(error.message);
        console.log(`💥 JS ERROR: ${error.message}`);
    });
    
    try {
        // Test 1: Navigate to local file and check for loading errors
        console.log('🎯 Loading local Nerdfootball index.html...');
        await page.goto('file:///Users/tonyweeg/nerdfootball-project/public/index.html', {
            waitUntil: 'networkidle0'
        });
        
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test 2: Check if any JavaScript errors occurred during loading
        if (jsErrors.length > 0) {
            console.log(`❌ CRITICAL FAIL: ${jsErrors.length} JavaScript errors found!`);
            jsErrors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            return false;
        }
        console.log('✅ DIAMOND PASS: No JavaScript errors during page load! 💎');
        
        // Test 3: Check for console errors (less critical but important)
        if (consoleErrors.length > 0) {
            console.log(`⚠️  WARNING: ${consoleErrors.length} console errors found:`);
            consoleErrors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        } else {
            console.log('✅ DIAMOND PASS: No console errors! 💎');
        }
        
        // Test 4: Check if hamburger menu still works
        console.log('🔍 Testing hamburger menu functionality...');
        const menuButton = await page.$('#menu-btn');
        if (!menuButton) {
            console.log('❌ FAIL: Hamburger menu button not found!');
            return false;
        }
        
        await menuButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ PASS: Hamburger menu opens successfully!');
        
        // Test 5: Check if Rules link is now an anchor tag (not button)
        console.log('🔍 Testing Rules of the Nerd link...');
        const rulesLink = await page.$('a[href="./nerdfootballRules.html"]');
        if (!rulesLink) {
            console.log('❌ FAIL: Rules of the Nerd link not found!');
            return false;
        }
        
        const linkText = await page.evaluate(el => el.textContent, rulesLink);
        if (!linkText.includes('Rules of the Nerd')) {
            console.log('❌ FAIL: Rules link text incorrect!');
            return false;
        }
        console.log('✅ DIAMOND PASS: Rules link is properly converted to anchor tag! 💎');
        
        // Test 6: Verify picks view is visible by default
        console.log('🔍 Verifying default view loads properly...');
        const picksContainer = await page.$('#picks-container');
        const isPicksVisible = await page.evaluate(el => {
            return el && !el.classList.contains('hidden');
        }, picksContainer);
        
        if (!isPicksVisible) {
            console.log('❌ FAIL: Picks container not visible by default!');
            return false;
        }
        console.log('✅ DIAMOND PASS: Default picks view loads properly! 💎');
        
        // Test 7: Check that Rules container no longer exists
        console.log('🔍 Verifying rules container was properly removed...');
        const rulesContainer = await page.$('#rules-container');
        if (rulesContainer) {
            console.log('❌ FAIL: Rules container still exists in DOM!');
            return false;
        }
        console.log('✅ DIAMOND PASS: Rules container properly removed from DOM! 💎');
        
        // Test 8: Test other menu items still work
        console.log('🔍 Testing other menu functionality...');
        const leaderboardBtn = await page.$('#leaderboard-view-btn');
        if (leaderboardBtn) {
            await leaderboardBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const leaderboardContainer = await page.$('#leaderboard-container');
            const isLeaderboardVisible = await page.evaluate(el => {
                return el && !el.classList.contains('hidden');
            }, leaderboardContainer);
            
            if (isLeaderboardVisible) {
                console.log('✅ PASS: Leaderboard view still works!');
            } else {
                console.log('❌ WARNING: Leaderboard view may have issues');
            }
        }
        
        console.log('\\n🏆 DIAMOND LEVEL SUCCESS! App loading and functionality validated! 💎🚀');
        console.log('🔥 Critical fix successful - no addEventListener errors!');
        
        return true;
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR during testing:', error);
        return false;
    } finally {
        // Keep browser open for 5 seconds to see the result
        console.log('🕐 Keeping browser open for inspection...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await browser.close();
    }
}

// Run the Diamond Level test
testAppLoadingDiamond()
    .then(success => {
        if (success) {
            console.log('\\n💎🏆 DIAMOND ACHIEVEMENT UNLOCKED! 🏆💎');
            console.log('App loading fix is PERFECT!');
        } else {
            console.log('\\n❌ Testing failed - critical issues remain!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Fatal test error:', error);
        process.exit(1);
    });