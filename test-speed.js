// Test survivor system speed
const puppeteer = require('puppeteer');

async function testSurvivorSpeed() {
    console.log('🚀 Testing survivor system speed...');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Listen for console logs to track performance
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('SURVIVOR') || text.includes('BATCH') || text.includes('ms') || text.includes('eliminated')) {
            console.log('🔍 BROWSER LOG:', text);
        }
    });

    const startTime = Date.now();

    try {
        console.log('📱 Loading page...');
        await page.goto('https://nerdfootball.web.app', { waitUntil: 'networkidle0' });

        console.log('🎯 Clicking Survivor Pool...');
        await page.click('button[onclick*="showView(\'survivor\')"]');

        // Wait for survivor table to load
        console.log('⏰ Waiting for survivor table...');
        await page.waitForSelector('#survivor-table-container', { timeout: 10000 });

        // Wait a bit more for data to populate
        await page.waitForTimeout(3000);

        const totalTime = Date.now() - startTime;
        console.log(`⚡ TOTAL TIME: ${totalTime}ms`);

        // Check if we can see eliminated users
        const tableContent = await page.$eval('#survivor-table-container', el => el.textContent);
        const eliminatedCount = (tableContent.match(/DEAD/g) || []).length;
        const aliveCount = (tableContent.match(/ALIVE/g) || []).length;

        console.log(`📊 RESULTS: ${eliminatedCount} eliminated, ${aliveCount} alive`);
        console.log(`🎯 USER BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2 status:`,
            tableContent.includes('BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2') ? 'FOUND' : 'NOT FOUND');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    await browser.close();
}

testSurvivorSpeed().catch(console.error);