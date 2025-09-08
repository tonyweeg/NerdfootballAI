// Clean Survivor System - Simple, Reliable Architecture
// Replaces all the broken patch layers with clean logic

class SurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = 1; // Simple, clear week management
    }

    // DIAMOND LEVEL: Use internal schedule + ESPN results  
    async checkUserSurvival(userPick, weekResults) {
        if (!userPick || !userPick.team) {
            return { status: 'eliminated', reason: 'No pick made' };
        }

        console.log(`🔍 CHECKING: User picked ${userPick.team} in internal game ${userPick.gameId}`);

        // Step 1: Get the actual game matchup from internal schedule
        const gameInfo = await this.getGameInfoFromSchedule(userPick.gameId);
        if (!gameInfo) {
            return { status: 'eliminated', reason: `Invalid game ID: ${userPick.gameId}` };
        }

        console.log(`🎯 GAME INFO: ${gameInfo.away} @ ${gameInfo.home}`);

        // Step 2: Find the ESPN result that matches this game's participants
        const espnResult = this.findESPNResultByTeams(gameInfo.home, gameInfo.away, weekResults);
        if (!espnResult) {
            return { status: 'pending', reason: 'ESPN result not available yet' };
        }

        console.log(`📊 ESPN RESULT:`, espnResult);

        if (!espnResult.winner || espnResult.winner === 'TBD') {
            return { status: 'pending', reason: 'Game not finished' };
        }

        // Step 3: Check if user's picked team won
        if (espnResult.winner === userPick.team) {
            return { status: 'survived', reason: `${userPick.team} won` };
        } else {
            return { status: 'eliminated', reason: `${userPick.team} lost to ${espnResult.winner}` };
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

    // Get game info from internal schedule using gameId
    async getGameInfoFromSchedule(gameId) {
        try {
            // Load internal schedule data
            const response = await fetch('/nfl_2025_schedule_raw.json');
            const scheduleData = await response.json();
            
            // Find the game by ID in Week 1 (current week)
            const week1 = scheduleData.weeks.find(w => w.week === 1);
            if (!week1) return null;
            
            const game = week1.games.find(g => g.id == gameId);
            if (!game) return null;
            
            return {
                id: game.id,
                home: game.h,
                away: game.a,
                datetime: game.dt,
                stadium: game.stadium
            };
        } catch (error) {
            console.error('Error loading schedule:', error);
            return null;
        }
    }

    // Find ESPN result that matches the home/away team participants 
    findESPNResultByTeams(homeTeam, awayTeam, espnResults) {
        console.log(`🔍 SEARCHING ESPN results for: ${awayTeam} @ ${homeTeam}`);
        
        for (const [espnGameId, result] of Object.entries(espnResults)) {
            console.log(`🔍 ESPN GAME ${espnGameId}:`, result);
            
            // Check if this ESPN result is for a game where one of our teams won
            if (result.winner === homeTeam || result.winner === awayTeam) {
                console.log(`✅ FOUND ESPN result: ${result.winner} won this game`);
                return result;
            }
        }
        
        console.log(`❌ NOT FOUND: No ESPN result for ${awayTeam} @ ${homeTeam}`);
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