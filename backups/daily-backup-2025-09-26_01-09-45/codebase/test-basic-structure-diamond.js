#!/usr/bin/env node

const puppeteer = require('puppeteer');

class BasicStructureTester {
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
        console.log('🚀 Setting up basic structure testing...');
        this.browser = await puppeteer.launch({ 
            headless: true,
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

    async testBasicPageStructure() {
        console.log('\n📋 TESTING BASIC PAGE STRUCTURE');
        
        await this.test('Default page loads without errors', async () => {
            const response = await this.page.goto(this.baseUrl);
            if (response.status() !== 200) {
                throw new Error(`HTTP ${response.status()} error`);
            }
            
            await this.page.waitForSelector('html', { timeout: 5000 });
            const title = await this.page.title();
            if (!title.includes('NerdfootballAI')) {
                throw new Error('Page title incorrect');
            }
        });

        await this.test('Essential HTML structure present', async () => {
            await this.page.goto(this.baseUrl);
            
            const essentialElements = [
                'head',
                'body', 
                'html',
                '#loading-view',
                '#login-view',
                '#app-view'
            ];
            
            for (const selector of essentialElements) {
                const element = await this.page.$(selector);
                if (!element) throw new Error(`Essential element not found: ${selector}`);
            }
        });

        await this.test('Required CSS and JS resources load', async () => {
            await this.page.goto(this.baseUrl);
            
            const resources = await this.page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
                const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[href*="css"]')).map(l => l.href);
                return { scripts, styles };
            });
            
            console.log(`   📊 Scripts loaded: ${resources.scripts.length}`);
            console.log(`   📊 Styles loaded: ${resources.styles.length}`);
            
            if (resources.scripts.length < 2) {
                throw new Error('Insufficient script resources loaded');
            }
        });
    }

    async testViewContainersExist() {
        console.log('\n📦 TESTING VIEW CONTAINERS');
        
        await this.test('All view containers present in DOM', async () => {
            await this.page.goto(this.baseUrl);
            
            const viewContainers = [
                '#picks-summary-container',
                '#admin-container', 
                '#grid-container',
                '#survivor-container',
                '#leaderboard-container'
            ];
            
            for (const selector of viewContainers) {
                const element = await this.page.$(selector);
                if (!element) throw new Error(`View container not found: ${selector}`);
            }
        });

        await this.test('Navigation menu structure exists', async () => {
            await this.page.goto(this.baseUrl);
            
            const navElements = [
                '#menu-btn',
                '#menu-panel',
                '#menu-picks-view-btn',
                '#grid-view-btn'
            ];
            
            for (const selector of navElements) {
                const element = await this.page.$(selector);
                if (!element) throw new Error(`Navigation element not found: ${selector}`);
            }
        });
    }

    async testURLRouting() {
        console.log('\n🔗 TESTING URL ROUTING STRUCTURE');
        
        const routes = [
            { url: '/', name: 'Default route' },
            { url: '/?view=admin', name: 'Admin route' },
            { url: '/?view=grid', name: 'Grid route' },
            { url: '/?view=survivor', name: 'Survivor route' },
            { url: '/?view=rules', name: 'Rules route' }
        ];

        for (const route of routes) {
            await this.test(`${route.name} loads without errors`, async () => {
                const response = await this.page.goto(`${this.baseUrl}${route.url}`);
                if (response.status() !== 200) {
                    throw new Error(`HTTP ${response.status()} error`);
                }
                
                await this.page.waitForSelector('#app-view', { timeout: 5000 });
                
                const jsErrors = await this.page.evaluate(() => {
                    return window.jsErrors || [];
                });
                
                if (jsErrors.length > 0) {
                    throw new Error(`JavaScript errors: ${jsErrors.join(', ')}`);
                }
            });
        }
    }

    async testConsoleErrors() {
        console.log('\n⚠️ TESTING FOR CONSOLE ERRORS');
        
        await this.test('No critical JavaScript errors', async () => {
            const errors = [];
            
            this.page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });
            
            this.page.on('pageerror', error => {
                errors.push(error.message);
            });
            
            await this.page.goto(this.baseUrl);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const criticalErrors = errors.filter(error => 
                !error.includes('Firebase') && 
                !error.includes('auth') &&
                !error.includes('network')
            );
            
            if (criticalErrors.length > 0) {
                throw new Error(`Critical JS errors found: ${criticalErrors.join(', ')}`);
            }
            
            console.log(`   ℹ️  Total console messages: ${errors.length}`);
        });
    }

    async runAllTests() {
        try {
            await this.setup();
            
            await this.testBasicPageStructure();
            await this.testViewContainersExist();  
            await this.testURLRouting();
            await this.testConsoleErrors();
            
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
            
            if (successRate >= 85) {
                console.log('💎 BASIC STRUCTURE VALIDATION PASSED');
                return true;
            } else {
                console.log('🚨 BASIC STRUCTURE VALIDATION FAILED');
                return false;
            }
            
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

if (require.main === module) {
    const tester = new BasicStructureTester();
    tester.runAllTests()
        .then(passed => process.exit(passed ? 0 : 1))
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = BasicStructureTester;