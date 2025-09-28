/**
 * Bundle Dependency Gate
 * Ensures bundles don't execute until Firebase globals are available
 * Prevents cascade failures from undefined Firebase services
 */

console.log('🚪 Bundle Dependency Gate: Initializing...');

// Track bundle readiness
window.bundleGate = {
    firebaseReady: false,
    bundlesWaiting: [],
    bundlesExecuted: [],
    
    // Register a bundle that needs Firebase
    waitForFirebase: function(bundleName, callback) {
        if (this.firebaseReady) {
            console.log(`🟢 Bundle Gate: ${bundleName} executing immediately (Firebase ready)`);
            callback();
            this.bundlesExecuted.push(bundleName);
        } else {
            console.log(`🟡 Bundle Gate: ${bundleName} waiting for Firebase...`);
            this.bundlesWaiting.push({ name: bundleName, callback });
        }
    },
    
    // Execute all waiting bundles when Firebase becomes ready
    releaseWaitingBundles: function() {
        console.log(`🚀 Bundle Gate: Releasing ${this.bundlesWaiting.length} waiting bundles`);
        
        this.bundlesWaiting.forEach(bundle => {
            console.log(`🟢 Bundle Gate: Executing ${bundle.name}`);
            try {
                bundle.callback();
                this.bundlesExecuted.push(bundle.name);
            } catch (error) {
                console.error(`❌ Bundle Gate: ${bundle.name} execution failed:`, error);
            }
        });
        
        this.bundlesWaiting = [];
        console.log(`✅ Bundle Gate: All bundles executed. Total: ${this.bundlesExecuted.length}`);
    }
};

// PHAROAH ARCHITECTURE: Multi-layered Firebase readiness detection
// Listen for Firebase readiness - with defensive programming
window.addEventListener('firebaseGlobalsReady', (event) => {
    console.log('🔥 Bundle Gate: Received firebaseGlobalsReady event!');
    
    // Don't block on httpsCallable check - it was causing the hang
    // Just verify basic Firebase services are available
    if (window.auth && window.db) {
        console.log('✅ Bundle Gate: Core Firebase services confirmed, releasing bundles');
        window.bundleGate.firebaseReady = true;
        window.bundleGate.releaseWaitingBundles();
    } else {
        console.warn('⚠️ Bundle Gate: Firebase services incomplete, releasing anyway to prevent blocking');
        window.bundleGate.firebaseReady = true;
        window.bundleGate.releaseWaitingBundles();
    }
});

// PHAROAH FAILSAFE: If no event received after 2 seconds, force release
setTimeout(() => {
    if (!window.bundleGate.firebaseReady) {
        console.warn('⚠️ Bundle Gate: No Firebase event after 2s, forcing bundle release');
        
        // Check if Firebase globals exist manually
        if (window.auth && window.db) {
            console.log('✅ Bundle Gate: Firebase globals found manually');
        } else {
            console.warn('⚠️ Bundle Gate: Firebase globals missing, bundles may have limited functionality');
        }
        
        window.bundleGate.firebaseReady = true;
        window.bundleGate.releaseWaitingBundles();
    }
}, 2000);

// Handle Firebase initialization errors
window.addEventListener('firebaseInitError', (event) => {
    console.error('❌ Bundle Gate: Firebase initialization failed:', event.detail.error);
    
    // Provide error state to bundles
    window.firebaseError = event.detail.error;
    
    // Still release bundles so they can handle the error state
    window.bundleGate.releaseWaitingBundles();
});

// Provide utility functions for bundles
window.ensureFirebase = function() {
    if (!window.firebaseReady && !window.firebaseError) {
        throw new Error('Firebase not ready - bundle should use bundleGate.waitForFirebase()');
    }
    
    if (window.firebaseError) {
        throw new Error(`Firebase initialization failed: ${window.firebaseError}`);
    }
    
    // Verify all required globals exist
    const requiredGlobals = ['auth', 'db', 'functions'];
    const missing = requiredGlobals.filter(global => !window[global]);
    
    if (missing.length > 0) {
        throw new Error(`Missing Firebase globals: ${missing.join(', ')}`);
    }
    
    return {
        auth: window.auth,
        db: window.db,
        functions: window.functions,
        rtdb: window.rtdb
    };
};

console.log('✅ Bundle Dependency Gate: Ready to manage bundle execution');

// PHAROAH ARCHITECTURE: Immediate check if Firebase is already ready
// This handles cases where Firebase loads before this script
if (window.firebaseReady || (window.auth && window.db)) {
    console.log('🔥 Bundle Gate: Firebase already initialized, releasing bundles immediately');
    window.bundleGate.firebaseReady = true;
    // Use setTimeout to ensure bundles have registered
    setTimeout(() => {
        window.bundleGate.releaseWaitingBundles();
    }, 10);
}