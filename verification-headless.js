// Headless browser script to run survivor verification
const puppeteer = require('puppeteer');

async function runVerification() {
    let browser;
    try {
        console.log('🚀 Starting headless verification...');

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Capture console logs
        const logs = [];
        page.on('console', async (msg) => {
            const text = msg.text();
            logs.push(text);
            console.log('BROWSER:', text);
        });

        // Navigate to verification page
        await page.goto('http://localhost:5555/test-survivor-verification.html');

        // Wait for page to load completely
        await page.waitForFunction(() => window.batchSurvivorVerification !== undefined, { timeout: 10000 });

        // Click the run verification button
        console.log('🔍 Clicking verification button...');
        await page.click('button[onclick="runVerification()"]');

        // Wait for verification to complete (up to 60 seconds)
        await page.waitForFunction(() => window.verificationResults !== undefined, { timeout: 120000 });

        // Extract results from window object
        const results = await page.evaluate(() => {
            return window.verificationResults || null;
        });

        console.log('\n✅ VERIFICATION COMPLETE');
        console.log('📋 RESULTS SUMMARY:');

        if (results) {
            console.log(`Bug Patterns: ${results.bugPatterns?.length || 0}`);
            console.log(`Affected Users: ${results.affectedUsers?.length || 0}`);
            console.log(`Verified Users: ${results.verificationResults?.verified?.length || 0}`);

            if (results.affectedUsers?.length > 0) {
                console.log('\n🚨 AFFECTED USERS:');
                results.affectedUsers.forEach((user, index) => {
                    console.log(`${index + 1}. ${user.displayName} (${user.uid})`);
                    console.log(`   Pattern: ${user.bugPattern?.type}`);
                    console.log(`   Current Status: ${user.currentStatus?.eliminated ? 'ELIMINATED' : 'ALIVE'}`);
                    console.log(`   Should Be: ${user.bugPattern?.type === 'incorrect_elimination_week' ? 'ALIVE' : 'ELIMINATED'}`);
                });
            }

            return results;
        } else {
            console.log('❌ No results available');
            return null;
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run if called directly
if (require.main === module) {
    runVerification().then(results => {
        if (results) {
            console.log('\n📊 Complete results object:', JSON.stringify(results, null, 2));
        }
        process.exit(0);
    });
}

module.exports = { runVerification };