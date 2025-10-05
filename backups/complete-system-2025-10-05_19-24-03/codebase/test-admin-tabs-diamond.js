const puppeteer = require('puppeteer');

console.log('🔥 DIAMOND TEST: Admin Tab Functionality Validation');

async function testAdminTabFunctionality() {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: { width: 1200, height: 800 },
            devtools: true
        });

        const page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => {
            if (msg.type() === 'log') {
                console.log(`📝 PAGE LOG: ${msg.text()}`);
            } else if (msg.type() === 'error') {
                console.error(`❌ PAGE ERROR: ${msg.text()}`);
            }
        });

        // Navigate to localhost application
        console.log('🌐 Navigating to localhost:3000...');
        await page.goto('http://localhost:3000');
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take initial screenshot
        await page.screenshot({ path: 'admin-tabs-test-01-initial.png' });

        // Check if admin button is visible
        console.log('🔍 Checking for admin button visibility...');
        const adminBtnSelector = '#admin-btn, [href="#admin"]';
        
        try {
            await page.waitForSelector(adminBtnSelector, { timeout: 5000 });
            console.log('✅ Admin button found');
        } catch (error) {
            console.log('❌ Admin button not found, checking hamburger menu...');
            
            // Try hamburger menu
            const hamburgerSelector = '.hamburger-menu, [aria-label="Menu"]';
            try {
                await page.waitForSelector(hamburgerSelector, { timeout: 3000 });
                await page.click(hamburgerSelector);
                console.log('📱 Opened hamburger menu');
                
                await page.waitForSelector('#pool-admin-btn', { timeout: 3000 });
                await page.click('#pool-admin-btn');
                console.log('🎯 Clicked Pool Admin button in hamburger menu');
            } catch (hamburgerError) {
                throw new Error('❌ Could not find admin access method');
            }
        }

        // If admin button exists, click it
        const adminBtn = await page.$(adminBtnSelector);
        if (adminBtn) {
            console.log('🎯 Clicking admin button...');
            await adminBtn.click();
        }

        // Wait for admin view to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Take screenshot after admin view opens
        await page.screenshot({ path: 'admin-tabs-test-02-admin-view.png' });

        // Test all admin tabs
        const adminTabs = [
            { id: 'tab-game-results', name: 'Games', contentId: 'admin-content-game-results' },
            { id: 'tab-user-mgmt', name: 'Users', contentId: 'admin-content-user-mgmt' },
            { id: 'tab-picks-mgmt', name: 'Picks', contentId: 'admin-content-picks-mgmt' },
            { id: 'tab-survivor-status', name: 'Survivors', contentId: 'admin-content-survivor-status' },
            { id: 'tab-system-messenger', name: 'Messaging', contentId: 'admin-content-system-messenger' },
            { id: 'tab-pool-settings', name: 'Pool Settings', contentId: 'admin-content-pool-settings' }
        ];

        console.log('🧪 Testing all admin tabs...');
        
        let testResults = {
            totalTabs: adminTabs.length,
            successfulTabs: 0,
            failedTabs: [],
            tabDetails: []
        };

        for (let i = 0; i < adminTabs.length; i++) {
            const tab = adminTabs[i];
            console.log(`\n🎯 Testing tab ${i + 1}/${adminTabs.length}: ${tab.name} (${tab.id})`);
            
            try {
                // Check if tab element exists
                const tabElement = await page.$(`#${tab.id}`);
                if (!tabElement) {
                    throw new Error(`Tab element #${tab.id} not found`);
                }

                // Click the tab
                console.log(`📝 Clicking tab: ${tab.id}`);
                await page.click(`#${tab.id}`);
                
                // Wait for content to load
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if corresponding content is visible
                const contentVisible = await page.evaluate((contentId) => {
                    const element = document.getElementById(contentId);
                    return element && !element.classList.contains('hidden');
                }, tab.contentId);
                
                // Check if tab has active class
                const tabActive = await page.evaluate((tabId) => {
                    const element = document.getElementById(tabId);
                    return element && element.classList.contains('active');
                }, tab.id);
                
                // Take screenshot
                await page.screenshot({ path: `admin-tabs-test-${String(i + 3).padStart(2, '0')}-${tab.id}.png` });
                
                if (contentVisible && tabActive) {
                    console.log(`✅ ${tab.name} tab working correctly`);
                    testResults.successfulTabs++;
                    testResults.tabDetails.push({
                        name: tab.name,
                        id: tab.id,
                        status: 'SUCCESS',
                        tabActive,
                        contentVisible
                    });
                } else {
                    throw new Error(`Tab: ${tabActive ? 'ACTIVE' : 'INACTIVE'}, Content: ${contentVisible ? 'VISIBLE' : 'HIDDEN'}`);
                }
                
            } catch (error) {
                console.error(`❌ ${tab.name} tab failed: ${error.message}`);
                testResults.failedTabs.push({
                    name: tab.name,
                    id: tab.id,
                    error: error.message
                });
                testResults.tabDetails.push({
                    name: tab.name,
                    id: tab.id,
                    status: 'FAILED',
                    error: error.message
                });
            }
        }

        // Special focus on Pool Settings tab
        console.log('\n🎯 SPECIAL TEST: Pool Settings Tab Focus');
        try {
            console.log('📝 Clicking Pool Settings tab specifically...');
            await page.click('#tab-pool-settings');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check for Pool Settings specific elements
            const poolSettingsElements = await page.evaluate(() => {
                return {
                    contentVisible: document.getElementById('admin-content-pool-settings') && !document.getElementById('admin-content-pool-settings').classList.contains('hidden'),
                    editButton: document.getElementById('edit-pool-settings-btn') !== null,
                    poolMgmtTitle: document.querySelector('#admin-content-pool-settings h3')?.textContent || null,
                    tabActive: document.getElementById('tab-pool-settings')?.classList.contains('active') || false
                };
            });
            
            console.log('🔍 Pool Settings Elements Check:', poolSettingsElements);
            
            await page.screenshot({ path: 'admin-tabs-test-99-pool-settings-final.png' });
            
            if (poolSettingsElements.contentVisible && poolSettingsElements.tabActive) {
                console.log('✅ Pool Settings tab is fully functional!');
            } else {
                console.error('❌ Pool Settings tab has issues:', poolSettingsElements);
            }
            
        } catch (error) {
            console.error('❌ Pool Settings special test failed:', error.message);
        }

        // Generate final report
        console.log('\n🎉 ADMIN TAB FUNCTIONALITY TEST COMPLETE');
        console.log('================================================');
        console.log(`📊 Total Tabs Tested: ${testResults.totalTabs}`);
        console.log(`✅ Successful Tabs: ${testResults.successfulTabs}`);
        console.log(`❌ Failed Tabs: ${testResults.failedTabs.length}`);
        
        if (testResults.failedTabs.length > 0) {
            console.log('\n❌ Failed Tabs:');
            testResults.failedTabs.forEach(tab => {
                console.log(`   - ${tab.name} (${tab.id}): ${tab.error}`);
            });
        }
        
        console.log('\n📋 Detailed Results:');
        testResults.tabDetails.forEach(tab => {
            const status = tab.status === 'SUCCESS' ? '✅' : '❌';
            console.log(`   ${status} ${tab.name}: ${tab.status}`);
            if (tab.status === 'SUCCESS') {
                console.log(`      Tab Active: ${tab.tabActive}, Content Visible: ${tab.contentVisible}`);
            }
        });

        const testPassed = testResults.successfulTabs === testResults.totalTabs;
        console.log(`\n🎯 OVERALL TEST RESULT: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
        
        return testPassed;

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        return false;
    } finally {
        if (browser) {
            // Keep browser open for manual inspection
            console.log('🔍 Browser left open for manual inspection');
            // await browser.close();
        }
    }
}

// Run the test
testAdminTabFunctionality()
    .then(success => {
        if (success) {
            console.log('\n🎉 All admin tab functionality tests PASSED!');
            process.exit(0);
        } else {
            console.log('\n❌ Some admin tab functionality tests FAILED!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });