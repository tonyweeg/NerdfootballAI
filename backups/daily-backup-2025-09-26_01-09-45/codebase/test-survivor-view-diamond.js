const puppeteer = require('puppeteer');

async function testSurvivorView() {
    console.log('🏆 Testing Survivor Results View Integration...');
    
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

        console.log('⭐ Test 1: Direct URL navigation to ?view=survivor');
        await page.goto('http://localhost:3000/?view=survivor', { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Wait for the survivor container to be visible
        await page.waitForSelector('#survivor-container:not(.hidden)', { timeout: 10000 });
        console.log('✅ Survivor container is visible');
        
        // Check if loading state shows initially
        const loadingVisible = await page.evaluate(() => {
            const loading = document.getElementById('survivor-loading-container');
            return loading && !loading.classList.contains('hidden');
        });
        console.log(`✅ Loading state: ${loadingVisible ? 'Visible' : 'Hidden'}`);

        console.log('⭐ Test 2: Navigation via hamburger menu');
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // Click hamburger menu
        await page.waitForSelector('#menu-btn');
        await page.click('#menu-btn');
        
        // Wait for menu to appear and click Survivor Results
        await page.waitForSelector('a[href="./index.html?view=survivor"]', { visible: true });
        await page.click('a[href="./index.html?view=survivor"]');
        
        // Wait for survivor container to be visible
        await page.waitForSelector('#survivor-container:not(.hidden)', { timeout: 10000 });
        console.log('✅ Survivor view loads via menu navigation');

        console.log('⭐ Test 3: Check URL parameters');
        const currentUrl = page.url();
        if (currentUrl.includes('view=survivor')) {
            console.log('✅ URL contains ?view=survivor parameter');
        } else {
            console.log('❌ URL missing survivor parameter:', currentUrl);
        }

        console.log('⭐ Test 4: Check view switching integrity');
        // Go back to picks
        await page.click('#menu-btn');
        await page.waitForSelector('a[href="./index.html"]', { visible: true });
        await page.click('a[href="./index.html"]');
        
        // Verify picks container is visible and survivor is hidden
        await page.waitForSelector('#picks-container:not(.hidden)', { timeout: 5000 });
        const survivorHidden = await page.evaluate(() => {
            const survivor = document.getElementById('survivor-container');
            return survivor && survivor.classList.contains('hidden');
        });
        
        if (survivorHidden) {
            console.log('✅ View switching works - survivor hidden when picks shown');
        } else {
            console.log('❌ View switching issue - survivor not hidden');
        }

        console.log('🏆 Survivor Results View Integration Tests Complete!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testSurvivorView();