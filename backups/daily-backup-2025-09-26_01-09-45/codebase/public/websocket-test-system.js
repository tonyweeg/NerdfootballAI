/**
 * NerdFootball WebSocket Test System
 * Enterprise-level WebSocket architecture with Firebase RTDB integration
 * Pharoah's Diamond-level implementation for bulletproof real-time updates
 */

class WebSocketTestSystem {
    constructor() {
        this.connections = new Map();
        this.metrics = {
            rtdbLatency: [],
            websocketLatency: [],
            updateRate: 0,
            updatesPerMinute: 0,
            startTime: Date.now(),
            totalUpdates: 0
        };
        this.isVerboseLogging = false;
        this.autoScroll = true;
        this.rtdbListeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        // Performance monitoring
        this.performanceObserver = null;
        this.memoryMonitorInterval = null;
        
        this.initialize();
    }

    initialize() {
        this.log('Initializing WebSocket Test System...', 'system');
        this.setupEventListeners();
        this.startPerformanceMonitoring();
        this.updateConnectionStatus('rtdb', 'disconnected', 'Ready to connect');
        this.log('WebSocket Test System ready', 'success');
    }

    setupEventListeners() {
        // Control buttons
        document.getElementById('connect-rtdb').addEventListener('click', () => this.connectFirebaseRTDB());
        document.getElementById('test-espn-api').addEventListener('click', () => this.testEspnAPI());
        document.getElementById('simulate-game-update').addEventListener('click', () => this.simulateGameUpdate());
        document.getElementById('start-websocket').addEventListener('click', () => this.startWebSocketConnection());
        document.getElementById('clear-logs').addEventListener('click', () => this.clearLogs());
        document.getElementById('benchmark-performance').addEventListener('click', () => this.runPerformanceBenchmark());
        
        // Settings
        document.getElementById('auto-scroll').addEventListener('change', (e) => {
            this.autoScroll = e.target.checked;
        });
        
        document.getElementById('verbose-logging').addEventListener('change', (e) => {
            this.isVerboseLogging = e.target.checked;
            this.log(`Verbose logging ${e.target.checked ? 'enabled' : 'disabled'}`, 'system');
        });
    }

    // Firebase Realtime Database Connection
    async connectFirebaseRTDB() {
        this.log('Connecting to Firebase Realtime Database...', 'info');
        this.updateConnectionStatus('rtdb', 'connecting', 'Connecting...');
        
        const startTime = performance.now();
        
        try {
            if (!window.rtdb) {
                throw new Error('Firebase RTDB not initialized');
            }

            // Test connection with a simple read/write
            const testRef = window.dbRef(window.rtdb, 'websocket-test/connection-test');
            
            await window.set(testRef, {
                timestamp: window.serverTimestamp(),
                testId: `test-${Date.now()}`,
                userAgent: navigator.userAgent.substring(0, 50)
            });

            // Set up game data listener
            this.setupGameDataListener();
            
            // Set up leaderboard listener
            this.setupLeaderboardListener();
            
            const latency = performance.now() - startTime;
            this.metrics.rtdbLatency.push(latency);
            this.updateMetric('rtdb-latency', Math.round(latency));
            
            this.updateConnectionStatus('rtdb', 'connected', `Connected (${Math.round(latency)}ms)`);
            this.log(`Firebase RTDB connected in ${Math.round(latency)}ms`, 'success');
            
        } catch (error) {
            this.updateConnectionStatus('rtdb', 'error', 'Connection failed');
            this.log(`Firebase RTDB connection failed: ${error.message}`, 'error');
        }
    }

    setupGameDataListener() {
        const gameDataRef = window.dbRef(window.rtdb, 'nfl/games/live');
        
        const unsubscribe = window.onValue(gameDataRef, (snapshot) => {
            const startTime = performance.now();
            
            if (snapshot.exists()) {
                const gameData = snapshot.val();
                this.handleGameDataUpdate(gameData);
                
                const latency = performance.now() - startTime;
                this.metrics.rtdbLatency.push(latency);
                
                if (this.isVerboseLogging) {
                    this.log(`Game data updated in ${Math.round(latency)}ms`, 'info');
                }
            } else {
                this.log('No live games found in RTDB', 'warning');
            }
        }, (error) => {
            this.log(`Game data listener error: ${error.message}`, 'error');
        });
        
        this.rtdbListeners.set('gameData', unsubscribe);
        this.log('Game data listener established', 'success');
    }

