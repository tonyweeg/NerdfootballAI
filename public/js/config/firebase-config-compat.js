/**
 * Centralized Firebase Configuration - Compat SDK Version
 * For use with regular <script> tags and compat SDK
 *
 * Usage:
 * <script src="./js/config/firebase-config-compat.js"></script>
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

// Global window function for compat SDK
window.getFirebaseConfig = function() {
    return { ...FIREBASE_CONFIG };
};
