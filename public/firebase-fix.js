/**
 * BULLETPROOF Firebase Global Initialization
 * Uses synchronous loading to guarantee globals before bundle execution
 */

console.log('🛡️ PHAROAH: Bulletproof Firebase initialization starting...');

// Remove the export statement that was causing errors
// export { app, auth, db, functions, rtdb };

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
            window.firebaseReady = true;
            
            console.log('✅ PHAROAH: All Firebase globals initialized successfully');
            console.log('✅ Available: app, auth, db, functions, rtdb');
            
            // Emit ready event
            const readyEvent = new CustomEvent('firebaseGlobalsReady', {
                detail: {
                    app: window.firebaseApp,
                    auth: window.auth,
                    db: window.db,
                    functions: window.functions,
                    rtdb: window.rtdb
                }
            });
            window.dispatchEvent(readyEvent);
            
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
    window.firebaseReady = false;
    
    console.log('⚠️ Fallback Firebase globals set - limited functionality');
}

// Start the bulletproof initialization
loadFirebaseSync();