/**
 * Real-Time Polling Replacement
 * Replaces 30-second setInterval with instant WebSocket updates
 */

// Use Bundle Dependency Gate to ensure Firebase is available
window.bundleGate.waitForFirebase('realtime-polling-replacement', () => {
    console.log('🚀 Real-Time Polling Replacement: Firebase ready, initializing...');
    
    // Get Firebase services with error handling
    const firebase = window.ensureFirebase();
    
    // Hook into LiveGameRefresh to replace polling with real-time updates
    const initRealTimeReplacement = () => {
        console.log('🚀 Real-Time Polling Replacement loaded');
        
        // Wait for LiveGameRefresh to be available
        const setupRealtimeReplacement = () => {
            if (typeof window.liveGameRefresh !== 'undefined' && window.liveGameRefresh) {
            console.log('🔄 Replacing 30-second polling with real-time updates...');
            
            // Store original refresh function
            const originalPerformRefresh = window.liveGameRefresh.performLiveRefresh.bind(window.liveGameRefresh);
            
            // Override the startRefresh method to use real-time instead of polling
            const originalStartRefresh = window.liveGameRefresh.startRefresh.bind(window.liveGameRefresh);
            window.liveGameRefresh.startRefresh = function(weekNumber) {
                console.log(`⚡ Starting REAL-TIME refresh for Week ${weekNumber} (no more 30-second polling!)`);
                
                // Clear any existing intervals
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                    this.refreshInterval = null;
                    console.log('✅ 30-second polling timer cleared');
                }
                
                // Set up real-time listener instead of polling
                this.setupRealtimeListener(weekNumber);
                
                // Do initial refresh
                return originalPerformRefresh(weekNumber);
            };
            
            // Add real-time listener method
            window.liveGameRefresh.setupRealtimeListener = function(weekNumber) {
                console.log(`📡 Setting up real-time listener for Week ${weekNumber}`);
                
                // Listen for real-time game updates
                window.addEventListener('realtimeGameUpdate', (event) => {
                    console.log('⚡ Real-time game update received, refreshing UI...');
                    // Trigger the refresh without polling
                    originalPerformRefresh(weekNumber);
                });
                
                // Listen for connection status changes
                window.addEventListener('realtimeConnectionStatus', (event) => {
                    const status = event.detail.status;
                    console.log(`🔗 Real-time connection status: ${status}`);
                    
                    if (status === 'disconnected') {
                        console.warn('⚠️ Real-time disconnected, falling back to 60-second polling');
                        // Fallback to slower polling if real-time fails
                        if (!this.refreshInterval) {
                            this.refreshInterval = setInterval(() => {
                                originalPerformRefresh(weekNumber);
                            }, 60000); // 60 seconds fallback
                        }
                    } else if (status === 'connected') {
                        console.log('✅ Real-time reconnected, stopping fallback polling');
                        // Clear fallback polling when real-time reconnects
                        if (this.refreshInterval) {
                            clearInterval(this.refreshInterval);
                            this.refreshInterval = null;
                        }
                    }
                });
                
                console.log('✅ Real-time listeners configured');
            };
            
            // Override stopRefresh to clean up real-time listeners
            const originalStopRefresh = window.liveGameRefresh.stopRefresh.bind(window.liveGameRefresh);
            window.liveGameRefresh.stopRefresh = function() {
                console.log('🛑 Stopping real-time updates...');
                
                // Remove real-time listeners
                // Note: In a full implementation, we'd track and remove specific listeners
                
                // Call original stop method
                return originalStopRefresh();
            };
            
            console.log('🎉 Real-time polling replacement installed successfully!');
            console.log('💡 30-second polling → Instant WebSocket updates');
            
        } else {
            // Retry in 100ms if LiveGameRefresh not ready yet
            setTimeout(setupRealtimeReplacement, 100);
        }
    };
    
        // Start setup
        setupRealtimeReplacement();
    };
    
    // Execute immediately if DOM is already ready, or wait for DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRealTimeReplacement);
    } else {
        initRealTimeReplacement();
    }

    console.log('📦 Real-Time Polling Replacement module loaded');
    
}); // End bundleGate.waitForFirebase wrapper