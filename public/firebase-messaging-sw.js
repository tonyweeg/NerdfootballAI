// Service Worker for Firebase Cloud Messaging
// This handles background notifications when the app is closed

importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw",
    authDomain: "nerdfootball.firebaseapp.com",
    projectId: "nerdfootball",
    storageBucket: "nerdfootball.appspot.com",
    messagingSenderId: "969304790725",
    appId: "1:969304790725:web:892df38db0b0e62bde02ac",
    measurementId: "G-8RVRHE3HRC"
});

const messaging = firebase.messaging();

// Handle background messages when app is closed/minimized
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    // Extract notification data
    const notificationTitle = payload.notification?.title || 'NerdFootball Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.data?.type || 'general',
        data: {
            click_action: payload.data?.click_action || '/',
            ...payload.data
        },
        requireInteraction: payload.data?.priority === 'high',
        silent: false
    };

    // Show the notification
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received.');

    event.notification.close();

    // Get the click action URL from the notification data
    const clickAction = event.notification.data?.click_action || '/';
    
    // This looks to see if the current window is already open and focuses if it is
    event.waitUntil(
        clients.matchAll({
            type: 'window'
        }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === clickAction && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(clickAction);
            }
        })
    );
});