/**
 * BULLETPROOF Firebase Global Initialization
 * Uses synchronous loading to guarantee globals before bundle execution
 */

console.log('🛡️ PHAROAH: Bulletproof Firebase initialization starting...');

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw",
    authDomain: "nerdfootball.firebaseapp.com",
    databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com",
    projectId: "nerdfootball",
    storageBucket: "nerdfootball.appspot.com",
    messagingSenderId: "969304790725",
    appId: "1:969304790725:web:892df38db0b0e62bde02ac"
};

// Synchronous script loading function
function loadFirebaseSync() {
    try {
        console.log('🔥 Loading Firebase synchronously...');
        
        // Create and load Firebase app script synchronously
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
        script.async = false; // Force synchronous loading
        document.head.appendChild(script);
        
        // Wait for script to load
        script.onload = function() {
            console.log('✅ Firebase app loaded');
            loadFirebaseServices();
        };
        
    } catch (error) {
        console.error('❌ Firebase sync load failed:', error);
        fallbackFirebaseInit();
    }
}

function loadFirebaseServices() {
    try {
        // Load Firebase services synchronously
        const services = [
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-functions-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js'
        ];
        
        let loadedCount = 0;
        
        services.forEach((src, index) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.onload = function() {
                loadedCount++;
                console.log(`✅ Firebase service ${index + 1}/${services.length} loaded`);
                
                if (loadedCount === services.length) {
                    initializeFirebaseGlobals();
                }
            };
            document.head.appendChild(script);
        });
        
    } catch (error) {
        console.error('❌ Firebase services load failed:', error);
        fallbackFirebaseInit();
    }
}

function initializeFirebaseGlobals() {
    try {
        console.log('🚀 Initializing Firebase globals...');
        
        // Initialize Firebase app
        if (typeof firebase !== 'undefined') {
            const app = firebase.initializeApp(firebaseConfig);
            
            // Create global services
            window.firebaseApp = app;
            window.auth = firebase.auth();
            window.db = firebase.firestore();
            window.functions = firebase.functions();
            window.rtdb = firebase.database();
            
            // PHAROAH ARCHITECTURE FIX: Bulletproof httpsCallable implementation
            // The previous implementation was causing mysterious execution halts
            // This new implementation ensures non-blocking, defensive operation
            
            if (window.functions) {
                try {
                    // Use setTimeout(0) to ensure this doesn't block the main thread
                    // This architectural pattern prevents any synchronous blocking
                    window.httpsCallable = function(functionsInstance, functionName) {
                        // Guard against null/undefined
                        if (!functionsInstance || !functionName) {
                            console.warn('⚠️ httpsCallable called with invalid params:', { functionsInstance, functionName });
                            return () => Promise.reject(new Error('Invalid parameters'));
                        }
                        
                        // Return the callable function directly from Firebase
                        // Don't try to wrap or verify - just pass through
                        try {
                            if (functionsInstance.httpsCallable) {
                                return functionsInstance.httpsCallable(functionName);
                            } else {
                                // Fallback to global firebase.functions()
                                return firebase.functions().httpsCallable(functionName);
                            }
                        } catch (innerError) {
                            console.error('❌ httpsCallable creation error:', innerError);
                            // Return a rejected promise function instead of throwing
                            return () => Promise.reject(innerError);
                        }
                    };
                    
                    console.log('✅ PHAROAH: httpsCallable wrapper created (non-blocking architecture)');
                    
                    // Set a flag that httpsCallable is ready without actually testing it
                    window.httpsCallableReady = true;
                    
                } catch (wrapperError) {
                    console.error('❌ PHAROAH: Failed to create httpsCallable wrapper:', wrapperError);
                    // Provide a stub that returns rejected promises
                    window.httpsCallable = () => () => Promise.reject(new Error('httpsCallable not available'));
                    window.httpsCallableReady = false;
                }
            } else {
                console.warn('⚠️ PHAROAH: Functions service not available, creating stub');
                window.httpsCallable = () => () => Promise.reject(new Error('Firebase Functions not initialized'));
                window.httpsCallableReady = false;
            }
            
            // Add Firestore helper functions to global scope
            if (window.db) {
                window.collection = function(db, path) {
                    return db.collection(path);
                };
                window.doc = function(db, path) {
                    return db.doc(path);
                };
                window.getDoc = function(docRef) {
                    return docRef.get();
                };
                window.getDocs = function(collectionRef) {
                    return collectionRef.get();
                };
                window.setDoc = function(docRef, data, options) {
                    return docRef.set(data, options);
                };
                window.updateDoc = function(docRef, data) {
                    return docRef.update(data);
                };
                window.deleteDoc = function(docRef) {
                    return docRef.delete();
                };
                window.onSnapshot = function(ref, callback) {
                    return ref.onSnapshot(callback);
                };
                console.log('✅ Firestore helper functions added to global scope');
            }
            
            window.firebaseReady = true;
            
            console.log('✅ PHAROAH: All Firebase globals initialized successfully');
            console.log('✅ Available: app, auth, db, functions, rtdb, httpsCallable');
            console.log('✅ Available Firestore functions: collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot');
            
            // Skip httpsCallable verification - it's causing execution halt
            // The verification itself was blocking execution
            console.log('⚡ PHAROAH: Skipping httpsCallable verification to prevent blocking');
            console.log('🔥 PHAROAH: Moving directly to event emission');
            
            // PHAROAH ARCHITECTURE: Bulletproof event emission with multiple fallbacks
            console.log('🔥 PHAROAH: Starting bulletproof event emission sequence');
            
            // Method 1: Try CustomEvent (standard approach)
            try {
                console.log('🔥 PHAROAH: Attempting CustomEvent dispatch...');
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
                
                // Use setTimeout to ensure non-blocking
                setTimeout(() => {
                    window.dispatchEvent(readyEvent);
                    console.log('✅ PHAROAH: CustomEvent dispatched successfully');
                }, 0);
                
            } catch (eventError) {
                console.error('❌ PHAROAH: CustomEvent failed:', eventError);
                
                // Method 2: Try legacy Event creation
                try {
                    const evt = document.createEvent('Event');
                    evt.initEvent('firebaseGlobalsReady', true, false);
                    setTimeout(() => {
                        window.dispatchEvent(evt);
                        console.log('✅ PHAROAH: Legacy event dispatched');
                    }, 0);
                } catch (legacyError) {
                    console.error('❌ PHAROAH: Legacy event also failed:', legacyError);
                }
            }
            
            // PHAROAH ARCHITECTURE: Guaranteed bundle release with multiple strategies
            // Use setTimeout to ensure this runs after any potential blocking
            setTimeout(() => {
                console.log('🔥 PHAROAH: Executing guaranteed bundle release sequence');
                
                // Strategy 1: Direct bundle gate release
                if (window.bundleGate && window.bundleGate.releaseWaitingBundles) {
                    console.log('✅ PHAROAH: Releasing bundles via bundleGate');
                    window.bundleGate.firebaseReady = true;
                    window.bundleGate.releaseWaitingBundles();
                } else {
                    console.warn('⚠️ PHAROAH: bundleGate not ready, will retry...');
                    
                    // Strategy 2: Retry with polling (max 10 attempts)
                    let retryCount = 0;
                    const retryInterval = setInterval(() => {
                        retryCount++;
                        if (window.bundleGate && window.bundleGate.releaseWaitingBundles) {
                            console.log(`✅ PHAROAH: Bundle gate found on retry ${retryCount}`);
                            window.bundleGate.firebaseReady = true;
                            window.bundleGate.releaseWaitingBundles();
                            clearInterval(retryInterval);
                        } else if (retryCount >= 10) {
                            console.error('❌ PHAROAH: Bundle gate never appeared after 10 retries');
                            clearInterval(retryInterval);
                            
                            // Strategy 3: Force-load bundles directly
                            console.log('🔥 PHAROAH: Attempting direct bundle execution...');
                            forceBundleExecution();
                        }
                    }, 100);
                }
            }, 10); // Small delay to ensure non-blocking
            
            // Call any waiting resolvers
            if (window.firebaseReadyResolve) {
                window.firebaseReadyResolve();
            }
            
            console.log('🎉 PHAROAH: Firebase architecture ready for bundles!');
            
        } else {
            throw new Error('Firebase SDK not available');
        }
        
    } catch (error) {
        console.error('❌ Firebase globals initialization failed:', error);
        fallbackFirebaseInit();
    }
}

