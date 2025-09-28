/**
 * PHAROAH'S REALTIME MANAGER - Diamond Level WebSocket Integration
 * Seamlessly integrates proven WebSocket architecture into main NerdFootball site
 * Enterprise-grade real-time capabilities with bulletproof fallback mechanisms
 */

class RealTimeManager {
    constructor() {
        this.isEnabled = true;
        this.connectionState = 'disconnected';
        this.metrics = {
            rtdbLatency: [],
            connectionUptime: 0,
            totalUpdates: 0,
            startTime: Date.now(),
            lastUpdate: null
        };
        
        // Connection management
        this.rtdbListeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 2000;
        this.heartbeatInterval = null;
        
        // UI Elements cache
        this.uiElements = {
            connectionIndicator: null,
            leaderboardContainer: null,
            picksContainer: null,
            gameScoresContainer: null
        };
        
        // Real-time data cache
        this.liveData = {
            leaderboard: null,
            gameScores: new Map(),
            userPicks: new Map(),
            lastLeaderboardUpdate: 0,
            lastScoresUpdate: 0
        };
        
        // Feature flags
        this.features = {
            liveLeaderboard: true,
            liveScores: true,
            instantPickFeedback: true,
            connectionStatus: true
        };
        
        this.initialize();
    }

    async initialize() {
        console.log('[RealTime] Initializing Diamond Level WebSocket integration...');
        
        try {
            // Cache UI elements
            this.cacheUIElements();
            
            // Add connection status indicator
            this.addConnectionStatusIndicator();
            
            // Initialize Firebase RTDB connection
            await this.initializeFirebaseRTDB();
            
            // Start connection monitoring
            this.startConnectionMonitoring();
            
            // Set up real-time features
            this.setupRealTimeFeatures();
            
            console.log('[RealTime] Real-time system initialized successfully');
            this.updateConnectionState('connected');
            
        } catch (error) {
            console.error('[RealTime] Initialization failed:', error);
            this.handleConnectionError(error);
        }
    }

    cacheUIElements() {
        // Cache frequently accessed DOM elements
        this.uiElements.leaderboardContainer = document.getElementById('leaderboard-body') || 
                                              document.querySelector('#picks-summary-content .space-y-4') ||
                                              document.querySelector('[data-realtime="leaderboard"]');
        
        this.uiElements.picksContainer = document.getElementById('picks-content') ||
                                        document.querySelector('#picks-summary-content') ||
                                        document.querySelector('[data-realtime="picks"]');
        
        this.uiElements.gameScoresContainer = document.querySelector('[data-realtime="scores"]') ||
                                             document.querySelector('.game-scores');
        
        console.log('[RealTime] UI elements cached', {
            leaderboard: !!this.uiElements.leaderboardContainer,
            picks: !!this.uiElements.picksContainer,
            scores: !!this.uiElements.gameScoresContainer
        });
    }

    addConnectionStatusIndicator() {
        if (!this.features.connectionStatus) return;
        
        // Find suitable location for connection indicator
        const header = document.querySelector('header') || document.querySelector('.bg-slate-800');
        if (!header) return;
        
        // Create subtle connection indicator
        const indicator = document.createElement('div');
        indicator.id = 'realtime-connection-status';
        indicator.className = 'fixed top-4 right-4 z-50 flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border text-xs';
        indicator.innerHTML = `
            <div id="connection-dot" class="w-2 h-2 rounded-full bg-gray-400 transition-colors duration-300"></div>
            <span id="connection-text" class="text-gray-600">Initializing...</span>
        `;
        
        document.body.appendChild(indicator);
        this.uiElements.connectionIndicator = indicator;
        
        console.log('[RealTime] Connection status indicator added');
    }

