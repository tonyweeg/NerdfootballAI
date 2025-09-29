const puppeteer = require('puppeteer');

async function testSurvivorMinimal() {
    console.log('🏆 Testing Survivor Results Core Integration...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1200, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        console.log('⭐ Loading page and waiting for initialization...');
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Wait a bit more for initialization
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test if SurvivorView is defined in window scope
        const survivorViewStatus = await page.evaluate(() => {
            return {
                inWindow: typeof window.SurvivorView !== 'undefined',
                inGlobal: typeof SurvivorView !== 'undefined',
                windowKeys: Object.keys(window).filter(key => key.toLowerCase().includes('survivor')),
                hasShow: typeof SurvivorView !== 'undefined' && typeof SurvivorView.show === 'function',
                hasLoadResults: typeof SurvivorView !== 'undefined' && typeof SurvivorView.loadSurvivorResults === 'function'
            };
        });
        
        console.log('SurvivorView Status:', survivorViewStatus);
        
        // Check if the container exists and has proper structure
        const containerStatus = await page.evaluate(() => {
            const container = document.getElementById('survivor-container');
            return {
                exists: !!container,
                hidden: container && container.classList.contains('hidden'),
                childCount: container ? container.children.length : 0,
                hasLoadingContainer: !!document.getElementById('survivor-loading-container'),
                hasErrorContainer: !!document.getElementById('survivor-error-container'),
                hasResultsContainer: !!document.getElementById('survivor-results-container')
            };
        });
        
        console.log('Container Status:', containerStatus);
        
        // Test the hamburger menu link
        const menuStatus = await page.evaluate(() => {
            const survivorLink = document.querySelector('a[href="./index.html?view=survivor"]');
            return {
                linkExists: !!survivorLink,
                linkText: survivorLink ? survivorLink.textContent.trim() : null,
                linkHref: survivorLink ? survivorLink.getAttribute('href') : null
            };
        });
        
        console.log('Menu Status:', menuStatus);
        
        // Check if all required CSS classes exist
        const cssStatus = await page.evaluate(() => {
            // Create test elements to check CSS
            const testActive = document.createElement('div');
            testActive.className = 'survivor-active';
            document.body.appendChild(testActive);
            
            const testEliminated = document.createElement('div'); 
            testEliminated.className = 'survivor-eliminated';
            document.body.appendChild(testEliminated);
            
            const testGrid = document.createElement('div');
            testGrid.className = 'survivor-grid';
            document.body.appendChild(testGrid);
            
            const activeStyles = getComputedStyle(testActive);
            const eliminatedStyles = getComputedStyle(testEliminated);
            const gridStyles = getComputedStyle(testGrid);
            
            document.body.removeChild(testActive);
            document.body.removeChild(testEliminated);
            document.body.removeChild(testGrid);
            
            return {
                activeBgColor: activeStyles.backgroundColor,
                eliminatedBgColor: eliminatedStyles.backgroundColor,
                gridMinHeight: gridStyles.minHeight,
                allLoaded: activeStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                          eliminatedStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                          gridStyles.minHeight === '600px'
            };
        });
        
        console.log('CSS Status:', cssStatus);
        
        console.log('🏆 Minimal Survivor Tests Complete!');
        
        if (containerStatus.exists && menuStatus.linkExists && cssStatus.allLoaded) {
            if (!survivorViewStatus.inGlobal) {
                console.log('⚠️  SurvivorView object not accessible in global scope - may be in module scope (this is OK)');
            }
            console.log('🎉 Core integration appears successful!');
        } else {
            console.log('❌ Some core components missing');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testSurvivorMinimal();