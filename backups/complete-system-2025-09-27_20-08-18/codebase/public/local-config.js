// Local Firebase Emulator Configuration
// This file configures Firebase to use local emulators for testing

(function() {
    'use strict';
    
    // Check if we're in local development mode
    const isLocalDevelopment = () => {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.FIREBASE_CONFIG?.useEmulator === true;
    };
    
    // Configure Firebase for emulator use
    const configureEmulators = () => {
        if (!isLocalDevelopment()) {
            console.log('🌐 Production mode - using live Firebase services');
            return;
        }
        
        console.log('🧪 Local development mode - configuring emulators');
        
        // Wait for Firebase to be available
        const waitForFirebase = (callback) => {
            if (window.firebase && window.db && window.auth) {
                callback();
            } else {
                setTimeout(() => waitForFirebase(callback), 100);
            }
        };
        
        waitForFirebase(() => {
            try {
                // Set global flag to indicate emulator mode for Firebase init
                window.USE_FIREBASE_EMULATORS = true;
                
                console.log('✅ Emulator configuration set for initialization');
                
                // Add emulator indicator to UI
                addEmulatorIndicator();
                
            } catch (error) {
                console.error('❌ Error configuring emulators:', error);
                // Continue with production config if emulator setup fails
            }
        });
    };
    
    // Add visual indicator that we're using emulators
    const addEmulatorIndicator = () => {
        const indicator = document.createElement('div');
        indicator.id = 'emulator-indicator';
        indicator.innerHTML = '🧪 LOCAL TESTING MODE';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #ff9800;
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(indicator);
    };
    
    // Override fetch for local API calls if needed
    const setupLocalAPIOverrides = () => {
        if (!isLocalDevelopment()) return;
        
        // Store original fetch
        const originalFetch = window.fetch;
        
        window.fetch = function(url, options) {
            // Modify URLs for local development if needed
            if (typeof url === 'string' && url.includes('firebase')) {
                console.log('🔗 API call (local):', url);
            }
            
            return originalFetch.apply(this, arguments);
        };
    };
    
    // Initialize emulator configuration when DOM is ready
    const initializeLocalConfig = () => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', configureEmulators);
        } else {
            configureEmulators();
        }
        
        setupLocalAPIOverrides();
    };
    
    // Export for use by other scripts
    window.localConfig = {
        isLocalDevelopment,
        configureEmulators,
        addEmulatorIndicator
    };
    
    // Auto-initialize
    initializeLocalConfig();
    
})();

// Local testing utilities
window.testUtils = {
    // Reset emulator data
    resetData: () => {
        if (window.localConfig.isLocalDevelopment()) {
            console.log('🔄 Resetting local test data...');
            // This would trigger a reset via the local scripts
            alert('Use: node local-data-import.js reset');
        }
    },
    
    // Switch feature flags
    toggleFeature: (flagName) => {
        if (window.localConfig.isLocalDevelopment()) {
            console.log(`🚩 Toggle feature: ${flagName}`);
            alert(`Use: node local-feature-flags.js enable/disable ${flagName}`);
        }
    },
    
    // Get current environment info
    getEnvInfo: () => {
        return {
            isLocal: window.localConfig.isLocalDevelopment(),
            hostname: window.location.hostname,
            port: window.location.port,
            emulatorUI: 'http://localhost:4000',
            testUsers: [
                'tony@test.com (multi-entry + admin)',
                'mike@test.com (single entry)',
                'sarah@test.com (standard user)'
            ]
        };
    }
};