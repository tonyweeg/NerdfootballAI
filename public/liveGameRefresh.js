// Live Game Auto-Refresh System
// Automatically refreshes game data during live games and updates UI

class LiveGameRefresh {
    constructor() {
        this.refreshInterval = null;
        this.isRefreshing = false;
        this.refreshIntervalMs = 30 * 1000; // 30 seconds during live games
        this.lastRefreshTime = null;
        this.activeListeners = new Set();
    }

    // Check if there are any live games currently in progress
    async hasLiveGames(weekNumber = null) {
        try {
            const currentWeek = weekNumber || window.currentWeek || this.getCurrentWeek();
            
            // Get games from cache or fetch fresh
            let games = [];
            if (window.gameStateCache) {
                const fetchFunction = async () => {
                    const response = await fetch(`nfl_2025_week_${currentWeek}.json`);
                    if (response.ok) {
                        const weekData = await response.json();
                        return weekData.games || [];
                    }
                    return [];
                };
                games = await window.gameStateCache.cacheSchedule(currentWeek, fetchFunction);
            } else {
                // Fallback to direct fetch
                const response = await fetch(`nfl_2025_week_${currentWeek}.json`);
                if (response.ok) {
                    const weekData = await response.json();
                    games = weekData.games || [];
                }
            }

            const now = new Date();
            const liveGames = games.filter(game => {
                // ESPN Z = Eastern time, treat directly as Eastern
                const cleanTime = (game.dt || game.kickoff).replace('Z', '');
                const gameTime = new Date(cleanTime);
                const gameEndApprox = new Date(gameTime.getTime() + (4 * 60 * 60 * 1000)); // ~4 hours later
                
                // Game is live if it has started but not completed and doesn't have a winner yet
                return now >= gameTime && 
                       now <= gameEndApprox && 
                       (!game.winner || game.winner === 'TBD');
            });

            console.log(`🔍 Live games check for Week ${currentWeek}: ${liveGames.length} live games found`);
            return liveGames.length > 0;
        } catch (error) {
            console.warn('Error checking for live games:', error);
            return false;
        }
    }

    // Get current NFL week (fallback only)
    getCurrentWeek() {
        // Use global week management system
        if (typeof window !== 'undefined' && window.currentWeek) {
            return window.currentWeek;
        }
        
        // Fallback calculation for 2025 season
        const now = new Date();
        const seasonStart = new Date('2025-09-04');
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const weeksDiff = Math.floor((now - seasonStart) / weekMs) + 1;
        return Math.min(Math.max(weeksDiff, 1), 18);
    }

    // Start auto-refresh for live games
    async startLiveRefresh(weekNumber = null) {
        if (this.refreshInterval) {
            console.log('🔄 Live refresh already running');
            return;
        }

        const currentWeek = weekNumber || window.currentWeek || this.getCurrentWeek();
        const hasLive = await this.hasLiveGames(currentWeek);

        if (!hasLive) {
            console.log(`⏸️ No live games found for Week ${currentWeek} - skipping auto-refresh`);
            return;
        }

        console.log(`🚀 Starting live game refresh for Week ${currentWeek} every ${this.refreshIntervalMs/1000}s`);

        this.refreshInterval = setInterval(async () => {
            await this.performLiveRefresh(currentWeek);
        }, this.refreshIntervalMs);

        // Do initial refresh
        await this.performLiveRefresh(currentWeek);
    }