    async initializeFirebaseRTDB() {
        if (!window.rtdb) {
            throw new Error('Firebase RTDB not initialized');
        }

        const startTime = performance.now();
        
        // Test connection with lightweight operation
        const testRef = window.dbRef(window.rtdb, 'realtime/connection-test');
        await window.set(testRef, {
            timestamp: window.serverTimestamp(),
            clientId: this.generateClientId(),
            userAgent: navigator.userAgent.substring(0, 50)
        });
        
        const latency = performance.now() - startTime;
        this.metrics.rtdbLatency.push(latency);
        
        console.log(`[RealTime] Firebase RTDB connected in ${Math.round(latency)}ms`);
        return latency;
    }

    setupRealTimeFeatures() {
        // Set up real-time leaderboard updates
        if (this.features.liveLeaderboard) {
            this.setupLeaderboardUpdates();
        }
        
        // Set up real-time game score updates
        if (this.features.liveScores) {
            this.setupGameScoreUpdates();
        }
        
        // Set up instant pick confirmation
        if (this.features.instantPickFeedback) {
            this.setupInstantPickFeedback();
        }
    }

    setupLeaderboardUpdates() {
        const poolId = window.currentPoolId || 'nerduniverse-2025';
        const leaderboardRef = window.dbRef(window.rtdb, `pools/${poolId}/leaderboard/live`);
        
        const unsubscribe = window.onValue(leaderboardRef, (snapshot) => {
            const startTime = performance.now();
            
            if (snapshot.exists()) {
                const leaderboardData = snapshot.val();
                this.handleLeaderboardUpdate(leaderboardData);
                
                const latency = performance.now() - startTime;
                this.metrics.rtdbLatency.push(latency);
                this.metrics.totalUpdates++;
                this.liveData.lastLeaderboardUpdate = Date.now();
                
                console.log(`[RealTime] Leaderboard updated in ${Math.round(latency)}ms`);
            } else {
                console.log('[RealTime] No live leaderboard data found');
            }
        }, (error) => {
            console.error('[RealTime] Leaderboard listener error:', error);
            this.handleConnectionError(error);
        });
        
        this.rtdbListeners.set('leaderboard', unsubscribe);
        console.log('[RealTime] Leaderboard real-time updates enabled');
    }

    setupGameScoreUpdates() {
        const currentWeek = window.getCurrentWeek ? window.getCurrentWeek() : 1;
        const scoresRef = window.dbRef(window.rtdb, `nfl/games/2025/week-${currentWeek}/live`);
        
        const unsubscribe = window.onValue(scoresRef, (snapshot) => {
            if (snapshot.exists()) {
                const gameScores = snapshot.val();
                this.handleGameScoresUpdate(gameScores);
                this.metrics.totalUpdates++;
                this.liveData.lastScoresUpdate = Date.now();
                
                console.log('[RealTime] Game scores updated via real-time');
            }
        }, (error) => {
            console.error('[RealTime] Game scores listener error:', error);
        });
        
        this.rtdbListeners.set('gameScores', unsubscribe);
        console.log('[RealTime] Game scores real-time updates enabled');
    }

    setupInstantPickFeedback() {
        // Monitor pick submissions for instant feedback
        if (window.currentUser && window.currentUser.uid) {
            const userPicksRef = window.dbRef(window.rtdb, `users/${window.currentUser.uid}/picks/live`);
            
            const unsubscribe = window.onValue(userPicksRef, (snapshot) => {
                if (snapshot.exists()) {
                    const pickData = snapshot.val();
                    this.handlePickConfirmation(pickData);
                    console.log('[RealTime] Pick confirmation received');
                }
            });
            
            this.rtdbListeners.set('userPicks', unsubscribe);
            console.log('[RealTime] Instant pick feedback enabled');
        }
    }

    handleLeaderboardUpdate(leaderboardData) {
        if (!this.uiElements.leaderboardContainer) return;
        
        try {
            // Cache the data
            this.liveData.leaderboard = leaderboardData;
            
            // Update existing leaderboard if visible
            this.updateLeaderboardDisplay(leaderboardData);
            
            // Show update indicator
            this.showUpdateIndicator('leaderboard');
            
        } catch (error) {
            console.error('[RealTime] Leaderboard update failed:', error);
        }
    }

