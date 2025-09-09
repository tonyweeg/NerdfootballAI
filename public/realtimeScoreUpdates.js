// Real-time Score Updates using Firebase Realtime Database
// WebSocket-based instant updates for live games

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js';
import { 
    getDatabase, 
    ref, 
    onValue, 
    off, 
    child,
    get,
    set,
    onDisconnect,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js';

class RealtimeScoreUpdates {
    constructor() {
        this.db = null;
        this.listeners = new Map(); // Track active listeners
        this.connectionRef = null;
        this.isConnected = false;
        this.callbacks = new Set(); // UI update callbacks
        this.lastUpdate = {};
        this.connectionStatusCallbacks = new Set();
        
        console.log('⚡ Realtime Score Updates: Initializing WebSocket system');
    }

    // Initialize Firebase Realtime Database
    async initialize() {
        try {
            // Get Firebase app instance (already initialized in main app)
            const app = window.firebaseApp || initializeApp(window.firebaseConfig);
            this.db = getDatabase(app);
            
            // Monitor connection state
            this.setupConnectionMonitoring();
            
            console.log('✅ Realtime Score Updates: Firebase Realtime Database initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Realtime Database:', error);
            return false;
        }
    }

    // Monitor connection state
    setupConnectionMonitoring() {
        const connectedRef = ref(this.db, '.info/connected');
        
        onValue(connectedRef, (snapshot) => {
            const connected = snapshot.val() === true;
            this.isConnected = connected;
            
            if (connected) {
                console.log('🟢 WebSocket: Connected to Firebase Realtime Database');
                this.notifyConnectionStatus(true);
                
                // Set presence
                const presenceRef = ref(this.db, `presence/${window.currentUser?.uid || 'anonymous'}`);
                set(presenceRef, {
                    online: true,
                    lastSeen: serverTimestamp()
                });
                
                // Remove presence on disconnect
                onDisconnect(presenceRef).set({
                    online: false,
                    lastSeen: serverTimestamp()
                });
            } else {
                console.log('🔴 WebSocket: Disconnected from Firebase Realtime Database');
                this.notifyConnectionStatus(false);
            }
        });
    }

    // Subscribe to live game updates for a specific week
    subscribeToWeek(weekNumber) {
        if (!this.db) {
            console.warn('⚠️ Realtime Database not initialized');
            return false;
        }

        // Unsubscribe from previous week if exists
        if (this.listeners.has(`week_${weekNumber}`)) {
            console.log(`📡 Already subscribed to Week ${weekNumber}`);
            return true;
        }

        const weekRef = ref(this.db, `liveScores/2025/week${weekNumber}`);
        
        const unsubscribe = onValue(weekRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log(`⚡ Real-time update for Week ${weekNumber}:`, data);
                this.handleScoreUpdate(weekNumber, data);
            }
        }, (error) => {
            console.error(`❌ Error subscribing to Week ${weekNumber}:`, error);
        });

        this.listeners.set(`week_${weekNumber}`, { ref: weekRef, unsubscribe });
        console.log(`✅ Subscribed to real-time updates for Week ${weekNumber}`);
        return true;
    }

    // Subscribe to specific game updates
    subscribeToGame(weekNumber, gameId) {
        if (!this.db) {
            console.warn('⚠️ Realtime Database not initialized');
            return false;
        }

        const key = `game_${weekNumber}_${gameId}`;
        if (this.listeners.has(key)) {
            return true;
        }

        const gameRef = ref(this.db, `liveScores/2025/week${weekNumber}/games/${gameId}`);
        
        const unsubscribe = onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log(`⚡ Real-time update for Game ${gameId}:`, data);
                this.handleGameUpdate(weekNumber, gameId, data);
            }
        });

        this.listeners.set(key, { ref: gameRef, unsubscribe });
        console.log(`✅ Subscribed to Game ${gameId} in Week ${weekNumber}`);
        return true;
    }

    // Handle score updates from Firebase
    handleScoreUpdate(weekNumber, data) {
        // Check if data has actually changed
        const updateKey = `week_${weekNumber}`;
        const dataString = JSON.stringify(data);
        
        if (this.lastUpdate[updateKey] === dataString) {
            return; // No actual change
        }
        
        this.lastUpdate[updateKey] = dataString;

        // Parse game updates
        if (data.games) {
            Object.entries(data.games).forEach(([gameId, gameData]) => {
                this.processGameUpdate(weekNumber, gameId, gameData);
            });
        }

        // Notify all registered callbacks
        this.notifyCallbacks({
            type: 'week_update',
            week: weekNumber,
            data: data,
            timestamp: new Date()
        });
    }

    // Handle individual game updates
    handleGameUpdate(weekNumber, gameId, gameData) {
        const updateKey = `game_${weekNumber}_${gameId}`;
        const dataString = JSON.stringify(gameData);
        
        if (this.lastUpdate[updateKey] === dataString) {
            return;
        }
        
        this.lastUpdate[updateKey] = dataString;
        
        this.processGameUpdate(weekNumber, gameId, gameData);
        
        this.notifyCallbacks({
            type: 'game_update',
            week: weekNumber,
            gameId: gameId,
            data: gameData,
            timestamp: new Date()
        });
    }

    // Process and cache game update
    processGameUpdate(weekNumber, gameId, gameData) {
        // Update local cache if available
        if (window.gameStateCache) {
            // Invalidate cache for this game
            window.gameStateCache.invalidateAfterDataUpdate('game_results_updated', weekNumber);
        }

        // Update ESPN API cache if available
        if (window.espnApi && window.espnApi.updateGameCache) {
            window.espnApi.updateGameCache(weekNumber, gameId, gameData);
        }

        // Trigger visual updates
        this.updateGameUI(weekNumber, gameId, gameData);
    }

    // Update UI elements for a specific game
    updateGameUI(weekNumber, gameId, gameData) {
        // Update picks display
        const pickElement = document.querySelector(`[data-game-id="${gameId}"]`);
        if (pickElement) {
            // Update score if displayed
            const scoreElement = pickElement.querySelector('.game-score');
            if (scoreElement && gameData.awayScore !== undefined && gameData.homeScore !== undefined) {
                scoreElement.textContent = `${gameData.awayScore} - ${gameData.homeScore}`;
            }

            // Update status
            const statusElement = pickElement.querySelector('.game-status');
            if (statusElement && gameData.status) {
                statusElement.textContent = gameData.status;
                
                // Add live indicator
                if (gameData.status === 'LIVE' || gameData.status === 'IN_PROGRESS') {
                    statusElement.classList.add('text-emerald-600', 'font-bold');
                    // Add pulsing effect
                    if (!pickElement.classList.contains('live-game-pulse')) {
                        pickElement.classList.add('live-game-pulse');
                    }
                }
            }
        }

        // Update expanded game view if open
        const expandedView = document.getElementById('expanded-game-view');
        if (expandedView && !expandedView.classList.contains('hidden')) {
            const expandedGameId = expandedView.dataset.gameId;
            if (expandedGameId == gameId) {
                // Re-expand to refresh data
                if (window.expandGameView) {
                    window.expandGameView(gameId);
                }
            }
        }

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('realtimeScoreUpdate', {
            detail: {
                weekNumber,
                gameId,
                gameData
            }
        }));
    }

    // Register callback for updates
    onUpdate(callback) {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    // Register callback for connection status
    onConnectionChange(callback) {
        this.connectionStatusCallbacks.add(callback);
        // Immediately notify current status
        callback(this.isConnected);
        return () => this.connectionStatusCallbacks.delete(callback);
    }

    // Notify all callbacks
    notifyCallbacks(update) {
        this.callbacks.forEach(callback => {
            try {
                callback(update);
            } catch (error) {
                console.error('Error in update callback:', error);
            }
        });
    }

    // Notify connection status
    notifyConnectionStatus(connected) {
        this.connectionStatusCallbacks.forEach(callback => {
            try {
                callback(connected);
            } catch (error) {
                console.error('Error in connection callback:', error);
            }
        });
    }

    // Unsubscribe from all updates
    unsubscribeAll() {
        this.listeners.forEach(({ unsubscribe }, key) => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.listeners.clear();
        console.log('🔌 Unsubscribed from all real-time updates');
    }

    // Unsubscribe from specific week
    unsubscribeWeek(weekNumber) {
        const key = `week_${weekNumber}`;
        const listener = this.listeners.get(key);
        if (listener && listener.unsubscribe) {
            listener.unsubscribe();
            this.listeners.delete(key);
            console.log(`🔌 Unsubscribed from Week ${weekNumber}`);
        }
    }

    // Check connection status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            activeListeners: this.listeners.size
        };
    }

    // Migrate from polling to WebSocket
    async migrateFromPolling() {
        // Stop existing polling if active
        if (window.liveGameRefresh) {
            window.liveGameRefresh.stopLiveRefresh();
            console.log('⏹️ Stopped polling-based refresh');
        }

        // Initialize WebSocket connection
        const initialized = await this.initialize();
        if (!initialized) {
            console.warn('⚠️ Failed to migrate to WebSocket, falling back to polling');
            if (window.liveGameRefresh) {
                window.liveGameRefresh.startLiveRefresh();
            }
            return false;
        }

        // Subscribe to current week
        const currentWeek = window.currentWeek || 1;
        this.subscribeToWeek(currentWeek);

        console.log('✅ Successfully migrated from polling to WebSocket real-time updates');
        return true;
    }
}