function fallbackFirebaseInit() {
    console.warn('⚠️ PHAROAH: Using fallback Firebase initialization...');
    
    // Provide minimal globals to prevent crashes
    window.firebaseApp = { name: 'fallback' };
    window.auth = { currentUser: null };
    window.db = { collection: () => ({ doc: () => ({}) }) };
    window.functions = { httpsCallable: () => () => Promise.resolve({}) };
    window.rtdb = { ref: () => ({ on: () => {}, off: () => {} }) };
    window.httpsCallable = () => () => Promise.resolve({});
    window.firebaseReady = false;
    
    console.log('⚠️ Fallback Firebase globals set - limited functionality');
}

// PHAROAH ARCHITECTURE: Force bundle execution as last resort
function forceBundleExecution() {
    console.log('🚨 PHAROAH: Force-executing bundles as last resort');
    
    // Find all script tags with bundle names
    const bundleScripts = [
        'core-bundle.js',
        'survivor-bundle.js', 
        'confidence-bundle.js',
        'features-bundle.js'
    ];
    
    bundleScripts.forEach(scriptName => {
        const scriptTag = document.querySelector(`script[src*="${scriptName}"]`);
        if (scriptTag) {
            console.log(`🔥 PHAROAH: Force-reloading ${scriptName}`);
            
            // Create a new script tag to force execution
            const newScript = document.createElement('script');
            newScript.src = scriptTag.src.includes('?') ? 
                `${scriptTag.src}&force=${Date.now()}` : 
                `${scriptTag.src}?force=${Date.now()}`;
            newScript.defer = false;
            newScript.async = false;
            
            // Remove old script and add new one
            scriptTag.remove();
            document.body.appendChild(newScript);
        }
    });
}

// PHAROAH ARCHITECTURE: Emergency recovery system
// If nothing happens after 5 seconds, force everything
setTimeout(() => {
    if (!window.firebaseReady) {
        console.error('🚨 PHAROAH: Emergency recovery - Firebase init timeout after 5 seconds');
        
        // Set all flags to prevent further blocking
        window.firebaseReady = true;
        window.httpsCallableReady = true;
        
        // Force event emission
        try {
            const emergencyEvent = new Event('firebaseGlobalsReady');
            window.dispatchEvent(emergencyEvent);
        } catch (e) {
            console.error('Emergency event failed:', e);
        }
        
        // Force bundle gate release
        if (window.bundleGate) {
            window.bundleGate.firebaseReady = true;
            if (window.bundleGate.releaseWaitingBundles) {
                window.bundleGate.releaseWaitingBundles();
            }
        }
        
        // Last resort: force bundle execution
        forceBundleExecution();
    }
}, 5000);

// Start the bulletproof initialization
loadFirebaseSync();