    updateLeaderboardDisplay(leaderboardData) {
        const container = this.uiElements.leaderboardContainer;
        if (!container || !leaderboardData) return;
        
        // Check if this is the picks summary leaderboard
        const isPicksSummary = container.closest('#picks-summary-content');
        
        if (isPicksSummary) {
            // Update picks summary leaderboard format
            this.updatePicksSummaryLeaderboard(leaderboardData, container);
        } else {
            // Update main leaderboard format
            this.updateMainLeaderboard(leaderboardData, container);
        }
    }

    updatePicksSummaryLeaderboard(leaderboardData, container) {
        // Convert leaderboard data to array and sort
        const sortedUsers = Object.entries(leaderboardData)
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
            .slice(0, 10); // Top 10 for picks summary
        
        // Find the leaderboard section within picks summary
        const leaderboardSection = container.querySelector('.space-y-4') || container;
        
        // Update existing leaderboard items
        const existingItems = leaderboardSection.querySelectorAll('.flex.justify-between');
        
        sortedUsers.forEach((user, index) => {
            if (existingItems[index]) {
                const nameElement = existingItems[index].querySelector('.font-medium');
                const scoreElement = existingItems[index].querySelector('.text-right .font-bold');
                
                if (nameElement) nameElement.textContent = user.displayName || `User ${user.userId.substring(0, 8)}`;
                if (scoreElement) scoreElement.textContent = `${user.totalScore || 0} pts`;
            }
        });
    }

    updateMainLeaderboard(leaderboardData, container) {
        // Update main leaderboard table format
        const tbody = container.tagName === 'TBODY' ? container : container.querySelector('tbody');
        if (!tbody) return;
        
        const sortedUsers = Object.entries(leaderboardData)
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        
        // Update existing table rows
        const rows = tbody.querySelectorAll('tr');
        
        sortedUsers.forEach((user, index) => {
            if (rows[index]) {
                const cells = rows[index].querySelectorAll('td');
                if (cells.length >= 3) {
                    cells[0].textContent = index + 1; // Rank
                    cells[1].textContent = user.displayName || `User ${user.userId.substring(0, 8)}`;
                    cells[2].textContent = user.totalScore || 0;
                }
            }
        });
    }

    handleGameScoresUpdate(gameScores) {
        try {
            // Cache the scores data
            Object.entries(gameScores).forEach(([gameId, gameData]) => {
                this.liveData.gameScores.set(gameId, gameData);
            });
            
            // Update any visible game score displays
            this.updateGameScoresDisplay(gameScores);
            
            // Show update indicator
            this.showUpdateIndicator('scores');
            
        } catch (error) {
            console.error('[RealTime] Game scores update failed:', error);
        }
    }

    updateGameScoresDisplay(gameScores) {
        // Update game scores in picks display or scores section
        const gameElements = document.querySelectorAll('[data-game-id]');
        
        Object.entries(gameScores).forEach(([gameId, gameData]) => {
            const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
            if (gameElement && gameData) {
                this.updateGameElement(gameElement, gameData);
            }
        });
    }

    updateGameElement(element, gameData) {
        // Update individual game display with live data
        const homeScoreElement = element.querySelector('.home-score, [data-home-score]');
        const awayScoreElement = element.querySelector('.away-score, [data-away-score]');
        const statusElement = element.querySelector('.game-status, [data-game-status]');
        
        if (homeScoreElement && gameData.homeScore !== undefined) {
            homeScoreElement.textContent = gameData.homeScore;
        }
        
        if (awayScoreElement && gameData.awayScore !== undefined) {
            awayScoreElement.textContent = gameData.awayScore;
        }
        
        if (statusElement && gameData.status) {
            statusElement.textContent = gameData.status;
        }
    }

    handlePickConfirmation(pickData) {
        // Show instant confirmation for pick submissions
        this.showPickConfirmationFeedback(pickData);
    }

