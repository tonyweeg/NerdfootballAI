const puppeteer = require('puppeteer');

async function testGridRendering() {
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true 
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    try {
        console.log('🔍 Testing Grid View Rendering');
        console.log('=' .repeat(50));
        
        await page.goto('http://localhost:3002/?view=grid', { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if user is authenticated
        const isAuthenticated = await page.evaluate(() => {
            return window.currentUser !== null;
        });
        console.log('✅ User authenticated:', isAuthenticated);
        
        // Check Grid container visibility
        const gridContainerVisible = await page.evaluate(() => {
            const container = document.getElementById('grid-container');
            if (!container) return { exists: false };
            
            const computed = window.getComputedStyle(container);
            const rect = container.getBoundingClientRect();
            
            return {
                exists: true,
                hasHiddenClass: container.classList.contains('hidden'),
                display: computed.display,
                visibility: computed.visibility,
                opacity: computed.opacity,
                width: rect.width,
                height: rect.height,
                isVisible: computed.display !== 'none' && 
                          computed.visibility !== 'hidden' && 
                          !container.classList.contains('hidden')
            };
        });
        
        console.log('\n📦 Grid Container Status:');
        console.log('  - Exists:', gridContainerVisible.exists);
        console.log('  - Has .hidden class:', gridContainerVisible.hasHiddenClass);
        console.log('  - Display:', gridContainerVisible.display);
        console.log('  - Visibility:', gridContainerVisible.visibility);
        console.log('  - Opacity:', gridContainerVisible.opacity);
        console.log('  - Dimensions:', `${gridContainerVisible.width}x${gridContainerVisible.height}`);
        console.log('  - Is Visible:', gridContainerVisible.isVisible);
        
        // Check Grid table elements
        const gridTableStatus = await page.evaluate(() => {
            const loader = document.getElementById('grid-table-loader');
            const content = document.getElementById('grid-table-content');
            
            return {
                loader: {
                    exists: !!loader,
                    display: loader ? window.getComputedStyle(loader).display : null,
                    innerHTML: loader ? loader.innerHTML.substring(0, 100) : null
                },
                content: {
                    exists: !!content,
                    hasContent: content ? content.innerHTML.length > 0 : false,
                    innerHTML: content ? content.innerHTML.substring(0, 200) : null
                }
            };
        });
        
        console.log('\n📊 Grid Table Status:');
        console.log('  Loader:', gridTableStatus.loader);
        console.log('  Content:', gridTableStatus.content);
        
        // Check if renderGrid was called
        const renderGridInfo = await page.evaluate(() => {
            // Try to get info about renderGrid execution
            const logs = [];
            
            // Check if function exists
            logs.push('renderGrid function exists: ' + (typeof window.renderGrid === 'function'));
            
            // Check current week value
            logs.push('currentWeek value: ' + window.currentWeek);
            
            // Check allUI object
            logs.push('allUI exists: ' + (typeof window.allUI === 'object'));
            logs.push('allUI.gridContainer: ' + !!window.allUI?.gridContainer);
            logs.push('allUI.gridTableContent: ' + !!window.allUI?.gridTableContent);
            logs.push('allUI.gridTableLoader: ' + !!window.allUI?.gridTableLoader);
            logs.push('allUI.gridWeekSelector: ' + !!window.allUI?.gridWeekSelector);
            
            return logs;
        });
        
        console.log('\n🔧 RenderGrid Debug Info:');
        renderGridInfo.forEach(log => console.log('  ', log));
        
        // Try to manually trigger renderGrid
        console.log('\n🚀 Manually triggering renderGrid...');
        const renderResult = await page.evaluate(async () => {
            try {
                if (typeof window.renderGrid === 'function') {
                    await window.renderGrid();
                    return { success: true, message: 'renderGrid executed' };
                } else {
                    return { success: false, message: 'renderGrid function not found' };
                }
            } catch (error) {
                return { success: false, message: error.message, stack: error.stack };
            }
        });
        
        console.log('  Result:', renderResult);
        
        // Check Grid content after manual trigger
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalGridStatus = await page.evaluate(() => {
            const content = document.getElementById('grid-table-content');
            return {
                hasContent: content ? content.innerHTML.length > 0 : false,
                contentLength: content ? content.innerHTML.length : 0,
                hasTables: content ? content.querySelectorAll('table').length : 0,
                hasRows: content ? content.querySelectorAll('tr').length : 0
            };
        });
        
        console.log('\n✅ Final Grid Status:');
        console.log('  - Has content:', finalGridStatus.hasContent);
        console.log('  - Content length:', finalGridStatus.contentLength);
        console.log('  - Number of tables:', finalGridStatus.hasTables);
        console.log('  - Number of rows:', finalGridStatus.hasRows);
        
        // Check for error messages
        const errorMessages = await page.evaluate(() => {
            const content = document.getElementById('grid-table-content');
            if (content && content.textContent.includes('Error')) {
                return content.textContent;
            }
            return null;
        });
        
        if (errorMessages) {
            console.log('\n❌ ERROR FOUND IN GRID:', errorMessages);
        }
        
        console.log('\n🔍 Test Complete - Check browser window');
        console.log('Press Ctrl+C to exit...');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        await browser.close();
    }
}

testGridRendering();