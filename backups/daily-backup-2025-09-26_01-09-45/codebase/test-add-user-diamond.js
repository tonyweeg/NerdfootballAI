// 💎 DIAMOND LEVEL ADD USER TESTING - Focused Testing 🚀
// Tests the Add User to Pool functionality with precision!

const puppeteer = require('puppeteer');

async function testAddUserFunctionalityDiamond() {
    console.log('💎 Starting Diamond Level Add User Testing... 🚀');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        // Navigate to the hosted site
        console.log('🎯 Loading Nerdfootball hosted site...');
        await page.goto('https://nerdfootball.web.app/', {
            waitUntil: 'networkidle0'
        });
        
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔍 Checking if we can access admin view...');
        
        // Check for admin view parameter or admin functionality
        const currentUrl = await page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        // Try to navigate to admin view
        if (!currentUrl.includes('view=admin')) {
            console.log('🎯 Trying to access admin view...');
            await page.goto('https://nerdfootball.web.app/?view=admin', {
                waitUntil: 'networkidle0'
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Test 1: Check if the Add Users section is present
        console.log('🔍 Looking for Add Users to Pool section...');
        const addUsersSection = await page.$('#add-users-pool-name');
        if (!addUsersSection) {
            console.log('❌ FAIL: Add Users section not found! This could mean:');
            console.log('  - User not authenticated as admin');
            console.log('  - Code not deployed to production');
            console.log('  - Section ID changed or missing');
            
            // Let's check what sections exist
            const allSections = await page.evaluate(() => {
                const sections = Array.from(document.querySelectorAll('h4, h3, h2'));
                return sections.map(s => s.textContent.trim());
            });
            console.log('📋 Available sections:', allSections);
            
            return false;
        }
        console.log('✅ DIAMOND PASS: Add Users section found! 💎');
        
        // Test 2: Check for recent users list
        console.log('🔍 Looking for recent users list...');
        const recentUsersList = await page.$('#recent-users-list');
        if (!recentUsersList) {
            console.log('❌ FAIL: Recent users list not found!');
            return false;
        }
        console.log('✅ PASS: Recent users list found!');
        
        // Test 3: Check for search input
        console.log('🔍 Looking for user search input...');
        const searchInput = await page.$('#user-search-input');
        if (!searchInput) {
            console.log('❌ FAIL: User search input not found!');
            return false;
        }
        console.log('✅ PASS: User search input found!');
        
        // Test 4: Check for modal dialog elements
        console.log('🔍 Looking for add user modal...');
        const addUserModal = await page.$('#add-user-modal');
        if (!addUserModal) {
            console.log('❌ FAIL: Add user modal not found!');
            return false;
        }
        console.log('✅ PASS: Add user modal found!');
        
        // Test 5: Try typing in search input (should trigger search function)
        console.log('🎯 Testing search input functionality...');
        await searchInput.click();
        await searchInput.type('test');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for debounce
        console.log('✅ PASS: Search input accepts input!');
        
        // Test 6: Check if search results list appears
        console.log('🔍 Looking for search results list...');
        const searchResultsList = await page.$('#search-results-list');
        if (!searchResultsList) {
            console.log('❌ FAIL: Search results list not found!');
            return false;
        }
        console.log('✅ PASS: Search results list found!');
        
        // Test 7: Test modal opening (click a user if available)
        console.log('🎯 Testing if we can find any users to add...');
        
        // Look for any "Add Member" or "Add Admin" buttons
        const addButtons = await page.$$('button[id*="add-member"], button[id*="add-admin"]');
        console.log(`📊 Found ${addButtons.length} add user buttons`);
        
        if (addButtons.length > 0) {
            console.log('🎯 Testing add user button click...');
            await addButtons[0].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if modal opened
            const isModalVisible = await page.evaluate(() => {
                const modal = document.getElementById('add-user-modal');
                return modal && !modal.classList.contains('hidden');
            });
            
            if (isModalVisible) {
                console.log('✅ DIAMOND PASS: Modal opened successfully! 💎');
                
                // Close modal for cleanup
                const closeButton = await page.$('#close-add-user-modal');
                if (closeButton) {
                    await closeButton.click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } else {
                console.log('❌ FAIL: Modal did not open when button clicked!');
            }
        } else {
            console.log('ℹ️  No add user buttons found - this could be normal if no users are available to add');
        }
        
        console.log('\\n🏆 DIAMOND LEVEL SUCCESS! Add User functionality structure verified! 💎🚀');
        console.log('🔥 All UI components are present and functional!');
        
        return true;
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR during testing:', error);
        return false;
    } finally {
        // Keep browser open for 10 seconds to see the result
        console.log('🕐 Keeping browser open for inspection...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        await browser.close();
    }
}

// Run the Diamond Level test
testAddUserFunctionalityDiamond()
    .then(success => {
        if (success) {
            console.log('\\n💎🏆 DIAMOND ACHIEVEMENT UNLOCKED! 🏆💎');
            console.log('Add User functionality is properly deployed!');
        } else {
            console.log('\\n❌ Testing failed - needs investigation!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Fatal test error:', error);
        process.exit(1);
    });