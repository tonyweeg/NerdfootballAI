/**
 * DIAMOND QA: Manual Global Week System Validation
 * 
 * Copy and paste these functions into browser console at:
 * https://nerdfootball.web.app
 * 
 * Execute each validation function and record results
 */

// Core validation functions for browser console execution
window.diamondQA = {
    
    // Test 1: Validate Global Week Variables
    validateGlobalWeekVariables: function() {
        console.log('🔬 DIAMOND QA: Testing Global Week Variables');
        
        const results = {
            currentWeek: window.currentWeek,
            nextWeek: window.nextWeek,
            previousWeek: window.previousWeek,
            getCurrentWeekFunction: typeof window.getCurrentWeek === 'function',
            getNFLCurrentWeekFunction: typeof window.getNFLCurrentWeek === 'function',
            weekManager: !!window.weekManager,
            weekManagerInitialized: window.weekManager?.initialized || false,
            weekManagerStatus: window.weekManager?.getStatus()
        };
        
        console.table(results);
        
        // Validation checks
        const issues = [];
        if (!results.currentWeek) issues.push('❌ window.currentWeek is undefined');
        if (!results.nextWeek) issues.push('❌ window.nextWeek is undefined');
        if (!results.previousWeek) issues.push('❌ window.previousWeek is undefined');
        if (!results.getCurrentWeekFunction) issues.push('❌ window.getCurrentWeek function missing');
        if (!results.weekManager) issues.push('❌ window.weekManager not available');
        if (!results.weekManagerInitialized) issues.push('❌ WeekManager not initialized');
        
        // Range validation
        if (results.currentWeek && (results.currentWeek < 1 || results.currentWeek > 18)) {
            issues.push(`❌ currentWeek ${results.currentWeek} out of range (1-18)`);
        }
        if (results.nextWeek && (results.nextWeek < 1 || results.nextWeek > 18)) {
            issues.push(`❌ nextWeek ${results.nextWeek} out of range (1-18)`);
        }
        if (results.previousWeek && (results.previousWeek < 1 || results.previousWeek > 18)) {
            issues.push(`❌ previousWeek ${results.previousWeek} out of range (1-18)`);
        }
        
        console.log('\n📊 Validation Results:');
        if (issues.length === 0) {
            console.log('✅ ALL GLOBAL WEEK VARIABLES PASSED');
            return true;
        } else {
            console.log('❌ ISSUES FOUND:');
            issues.forEach(issue => console.log(issue));
            return false;
        }
    },
    
    // Test 2: Check Survivor Results Page Specific Elements
    validateSurvivorPage: function() {
        console.log('🔬 DIAMOND QA: Testing Survivor Results Page');
        
        const poolSummary = document.querySelector('.pool-summary, [class*="pool"], [class*="summary"]');
        const weekDisplayElements = document.querySelectorAll('[data-week], .week-display, .current-week, [class*="week"]');
        const gameElements = document.querySelectorAll('[data-game-id], [class*="game"]');
        
        const results = {
            currentURL: window.location.href,
            poolSummaryExists: !!poolSummary,
            poolSummaryText: poolSummary?.textContent?.slice(0, 200) || 'Not found',
            weekDisplayElementsCount: weekDisplayElements.length,
            weekDisplayTexts: Array.from(weekDisplayElements).map(el => el.textContent?.slice(0, 50)).slice(0, 5),
            gameElementsCount: gameElements.length,
            currentWeekFromGlobal: window.currentWeek,
            weekManagerStatus: window.weekManager?.getStatus()
        };
        
        console.table(results);
        
        // Check for specific game IDs mentioned in requirements
        const targetGameIds = [101, 103, 111];
        const foundGames = {};
        
        document.querySelectorAll('[data-game-id]').forEach(el => {
            const gameId = parseInt(el.getAttribute('data-game-id'));
            if (targetGameIds.includes(gameId)) {
                foundGames[gameId] = {
                    element: el.tagName,
                    content: el.textContent?.slice(0, 100)
                };
            }
        });
        
        console.log('🎯 Target Game IDs Search:', foundGames);
        
        const issues = [];
        if (!poolSummary) issues.push('❌ Pool Summary section not found');
        if (weekDisplayElements.length === 0) issues.push('❌ No week display elements found');
        if (results.currentWeekFromGlobal === 18 && !window.location.href.includes('week=18')) {
            issues.push(`⚠️  Showing week 18 but may not be correct current week`);
        }
        
        targetGameIds.forEach(gameId => {
            if (!foundGames[gameId]) {
                issues.push(`⚠️  Game ID ${gameId} not found (may be in different week)`);
            }
        });
        
        console.log('\n📊 Survivor Page Validation:');
        if (issues.length === 0) {
            console.log('✅ SURVIVOR PAGE VALIDATION PASSED');
            return true;
        } else {
            console.log('❌ ISSUES/WARNINGS:');
            issues.forEach(issue => console.log(issue));
            return false;
        }
    },
    
    // Test 3: Console Error Monitoring
    monitorConsoleErrors: function() {
        console.log('🔬 DIAMOND QA: Monitoring Console Errors');
        
        // Store original console methods
        const originalError = console.error;
        const originalWarn = console.warn;
        
        const errorLog = [];
        const warnLog = [];
        
        // Override console methods to capture errors
        console.error = function(...args) {
            errorLog.push(args.join(' '));
            originalError.apply(console, args);
        };
        
        console.warn = function(...args) {
            warnLog.push(args.join(' '));
            originalWarn.apply(console, args);
        };
        
        console.log('📡 Console monitoring active for 10 seconds...');
        
        setTimeout(() => {
            // Restore original console methods
            console.error = originalError;
            console.warn = originalWarn;
            
            console.log('\n📊 Console Error Report:');
            console.log(`Errors captured: ${errorLog.length}`);
            console.log(`Warnings captured: ${warnLog.length}`);
            
            if (errorLog.length > 0) {
                console.log('\n❌ ERRORS:');
                errorLog.forEach((error, index) => {
                    console.log(`${index + 1}. ${error}`);
                });
            }
            
            if (warnLog.length > 0) {
                console.log('\n⚠️  WARNINGS:');
                warnLog.forEach((warn, index) => {
                    console.log(`${index + 1}. ${warn}`);
                });
            }
            
            // Check for specific error patterns
            const gameNotFoundErrors = errorLog.filter(error => 
                error.toLowerCase().includes('game not found') ||
                error.toLowerCase().includes('game id') ||
                error.toLowerCase().includes('gameId')
            );
            
            const weekRelatedErrors = errorLog.filter(error => 
                error.toLowerCase().includes('week') ||
                error.toLowerCase().includes('currentweek')
            );
            
            if (gameNotFoundErrors.length > 0) {
                console.log(`\n🚨 CRITICAL: ${gameNotFoundErrors.length} game-related errors found`);
                gameNotFoundErrors.forEach(error => console.log(`   ${error}`));
            }
            
            if (weekRelatedErrors.length > 0) {
                console.log(`\n🚨 CRITICAL: ${weekRelatedErrors.length} week-related errors found`);
                weekRelatedErrors.forEach(error => console.log(`   ${error}`));
            }
            
            const overallStatus = (gameNotFoundErrors.length === 0 && weekRelatedErrors.length === 0) ? 'PASSED' : 'FAILED';
            console.log(`\n🏆 Console Error Monitoring: ${overallStatus}`);
            
        }, 10000);
        
        return 'Monitoring started... results in 10 seconds';
    },
    
    // Test 4: Cross-Page Week Consistency Test
    testCrossPageConsistency: function() {
        console.log('🔬 DIAMOND QA: Cross-Page Consistency Check');
        
        const currentPageWeek = {
            url: window.location.href,
            currentWeek: window.currentWeek,
            nextWeek: window.nextWeek,
            previousWeek: window.previousWeek,
            weekManager: !!window.weekManager,
            initialized: window.weekManager?.initialized
        };
        
        console.log('Current Page Week Data:');
        console.table(currentPageWeek);
        
        console.log('\n📝 TO TEST OTHER PAGES:');
        console.log('1. Navigate to: https://nerdfootball.web.app/?view=survivor');
        console.log('2. Run: diamondQA.validateGlobalWeekVariables()');
        console.log('3. Navigate to: https://nerdfootball.web.app/?view=confidence');
        console.log('4. Run: diamondQA.validateGlobalWeekVariables()');
        console.log('5. Navigate to: https://nerdfootball.web.app/nerdfootballTheGrid.html');
        console.log('6. Run: diamondQA.validateGlobalWeekVariables()');
        console.log('7. Compare all currentWeek values - they should be identical');
        
        return currentPageWeek;
    },
    
    // Test 5: Force Week Refresh Test
    testWeekRefresh: function() {
        console.log('🔬 DIAMOND QA: Testing Week Refresh Functionality');
        
        if (!window.weekManager) {
            console.error('❌ WeekManager not available');
            return false;
        }
        
        const beforeRefresh = {
            currentWeek: window.currentWeek,
            cached: window.weekManager.isCacheValid(),
            status: window.weekManager.getStatus()
        };
        
        console.log('Before Refresh:');
        console.table(beforeRefresh);
        
        // Force refresh
        window.weekManager.refreshWeek().then(newWeek => {
            const afterRefresh = {
                currentWeek: window.currentWeek,
                refreshedWeek: newWeek,
                cached: window.weekManager.isCacheValid(),
                status: window.weekManager.getStatus()
            };
            
            console.log('\nAfter Refresh:');
            console.table(afterRefresh);
            
            const success = (afterRefresh.currentWeek === newWeek && afterRefresh.currentWeek >= 1 && afterRefresh.currentWeek <= 18);
            console.log(`\n🏆 Week Refresh Test: ${success ? 'PASSED' : 'FAILED'}`);
        }).catch(error => {
            console.error('❌ Week refresh failed:', error);
        });
        
        return 'Week refresh initiated...';
    },
    
    // Test 6: Performance and Load Time Analysis
    analyzePerformance: function() {
        console.log('🔬 DIAMOND QA: Performance Analysis');
        
        const timing = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        
        const performanceData = {
            pageLoadTime: Math.round(timing.loadEventEnd - timing.navigationStart),
            domContentLoaded: Math.round(timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart),
            firstPaint: Math.round(timing.responseEnd - timing.navigationStart),
            resourceCount: resources.length,
            slowResources: resources.filter(r => r.duration > 1000).length,
            weekManagerInitTime: window.weekManager?.getStatus()?.cacheTimestamp || 'Not available'
        };
        
        console.table(performanceData);
        
        const issues = [];
        if (performanceData.pageLoadTime > 10000) {
            issues.push(`❌ Page load time ${performanceData.pageLoadTime}ms exceeds 10s threshold`);
        }
        if (performanceData.slowResources > 5) {
            issues.push(`⚠️  ${performanceData.slowResources} slow resources (>1s) detected`);
        }
        
        console.log('\n📊 Performance Analysis:');
        if (issues.length === 0) {
            console.log('✅ PERFORMANCE ANALYSIS PASSED');
            return true;
        } else {
            console.log('❌ PERFORMANCE ISSUES:');
            issues.forEach(issue => console.log(issue));
            return false;
        }
    },
    
    // Master test runner
    runAllManualTests: function() {
        console.log('🏆 DIAMOND QA: Running All Manual Tests');
        console.log('=' .repeat(60));
        
        const results = {
            globalWeekVariables: this.validateGlobalWeekVariables(),
            survivorPage: this.validateSurvivorPage(),
            performance: this.analyzePerformance()
        };
        
        console.log('\n📊 OVERALL RESULTS:');
        console.table(results);
        
        const passedTests = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        const passRate = ((passedTests / totalTests) * 100).toFixed(1);
        
        console.log(`\n🏆 DIAMOND QA SUMMARY:`);
        console.log(`Tests Passed: ${passedTests}/${totalTests} (${passRate}%)`);
        console.log(`Overall Status: ${passedTests === totalTests ? '✅ PASSED' : '❌ FAILED'}`);
        
        // Additional manual tests to run
        console.log('\n📝 ADDITIONAL MANUAL TESTS TO COMPLETE:');
        console.log('1. Run: diamondQA.monitorConsoleErrors() - Wait for results');
        console.log('2. Run: diamondQA.testCrossPageConsistency() - Follow instructions');
        console.log('3. Run: diamondQA.testWeekRefresh() - Verify refresh functionality');
        
        return {
            passRate,
            overallStatus: passedTests === totalTests ? 'PASSED' : 'FAILED',
            results
        };
    }
};

// Auto-initialize when script loads
console.log('🏆 DIAMOND QA: Global Week System Manual Validation Loaded');
console.log('📋 Available Commands:');
console.log('  diamondQA.runAllManualTests() - Run all automated tests');
console.log('  diamondQA.validateGlobalWeekVariables() - Test week variables');
console.log('  diamondQA.validateSurvivorPage() - Test survivor functionality');
console.log('  diamondQA.monitorConsoleErrors() - Monitor for errors');
console.log('  diamondQA.testCrossPageConsistency() - Test cross-page consistency');
console.log('  diamondQA.testWeekRefresh() - Test week refresh');
console.log('  diamondQA.analyzePerformance() - Performance analysis');
console.log('\n🚀 Start with: diamondQA.runAllManualTests()');

// Return the testing interface
window.diamondQA;