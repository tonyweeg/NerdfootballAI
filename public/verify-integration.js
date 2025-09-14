// Integration Verification Script for Live Game Modal System
// This script can be run in browser console to test the integration

console.log('🔍 INTEGRATION VERIFICATION STARTING...');
console.log('=====================================');

// Test 1: Check Firebase globals are available
console.log('TEST 1: Firebase Global Variables');
const firebaseVars = ['auth', 'db', 'functions', 'firebaseApp', 'httpsCallable'];
const firebaseStatus = {};

firebaseVars.forEach(varName => {
    firebaseStatus[varName] = typeof window[varName] !== 'undefined';
    console.log(`  ${varName}: ${firebaseStatus[varName] ? '✅' : '❌'}`);
});

// Test 2: Check modal functions are available
console.log('\nTEST 2: Modal Function Availability');
const modalFunctions = ['openLiveGameModal', 'closeLiveGameModal', 'addGameClickHandler'];
const modalStatus = {};

modalFunctions.forEach(funcName => {
    modalStatus[funcName] = typeof window[funcName] === 'function';
    console.log(`  ${funcName}: ${modalStatus[funcName] ? '✅' : '❌'}`);
});

// Test 3: Check Firebase Functions emulator configuration
console.log('\nTEST 3: Firebase Functions Configuration');
if (window.functions) {
    try {
        // Check if emulator is configured (this will be visible in network requests)
        const testCallable = window.httpsCallable(window.functions, 'fetchLiveGameDetails');
        console.log('  Firebase Functions instance: ✅');
        console.log('  httpsCallable creation: ✅');
        console.log('  Emulator should be configured for localhost:5004');
    } catch (error) {
        console.log('  Firebase Functions error:', error);
    }
} else {
    console.log('  Firebase Functions: ❌ Not available');
}

// Test 4: Test actual function call (if functions available)
if (firebaseStatus.functions && firebaseStatus.httpsCallable) {
    console.log('\nTEST 4: Live Firebase Function Call');

    const testFunctionCall = async () => {
        try {
            console.log('  Calling fetchLiveGameDetails with test ESPN ID...');
            const fetchLiveGameDetailsFn = window.httpsCallable(window.functions, 'fetchLiveGameDetails');
            const result = await fetchLiveGameDetailsFn({ espnEventId: '401547429' });

            console.log('  Function call result:', result.data.success ? '✅' : '❌');
            if (result.data.success) {
                const teams = result.data.data.teams;
                console.log(`  Game data: ${teams.away.name} @ ${teams.home.name}`);
                console.log('  🎉 INTEGRATION FULLY WORKING!');
            } else {
                console.log('  Error:', result.data.error);
            }
        } catch (error) {
            console.log('  Function call failed:', error.message);
            console.log('  ❌ Check Firebase emulator is running on port 5004');
        }
    };

    testFunctionCall();
} else {
    console.log('\nTEST 4: Skipped - Firebase Functions not available');
}

// Test 5: Modal DOM elements
console.log('\nTEST 5: Modal DOM Elements');
const modalElements = [
    'live-game-modal',
    'modal-game-title',
    'modal-loading',
    'modal-game-content',
    'modal-refresh-btn'
];

modalElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    console.log(`  ${elementId}: ${element ? '✅' : '❌'}`);
});

// Summary
console.log('\n📊 INTEGRATION VERIFICATION SUMMARY');
console.log('===================================');
const allFirebaseVars = Object.values(firebaseStatus).every(status => status);
const allModalFuncs = Object.values(modalStatus).every(status => status);

console.log(`Firebase Globals: ${allFirebaseVars ? '✅ ALL GOOD' : '❌ MISSING VARS'}`);
console.log(`Modal Functions: ${allModalFuncs ? '✅ ALL GOOD' : '❌ MISSING FUNCS'}`);

if (allFirebaseVars && allModalFuncs) {
    console.log('🎉 INTEGRATION READY!');
    console.log('🎯 Click any game card to test the live modal');
} else {
    console.log('❌ INTEGRATION INCOMPLETE - Check missing components above');
}

console.log('=====================================');