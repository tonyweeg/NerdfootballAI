/**
 * SIMPLIFIED Firebase Global Initialization
 * Defers to the modular Firebase initialization in index.html
 * Only provides bundle coordination
 */

console.log('🛡️ FIREBASE INIT: Simplified initialization (deferring to modular system)...');

// Wait for the modular Firebase system in index.html to initialize
function waitForModularFirebase() {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max for production

    const checkFirebase = () => {
        attempts++;

        // Check if Firebase globals have been set by the modular system
        if (window.auth && window.db && window.functions && window.httpsCallable) {
            console.log('✅ FIREBASE INIT: Modular Firebase detected, setting up coordination');

            // Set ready flags
            window.firebaseReady = true;
            window.httpsCallableReady = true;

            // Emit ready event for bundles
            emitFirebaseReadyEvent();
            return;
        }

        if (attempts >= maxAttempts) {
            console.error('❌ FIREBASE INIT: Timeout waiting for modular Firebase');
            console.log('Debug - Current globals:', {
                auth: !!window.auth,
                db: !!window.db,
                functions: !!window.functions,
                httpsCallable: !!window.httpsCallable
            });

            // Still emit event to prevent bundle blocking
            emitFirebaseReadyEvent();
            return;
        }

        // Try again in 100ms
        setTimeout(checkFirebase, 100);
    };

    // Start checking
    setTimeout(checkFirebase, 100);
}

function emitFirebaseReadyEvent() {
    console.log('🔥 FIREBASE INIT: Emitting firebaseGlobalsReady event...');

    try {
        const readyEvent = new CustomEvent('firebaseGlobalsReady', {
            detail: {
                app: window.firebaseApp,
                auth: window.auth,
                db: window.db,
                functions: window.functions,
                rtdb: window.rtdb,
                httpsCallableReady: window.httpsCallableReady
            },
            bubbles: true,
            cancelable: false
        });

        window.dispatchEvent(readyEvent);
        console.log('✅ FIREBASE INIT: Event dispatched successfully');

    } catch (eventError) {
        console.error('❌ Event emission failed:', eventError);
    }

    // Also signal bundle gate directly
    setTimeout(() => {
        if (window.bundleGate) {
            console.log('✅ FIREBASE INIT: Releasing bundles via bundleGate');
            window.bundleGate.firebaseReady = true;
            if (window.bundleGate.releaseWaitingBundles) {
                window.bundleGate.releaseWaitingBundles();
            }
        } else {
            console.warn('⚠️ FIREBASE INIT: bundleGate not ready yet');
        }
    }, 10);

    console.log('🎉 FIREBASE INIT: Coordination complete!');
}

// Start the Firebase coordination system
console.log('🔥 FIREBASE INIT: Starting coordination system...');
waitForModularFirebase();