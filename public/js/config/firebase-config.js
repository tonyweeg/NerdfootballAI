/**
 * Centralized Firebase Configuration
 * Single source of truth for all Firebase initialization
 *
 * Usage:
 * <script type="module">
 *   import { initializeFirebaseApp } from './js/config/firebase-config.js';
 *   const { app, db, auth, rtdb } = await initializeFirebaseApp();
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

let firebaseInitialized = false;
let firebaseApp = null;
let firestoreDb = null;
let firebaseAuth = null;
let realtimeDb = null;

export async function initializeFirebaseApp() {
    if (firebaseInitialized) {
        return {
            app: firebaseApp,
            db: firestoreDb,
            auth: firebaseAuth,
            rtdb: realtimeDb
        };
    }

    try {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        firestoreDb = firebase.firestore();
        firebaseAuth = firebase.auth();
        realtimeDb = firebase.database();

        firebaseInitialized = true;

        return {
            app: firebaseApp,
            db: firestoreDb,
            auth: firebaseAuth,
            rtdb: realtimeDb
        };
    } catch (error) {
        console.error('🔥 Firebase initialization failed:', error);
        throw error;
    }
}

export function getFirebaseConfig() {
    return { ...FIREBASE_CONFIG };
}
