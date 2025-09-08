// Clean Survivor System - Simple, Reliable Architecture
// Replaces all the broken patch layers with clean logic

class SurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = 1; // Simple, clear week management
    }

    // Simple game matching: user pick -> find their game -> check winner
    async checkUserSurvival(userPick, weekResults) {
        if (!userPick || !userPick.team) {
            return { status: 'eliminated', reason: 'No pick made' };
        }

        // Find the game the user picked
        let gameId = userPick.gameId;
        
        // CRITICAL FIX: If no gameId, find it by team name
        if (!gameId && userPick.team) {
            gameId = this.findGameIdByTeam(userPick.team, weekResults);
            console.log(`🔧 FIXED: Found gameId ${gameId} for team ${userPick.team}`);
        }
        
        if (!gameId) {
            return { status: 'eliminated', reason: 'Invalid pick - no game found for team' };
        }

        const game = weekResults[gameId];
        if (!game) {
            return { status: 'pending', reason: 'Game not found in results' };
        }

        if (!game.winner || game.winner === 'TBD') {
            return { status: 'pending', reason: 'Game not finished' };
        }

        // Simple comparison: did user's team win?
        if (game.winner === userPick.team) {
            return { status: 'survived', reason: `${userPick.team} won` };
        } else {
            return { status: 'eliminated', reason: `${userPick.team} lost to ${game.winner}` };
        }
    }

    // Get week results from ESPN sync data (single source of truth)
    async getESPNWeekResults(week) {
        try {
            // Use ESPN API if available
            if (typeof window.espnNerdApi !== 'undefined') {
                const espnData = await window.espnNerdApi.getCurrentWeekScores();
                if (espnData && espnData.games) {
                    const weekResults = {};
                    
                    // Convert ESPN data to our format AND map to old game IDs
                    espnData.games.forEach(game => {
                        if (game.id) {
                            // Use ESPN game ID and add team info from game data
                            weekResults[game.id] = {
                                id: game.id,
                                homeTeam: game.home_team || this.extractTeamFromGame(game, 'home'),
                                awayTeam: game.away_team || this.extractTeamFromGame(game, 'away'), 
                                homeScore: game.home_score,
                                awayScore: game.away_score,
                                status: game.status,
                                winner: this.determineWinner(game)
                            };
                            
                            // CRITICAL FIX: Also map by old gameId system for backward compatibility
                            const oldGameId = this.mapToOldGameId(game);
                            if (oldGameId) {
                                weekResults[oldGameId] = weekResults[game.id];
                                console.log(`🔧 MAPPED: ESPN game ${game.id} -> old ID ${oldGameId}`);
                            }
                        }
                    });
                    
                    console.log(`✅ ESPN data loaded: ${Object.keys(weekResults).length} games`);
                    return weekResults;
                }
            }

            // Fallback: Try to get from Firestore if ESPN fails
            const weekResultsDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`));
            const firebaseResults = weekResultsDoc.exists() ? weekResultsDoc.data() : {};
            console.log(`⚠️ Fallback to Firestore: ${Object.keys(firebaseResults).length} games`);
            return firebaseResults;

        } catch (error) {
            console.error('Error getting ESPN week results:', error);
            return {};
        }
    }

    // Determine winner from ESPN game data
    determineWinner(game) {
        if (!game.status || game.status === 'Not Started' || game.status.includes('Q') || game.status.includes('Half')) {
            return 'TBD';
        }
        
        if (game.status === 'Final' || game.status === 'FINAL') {
            const homeScore = parseInt(game.home_score) || 0;
            const awayScore = parseInt(game.away_score) || 0;
            
            if (homeScore > awayScore) {
                return game.home_team;
            } else if (awayScore > homeScore) {
                return game.away_team;
            } else {
                return 'TIE';
            }
        }
        
        return 'TBD';
    }

    // Map ESPN game ID to old internal game ID system
    mapToOldGameId(espnGame) {
        // ESPN IDs like 2210, 2214, 2218, etc. map to our 101, 102, 103, etc.
        // Based on Week 1 mapping from user debug output
        const espnToOldIdMap = {
            '2210': '101',
            '2214': '102', 
            '2218': '103',
            '2219': '104',
            '2220': '105',
            '2221': '106',
            '2222': '107',
            '2223': '108',
            '2227': '109',
            '2228': '110',
            '2229': '111',
            '2230': '112',
            '2231': '113',
            '2232': '114'
        };
        
        return espnToOldIdMap[espnGame.id] || null;
    }

    // Extract team name from ESPN game data
    extractTeamFromGame(game, homeOrAway) {
        if (homeOrAway === 'home') {
            return game.home_team || game.homeTeam || game.home || null;
        } else if (homeOrAway === 'away') {
            return game.away_team || game.awayTeam || game.away || null;
        }
        return null;
    }

    // Find game ID by team name (for picks missing gameId)
    findGameIdByTeam(teamName, weekResults) {
        console.log(`🔍 SEARCHING for team: ${teamName}`);
        
        for (const [gameId, game] of Object.entries(weekResults)) {
            console.log(`🔍 GAME ${gameId}:`, game);
            
            // Check all possible team name fields from ESPN data, including winner
            const possibleFields = ['homeTeam', 'awayTeam', 'home_team', 'away_team', 'home', 'away', 'winner'];
            
            for (const field of possibleFields) {
                if (game[field] === teamName) {
                    console.log(`✅ FOUND ${teamName} in game ${gameId} field ${field}`);
                    return gameId;
                }
            }
        }
        
        console.log(`❌ NOT FOUND: ${teamName} in any game`);
        return null;
    }

    // Get pool members and their survival status
    async getPoolSurvivalStatus(poolId) {
        try {
            // Get pool members
            const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`));
            if (!poolDoc.exists()) {
                throw new Error('Pool not found');
            }
            const poolMembers = poolDoc.data();

            // Use ESPN sync data as single source of truth
            const weekResults = await this.getESPNWeekResults(this.currentWeek);
            console.log('🏈 Using ESPN sync data for Week', this.currentWeek);
            console.log('🔍 Available ESPN games:', Object.keys(weekResults));
            console.log('🔍 Sample ESPN game:', Object.values(weekResults)[0]);
            console.log('🔍 DEBUG: All game data structure:', weekResults);

            // Get elimination status
            const statusDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`));
            const allStatuses = statusDoc.exists() ? statusDoc.data() : {};

            const results = [];

            for (const [uid, member] of Object.entries(poolMembers)) {
                // Check if already eliminated
                const currentStatus = allStatuses[uid];
                if (currentStatus?.eliminated) {
                    results.push({
                        uid,
                        displayName: member.displayName || member.email,
                        status: 'eliminated',
                        eliminatedWeek: currentStatus.eliminatedWeek,
                        reason: currentStatus.eliminationReason,
                        isEliminated: true
                    });
                    continue;
                }

                // Get user's pick for current week
                const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`));
                const picks = picksDoc.exists() ? picksDoc.data().picks || {} : {};
                const userPick = picks[this.currentWeek];
                
                // DEBUG: Log user pick details
                if (userPick) {
                    console.log(`🔍 DEBUG: User ${member.displayName} picked game ${userPick.gameId}, team: ${userPick.team}`);
                }

                // Check survival for this week
                const survival = await this.checkUserSurvival(userPick, weekResults);

                results.push({
                    uid,
                    displayName: member.displayName || member.email,
                    status: survival.status,
                    reason: survival.reason,
                    currentPick: userPick?.team || 'No pick',
                    gameId: userPick?.gameId,
                    isEliminated: survival.status === 'eliminated'
                });

                // If newly eliminated, update status
                if (survival.status === 'eliminated' && !currentStatus?.eliminated) {
                    await this.eliminateUser(uid, this.currentWeek, survival.reason);
                }
            }

            return results;

        } catch (error) {
            console.error('Error getting pool survival status:', error);
            throw error;
        }
    }

    // Simple elimination: mark user as eliminated
    async eliminateUser(uid, week, reason) {
        try {
            const statusRef = doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`);
            await setDoc(statusRef, {
                [`${uid}.eliminated`]: true,
                [`${uid}.eliminatedWeek`]: week,
                [`${uid}.eliminationReason`]: reason,
                [`${uid}.eliminatedDate`]: new Date().toISOString()
            }, { merge: true });

            console.log(`✅ User ${uid} eliminated in Week ${week}: ${reason}`);
        } catch (error) {
            console.error('Error eliminating user:', error);
            throw error;
        }
    }

    // Simple summary counts
    getSummaryStats(results) {
        const total = results.length;
        const eliminated = results.filter(r => r.status === 'eliminated').length;
        const alive = total - eliminated;

        return {
            total,
            alive,
            eliminated,
            currentWeek: this.currentWeek
        };
    }

    // Simple display formatting
    formatUserForDisplay(user) {
        const rowClass = user.isEliminated ? 'survivor-eliminated bg-red-50' : 'survivor-active bg-white';
        
        // Add icons to player names
        const playerNameWithIcon = user.isEliminated 
            ? `<i class="fas fa-skull text-red-500 mr-2"></i>${user.displayName}`
            : `<i class="fas fa-heart text-green-500 mr-2"></i>${user.displayName}`;
            
        const statusBadge = user.isEliminated 
            ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                 Eliminated
               </span>`
            : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                 Active
               </span>`;

        // Show eliminated week data
        const eliminatedWeek = user.isEliminated && user.eliminatedWeek 
            ? `Week ${user.eliminatedWeek}` 
            : '-';

        return {
            rowClass,
            statusBadge,
            playerNameWithIcon,
            currentPick: user.currentPick || 'No pick',
            eliminatedWeek,
            reason: user.reason || ''
        };
    }
}

// Global instance
window.survivorSystem = null;

// Initialize function with retry logic
async function initializeSurvivorSystem(retryCount = 0) {
    const maxRetries = 10;
    const retryDelay = 500; // 500ms
    
    if (typeof window.db === 'undefined' || typeof window.functions === 'undefined') {
        if (retryCount < maxRetries) {
            const missing = [];
            if (typeof window.db === 'undefined') missing.push('db');
            if (typeof window.functions === 'undefined') missing.push('functions');
            console.log(`🔄 Firebase ${missing.join(', ')} not ready yet, retry ${retryCount + 1}/${maxRetries} in ${retryDelay}ms`);
            setTimeout(() => initializeSurvivorSystem(retryCount + 1), retryDelay);
            return;
        } else {
            console.error('❌ Firebase db/functions not available for survivor system after maximum retries');
            return;
        }
    }

    window.survivorSystem = new SurvivorSystem(window.db);
    console.log('✅ Clean Survivor System initialized');
}

// Auto-initialize when DOM is ready with delayed start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Add a small delay to allow Firebase to initialize
        setTimeout(initializeSurvivorSystem, 100);
    });
} else {
    // Add a small delay to allow Firebase to initialize
    setTimeout(initializeSurvivorSystem, 100);
}