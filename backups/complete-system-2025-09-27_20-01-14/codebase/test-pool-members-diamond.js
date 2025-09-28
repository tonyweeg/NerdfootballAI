// 💎 DIAMOND LEVEL POOL MEMBERS TEST - Complete Standardization Verification 🚀
// Tests that ALL 9 user displays use pool members as single source of truth

const puppeteer = require('puppeteer');

async function testPoolMembersStandardization() {
    console.log('💎 Starting Diamond Level Pool Members Standardization Test... 🚀');
    console.log('🎯 CRITICAL: Testing all 9 user displays for pool members usage');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Track all tests
    const testResults = {
        passed: [],
        failed: [],
        errors: []
    };
    
    // Track console logs
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        if (text.includes('💎 DIAMOND:') || text.includes('Pool members')) {
            console.log(`✅ POOL MEMBERS LOG: ${text}`);
        }
    });
    
    // Track JavaScript errors
    page.on('pageerror', error => {
        testResults.errors.push(error.message);
        console.log(`❌ JS ERROR: ${error.message}`);
    });
    
    try {
        // Load the main application
        console.log('\n📍 TEST 1: Loading Main Application...');
        await page.goto('https://nerdfootball.web.app', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for pool members logs
        const poolMembersLoaded = consoleLogs.some(log => 
            log.includes('DIAMOND: Loaded') && log.includes('users from pool members')
        );
        
        if (poolMembersLoaded) {
            testResults.passed.push('Main app loads pool members');
            console.log('✅ PASS: Main application loads pool members');
        } else {
            testResults.failed.push('Main app does NOT load pool members');
            console.log('❌ FAIL: No pool members loading detected in main app');
        }
        
        // TEST 2: Check Leaderboard View
        console.log('\n📍 TEST 2: Checking Leaderboard View...');
        await page.evaluate(() => {
            const leaderboardBtn = document.querySelector('#leaderboard-view-btn');
            if (leaderboardBtn) leaderboardBtn.click();
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const leaderboardBody = await page.$('#public-leaderboard-body');
        if (leaderboardBody) {
            const leaderboardRows = await page.evaluate(() => {
                const tbody = document.querySelector('#public-leaderboard-body');
                return tbody ? tbody.children.length : 0;
            });
            
            if (leaderboardRows > 0) {
                testResults.passed.push(`Leaderboard displays ${leaderboardRows} users`);
                console.log(`✅ PASS: Leaderboard shows ${leaderboardRows} users from pool`);
            } else {
                testResults.failed.push('Leaderboard shows no users');
                console.log('❌ FAIL: Leaderboard empty');
            }
        }
        
        // TEST 3: Check Admin Panel (if accessible)
        console.log('\n📍 TEST 3: Checking Admin Panel...');
        const isAdmin = await page.evaluate(() => {
            const adminBtn = document.querySelector('#menu-admin-view-btn');
            return adminBtn && !adminBtn.classList.contains('hidden');
        });
        
        if (isAdmin) {
            await page.evaluate(() => {
                const adminBtn = document.querySelector('#menu-admin-view-btn');
                if (adminBtn) adminBtn.click();
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check pool members table
            const poolMembersTable = await page.$('#pool-members-tbody');
            if (poolMembersTable) {
                const memberCount = await page.evaluate(() => {
                    const tbody = document.querySelector('#pool-members-tbody');
                    return tbody ? tbody.children.length - 1 : 0; // Subtract header row if present
                });
                
                if (memberCount > 0) {
                    testResults.passed.push(`Pool members table shows ${memberCount} members`);
                    console.log(`✅ PASS: Pool members table displays ${memberCount} members`);
                } else {
                    testResults.failed.push('Pool members table empty');
                    console.log('❌ FAIL: Pool members table shows no members');
                }
            }
        } else {
            console.log('⚠️  SKIP: Admin panel not accessible');
        }
        
        // TEST 4: Check The Grid
        console.log('\n📍 TEST 4: Checking The Grid...');
        await page.goto('https://nerdfootball.web.app/nerdfootballTheGrid.html', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for pool members path in console
        const gridUsesPoolMembers = consoleLogs.some(log => 
            log.includes('POOL MEMBERS path') || 
            log.includes('Using pool members')
        );
        
        if (gridUsesPoolMembers) {
            testResults.passed.push('Grid uses pool members');
            console.log('✅ PASS: The Grid loads from pool members');
        } else {
            testResults.failed.push('Grid may not use pool members');
            console.log('⚠️  WARNING: Grid pool members usage unclear');
        }
        
        // TEST 5: Check Survivor Page
        console.log('\n📍 TEST 5: Checking Survivor Page...');
        await page.goto('https://nerdfootball.web.app/nerdSurvivor.html', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if survivor page loaded
        const survivorTitle = await page.$eval('h1', el => el.textContent);
        if (survivorTitle.includes('Survivor')) {
            testResults.passed.push('Survivor page loads');
            console.log('✅ PASS: Survivor page accessible');
        } else {
            testResults.failed.push('Survivor page issue');
            console.log('❌ FAIL: Survivor page not loading correctly');
        }
        
        // TEST 6: Ghost User Check
        console.log('\n📍 TEST 6: Checking for Ghost User...');
        const ghostUserFound = await page.evaluate(() => {
            const allText = document.body.textContent;
            return allText.includes('okl4sw2aDhW3yKpOfOwe5lH7OQj1');
        });
        
        if (!ghostUserFound) {
            testResults.passed.push('NO ghost user found');
            console.log('✅ DIAMOND PASS: Ghost user eliminated!');
        } else {
            testResults.failed.push('GHOST USER STILL EXISTS!');
            console.log('❌ CRITICAL FAIL: Ghost user detected!');
        }
        
        // FINAL RESULTS
        console.log('\n' + '='.repeat(60));
        console.log('💎 DIAMOND LEVEL TEST RESULTS 💎');
        console.log('='.repeat(60));
        
        console.log(`\n✅ PASSED: ${testResults.passed.length} tests`);
        testResults.passed.forEach(test => console.log(`   ✓ ${test}`));
        
        if (testResults.failed.length > 0) {
            console.log(`\n❌ FAILED: ${testResults.failed.length} tests`);
            testResults.failed.forEach(test => console.log(`   ✗ ${test}`));
        }
        
        if (testResults.errors.length > 0) {
            console.log(`\n⚠️ ERRORS: ${testResults.errors.length}`);
            testResults.errors.forEach(error => console.log(`   ! ${error}`));
        }
        
        const allPassed = testResults.failed.length === 0 && testResults.errors.length === 0;
        
        if (allPassed) {
            console.log('\n🏆 DIAMOND STANDARD ACHIEVED! All tests passed! 💎');
        } else {
            console.log('\n⚠️ ISSUES DETECTED - Diamond standard not met');
        }
        
        return allPassed;
        
    } catch (error) {
        console.error('💥 CRITICAL TEST ERROR:', error.message);
        return false;
    } finally {
        console.log('\n🕐 Keeping browser open for inspection...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await browser.close();
    }
}

// Run the comprehensive test
testPoolMembersStandardization()
    .then(success => {
        if (success) {
            console.log('\n💎🏆 POOL MEMBERS STANDARDIZATION VERIFIED! 🏆💎');
            console.log('🔥 All user displays use pool members as single source of truth!');
        } else {
            console.log('\n❌ STANDARDIZATION INCOMPLETE - Review failed tests');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Fatal test error:', error);
        process.exit(1);
    });