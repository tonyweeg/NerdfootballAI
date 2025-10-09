/**
 * Centralized Firebase Configuration - v10 Modular SDK
 * Single source of truth for all Firebase initialization
 *
 * Compatible with Firebase v10.12.2 modular SDK
 *
 * Usage:
 * <script type="module">
 *   import { getFirebaseConfig } from './js/config/firebase-config.js';
 *   import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
 *
 *   const app = initializeApp(getFirebaseConfig());
 * </script>
 */

export function getFirebaseConfig() {
    return {
        apiKey: "AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw",
        authDomain: "nerdfootball.firebaseapp.com",
        databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com",
        projectId: "nerdfootball",
        storageBucket: "nerdfootball.appspot.com",
        messagingSenderId: "969304790725",
        appId: "1:969304790725:web:892df38db0b0e62bde02ac"
    };
}
