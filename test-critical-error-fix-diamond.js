// Diamond Level Test: Focused test for critical error fix
const puppeteer = require('puppeteer');

(async () => {
    let browser;
    let page;
    
    try {
        console.log('🎯 Diamond Level Test: Critical Error Fix Verification');
        console.log('Focus: Verify TypeError "Cannot set properties of null" is resolved');
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        // Capture critical errors specifically
        const criticalErrors = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                console.log('Console Error:', text);
                
                // Check for the specific error we fixed
                if (text.includes('Cannot set properties of null') && text.includes('textContent')) {
                    criticalErrors.push({
                        type: 'NULL_REFERENCE',
                        message: text,
                        critical: true
                    });
                }
                
                if (text.includes('TypeError') || text.includes('ReferenceError')) {
                    criticalErrors.push({
                        type: 'TYPE_ERROR',
                        message: text,
                        critical: true
                    });
                }
            }
        });
        
        page.on('pageerror', error => {
            console.log('Page Error:', error.message);
            if (error.message.includes('Cannot set properties of null')) {
                criticalErrors.push({
                    type: 'PAGE_ERROR',
                    message: error.message,
                    critical: true
                });
            }
        });
        
        console.log('🌐 Navigating to survivor results page...');
        await page.goto('https://nerdfootball.web.app/survivorResults.html', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        
        // Wait for JavaScript to execute
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('\n📊 Critical Error Analysis:');
        console.log(`Total Critical Errors Detected: ${criticalErrors.length}`);
        
        if (criticalErrors.length === 0) {
            console.log('✅ SUCCESS: No critical JavaScript errors detected!');
            console.log('💎 The TypeError "Cannot set properties of null" has been resolved.');
            console.log('🚀 Page loads without JavaScript crashes.');
            
            // Additional verification - check if user-display element exists
            const userDisplayExists = await page.$('#user-display') !== null;
            console.log(`✅ user-display element exists: ${userDisplayExists}`);
            
            return true;
            
        } else {
            console.log('❌ CRITICAL ERRORS STILL PRESENT:');
            criticalErrors.forEach((error, index) => {
                console.log(`${index + 1}. [${error.type}] ${error.message}`);
            });
            return false;
        }
        
    } catch (error) {
        console.error('Test execution failed:', error);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})().then(success => {
    if (success) {
        console.log('\n🎉 DIAMOND STANDARD ACHIEVED!');
        console.log('✨ Critical JavaScript errors have been successfully resolved.');
        console.log('📈 The Survivor Results page is now stable and production-ready.');
    } else {
        console.log('\n⚠️  Critical errors still need attention.');
    }
});