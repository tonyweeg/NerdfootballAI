// Firebase AppCheck Configuration - Include this in all Firebase pages
// Usage: Add this after Firebase app initialization

export function initializeFirebaseAppCheck(app) {
    try {
        const { initializeAppCheck, ReCaptchaV3Provider } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js');

        const appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider('6Lds9dMrAAAAAGIL03MqQbJuN99t_ICepTLH4Hww'),
            isTokenAutoRefreshEnabled: true
        });

        console.log('✅ AppCheck initialized successfully');
        return appCheck;
    } catch (error) {
        console.error('❌ AppCheck initialization failed:', error);
        return null;
    }
}

// Quick inline AppCheck setup for existing pages
window.setupAppCheck = async function(app) {
    return await initializeFirebaseAppCheck(app);
};