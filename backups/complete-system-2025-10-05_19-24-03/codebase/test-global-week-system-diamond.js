#!/usr/bin/env node

/**
 * DIAMOND LEVEL QA TEST SUITE
 * Global Week Management System Validation
 * 
 * Critical architecture change testing for production deployment
 * Tests: Week detection, survivor functionality, cross-page consistency
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class GlobalWeekSystemTester {
    constructor() {
        this.browser = null;
        this.results = {
            totalTests: 0,
            passed: 0,
            failed: 0,
            critical: [],
            warnings: [],
            details: []
        };
        this.baseUrl = 'https://nerdfootball.web.app';
    }

    async initialize() {
        console.log('🔬 DIAMOND QA: Initializing Global Week System Test Suite');
        this.browser = await puppeteer.launch({
            headless: false,
            devtools: true,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async runTest(testName, testFunction) {
        this.results.totalTests++;
        console.log(`\n🧪 Testing: ${testName}`);
        
        try {
            const result = await testFunction();
            if (result.passed) {
                this.results.passed++;
                console.log(`✅ PASSED: ${testName}`);
            } else {
                this.results.failed++;
                console.log(`❌ FAILED: ${testName} - ${result.error}`);
                this.results.critical.push(`${testName}: ${result.error}`);
            }
            this.results.details.push({
                test: testName,
                status: result.passed ? 'PASSED' : 'FAILED',
                details: result.details || {},
                error: result.error || null
            });
            return result;
        } catch (error) {
            this.results.failed++;
            console.error(`💥 ERROR in ${testName}:`, error.message);
            this.results.critical.push(`${testName}: ${error.message}`);
            this.results.details.push({
                test: testName,
                status: 'ERROR',
                error: error.message
            });
            return { passed: false, error: error.message };
        }
    }

    async testGlobalWeekVariables() {
        const page = await this.browser.newPage();
        await page.goto(`${this.baseUrl}`, { waitUntil: 'networkidle0' });
        
        // Wait for week manager initialization
        await page.waitForTimeout(3000);
        
        const weekData = await page.evaluate(() => {
            return {
                currentWeek: window.currentWeek,
                nextWeek: window.nextWeek,
                previousWeek: window.previousWeek,
                getCurrentWeek: typeof window.getCurrentWeek === 'function' ? window.getCurrentWeek() : null,
                weekManager: !!window.weekManager,
                weekManagerInitialized: window.weekManager?.initialized || false,
                weekManagerStatus: window.weekManager?.getStatus() || null
            };
        });

        await page.close();

        const issues = [];
        if (!weekData.currentWeek) issues.push('window.currentWeek is undefined');
        if (!weekData.nextWeek) issues.push('window.nextWeek is undefined');
        if (!weekData.previousWeek) issues.push('window.previousWeek is undefined');
        if (!weekData.weekManager) issues.push('window.weekManager is not available');
        if (!weekData.weekManagerInitialized) issues.push('WeekManager not initialized');
        if (weekData.currentWeek && (weekData.currentWeek < 1 || weekData.currentWeek > 18)) {
            issues.push(`currentWeek ${weekData.currentWeek} is out of valid range (1-18)`);
        }

        return {
            passed: issues.length === 0,
            error: issues.length > 0 ? issues.join('; ') : null,
            details: weekData
        };
    }

    async testSurvivorResultsPage() {
        const page = await this.browser.newPage();
        
        // Enable console monitoring
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await page.goto(`${this.baseUrl}/?view=survivor`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(5000);

        const survivorData = await page.evaluate(() => {
            const poolSummary = document.querySelector('.pool-summary');
            const currentWeekElement = document.querySelector('[data-week], .week-display, .current-week');
            
            return {
                poolSummaryExists: !!poolSummary,
                poolSummaryText: poolSummary?.textContent || '',
                currentWeekDisplay: currentWeekElement?.textContent || '',
                weekManagerStatus: window.weekManager?.getStatus() || null,
                currentWeek: window.currentWeek,
                gameNotFoundErrors: document.querySelectorAll('[data-error*="game not found"]').length
            };
        });

        await page.close();

        const issues = [];
        if (consoleErrors.some(error => error.includes('game not found'))) {
            issues.push('Console contains "game not found" errors');
        }
        if (!survivorData.poolSummaryExists) {
            issues.push('Pool Summary section not found');
        }
        if (survivorData.currentWeekDisplay.includes('18') && survivorData.currentWeek !== 18) {
            issues.push(`Week display shows 18 but current week is ${survivorData.currentWeek}`);
        }

        return {
            passed: issues.length === 0,
            error: issues.length > 0 ? issues.join('; ') : null,
            details: { survivorData, consoleErrors }
        };
    }

    async testGameMatchingLogic() {
        const page = await this.browser.newPage();
        
        // Monitor network requests for game data
        const gameRequests = [];
        page.on('response', response => {
            if (response.url().includes('games') || response.url().includes('scores')) {
                gameRequests.push({
                    url: response.url(),
                    status: response.status()
                });
            }
        });

        await page.goto(`${this.baseUrl}/?view=survivor`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(3000);

        const gameData = await page.evaluate(() => {
            // Check for specific game IDs mentioned in requirements
            const testGameIds = [101, 103, 111];
            const gameElements = document.querySelectorAll('[data-game-id]');
            const foundGames = {};
            
            gameElements.forEach(el => {
                const gameId = parseInt(el.getAttribute('data-game-id'));
                if (testGameIds.includes(gameId)) {
                    foundGames[gameId] = {
                        found: true,
                        element: el.tagName,
                        content: el.textContent.slice(0, 100)
                    };
                }
            });

            return {
                testGameIds: testGameIds,
                foundGames: foundGames,
                totalGameElements: gameElements.length,
                currentWeek: window.currentWeek,
                weekManagerStatus: window.weekManager?.getStatus()
            };
        });

        await page.close();

        const issues = [];
        const testGameIds = [101, 103, 111];
        testGameIds.forEach(gameId => {
            if (!gameData.foundGames[gameId]) {
                issues.push(`Game ID ${gameId} not found in Week 1 results`);
            }
        });

        if (gameRequests.filter(req => req.status >= 400).length > 0) {
            issues.push('Failed game data requests detected');
        }

        return {
            passed: issues.length === 0,
            error: issues.length > 0 ? issues.join('; ') : null,
            details: { gameData, gameRequests }
        };
    }

    async testCrossPageConsistency() {
        const pages = [
            { url: `${this.baseUrl}/`, name: 'Main Page' },
            { url: `${this.baseUrl}/?view=survivor`, name: 'Survivor Results' },
            { url: `${this.baseUrl}/?view=confidence`, name: 'Confidence Pool' },
            { url: `${this.baseUrl}/nerdfootballTheGrid.html`, name: 'The Grid' }
        ];

        const pageResults = [];
        
        for (const pageConfig of pages) {
            const page = await this.browser.newPage();
            
            try {
                await page.goto(pageConfig.url, { waitUntil: 'networkidle0' });
                await page.waitForTimeout(2000);

                const weekData = await page.evaluate(() => {
                    return {
                        currentWeek: window.currentWeek,
                        nextWeek: window.nextWeek,
                        previousWeek: window.previousWeek,
                        weekManager: !!window.weekManager,
                        initialized: window.weekManager?.initialized
                    };
                });

                pageResults.push({
                    page: pageConfig.name,
                    url: pageConfig.url,
                    ...weekData
                });
            } catch (error) {
                pageResults.push({
                    page: pageConfig.name,
                    url: pageConfig.url,
                    error: error.message
                });
            }
            
            await page.close();
        }

        // Check consistency
        const currentWeeks = pageResults.map(r => r.currentWeek).filter(w => w !== undefined);
        const isConsistent = currentWeeks.length > 0 && currentWeeks.every(week => week === currentWeeks[0]);
        
        const issues = [];
        if (!isConsistent) {
            issues.push(`Inconsistent week values across pages: ${currentWeeks.join(', ')}`);
        }
        
        pageResults.forEach(result => {
            if (result.error) {
                issues.push(`${result.page} failed to load: ${result.error}`);
            }
            if (!result.weekManager) {
                issues.push(`${result.page} missing weekManager`);
            }
        });

        return {
            passed: issues.length === 0,
            error: issues.length > 0 ? issues.join('; ') : null,
            details: { pageResults, isConsistent }
        };
    }

    async testPerformanceMetrics() {
        const page = await this.browser.newPage();
        
        const startTime = Date.now();
        await page.goto(`${this.baseUrl}/?view=survivor`, { waitUntil: 'networkidle0' });
        const loadTime = Date.now() - startTime;

        const performanceData = await page.evaluate(() => {
            const timing = performance.getEntriesByType('navigation')[0];
            return {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
                loadComplete: timing.loadEventEnd - timing.loadEventStart,
                totalLoadTime: timing.loadEventEnd - timing.navigationStart
            };
        });

        await page.close();

        const issues = [];
        if (loadTime > 10000) { // 10 seconds
            issues.push(`Page load time ${loadTime}ms exceeds 10 second threshold`);
        }
        if (performanceData.totalLoadTime > 15000) {
            issues.push(`Total load time ${performanceData.totalLoadTime}ms exceeds 15 second threshold`);
        }

        return {
            passed: issues.length === 0,
            error: issues.length > 0 ? issues.join('; ') : null,
            details: { loadTime, performanceData }
        };
    }

    async runAllTests() {
        console.log('🏈 DIAMOND QA: Starting Global Week Management System Test Suite\n');
        
        await this.testGlobalWeekVariables();
        await this.runTest('Global Week Variables', () => this.testGlobalWeekVariables());
        await this.runTest('Survivor Results Page', () => this.testSurvivorResultsPage());
        await this.runTest('Game Matching Logic', () => this.testGameMatchingLogic());
        await this.runTest('Cross-Page Consistency', () => this.testCrossPageConsistency());
        await this.runTest('Performance Metrics', () => this.testPerformanceMetrics());
    }

    generateReport() {
        const timestamp = new Date().toISOString();
        const passRate = ((this.results.passed / this.results.totalTests) * 100).toFixed(1);
        
        const report = {
            timestamp,
            testSuite: 'Global Week Management System',
            environment: this.baseUrl,
            summary: {
                totalTests: this.results.totalTests,
                passed: this.results.passed,
                failed: this.results.failed,
                passRate: `${passRate}%`,
                status: this.results.failed === 0 ? 'PASSED' : 'FAILED'
            },
            criticalIssues: this.results.critical,
            warnings: this.results.warnings,
            details: this.results.details,
            diamondStandards: {
                weekDetectionAccuracy: this.results.failed === 0 ? 'PASSED' : 'FAILED',
                survivorFunctionality: this.results.critical.some(c => c.includes('Survivor')) ? 'FAILED' : 'PASSED',
                crossPageConsistency: this.results.critical.some(c => c.includes('Consistency')) ? 'FAILED' : 'PASSED',
                performanceStandards: this.results.critical.some(c => c.includes('Performance')) ? 'FAILED' : 'PASSED'
            }
        };

        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Main execution
async function runGlobalWeekSystemTests() {
    const tester = new GlobalWeekSystemTester();
    
    try {
        await tester.initialize();
        await tester.runAllTests();
        
        const report = tester.generateReport();
        
        console.log('\n' + '='.repeat(80));
        console.log('🏆 DIAMOND QA TEST RESULTS - Global Week Management System');
        console.log('='.repeat(80));
        console.log(`Status: ${report.summary.status}`);
        console.log(`Pass Rate: ${report.summary.passRate}`);
        console.log(`Tests: ${report.summary.passed}/${report.summary.totalTests} passed`);
        
        if (report.criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES:');
            report.criticalIssues.forEach(issue => console.log(`  ❌ ${issue}`));
        }
        
        if (report.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            report.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
        }
        
        console.log('\n📊 DIAMOND STANDARDS COMPLIANCE:');
        Object.entries(report.diamondStandards).forEach(([standard, status]) => {
            const icon = status === 'PASSED' ? '✅' : '❌';
            console.log(`  ${icon} ${standard}: ${status}`);
        });
        
        // Save detailed report
        const reportPath = `/Users/tonyweeg/nerdfootball-project/test-reports/global-week-system-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📋 Detailed report saved: ${reportPath}`);
        
        return report.summary.status === 'PASSED';
        
    } catch (error) {
        console.error('💥 Test suite failed:', error);
        return false;
    } finally {
        await tester.cleanup();
    }
}

// Export for module usage
if (require.main === module) {
    runGlobalWeekSystemTests()
        .then(success => {
            console.log(`\n🏁 Global Week System Tests: ${success ? 'PASSED' : 'FAILED'}`);
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { GlobalWeekSystemTester, runGlobalWeekSystemTests };