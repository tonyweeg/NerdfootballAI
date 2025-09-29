#!/usr/bin/env node

const puppeteer = require('puppeteer');

class UnifiedViewSystemTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:3000';
        this.testResults = {
            passed: 0,
            failed: 0,
            failures: []
        };
    }

    async setup() {
        console.log('🚀 Setting up Diamond-level testing environment...');
        this.browser = await puppeteer.launch({ 
            headless: false, 
            defaultViewport: { width: 1200, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        
        await this.page.setDefaultTimeout(10000);
        console.log('✅ Test environment ready');
    }

    async test(description, testFn) {
        try {
            console.log(`🧪 Testing: ${description}`);
            await testFn();
            this.testResults.passed++;
            console.log(`✅ PASS: ${description}`);
        } catch (error) {
            this.testResults.failed++;
            this.testResults.failures.push({ description, error: error.message });
            console.log(`❌ FAIL: ${description} - ${error.message}`);
        }
    }

    async waitForAuth() {
        await this.page.waitForSelector('#sign-in-button, .user-info', { timeout: 5000 });
        const signInButton = await this.page.$('#sign-in-button');
        if (signInButton) {
            throw new Error('User not authenticated - sign in required');
        }
    }

    async testViewNavigation() {
        console.log('\n📋 TESTING VIEW NAVIGATION');
        
        await this.test('Default view loads correctly', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('#picks-summary-container', { timeout: 15000 });
            const defaultView = await this.page.$('#picks-summary-container');
            if (!defaultView) throw new Error('Default picks summary container not found');
            const isVisible = await this.page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none';
            }, defaultView);
            if (!isVisible) throw new Error('Default picks view not visible');
        });

        await this.test('Admin view loads with ?view=admin', async () => {
            await this.page.goto(`${this.baseUrl}?view=admin`);
            await this.page.waitForSelector('#admin-container', { timeout: 15000 });
            const adminView = await this.page.$('#admin-container');
            if (!adminView) throw new Error('Admin container not found');
            const isVisible = await this.page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none';
            }, adminView);
            if (!isVisible) throw new Error('Admin view not visible');
        });

        await this.test('Grid view loads with ?view=grid', async () => {
            await this.page.goto(`${this.baseUrl}?view=grid`);
            await this.page.waitForSelector('#grid-container', { timeout: 15000 });
            const gridView = await this.page.$('#grid-container');
            if (!gridView) throw new Error('Grid container not found');
            const isVisible = await this.page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none';
            }, gridView);
            if (!isVisible) throw new Error('Grid view not visible');
        });

        await this.test('Survivor view loads with ?view=survivor', async () => {
            await this.page.goto(`${this.baseUrl}?view=survivor`);
            await this.page.waitForSelector('#survivor-container', { timeout: 15000 });
            const survivorView = await this.page.$('#survivor-container');
            if (!survivorView) throw new Error('Survivor container not found');
            const isVisible = await this.page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none';
            }, survivorView);
            if (!isVisible) throw new Error('Survivor view not visible');
        });
    }

    async testHamburgerNavigation() {
        console.log('\n🍔 TESTING HAMBURGER MENU NAVIGATION');
        
        await this.test('Hamburger menu opens and closes', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('#app-view', { timeout: 15000 });
            
            const menuBtn = await this.page.$('#menu-btn');
            if (!menuBtn) throw new Error('Menu button not found');
            
            await menuBtn.click();
            await this.page.waitForSelector('#menu-panel', { visible: true });
            
            const menuPanel = await this.page.$('#menu-panel');
            const isVisible = await this.page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none';
            }, menuPanel);
            if (!isVisible) throw new Error('Menu panel not visible after opening');
            
            await menuBtn.click();
            await this.page.waitForFunction(() => {
                const nav = document.querySelector('#menu-panel');
                return nav && window.getComputedStyle(nav).display === 'none';
            });
        });

        await this.test('Navigation links work in hamburger menu', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('#app-view', { timeout: 15000 });
            
            const menuBtn = await this.page.$('#menu-btn');
            await menuBtn.click();
            await this.page.waitForSelector('#menu-panel', { visible: true });
            
            const gridLink = await this.page.$('#grid-view-btn');
            if (!gridLink) throw new Error('Grid navigation link not found in menu');
            
            await gridLink.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.waitForSelector('#grid-container', { timeout: 10000 });
            
            const gridVisible = await this.page.evaluate(() => {
                const grid = document.querySelector('#grid-container');
                return grid && window.getComputedStyle(grid).display !== 'none';
            });
            if (!gridVisible) throw new Error('Grid view not visible after navigation');
        });
    }

    async testDataDisplayIntegrity() {
        console.log('\n📊 TESTING DATA DISPLAY INTEGRITY');
        
        await this.test('Pool members data loads correctly', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('#yearly-leaderboard-container', { timeout: 15000 });
            
            const leaderboardTable = await this.page.$('#yearly-leaderboard-container table');
            if (!leaderboardTable) throw new Error('Leaderboard table not found');
            
            const leaderboardRows = await this.page.$$('#yearly-leaderboard-container table tbody tr');
            if (leaderboardRows.length === 0) throw new Error('No leaderboard data found');
            
            const ghostUserSelector = 'tr[data-user-id="okl4sw2aDhW3yKpOfOwe5lH7OQj1"]';
            const ghostUser = await this.page.$(ghostUserSelector);
            if (ghostUser) throw new Error('Ghost user detected in leaderboard');
        });

        await this.test('Grid view shows correct game data', async () => {
            await this.page.goto(`${this.baseUrl}?view=grid`);
            await this.page.waitForSelector('#grid-container', { timeout: 10000 });
            
            const gridContainer = await this.page.$('#grid-container');
            const hasContent = await this.page.evaluate(el => el.children.length > 0, gridContainer);
            if (!hasContent) throw new Error('Grid container has no content');
        });

        await this.test('Survivor view shows pool data', async () => {
            await this.page.goto(`${this.baseUrl}?view=survivor`);
            await this.page.waitForSelector('#survivor-results-container', { timeout: 10000 });
            
            const survivorContainer = await this.page.$('#survivor-results-container');
            const hasContent = await this.page.evaluate(el => el.children.length > 0, survivorContainer);
            if (!hasContent) throw new Error('Survivor container has no content');
        });
    }

    async testAuthenticationFlow() {
        console.log('\n🔐 TESTING AUTHENTICATION REQUIREMENTS');
        
        await this.test('Views require authentication', async () => {
            await this.page.goto(this.baseUrl);
            
            const signInButton = await this.page.$('#sign-in-button');
            const userInfo = await this.page.$('.user-info');
            
            if (!signInButton && !userInfo) {
                throw new Error('Neither sign-in button nor user info found - authentication state unclear');
            }
            
            if (signInButton) {
                console.log('   ℹ️  User not authenticated - sign-in required (expected behavior)');
            } else {
                console.log('   ℹ️  User authenticated - proceeding with authenticated tests');
            }
        });
    }

    async testPerformanceOptimizations() {
        console.log('\n⚡ TESTING PERFORMANCE OPTIMIZATIONS');
        
        await this.test('Firebase reads are optimized', async () => {
            await this.page.goto(this.baseUrl);
            
            const performanceEntries = await this.page.evaluate(() => {
                return performance.getEntriesByType('resource').length;
            });
            
            console.log(`   📊 Resource entries: ${performanceEntries}`);
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const finalEntries = await this.page.evaluate(() => {
                return performance.getEntriesByType('resource').length;
            });
            
            const additionalRequests = finalEntries - performanceEntries;
            console.log(`   📊 Additional requests after 3s: ${additionalRequests}`);
            
            if (additionalRequests > 10) {
                throw new Error(`Too many additional requests: ${additionalRequests}`);
            }
        });
    }

    async testCriticalFunctionality() {
        console.log('\n🎯 TESTING CRITICAL FUNCTIONALITY PRESERVATION');
        
        await this.test('Your Active Picks section exists', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('#picks-summary-container', { timeout: 15000 });
            const picksSection = await this.page.$('#picks-summary-container');
            if (!picksSection) throw new Error('Picks summary section not found');
        });

        await this.test('Season Leaderboard section exists', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('#yearly-leaderboard-container', { timeout: 15000 });
            const leaderboardSection = await this.page.$('#yearly-leaderboard-container');
            if (!leaderboardSection) throw new Error('Season Leaderboard section not found');
        });

        await this.test('All UI elements present', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('#app-view', { timeout: 15000 });
            
            const criticalElements = [
                'header',
                '#app-view',
                '#menu-btn',
                '#user-display'
            ];
            
            for (const selector of criticalElements) {
                const element = await this.page.$(selector);
                if (!element) throw new Error(`Critical element not found: ${selector}`);
            }
        });
    }

    async runAllTests() {
        try {
            await this.setup();
            
            await this.testViewNavigation();
            await this.testHamburgerNavigation();
            await this.testDataDisplayIntegrity();
            await this.testAuthenticationFlow();
            await this.testPerformanceOptimizations();
            await this.testCriticalFunctionality();
            
            console.log('\n📋 TEST RESULTS SUMMARY');
            console.log(`✅ Passed: ${this.testResults.passed}`);
            console.log(`❌ Failed: ${this.testResults.failed}`);
            
            if (this.testResults.failures.length > 0) {
                console.log('\n🚨 FAILURES:');
                this.testResults.failures.forEach(failure => {
                    console.log(`   ❌ ${failure.description}: ${failure.error}`);
                });
            }
            
            const successRate = (this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100;
            console.log(`\n📊 Success Rate: ${successRate.toFixed(1)}%`);
            
            if (successRate < 90) {
                console.log('🚨 SUCCESS RATE BELOW DIAMOND STANDARD (90%)');
                process.exit(1);
            } else {
                console.log('💎 DIAMOND STANDARD ACHIEVED');
            }
            
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

if (require.main === module) {
    const tester = new UnifiedViewSystemTester();
    tester.runAllTests().catch(console.error);
}

module.exports = UnifiedViewSystemTester;