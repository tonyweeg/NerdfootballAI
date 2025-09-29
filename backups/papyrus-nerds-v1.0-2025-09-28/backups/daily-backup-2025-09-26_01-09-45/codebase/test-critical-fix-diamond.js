// 💎 DIAMOND LEVEL CRITICAL FIX TEST - addEventListener Error Resolution 🚀
// Tests ONLY that the app loads without the critical addEventListener error

const puppeteer = require('puppeteer');

async function testCriticalFixDiamond() {
    console.log('💎 Starting Diamond Level Critical Fix Test... 🚀');
    console.log('🎯 Focus: Verify no addEventListener null reference errors');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Track JavaScript errors - this is the critical test
    let jsErrors = [];
    let criticalErrors = [];
    
    page.on('pageerror', error => {
        jsErrors.push(error.message);
        console.log(`💥 JS ERROR: ${error.message}`);
        
        // Check for the specific addEventListener error we're fixing
        if (error.message.includes('addEventListener') || error.message.includes('Cannot read properties of null')) {
            criticalErrors.push(error.message);
            console.log(`🚨 CRITICAL ERROR DETECTED: ${error.message}`);
        }
    });
    
    try {
        // Load the page and check for the specific error we fixed
        console.log('🎯 Loading local index.html...');
        await page.goto('file:///Users/tonyweeg/nerdfootball-project/public/index.html', {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Give JavaScript time to fully execute
        console.log('⏳ Waiting for JavaScript execution...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // CRITICAL TEST: Check if the addEventListener error occurred
        if (criticalErrors.length > 0) {
            console.log('\\n💥 CRITICAL FAILURE - addEventListener errors still exist:');
            criticalErrors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            return false;
        }
        
        if (jsErrors.length === 0) {
            console.log('\\n🏆 DIAMOND LEVEL PERFECTION! 💎');
            console.log('✅ Zero JavaScript errors - app loads cleanly!');
        } else {
            console.log('\\n✅ CRITICAL FIX SUCCESS! 💎');
            console.log('✅ No addEventListener errors detected!');
            console.log(`ℹ️  ${jsErrors.length} other JS errors exist (non-critical for this fix):`);
            jsErrors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        // Verify basic page structure loaded
        const title = await page.title();
        console.log(`📄 Page title: ${title}`);
        
        const picksContainer = await page.$('#picks-container');
        if (picksContainer) {
            console.log('✅ Main picks container exists - basic structure intact');
        } else {
            console.log('⚠️  Main picks container missing - potential structure issue');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ TEST EXECUTION ERROR:', error.message);
        return false;
    } finally {
        console.log('🕐 Keeping browser open for inspection...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await browser.close();
    }
}

// Run the critical fix test
testCriticalFixDiamond()
    .then(success => {
        if (success) {
            console.log('\\n💎🏆 CRITICAL FIX VALIDATED! 🏆💎');
            console.log('🔥 addEventListener error eliminated!');
        } else {
            console.log('\\n❌ Critical fix failed - addEventListener error persists!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Fatal test error:', error);
        process.exit(1);
    });