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
}// SIMPLE SURVIVOR SYSTEM - Fast & Reliable
// Shows: User | Team Picked | Status (Won/Lost/Not Started)

class SimpleSurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = 1;
    }

    // Get simple survivor table data for all pool members - NO CACHING TO AVOID ERRORS
    async getSurvivorTable(poolId) {
        try {
            // Get pool members
            const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`));
            if (!poolDoc.exists()) return [];
            
            const poolMembers = poolDoc.data();
            const results = [];

            // Process all users in the pool
            for (const [uid, member] of Object.entries(poolMembers)) {
                // Calculate status directly (no caching)
                const status = await this.calculateUserStatus(uid, member);
                results.push(status);
            }

            return results;

        } catch (error) {
            return [];
        }
    }

    // Calculate user status from scratch
    async calculateUserStatus(uid, member) {
        try {
            // Get user's pick for current week
            const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`));
            const picks = picksDoc.exists() ? picksDoc.data().picks || {} : {};
            const userPick = picks[this.currentWeek];

            if (!userPick || !userPick.team) {
                return {
                    uid,
                    displayName: member.displayName || member.email,
                    teamPicked: 'No pick',
                    status: 'eliminated',
                    reason: 'No pick made',
                    week: this.currentWeek,
                    cached: false
                };
            }

            // Normalize team name before lookup
            const normalizedTeamName = this.normalizeTeamName(userPick.team);
            
            // Get ESPN result for this team
            const gameResult = await this.getTeamResult(normalizedTeamName);
            
            
            let status, reason;
            if (!gameResult) {
                status = 'not_started';
                reason = 'Game not started';
            } else if (gameResult.winner === 'TBD') {
                status = 'not_started';
                reason = 'Game in progress';
            } else {
                // Normalize winner for comparison
                const normalizedWinner = this.normalizeTeamName(gameResult.winner);
                if (normalizedWinner === normalizedTeamName) {
                    status = 'won';
                    reason = `${userPick.team} won`;
                } else {
                    status = 'lost';
                    reason = `${userPick.team} lost to ${gameResult.winner}`;
                }
            }

            return {
                uid,
                displayName: member.displayName || member.email,
                teamPicked: userPick.team,
                status,
                reason,
                week: this.currentWeek,
                cached: false
            };

        } catch (error) {
            return {
                uid,
                displayName: member.displayName || member.email,
                teamPicked: 'Error',
                status: 'error',
                reason: 'Calculation failed',
                week: this.currentWeek,
                cached: false
            };
        }
    }

    // Get team result from ESPN data
    async getTeamResult(teamName) {
        try {
            // Use ESPN API if available
            if (typeof window.espnNerdApi !== 'undefined') {
                const espnData = await window.espnNerdApi.getCurrentWeekScores();
                if (espnData && espnData.games) {
                    // Find game where this team participated (home or away)
                    const game = espnData.games.find(g => 
                        g.home_team === teamName || g.away_team === teamName
                    );
                    
                    if (game) {
                        // Game found - return actual result
                        return {
                            winner: game.winner || 'TBD',
                            homeScore: game.home_score || 0,
                            awayScore: game.away_score || 0,
                            homeTeam: game.home_team,
                            awayTeam: game.away_team,
                            status: game.status
                        };
                    }
                    
                    // Team didn't play this week
                    return null;
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    // Team name normalization (matches ESPN API style)
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

    // Get cached user status - DISABLED due to Firebase path issues
    async getCachedUserStatus(uid) {
        // Skip caching for now to avoid Firebase document path errors
        return null;
    }

    // Cache user status - DISABLED due to Firebase path issues  
    async cacheUserStatus(uid, status) {
        // Skip caching for now to avoid Firebase document path errors
        return;
    }

    // Clear cache for a specific week (when results change)
    async clearWeekCache(week) {
        try {
            // This would delete the entire cache collection for the week
            // Implementation depends on Firebase batch delete
        } catch (error) {
            // Silent fail
        }
    }

    // Generate simple HTML table
    generateTable(results) {
        if (!results || results.length === 0) {
            return '<p class="text-gray-500 text-center py-8">No users found.</p>';
        }

        const rows = results.map(user => {
            const statusClass = {
                'won': 'text-green-700 bg-green-100',
                'lost': 'text-red-700 bg-red-100', 
                'not_started': 'text-gray-700 bg-gray-100',
                'eliminated': 'text-red-700 bg-red-100',
                'error': 'text-orange-700 bg-orange-100'
            };

            const statusText = {
                'won': 'Won',
                'lost': 'Lost',
                'not_started': 'Not Started', 
                'eliminated': 'Eliminated',
                'error': 'Error'
            };

            return `
                <tr class="border-b border-gray-200">
                    <td class="px-4 py-3 font-medium">${user.displayName}</td>
                    <td class="px-4 py-3">${user.teamPicked}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusClass[user.status] || 'text-gray-700 bg-gray-100'}">
                            ${statusText[user.status] || user.status}
                        </span>
                        ${user.cached ? '<span class="text-xs text-gray-400 ml-2">(cached)</span>' : ''}
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Picked</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }
}

// Global initialization
window.simpleSurvivorSystem = null;

async function initializeSimpleSurvivor() {
    if (typeof window.db === 'undefined') {
        setTimeout(initializeSimpleSurvivor, 500);
        return;
    }

    window.simpleSurvivorSystem = new SimpleSurvivorSystem(window.db);
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSimpleSurvivor);
} else {
    initializeSimpleSurvivor();
}// BULLETPROOF SURVIVOR CACHE MANAGER
// Achieves sub-500ms load times through intelligent caching

class SurvivorCacheManager {
    constructor(db) {
        this.db = db;
        this.cacheVersion = '2.0.0';
        this.cacheValidityMinutes = 5; // During active games
        this.staleCacheValidityMinutes = 60; // After games finish
        this.pendingRequests = new Map(); // Prevent duplicate requests
    }

    // Get cached results or compute fresh
    async getCachedOrCompute(poolId, week) {
        const startTime = performance.now();
        const requestKey = `${poolId}-${week}`;
        
        // Check if we already have a pending request for this data
        if (this.pendingRequests.has(requestKey)) {
            console.log('Request already in progress, waiting...');
            return this.pendingRequests.get(requestKey);
        }
        
        // Create the request promise
        const requestPromise = this._performCachedOrCompute(poolId, week, startTime);
        
        // Store it to prevent duplicates
        this.pendingRequests.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Clean up after request completes
            this.pendingRequests.delete(requestKey);
        }
    }
    
    async _performCachedOrCompute(poolId, week, startTime) {
        try {
            // Try to get cached results first
            const cached = await this.getCachedResults(poolId, week);
            
            if (cached) {
                console.log('Cache found, checking validity...');
                if (this.isCacheValid(cached)) {
                    const loadTime = performance.now() - startTime;
                    console.log(`⚡ CACHE HIT: Loaded in ${loadTime.toFixed(0)}ms`);
                    return {
                        results: cached.results,
                        stats: cached.stats,
                        fromCache: true,
                        loadTimeMs: loadTime
                    };
                } else {
                    console.log('Cache invalid, will compute fresh');
                }
            } else {
                console.log('No cache found, will compute fresh');
            }

            // Cache miss or invalid - compute fresh
            const fresh = await this.computeFreshResults(poolId, week);
            
            // Store in cache for next time
            await this.setCachedResults(poolId, week, fresh);
            
            const loadTime = performance.now() - startTime;
            
            return {
                ...fresh,
                fromCache: false,
                loadTimeMs: loadTime
            };
            
        } catch (error) {
            console.error('Cache manager error:', error);
            // Fallback to simple computation
            return this.computeFreshResults(poolId, week);
        }
    }

    // Get cached results from Firestore
    async getCachedResults(poolId, week) {
        try {
            const cacheRef = this.db.collection('survivor-cache').doc(poolId).collection('results').doc(week.toString());
            const cacheDoc = await cacheRef.get();
            
            if (cacheDoc.exists) {
                return cacheDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Error getting cached results:', error);
            return null;
        }
    }

    // Check if cache is still valid
    isCacheValid(cached) {
        if (!cached || !cached.generatedAt) return false;
        
        // Handle both Firestore timestamp and regular Date
        let cacheTime;
        if (cached.generatedAt.toMillis) {
            cacheTime = cached.generatedAt.toMillis();
        } else if (cached.generatedAt instanceof Date) {
            cacheTime = cached.generatedAt.getTime();
        } else {
            cacheTime = new Date(cached.generatedAt).getTime();
        }
        
        const cacheAge = Date.now() - cacheTime;
        const maxAge = this.cacheValidityMinutes * 60 * 1000;
        
        // Check cache version
        if (cached.cacheVersion !== this.cacheVersion) {
            return false;
        }
        
        // Check age
        if (cacheAge > maxAge) {
            return false;
        }
        
        // Check if any tracked games changed status
        if (cached.gamesTracked) {
            // Would check ESPN for status changes here
            // For now, trust time-based invalidation
        }
        
        return true;
    }

    // Compute fresh results (optimized)
    async computeFreshResults(poolId, week) {
        const startTime = performance.now();
        
        try {
            // Get pool members (single read)
            const poolRef = this.db.doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`);
            const poolDoc = await poolRef.get();
            
            if (!poolDoc.exists) {
                return { results: {}, stats: {} };
            }
            
            const poolMembers = poolDoc.data();
            
            // Get ESPN data ONCE for all users
            let espnGames = null;
            if (window.espnNerdApi) {
                espnGames = await window.espnNerdApi.getCurrentWeekScores();
            }
            
            // Batch read all user picks in parallel - OPTIMIZED
            console.log(`Reading picks for ${Object.keys(poolMembers).length} users...`);
            const batchStartTime = performance.now();
            
            const userPickPromises = Object.keys(poolMembers).map(uid =>
                this.db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`).get()
            );
            
            const userPickDocs = await Promise.all(userPickPromises);
            console.log(`Batch read completed in ${(performance.now() - batchStartTime).toFixed(0)}ms`);
            const userPicks = {};
            
            userPickDocs.forEach((doc, index) => {
                const uid = Object.keys(poolMembers)[index];
                if (doc.exists) {
                    userPicks[uid] = doc.data().picks || {};
                }
            });
            
            // Process all users
            const results = {};
            let activePlayers = 0;
            let eliminatedPlayers = 0;
            
            for (const [uid, member] of Object.entries(poolMembers)) {
                const picks = userPicks[uid] || {};
                const weekPick = picks[week];
                
                let status = 'no_pick';
                let eliminatedWeek = null;
                let eliminationReason = 'No pick made';
                
                if (weekPick && weekPick.team) {
                    // Normalize team name
                    const normalizedTeam = this.normalizeTeamName(weekPick.team);
                    
                    // Find game result
                    const gameResult = this.findGameResult(normalizedTeam, espnGames);
                    
                    if (gameResult) {
                        if (gameResult.winner === 'TBD' || !gameResult.winner) {
                            status = 'pending';
                            eliminationReason = 'Game in progress';
                        } else if (gameResult.winner === normalizedTeam) {
                            status = 'survived';
                            eliminationReason = null;
                        } else {
                            status = 'eliminated';
                            eliminatedWeek = week;
                            eliminationReason = `Lost to ${gameResult.winner}`;
                        }
                    }
                }
                
                results[uid] = {
                    uid,
                    displayName: member.displayName || member.email,
                    status,
                    eliminatedWeek,
                    eliminationReason,
                    currentPick: weekPick?.team || 'No pick',
                    isEliminated: status === 'eliminated' || status === 'no_pick'
                };
                
                if (results[uid].isEliminated) {
                    eliminatedPlayers++;
                } else {
                    activePlayers++;
                }
            }
            
            const computeTime = performance.now() - startTime;
            
            return {
                week,
                poolId,
                generatedAt: new Date(),
                cacheVersion: this.cacheVersion,
                results,
                stats: {
                    totalPlayers: Object.keys(poolMembers).length,
                    activePlayers,
                    eliminatedPlayers,
                    pendingPlayers: 0
                },
                gamesTracked: this.extractGameInfo(espnGames),
                metadata: {
                    computationTimeMs: computeTime,
                    apiCalls: 1,
                    generatedBy: 'SurvivorCacheManager'
                }
            };
            
        } catch (error) {
            console.error('Error computing fresh results:', error);
            return { results: {}, stats: {} };
        }
    }

    // Store results in cache
    async setCachedResults(poolId, week, data) {
        try {
            const cacheRef = this.db.collection('survivor-cache').doc(poolId).collection('results').doc(week.toString());
            await cacheRef.set({
                ...data,
                generatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error setting cache:', error);
        }
    }

    // Find game result for a team
    findGameResult(teamName, espnGames) {
        if (!espnGames || !espnGames.games) return null;
        
        return espnGames.games.find(g =>
            g.home_team === teamName || g.away_team === teamName
        );
    }

    // Extract game info for tracking
    extractGameInfo(espnGames) {
        if (!espnGames || !espnGames.games) return {};
        
        const games = {};
        espnGames.games.forEach(game => {
            games[game.id] = {
                status: game.status,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                winner: game.winner,
                lastChecked: new Date()
            };
        });
        return games;
    }

    // Team name normalization (matches survivor system)
    normalizeTeamName(teamName) {
        if (!teamName) return null;
        
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

    // Invalidate cache for a week
    async invalidateCache(poolId, week) {
        try {
            const cacheRef = this.db.collection('survivor-cache').doc(poolId).collection('results').doc(week.toString());
            await cacheRef.delete();
            console.log(`Cache invalidated for pool ${poolId} week ${week}`);
        } catch (error) {
            console.error('Error invalidating cache:', error);
        }
    }

    // Warm the cache (pre-compute and store)
    async warmCache(poolId, week) {
        console.log(`🔥 Warming cache for pool ${poolId} week ${week}...`);
        const results = await this.computeFreshResults(poolId, week);
        await this.setCachedResults(poolId, week, results);
        console.log('✅ Cache warmed successfully');
        return results;
    }

    // Clear all caches
    async clearAllCaches(poolId) {
        console.log(`🗑️ Clearing all caches for pool ${poolId}...`);
        // Would need to list and delete all week documents
        // For now, clear current week
        const currentWeek = 1; // Get from week manager
        await this.invalidateCache(poolId, currentWeek);
    }
}

// Initialize when ready
window.survivorCacheManager = null;

async function initializeSurvivorCache() {
    if (typeof window.db === 'undefined') {
        setTimeout(initializeSurvivorCache, 500);
        return;
    }
    
    // Wait for Firebase to be fully ready
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        setTimeout(initializeSurvivorCache, 500);
        return;
    }
    
    window.survivorCacheManager = new SurvivorCacheManager(window.db);
    console.log('⚡ Survivor Cache Manager initialized');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSurvivorCache);
} else {
    initializeSurvivorCache();
}// OPTIMIZED SURVIVOR LOADER
// Sub-500ms performance through intelligent caching and batch operations

class OptimizedSurvivorLoader {
    constructor() {
        this.performanceTarget = 500; // milliseconds
        this.metrics = {
            loads: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalLoadTime: 0,
            targetMet: 0
        };
    }

    // Main loading function - replaces simpleSurvivorSystem.getSurvivorTable
    async loadSurvivorData(poolId) {
        const startTime = performance.now();
        this.metrics.loads++;
        
        try {
            // Get current week
            const currentWeek = this.getCurrentWeek();
            
            // Use cache manager if available
            if (window.survivorCacheManager) {
                const cached = await window.survivorCacheManager.getCachedOrCompute(poolId, currentWeek);
                
                // Track metrics
                const loadTime = performance.now() - startTime;
                this.updateMetrics(loadTime, cached.fromCache);
                
                // Transform to table format
                const tableData = this.transformToTableFormat(cached.results, cached.stats);
                
                // Log performance
                this.logPerformance(loadTime, cached.fromCache);
                
                return {
                    data: tableData,
                    stats: cached.stats,
                    loadTimeMs: loadTime,
                    fromCache: cached.fromCache
                };
            }
            
            // Fallback to simple system
            console.log('⚠️ Cache manager not available, using simple system');
            return this.fallbackToSimpleSystem(poolId);
            
        } catch (error) {
            console.error('Optimized loader error:', error);
            return this.fallbackToSimpleSystem(poolId);
        }
    }

    // Transform cached results to table format
    transformToTableFormat(results, stats) {
        if (!results) return [];
        
        // Convert object to array and sort
        const tableData = Object.values(results).map(user => ({
            uid: user.uid,
            displayName: user.displayName,
            teamPicked: user.currentPick,
            status: this.mapStatus(user.status),
            reason: user.eliminationReason || '',
            week: user.eliminatedWeek || null,
            cached: true
        }));
        
        // Sort: active users first, then eliminated
        tableData.sort((a, b) => {
            if (a.status !== b.status) {
                const statusOrder = { 'won': 0, 'pending': 1, 'not_started': 2, 'lost': 3, 'eliminated': 4 };
                return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
            }
            return a.displayName.localeCompare(b.displayName);
        });
        
        return tableData;
    }

    // Map internal status to display status
    mapStatus(status) {
        const statusMap = {
            'survived': 'won',
            'eliminated': 'lost',
            'pending': 'not_started',
            'no_pick': 'eliminated'
        };
        return statusMap[status] || status;
    }

    // Fallback to simple survivor system
    async fallbackToSimpleSystem(poolId) {
        const startTime = performance.now();
        
        if (window.simpleSurvivorSystem) {
            const results = await window.simpleSurvivorSystem.getSurvivorTable(poolId);
            const loadTime = performance.now() - startTime;
            
            this.updateMetrics(loadTime, false);
            this.logPerformance(loadTime, false);
            
            return {
                data: results,
                stats: this.calculateStats(results),
                loadTimeMs: loadTime,
                fromCache: false
            };
        }
        
        throw new Error('No survivor loading system available');
    }

    // Calculate stats from results
    calculateStats(results) {
        const total = results.length;
        const eliminated = results.filter(r => 
            r.status === 'lost' || r.status === 'eliminated'
        ).length;
        const active = total - eliminated;
        
        return {
            totalPlayers: total,
            activePlayers: active,
            eliminatedPlayers: eliminated
        };
    }

    // Get current week (simplified)
    getCurrentWeek() {
        // Use global currentWeek variable if available
        if (typeof window.currentWeek !== 'undefined') {
            return window.currentWeek;
        }
        return 1; // Default to week 1
    }

    // Update performance metrics
    updateMetrics(loadTime, fromCache) {
        if (fromCache) {
            this.metrics.cacheHits++;
        } else {
            this.metrics.cacheMisses++;
        }
        
        this.metrics.totalLoadTime += loadTime;
        
        if (loadTime <= this.performanceTarget) {
            this.metrics.targetMet++;
        }
    }

    // Log performance information
    logPerformance(loadTime, fromCache) {
        const targetMet = loadTime <= this.performanceTarget;
        const icon = targetMet ? '✅' : '⚠️';
        const source = fromCache ? 'CACHE' : 'FRESH';
        
        console.log(
            `${icon} Survivor Load: ${loadTime.toFixed(0)}ms (${source}) - Target: ${this.performanceTarget}ms`
        );
    }

    // Get performance report
    getPerformanceReport() {
        const hitRate = this.metrics.loads > 0 
            ? (this.metrics.cacheHits / this.metrics.loads * 100).toFixed(1)
            : 0;
        
        const avgLoadTime = this.metrics.loads > 0
            ? (this.metrics.totalLoadTime / this.metrics.loads).toFixed(0)
            : 0;
        
        const targetMetRate = this.metrics.loads > 0
            ? (this.metrics.targetMet / this.metrics.loads * 100).toFixed(1)
            : 0;
        
        return {
            totalLoads: this.metrics.loads,
            cacheHitRate: `${hitRate}%`,
            averageLoadTime: `${avgLoadTime}ms`,
            targetMetRate: `${targetMetRate}%`,
            performanceTarget: `${this.performanceTarget}ms`
        };
    }

    // Generate optimized HTML table
    generateOptimizedTable(results) {
        if (!results || results.length === 0) {
            return '<p class="text-gray-500 text-center py-8">No users found.</p>';
        }

        const rows = results.map(user => {
            const statusClass = {
                'won': 'text-green-700 bg-green-100',
                'lost': 'text-red-700 bg-red-100',
                'not_started': 'text-gray-700 bg-gray-100',
                'eliminated': 'text-red-700 bg-red-100',
                'error': 'text-orange-700 bg-orange-100'
            };

            const statusText = {
                'won': 'Won',
                'lost': 'Lost',
                'not_started': 'Not Started',
                'eliminated': 'Eliminated',
                'error': 'Error'
            };

            return `
                <tr class="border-b border-gray-200">
                    <td class="px-4 py-3 font-medium">${user.displayName}</td>
                    <td class="px-4 py-3">${user.teamPicked}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusClass[user.status] || 'text-gray-700 bg-gray-100'}">
                            ${statusText[user.status] || user.status}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Picked</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Performance testing functions
    async testColdLoad(poolId) {
        console.log('🧪 Testing cold load (no cache)...');
        
        // Invalidate cache first
        if (window.survivorCacheManager) {
            await window.survivorCacheManager.invalidateCache(poolId, this.getCurrentWeek());
        }
        
        // Load without cache
        const result = await this.loadSurvivorData(poolId);
        
        console.log(`Cold load time: ${result.loadTimeMs.toFixed(0)}ms`);
        return result.loadTimeMs;
    }

    async testWarmLoad(poolId) {
        console.log('🧪 Testing warm load (with cache)...');
        
        // Warm cache first
        if (window.survivorCacheManager) {
            await window.survivorCacheManager.warmCache(poolId, this.getCurrentWeek());
        }
        
        // Load with cache
        const result = await this.loadSurvivorData(poolId);
        
        console.log(`Warm load time: ${result.loadTimeMs.toFixed(0)}ms`);
        return result.loadTimeMs;
    }
}

// Initialize globally
window.optimizedSurvivorLoader = new OptimizedSurvivorLoader();// UNIFIED SURVIVOR MANAGER - PHAROAH'S BULLETPROOF ARCHITECTURE
// One document to rule them all - Sub-500ms performance guaranteed

class UnifiedSurvivorManager {
    constructor(db) {
        this.db = db;
        this.currentYear = 2025;
        this.poolId = 'nerduniverse-2025';
        this.cachedWeekData = new Map();
        this.listeners = new Map();
    }

    // Get the unified document path for a week
    getWeekDocRef(weekNumber) {
        const path = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${this.currentYear}/weeks/${weekNumber}`;
        return doc(db, path);
    }

    // Initialize week document structure
    async initializeWeekDocument(weekNumber) {
        const docRef = this.getWeekDocRef(weekNumber);
        
        const initialDoc = {
            weekNumber,
            year: this.currentYear,
            poolId: this.poolId,
            lastUpdated: new Date(),
            version: 1,
            
            // All user picks in one place
            picks: {},
            
            // Game results cached from ESPN
            gameResults: {},
            
            // Week status
            status: {
                locked: false,
                processed: false,
                firstGameTime: null,
                allGamesComplete: false,
                eliminationsProcessed: false
            },
            
            // Pre-computed statistics
            stats: {
                totalActivePlayers: 0,
                totalEliminated: 0,
                totalNoPick: 0,
                pickDistribution: {},
                mostPopularPick: '',
                updatedAt: new Date()
            }
        };
        
        try {
            await setDoc(docRef, initialDoc, { merge: true });
            console.log(`✅ Initialized week ${weekNumber} unified document`);
            return initialDoc;
        } catch (error) {
            console.error('Error initializing week document:', error);
            throw error;
        }
    }

    // Get all survivor data for a week (ONE READ!)
    async getWeekData(weekNumber = null) {
        const week = weekNumber || this.currentWeek || 1;
        const startTime = performance.now();
        
        // Check cache first
        if (this.cachedWeekData.has(week)) {
            const cached = this.cachedWeekData.get(week);
            if (Date.now() - cached.timestamp < 5000) { // 5 second cache
                console.log(`⚡ Cache hit for week ${week}: ${(performance.now() - startTime).toFixed(0)}ms`);
                return cached.data;
            }
        }
        
        const docRef = this.getWeekDocRef(week);
        
        try {
            const doc = await getDoc(docRef);
            
            if (!doc.exists()) {
                // Initialize if doesn't exist
                const newDoc = await this.initializeWeekDocument(week);
                this.cachedWeekData.set(week, {
                    data: newDoc,
                    timestamp: Date.now()
                });
                return newDoc;
            }
            
            const data = doc.data();
            
            // Cache the result
            this.cachedWeekData.set(week, {
                data,
                timestamp: Date.now()
            });
            
            console.log(`✅ Loaded week ${week} in ${(performance.now() - startTime).toFixed(0)}ms`);
            console.log('Week data has users field:', !!data.users, 'User count:', Object.keys(data.users || {}).length);
            return data;
            
        } catch (error) {
            console.error('Error getting week data:', error);
            throw error;
        }
    }

    // Update user pick (atomic transaction)
    async updateUserPick(weekNumber, userId, userDisplayName, teamPicked) {
        const docRef = this.getWeekDocRef(weekNumber);
        
        try {
            await runTransaction(this.db, async (transaction) => {
                const doc = await transaction.get(docRef);
                
                if (!doc.exists()) {
                    throw new Error('Week document not found');
                }
                
                const weekData = doc.data();
                
                // Check if week is locked
                if (weekData.status.locked) {
                    throw new Error('Week is locked - games have started');
                }
                
                // Check if user was eliminated in previous weeks
                if (weekData.picks[userId]?.eliminated) {
                    throw new Error('User is already eliminated');
                }
                
                // Check for duplicate team usage (if we have previous picks)
                const previousPicks = weekData.picks[userId]?.previousPicks || [];
                if (previousPicks.includes(teamPicked)) {
                    throw new Error(`Already used ${teamPicked} in a previous week`);
                }
                
                // Update the pick
                const updatedPick = {
                    teamPicked,
                    displayName: userDisplayName,
                    pickTimestamp: new Date(),
                    eliminated: false,
                    eliminationWeek: null,
                    eliminationReason: null,
                    previousPicks: previousPicks
                };
                
                // Update pick distribution stats
                const pickDistribution = { ...weekData.stats.pickDistribution };
                
                // Remove old pick from distribution if exists
                const oldPick = weekData.picks[userId]?.teamPicked;
                if (oldPick && pickDistribution[oldPick]) {
                    pickDistribution[oldPick]--;
                    if (pickDistribution[oldPick] === 0) {
                        delete pickDistribution[oldPick];
                    }
                }
                
                // Add new pick to distribution
                pickDistribution[teamPicked] = (pickDistribution[teamPicked] || 0) + 1;
                
                // Find most popular pick
                const mostPopularPick = Object.entries(pickDistribution)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
                
                // Count active players (those who made picks and aren't eliminated)
                const activePlayers = Object.values({
                    ...weekData.picks,
                    [userId]: updatedPick
                }).filter(p => p.teamPicked && !p.eliminated).length;
                
                // Perform atomic update
                transaction.update(docRef, {
                    [`picks.${userId}`]: updatedPick,
                    'stats.pickDistribution': pickDistribution,
                    'stats.mostPopularPick': mostPopularPick,
                    'stats.totalActivePlayers': activePlayers,
                    'stats.updatedAt': new Date(),
                    'lastUpdated': new Date(),
                    'version': (weekData.version || 0) + 1
                });
            });
            
            // Clear cache for this week
            this.cachedWeekData.delete(weekNumber);
            
            console.log(`✅ Updated pick for ${userDisplayName}: ${teamPicked}`);
            
        } catch (error) {
            console.error('Error updating pick:', error);
            throw error;
        }
    }

    // Process eliminations after games complete
    async processEliminations(weekNumber, gameResults) {
        const docRef = this.getWeekDocRef(weekNumber);
        
        try {
            await runTransaction(this.db, async (transaction) => {
                const doc = await transaction.get(docRef);
                
                if (!doc.exists()) {
                    throw new Error('Week document not found');
                }
                
                const weekData = doc.data();
                
                if (weekData.status.eliminationsProcessed) {
                    console.log('Eliminations already processed');
                    return;
                }
                
                const updatedPicks = { ...weekData.picks };
                let eliminatedCount = 0;
                let noPickCount = 0;
                
                // Process each user's pick
                for (const [userId, userPick] of Object.entries(weekData.picks)) {
                    if (userPick.eliminated) continue; // Already eliminated
                    
                    if (!userPick.teamPicked) {
                        // No pick = elimination (but don't show these users)
                        updatedPicks[userId] = {
                            ...userPick,
                            eliminated: true,
                            eliminationWeek: weekNumber,
                            eliminationReason: 'no-pick'
                        };
                        noPickCount++;
                        eliminatedCount++;
                        continue;
                    }
                    
                    // Check if team lost
                    const teamResult = gameResults[userPick.teamPicked];
                    if (teamResult && teamResult.completed) {
                        if (teamResult.winner !== userPick.teamPicked) {
                            updatedPicks[userId] = {
                                ...userPick,
                                eliminated: true,
                                eliminationWeek: weekNumber,
                                eliminationReason: 'loss'
                            };
                            eliminatedCount++;
                        }
                    }
                }
                
                // Update document with eliminations
                transaction.update(docRef, {
                    'picks': updatedPicks,
                    'gameResults': gameResults,
                    'status.eliminationsProcessed': true,
                    'status.allGamesComplete': true,
                    'stats.totalEliminated': weekData.stats.totalEliminated + eliminatedCount,
                    'stats.totalNoPick': noPickCount,
                    'stats.totalActivePlayers': weekData.stats.totalActivePlayers - eliminatedCount,
                    'stats.updatedAt': new Date(),
                    'lastUpdated': new Date(),
                    'version': (weekData.version || 0) + 1
                });
            });
            
            // Clear cache
            this.cachedWeekData.delete(weekNumber);
            
            console.log(`✅ Processed eliminations for week ${weekNumber}`);
            
            // Trigger week progression
            await this.progressToNextWeek(weekNumber, weekNumber + 1);
            
        } catch (error) {
            console.error('Error processing eliminations:', error);
            throw error;
        }
    }

    // Progress surviving players to next week
    async progressToNextWeek(currentWeek, nextWeek) {
        const currentDocRef = this.getWeekDocRef(currentWeek);
        
        const nextDocRef = this.getWeekDocRef(nextWeek);
        
        try {
            const currentDoc = await getDoc(currentDocRef);
            if (!currentDoc.exists()) {
                throw new Error('Current week document not found');
            }
            
            const currentData = currentDoc.data();
            const nextWeekPicks = {};
            let survivorCount = 0;
            
            // Carry forward only survivors who made picks
            for (const [userId, userPick] of Object.entries(currentData.picks)) {
                // Skip eliminated users and no-picks
                if (!userPick.eliminated && userPick.teamPicked) {
                    nextWeekPicks[userId] = {
                        teamPicked: null, // Reset for new week
                        displayName: userPick.displayName,
                        pickTimestamp: null,
                        eliminated: false,
                        eliminationWeek: null,
                        eliminationReason: null,
                        previousPicks: [
                            ...(userPick.previousPicks || []),
                            userPick.teamPicked
                        ]
                    };
                    survivorCount++;
                }
            }
            
            // Create or update next week document
            await setDoc(nextDocRef, {
                weekNumber: nextWeek,
                year: this.currentYear,
                poolId: this.poolId,
                lastUpdated: new Date(),
                version: 1,
                picks: nextWeekPicks,
                gameResults: {},
                status: {
                    locked: false,
                    processed: false,
                    firstGameTime: null,
                    allGamesComplete: false,
                    eliminationsProcessed: false
                },
                stats: {
                    totalActivePlayers: survivorCount,
                    totalEliminated: 0,
                    totalNoPick: 0,
                    pickDistribution: {},
                    mostPopularPick: '',
                    updatedAt: new Date()
                }
            }, { merge: true });
            
            console.log(`✅ Progressed ${survivorCount} survivors to week ${nextWeek}`);
            
        } catch (error) {
            console.error('Error progressing to next week:', error);
            throw error;
        }
    }

    // Subscribe to real-time updates for a week
    subscribeToWeek(weekNumber, callback) {
        const docRef = this.getWeekDocRef(weekNumber);
        
        // Unsubscribe from previous listener if exists
        if (this.listeners.has(weekNumber)) {
            this.listeners.get(weekNumber)();
        }
        
        const unsubscribe = docRef.onSnapshot(
            { includeMetadataChanges: false },
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    
                    // Update cache
                    this.cachedWeekData.set(weekNumber, {
                        data,
                        timestamp: Date.now()
                    });
                    
                    callback(data);
                }
            },
            (error) => {
                console.error('Real-time sync error:', error);
            }
        );
        
        this.listeners.set(weekNumber, unsubscribe);
        
        return unsubscribe;
    }

    // Get formatted display data (filters out no-picks)
    async getDisplayData(weekNumber = null) {
        console.log('getDisplayData called for week:', weekNumber || this.currentWeek);
        try {
            // Get the week data first
            const weekData = await this.getWeekData(weekNumber);
            
            console.log('Got week data:', !!weekData, 'Has users:', !!weekData?.users);
            
            if (!weekData || !weekData.users) {
                console.log('No week data found or no users field');
                return [];
            }
            
            // Get pool members for display names
            const membersPath = `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
            const membersDoc = await getDoc(doc(db, membersPath));
            const poolMembers = membersDoc.exists() ? membersDoc.data() : {};
            
            // Filter out users who never made a pick
            const displayPicks = Object.entries(weekData.users)
                .filter(([userId, pick]) => {
                    // Only show users who made a pick at some point
                    return pick.team || pick.hasPicked;
                })
                .map(([userId, pick]) => {
                    const member = poolMembers[userId] || {};
                    return {
                        userId,
                        displayName: member.displayName || member.email || userId,
                        teamPicked: pick.team || 'No pick',
                        status: pick.eliminated ? 'eliminated' : 'active',
                        eliminated: pick.eliminated || false,
                        eliminatedWeek: pick.eliminatedWeek || null,
                        eliminationReason: null
                    };
                });
        
            // Sort: active first, then eliminated
            displayPicks.sort((a, b) => {
                if (a.eliminated !== b.eliminated) {
                    return a.eliminated ? 1 : -1;
                }
                return a.displayName.localeCompare(b.displayName);
            });
            
            console.log(`Returning ${displayPicks.length} users for display`);
            return displayPicks;
            
        } catch (error) {
            console.error('Error getting display data:', error);
            return [];
        }
    }

    // Get status for display
    getPickStatus(pick) {
        if (pick.eliminated) {
            if (pick.eliminationReason === 'no-pick') {
                return 'no_pick';
            }
            return 'eliminated';
        }
        
        if (!pick.teamPicked) {
            return 'pending';
        }
        
        return 'active';
    }

    // Migrate existing individual picks to unified structure
    async migrateToUnifiedStructure(weekNumber) {
        console.log(`🔄 Starting migration to unified structure for week ${weekNumber}...`);
        
        const docRef = this.getWeekDocRef(weekNumber);
        
        try {
            // Get pool members
            const poolMembersPath = `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
            const poolMembersRef = doc(db, poolMembersPath);
            const poolMembersDoc = await getDoc(poolMembersRef);
            
            if (!poolMembersDoc.exists()) {
                throw new Error('Pool members not found');
            }
            
            const poolMembers = poolMembersDoc.data();
            const unifiedPicks = {};
            
            // Read all individual picks in parallel
            const pickPromises = Object.keys(poolMembers).map(async (userId) => {
                const pickPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
                const pickRef = doc(db, pickPath);
                const pickDoc = await getDoc(pickRef);
                
                if (pickDoc.exists()) {
                    const userData = pickDoc.data();
                    const weekPick = userData.picks?.[weekNumber];
                    
                    if (weekPick) {
                        return {
                            userId,
                            displayName: poolMembers[userId].displayName || poolMembers[userId].email,
                            teamPicked: weekPick.team,
                            pickTimestamp: weekPick.timestamp || null,
                            eliminated: false,
                            eliminationWeek: null,
                            eliminationReason: null,
                            previousPicks: []
                        };
                    }
                }
                
                return null;
            });
            
            const picks = await Promise.all(pickPromises);
            
            // Build unified picks object
            picks.forEach(pick => {
                if (pick) {
                    unifiedPicks[pick.userId] = pick;
                }
            });
            
            // Calculate statistics
            const pickDistribution = {};
            Object.values(unifiedPicks).forEach(pick => {
                if (pick.teamPicked) {
                    pickDistribution[pick.teamPicked] = (pickDistribution[pick.teamPicked] || 0) + 1;
                }
            });
            
            const mostPopularPick = Object.entries(pickDistribution)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
            
            // Create unified document
            await setDoc(docRef, {
                weekNumber,
                year: this.currentYear,
                poolId: this.poolId,
                lastUpdated: new Date(),
                version: 1,
                picks: unifiedPicks,
                gameResults: {},
                status: {
                    locked: false,
                    processed: false,
                    firstGameTime: null,
                    allGamesComplete: false,
                    eliminationsProcessed: false
                },
                stats: {
                    totalActivePlayers: Object.keys(unifiedPicks).length,
                    totalEliminated: 0,
                    totalNoPick: 0,
                    pickDistribution,
                    mostPopularPick,
                    updatedAt: new Date()
                }
            });
            
            console.log(`✅ Migration complete! Migrated ${Object.keys(unifiedPicks).length} picks to unified structure`);
            
        } catch (error) {
            console.error('Migration error:', error);
            throw error;
        }
    }
}

// Initialize globally
window.unifiedSurvivorManager = null;

async function initializeUnifiedSurvivor() {
    if (typeof window.db === 'undefined') {
        setTimeout(initializeUnifiedSurvivor, 500);
        return;
    }
    
    window.unifiedSurvivorManager = new UnifiedSurvivorManager(db);
    console.log('⚡ Unified Survivor Manager initialized');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUnifiedSurvivor);
} else {
    initializeUnifiedSurvivor();
}// PHAROAH'S ESPN-SURVIVOR INTEGRATION ENGINE
// Diamond-level architecture for real-time elimination processing

class ESPNSurvivorIntegration {
    constructor() {
        this.db = null;
        this.espnApi = null;
        this.currentWeek = 1;
        this.poolId = 'nerduniverse-2025';
        this.initPromise = null;
        
        // Cache for performance
        this.gameResultsCache = new Map();
        this.eliminationCache = new Map();
        
        // Initialize
        this.initialize();
    }
    
    async initialize() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = new Promise(async (resolve) => {
            const maxRetries = 20;
            let attempt = 0;
            
            const tryInit = async () => {
                if (typeof window.db !== 'undefined' && typeof window.espnNerdApi !== 'undefined') {
                    this.db = window.db;
                    this.espnApi = window.espnNerdApi;
                    this.currentWeek = window.currentWeek || 1;
                    
                    // Ensure ESPN API is ready
                    await this.espnApi.ensureReady();
                    
                    console.log('✅ ESPN-Survivor Integration initialized');
                    resolve(true);
                } else if (attempt < maxRetries) {
                    attempt++;
                    setTimeout(tryInit, 250);
                } else {
                    console.error('❌ Failed to initialize ESPN-Survivor Integration');
                    resolve(false);
                }
            };
            
            tryInit();
        });
        
        return this.initPromise;
    }
    
    // Get unified survivor document with ESPN-validated eliminations
    async getEnhancedSurvivorData(weekNumber = null) {
        await this.initialize();
        
        const week = weekNumber || this.currentWeek;
        const startTime = performance.now();
        
        try {
            // Step 1: Get the unified document
            const docPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${new Date().getFullYear()}/weeks/${week}`;
            const docRef = doc(this.db, docPath);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                console.log('No unified survivor document found for week', week);
                return { users: {}, stats: {}, gameResults: {} };
            }
            
            const survivorData = docSnap.data();
            
            // Step 2: Get ESPN game results
            const espnResults = await this.getESPNResultsForWeek(week);
            
            // Step 3: Process eliminations based on ESPN results
            const processedData = await this.processEliminations(survivorData, espnResults, week);
            
            // Step 4: Calculate accurate stats
            const stats = this.calculateStats(processedData.users);
            
            console.log(`✅ Enhanced survivor data loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
            
            return {
                ...processedData,
                stats,
                loadTimeMs: performance.now() - startTime
            };
            
        } catch (error) {
            console.error('Error getting enhanced survivor data:', error);
            throw error;
        }
    }
    
    // Get ESPN results with intelligent caching
    async getESPNResultsForWeek(week) {
        const cacheKey = `espn_week_${week}`;
        
        // Check cache first
        if (this.gameResultsCache.has(cacheKey)) {
            const cached = this.gameResultsCache.get(cacheKey);
            const cacheAge = Date.now() - cached.timestamp;
            
            // Use cache if less than 30 seconds old for live games, or permanent for completed weeks
            if (cached.allComplete || cacheAge < 30000) {
                console.log('⚡ Using cached ESPN results');
                return cached.results;
            }
        }
        
        try {
            // Get fresh ESPN data
            const espnGames = await this.espnApi.getCurrentWeekScores();
            
            if (!espnGames || !espnGames.games) {
                console.warn('No ESPN games data available');
                return {};
            }
            
            // Process games into results format
            const results = {};
            let allComplete = true;
            
            for (const game of espnGames.games) {
                const gameResult = {
                    id: game.id,
                    homeTeam: game.home_team,
                    awayTeam: game.away_team,
                    homeScore: parseInt(game.home_score) || 0,
                    awayScore: parseInt(game.away_score) || 0,
                    status: game.status,
                    winner: null,
                    completed: false
                };
                
                // Determine winner if game is final
                if (game.status === 'Final' || game.status === 'FINAL' || game.status === 'F' || game.status === 'STATUS_FINAL') {
                    gameResult.completed = true;
                    if (gameResult.homeScore > gameResult.awayScore) {
                        gameResult.winner = game.home_team;
                    } else if (gameResult.awayScore > gameResult.homeScore) {
                        gameResult.winner = game.away_team;
                    } else {
                        gameResult.winner = 'TIE';
                    }
                } else {
                    allComplete = false;
                }
                
                // Store by multiple keys for flexible lookup
                results[game.id] = gameResult;
                
                // Also store by team matchup for easier lookup
                const matchupKey = `${game.away_team}@${game.home_team}`;
                results[matchupKey] = gameResult;
            }
            
            // Cache the results
            this.gameResultsCache.set(cacheKey, {
                results,
                timestamp: Date.now(),
                allComplete
            });
            
            console.log(`📊 ESPN: Processed ${Object.keys(results).length} games, ${allComplete ? 'all complete' : 'some in progress'}`);
            
            return results;
            
        } catch (error) {
            console.error('Error fetching ESPN results:', error);
            return {};
        }
    }
    
    // Process eliminations based on ESPN results
    async processEliminations(survivorData, espnResults, week) {
        const processedUsers = {};
        
        // Get all users from the unified document (check both users and picks fields)
        const users = survivorData.users || survivorData.picks || {};
        
        console.log(`🔍 ESPN PROCESSING: Week ${week}, ${Object.keys(users).length} users, ${Object.keys(espnResults).length} ESPN games`);
        
        for (const [userId, userData] of Object.entries(users)) {
            const processedUser = { ...userData };
            
            // Skip if already eliminated in a previous week
            if (userData.eliminated && userData.eliminatedWeek < week) {
                processedUsers[userId] = processedUser;
                continue;
            }
            
            // Check if user has a pick for this week (handle both team and teamPicked fields)
            const userTeam = userData.team || userData.teamPicked;
            if (!userTeam) {
                // No pick = elimination
                processedUser.eliminated = true;
                processedUser.eliminatedWeek = week;
                processedUser.eliminationReason = 'No pick made';
                processedUser.status = 'eliminated';
            } else {
                // Find the game result for the user's picked team
                const gameResult = this.findGameResultForTeam(userTeam, espnResults);
                
                if (!gameResult) {
                    // Game not found or not started
                    processedUser.status = 'pending';
                    processedUser.gameStatus = 'Not started';
                } else if (!gameResult.completed) {
                    // Game in progress
                    processedUser.status = 'pending';
                    processedUser.gameStatus = 'In progress';
                } else {
                    // Game completed - check if team won
                    const normalizedUserTeam = this.normalizeTeamName(userTeam);
                    const normalizedWinner = this.normalizeTeamName(gameResult.winner);
                    
                    
                    if (normalizedWinner === normalizedUserTeam) {
                        processedUser.status = 'survived';
                        processedUser.eliminated = false;
                        processedUser.gameStatus = 'Won';
                    } else {
                        processedUser.status = 'eliminated';
                        processedUser.eliminated = true;
                        processedUser.eliminatedWeek = week;
                        processedUser.eliminationReason = `Lost to ${gameResult.winner}`;
                        processedUser.gameStatus = 'Lost';
                    }
                }
            }
            
            processedUsers[userId] = processedUser;
        }
        
        return {
            ...survivorData,
            users: processedUsers,
            gameResults: espnResults,
            lastProcessed: new Date().toISOString()
        };
    }
    
    // Find game result for a specific team
    findGameResultForTeam(teamName, espnResults) {
        // Normalize team name for matching
        const normalizedTeam = this.normalizeTeamName(teamName);
        
        for (const result of Object.values(espnResults)) {
            if (!result.homeTeam || !result.awayTeam) continue;
            
            const normalizedHome = this.normalizeTeamName(result.homeTeam);
            const normalizedAway = this.normalizeTeamName(result.awayTeam);
            
            if (normalizedHome === normalizedTeam || normalizedAway === normalizedTeam) {
                return result;
            }
        }
        
        return null;
    }
    
    // Normalize team names for consistent matching
    normalizeTeamName(teamName) {
        if (!teamName) return '';
        
        // Handle common variations
        const mappings = {
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
        
        return mappings[teamName] || teamName;
    }
    
    // Calculate accurate statistics
    calculateStats(users) {
        let total = 0;
        let active = 0;
        let eliminated = 0;
        let pending = 0;
        let noPick = 0;
        
        for (const user of Object.values(users)) {
            total++;
            
            if (user.eliminated) {
                eliminated++;
                if (user.eliminationReason === 'No pick made') {
                    noPick++;
                }
            } else if (user.status === 'pending') {
                pending++;
            } else {
                active++;
            }
        }
        
        return {
            totalPlayers: total,
            activePlayers: active,
            eliminatedPlayers: eliminated,
            pendingPlayers: pending,
            noPickPlayers: noPick
        };
    }
    
    // Get display-ready data for the UI
    async getDisplayData(weekNumber = null) {
        const enhancedData = await this.getEnhancedSurvivorData(weekNumber);
        
        // Get pool members for display names
        const membersPath = `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
        const membersDoc = await getDoc(doc(this.db, membersPath));
        const poolMembers = membersDoc.exists() ? membersDoc.data() : {};
        
        // Transform to display format
        const displayData = [];
        
        for (const [userId, userData] of Object.entries(enhancedData.users)) {
            const member = poolMembers[userId] || {};
            
            displayData.push({
                userId,
                displayName: member.displayName || member.email || userId,
                teamPicked: userData.team || userData.teamPicked || 'No pick',
                status: userData.status || 'pending',
                eliminated: userData.eliminated || false,
                eliminatedWeek: userData.eliminatedWeek || null,
                eliminationReason: userData.eliminationReason || null,
                gameStatus: userData.gameStatus || 'Unknown',
                isEliminated: userData.eliminated || false
            });
        }
        
        // Sort: active first, then by name
        displayData.sort((a, b) => {
            if (a.eliminated !== b.eliminated) {
                return a.eliminated ? 1 : -1;
            }
            return a.displayName.localeCompare(b.displayName);
        });
        
        return {
            data: displayData,
            stats: enhancedData.stats,
            gameResults: enhancedData.gameResults,
            loadTimeMs: enhancedData.loadTimeMs
        };
    }
    
    // Update elimination status in Firestore (admin function)
    async persistEliminations(weekNumber = null) {
        await this.initialize();
        
        const week = weekNumber || this.currentWeek;
        const enhancedData = await this.getEnhancedSurvivorData(week);
        
        // Update the unified document with processed eliminations
        const docPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${new Date().getFullYear()}/weeks/${week}`;
        const docRef = doc(this.db, docPath);
        
        try {
            await updateDoc(docRef, {
                users: enhancedData.users,
                gameResults: enhancedData.gameResults,
                stats: enhancedData.stats,
                lastProcessed: new Date().toISOString(),
                processedByESPN: true
            });
            
            console.log('✅ Eliminations persisted to Firestore');
            return { success: true, stats: enhancedData.stats };
            
        } catch (error) {
            console.error('Error persisting eliminations:', error);
            throw error;
        }
    }
}

// Initialize globally
window.espnSurvivorIntegration = new ESPNSurvivorIntegration();

// Auto-initialize when dependencies are ready
async function autoInitESPNSurvivor() {
    if (typeof window.db !== 'undefined' && typeof window.espnNerdApi !== 'undefined') {
        await window.espnSurvivorIntegration.initialize();
        console.log('⚡ ESPN-Survivor Integration ready');
    } else {
        setTimeout(autoInitESPNSurvivor, 500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitESPNSurvivor);
} else {
    autoInitESPNSurvivor();
}// DIAMOND LEVEL: Migration Script to Populate Unified Survivor Document
// Runs ONCE to migrate all existing picks to the unified structure

class SurvivorMigration {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.currentYear = 2025;
        this.currentWeek = window.currentWeek || 1;
    }

    async runMigration() {
        console.log('🚀 Starting survivor migration to unified document...');
        const startTime = performance.now();
        
        try {
            // 1. Get all pool members
            console.log('📥 Loading pool members...');
            const membersPath = `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
            const membersDoc = await getDoc(doc(db, membersPath));
            
            if (!membersDoc.exists()) {
                throw new Error('Pool members not found');
            }
            
            const poolMembers = membersDoc.data();
            const userIds = Object.keys(poolMembers);
            console.log(`Found ${userIds.length} pool members`);
            
            // 2. Load all existing elimination statuses
            console.log('📊 Loading elimination statuses...');
            const statusPath = 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status';
            const statusDoc = await getDoc(doc(db, statusPath));
            const eliminationStatuses = statusDoc.exists() ? statusDoc.data() : {};
            
            // 3. Process each week
            const migrationResults = {};
            
            for (let week = 1; week <= this.currentWeek; week++) {
                console.log(`\n📅 Processing Week ${week}...`);
                const weekData = {
                    weekNumber: week,
                    year: this.currentYear,
                    users: {},
                    lastUpdated: new Date(),
                    migrated: true
                };
                
                // 4. Load all user picks for this week
                const pickPromises = userIds.map(async (uid) => {
                    try {
                        const pickPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`;
                        const pickDoc = await getDoc(doc(db, pickPath));
                        
                        if (pickDoc.exists()) {
                            const userData = pickDoc.data();
                            const weekPick = userData.picks?.[week];
                            
                            if (weekPick && weekPick.team) {
                                return {
                                    uid,
                                    pick: weekPick,
                                    eliminated: eliminationStatuses[uid]?.eliminated || false,
                                    eliminatedWeek: eliminationStatuses[uid]?.eliminatedWeek || null
                                };
                            }
                        }
                        
                        // Check if user was eliminated before this week
                        const wasEliminated = eliminationStatuses[uid]?.eliminated || false;
                        const eliminatedWeek = eliminationStatuses[uid]?.eliminatedWeek || null;
                        
                        if (wasEliminated && eliminatedWeek && eliminatedWeek < week) {
                            // User was eliminated in a previous week
                            return {
                                uid,
                                pick: null,
                                eliminated: true,
                                eliminatedWeek
                            };
                        }
                        
                        return null;
                    } catch (error) {
                        console.error(`Error loading pick for ${uid}:`, error);
                        return null;
                    }
                });
                
                const userPicks = await Promise.all(pickPromises);
                let activePicks = 0;
                let eliminatedUsers = 0;
                
                // 5. Build week data structure
                userPicks.forEach(userPick => {
                    if (userPick) {
                        const { uid, pick, eliminated, eliminatedWeek } = userPick;
                        
                        if (pick) {
                            weekData.users[uid] = {
                                team: pick.team,
                                gameId: pick.gameId || null,  // Handle undefined gameId
                                timestamp: pick.timestamp || new Date(),
                                eliminated: eliminated || false,
                                eliminatedWeek: eliminatedWeek || null,  // Handle undefined eliminatedWeek
                                hasPicked: true
                            };
                            
                            if (eliminated) {
                                eliminatedUsers++;
                            } else {
                                activePicks++;
                            }
                        } else if (eliminated) {
                            // User was eliminated in a previous week
                            weekData.users[uid] = {
                                team: null,
                                gameId: null,
                                timestamp: null,
                                eliminated: true,
                                eliminatedWeek: eliminatedWeek,
                                hasPicked: false
                            };
                            eliminatedUsers++;
                        }
                    }
                });
                
                console.log(`Week ${week}: ${activePicks} active picks, ${eliminatedUsers} eliminated`);
                
                // 6. Save week data to unified document
                const weekDocPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${this.currentYear}/weeks/${week}`;
                await setDoc(doc(db, weekDocPath), weekData);
                
                migrationResults[week] = {
                    totalUsers: Object.keys(weekData.users).length,
                    activePicks,
                    eliminatedUsers
                };
            }
            
            // 7. Create migration summary
            const migrationSummary = {
                poolId: this.poolId,
                migratedAt: new Date(),
                weeksProcessed: this.currentWeek,
                totalUsers: userIds.length,
                results: migrationResults,
                duration: performance.now() - startTime
            };
            
            // Save migration summary
            const migrationLogPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/migration_log`;
            await setDoc(doc(db, migrationLogPath), migrationSummary);
            
            console.log('\n✅ MIGRATION COMPLETE!');
            console.log(`Total time: ${migrationSummary.duration.toFixed(0)}ms`);
            console.log('Migration summary:', migrationResults);
            
            return migrationSummary;
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }
    
    // Verify migration was successful
    async verifyMigration() {
        console.log('\n🔍 Verifying migration...');
        
        try {
            for (let week = 1; week <= this.currentWeek; week++) {
                const weekDocPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${this.currentYear}/weeks/${week}`;
                const weekDoc = await getDoc(doc(db, weekDocPath));
                
                if (!weekDoc.exists()) {
                    console.error(`❌ Week ${week} document missing!`);
                    return false;
                }
                
                const data = weekDoc.data();
                const userCount = Object.keys(data.users || {}).length;
                console.log(`✅ Week ${week}: ${userCount} users found`);
            }
            
            console.log('✅ Migration verified successfully!');
            return true;
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
            return false;
        }
    }
    
    // One-click migration with verification
    async runFullMigration() {
        try {
            // Run migration
            const results = await this.runMigration();
            
            // Verify it worked
            const verified = await this.verifyMigration();
            
            if (verified) {
                console.log('\n🎉 MIGRATION SUCCESSFUL!');
                console.log('The unified survivor system is now ready to use.');
                console.log('Refresh the page to see sub-500ms load times!');
                
                // Unified manager is already initialized automatically
                if (window.unifiedSurvivorManager) {
                    console.log('✅ Unified manager ready');
                }
            } else {
                console.error('⚠️ Migration completed but verification failed');
            }
            
            return verified;
            
        } catch (error) {
            console.error('❌ Full migration failed:', error);
            return false;
        }
    }
}

// Create global instance
window.survivorMigration = new SurvivorMigration();

// Auto-run migration check
async function checkMigrationStatus() {
    try {
        // Check if migration has been done
        const migrationLogPath = `artifacts/nerdfootball/pools/nerduniverse-2025/survivor/migration_log`;
        const migrationLog = await getDoc(doc(db, migrationLogPath));
        
        if (!migrationLog.exists()) {
            console.log('⚠️ Unified survivor document not found. Run migration:');
            console.log('survivorMigration.runFullMigration()');
        } else {
            const data = migrationLog.data();
            console.log('✅ Migration already completed:', data.migratedAt);
        }
    } catch (error) {
        console.log('Migration status check error:', error);
    }
}

// Check status when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(checkMigrationStatus, 2000); // Wait for Firebase
    });
} else {
    setTimeout(checkMigrationStatus, 2000);
}