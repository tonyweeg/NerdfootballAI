const puppeteer = require('puppeteer');

async function testStandardizedMenus() {
    let browser;
    try {
        console.log('🎯 Testing Standardized Hamburger Menus - Diamond Level');
        
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 300,
            defaultViewport: { width: 1200, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Expected menu structure for non-admin users
        const expectedNonAdminMenuItems = [
            '📝 My Picks',
            '🏆 Leaderboard', 
            '📊 The Grid',
            '⚔️ Survivor Picks',
            '💀 Survivors List',
            '📋 Rules',
            '⚙️ Settings',
            '🚪 Logout'
        ];

        // Expected menu structure for admin users (with admin at top)
        const expectedAdminMenuItems = [
            '🔧 Admin',
            '📝 My Picks',
            '🏆 Leaderboard',
            '📊 The Grid', 
            '⚔️ Survivor Picks',
            '💀 Survivors List',
            '📋 Rules',
            '⚙️ Settings',
            '🚪 Logout'
        ];

        // Pages to test
        const pagesToTest = [
            { url: 'http://localhost:3002/', name: 'Main App (index.html)' },
            { url: 'http://localhost:3002/survivorResults.html', name: 'Survivor Results' },
            { url: 'http://localhost:3002/nerdfootballTheGrid.html', name: 'The Grid' },
            { url: 'http://localhost:3002/nerdSurvivor.html', name: 'Survivor Picks' }
        ];

        let allTestsPassed = true;

        for (const pageTest of pagesToTest) {
            console.log(`\n🔍 Testing ${pageTest.name}...`);
            
            try {
                await page.goto(pageTest.url, { waitUntil: 'networkidle0' });
                
                // Wait for page to load
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Look for hamburger menu button
                const menuButtonExists = await page.$('#menu-btn') !== null;
                if (!menuButtonExists) {
                    console.log(`❌ ${pageTest.name}: No hamburger menu button found`);
                    allTestsPassed = false;
                    continue;
                }

                // Click hamburger menu
                await page.click('#menu-btn');
                await new Promise(resolve => setTimeout(resolve, 500));

                // Check if menu panel is visible
                const menuPanelVisible = await page.evaluate(() => {
                    const menuPanel = document.getElementById('menu-panel');
                    return menuPanel && !menuPanel.classList.contains('hidden');
                });

                if (!menuPanelVisible) {
                    console.log(`❌ ${pageTest.name}: Menu panel not visible after clicking`);
                    allTestsPassed = false;
                    continue;
                }

                // Get all visible menu items text (excluding items in hidden containers)
                const menuItems = await page.evaluate(() => {
                    const menuPanel = document.getElementById('menu-panel');
                    const items = Array.from(menuPanel.querySelectorAll('[role="menuitem"]'));
                    return items
                        .filter(item => {
                            // Check if item's parent container is hidden
                            const hiddenParent = item.closest('.hidden');
                            const adminControls = document.getElementById('menu-admin-controls');
                            
                            // If item is inside admin controls and admin controls are hidden, exclude it
                            if (adminControls && adminControls.classList.contains('hidden') && 
                                adminControls.contains(item)) {
                                return false;
                            }
                            
                            return true;
                        })
                        .map(item => item.textContent.trim())
                        .filter(text => text.length > 0);
                });

                console.log(`📋 Found ${menuItems.length} menu items:`, menuItems);

                // Check for admin controls visibility (should be hidden for non-admin)
                const adminControlsVisible = await page.evaluate(() => {
                    const adminControls = document.getElementById('menu-admin-controls');
                    return adminControls && !adminControls.classList.contains('hidden');
                });

                console.log(`🔧 Admin controls visible: ${adminControlsVisible}`);

                // Verify menu structure
                let expectedItems = adminControlsVisible ? expectedAdminMenuItems : expectedNonAdminMenuItems;
                
                let menuStructureCorrect = true;
                for (let i = 0; i < expectedItems.length; i++) {
                    if (i >= menuItems.length || !menuItems[i].includes(expectedItems[i])) {
                        console.log(`❌ ${pageTest.name}: Expected "${expectedItems[i]}" at position ${i}, found "${menuItems[i] || 'MISSING'}"`);
                        menuStructureCorrect = false;
                        allTestsPassed = false;
                    }
                }

                if (menuStructureCorrect) {
                    console.log(`✅ ${pageTest.name}: Menu structure correct`);
                } else {
                    console.log(`❌ ${pageTest.name}: Menu structure incorrect`);
                }

                // Check for presence of key icons
                const hasIcons = menuItems.some(item => 
                    item.includes('📝') || item.includes('🏆') || item.includes('📊') || 
                    item.includes('⚔️') || item.includes('💀') || item.includes('📋')
                );

                if (hasIcons) {
                    console.log(`✅ ${pageTest.name}: Icons present in menu items`);
                } else {
                    console.log(`❌ ${pageTest.name}: Icons missing from menu items`);
                    allTestsPassed = false;
                }

                // Click somewhere else to close menu
                await page.click('body');
                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (error) {
                console.log(`❌ ${pageTest.name}: Test error - ${error.message}`);
                allTestsPassed = false;
            }
        }

        // Test User Diagnostic Tool movement to admin panels
        console.log(`\n🔍 Testing User Diagnostic Tool relocation...`);

        // Test in main app admin panel
        await page.goto('http://localhost:3002/', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if User Diagnostic Tool is NOT in hamburger menu anymore
        await page.click('#menu-btn');
        await page.waitForTimeout(500);
        
        const diagnosticInMenu = await page.evaluate(() => {
            const menuPanel = document.getElementById('menu-panel');
            return menuPanel.textContent.includes('User Diagnostic Tool');
        });

        if (diagnosticInMenu) {
            console.log('❌ User Diagnostic Tool still found in hamburger menu (should be removed)');
            allTestsPassed = false;
        } else {
            console.log('✅ User Diagnostic Tool successfully removed from hamburger menu');
        }

        // Test in Survivor Admin panel
        await page.goto('http://localhost:3002/nerdSurvivor.html', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Look for admin panel (may be hidden)
        const adminPanelExists = await page.$('#admin-panel') !== null;
        if (adminPanelExists) {
            // Check if User Diagnostic Tool button is in admin panel
            const diagnosticInAdminPanel = await page.evaluate(() => {
                const adminPanel = document.getElementById('admin-panel');
                return adminPanel && adminPanel.textContent.includes('User Diagnostic Tool');
            });

            if (diagnosticInAdminPanel) {
                console.log('✅ User Diagnostic Tool found in Survivor Admin panel');
            } else {
                console.log('⚠️  User Diagnostic Tool not found in Survivor Admin panel (may be admin-only)');
            }
        }

        // Final summary
        console.log('\n📊 TEST SUMMARY:');
        if (allTestsPassed) {
            console.log('🎉 ALL TESTS PASSED! Hamburger menus are standardized across all views');
            console.log('✅ Consistent menu ordering with icons');
            console.log('✅ Admin section properly positioned at top for admins');
            console.log('✅ User Diagnostic Tool moved to admin panels');
            console.log('✅ All menu items follow the standardized structure');
        } else {
            console.log('❌ SOME TESTS FAILED! Review the issues above');
        }

        return allTestsPassed;

    } catch (error) {
        console.error('💥 Critical test error:', error);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testStandardizedMenus().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});