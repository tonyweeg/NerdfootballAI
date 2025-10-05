const puppeteer = require('puppeteer');

async function testGridURLParam() {
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: false 
    });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Grid') || text.includes('grid') || text.includes('renderGrid') || 
            text.includes('💎') || text.includes('switch on view') || text.includes('About to switch')) {
            console.log('BROWSER:', text);
        }
    });
    
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    try {
        console.log('🔍 Testing Grid View with URL Parameter');
        console.log('=' .repeat(50));
        
        await page.goto('http://localhost:3002/?view=grid', { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Wait for authentication and rendering
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check Grid container visibility
        const gridStatus = await page.evaluate(() => {
            const container = document.getElementById('grid-container');
            const content = document.getElementById('grid-table-content');
            
            return {
                containerExists: !!container,
                containerVisible: container && !container.classList.contains('hidden'),
                contentExists: !!content,
                contentHasData: content && content.innerHTML.length > 50,
                tableCount: content ? content.querySelectorAll('table').length : 0,
                rowCount: content ? content.querySelectorAll('tr').length : 0,
                errorMessage: content && content.textContent.includes('Error') ? content.textContent : null
            };
        });
        
        console.log('\n📊 Grid View Status:');
        console.log('  - Container exists:', gridStatus.containerExists);
        console.log('  - Container visible:', gridStatus.containerVisible);
        console.log('  - Content exists:', gridStatus.contentExists);
        console.log('  - Content has data:', gridStatus.contentHasData);
        console.log('  - Number of tables:', gridStatus.tableCount);
        console.log('  - Number of rows:', gridStatus.rowCount);
        
        if (gridStatus.errorMessage) {
            console.log('  - ❌ ERROR:', gridStatus.errorMessage);
        }
        
        if (gridStatus.containerVisible && gridStatus.contentHasData) {
            console.log('\n✅ SUCCESS: Grid view is rendering correctly with URL parameter!');
        } else {
            console.log('\n❌ FAILURE: Grid view is NOT rendering correctly');
        }
        
        // Take screenshot
        await page.screenshot({ path: 'grid-view-test.png', fullPage: true });
        console.log('\n📸 Screenshot saved as grid-view-test.png');
        
        await browser.close();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        await browser.close();
    }
}

testGridURLParam();