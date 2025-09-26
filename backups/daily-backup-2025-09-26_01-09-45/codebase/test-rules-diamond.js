// 💎 DIAMOND LEVEL RULES TESTING - Puppeteer Automation 🚀
// Tests the Rules of the Nerd functionality with military precision!

const puppeteer = require('puppeteer');

async function testRulesOfTheNerdDiamond() {
    console.log('💎 Starting Diamond Level Rules Testing... 🚀');
    
    const browser = await puppeteer.launch({ 
        headless: false, // So you can SEE the Diamond magic!
        devtools: false,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        // Navigate to the main page
        console.log('🎯 Loading Nerdfootball main page...');
        await page.goto('file:///Users/tonyweeg/nerdfootball-project/public/index.html', {
            waitUntil: 'networkidle0'
        });
        
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 1: Check if hamburger menu button exists
        console.log('🔍 Testing hamburger menu button existence...');
        const menuButton = await page.$('.hamburger-menu, #menu-btn, .menu-button');
        if (!menuButton) {
            console.log('❌ FAIL: Hamburger menu button not found!');
            return false;
        }
        console.log('✅ PASS: Hamburger menu button found!');
        
        // Test 2: Click hamburger menu to open it
        console.log('🎯 Opening hamburger menu...');
        await menuButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 3: Check if Rules of the Nerd button exists in menu
        console.log('🔍 Looking for Rules of the Nerd button...');
        const rulesButton = await page.$('#rules-view-btn');
        if (!rulesButton) {
            console.log('❌ CRITICAL FAIL: Rules of the Nerd button not found in menu!');
            return false;
        }
        console.log('✅ DIAMOND PASS: Rules of the Nerd button found! 💎');
        
        // Test 4: Click the Rules button
        console.log('🎯 Clicking Rules of the Nerd button...');
        await rulesButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 5: Verify Rules container is now visible
        console.log('🔍 Checking if rules container is visible...');
        const rulesContainer = await page.$('#rules-container');
        if (!rulesContainer) {
            console.log('❌ FAIL: Rules container not found!');
            return false;
        }
        
        const isVisible = await page.evaluate(el => {
            return el && !el.classList.contains('hidden');
        }, rulesContainer);
        
        if (!isVisible) {
            console.log('❌ FAIL: Rules container is hidden!');
            return false;
        }
        console.log('✅ DIAMOND PASS: Rules container is visible! 💎');
        
        // Test 6: Check for welcome message with user name placeholder
        console.log('🔍 Testing welcome message...');
        const welcomeMessage = await page.$('#rules-user-name');
        if (!welcomeMessage) {
            console.log('❌ FAIL: Welcome message user name element not found!');
            return false;
        }
        console.log('✅ PASS: Welcome message user name element found!');
        
        // Test 7: Verify all 20 rules are present
        console.log('🔍 Counting rules entries...');
        const rules = await page.$$eval('h4[class*="font-bold"]', elements => elements.length);
        console.log(`📊 Found ${rules} rules`);
        
        if (rules !== 20) {
            console.log(`❌ FAIL: Expected 20 rules, found ${rules}`);
            return false;
        }
        console.log('✅ DIAMOND PASS: All 20 rules present! 💎');
        
        // Test 8: Check specific rule content
        console.log('🔍 Testing specific rule content...');
        const rule1Text = await page.evaluate(() => {
            const rules = document.querySelectorAll('h4');
            for (let rule of rules) {
                if (rule.textContent.includes('Weekly Game Selection')) {
                    return rule.textContent;
                }
            }
            return null;
        });
        if (!rule1Text || !rule1Text.includes('Weekly Game Selection')) {
            console.log('❌ FAIL: Rule 1 content incorrect!');
            return false;
        }
        console.log('✅ PASS: Rule content verification passed!');
        
        // Test 9: Test close button functionality  
        console.log('🎯 Testing close button...');
        const closeButton = await page.$('#close-rules-btn');
        if (!closeButton) {
            console.log('❌ FAIL: Close button not found!');
            return false;
        }
        
        await closeButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 10: Verify rules container is now hidden
        console.log('🔍 Verifying rules container is hidden after close...');
        const isHiddenAfterClose = await page.evaluate(el => {
            return el && el.classList.contains('hidden');
        }, rulesContainer);
        
        if (!isHiddenAfterClose) {
            console.log('❌ FAIL: Rules container still visible after close!');
            return false;
        }
        console.log('✅ DIAMOND PASS: Rules container properly hidden! 💎');
        
        // Test 11: Verify picks container is visible again
        console.log('🔍 Verifying picks view is restored...');
        const picksContainer = await page.$('#picks-container');
        const isPicksVisible = await page.evaluate(el => {
            return el && !el.classList.contains('hidden');
        }, picksContainer);
        
        if (!isPicksVisible) {
            console.log('❌ FAIL: Picks container not restored!');
            return false;
        }
        console.log('✅ DIAMOND PASS: Picks view properly restored! 💎');
        
        console.log('\n🏆 DIAMOND LEVEL SUCCESS! All Rules tests passed! 💎🚀');
        console.log('🔥 Rules of the Nerd is working flawlessly!');
        
        return true;
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR during testing:', error);
        return false;
    } finally {
        // Keep browser open for 5 seconds to see the result
        await new Promise(resolve => setTimeout(resolve, 5000));
        await browser.close();
    }
}

// Run the Diamond Level test
testRulesOfTheNerdDiamond()
    .then(success => {
        if (success) {
            console.log('\n💎🏆 DIAMOND ACHIEVEMENT UNLOCKED! 🏆💎');
            console.log('Rules of the Nerd functionality is PERFECT!');
        } else {
            console.log('\n❌ Testing failed - needs fixes!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Fatal test error:', error);
        process.exit(1);
    });