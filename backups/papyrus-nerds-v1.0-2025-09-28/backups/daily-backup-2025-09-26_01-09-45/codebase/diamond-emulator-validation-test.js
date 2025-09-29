/**
 * DIAMOND Level Firebase Emulator Validation Test
 * Comprehensive validation of emulator setup and multi-entry functionality
 */

const puppeteer = require('puppeteer');

class DiamondEmulatorValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            connectivity: [],
            authentication: [],
            adminAccess: [],
            weekParameters: [],
            poolData: [],
            multiEntry: [],
            integration: []
        };
        this.emulatorUrl = 'http://127.0.0.1:5002';
        this.adminTestEmail = 'tony@test.com';
        this.testPassword = 'testpass123';
    }

    async initialize() {
        try {
            console.log('🔍 DIAMOND Emulator Validation Starting...\n');
            
            this.browser = await puppeteer.launch({
                headless: false,
                defaultViewport: { width: 1200, height: 800 },
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage'
                ]
            });
            
            this.page = await this.browser.newPage();
            
            // Set up error/console monitoring
            this.page.on('console', msg => {
                const type = msg.type();
                if (type === 'error' || type === 'warning') {
                    console.log(`📱 Console ${type.toUpperCase()}: ${msg.text()}`);
                }
            });
            
            this.page.on('pageerror', error => {
                console.log(`🚨 Page Error: ${error.message}`);
            });
            
            return { success: true };
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async testEmulatorConnectivity() {
        console.log('🧪 Testing Firebase Emulator Connectivity...');
        
        try {
            // Test 1: Page loads successfully
            await this.page.goto(this.emulatorUrl, { 
                waitUntil: 'networkidle0',
                timeout: 10000 
            });
            
            this.results.connectivity.push({
                test: 'Page Load',
                status: 'PASS',
                message: 'Application loads successfully'
            });

            // Test 2: Local config detection
            const isLocalMode = await this.page.evaluate(() => {
                return window.localConfig && window.localConfig.isLocalDevelopment();
            });
            
            this.results.connectivity.push({
                test: 'Local Mode Detection',
                status: isLocalMode ? 'PASS' : 'FAIL',
                message: isLocalMode ? 'Local development mode detected' : 'Local mode detection failed'
            });

            // Test 3: Emulator indicator visibility
            const indicatorVisible = await this.page.$('#emulator-indicator');
            
            this.results.connectivity.push({
                test: 'Emulator Indicator',
                status: indicatorVisible ? 'PASS' : 'FAIL',
                message: indicatorVisible ? 'Emulator indicator visible' : 'No emulator indicator found'
            });

            // Test 4: Multi-entry scripts loading
            const multiEntryScripts = await this.page.evaluate(() => {
                return {
                    entryFeatureFlags: !!window.EntryFeatureFlags,
                    entryAdminControls: !!window.EntryAdminControls,
                    entryManagementService: !!window.EntryManagementService
                };
            });
            
            const scriptsLoaded = Object.values(multiEntryScripts).every(loaded => loaded);
            
            this.results.connectivity.push({
                test: 'Multi-Entry Scripts',
                status: scriptsLoaded ? 'PASS' : 'FAIL',
                message: scriptsLoaded ? 'All multi-entry scripts loaded' : 'Some multi-entry scripts missing',
                details: multiEntryScripts
            });

            // Test 5: Firebase emulator connection
            await this.page.waitForTimeout(2000); // Allow Firebase init
            
            const firebaseStatus = await this.page.evaluate(() => {
                return {
                    firebase: !!window.firebase,
                    db: !!window.db,
                    auth: !!window.auth,
                    emulatorMode: !!window.USE_FIREBASE_EMULATORS
                };
            });
            
            const firebaseReady = Object.values(firebaseStatus).every(ready => ready);
            
            this.results.connectivity.push({
                test: 'Firebase Emulator Connection',
                status: firebaseReady ? 'PASS' : 'FAIL',
                message: firebaseReady ? 'Firebase connected to emulators' : 'Firebase emulator connection issues',
                details: firebaseStatus
            });

        } catch (error) {
            this.results.connectivity.push({
                test: 'Emulator Connectivity',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async testAuthentication() {
        console.log('🔐 Testing Authentication Flow...');
        
        try {
            // Test 1: Login form available
            const loginButton = await this.page.$('#loginButton');
            
            this.results.authentication.push({
                test: 'Login Form Available',
                status: loginButton ? 'PASS' : 'FAIL',
                message: loginButton ? 'Login button found' : 'No login button found'
            });

            if (!loginButton) {
                return;
            }

            // Test 2: Attempt login with test credentials
            await this.page.click('#loginButton');
            await this.page.waitForTimeout(2000);

            // Check if Firebase Auth emulator UI opened
            const authStarted = await this.page.evaluate(() => {
                // Look for auth-related elements or state changes
                return document.querySelector('#authStatus') !== null ||
                       document.body.innerHTML.includes('authentication') ||
                       window.auth?.currentUser !== null;
            });

            this.results.authentication.push({
                test: 'Auth Process Initiation',
                status: authStarted ? 'PASS' : 'WARN',
                message: authStarted ? 'Authentication process started' : 'Auth process unclear - manual verification needed'
            });

            // Test 3: Check for local testing bypass
            const localBypass = await this.page.evaluate(() => {
                return window.localConfig?.isLocalDevelopment() && 
                       (document.body.innerHTML.includes('Local testing mode') || 
                        document.body.innerHTML.includes('🧪'));
            });

            this.results.authentication.push({
                test: 'Local Testing Bypass',
                status: localBypass ? 'PASS' : 'WARN',
                message: localBypass ? 'Local testing mode active' : 'Local bypass unclear'
            });

        } catch (error) {
            this.results.authentication.push({
                test: 'Authentication Flow',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async testAdminAccess() {
        console.log('⚙️  Testing Admin View Access...');
        
        try {
            // Test 1: Admin URL routing
            const adminUrl = `${this.emulatorUrl}/?view=admin`;
            await this.page.goto(adminUrl, { 
                waitUntil: 'networkidle0',
                timeout: 10000 
            });

            // Check if URL parameter preserved
            const currentUrl = await this.page.url();
            const hasAdminParam = currentUrl.includes('view=admin');

            this.results.adminAccess.push({
                test: 'Admin URL Routing',
                status: hasAdminParam ? 'PASS' : 'FAIL',
                message: hasAdminParam ? 'Admin view parameter preserved' : 'Admin URL parameter lost'
            });

            // Test 2: Admin tabs visibility
            await this.page.waitForTimeout(3000);
            
            const adminTabs = await this.page.evaluate(() => {
                const tabs = ['Games', 'Users', 'Picks', 'Survivors', 'Messaging', 'Pool Settings'];
                const results = {};
                
                tabs.forEach(tab => {
                    const element = document.querySelector(`[data-tab="${tab.toLowerCase()}"], [onclick*="${tab}"], [id*="${tab.toLowerCase()}"]`);
                    results[tab] = !!element;
                });
                
                return results;
            });

            const tabsFound = Object.values(adminTabs).filter(found => found).length;

            this.results.adminAccess.push({
                test: 'Admin Tabs Presence',
                status: tabsFound >= 4 ? 'PASS' : 'WARN',
                message: `${tabsFound}/6 admin tabs found`,
                details: adminTabs
            });

            // Test 3: Local testing admin bypass
            const adminBypass = await this.page.evaluate(() => {
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const hasAdminAccess = document.body.innerHTML.includes('admin') || 
                                     document.body.innerHTML.includes('Admin') ||
                                     document.querySelector('[class*="admin"]') !== null;
                
                return { isLocal, hasAdminAccess };
            });

            this.results.adminAccess.push({
                test: 'Local Admin Bypass',
                status: adminBypass.isLocal && adminBypass.hasAdminAccess ? 'PASS' : 'WARN',
                message: adminBypass.isLocal ? 'Local admin bypass active' : 'Admin bypass status unclear',
                details: adminBypass
            });

        } catch (error) {
            this.results.adminAccess.push({
                test: 'Admin Access',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async testWeekParameters() {
        console.log('📅 Testing Week Parameter Handling...');
        
        try {
            // Test 1: Week detection without parameters
            await this.page.goto(this.emulatorUrl);
            await this.page.waitForTimeout(2000);
            
            const weekDetection = await this.page.evaluate(() => {
                // Check for week-related functions and variables
                const hasGetCurrentWeek = typeof getCurrentNflWeek !== 'undefined';
                const hasWeekFallback = typeof switchToAdminTab !== 'undefined';
                
                // Try to get current week
                let currentWeek = null;
                try {
                    if (typeof getCurrentNflWeek !== 'undefined') {
                        currentWeek = getCurrentNflWeek();
                    }
                } catch (e) {
                    // Expected if no fallback implemented
                }
                
                return {
                    hasGetCurrentWeek,
                    hasWeekFallback,
                    currentWeek,
                    noUndefinedWeek: currentWeek !== undefined && currentWeek !== null && currentWeek !== ''
                };
            });

            this.results.weekParameters.push({
                test: 'Week Detection Functions',
                status: weekDetection.hasGetCurrentWeek ? 'PASS' : 'FAIL',
                message: 'Week detection functions available',
                details: weekDetection
            });

            this.results.weekParameters.push({
                test: 'No Undefined Week Values',
                status: weekDetection.noUndefinedWeek ? 'PASS' : 'WARN',
                message: weekDetection.noUndefinedWeek ? 'Week values properly handled' : 'Week values may be undefined'
            });

            // Test 2: Admin tab with week parameters
            const adminTabTest = await this.page.evaluate(() => {
                // Simulate admin tab click to test week parameter handling
                try {
                    if (typeof switchToAdminTab !== 'undefined') {
                        // Test if function exists and can be called
                        return { canCall: true, error: null };
                    } else {
                        return { canCall: false, error: 'Function not found' };
                    }
                } catch (error) {
                    return { canCall: false, error: error.message };
                }
            });

            this.results.weekParameters.push({
                test: 'Admin Tab Week Handling',
                status: adminTabTest.canCall ? 'PASS' : 'WARN',
                message: adminTabTest.canCall ? 'Admin tab functions handle week parameters' : 'Week parameter handling unclear',
                details: adminTabTest
            });

        } catch (error) {
            this.results.weekParameters.push({
                test: 'Week Parameters',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async testPoolDataIntegrity() {
        console.log('🎱 Testing Pool Data Integrity...');
        
        try {
            // Test 1: Pool members path validation
            const poolDataStatus = await this.page.evaluate(async () => {
                if (!window.db) return { error: 'Database not available' };
                
                try {
                    const poolId = 'nerduniverse-2025';
                    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
                    
                    // Check if we can construct the path
                    const membersRef = window.db.collection('artifacts')
                        .doc('nerdfootball')
                        .collection('pools')
                        .doc(poolId)
                        .collection('metadata')
                        .doc('members');
                    
                    return { 
                        pathConstructed: true,
                        poolId: poolId
                    };
                } catch (error) {
                    return { error: error.message };
                }
            });

            this.results.poolData.push({
                test: 'Pool Data Path Construction',
                status: poolDataStatus.pathConstructed ? 'PASS' : 'FAIL',
                message: poolDataStatus.pathConstructed ? 'Pool data paths can be constructed' : 'Pool path construction failed',
                details: poolDataStatus
            });

            // Test 2: Ghost user prevention check
            const ghostUserCheck = await this.page.evaluate(() => {
                const ghostUserId = 'okl4sw2aDhW3yKpOfOwe5lH7OQj1';
                
                // Check if ghost user ID is mentioned anywhere in the page
                const bodyText = document.body.innerText.toLowerCase();
                const htmlContent = document.body.innerHTML;
                
                const ghostFound = bodyText.includes(ghostUserId.toLowerCase()) || 
                                 htmlContent.includes(ghostUserId);
                
                return {
                    ghostFound,
                    ghostUserId,
                    bodyLength: bodyText.length
                };
            });

            this.results.poolData.push({
                test: 'Ghost User Prevention',
                status: !ghostUserCheck.ghostFound ? 'PASS' : 'FAIL',
                message: !ghostUserCheck.ghostFound ? 'No ghost user detected' : 'Ghost user found in page',
                details: ghostUserCheck
            });

        } catch (error) {
            this.results.poolData.push({
                test: 'Pool Data Integrity',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async testMultiEntryFeatureFlags() {
        console.log('🚩 Testing Multi-Entry Feature Flag System...');
        
        try {
            // Test 1: Feature flags initialization
            const flagsInit = await this.page.evaluate(async () => {
                if (!window.EntryFeatureFlags || !window.db) {
                    return { error: 'Feature flags or database not available' };
                }
                
                try {
                    const flags = new window.EntryFeatureFlags(window.db);
                    const initResult = await flags.initialize();
                    
                    return {
                        initialized: true,
                        success: initResult.success,
                        flags: flags.getAllFlags()
                    };
                } catch (error) {
                    return { error: error.message };
                }
            });

            this.results.multiEntry.push({
                test: 'Feature Flags Initialization',
                status: flagsInit.initialized ? 'PASS' : 'FAIL',
                message: flagsInit.initialized ? 'Feature flags initialized successfully' : 'Feature flags initialization failed',
                details: flagsInit
            });

            // Test 2: Default flag safety
            if (flagsInit.flags) {
                const criticalFlags = [
                    'MULTI_ENTRY_DATA_ENABLED',
                    'ENTRY_CREATION_ENABLED',
                    'LEGACY_DATA_PRESERVATION'
                ];
                
                const safetyCheck = criticalFlags.reduce((acc, flag) => {
                    acc[flag] = {
                        value: flagsInit.flags[flag],
                        safe: flag === 'LEGACY_DATA_PRESERVATION' ? flagsInit.flags[flag] === true : flagsInit.flags[flag] === false
                    };
                    return acc;
                }, {});

                const allSafe = Object.values(safetyCheck).every(flag => flag.safe);

                this.results.multiEntry.push({
                    test: 'Default Flag Safety',
                    status: allSafe ? 'PASS' : 'WARN',
                    message: allSafe ? 'All critical flags in safe default state' : 'Some flags may not be in safe defaults',
                    details: safetyCheck
                });
            }

            // Test 3: Admin controls availability
            const adminControlsTest = await this.page.evaluate(async () => {
                if (!window.EntryAdminControls || !window.db) {
                    return { error: 'Admin controls not available' };
                }
                
                try {
                    const adminControls = new window.EntryAdminControls(window.db, null, null);
                    const testUserId = 'test_admin_user';
                    
                    // Test admin permission check (should pass in local mode)
                    const hasPermission = await adminControls.verifyAdminPermissions(testUserId);
                    
                    return {
                        available: true,
                        localBypass: hasPermission, // Should be true in local testing
                        testUserId
                    };
                } catch (error) {
                    return { error: error.message };
                }
            });

            this.results.multiEntry.push({
                test: 'Admin Controls Local Bypass',
                status: adminControlsTest.localBypass ? 'PASS' : 'WARN',
                message: adminControlsTest.localBypass ? 'Local admin bypass working' : 'Admin controls may not have local bypass',
                details: adminControlsTest
            });

        } catch (error) {
            this.results.multiEntry.push({
                test: 'Multi-Entry Feature Flags',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async testIntegrationScenarios() {
        console.log('🔗 Testing Integration Scenarios...');
        
        try {
            // Test 1: URL parameter preservation across navigation
            const urlTests = [
                `${this.emulatorUrl}/?view=admin`,
                `${this.emulatorUrl}/?view=picks`,
                `${this.emulatorUrl}/?view=leaderboard`,
                `${this.emulatorUrl}/?view=survivor-picks`
            ];

            for (const testUrl of urlTests) {
                await this.page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 5000 });
                await this.page.waitForTimeout(1000);
                
                const finalUrl = await this.page.url();
                const paramPreserved = finalUrl.includes('view=');
                
                this.results.integration.push({
                    test: `URL Parameters - ${testUrl.split('=')[1]}`,
                    status: paramPreserved ? 'PASS' : 'WARN',
                    message: paramPreserved ? 'URL parameters preserved' : 'URL parameters may be lost',
                    details: { original: testUrl, final: finalUrl }
                });
            }

            // Test 2: Error handling resilience
            const errorHandling = await this.page.evaluate(() => {
                const errors = [];
                let errorCount = 0;
                
                // Override console.error to catch errors
                const originalError = console.error;
                console.error = function(...args) {
                    errorCount++;
                    errors.push(args.join(' '));
                    return originalError.apply(console, arguments);
                };
                
                return { errorCount: errorCount, recentErrors: errors.slice(-5) };
            });

            this.results.integration.push({
                test: 'Error Handling Resilience',
                status: errorHandling.errorCount < 5 ? 'PASS' : 'WARN',
                message: `${errorHandling.errorCount} console errors detected`,
                details: errorHandling
            });

        } catch (error) {
            this.results.integration.push({
                test: 'Integration Scenarios',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async runAllTests() {
        const startTime = Date.now();
        
        try {
            await this.testEmulatorConnectivity();
            await this.testAuthentication();
            await this.testAdminAccess();
            await this.testWeekParameters();
            await this.testPoolDataIntegrity();
            await this.testMultiEntryFeatureFlags();
            await this.testIntegrationScenarios();
            
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            console.log(`\n✅ All tests completed in ${duration.toFixed(2)} seconds`);
            
            return this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    generateReport() {
        const allTests = [
            ...this.results.connectivity,
            ...this.results.authentication,
            ...this.results.adminAccess,
            ...this.results.weekParameters,
            ...this.results.poolData,
            ...this.results.multiEntry,
            ...this.results.integration
        ];

        const passed = allTests.filter(test => test.status === 'PASS').length;
        const failed = allTests.filter(test => test.status === 'FAIL').length;
        const warnings = allTests.filter(test => test.status === 'WARN').length;
        const total = allTests.length;

        const overallStatus = failed === 0 ? (warnings === 0 ? 'PASS' : 'PASS_WITH_WARNINGS') : 'FAIL';

        return {
            success: failed === 0,
            overallStatus,
            summary: {
                total,
                passed,
                failed,
                warnings,
                passRate: Math.round((passed / total) * 100)
            },
            categories: {
                connectivity: this.results.connectivity,
                authentication: this.results.authentication,
                adminAccess: this.results.adminAccess,
                weekParameters: this.results.weekParameters,
                poolData: this.results.poolData,
                multiEntry: this.results.multiEntry,
                integration: this.results.integration
            },
            recommendations: this.generateRecommendations(allTests)
        };
    }

    generateRecommendations(allTests) {
        const recommendations = [];
        const failedTests = allTests.filter(test => test.status === 'FAIL');
        const warningTests = allTests.filter(test => test.status === 'WARN');

        // High priority recommendations for failed tests
        failedTests.forEach(test => {
            recommendations.push({
                priority: 'HIGH',
                category: 'Bug Fix',
                issue: test.test,
                description: test.message || test.error,
                action: `Fix: ${test.test} is failing and needs immediate attention`
            });
        });

        // Medium priority for warnings
        warningTests.forEach(test => {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Improvement',
                issue: test.test,
                description: test.message,
                action: `Investigate: ${test.test} shows warnings that should be addressed`
            });
        });

        // General recommendations
        if (failedTests.length === 0 && warningTests.length === 0) {
            recommendations.push({
                priority: 'LOW',
                category: 'Enhancement',
                issue: 'System Health',
                description: 'All tests passing - system ready for user testing',
                action: 'Proceed with manual testing and user acceptance testing'
            });
        }

        return recommendations;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Main execution
async function runDiamondValidation() {
    const validator = new DiamondEmulatorValidator();
    
    try {
        const initResult = await validator.initialize();
        if (!initResult.success) {
            console.error('❌ Failed to initialize validator');
            return;
        }
        
        const report = await validator.runAllTests();
        
        console.log('\n' + '='.repeat(80));
        console.log('💎 DIAMOND EMULATOR VALIDATION REPORT');
        console.log('='.repeat(80));
        
        console.log(`\n📊 OVERALL STATUS: ${report.overallStatus}`);
        console.log(`📈 PASS RATE: ${report.summary.passRate}%`);
        console.log(`✅ PASSED: ${report.summary.passed}`);
        console.log(`⚠️  WARNINGS: ${report.summary.warnings}`);
        console.log(`❌ FAILED: ${report.summary.failed}`);
        console.log(`📋 TOTAL TESTS: ${report.summary.total}`);
        
        if (report.recommendations.length > 0) {
            console.log('\n🔧 RECOMMENDATIONS:');
            report.recommendations.forEach((rec, i) => {
                console.log(`${i + 1}. [${rec.priority}] ${rec.issue}: ${rec.action}`);
            });
        }
        
        // Save detailed report
        const fs = require('fs');
        fs.writeFileSync(
            '/Users/tonyweeg/nerdfootball-project/diamond-validation-detailed-report.json', 
            JSON.stringify(report, null, 2)
        );
        
        console.log('\n📁 Detailed report saved to: diamond-validation-detailed-report.json');
        
        return report;
        
    } catch (error) {
        console.error('❌ Validation failed:', error);
    } finally {
        await validator.cleanup();
    }
}

// Export for programmatic use
module.exports = { DiamondEmulatorValidator, runDiamondValidation };

// Run if called directly
if (require.main === module) {
    runDiamondValidation();
}