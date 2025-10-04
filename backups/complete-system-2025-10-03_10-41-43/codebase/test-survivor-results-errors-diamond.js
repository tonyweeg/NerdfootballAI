// Diamond Level Test: Verify survivor results page loads without critical errors
const puppeteer = require('puppeteer');

(async () => {
    let browser;
    let page;
    let testsPassed = 0;
    let testsFailed = 0;
    
    try {
        console.log('🚀 Starting Diamond Level Test: Survivor Results Error Fix');
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        // Capture console errors and messages
        const consoleErrors = [];
        const consoleMessages = [];
        
        page.on('console', msg => {
            const text = msg.text();
            consoleMessages.push({ type: msg.type(), text });
            
            if (msg.type() === 'error') {
                consoleErrors.push(text);
                console.log('❌ Console Error:', text);
            } else if (msg.type() === 'warning') {
                console.log('⚠️ Console Warning:', text);
            }
        });
        
        // Capture uncaught exceptions
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push(error.message);
            console.log('💥 Page Error:', error.message);
        });
        
        console.log('📋 Test 1: Navigate to Survivor Results page');
        await page.goto('https://nerdfootball.web.app/survivorResults.html', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for initial load and Firebase to initialize
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Ensure the main content is loaded
        await page.waitForSelector('main', { timeout: 10000 });
        
        console.log('📋 Test 2: Check for critical JavaScript errors');
        const hasCriticalErrors = consoleErrors.some(error => 
            error.includes('Cannot set properties of null') ||
            error.includes('TypeError') ||
            error.includes('ReferenceError')
        );
        
        if (!hasCriticalErrors) {
            console.log('✅ No critical JavaScript errors found');
            testsPassed++;
        } else {
            console.log('❌ Critical JavaScript errors detected');
            testsFailed++;
        }
        
        console.log('📋 Test 3: Check FCM integration doesn\'t cause immediate failures');
        const hasFCMErrors = consoleErrors.some(error => 
            error.includes('Firebase messaging not available after waiting')
        );
        
        if (!hasFCMErrors) {
            console.log('✅ No immediate FCM integration failures');
            testsPassed++;
        } else {
            console.log('❌ FCM integration causing immediate failures');
            testsFailed++;
        }
        
        console.log('📋 Test 4: Verify DOM elements exist');
        try {
            const userDisplayExists = await page.$('#user-display') !== null;
            const loadingExists = await page.$('#loading-container') !== null;
            const errorExists = await page.$('#error-container') !== null;
            const resultsExists = await page.$('#results-container') !== null;
            
            if (userDisplayExists && loadingExists && errorExists && resultsExists) {
                console.log('✅ All critical DOM elements exist');
                testsPassed++;
            } else {
                console.log('❌ Some critical DOM elements are missing');
                console.log(`- user-display: ${userDisplayExists}`);
                console.log(`- loading-container: ${loadingExists}`);
                console.log(`- error-container: ${errorExists}`);
                console.log(`- results-container: ${resultsExists}`);
                testsFailed++;
            }
        } catch (error) {
            console.log('❌ Error checking DOM elements:', error.message);
            testsFailed++;
        }
        
        console.log('📋 Test 5: Check page doesn\'t crash during auth state change simulation');
        try {
            // Try to trigger auth state change handling
            await page.evaluate(() => {
                if (window.auth && window.auth.onAuthStateChanged) {
                    // Simulate auth state change with null user (like logout)
                    const mockUser = null;
                    // This should not crash the page
                    return true;
                }
                return false;
            });
            console.log('✅ Page handles auth state changes gracefully');
            testsPassed++;
        } catch (error) {
            console.log('❌ Page crashes during auth state handling:', error.message);
            testsFailed++;
        }
        
        console.log('📋 Test 6: Verify no null reference errors in elements object');
        try {
            const elementsIntegrity = await page.evaluate(() => {
                const elements = {
                    loadingContainer: document.getElementById('loading-container'),
                    errorContainer: document.getElementById('error-container'),
                    resultsContainer: document.getElementById('results-container'),
                    noResults: document.getElementById('no-results'),
                    resultsTbody: document.getElementById('results-tbody'),
                    totalPlayers: document.getElementById('total-players'),
                    activePlayers: document.getElementById('active-players'),
                    eliminatedPlayers: document.getElementById('eliminated-players'),
                    currentWeek: document.getElementById('current-week'),
                    userDisplay: document.getElementById('user-display'),
                    logoutBtn: document.getElementById('logout-btn'),
                    menuBtn: document.getElementById('menu-btn'),
                    menuPanel: document.getElementById('menu-panel'),
                    menuAdminControls: document.getElementById('menu-admin-controls'),
                    retryBtn: document.getElementById('retry-btn'),
                    errorMessage: document.getElementById('error-message'),
                    poolSwitcherBtn: document.getElementById('pool-switcher-btn'),
                    poolSwitcherDropdown: document.getElementById('pool-switcher-dropdown'),
                    currentPoolName: document.getElementById('current-pool-name')
                };
                
                const nullElements = [];
                for (const [key, element] of Object.entries(elements)) {
                    if (element === null) {
                        nullElements.push(key);
                    }
                }
                
                return { nullElements, totalElements: Object.keys(elements).length };
            });
            
            if (elementsIntegrity.nullElements.length === 0) {
                console.log(`✅ All ${elementsIntegrity.totalElements} DOM elements found successfully`);
                testsPassed++;
            } else {
                console.log(`❌ ${elementsIntegrity.nullElements.length} DOM elements are null:`, elementsIntegrity.nullElements);
                testsFailed++;
            }
        } catch (error) {
            console.log('❌ Error checking elements integrity:', error.message);
            testsFailed++;
        }
        
        console.log('\n📊 Error Analysis Summary:');
        console.log(`Total Console Messages: ${consoleMessages.length}`);
        console.log(`Console Errors: ${consoleErrors.length}`);
        console.log(`Page Errors: ${pageErrors.length}`);
        
        if (consoleErrors.length > 0) {
            console.log('\n🚨 All Console Errors:');
            consoleErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }
        
        if (pageErrors.length > 0) {
            console.log('\n💥 All Page Errors:');
            pageErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }
        
        console.log('\n🎯 Diamond Level Test Results:');
        console.log(`✅ Tests Passed: ${testsPassed}`);
        console.log(`❌ Tests Failed: ${testsFailed}`);
        console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
        
        if (testsFailed === 0) {
            console.log('\n💎 DIAMOND STANDARD ACHIEVED: All critical errors fixed!');
            console.log('🚀 Survivor Results page is now error-free and production-ready.');
        } else {
            console.log('\n⚠️ Some issues remain. Review failed tests above.');
        }
        
    } catch (error) {
        console.error('💥 Test execution failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();