    setupLeaderboardListener() {
        const leaderboardRef = window.dbRef(window.rtdb, 'leaderboards/live');
        
        const unsubscribe = window.onValue(leaderboardRef, (snapshot) => {
            if (snapshot.exists()) {
                const leaderboardData = snapshot.val();
                this.handleLeaderboardUpdate(leaderboardData);
                this.metrics.totalUpdates++;
                
                if (this.isVerboseLogging) {
                    this.log('Leaderboard updated via RTDB', 'info');
                }
            }
        }, (error) => {
            this.log(`Leaderboard listener error: ${error.message}`, 'error');
        });
        
        this.rtdbListeners.set('leaderboard', unsubscribe);
        this.log('Leaderboard listener established', 'success');
    }

    // WebSocket Connection Management
    async startWebSocketConnection() {
        this.log('Starting WebSocket connection with auto-reconnect...', 'info');
        this.updateConnectionStatus('websocket', 'connecting', 'Connecting...');
        
        try {
            // For testing, we'll simulate a WebSocket connection since we don't have a WebSocket server
            // In production, this would connect to your WebSocket server
            await this.simulateWebSocketConnection();
            
        } catch (error) {
            this.updateConnectionStatus('websocket', 'error', 'Connection failed');
            this.log(`WebSocket connection failed: ${error.message}`, 'error');
            this.scheduleReconnect();
        }
    }

    async simulateWebSocketConnection() {
        return new Promise((resolve) => {
            // Simulate connection delay
            setTimeout(() => {
                this.updateConnectionStatus('websocket', 'connected', 'Simulated connection');
                this.log('WebSocket connection established (simulated)', 'success');
                this.startWebSocketHeartbeat();
                resolve();
            }, 1500);
        });
    }

