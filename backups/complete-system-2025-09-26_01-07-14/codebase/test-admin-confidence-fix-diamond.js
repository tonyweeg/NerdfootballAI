const puppeteer = require('puppeteer');
const fs = require('fs');

async function testAdminConfidenceFix() {
    console.log('🔧 Testing Admin Confidence Fix - Diamond Level Test');
    
    // Test the validateAndFixConfidenceValues function in isolation
    console.log('\n1. Testing validateAndFixConfidenceValues function logic:');
    
    // Mock games data
    const mockGames = [
        { id: 'game1' },
        { id: 'game2' }, 
        { id: 'game3' },
        { id: 'game4' }
    ];
    
    // Test case 1: Picks with confidence 0 values
    const testPicks1 = {
        'game1': { winner: 'TeamA', confidence: 1 },
        'game2': { winner: 'TeamB', confidence: 0 }, // Zero confidence - should be fixed
        'game3': { winner: 'TeamC', confidence: 3 },
        'game4': { winner: 'TeamD', confidence: 0 }  // Zero confidence - should be fixed
    };
    
    console.log('   Test Case 1: Picks with confidence 0 values');
    console.log('   Input picks:', JSON.stringify(testPicks1, null, 2));
    
    // Expected: game2 should get confidence 2, game4 should get confidence 4
    const expectedPicks1 = {
        'game1': { winner: 'TeamA', confidence: 1 },
        'game2': { winner: 'TeamB', confidence: 2 },
        'game3': { winner: 'TeamC', confidence: 3 },
        'game4': { winner: 'TeamD', confidence: 4 }
    };
    
    // Test case 2: All valid confidence values
    const testPicks2 = {
        'game1': { winner: 'TeamA', confidence: 1 },
        'game2': { winner: 'TeamB', confidence: 2 },
        'game3': { winner: 'TeamC', confidence: 3 },
        'game4': { winner: 'TeamD', confidence: 4 }
    };
    
    console.log('   Test Case 2: All valid confidence values');
    console.log('   Input picks:', JSON.stringify(testPicks2, null, 2));
    
    // Test case 3: Mixed scenario - some zeros, some duplicates
    const testPicks3 = {
        'game1': { winner: 'TeamA', confidence: 1 },
        'game2': { winner: 'TeamB', confidence: 0 },
        'game3': { winner: 'TeamC', confidence: 1 }, // Duplicate
        'game4': { winner: 'TeamD', confidence: 0 }
    };
    
    console.log('   Test Case 3: Mixed scenario with zeros and duplicates');
    console.log('   Input picks:', JSON.stringify(testPicks3, null, 2));
    
    // Launch browser to test the function
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Load the main page to get access to the function
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        // Inject our test function into the page
        const testResults = await page.evaluate((testPicks1, testPicks2, testPicks3, mockGames, expectedPicks1) => {
            const results = {};
            
            try {
                // Test case 1
                const result1 = validateAndFixConfidenceValues(testPicks1, mockGames);
                results.test1 = {
                    input: testPicks1,
                    output: result1,
                    expected: expectedPicks1,
                    passed: JSON.stringify(result1) === JSON.stringify(expectedPicks1)
                };
                
                // Test case 2 (should remain unchanged)
                const result2 = validateAndFixConfidenceValues(testPicks2, mockGames);
                results.test2 = {
                    input: testPicks2,
                    output: result2,
                    passed: JSON.stringify(result2) === JSON.stringify(testPicks2)
                };
                
                // Test case 3
                const result3 = validateAndFixConfidenceValues(testPicks3, mockGames);
                results.test3 = {
                    input: testPicks3,
                    output: result3,
                    // For this case, we just check no zeros remain
                    passed: Object.values(result3).every(pick => pick.confidence > 0)
                };
                
            } catch (error) {
                results.error = error.message;
            }
            
            return results;
        }, testPicks1, testPicks2, testPicks3, mockGames, expectedPicks1);
        
        // Report results
        console.log('\n📊 Test Results:');
        
        if (testResults.error) {
            console.log('❌ Test failed with error:', testResults.error);
            return false;
        }
        
        console.log(`   Test 1 (Zero Confidence Fix): ${testResults.test1.passed ? '✅ PASSED' : '❌ FAILED'}`);
        if (!testResults.test1.passed) {
            console.log('      Expected:', JSON.stringify(testResults.test1.expected, null, 2));
            console.log('      Got:     ', JSON.stringify(testResults.test1.output, null, 2));
        }
        
        console.log(`   Test 2 (Valid Picks Unchanged): ${testResults.test2.passed ? '✅ PASSED' : '❌ FAILED'}`);
        if (!testResults.test2.passed) {
            console.log('      Input:   ', JSON.stringify(testResults.test2.input, null, 2));
            console.log('      Got:     ', JSON.stringify(testResults.test2.output, null, 2));
        }
        
        console.log(`   Test 3 (No Zeros Remain): ${testResults.test3.passed ? '✅ PASSED' : '❌ FAILED'}`);
        if (!testResults.test3.passed) {
            console.log('      Output still has zeros:', JSON.stringify(testResults.test3.output, null, 2));
        }
        
        const allPassed = testResults.test1.passed && testResults.test2.passed && testResults.test3.passed;
        
        console.log(`\n💎 Diamond Test Summary: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        return allPassed;
        
    } catch (error) {
        console.error('❌ Test execution error:', error);
        return false;
    } finally {
        await browser.close();
    }
}

// Run the test
if (require.main === module) {
    testAdminConfidenceFix()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal test error:', error);
            process.exit(1);
        });
}

module.exports = { testAdminConfidenceFix };