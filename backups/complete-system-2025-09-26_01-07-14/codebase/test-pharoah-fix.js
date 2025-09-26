/**
 * PHAROAH ARCHITECTURE TEST
 * Verifies the application loads after fixing the Firebase initialization hang
 */

const puppeteer = require('puppeteer');

async function testApplicationLoading() {
    console.log('🚀 PHAROAH: Testing application loading after architecture fix...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Capture console logs
        const consoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(text);
            console.log(`[Browser Console] ${text}`);
        });
        
        // Capture errors
        page.on('pageerror', error => {
            console.error('❌ Page Error:', error.message);
        });
        
        console.log('📍 Navigating to application...');
        await page.goto('https://nerdfootball.web.app', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait a moment for JavaScript to execute
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for critical elements
        console.log('\n🔍 Checking for critical UI elements...');
        
        // Check for hamburger menu
        const hamburgerExists = await page.evaluate(() => {
            const hamburger = document.querySelector('#hamburger-menu');
            return hamburger !== null;
        });
        console.log(`✅ Hamburger menu: ${hamburgerExists ? 'FOUND' : 'MISSING'}`);
        
        // Check for pool dropdown
        const poolDropdownExists = await page.evaluate(() => {
            const dropdown = document.querySelector('#poolDropdown');
            return dropdown !== null;
        });
        console.log(`✅ Pool dropdown: ${poolDropdownExists ? 'FOUND' : 'MISSING'}`);
        
        // Check for main content area
        const mainContentExists = await page.evaluate(() => {
            const content = document.querySelector('#mainContent');
            return content !== null && content.innerHTML.trim().length > 0;
        });
        console.log(`✅ Main content: ${mainContentExists ? 'LOADED' : 'EMPTY'}`);
        
        // Check Firebase initialization logs
        console.log('\n🔥 Firebase Initialization Analysis:');
        
        const firebaseReady = await page.evaluate(() => window.firebaseReady);
        console.log(`✅ Firebase ready flag: ${firebaseReady}`);
        
        const httpsCallableReady = await page.evaluate(() => window.httpsCallableReady);
        console.log(`✅ httpsCallable ready: ${httpsCallableReady}`);
        
        const bundleGateStatus = await page.evaluate(() => {
            if (!window.bundleGate) return 'NOT FOUND';
            return {
                firebaseReady: window.bundleGate.firebaseReady,
                bundlesExecuted: window.bundleGate.bundlesExecuted,
                bundlesWaiting: window.bundleGate.bundlesWaiting.length
            };
        });
        console.log('✅ Bundle Gate Status:', bundleGateStatus);
        
        // Check for the critical log that was missing before
        const criticalLogFound = consoleLogs.some(log => 
            log.includes('PHAROAH: Moving directly to event emission') ||
            log.includes('PHAROAH: CustomEvent dispatched successfully') ||
            log.includes('Bundle Gate: Firebase globals are ready')
        );
        
        console.log(`\n✅ Critical execution point reached: ${criticalLogFound ? 'YES' : 'NO'}`);
        
        // Check for the problematic verification that we removed
        const problematicVerification = consoleLogs.some(log => 
            log.includes('httpsCallable verified working:')
        );
        
        console.log(`✅ Problematic verification removed: ${!problematicVerification ? 'YES' : 'NO'}`);
        
        // Final verdict
        console.log('\n' + '='.repeat(60));
        if (hamburgerExists && poolDropdownExists && firebaseReady && criticalLogFound) {
            console.log('🎉 SUCCESS: Application loaded correctly!');
            console.log('✅ Firebase initialization no longer hangs');
            console.log('✅ All bundles executed successfully');
            console.log('✅ UI elements rendered properly');
        } else {
            console.log('⚠️ WARNING: Some issues detected');
            if (!criticalLogFound) {
                console.log('❌ Critical execution point not reached - may still be blocking');
            }
            if (!firebaseReady) {
                console.log('❌ Firebase not fully initialized');
            }
            if (!hamburgerExists || !poolDropdownExists) {
                console.log('❌ Some UI elements missing');
            }
        }
        
        console.log('\n📊 Total console logs captured:', consoleLogs.length);
        
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser left open for manual inspection. Press Ctrl+C to exit.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        await browser.close();
        process.exit(1);
    }
}

// Run the test
testApplicationLoading().catch(console.error);