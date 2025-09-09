/**
 * Debug Bundle Execution
 * Adds detailed logging to identify where bundle execution stops
 */

console.log('🔧 Debug Bundle Execution loaded');

// Override console.log to add timestamps
const originalConsoleLog = console.log;
console.log = function(...args) {
    const timestamp = new Date().toISOString().substr(11, 12);
    originalConsoleLog.apply(console, [`[${timestamp}]`, ...args]);
};

// Monitor bundle execution
if (window.bundleGate) {
    const originalExecute = window.bundleGate.releaseWaitingBundles;
    window.bundleGate.releaseWaitingBundles = function() {
        console.log('🔧 DEBUG: Starting to release waiting bundles');
        console.log('🔧 DEBUG: Bundles waiting:', this.bundlesWaiting.map(b => b.name));
        
        try {
            originalExecute.call(this);
            console.log('🔧 DEBUG: Bundle release completed successfully');
        } catch (error) {
            console.error('🔧 DEBUG: Bundle release failed:', error);
        }
    };
    
    // Monitor individual bundle execution
    const originalWaitForFirebase = window.bundleGate.waitForFirebase;
    window.bundleGate.waitForFirebase = function(bundleName, callback) {
        console.log(`🔧 DEBUG: Bundle ${bundleName} registering`);
        
        const wrappedCallback = function() {
            console.log(`🔧 DEBUG: Bundle ${bundleName} starting execution`);
            try {
                const result = callback.apply(this, arguments);
                console.log(`🔧 DEBUG: Bundle ${bundleName} execution completed`);
                return result;
            } catch (error) {
                console.error(`🔧 DEBUG: Bundle ${bundleName} execution failed:`, error);
                throw error;
            }
        };
        
        return originalWaitForFirebase.call(this, bundleName, wrappedCallback);
    };
}

// Monitor window.ensureFirebase calls
if (window.ensureFirebase) {
    const originalEnsureFirebase = window.ensureFirebase;
    window.ensureFirebase = function() {
        console.log('🔧 DEBUG: ensureFirebase called');
        try {
            const result = originalEnsureFirebase.apply(this, arguments);
            console.log('🔧 DEBUG: ensureFirebase returned:', result);
            return result;
        } catch (error) {
            console.error('🔧 DEBUG: ensureFirebase failed:', error);
            throw error;
        }
    };
}

// Create a utility function to safely handle DOM ready checks
window.onDOMReady = function(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        // DOM is already ready, execute immediately
        setTimeout(callback, 0); // Use setTimeout to avoid blocking the current execution
    }
};

// Override the problematic addEventListener to auto-fix DOMContentLoaded issues
const originalAddEventListener = document.addEventListener;
document.addEventListener = function(event, callback, options) {
    if (event === 'DOMContentLoaded' && document.readyState !== 'loading') {
        console.log('🔧 DEBUG: Intercepted DOMContentLoaded on ready DOM - executing immediately');
        setTimeout(callback, 0);
        return;
    }
    return originalAddEventListener.call(this, event, callback, options);
};

console.log('🔧 Debug Bundle Execution ready - monitoring bundle execution with DOM fix');