    // Stop auto-refresh
    stopLiveRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('🛑 Live game refresh stopped');
        }
    }

    // Perform the actual live refresh
    async performLiveRefresh(weekNumber) {
        if (this.isRefreshing) {
            console.log('⏭️ Refresh already in progress, skipping');
            return;
        }

        this.isRefreshing = true;
        this.lastRefreshTime = new Date();

        try {
            console.log(`🔄 Live refresh for Week ${weekNumber}...`);

            // 1. Check if ESPN Score Sync is available and use it
            if (window.espnScoreSync) {
                const syncResult = await window.espnScoreSync.syncWeekScores(weekNumber);
                if (syncResult.success && syncResult.updatedCount > 0) {
                    console.log(`✅ ESPN sync updated ${syncResult.updatedCount} games`);
                    this.notifyUIRefresh(weekNumber, syncResult.updatedCount);
                    return;
                }
            }

            // 2. Fallback: Invalidate cache and trigger UI refresh
            if (window.gameStateCache) {
                const clearedEntries = window.gameStateCache.invalidateAfterDataUpdate('live_game_refresh', weekNumber);
                console.log(`💎 Cache cleared: ${clearedEntries} entries`);
            }

            // 3. Notify UI components to refresh
            this.notifyUIRefresh(weekNumber, 0);

            // 4. Check if we should continue refreshing
            const stillHasLive = await this.hasLiveGames(weekNumber);
            if (!stillHasLive) {
                console.log('🏁 No more live games detected, stopping auto-refresh');
                this.stopLiveRefresh();
            }

        } catch (error) {
            console.error('❌ Live refresh error:', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    // Notify UI components that data has been refreshed
    notifyUIRefresh(weekNumber, updatedCount = 0) {
        // Dispatch custom event
        const event = new CustomEvent('liveGameRefresh', {
            detail: {
                weekNumber,
                updatedCount,
                timestamp: new Date().toISOString()
            }
        });
        window.dispatchEvent(event);

        // Show visual notification if on the right page
        this.showRefreshNotification(weekNumber, updatedCount);

        // Trigger specific UI updates
        this.triggerUIUpdates(weekNumber);
    }

    // Show refresh notification to user
    showRefreshNotification(weekNumber, updatedCount) {
        // Only show if we're on a relevant page
        const currentView = this.getCurrentView();
        if (!['picks', 'leaderboard', 'grid'].includes(currentView)) {
            return;
        }

        // Instead of toast, make updated games glow
        if (updatedCount > 0) {
            this.glowUpdatedGames();
        }
    }

    // Get current view/page the user is on
    getCurrentView() {
        // Check which container is visible
        if (document.getElementById('picks-container') && !document.getElementById('picks-container').classList.contains('hidden')) {
            return 'picks';
        }
        if (document.getElementById('leaderboard-container') && !document.getElementById('leaderboard-container').classList.contains('hidden')) {
            return 'leaderboard';
        }
        if (document.getElementById('grid-container') && !document.getElementById('grid-container').classList.contains('hidden')) {
            return 'grid';
        }
        return 'unknown';
    }

    // Make updated games glow
    glowUpdatedGames() {
        console.log('🌟 DEBUG: glowUpdatedGames called (v2 - targeted)');
        
        // Track unique game containers to avoid duplicates
        const glowedElements = new Set();
        
        // Strategy 1: Find game row containers (most reliable)
        const gameContainers = document.querySelectorAll('.pick-game-row, .game-row, div[id^="game-row-"]');
        console.log(`🌟 DEBUG: Found ${gameContainers.length} game containers`);
        
        gameContainers.forEach(container => {
            if (!glowedElements.has(container)) {
                container.classList.add('game-updated-glow');
                glowedElements.add(container);
                
                setTimeout(() => {
                    container.classList.remove('game-updated-glow');
                }, 3000);
            }
        });
        
        // Strategy 2: Find parent containers of game buttons (fallback)
        if (glowedElements.size === 0) {
            console.log('🌟 DEBUG: No game containers found, trying button parents');
            
            const gameButtons = document.querySelectorAll('.winner-btn[data-game-id]');
            const uniqueParents = new Map();
            
            gameButtons.forEach(button => {
                const gameId = button.dataset.gameId;
                if (!uniqueParents.has(gameId)) {
                    // Find the container that holds both team buttons
                    const parent = button.closest('div[class*="border"], .pick-game-row, .game-container');
                    if (parent) {
                        uniqueParents.set(gameId, parent);
                    }
                }
            });
            
            console.log(`🌟 DEBUG: Found ${uniqueParents.size} unique game containers from buttons`);
            
            uniqueParents.forEach(parent => {
                parent.classList.add('game-updated-glow');
                glowedElements.add(parent);
                
                setTimeout(() => {
                    parent.classList.remove('game-updated-glow');
                }, 3000);
            });
        }
        
        console.log(`🌟 DEBUG: Applied glow to ${glowedElements.size} unique game containers`);

        // Also use the football indicator for consistency
        if (typeof window.showGameUpdateIndicator === 'function') {
            window.showGameUpdateIndicator();
            console.log('🌟 DEBUG: Football indicator shown');
        }
    }

    // Create toast notification (keeping for other uses if needed)
    createToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        }`;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Fade in
        setTimeout(() => toast.style.opacity = '1', 100);

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, duration);
    }

    // Trigger specific UI updates
    triggerUIUpdates(weekNumber) {
        // Reload current week if it matches
        if (typeof currentWeek !== 'undefined' && currentWeek == weekNumber) {
            // Trigger leaderboard refresh if visible
            const leaderboardBody = document.getElementById('leaderboard-body');
            if (leaderboardBody && leaderboardBody.closest('.hidden') === null) {
                if (typeof calculateLeaderboardOptimized === 'function') {
                    console.log('🔄 Refreshing leaderboard after live update');
                    calculateLeaderboardOptimized();
                }
            }

            // Trigger picks summary refresh if visible
            const picksSummary = document.getElementById('picks-summary-container');
            if (picksSummary && picksSummary.closest('.hidden') === null) {
                if (typeof loadPicksSummary === 'function') {
                    console.log('🔄 Refreshing picks summary after live update');
                    loadPicksSummary();
                }
            }

            // Trigger grid refresh if visible
            const gridContainer = document.getElementById('grid-container');
            if (gridContainer && gridContainer.closest('.hidden') === null) {
                if (typeof loadGridData === 'function') {
                    console.log('🔄 Refreshing grid after live update');
                    loadGridData();
                }
            }
        }
    }

    // Add event listener for live game refresh
    addEventListener(callback) {
        const listener = (event) => callback(event.detail);
        this.activeListeners.add(listener);
        window.addEventListener('liveGameRefresh', listener);
        return listener;
    }

    // Remove event listener
    removeEventListener(listener) {
        if (this.activeListeners.has(listener)) {
            window.removeEventListener('liveGameRefresh', listener);
            this.activeListeners.delete(listener);
        }
    }

    // Initialize the live refresh system
    initialize() {
        console.log('💎 Live Game Refresh System Initialized');

        // Start live refresh if there are live games
        this.startLiveRefresh();

        // Set up automatic restart when navigating to different weeks
        if (typeof allUI !== 'undefined' && allUI.weekSelector) {
            allUI.weekSelector.addEventListener('change', () => {
                this.stopLiveRefresh();
                setTimeout(() => this.startLiveRefresh(), 1000);
            });
        }

        // Set up page visibility handling (pause when tab is not active)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📴 Tab hidden - pausing live refresh');
                this.stopLiveRefresh();
            } else {
                console.log('📱 Tab visible - resuming live refresh');
                this.startLiveRefresh();
            }
        });
    }

    // Get status info
    getStatus() {
        return {
            isActive: !!this.refreshInterval,
            isRefreshing: this.isRefreshing,
            lastRefresh: this.lastRefreshTime,
            intervalMs: this.refreshIntervalMs,
            currentWeek: window.currentWeek || this.getCurrentWeek()
        };
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.LiveGameRefresh = LiveGameRefresh;
}

// Add test function for debugging
if (typeof window !== 'undefined') {
    window.testGameGlow = function() {
        console.log('🧪 TEST: Triggering game glow effect manually');
        if (window.liveGameRefresh) {
            window.liveGameRefresh.glowUpdatedGames();
        } else {
            console.error('🧪 TEST: liveGameRefresh not initialized yet, creating instance');
            window.liveGameRefresh = new LiveGameRefresh();
            window.liveGameRefresh.glowUpdatedGames();
        }
        return 'Test triggered - check console for debug output';
    };
}

// Auto-initialize if in browser
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.liveGameRefresh = new LiveGameRefresh();
        // Initialize after a short delay to ensure other systems are ready
        setTimeout(() => {
            if (window.liveGameRefresh) {
                window.liveGameRefresh.initialize();
            }
        }, 2000);
        console.log('🧪 TEST: You can now run testGameGlow() in console to test the glow effect');
    });
} else if (typeof window !== 'undefined') {
    // DOM already loaded
    window.liveGameRefresh = new LiveGameRefresh();
    setTimeout(() => {
        if (window.liveGameRefresh) {
            window.liveGameRefresh.initialize();
        }
    }, 1000);
    console.log('🧪 TEST: You can now run testGameGlow() in console to test the glow effect');
}