    showPickConfirmationFeedback(pickData) {
        // Create or update pick confirmation indicator
        const existingIndicator = document.getElementById('pick-confirmation-indicator');
        
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.id = 'pick-confirmation-indicator';
        indicator.className = 'fixed bottom-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce';
        indicator.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <span class="text-green-500 text-xs">✓</span>
                </div>
                <span>Pick confirmed!</span>
            </div>
        `;
        
        document.body.appendChild(indicator);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 3000);
    }

    showUpdateIndicator(type) {
        // Create subtle update indicator
        const indicator = document.getElementById('realtime-update-indicator') || this.createUpdateIndicator();
        
        // Update indicator text based on type
        const text = indicator.querySelector('.update-text');
        if (text) {
            const messages = {
                'leaderboard': 'Leaderboard updated',
                'scores': 'Scores updated',
                'picks': 'Picks updated'
            };
            text.textContent = messages[type] || 'Data updated';
        }
        
        // Show and auto-hide
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }

    createUpdateIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'realtime-update-indicator';
        indicator.className = 'fixed bottom-4 left-4 z-40 bg-blue-500 text-white px-3 py-1.5 rounded-lg shadow-sm text-sm opacity-0 transition-all duration-300 transform translate-y-2';
        indicator.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span class="update-text">Data updated</span>
            </div>
        `;
        
        // Add show class styles
        const style = document.createElement('style');
        style.textContent = `
            #realtime-update-indicator.show {
                opacity: 1 !important;
                transform: translateY(0) !important;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(indicator);
        return indicator;
    }

    startConnectionMonitoring() {
        // Heartbeat to monitor connection health
        this.heartbeatInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000); // Check every 30 seconds
        
        console.log('[RealTime] Connection monitoring started');
    }

    async performHealthCheck() {
        try {
            const startTime = performance.now();
            const testRef = window.dbRef(window.rtdb, 'realtime/heartbeat');
            
            await window.set(testRef, {
                timestamp: window.serverTimestamp(),
                clientId: this.clientId
            });
            
            const latency = performance.now() - startTime;
            this.metrics.rtdbLatency.push(latency);
            
            // Keep only last 100 latency measurements
            if (this.metrics.rtdbLatency.length > 100) {
                this.metrics.rtdbLatency.shift();
            }
            
            this.updateConnectionState('connected', Math.round(latency));
            
        } catch (error) {
            console.error('[RealTime] Health check failed:', error);
            this.handleConnectionError(error);
        }
    }

    updateConnectionState(state, latency = null) {
        this.connectionState = state;
        
        // Update connection indicator UI
        const indicator = this.uiElements.connectionIndicator;
        if (!indicator) return;
        
        const dot = indicator.querySelector('#connection-dot');
        const text = indicator.querySelector('#connection-text');
        
        const stateConfig = {
            'connecting': { color: 'bg-yellow-400', text: 'Connecting...', pulse: true },
            'connected': { color: 'bg-green-500', text: latency ? `Live (${latency}ms)` : 'Live', pulse: false },
            'disconnected': { color: 'bg-gray-400', text: 'Offline', pulse: false },
            'error': { color: 'bg-red-500', text: 'Connection error', pulse: true }
        };
        
        const config = stateConfig[state] || stateConfig.disconnected;
        
        if (dot) {
            dot.className = `w-2 h-2 rounded-full transition-colors duration-300 ${config.color}`;
            if (config.pulse) {
                dot.classList.add('animate-pulse');
            } else {
                dot.classList.remove('animate-pulse');
            }
        }
        
        if (text) {
            text.textContent = config.text;
        }
    }

    handleConnectionError(error) {
        console.error('[RealTime] Connection error:', error);
        this.updateConnectionState('error');
        
        // Attempt reconnection if not already trying
        if (this.connectionState !== 'connecting' && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnection();
        }
    }

    async attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('[RealTime] Max reconnection attempts reached, falling back to polling');
            this.fallbackToPolling();
            return;
        }
        
        this.reconnectAttempts++;
        this.updateConnectionState('connecting');
        
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`[RealTime] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(async () => {
            try {
                await this.initializeFirebaseRTDB();
                this.reconnectAttempts = 0;
                this.updateConnectionState('connected');
                console.log('[RealTime] Reconnection successful');
            } catch (error) {
                console.error('[RealTime] Reconnection failed:', error);
                this.attemptReconnection();
            }
        }, delay);
    }

