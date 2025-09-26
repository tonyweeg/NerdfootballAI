/**
 * Test Eastern Time Parser - Verify 1PM Sunday Games Lock Correctly
 *
 * This test validates that ESPN timestamps are properly parsed as Eastern Time
 * and that games lock at the correct times for confidence pool picks.
 */

console.log('🧪 EASTERN TIME PARSER TEST SUITE');

function testTimezoneConversion() {
    console.log('\n📋 TEST: ESPN Timestamp Conversion');

    const testCases = [
        {
            espnTimestamp: '2025-10-19T13:00:00Z', // 1PM Sunday Eastern
            expectedUTC: '2025-10-19T17:00:00.000Z', // Should be 5PM UTC (EDT active)
            description: '1PM Sunday EDT'
        },
        {
            espnTimestamp: '2025-10-19T16:25:00Z', // 4:25PM Sunday Eastern
            expectedUTC: '2025-10-19T20:25:00.000Z', // Should be 8:25PM UTC (EDT active)
            description: '4:25PM Sunday EDT'
        },
        {
            espnTimestamp: '2025-01-12T20:15:00Z', // 8:15PM Sunday Eastern (January - EST)
            expectedUTC: '2025-01-13T01:15:00.000Z', // Should be 1:15AM UTC next day (EST active)
            description: '8:15PM Sunday EST (January)'
        }
    ];

    let passedTests = 0;
    let totalTests = testCases.length;

    testCases.forEach((testCase, index) => {
        console.log(`\n🔍 Test ${index + 1}: ${testCase.description}`);
        console.log(`  Original: ${testCase.espnTimestamp}`);
        console.log(`  Expected: ${testCase.expectedUTC}`);

        if (window.easternTimeParser) {
            const parsed = window.easternTimeParser.parseESPNTimestamp(testCase.espnTimestamp);
            const actualUTC = parsed.toISOString();

            console.log(`  Actual:   ${actualUTC}`);

            const passed = actualUTC === testCase.expectedUTC;

            if (passed) {
                console.log('  ✅ PASS');
                passedTests++;
            } else {
                console.log('  ❌ FAIL');

                // Calculate the difference
                const expectedMs = new Date(testCase.expectedUTC).getTime();
                const actualMs = parsed.getTime();
                const diffHours = (actualMs - expectedMs) / (1000 * 60 * 60);
                console.log(`  📊 Difference: ${diffHours} hours`);
            }
        } else {
            console.log('  ❌ FAIL - Eastern Time Parser not available');
        }
    });

    console.log(`\n📊 TEST RESULTS: ${passedTests}/${totalTests} passed`);
    return passedTests === totalTests;
}

function testGameLockingBehavior() {
    console.log('\n📋 TEST: Game Locking Behavior');

    const mockCurrentTime = new Date('2025-10-19T17:30:00.000Z'); // 1:30PM EDT (5:30PM UTC)

    const gameScenarios = [
        {
            espnTimestamp: '2025-10-19T13:00:00Z', // 1PM EDT game
            shouldBeLocked: true,
            description: '1PM game (started 30 minutes ago)'
        },
        {
            espnTimestamp: '2025-10-19T16:25:00Z', // 4:25PM EDT game
            shouldBeLocked: false,
            description: '4:25PM game (starts in future)'
        },
        {
            espnTimestamp: '2025-10-19T20:15:00Z', // 8:15PM EDT game
            shouldBeLocked: false,
            description: '8:15PM game (starts much later)'
        }
    ];

    let passedTests = 0;
    let totalTests = gameScenarios.length;

    // Mock current time for consistent testing
    const originalNow = Date.now;
    Date.now = () => mockCurrentTime.getTime();

    gameScenarios.forEach((scenario, index) => {
        console.log(`\n🔍 Test ${index + 1}: ${scenario.description}`);
        console.log(`  Game Time: ${scenario.espnTimestamp}`);
        console.log(`  Current: ${mockCurrentTime.toISOString()}`);
        console.log(`  Should Be Locked: ${scenario.shouldBeLocked}`);

        if (window.easternTimeParser) {
            const hasStarted = window.easternTimeParser.hasGameStarted(scenario.espnTimestamp);

            console.log(`  Actually Locked: ${hasStarted}`);

            const passed = hasStarted === scenario.shouldBeLocked;

            if (passed) {
                console.log('  ✅ PASS');
                passedTests++;
            } else {
                console.log('  ❌ FAIL');
            }
        } else {
            console.log('  ❌ FAIL - Eastern Time Parser not available');
        }
    });

    // Restore original Date.now
    Date.now = originalNow;

    console.log(`\n📊 LOCKING TEST RESULTS: ${passedTests}/${totalTests} passed`);
    return passedTests === totalTests;
}

function testFormattedDisplay() {
    console.log('\n📋 TEST: Formatted Time Display');

    const displayTests = [
        {
            espnTimestamp: '2025-10-19T13:00:00Z',
            description: '1PM Sunday game formatting'
        },
        {
            espnTimestamp: '2025-10-19T20:15:00Z',
            description: '8:15PM Sunday game formatting'
        }
    ];

    displayTests.forEach((test, index) => {
        console.log(`\n🔍 Display Test ${index + 1}: ${test.description}`);

        if (window.easternTimeParser) {
            const formatted = window.easternTimeParser.formatGameTime(test.espnTimestamp);
            console.log(`  ESPN: ${test.espnTimestamp}`);
            console.log(`  Display: ${formatted}`);
            console.log('  ✅ PASS (manual verification)');
        } else {
            console.log('  ❌ FAIL - Eastern Time Parser not available');
        }
    });
}

function runFullTestSuite() {
    console.log('🚀 STARTING EASTERN TIME PARSER TEST SUITE');

    // Wait for parser to initialize
    setTimeout(() => {
        const test1 = testTimezoneConversion();
        const test2 = testGameLockingBehavior();
        testFormattedDisplay();

        console.log('\n🏆 FINAL RESULTS');
        if (test1 && test2) {
            console.log('✅ ALL TESTS PASSED - Eastern Time Parser working correctly!');
            console.log('🎯 1PM Sunday games should now lock properly');
        } else {
            console.log('❌ SOME TESTS FAILED - Review implementation');
        }

        // Run diagnostics
        if (window.easternTimeParser) {
            window.easternTimeParser.runDiagnostics();
        }
    }, 1000);
}

// Auto-run tests when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFullTestSuite);
} else {
    runFullTestSuite();
}

// Export test functions for manual use
window.testTimezoneConversion = testTimezoneConversion;
window.testGameLockingBehavior = testGameLockingBehavior;
window.runFullTestSuite = runFullTestSuite;