/**
 * UI Initialization Fix
 * Removes loading screen and shows main app when Firebase is ready
 */

console.log('🖥️ UI Initialization Fix loaded');

// Function to initialize UI
function initializeUI() {
    console.log('🎉 Firebase globals ready! Initializing UI...');
    
    const loadingView = document.getElementById('loading-view');
    const mainApp = document.getElementById('app-view');
    
    console.log('🔍 DOM check - loadingView:', !!loadingView, 'mainApp:', !!mainApp);
    
    if (loadingView) {
        loadingView.style.display = 'none';
        console.log('✅ Loading screen hidden');
    } else {
        console.warn('⚠️ loading-view element not found');
    }
    
    if (mainApp) {
        console.log('🔍 Before fixes - mainApp display:', mainApp.style.display, 'classes:', mainApp.className);
        mainApp.style.display = 'block';
        mainApp.style.visibility = 'visible';
        mainApp.classList.remove('hidden');
        // Force reflow to ensure changes take effect
        mainApp.offsetHeight;
        console.log('🔍 After fixes - display:', mainApp.style.display, 'classes:', mainApp.className, 'computed display:', window.getComputedStyle(mainApp).display);
        console.log('✅ Main app shown');
    } else {
        console.warn('⚠️ app element not found');
        // Try to show any hidden main content
        const mainContent = document.querySelector('#app-view, main, .main-content, [role="main"]');
        if (mainContent) {
            console.log('🔍 Found fallback element:', mainContent.id, 'classes:', mainContent.className);
            mainContent.style.display = 'block';
            mainContent.style.visibility = 'visible';
            mainContent.classList.remove('hidden');
            // Force a reflow to ensure changes take effect
            mainContent.offsetHeight;
            console.log('🔍 After fixes - display:', mainContent.style.display, 'classes:', mainContent.className, 'computed display:', window.getComputedStyle(mainContent).display);
            console.log('✅ Main content shown (fallback)');
        } else {
            console.error('❌ No fallback content found - searched for: #app-view, main, .main-content, [role="main"]');
        }
    }
    
    // Initialize authentication state
    if (window.auth) {
        window.auth.onAuthStateChanged((user) => {
            try {
                if (user) {
                    console.log('👤 User authenticated:', user.displayName || user.email);
                } else {
                    console.log('👤 No user authenticated');
                }
            } catch (error) {
                console.error('❌ Error in auth state change handler:', error);
            }
        });
    }
    
    console.log('🚀 UI initialization complete!');
}

// Listen for Firebase ready event from PHAROAH's architecture
window.addEventListener('firebaseGlobalsReady', function(event) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUI);
    } else {
        initializeUI();
    }
});

// Also try when DOM is ready regardless of Firebase
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 DOM loaded, checking if Firebase is ready...');
    if (window.firebaseReady) {
        initializeUI();
    }
});

// Fallback: show UI after 5 seconds even if Firebase isn't ready
setTimeout(() => {
    const loadingView = document.getElementById('loading-view');
    const mainApp = document.getElementById('app-view');
    
    if (loadingView && loadingView.style.display !== 'none') {
        console.warn('⚠️ Fallback: Showing UI after timeout');
        loadingView.style.display = 'none';
        if (mainApp) {
            console.log('🔍 Timeout fallback - found mainApp:', mainApp.id, 'classes:', mainApp.className);
            mainApp.style.display = 'block';
            mainApp.style.visibility = 'visible';
            mainApp.classList.remove('hidden');
            // Force reflow to ensure changes take effect
            mainApp.offsetHeight;
            console.log('🔍 Timeout fallback - after fixes display:', mainApp.style.display, 'classes:', mainApp.className, 'computed display:', window.getComputedStyle(mainApp).display);
        } else {
            console.error('❌ Timeout fallback - no mainApp found with ID: app-view');
        }
    }
}, 5000);

console.log('🖥️ UI Initialization Fix ready');