    fallbackToPolling() {
        console.log('[RealTime] Falling back to polling mode');
        this.updateConnectionState('disconnected');
        
        // Could trigger existing polling mechanisms here
        // For now, just log that we're in fallback mode
        if (window.refreshLeaderboard) {
            console.log('[RealTime] Using existing polling for leaderboard updates');
            setInterval(() => {
                window.refreshLeaderboard();
            }, 60000); // Poll every minute as fallback
        }
    }

    generateClientId() {
        if (!this.clientId) {
            this.clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return this.clientId;
    }

    getMetrics() {
        const avgLatency = this.metrics.rtdbLatency.length > 0 
            ? Math.round(this.metrics.rtdbLatency.reduce((a, b) => a + b, 0) / this.metrics.rtdbLatency.length)
            : 0;
        
        const uptime = Math.round((Date.now() - this.metrics.startTime) / 1000);
        
        return {
            connectionState: this.connectionState,
            averageLatency: avgLatency,
            totalUpdates: this.metrics.totalUpdates,
            uptime: uptime,
            lastLeaderboardUpdate: this.liveData.lastLeaderboardUpdate,
            lastScoresUpdate: this.liveData.lastScoresUpdate
        };
    }

    // Public API for manual triggers
    async refreshLeaderboard() {
        if (this.connectionState === 'connected') {
            // Real-time data should already be up to date
            console.log('[RealTime] Leaderboard is already live');
            return;
        } else {
            // Fallback to manual refresh
            console.log('[RealTime] Manual leaderboard refresh requested');
            if (window.refreshLeaderboard) {
                return window.refreshLeaderboard();
            }
        }
    }

    async refreshScores() {
        if (this.connectionState === 'connected') {
            console.log('[RealTime] Scores are already live');
            return;
        } else {
            console.log('[RealTime] Manual scores refresh requested');
            if (window.refreshGameScores) {
                return window.refreshGameScores();
            }
        }
    }

    // Cleanup
    destroy() {
        console.log('[RealTime] Destroying real-time manager...');
        
        // Clear intervals
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        // Unsubscribe from all RTDB listeners
        this.rtdbListeners.forEach((unsubscribe, key) => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
                console.log(`[RealTime] Unsubscribed from ${key} listener`);
            }
        });
        
        // Remove UI elements
        const indicator = document.getElementById('realtime-connection-status');
        if (indicator) {
            indicator.remove();
        }
        
        const updateIndicator = document.getElementById('realtime-update-indicator');
        if (updateIndicator) {
            updateIndicator.remove();
        }
        
        console.log('[RealTime] Real-time manager destroyed');
    }
}

// Export for global access
window.RealTimeManager = RealTimeManager;

// Auto-initialize when DOM is ready and Firebase is available
let initializationAttempts = 0;
const maxInitAttempts = 10;

function tryInitialize() {
    if (window.rtdb && window.dbRef && window.onValue && window.set) {
        // Firebase RTDB is ready, initialize real-time manager
        window.realTimeManager = new RealTimeManager();
        console.log('[RealTime] Auto-initialized successfully');
    } else if (initializationAttempts < maxInitAttempts) {
        initializationAttempts++;
        console.log(`[RealTime] Waiting for Firebase RTDB... (${initializationAttempts}/${maxInitAttempts})`);
        setTimeout(tryInitialize, 1000);
    } else {
        console.warn('[RealTime] Failed to initialize - Firebase RTDB not available');
    }
}

// Start initialization process
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInitialize);
} else {
    tryInitialize();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.realTimeManager) {
        window.realTimeManager.destroy();
    }
});