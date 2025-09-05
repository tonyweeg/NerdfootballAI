// Firebase Cloud Messaging Integration
// This module handles FCM setup, token management, and foreground notifications

class FCMManager {
    constructor() {
        this.messaging = null;
        this.currentToken = null;
        this.vapidKey = 'BDZpKfQuommUrNF2w2pt_0TwpmUJU_J6ynLEOa10r_pqzcioqxKjOduP-UFxxtBh4OHzf11poHZOuyqJyHKozuY';
        this.initialized = false;
    }

    // Initialize FCM
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Check if FCM is supported
            if (!('serviceWorker' in navigator) || !('Notification' in window)) {
                console.warn('FCM not supported in this browser');
                return false;
            }

            // Import Firebase messaging
            const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js');
            
            this.messaging = getMessaging(window.firebaseApp);
            this.initialized = true;
            
            // Listen for foreground messages
            onMessage(this.messaging, (payload) => {
                this.handleForegroundMessage(payload);
            });
            
            console.log('FCM initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing FCM:', error);
            return false;
        }
    }

    // Request notification permission and get token
    async requestPermissionAndGetToken() {
        if (!this.initialized) {
            const initSuccess = await this.initialize();
            if (!initSuccess) return null;
        }

        try {
            // Request permission
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                
                // Get registration token
                const { getToken } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js');
                const token = await getToken(this.messaging, { 
                    vapidKey: this.vapidKey 
                });
                
                if (token) {
                    console.log('Registration token obtained:', token);
                    this.currentToken = token;
                    await this.saveTokenToFirestore(token);
                    return token;
                } else {
                    console.log('No registration token available.');
                }
            } else {
                console.log('Unable to get permission to notify.');
            }
        } catch (err) {
            console.log('An error occurred while retrieving token. ', err);
        }
        
        return null;
    }

    // Save FCM token to Firestore for the current user
    async saveTokenToFirestore(token) {
        const user = window.auth?.currentUser;
        if (!user) {
            console.log('No authenticated user to save token for');
            return;
        }

        try {
            const { doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            const tokenDoc = doc(window.db, `users/${user.uid}/fcm_tokens/${token}`);
            await setDoc(tokenDoc, {
                token: token,
                created: new Date(),
                lastUsed: new Date(),
                platform: 'web',
                userAgent: navigator.userAgent
            });
            
            // Also initialize notification preferences if they don't exist
            const prefsDoc = doc(window.db, `users/${user.uid}/notification_settings/preferences`);
            const prefsSnapshot = await getDoc(prefsDoc);
            
            if (!prefsSnapshot.exists()) {
                await setDoc(prefsDoc, {
                    systemMessages: true,
                    pickConfirmations: true,
                    gameResults: false,
                    weeklyReminders: true,
                    enabled: true,
                    updatedAt: new Date()
                });
                console.log('Default notification preferences created');
            }
            
            // Subscribe to default topic
            await this.subscribeToTopic([token], 'all-users');
            
            console.log('FCM token saved to Firestore');
        } catch (error) {
            console.error('Error saving FCM token:', error);
        }
    }
    
    // Subscribe user to FCM topics
    async subscribeToTopic(tokens, topic) {
        try {
            const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js');
            const functions = getFunctions(window.firebaseApp, 'us-central1');
            const subscribeToFCMTopic = httpsCallable(functions, 'subscribeToFCMTopic');
            
            const result = await subscribeToFCMTopic({
                tokens: tokens,
                topic: topic
            });
            
            console.log(`Subscribed to topic ${topic}:`, result.data);
            return result.data;
        } catch (error) {
            console.error('Error subscribing to topic:', error);
            return null;
        }
    }

    // Get user's notification preferences
    async getNotificationPreferences() {
        const user = window.auth?.currentUser;
        if (!user) return null;

        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            const prefsDoc = doc(window.db, `users/${user.uid}/notification_settings/preferences`);
            const snapshot = await getDoc(prefsDoc);
            
            return snapshot.exists() ? snapshot.data() : null;
        } catch (error) {
            console.error('Error getting notification preferences:', error);
            return null;
        }
    }

    // Update notification preferences
    async updateNotificationPreferences(preferences) {
        const user = window.auth?.currentUser;
        if (!user) return false;

        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            const prefsDoc = doc(window.db, `users/${user.uid}/notification_settings/preferences`);
            
            await setDoc(prefsDoc, {
                ...preferences,
                updatedAt: new Date()
            }, { merge: true });
            
            console.log('Notification preferences updated');
            return true;
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            return false;
        }
    }

    // Show notification settings modal
    async showNotificationSettings() {
        const preferences = await this.getNotificationPreferences();
        if (!preferences) return;

        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fcm-settings-modal';
            modal.innerHTML = `
                <div class="fcm-settings-content">
                    <h3>🔔 Notification Settings</h3>
                    <p>Choose which notifications you'd like to receive:</p>
                    
                    <div class="fcm-settings-options">
                        <label class="fcm-setting-item">
                            <input type="checkbox" id="system-messages" ${preferences.systemMessages ? 'checked' : ''}>
                            <span>📢 System Announcements</span>
                            <small>Important updates from admins</small>
                        </label>
                        
                        <label class="fcm-setting-item">
                            <input type="checkbox" id="pick-confirmations" ${preferences.pickConfirmations ? 'checked' : ''}>
                            <span>✅ Pick Confirmations</span>
                            <small>Confirmation when your picks are saved</small>
                        </label>
                        
                        <label class="fcm-setting-item">
                            <input type="checkbox" id="game-results" ${preferences.gameResults ? 'checked' : ''}>
                            <span>🏈 Game Results</span>
                            <small>Notifications when games finish</small>
                        </label>
                        
                        <label class="fcm-setting-item">
                            <input type="checkbox" id="weekly-reminders" ${preferences.weeklyReminders ? 'checked' : ''}>
                            <span>⏰ Weekly Reminders</span>
                            <small>Don't forget to make your picks</small>
                        </label>
                    </div>
                    
                    <div class="fcm-settings-buttons">
                        <button class="fcm-btn fcm-btn-primary" data-action="save">Save Settings</button>
                        <button class="fcm-btn fcm-btn-secondary" data-action="cancel">Cancel</button>
                    </div>
                </div>
            `;
            
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
            `;
            
            // Add modal styles
            const modalStyles = document.createElement('style');
            modalStyles.textContent = `
                .fcm-settings-content {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                }
                .fcm-settings-content h3 {
                    margin: 0 0 16px 0;
                    color: #333;
                }
                .fcm-settings-content p {
                    margin: 0 0 20px 0;
                    color: #666;
                    line-height: 1.5;
                }
                .fcm-settings-options {
                    margin-bottom: 24px;
                }
                .fcm-setting-item {
                    display: block;
                    padding: 12px 0;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                }
                .fcm-setting-item:last-child {
                    border-bottom: none;
                }
                .fcm-setting-item input[type="checkbox"] {
                    margin-right: 12px;
                }
                .fcm-setting-item span {
                    font-weight: 500;
                    color: #333;
                    display: block;
                    margin-bottom: 4px;
                }
                .fcm-setting-item small {
                    color: #666;
                    font-size: 12px;
                    margin-left: 24px;
                }
                .fcm-settings-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }
            `;
            
            document.head.appendChild(modalStyles);
            document.body.appendChild(modal);
            
            // Handle button clicks
            modal.addEventListener('click', async (e) => {
                const action = e.target.dataset.action;
                if (action === 'save') {
                    const newPreferences = {
                        systemMessages: document.getElementById('system-messages').checked,
                        pickConfirmations: document.getElementById('pick-confirmations').checked,
                        gameResults: document.getElementById('game-results').checked,
                        weeklyReminders: document.getElementById('weekly-reminders').checked,
                        enabled: true
                    };
                    
                    await this.updateNotificationPreferences(newPreferences);
                    modal.remove();
                    modalStyles.remove();
                    resolve(newPreferences);
                } else if (action === 'cancel') {
                    modal.remove();
                    modalStyles.remove();
                    resolve(null);
                }
            });
        });
    }

    // Handle messages received when app is in foreground
    handleForegroundMessage(payload) {
        console.log('Message received in foreground: ', payload);
        
        // Create custom notification display
        this.showInAppNotification(payload);
        
        // Also show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification(payload.notification?.title || 'NerdFootball', {
                body: payload.notification?.body || 'New notification',
                icon: '/favicon.ico',
                tag: payload.data?.type || 'general',
                requireInteraction: payload.data?.priority === 'high'
            });
        }
    }

    // Show custom in-app notification
    showInAppNotification(payload) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'fcm-notification';
        notification.innerHTML = `
            <div class="fcm-notification-content">
                <div class="fcm-notification-title">${payload.notification?.title || 'Notification'}</div>
                <div class="fcm-notification-body">${payload.notification?.body || ''}</div>
                <button class="fcm-notification-close" onclick="this.closest('.fcm-notification').remove()">×</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Add animation styles if not already present
        if (!document.querySelector('#fcm-styles')) {
            const styles = document.createElement('style');
            styles.id = 'fcm-styles';
            styles.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .fcm-notification-content {
                    position: relative;
                }
                .fcm-notification-title {
                    font-weight: bold;
                    margin-bottom: 4px;
                    color: #333;
                }
                .fcm-notification-body {
                    color: #666;
                    font-size: 14px;
                    line-height: 1.4;
                }
                .fcm-notification-close {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #f0f0f0;
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    font-size: 16px;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .fcm-notification-close:hover {
                    background: #e0e0e0;
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInRight 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Check if user has granted notification permission
    hasPermission() {
        return Notification.permission === 'granted';
    }

    // Get current token
    getCurrentToken() {
        return this.currentToken;
    }

    // Smart permission request - only ask at appropriate times
    async smartPermissionRequest(context = 'general') {
        // Don't ask if already granted or denied
        if (Notification.permission !== 'default') {
            if (Notification.permission === 'granted' && !this.currentToken) {
                // Permission granted but no token yet
                return await this.requestPermissionAndGetToken();
            }
            return this.currentToken;
        }

        // Show contextual prompt before requesting permission
        const shouldRequest = await this.showPermissionPrompt(context);
        if (shouldRequest) {
            return await this.requestPermissionAndGetToken();
        }
        
        return null;
    }

    // Show custom permission prompt
    async showPermissionPrompt(context) {
        return new Promise((resolve) => {
            const promptMessages = {
                'pick-submit': 'Get instant confirmation when your picks are saved!',
                'game-results': 'Be the first to know when game results are available!',
                'admin-message': 'Stay updated with important announcements from the admin!',
                'general': 'Enable notifications for picks, results, and announcements!'
            };
            
            const message = promptMessages[context] || promptMessages['general'];
            
            // Create custom prompt
            const prompt = document.createElement('div');
            prompt.className = 'fcm-permission-prompt';
            prompt.innerHTML = `
                <div class="fcm-permission-content">
                    <h3>🔔 Stay in the Loop!</h3>
                    <p>${message}</p>
                    <div class="fcm-permission-buttons">
                        <button class="fcm-btn fcm-btn-primary" data-action="allow">Enable Notifications</button>
                        <button class="fcm-btn fcm-btn-secondary" data-action="deny">Maybe Later</button>
                    </div>
                </div>
            `;
            
            prompt.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            `;
            
            // Add prompt styles
            const promptStyles = document.createElement('style');
            promptStyles.textContent = `
                .fcm-permission-content {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                }
                .fcm-permission-content h3 {
                    margin: 0 0 16px 0;
                    color: #333;
                }
                .fcm-permission-content p {
                    margin: 0 0 20px 0;
                    color: #666;
                    line-height: 1.5;
                }
                .fcm-permission-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .fcm-btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .fcm-btn-primary {
                    background: #4F46E5;
                    color: white;
                }
                .fcm-btn-primary:hover {
                    background: #4338CA;
                }
                .fcm-btn-secondary {
                    background: #F3F4F6;
                    color: #374151;
                }
                .fcm-btn-secondary:hover {
                    background: #E5E7EB;
                }
            `;
            
            document.head.appendChild(promptStyles);
            document.body.appendChild(prompt);
            
            // Handle button clicks
            prompt.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action) {
                    prompt.remove();
                    promptStyles.remove();
                    resolve(action === 'allow');
                }
            });
        });
    }
}

// Create global FCM manager instance
window.fcmManager = new FCMManager();

// Add notification settings button to page when authenticated user detected
function addNotificationSettingsButton() {
    // Only add once
    if (document.querySelector('.fcm-settings-btn')) return;
    
    // Wait for auth to be available
    if (!window.auth?.currentUser) {
        setTimeout(addNotificationSettingsButton, 1000);
        return;
    }
    
    // Create settings button
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'fcm-settings-btn';
    settingsBtn.innerHTML = '🔔 Notification Settings';
    settingsBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4F46E5;
        color: white;
        border: none;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        z-index: 1000;
        transition: all 0.2s;
    `;
    
    settingsBtn.onmouseover = () => {
        settingsBtn.style.background = '#4338CA';
        settingsBtn.style.transform = 'translateY(-2px)';
    };
    
    settingsBtn.onmouseout = () => {
        settingsBtn.style.background = '#4F46E5';
        settingsBtn.style.transform = 'translateY(0)';
    };
    
    settingsBtn.onclick = () => {
        window.fcmManager.showNotificationSettings();
    };
    
    document.body.appendChild(settingsBtn);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.fcmManager.initialize();
        addNotificationSettingsButton();
    });
} else {
    window.fcmManager.initialize();
    addNotificationSettingsButton();
}