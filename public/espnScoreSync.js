// ESPN Score Synchronization System
// Automatically updates game scores from ESPN API and recalculates leaderboards

class EspnScoreSync {
    constructor(db, espnApi, gameStateCache) {
        this.db = db;
        this.espnApi = espnApi;
        this.gameStateCache = gameStateCache;
        this.syncInterval = null;
        this.lastSyncTime = null;
        this.syncStatus = 'idle';
    }

    // Get the results path for a specific week
    resultsPath(weekNumber) {
        return `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`;
    }
    
    // Get Firestore document reference
    getDocRef(path) {
        // Use modern Firestore API with global functions
        if (typeof window !== 'undefined' && window.db && typeof window.doc !== 'undefined') {
            return window.doc(window.db, path);
        } else if (typeof db !== 'undefined' && typeof doc !== 'undefined') {
            return doc(db, path);
        } else if (this.db && this.db.doc) {
            return this.db.doc(path);
        } else {
            throw new Error('Firestore not properly initialized');
        }
    }
    
    // Set document in Firestore
    async setDocument(path, data) {
        if (typeof window !== 'undefined' && window.db && typeof window.setDoc !== 'undefined' && typeof window.doc !== 'undefined') {
            return await window.setDoc(window.doc(window.db, path), data);
        } else if (typeof setDoc !== 'undefined' && typeof db !== 'undefined' && typeof doc !== 'undefined') {
            return await setDoc(doc(db, path), data);
        } else if (this.db && this.db.doc) {
            return await this.db.doc(path).set(data);
        } else {
            throw new Error('Firestore not properly initialized');
        }
    }
    
    // Get document from Firestore
    async getDocument(path) {
        if (typeof window !== 'undefined' && window.db && typeof window.getDoc !== 'undefined' && typeof window.doc !== 'undefined') {
            return await window.getDoc(window.doc(window.db, path));
        } else if (typeof getDoc !== 'undefined' && typeof db !== 'undefined' && typeof doc !== 'undefined') {
            return await getDoc(doc(db, path));
        } else if (this.db && this.db.doc) {
            return await this.db.doc(path).get();
        } else {
            throw new Error('Firestore not properly initialized');
        }
    }

    // Map ESPN game data to our game IDs
    mapEspnToGameId(espnGame, weekNumber) {
        // Our game IDs are typically like "101", "102", etc.
        // ESPN provides unique IDs, so we need to map based on teams
        const gameIdBase = parseInt(weekNumber) * 100;
        
        // This is a simplified mapping - in production you'd want a more robust system
        // For now, we'll use the order of games as they come from ESPN
        return espnGame.id || `${gameIdBase + 1}`;
    }

