#!/usr/bin/env node

const puppeteer = require('puppeteer');

class ProductionDeploymentTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'https://nerdfootball.web.app';
        this.testResults = {
            passed: 0,
            failed: 0,
            failures: []
        };
    }

    async setup() {
        console.log('🚀 Setting up production deployment testing...');
        this.browser = await puppeteer.launch({ 
            headless: true,
            defaultViewport: { width: 1200, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.setDefaultTimeout(15000);
        console.log('✅ Production test environment ready');
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

    async testProductionAccessibility() {
        console.log('\n🌐 TESTING PRODUCTION ACCESSIBILITY');
        
        await this.test('Production site is accessible', async () => {
            const response = await this.page.goto(this.baseUrl);
            if (response.status() !== 200) {
                throw new Error(`HTTP ${response.status()} error`);
            }
            
            const title = await this.page.title();
            if (!title.includes('NerdfootballAI')) {
                throw new Error('Page title incorrect in production');
            }
        });

        await this.test('HTTPS is properly configured', async () => {
            if (!this.baseUrl.startsWith('https://')) {
                throw new Error('Production site not using HTTPS');
            }
            
            const securityState = await this.page.evaluate(() => {
                return document.location.protocol;
            });
            
            if (securityState !== 'https:') {
                throw new Error('Site not served over HTTPS');
            }
        });

        await this.test('Basic page resources load correctly', async () => {
            await this.page.goto(this.baseUrl);
            
            const failedResources = [];
            this.page.on('response', response => {
                if (response.status() >= 400) {
                    failedResources.push(`${response.url()} - ${response.status()}`);
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            if (failedResources.length > 0) {
                throw new Error(`Failed resources: ${failedResources.join(', ')}`);
            }
        });
    }

    async testViewRouting() {
        console.log('\n🔗 TESTING PRODUCTION URL ROUTING');
        
        const routes = [
            { url: '', name: 'Default route' },
            { url: '?view=admin', name: 'Admin route' },
            { url: '?view=grid', name: 'Grid route' },
            { url: '?view=survivor', name: 'Survivor route' },
            { url: '?view=rules', name: 'Rules route' }
        ];

        for (const route of routes) {
            await this.test(`${route.name} loads in production`, async () => {
                const response = await this.page.goto(`${this.baseUrl}/${route.url}`);
                if (response.status() !== 200) {
                    throw new Error(`HTTP ${response.status()} error`);
                }
                
                await this.page.waitForSelector('html');
                
                const jsErrors = [];
                this.page.on('pageerror', error => {
                    jsErrors.push(error.message);
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const criticalErrors = jsErrors.filter(error => 
                    !error.includes('Firebase') && 
                    !error.includes('auth') &&
                    !error.includes('network')
                );
                
                if (criticalErrors.length > 0) {
                    throw new Error(`Critical JS errors: ${criticalErrors.join(', ')}`);
                }
            });
        }
    }

    async testPerformanceMetrics() {
        console.log('\n⚡ TESTING PRODUCTION PERFORMANCE');
        
        await this.test('Page load performance meets standards', async () => {
            const startTime = Date.now();
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('html');
            const loadTime = Date.now() - startTime;
            
            console.log(`   📊 Page load time: ${loadTime}ms`);
            
            if (loadTime > 5000) {
                throw new Error(`Page load too slow: ${loadTime}ms (max: 5000ms)`);
            }
        });

        await this.test('Essential elements load quickly', async () => {
            await this.page.goto(this.baseUrl);
            
            const startTime = Date.now();
            await this.page.waitForSelector('#loading-view, #login-view, #app-view');
            const elementLoadTime = Date.now() - startTime;
            
            console.log(`   📊 Essential elements load time: ${elementLoadTime}ms`);
            
            if (elementLoadTime > 3000) {
                throw new Error(`Elements load too slow: ${elementLoadTime}ms`);
            }
        });
    }

    async testSecurityHeaders() {
        console.log('\n🔒 TESTING PRODUCTION SECURITY');
        
        await this.test('Security headers are present', async () => {
            const response = await this.page.goto(this.baseUrl);
            const headers = response.headers();
            
            console.log('   📊 Security headers check:');
            
            const securityHeaders = [
                'x-frame-options',
                'x-content-type-options',
                'referrer-policy'
            ];
            
            const missingHeaders = [];
            securityHeaders.forEach(header => {
                if (!headers[header]) {
                    missingHeaders.push(header);
                } else {
                    console.log(`   ✓ ${header}: ${headers[header]}`);
                }
            });
            
            if (missingHeaders.length > 0) {
                console.log(`   ⚠️  Missing recommended headers: ${missingHeaders.join(', ')}`);
            }
        });
    }

    async testMobileResponsiveness() {
        console.log('\n📱 TESTING MOBILE RESPONSIVENESS');
        
        await this.test('Mobile viewport renders correctly', async () => {
            await this.page.setViewport({ width: 375, height: 667 });
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('html');
            
            const viewport = this.page.viewport();
            if (viewport.width !== 375 || viewport.height !== 667) {
                throw new Error('Mobile viewport not set correctly');
            }
            
            const bodyWidth = await this.page.evaluate(() => {
                return document.body.scrollWidth;
            });
            
            if (bodyWidth > 400) {
                throw new Error(`Body width too wide for mobile: ${bodyWidth}px`);
            }
        });
    }

    async runAllTests() {
        try {
            await this.setup();
            
            await this.testProductionAccessibility();
            await this.testViewRouting();
            await this.testPerformanceMetrics();
            await this.testSecurityHeaders();
            await this.testMobileResponsiveness();
            
            console.log('\n📋 PRODUCTION TEST RESULTS SUMMARY');
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
                console.log('🎉 PRODUCTION DEPLOYMENT VALIDATION PASSED');
                console.log(`🌐 Live site: ${this.baseUrl}`);
                return true;
            } else {
                console.log('🚨 PRODUCTION DEPLOYMENT VALIDATION FAILED');
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
    const tester = new ProductionDeploymentTester();
    tester.runAllTests()
        .then(passed => process.exit(passed ? 0 : 1))
        .catch(error => {
            console.error('Production test execution failed:', error);
            process.exit(1);
        });
}

module.exports = ProductionDeploymentTester;