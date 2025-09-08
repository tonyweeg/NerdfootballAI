// Clean Survivor System - Simple, Reliable Architecture
// Replaces all the broken patch layers with clean logic

class SurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = 1; // Simple, clear week management
    }

    // DIAMOND LEVEL: Bulletproof survival checking with comprehensive matching
    async checkUserSurvival(userPick, weekResults) {
        if (!userPick || !userPick.team) {
            return { status: 'eliminated', reason: 'No pick made' };
        }

        console.log(`🔍 CHECKING: User picked ${userPick.team} in internal game ${userPick.gameId}`);
        
        // Normalize user's picked team
        const normalizedUserTeam = this.normalizeTeamName(userPick.team);

        // Method 1: Direct lookup by gameId (should work with our new mapping)
        let espnResult = weekResults[userPick.gameId];
        
        if (espnResult) {
            console.log(`✅ DIRECT LOOKUP: Found result for game ${userPick.gameId}:`, espnResult);
        } else {
            console.log(`⚠️  DIRECT LOOKUP FAILED: No result for game ID ${userPick.gameId}`);
            
            // Method 2: Get game info from schedule and find by team participants
            const gameInfo = await this.getGameInfoFromSchedule(userPick.gameId);
            if (!gameInfo) {
                return { status: 'eliminated', reason: `Invalid game ID: ${userPick.gameId}` };
            }

            console.log(`🎯 GAME INFO: ${gameInfo.away} @ ${gameInfo.home}`);
            
            // Find ESPN result by team participants
            espnResult = this.findESPNResultByTeams(gameInfo.home, gameInfo.away, weekResults);
        }
        
        if (!espnResult) {
            console.log(`❌ No ESPN result found for user's game`);
            return { status: 'pending', reason: 'ESPN result not available yet' };
        }

        console.log(`📊 ESPN RESULT:`, espnResult);

        if (!espnResult.winner || espnResult.winner === 'TBD') {
            return { status: 'pending', reason: 'Game not finished' };
        }

        // Normalize winner for comparison
        const normalizedWinner = this.normalizeTeamName(espnResult.winner);
        
        console.log(`🏆 COMPARISON: User picked '${normalizedUserTeam}', Winner is '${normalizedWinner}'`);

        // Check if user's picked team won
        if (normalizedWinner === normalizedUserTeam) {
            return { status: 'survived', reason: `${userPick.team} won` };
        } else {
            return { status: 'eliminated', reason: `${userPick.team} lost to ${espnResult.winner}` };
        }
    }

    // DIAMOND LEVEL: Get week results from ESPN with bulletproof data structure
    async getESPNWeekResults(week) {
        try {
            // Ensure ESPN API is ready
            if (typeof window.espnNerdApi !== 'undefined') {
                await window.espnNerdApi.ensureReady();
                const espnData = await window.espnNerdApi.getCurrentWeekScores();
                
                if (espnData && espnData.games) {
                    const weekResults = {};
                    console.log(`🏈 ESPN returned ${espnData.games.length} games for Week ${week}`);
                    
                    // Load internal schedule for ID mapping
                    const internalSchedule = await this.loadInternalSchedule();
                    const weekGames = internalSchedule?.weeks?.find(w => w.week === week)?.games || [];
                    
                    espnData.games.forEach((espnGame, index) => {
                        // Create comprehensive result object
                        const gameResult = {
                            id: espnGame.id,
                            homeTeam: espnGame.home_team,
                            awayTeam: espnGame.away_team,
                            homeScore: espnGame.home_score || 0,
                            awayScore: espnGame.away_score || 0,
                            status: espnGame.status,
                            winner: this.determineWinnerFromScores(espnGame),
                            espnId: espnGame.id
                        };
                        
                        // Store by ESPN ID
                        weekResults[espnGame.id] = gameResult;
                        
                        // CRITICAL: Map to internal game ID using team matching
                        const matchingInternalGame = this.findMatchingInternalGame(espnGame, weekGames);
                        if (matchingInternalGame) {
                            weekResults[matchingInternalGame.id] = gameResult;
                            console.log(`🔧 MAPPED: ESPN game ${espnGame.id} (${espnGame.away_team} @ ${espnGame.home_team}) -> internal ID ${matchingInternalGame.id}`);
                        } else {
                            console.warn(`⚠️  Could not map ESPN game ${espnGame.id} (${espnGame.away_team} @ ${espnGame.home_team}) to internal schedule`);
                        }
                    });
                    
                    console.log(`✅ ESPN data processed: ${Object.keys(weekResults).length} game mappings created`);
                    return weekResults;
                }
            }

            console.warn('ESPN API not available, falling back to Firestore');
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

    // DIAMOND LEVEL: Bulletproof winner determination from ESPN scores
    determineWinnerFromScores(game) {
        // Check if game is finished
        if (!game.status || game.status === 'Not Started' || game.status.includes('Q') || game.status.includes('Half') || game.status.includes('Scheduled')) {
            return 'TBD';
        }
        
        // Game is finished - determine winner by score
        if (game.status === 'Final' || game.status === 'FINAL' || game.status === 'F') {
            const homeScore = parseInt(game.home_score) || 0;
            const awayScore = parseInt(game.away_score) || 0;
            
            console.log(`🏈 Game ${game.id}: ${game.away_team} (${awayScore}) @ ${game.home_team} (${homeScore}) - Status: ${game.status}`);
            
            if (homeScore > awayScore) {
                console.log(`🏆 Winner: ${game.home_team}`);
                return game.home_team;
            } else if (awayScore > homeScore) {
                console.log(`🏆 Winner: ${game.away_team}`);
                return game.away_team;
            } else {
                console.log(`🤝 Game ended in tie`);
                return 'TIE';
            }
        }
        
        return 'TBD';
    }

    // DIAMOND LEVEL: Load internal schedule for team-based matching
    async loadInternalSchedule() {
        try {
            if (this.cachedSchedule) {
                return this.cachedSchedule;
            }
            
            const response = await fetch('/nfl_2025_schedule_raw.json');
            const scheduleData = await response.json();
            this.cachedSchedule = scheduleData;
            return scheduleData;
        } catch (error) {
            console.error('Error loading internal schedule:', error);
            return null;
        }
    }
    
    // DIAMOND LEVEL: Find matching internal game by team participants
    findMatchingInternalGame(espnGame, internalWeekGames) {
        if (!espnGame.home_team || !espnGame.away_team) {
            return null;
        }
        
        // Try exact team name matches first
        let match = internalWeekGames.find(internalGame => 
            internalGame.h === espnGame.home_team && internalGame.a === espnGame.away_team
        );
        
        if (match) {
            return match;
        }
        
        // Try normalized team name matches
        match = internalWeekGames.find(internalGame => 
            this.normalizeTeamName(internalGame.h) === this.normalizeTeamName(espnGame.home_team) &&
            this.normalizeTeamName(internalGame.a) === this.normalizeTeamName(espnGame.away_team)
        );
        
        return match;
    }
    
    // DIAMOND LEVEL: Team name normalization (matches ESPN API style)
    normalizeTeamName(teamName) {
        if (!teamName) return null;
        
        // Team name mapping for consistency with ESPN data
        const teamMappings = {
            'LA Rams': 'Los Angeles Rams',
            'LA Chargers': 'Los Angeles Chargers', 
            'LV Raiders': 'Las Vegas Raiders',
            'Vegas Raiders': 'Las Vegas Raiders',
            'NY Giants': 'New York Giants',
            'NY Jets': 'New York Jets',
            'TB Buccaneers': 'Tampa Bay Buccaneers',
            'NE Patriots': 'New England Patriots',
            'GB Packers': 'Green Bay Packers',
            'NO Saints': 'New Orleans Saints',
            'KC Chiefs': 'Kansas City Chiefs',
            'SF 49ers': 'San Francisco 49ers'
        };
        
        return teamMappings[teamName] || teamName;
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

    // DIAMOND LEVEL: Bulletproof ESPN result matching by team participants
    findESPNResultByTeams(homeTeam, awayTeam, espnResults) {
        console.log(`🔍 SEARCHING ESPN results for: ${awayTeam} @ ${homeTeam}`);
        
        // Normalize team names for consistent matching
        const normalizedHome = this.normalizeTeamName(homeTeam);
        const normalizedAway = this.normalizeTeamName(awayTeam);
        
        for (const [gameId, result] of Object.entries(espnResults)) {
            if (!result.homeTeam || !result.awayTeam) {
                continue;
            }
            
            const resultHome = this.normalizeTeamName(result.homeTeam);
            const resultAway = this.normalizeTeamName(result.awayTeam);
            
            console.log(`🔍 ESPN GAME ${gameId}: ${resultAway} @ ${resultHome} (Status: ${result.status}, Winner: ${result.winner})`);
            
            // Exact team participant match
            if (resultHome === normalizedHome && resultAway === normalizedAway) {
                console.log(`✅ FOUND EXACT MATCH: ${result.winner || 'TBD'}`);
                return result;
            }
            
            // Also check if either team matches and this could be the game
            if ((resultHome === normalizedHome || resultAway === normalizedAway) &&
                (resultHome === normalizedAway || resultAway === normalizedHome)) {
                console.log(`✅ FOUND PARTICIPANT MATCH: ${result.winner || 'TBD'}`);
                return result;
            }
        }
        
        console.log(`❌ NOT FOUND: No ESPN result matches ${normalizedAway} @ ${normalizedHome}`);
        console.log(`🔍 Available ESPN results:`, Object.keys(espnResults));
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

// DIAMOND LEVEL: Initialize function with enhanced retry logic and ESPN API coordination
async function initializeSurvivorSystem(retryCount = 0) {
    const maxRetries = 15;
    const retryDelay = 400; // 400ms
    
    // Check for all required dependencies
    const missingDeps = [];
    if (typeof window.db === 'undefined') missingDeps.push('db');
    if (typeof window.functions === 'undefined') missingDeps.push('functions');
    if (typeof window.espnNerdApi === 'undefined') missingDeps.push('espnNerdApi');
    
    if (missingDeps.length > 0) {
        if (retryCount < maxRetries) {
            console.log(`🔄 Survivor System waiting for: ${missingDeps.join(', ')} - retry ${retryCount + 1}/${maxRetries}`);
            setTimeout(() => initializeSurvivorSystem(retryCount + 1), retryDelay);
            return;
        } else {
            console.error('❌ Survivor System: Required dependencies not available after maximum retries');
            return;
        }
    }
    
    // Ensure ESPN API is ready before initializing survivor system
    try {
        await window.espnNerdApi.ensureReady();
        window.survivorSystem = new SurvivorSystem(window.db);
        console.log('✅ DIAMOND LEVEL: Survivor System initialized with ESPN API integration');
    } catch (error) {
        console.error('❌ Failed to initialize Survivor System:', error);
        if (retryCount < maxRetries) {
            console.log(`🔄 Retrying Survivor System initialization in ${retryDelay}ms`);
            setTimeout(() => initializeSurvivorSystem(retryCount + 1), retryDelay);
        }
    }
}

// DIAMOND LEVEL: Smart initialization that coordinates with Firebase and ESPN API
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Increased delay to allow Firebase and ESPN API to initialize
        setTimeout(initializeSurvivorSystem, 200);
    });
} else {
    // Increased delay to allow Firebase and ESPN API to initialize
    setTimeout(initializeSurvivorSystem, 200);
}