// Create global instance
window.realtimeScores = new RealtimeScoreUpdates();

// Add CSS for live game pulse effect
if (!document.getElementById('realtime-styles')) {
    const style = document.createElement('style');
    style.id = 'realtime-styles';
    style.innerHTML = `
        @keyframes live-pulse {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            }
            50% {
                box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
            }
        }
        
        .live-game-pulse {
            animation: live-pulse 2s infinite;
        }
        
        .connection-indicator {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10000;
            transition: all 0.3s ease;
        }
        
        .connection-indicator.connected {
            background: #10b981;
            color: white;
        }
        
        .connection-indicator.disconnected {
            background: #ef4444;
            color: white;
        }
    `;
    document.head.appendChild(style);
}

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Real-time Score Updates...');
    
    // Wait for Firebase to be ready
    setTimeout(async () => {
        if (window.realtimeScores) {
            await window.realtimeScores.migrateFromPolling();
            
            // Add connection indicator
            const indicator = document.createElement('div');
            indicator.className = 'connection-indicator disconnected';
            indicator.textContent = '● Offline';
            document.body.appendChild(indicator);
            
            // Update indicator on connection change
            window.realtimeScores.onConnectionChange((connected) => {
                indicator.className = `connection-indicator ${connected ? 'connected' : 'disconnected'}`;
                indicator.textContent = connected ? '● Live' : '● Offline';
                
                // Auto-hide when connected
                if (connected) {
                    setTimeout(() => {
                        indicator.style.opacity = '0.3';
                    }, 3000);
                } else {
                    indicator.style.opacity = '1';
                }
            });
        }
    }, 2000);
});

console.log('⚡ Real-time Score Updates module loaded');