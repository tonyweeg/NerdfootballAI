// Unit test for the validateAndFixConfidenceValues function
console.log('🔧 Testing validateAndFixConfidenceValues - Diamond Level Unit Test');

// Copy the function definition for testing
function validateAndFixConfidenceValues(picks, gamesForWeek) {
    const validatedPicks = JSON.parse(JSON.stringify(picks)); // Deep copy
    
    // Get all game IDs for this week
    const gameIds = gamesForWeek.map(game => game.id);
    const numGames = gameIds.length;
    
    if (numGames === 0) return validatedPicks;
    
    // Collect current confidence values and find any zeros
    const confidenceMap = {};
    const zeroConfidenceGames = [];
    
    gameIds.forEach(gameId => {
        if (validatedPicks[gameId] && validatedPicks[gameId].confidence !== undefined) {
            const confidence = validatedPicks[gameId].confidence;
            if (confidence === 0) {
                zeroConfidenceGames.push(gameId);
            } else {
                confidenceMap[confidence] = gameId;
            }
        }
    });
    
    // Find missing confidence values (1 to numGames)
    const missingConfidences = [];
    for (let i = 1; i <= numGames; i++) {
        if (!confidenceMap[i]) {
            missingConfidences.push(i);
        }
    }
    
    // Assign missing confidence values to games with confidence 0
    zeroConfidenceGames.forEach((gameId, index) => {
        if (index < missingConfidences.length) {
            validatedPicks[gameId].confidence = missingConfidences[index];
        }
    });
    
    return validatedPicks;
}

// Test data
const mockGames = [
    { id: 'game1' },
    { id: 'game2' }, 
    { id: 'game3' },
    { id: 'game4' }
];

console.log('\n1. Test Case 1: Picks with confidence 0 values');
const testPicks1 = {
    'game1': { winner: 'TeamA', confidence: 1 },
    'game2': { winner: 'TeamB', confidence: 0 }, // Should become 2
    'game3': { winner: 'TeamC', confidence: 3 },
    'game4': { winner: 'TeamD', confidence: 0 }  // Should become 4
};

console.log('   Input:', JSON.stringify(testPicks1, null, 4));
const result1 = validateAndFixConfidenceValues(testPicks1, mockGames);
console.log('   Output:', JSON.stringify(result1, null, 4));

const expected1 = {
    'game1': { winner: 'TeamA', confidence: 1 },
    'game2': { winner: 'TeamB', confidence: 2 },
    'game3': { winner: 'TeamC', confidence: 3 },
    'game4': { winner: 'TeamD', confidence: 4 }
};

const test1Pass = JSON.stringify(result1) === JSON.stringify(expected1);
console.log(`   Result: ${test1Pass ? '✅ PASSED' : '❌ FAILED'}`);

if (!test1Pass) {
    console.log('   Expected:', JSON.stringify(expected1, null, 4));
}

console.log('\n2. Test Case 2: All valid confidence values (should remain unchanged)');
const testPicks2 = {
    'game1': { winner: 'TeamA', confidence: 1 },
    'game2': { winner: 'TeamB', confidence: 2 },
    'game3': { winner: 'TeamC', confidence: 3 },
    'game4': { winner: 'TeamD', confidence: 4 }
};

console.log('   Input:', JSON.stringify(testPicks2, null, 4));
const result2 = validateAndFixConfidenceValues(testPicks2, mockGames);
console.log('   Output:', JSON.stringify(result2, null, 4));

const test2Pass = JSON.stringify(result2) === JSON.stringify(testPicks2);
console.log(`   Result: ${test2Pass ? '✅ PASSED' : '❌ FAILED'}`);

console.log('\n3. Test Case 3: Mixed scenario - zeros and gaps');
const testPicks3 = {
    'game1': { winner: 'TeamA', confidence: 1 },
    'game2': { winner: 'TeamB', confidence: 0 }, // Missing 2, should get it
    'game3': { winner: 'TeamC', confidence: 4 }, // Skip 3
    'game4': { winner: 'TeamD', confidence: 0 }  // Missing 3, should get it
};

console.log('   Input:', JSON.stringify(testPicks3, null, 4));
const result3 = validateAndFixConfidenceValues(testPicks3, mockGames);
console.log('   Output:', JSON.stringify(result3, null, 4));

// Check that no zeros remain and all values are between 1-4
const confidences3 = Object.values(result3).map(pick => pick.confidence);
const test3Pass = confidences3.every(c => c >= 1 && c <= 4) && !confidences3.includes(0);
console.log(`   Result: ${test3Pass ? '✅ PASSED' : '❌ FAILED'}`);

console.log('\n4. Test Case 4: Empty picks object');
const testPicks4 = {};
const result4 = validateAndFixConfidenceValues(testPicks4, mockGames);
const test4Pass = JSON.stringify(result4) === JSON.stringify({});
console.log(`   Empty picks test: ${test4Pass ? '✅ PASSED' : '❌ FAILED'}`);

const allTestsPass = test1Pass && test2Pass && test3Pass && test4Pass;
console.log(`\n💎 Diamond Test Summary: ${allTestsPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (allTestsPass) {
    console.log('\n🎯 Confidence validation function is working correctly!');
    console.log('The admin save picks bug should now be fixed.');
} else {
    console.log('\n❌ Function needs adjustment before deployment.');
}

process.exit(allTestsPass ? 0 : 1);