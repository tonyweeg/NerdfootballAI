/**
 * Quick Test Script for Firebase and UI Fixes
 * Run this in browser console to verify everything works
 */

console.log('🧪 Starting Firebase & UI Test...');

// Test 1: Check Firebase globals
const testFirebaseGlobals = () => {
    console.log('🔥 Test 1: Firebase Globals');
    const globals = ['firebaseApp', 'auth', 'db', 'functions', 'rtdb', 'httpsCallable'];
    const results = {};
    
    globals.forEach(global => {
        results[global] = {
            exists: window[global] !== undefined,
            type: typeof window[global]
        };
        const status = results[global].exists ? '✅' : '❌';
        console.log(`  ${status} window.${global}: ${results[global].type}`);
    });
    
    return results;
};

// Test 2: Test httpsCallable function
const testHttpsCallable = () => {
    console.log('📞 Test 2: httpsCallable Function');
    try {
        if (typeof window.httpsCallable !== 'function') {
            console.log('❌ window.httpsCallable is not a function');
            return false;
        }
        
        const testCall = window.httpsCallable(window.functions, 'testFunction');
        console.log('✅ httpsCallable created test function:', typeof testCall);
        return true;
    } catch (error) {
        console.log('❌ httpsCallable test failed:', error.message);
        return false;
    }
};

// Test 3: Check UI elements
const testUIElements = () => {
    console.log('🖥️ Test 3: UI Elements');
    const loadingView = document.getElementById('loading-view');
    const appView = document.getElementById('app-view');
    
    console.log('  Loading view:', {
        exists: !!loadingView,
        display: loadingView?.style.display || 'not set',
        visible: loadingView ? window.getComputedStyle(loadingView).display : 'not found'
    });
    
    console.log('  App view:', {
        exists: !!appView,
        display: appView?.style.display || 'not set',
        hasHiddenClass: appView?.classList.contains('hidden'),
        visible: appView ? window.getComputedStyle(appView).display : 'not found'
    });
    
    return {
        loadingHidden: loadingView && window.getComputedStyle(loadingView).display === 'none',
        appVisible: appView && window.getComputedStyle(appView).display !== 'none' && !appView.classList.contains('hidden')
    };
};

// Test 4: Check bundle status
const testBundles = () => {
    console.log('📦 Test 4: Bundle Status');
    if (window.bundleGate) {
        console.log('  Bundle Gate Status:', {
            firebaseReady: window.bundleGate.firebaseReady,
            bundlesWaiting: window.bundleGate.bundlesWaiting.length,
            bundlesExecuted: window.bundleGate.bundlesExecuted.length
        });
        return window.bundleGate;
    } else {
        console.log('❌ Bundle gate not found');
        return null;
    }
};

// Run all tests
const runAllTests = () => {
    console.log('🚀 Running comprehensive Firebase & UI tests...\n');
    
    const firebaseResults = testFirebaseGlobals();
    const httpsCallableWorks = testHttpsCallable();
    const uiResults = testUIElements();
    const bundleResults = testBundles();
    
    console.log('\n📊 Test Summary:');
    console.log('Firebase Ready:', window.firebaseReady);
    console.log('httpsCallable Works:', httpsCallableWorks);
    console.log('UI Loading Hidden:', uiResults.loadingHidden);
    console.log('UI App Visible:', uiResults.appVisible);
    console.log('Bundles Ready:', bundleResults?.firebaseReady);
    
    const allGood = window.firebaseReady && httpsCallableWorks && uiResults.loadingHidden && uiResults.appVisible;
    console.log(allGood ? '🎉 ALL TESTS PASSED!' : '⚠️ Some tests failed');
    
    return {
        firebase: firebaseResults,
        httpsCallable: httpsCallableWorks,
        ui: uiResults,
        bundles: bundleResults,
        overallSuccess: allGood
    };
};

// Auto-run after a short delay to let everything initialize
setTimeout(() => {
    runAllTests();
}, 2000);

// Also make it available globally for manual testing
window.testFirebaseFix = runAllTests;

console.log('🧪 Test script loaded. Will auto-run in 2 seconds, or call window.testFirebaseFix() manually');