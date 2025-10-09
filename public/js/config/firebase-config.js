/**
 * Centralized Firebase Configuration
 * Single source of truth for all Firebase initialization
 *
 * Compatible with BOTH:
 * - Firebase v10 modular SDK (ES6 modules)
 * - Firebase v9 compat SDK (global firebase object)
 *
 * Usage v10 Modular SDK:
 * <script type="module">
 *   import { getFirebaseConfig } from './js/config/firebase-config.js';
 *   import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
 *   const app = initializeApp(getFirebaseConfig());
 * </script>
 *
 * Usage v9 Compat SDK:
 * <script src="./js/config/firebase-config.js"></script>
 * <script>
 *   const app = firebase.initializeApp(window.getFirebaseConfig());
 * </script>
 */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw",
    authDomain: "nerdfootball.firebaseapp.com",
    databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com",
    projectId: "nerdfootball",
    storageBucket: "nerdfootball.appspot.com",
    messagingSenderId: "969304790725",
    appId: "1:969304790725:web:892df38db0b0e62bde02ac"
};

// ES6 export for v10 modular SDK
export function getFirebaseConfig() {
    return { ...FIREBASE_CONFIG };
}

// Global export for v9 compat SDK (non-module script tags)
if (typeof window !== 'undefined') {
    window.getFirebaseConfig = function() {
        return { ...FIREBASE_CONFIG };
    };
}