    startWebSocketHeartbeat() {
        const heartbeatInterval = setInterval(() => {
            const startTime = performance.now();
            
            // Simulate WebSocket ping/pong
            setTimeout(() => {
                const latency = performance.now() - startTime + Math.random() * 50; // Simulate network variance
                this.metrics.websocketLatency.push(latency);
                this.updateMetric('websocket-latency', Math.round(latency));
                
                if (this.isVerboseLogging) {
                    this.log(`WebSocket heartbeat: ${Math.round(latency)}ms`, 'info');
                }
            }, Math.random() * 20); // Simulate response time variance
            
        }, 5000); // Heartbeat every 5 seconds
        
        this.connections.set('websocket-heartbeat', heartbeatInterval);
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            this.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`, 'warning');
            
            setTimeout(() => {
                this.startWebSocketConnection();
            }, delay);
        } else {
            this.log('Max reconnect attempts reached', 'error');
            this.updateConnectionStatus('websocket', 'error', 'Max retries exceeded');
        }
    }

    // ESPN API Testing
    async testEspnAPI() {
        this.log('Testing ESPN API integration...', 'info');
        this.updateConnectionStatus('espn', 'connecting', 'Testing...');
        
        const startTime = performance.now();
        
        try {
            // Check if ESPN API is available from the main site
            if (typeof window.espnNerdApi !== 'undefined') {
                const currentWeekData = await window.espnNerdApi.getCurrentWeekScores();
                const latency = performance.now() - startTime;
                
                this.updateConnectionStatus('espn', 'connected', `API working (${Math.round(latency)}ms)`);
                this.log(`ESPN API test successful in ${Math.round(latency)}ms`, 'success');
                
                // Display some sample data
                if (currentWeekData && currentWeekData.games) {
                    this.displayLiveScores(currentWeekData.games.slice(0, 5)); // Show first 5 games
                }
                
            } else {
                // Simulate ESPN API call for testing
                await this.simulateEspnAPI();
            }
            
        } catch (error) {
            this.updateConnectionStatus('espn', 'error', 'API failed');
            this.log(`ESPN API test failed: ${error.message}`, 'error');
        }
    }

    async simulateEspnAPI() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const latency = 200 + Math.random() * 300; // Simulate API latency
                
                this.updateConnectionStatus('espn', 'connected', `Simulated (${Math.round(latency)}ms)`);
                this.log(`ESPN API simulation complete in ${Math.round(latency)}ms`, 'success');
                
                // Simulate game data
                const simulatedGames = [
                    { homeTeam: 'KC Chiefs', awayTeam: 'Buffalo Bills', homeScore: 21, awayScore: 17, status: 'Q3 8:45' },
                    { homeTeam: 'Dallas Cowboys', awayTeam: 'NY Giants', homeScore: 14, awayScore: 10, status: 'Q2 3:22' },
                    { homeTeam: 'Green Bay Packers', awayTeam: 'Chicago Bears', homeScore: 28, awayScore: 7, status: 'Q4 12:15' }
                ];
                
                this.displayLiveScores(simulatedGames);
                resolve();
                
            }, 1500);
        });
    }

    // Game Data Handling
    handleGameDataUpdate(gameData) {
        this.log('Processing real-time game data update', 'info');
        
        if (Array.isArray(gameData)) {
            this.displayLiveScores(gameData);
        } else {
            // Handle single game update
            this.displayLiveScores([gameData]);
        }
        
        this.metrics.totalUpdates++;
        this.updateMetric('update-rate', this.calculateUpdateRate());
    }

    displayLiveScores(games) {
        const liveScoresContainer = document.getElementById('live-scores');
        
        if (!games || games.length === 0) {
            liveScoresContainer.innerHTML = '<p class="text-gray-500">No live games currently...</p>';
            return;
        }
        
        const scoresHTML = games.map(game => `
            <div class="flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0">
                <div class="flex-1">
                    <div class="font-medium">${game.awayTeam || 'Away Team'} @ ${game.homeTeam || 'Home Team'}</div>
                    <div class="text-sm text-gray-600">${game.status || 'Not Started'}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-lg">${game.awayScore || 0} - ${game.homeScore || 0}</div>
                </div>
            </div>
        `).join('');
        
        liveScoresContainer.innerHTML = scoresHTML;
        
        if (this.isVerboseLogging) {
            this.log(`Updated live scores display with ${games.length} games`, 'info');
        }
    }

    // Leaderboard Updates
    handleLeaderboardUpdate(leaderboardData) {
        this.log('Processing real-time leaderboard update', 'info');
        this.displayLiveLeaderboard(leaderboardData);
    }

    displayLiveLeaderboard(data) {
        const leaderboardContainer = document.getElementById('live-leaderboard');
        
        if (!data || Object.keys(data).length === 0) {
            leaderboardContainer.innerHTML = '<p class="text-gray-500">Leaderboard not loaded...</p>';
            return;
        }
        
        // Convert to array and sort by score
        const leaderboardArray = Object.entries(data)
            .map(([userId, userData]) => ({ userId, ...userData }))
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 10); // Top 10
        
        const leaderboardHTML = leaderboardArray.map((user, index) => `
            <div class="flex justify-between items-center p-2 ${index % 2 === 0 ? 'bg-gray-50' : ''}">
                <div>
                    <span class="font-medium">#${index + 1}</span>
                    <span class="ml-2">${user.displayName || user.userId}</span>
                </div>
                <div class="font-bold">${user.score || 0} pts</div>
            </div>
        `).join('');
        
        leaderboardContainer.innerHTML = leaderboardHTML;
    }

    // Performance Monitoring
    startPerformanceMonitoring() {
        // Memory usage monitoring
        this.memoryMonitorInterval = setInterval(() => {
            if (performance.memory) {
                const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
                this.updateMetric('memory-usage', memoryMB);
            }
        }, 2000);
        
        // Update rates calculation
        setInterval(() => {
            this.updateMetric('update-rate', this.calculateUpdateRate());
        }, 1000);
    }

    calculateUpdateRate() {
        const runtime = (Date.now() - this.metrics.startTime) / 60000; // minutes
        return runtime > 0 ? Math.round(this.metrics.totalUpdates / runtime) : 0;
    }

    // Simulation Functions
    async simulateGameUpdate() {
        this.log('Simulating live game update...', 'info');
        
        const simulatedUpdate = {
            gameId: `sim-${Date.now()}`,
            homeTeam: 'Test Team A',
            awayTeam: 'Test Team B',
            homeScore: Math.floor(Math.random() * 35),
            awayScore: Math.floor(Math.random() * 35),
            status: `Q${Math.ceil(Math.random() * 4)} ${Math.floor(Math.random() * 15)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
            timestamp: Date.now()
        };
        
        // Simulate the update pipeline
        setTimeout(() => {
            this.handleGameDataUpdate([simulatedUpdate]);
            this.log('Game update simulation complete', 'success');
            
            // Simulate leaderboard update as a result
            setTimeout(() => {
                const simulatedLeaderboard = {
                    user1: { displayName: 'Test User 1', score: 85 },
                    user2: { displayName: 'Test User 2', score: 72 },
                    user3: { displayName: 'Test User 3', score: 68 }
                };
                this.handleLeaderboardUpdate(simulatedLeaderboard);
            }, 500);
            
        }, 800);
    }

