// Test ESPN Analytics Admin Area
const puppeteer = require('puppeteer');

async function testEspnAdminArea() {
    console.log('🔍 Testing ESPN Analytics Admin Area');
    console.log('===================================');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 720 },
            args: ['--no-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('ESPN') || text.includes('Sync') || text.includes('admin')) {
                console.log('🌐 Browser:', text);
            }
        });
        
        console.log('📱 Loading admin area...');
        await page.goto('https://nerdfootball.web.app/?view=admin', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for admin area to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if ESPN sync button exists
        const syncButton = await page.$('#espn-sync-btn');
        console.log(`ESPN Sync Button exists: ${syncButton ? '✅' : '❌'}`);
        
        if (syncButton) {
            // Check if it's clickable
            const isVisible = await page.evaluate(() => {
                const btn = document.getElementById('espn-sync-btn');
                return btn && !btn.disabled && btn.offsetParent !== null;
            });
            console.log(`ESPN Sync Button clickable: ${isVisible ? '✅' : '❌'}`);
            
            if (isVisible) {
                console.log('🧪 Testing ESPN sync functionality...');
                
                // Click the sync button
                await syncButton.click();
                
                // Wait for sync to complete
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                console.log('✅ ESPN sync test completed');
            }
        }
        
        // Check for ESPN Score Sync system
        const espnSyncLoaded = await page.evaluate(() => {
            return typeof window.EspnScoreSync !== 'undefined';
        });
        console.log(`ESPN Score Sync loaded: ${espnSyncLoaded ? '✅' : '❌'}`);
        
        // Check for notifications
        const notifications = await page.$('#espn-sync-notification');
        console.log(`ESPN notifications container: ${notifications ? '✅' : '❌'}`);
        
        console.log('\n📊 Admin Area Test Summary:');
        console.log(`- ESPN Sync Button: ${syncButton ? '✅' : '❌'}`);
        console.log(`- ESPN Score Sync System: ${espnSyncLoaded ? '✅' : '❌'}`);
        console.log(`- Notifications: ${notifications ? '✅' : '❌'}`);
        
        // Keep browser open briefly for manual inspection
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (error) {
        console.log('❌ Test error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testEspnAdminArea().then(() => {
    console.log('✅ ESPN Admin Area test complete');
}).catch(error => {
    console.error('❌ Test failed:', error);
});