    // Sync scores for a specific week
    async syncWeekScores(weekNumber) {
        console.log(`🔄 Starting ESPN score sync for Week ${weekNumber}...`);
        this.syncStatus = 'syncing';
        
        try {
            // Fetch current games from ESPN
            const espnGames = await this.espnApi.getWeekGames(weekNumber);
            
            if (!espnGames || espnGames.length === 0) {
                console.log('No games found from ESPN for Week', weekNumber);
                return { success: false, message: 'No games found' };
            }

            // Get current results from Firestore
            const resultsDoc = await this.getDocument(this.resultsPath(weekNumber));
            const currentResults = resultsDoc.exists() ? resultsDoc.data() : {};
            
            let updatedCount = 0;
            let newResults = { ...currentResults };
            
            // Process each ESPN game
            for (const espnGame of espnGames) {
                // Only update completed games
                if (espnGame.status === 'FINAL' || espnGame.winner !== 'TBD') {
                    const gameId = this.mapEspnToGameId(espnGame, weekNumber);
                    
                    // Check if scores have changed
                    const existingResult = currentResults[gameId];
                    const needsUpdate = !existingResult || 
                        existingResult.awayScore !== espnGame.awayScore ||
                        existingResult.homeScore !== espnGame.homeScore ||
                        existingResult.winner !== espnGame.winner;
                    
                    if (needsUpdate) {
                        // Store comprehensive ESPN data
                        newResults[gameId] = {
                            // Basic game results
                            winner: espnGame.winner,
                            awayScore: espnGame.awayScore,
                            homeScore: espnGame.homeScore,
                            status: espnGame.status,
                            
                            // 🎲 Enhanced data from comprehensive ESPN integration
                            quarterScores: espnGame.quarterScores || null,
                            teamRecords: espnGame.teamRecords || null,
                            weather: espnGame.weather || null,
                            venue: espnGame.venue || null,
                            broadcasts: espnGame.broadcasts || null,
                            tv: espnGame.tv || null,
                            
                            // ⚡ Live game situation (for in-progress games)
                            situation: espnGame.situation || null,
                            
                            // 🎯 Win probability (huge value!)
                            probability: espnGame.situation?.probability || null,
                            
                            // 📊 Metadata
                            attendance: espnGame.attendance,
                            season: espnGame.season,
                            lastUpdated: new Date().toISOString(),
                            source: 'ESPN_API_ENHANCED',
                            dataEnhanced: true
                        };
                        updatedCount++;
                        
                        console.log(`✅ Enhanced update game ${gameId}: ${espnGame.a} ${espnGame.awayScore} - ${espnGame.h} ${espnGame.homeScore} (Winner: ${espnGame.winner})${espnGame.weather ? ` [${espnGame.weather.temperature}°F]` : ''}`);
                    }
                }
            }
            
            // Save updated results if there were changes
            if (updatedCount > 0) {
                await this.setDocument(this.resultsPath(weekNumber), newResults);
                
                // Invalidate cache to trigger leaderboard recalculation
                this.gameStateCache.invalidateAfterDataUpdate('game_results_updated', weekNumber);
                
                // Update leaderboard summary
                if (typeof window.updateLeaderboardSummary === 'function') {
                    try {
                        await window.updateLeaderboardSummary();
                        console.log('✅ Leaderboard summary updated after ESPN sync');
                    } catch (error) {
                        console.error('Failed to update leaderboard summary:', error);
                    }
                } else if (typeof updateLeaderboardSummary === 'function') {
                    try {
                        await updateLeaderboardSummary();
                        console.log('✅ Leaderboard summary updated after ESPN sync');
                    } catch (error) {
                        console.error('Failed to update leaderboard summary:', error);
                    }
                }
                
                console.log(`💎 ESPN Sync Complete: Updated ${updatedCount} games for Week ${weekNumber}`);
                
                // 🏆 TRIGGER SURVIVOR AUTO-ELIMINATION CHECK
                await this.checkSurvivorEliminations(weekNumber, updatedCount);
                
                // Trigger UI update if on admin page
                this.notifyUIUpdate(weekNumber, updatedCount);
            } else {
                console.log(`✅ Week ${weekNumber} already up to date`);
            }
            
            this.lastSyncTime = new Date();
            this.syncStatus = 'success';
            
            return {
                success: true,
                updatedCount,
                totalGames: espnGames.length,
                message: `Updated ${updatedCount} of ${espnGames.length} games`
            };
            
        } catch (error) {
            console.error('ESPN score sync error:', error);
            this.syncStatus = 'error';
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Notify UI of updates
    notifyUIUpdate(weekNumber, updatedCount) {
        // Dispatch custom event that UI can listen to
        window.dispatchEvent(new CustomEvent('espnScoresUpdated', {
            detail: {
                weekNumber,
                updatedCount,
                timestamp: new Date().toISOString()
            }
        }));
        
        // If on admin results tab, show notification
        const adminSection = document.getElementById('admin-content-game-results');
        if (adminSection && !adminSection.classList.contains('hidden')) {
            this.showSyncNotification(`ESPN Sync: Updated ${updatedCount} games`, 'success');
        }
    }

    // Show sync notification in UI
    showSyncNotification(message, type = 'info') {
        // Find or create notification container
        let notificationContainer = document.getElementById('espn-sync-notification');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'espn-sync-notification';
            notificationContainer.className = 'fixed top-4 right-4 z-50';
            document.body.appendChild(notificationContainer);
        }
        
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        
        notificationContainer.innerHTML = `
            <div class="${bgColor} text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
                <span>🔄</span>
                <span>${message}</span>
            </div>
        `;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notificationContainer.innerHTML = '';
        }, 5000);
    }

    // Start automatic syncing for live games
    startAutoSync(intervalMinutes = 5) {
        if (this.syncInterval) {
            console.log('Auto-sync already running');
            return;
        }
        
        console.log(`🚀 Starting ESPN auto-sync every ${intervalMinutes} minutes`);
        
        // Initial sync
        this.syncCurrentWeek();
        
        // Set up interval
        this.syncInterval = setInterval(() => {
            this.syncCurrentWeek();
        }, intervalMinutes * 60 * 1000);
    }

    // Stop automatic syncing
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('🛑 ESPN auto-sync stopped');
        }
    }

    // Sync current week's scores
    async syncCurrentWeek() {
        const currentWeek = this.getCurrentWeek();
        return await this.syncWeekScores(currentWeek);
    }

    // Get current NFL week
    getCurrentWeek() {
        // FIXED: 2025 season starts in September 2025
        const now = new Date();
        const seasonStart = new Date('2025-09-05');
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const weeksDiff = Math.floor((now - seasonStart) / weekMs) + 1;
        
        // Since we're before the 2025 season, default to week 1 for testing
        if (now < seasonStart) {
            console.log('🏈 Pre-season: Defaulting to Week 1 for testing');
            return 1;
        }
        
        return Math.min(Math.max(weeksDiff, 1), 18);
    }

    // Manual sync button handler
    async handleManualSync(weekNumber) {
        this.showSyncNotification('Syncing scores from ESPN...', 'info');
        const result = await this.syncWeekScores(weekNumber);
        
        if (result.success) {
            if (result.updatedCount > 0) {
                this.showSyncNotification(`Updated ${result.updatedCount} games from ESPN`, 'success');
            } else {
                this.showSyncNotification('All scores already up to date', 'success');
            }
        } else {
            this.showSyncNotification(`Sync failed: ${result.error || result.message}`, 'error');
        }
        
        return result;
    }

    // Check if we should auto-sync (during game days)
    shouldAutoSync() {
        const now = new Date();
        const day = now.getDay();
        
        // Auto-sync on game days: Thursday (4), Sunday (0), Monday (1)
        const isGameDay = day === 0 || day === 1 || day === 4;
        
        // Also check if we're in the typical game time window (10am - 11pm ET)
        const hour = now.getHours();
        const isGameTime = hour >= 10 && hour <= 23;
        
        return isGameDay && isGameTime;
    }

    // Initialize sync system
    initialize() {
        console.log('💎 ESPN Score Sync System Initialized');
        
        // Add sync button to admin panel if it doesn't exist
        this.addSyncButton();
        
        // Start auto-sync if it's game day
        if (this.shouldAutoSync()) {
            this.startAutoSync(5); // Every 5 minutes during games
        }
        
        // Listen for manual sync requests
        window.addEventListener('requestEspnSync', (event) => {
            const weekNumber = event.detail?.weekNumber || this.getCurrentWeek();
            this.handleManualSync(weekNumber);
        });
    }

    // Check survivor eliminations after game results update
    async checkSurvivorEliminations(weekNumber, updatedGamesCount) {
        try {
            console.log(`🏆 Checking survivor eliminations for Week ${weekNumber}...`);
            
            // Only proceed if we have the SurvivorAutoElimination class available
            if (typeof window.SurvivorAutoElimination === 'undefined') {
                console.log('⚠️ SurvivorAutoElimination not available - skipping elimination check');
                return;
            }
            
            // Initialize survivor auto-elimination system
            const survivorElimination = new window.SurvivorAutoElimination(this.db, this.gameStateCache);
            
            // Check eliminations for this specific week
            // This will process ALL completed games for the week, not just newly updated ones
            const eliminationResult = await survivorElimination.checkEliminationsForWeek(weekNumber);
            
            if (eliminationResult.error) {
                console.error('Survivor elimination check failed:', eliminationResult.error);
                return;
            }
            
            if (eliminationResult.eliminatedCount > 0) {
                console.log(`🚨 SURVIVOR ELIMINATIONS: ${eliminationResult.eliminatedCount} users eliminated in Week ${weekNumber}`);
                
                // Show notification about eliminations
                this.showSyncNotification(
                    `ESPN Sync + Survivor Eliminations: ${updatedGamesCount} games updated, ${eliminationResult.eliminatedCount} users eliminated`,
                    'success'
                );
                
                // Log elimination details
                eliminationResult.details.forEach(elimination => {
                    console.log(`   ❌ ${elimination.userId}: Picked ${elimination.pickedTeam}, ${elimination.winningTeam} won (Game ${elimination.gameId})`);
                });
                
                // Trigger survivor UI updates if survivor page is visible
                window.dispatchEvent(new CustomEvent('survivorEliminationsUpdated', {
                    detail: {
                        weekNumber,
                        eliminatedCount: eliminationResult.eliminatedCount,
                        eliminatedUsers: eliminationResult.details
                    }
                }));
                
            } else {
                console.log(`✅ No new survivor eliminations found for Week ${weekNumber}`);
            }
            
        } catch (error) {
            console.error('Error during survivor elimination check:', error);
        }
    }

    // Add ESPN sync button to admin panel
    addSyncButton() {
        const adminButtons = document.querySelector('#admin-content-game-results .flex.gap-2');
        if (adminButtons && !document.getElementById('espn-sync-btn')) {
            const syncButton = document.createElement('button');
            syncButton.id = 'espn-sync-btn';
            syncButton.className = 'bg-blue-700 text-white text-sm font-medium py-1 px-3 rounded hover:bg-blue-800';
            syncButton.innerHTML = '🔄 Sync ESPN Scores';
            syncButton.addEventListener('click', () => {
                const weekNumber = document.getElementById('admin-week-selector')?.value || this.getCurrentWeek();
                this.handleManualSync(weekNumber);
            });
            
            // Insert after save button
            const saveBtn = document.getElementById('save-results-btn');
            if (saveBtn) {
                saveBtn.parentNode.insertBefore(syncButton, saveBtn.nextSibling);
            } else {
                adminButtons.appendChild(syncButton);
            }
        }
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.EspnScoreSync = EspnScoreSync;
}