    async runPerformanceBenchmark() {
        this.log('Running performance benchmark...', 'info');
        
        const benchmarkStart = performance.now();
        const iterations = 100;
        
        for (let i = 0; i < iterations; i++) {
            // Simulate rapid updates
            const testData = { 
                gameId: `bench-${i}`, 
                homeScore: i % 35, 
                awayScore: (i * 2) % 35,
                status: `Bench ${i}` 
            };
            
            this.handleGameDataUpdate([testData]);
            
            // Small delay to prevent blocking
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        const benchmarkTime = performance.now() - benchmarkStart;
        const updatesPerSecond = Math.round((iterations / benchmarkTime) * 1000);
        
        this.log(`Benchmark complete: ${iterations} updates in ${Math.round(benchmarkTime)}ms (${updatesPerSecond} updates/sec)`, 'success');
        this.updateMetric('response-time', Math.round(benchmarkTime / iterations));
    }

    // UI Helper Functions
    updateConnectionStatus(type, status, message) {
        const statusElement = document.getElementById(`${type}-status`);
        const textElement = document.getElementById(`${type}-status-text`);
        
        if (statusElement && textElement) {
            statusElement.className = `connection-status w-3 h-3 rounded-full mr-3 status-${status}`;
            textElement.textContent = message;
        }
    }

    updateMetric(metricId, value) {
        const element = document.getElementById(metricId);
        if (element) {
            if (metricId.includes('latency') || metricId === 'response-time') {
                element.textContent = `${value}ms`;
            } else if (metricId === 'memory-usage') {
                element.textContent = `${value}MB`;
            } else {
                element.textContent = value;
            }
        }
    }

    log(message, type = 'info') {
        const debugConsole = document.getElementById('debug-console');
        const timestamp = new Date().toLocaleTimeString();
        
        const typeIcons = {
            'system': '⚙️',
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };
        
        const typeColors = {
            'system': 'text-blue-400',
            'info': 'text-green-400',
            'success': 'text-green-300',
            'warning': 'text-yellow-400',
            'error': 'text-red-400'
        };
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${typeColors[type] || 'text-green-400'}`;
        logEntry.innerHTML = `[${timestamp}] ${typeIcons[type] || 'ℹ️'} ${message}`;
        
        debugConsole.appendChild(logEntry);
        
        if (this.autoScroll) {
            debugConsole.scrollTop = debugConsole.scrollHeight;
        }
        
        // Also log to browser console for debugging
        if (type === 'error') {
            console.error(`[WebSocket Test] ${message}`);
        } else {
            console.log(`[WebSocket Test] ${message}`);
        }
    }

    clearLogs() {
        const debugConsole = document.getElementById('debug-console');
        debugConsole.innerHTML = '<div class="log-entry">[SYSTEM] Logs cleared</div>';
        this.log('Debug console cleared', 'system');
    }

    // Cleanup
    destroy() {
        // Clear all intervals
        this.connections.forEach((connection, key) => {
            if (typeof connection === 'number') {
                clearInterval(connection);
            }
        });
        
        // Unsubscribe from RTDB listeners
        this.rtdbListeners.forEach((unsubscribe) => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
        }
        
        this.log('WebSocket Test System destroyed', 'system');
    }
}

// Global logging function for the Firebase initialization
window.log = function(message, type = 'info') {
    if (window.webSocketTest) {
        window.webSocketTest.log(message, type);
    } else {
        console.log(`[WebSocket Test] ${message}`);
    }
};

// Initialize the test system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.webSocketTest = new WebSocketTestSystem();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.webSocketTest) {
            window.webSocketTest.destroy();
        }
    });
});

// Export for external access
window.WebSocketTestSystem = WebSocketTestSystem;