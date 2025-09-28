const puppeteer = require('puppeteer');

async function testSurvivorStructure() {
    console.log('🏆 Testing Survivor Results Structure Integration...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1200, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            console.log(`Browser: ${msg.text()}`);
        });
        
        page.on('pageerror', error => {
            console.log(`Page error: ${error.message}`);
        });

        console.log('⭐ Loading page to check structure...');
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Test 1: Check if survivor container exists in DOM
        const survivorContainerExists = await page.evaluate(() => {
            return !!document.getElementById('survivor-container');
        });
        console.log(`✅ Test 1 - Survivor container exists: ${survivorContainerExists}`);
        
        // Test 2: Check if survivor container is initially hidden
        const survivorHidden = await page.evaluate(() => {
            const container = document.getElementById('survivor-container');
            return container && container.classList.contains('hidden');
        });
        console.log(`✅ Test 2 - Survivor container initially hidden: ${survivorHidden}`);
        
        // Test 3: Check if SurvivorView object exists
        const survivorViewExists = await page.evaluate(() => {
            return typeof SurvivorView !== 'undefined' && typeof SurvivorView.show === 'function';
        });
        console.log(`✅ Test 3 - SurvivorView object exists: ${survivorViewExists}`);
        
        // Test 4: Check if all survivor UI elements exist
        const survivorUIElements = await page.evaluate(() => {
            const elements = [
                'survivor-loading-container',
                'survivor-error-container', 
                'survivor-results-container',
                'survivor-no-results',
                'survivor-results-tbody',
                'survivor-total-players',
                'survivor-active-players',
                'survivor-eliminated-players',
                'survivor-current-week'
            ];
            
            return elements.map(id => ({
                id,
                exists: !!document.getElementById(id)
            }));
        });
        
        const allElementsExist = survivorUIElements.every(el => el.exists);
        console.log(`✅ Test 4 - All survivor UI elements exist: ${allElementsExist}`);
        
        if (!allElementsExist) {
            console.log('Missing elements:', survivorUIElements.filter(el => !el.exists));
        }
        
        // Test 5: Check if hamburger menu has survivor link
        await page.click('#menu-btn');
        await page.waitForSelector('#menu-panel:not(.hidden)', { timeout: 5000 });
        
        const survivorLinkExists = await page.evaluate(() => {
            return !!document.querySelector('a[href="./index.html?view=survivor"]');
        });
        console.log(`✅ Test 5 - Survivor menu link exists: ${survivorLinkExists}`);
        
        // Test 6: Check URL routing setup
        const urlRoutingSetup = await page.evaluate(() => {
            // Check if survivor is in getCurrentView function
            const getCurrentViewStr = getCurrentView.toString();
            return getCurrentViewStr.includes('survivorContainer') && getCurrentViewStr.includes('survivor');
        });
        console.log(`✅ Test 6 - URL routing includes survivor: ${urlRoutingSetup}`);
        
        // Test 7: Check CSS styles
        const survivorStyles = await page.evaluate(() => {
            const styles = getComputedStyle(document.documentElement);
            // Check if survivor-specific styles are loaded by testing one
            const testEl = document.createElement('div');
            testEl.className = 'survivor-active';
            document.body.appendChild(testEl);
            const bgColor = getComputedStyle(testEl).backgroundColor;
            document.body.removeChild(testEl);
            
            return bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
        });
        console.log(`✅ Test 7 - Survivor CSS styles loaded: ${survivorStyles}`);

        console.log('🏆 Survivor Results Structure Tests Complete!');
        
        if (survivorContainerExists && survivorHidden && survivorViewExists && allElementsExist && survivorLinkExists && urlRoutingSetup) {
            console.log('🎉 ALL TESTS PASSED - Survivor Results successfully integrated!');
        } else {
            console.log('⚠️  Some tests failed - check integration');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testSurvivorStructure();