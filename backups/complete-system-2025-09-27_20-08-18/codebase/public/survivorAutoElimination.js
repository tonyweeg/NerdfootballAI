// Survivor Auto Elimination System
// Automatically eliminates users who pick losing teams

class SurvivorAutoElimination {
    constructor(db, gameStateCache) {
        this.db = db;
        this.gameStateCache = gameStateCache;
    }
    
    // ESPN winner determination logic
    determineESPNWinner(game) {
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
    
    // Get survivor picks path for user (fixed to use correct collection structure)
    survivorPicksPath(uid) {
        return `artifacts/nerdfootball/public/data/nerdSurvivor_picks`;
    }
    
    // Get survivor status path
    survivorStatusPath() {
        return `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`;
    }
    
    // Get current pool members
    async getPoolMembers() {
        // Get current pool with fallback mechanism
        let currentPool;
        
        if (typeof getCurrentPool === 'function') {
            currentPool = getCurrentPool();
        } else {
            // Fallback: Check URL params, localStorage, or use default
            if (typeof window !== 'undefined' && window.location) {
                const urlParams = new URLSearchParams(window.location.search);
                const poolParam = urlParams.get('pool');
                
                if (poolParam) {
                    currentPool = poolParam;
                } else if (typeof localStorage !== 'undefined') {
                    currentPool = localStorage.getItem('selectedPoolId') || 'nerduniverse-2025';
                } else {
                    currentPool = 'nerduniverse-2025'; // Browser fallback
                }
            } else {
                // Node.js environment or no window object
                currentPool = 'nerduniverse-2025'; // Ultimate fallback
            }
        }
        
        console.log('🏊 Using pool:', currentPool);
        
        // Make sure Firestore functions are available  
        if (typeof doc === 'undefined') {
            console.error('❌ Firestore doc function not available - make sure Firebase is initialized');
            throw new Error('Firestore doc function not available');
        }
        
        if (typeof getDoc === 'undefined') {
            console.error('❌ Firestore getDoc function not available - make sure Firebase is initialized');  
            throw new Error('Firestore getDoc function not available');
        }
        
        const poolMembersDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${currentPool}/metadata/members`));
        
        if (!poolMembersDoc.exists()) {
            console.log('No pool members found');
            return [];
        }
        
        const poolMembers = poolMembersDoc.data();
        return Object.keys(poolMembers);
    }
    
    // Check eliminations for a specific week using ESPN API
    async checkEliminationsForWeek(weekNumber) {
        console.log(`🔍 Checking survivor eliminations for Week ${weekNumber} using ESPN API...`);
        
        try {
            // Make sure setDoc is available for potential database updates
            if (typeof setDoc === 'undefined') {
                console.error('❌ Firestore setDoc function not available - make sure Firebase is initialized');
                throw new Error('Firestore setDoc function not available');
            }
            
            console.log(`✅ Firebase functions available: doc=${typeof doc}, getDoc=${typeof getDoc}, setDoc=${typeof setDoc}`);
            // Get pool members
            const memberIds = await this.getPoolMembers();
            if (memberIds.length === 0) {
                console.log('No pool members to check');
                return { eliminatedCount: 0, details: [] };
            }
            
            // Get current survivor status
            const statusDocRef = doc(this.db, this.survivorStatusPath());
            const statusSnap = await getDoc(statusDocRef);
            const allStatuses = statusSnap.exists() ? statusSnap.data() : {};
            
            // Get game results for this week from ESPN API
            let gameResults = {};
            if (typeof window.espnApi !== 'undefined') {
                console.log(`📡 Using ESPN API for Week ${weekNumber} game results`);
                const espnGames = await window.espnApi.getWeekGames(weekNumber);
                
                if (espnGames && Array.isArray(espnGames) && espnGames.length > 0) {
                    // Convert ESPN games to our format
                    espnGames.forEach(game => {
                        gameResults[game.id] = {
                            id: game.id,
                            homeTeam: game.home_team,
                            awayTeam: game.away_team,
                            homeScore: game.home_score,
                            awayScore: game.away_score,
                            status: game.status,
                            winner: this.determineESPNWinner(game)
                        };
                    });
                    console.log(`✅ ESPN API: Loaded ${Object.keys(gameResults).length} games for Week ${weekNumber}`);
                } else {
                    console.log(`⚠️ No ESPN games found for Week ${weekNumber}`);
                }

                // Always merge embedded JSON since ESPN uses different game IDs
                console.log(`📝 Loading embedded JSON to ensure all game IDs are available for Week ${weekNumber}`);
                try {
                    const response = await fetch(`nfl_2025_week_${weekNumber}.json`);
                    if (response.ok) {
                        const weekData = await response.json();
                        const games = weekData.games || [];

                        // Convert embedded format and merge (embedded IDs take priority for user picks)
                        games.forEach(game => {
                            gameResults[game.id] = {
                                id: game.id,
                                homeTeam: game.h,
                                awayTeam: game.a,
                                homeScore: game.homeScore || 0,
                                awayScore: game.awayScore || 0,
                                status: game.status || 'TBD',
                                winner: game.winner || 'TBD'
                            };
                        });
                        console.log(`✅ Embedded JSON: Merged ${games.length} games for Week ${weekNumber}`);
                    }
                } catch (error) {
                    console.error(`Error loading embedded JSON for Week ${weekNumber}:`, error);
                }
            } else {
                // Fallback to Firestore if ESPN API unavailable
                console.warn(`⚠️ ESPN API unavailable, falling back to Firestore for Week ${weekNumber}`);
                const resultsDocRef = doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`);
                const resultsSnap = await getDoc(resultsDocRef);
                
                if (resultsSnap.exists()) {
                    gameResults = resultsSnap.data();
                }

                // Always try embedded JSON to fill gaps in Firestore data
                console.log(`📝 Checking embedded JSON to fill any missing games for Week ${weekNumber}`);
                try {
                    const response = await fetch(`nfl_2025_week_${weekNumber}.json`);
                    if (response.ok) {
                        const weekData = await response.json();
                        const games = weekData.games || [];

                        // Convert embedded format and merge with any existing Firestore data
                        games.forEach(game => {
                            // Only add if not already in gameResults from Firestore
                            if (!gameResults[game.id]) {
                                gameResults[game.id] = {
                                    id: game.id,
                                    homeTeam: game.h,
                                    awayTeam: game.a,
                                    homeScore: game.homeScore || 0,
                                    awayScore: game.awayScore || 0,
                                    status: game.status || 'TBD',
                                    winner: game.winner || 'TBD'
                                };
                            }
                        });
                        console.log(`✅ Embedded JSON: Added ${games.length} total games for Week ${weekNumber} (merged with Firestore)`);
                    } else {
                        console.log(`No embedded JSON found for Week ${weekNumber}`);
                    }
                } catch (error) {
                    console.error(`Error loading embedded JSON for Week ${weekNumber}:`, error);
                }
            }
            
            // Check if ANY games have finished (to determine if picks deadline has passed)
            const hasFinishedGames = Object.values(gameResults).some(game => 
                game.status === 'FINAL' || game.status === 'IN_PROGRESS'
            );
            
            // Check each active user's picks
            const eliminationUpdates = {};
            const eliminatedUsers = [];
            
            for (const userId of memberIds) {
                // Skip already eliminated users
                if (allStatuses[userId]?.eliminated) {
                    continue;
                }
                
                try {
                    // Get user's survivor picks from collection
                    const userPicksDocRef = doc(this.db, this.survivorPicksPath(userId), userId);
                    const userPicksSnap = await getDoc(userPicksDocRef);

                    if (!userPicksSnap.exists()) {
                        // If games have started and user has no picks document at all, eliminate them
                        if (hasFinishedGames) {
                            console.log(`❌ ELIMINATING USER ${userId}: No survivor picks document and games have started`);
                            
                            // Create nested object structure for proper reading
                            eliminationUpdates[userId] = {
                                eliminated: true,
                                eliminatedWeek: weekNumber,
                                eliminatedDate: new Date().toISOString(),
                                eliminationReason: `No pick made for Week ${weekNumber}`
                            };
                            
                            eliminatedUsers.push({
                                userId,
                                week: weekNumber,
                                pickedTeam: 'NO PICK',
                                winningTeam: 'N/A',
                                gameId: 'no-pick'
                            });
                        }
                        continue;
                    }
                    
                    const userPicksData = userPicksSnap.data();
                    const userPicks = userPicksData.picks || {};
                    const weekPick = userPicks[weekNumber];
                    
                    if (!weekPick) {
                        // If games have started and user didn't make a pick for this week, eliminate them
                        if (hasFinishedGames) {
                            console.log(`❌ ELIMINATING USER ${userId}: No pick for Week ${weekNumber} and games have started`);
                            
                            // Create nested object structure for proper reading
                            eliminationUpdates[userId] = {
                                eliminated: true,
                                eliminatedWeek: weekNumber,
                                eliminatedDate: new Date().toISOString(),
                                eliminationReason: `No pick made for Week ${weekNumber}`
                            };
                            
                            eliminatedUsers.push({
                                userId,
                                week: weekNumber,
                                pickedTeam: 'NO PICK',
                                winningTeam: 'N/A',
                                gameId: 'no-pick'
                            });
                        }
                        continue;
                    }
                    
                    // Check if user has a valid game ID
                    if (!weekPick.gameId) {
                        console.log(`⚠️ User ${userId} has no gameId in their Week ${weekNumber} pick - skipping`);
                        continue;
                    }

                    // Check ONLY the specific game the user picked
                    const specificGame = gameResults[weekPick.gameId];

                    if (!specificGame) {
                        console.log(`⚠️ User ${userId} picked game ${weekPick.gameId} but game not found in results`);
                        continue;
                    }
                    
                    if ((specificGame.status === 'FINAL' || specificGame.status === 'Final') && specificGame.winner && specificGame.winner !== 'TBD') {
                        const userTeam = weekPick.team;
                        const winner = specificGame.winner;
                        
                        console.log(`👤 User ${userId} pick: ${userTeam} | 🏆 Winner: ${winner} | 🎮 Game: ${weekPick.gameId}`);
                        
                        if (winner !== userTeam) {
                            // User picked losing team - eliminate them
                            console.log(`❌ ELIMINATING USER ${userId}: Picked ${userTeam}, Winner was ${winner} (Game: ${weekPick.gameId})`);
                            
                            // Create nested object structure for proper reading
                            eliminationUpdates[userId] = {
                                eliminated: true,
                                eliminatedWeek: weekNumber,
                                eliminatedDate: new Date().toISOString(),
                                eliminationReason: `Lost in Week ${weekNumber}: Picked ${userTeam}, ${winner} won`
                            };
                            
                            eliminatedUsers.push({
                                userId,
                                week: weekNumber,
                                pickedTeam: userTeam,
                                winningTeam: winner,
                                gameId: weekPick.gameId
                            });
                        } else {
                            console.log(`✅ User ${userId} survived Week ${weekNumber}: Picked ${userTeam}, Winner was ${winner} (Game: ${weekPick.gameId})`);
                        }
                    } else {
                        console.log(`⏳ Game ${weekPick.gameId} not final yet (Status: ${specificGame.status})`);
                    }
                } catch (error) {
                    console.error(`Error checking user ${userId} for Week ${weekNumber}:`, error);
                }
            }
            
            // Apply elimination updates if any
            if (Object.keys(eliminationUpdates).length > 0) {
                console.log(`📝 Updating survivor status with ${eliminatedUsers.length} eliminations...`);
                console.log(`📊 DEBUG: eliminationUpdates object:`, eliminationUpdates);
                console.log(`📊 DEBUG: statusDocRef path:`, statusDocRef.path);

                try {
                    await setDoc(statusDocRef, eliminationUpdates, { merge: true });
                    console.log(`✅ Database write successful for ${eliminatedUsers.length} eliminations`);
                } catch (writeError) {
                    console.error(`❌ Database write failed:`, writeError);
                    throw writeError;
                }

                // Invalidate cache to trigger UI updates
                if (this.gameStateCache) {
                    this.gameStateCache.invalidateAfterDataUpdate('survivor_eliminations', weekNumber);
                }

                console.log(`💎 Auto-elimination complete: ${eliminatedUsers.length} users eliminated in Week ${weekNumber}`);
            } else {
                console.log(`✅ No eliminations found for Week ${weekNumber}`);
            }
            
            return {
                eliminatedCount: eliminatedUsers.length,
                details: eliminatedUsers
            };
            
        } catch (error) {
            console.error(`Error checking eliminations for Week ${weekNumber}:`, error);
            return { error: error.message };
        }
    }
    
    // Check eliminations for all weeks (useful for fixing historical data)
    async checkAllWeeksEliminations() {
        console.log('🔍 Checking survivor eliminations for ALL weeks...');
        
        let totalEliminations = 0;
        const allEliminatedUsers = [];
        
        for (let week = 1; week <= 18; week++) {
            const result = await this.checkEliminationsForWeek(week);
            
            if (result.error) {
                console.error(`Error in Week ${week}:`, result.error);
                continue;
            }
            
            totalEliminations += result.eliminatedCount;
            allEliminatedUsers.push(...result.details);
        }
        
        console.log(`🏁 TOTAL ELIMINATIONS PROCESSED: ${totalEliminations} users across all weeks`);
        
        return {
            totalEliminations,
            eliminatedUsers: allEliminatedUsers
        };
    }
    
    // Check eliminations for current week
    async checkCurrentWeekEliminations() {
        const currentWeek = window.currentWeek || this.getCurrentWeek();
        return await this.checkEliminationsForWeek(currentWeek);
    }
    
    // Get current NFL week (fallback only)
    getCurrentWeek() {
        // Use global week management system
        if (typeof window !== 'undefined' && window.currentWeek) {
            return window.currentWeek;
        }
        
        // Fallback for Node.js environments - implement same logic locally
        const now = new Date();
        const seasonStart = new Date('2025-09-04'); // Week 1 starts September 4, 2025
        const weekMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
        
        // Before season starts - return Week 1 for pre-season testing
        if (now < seasonStart) {
            return 1;
        }
        
        const timeDiff = now.getTime() - seasonStart.getTime();
        const weeksDiff = Math.floor(timeDiff / weekMs) + 1;
        return Math.min(Math.max(weeksDiff, 1), 18); // Clamp between 1 and 18
    }
    
    // Manual trigger for specific user elimination check
    async checkSpecificUser(userId, weekNumber = null) {
        const targetWeek = weekNumber || window.currentWeek || this.getCurrentWeek();
        console.log(`🔍 Checking specific user ${userId} for Week ${targetWeek}...`);
        
        try {
            // Get user's survivor picks from collection
            const userPicksDocRef = doc(this.db, this.survivorPicksPath(userId), userId);
            const userPicksSnap = await getDoc(userPicksDocRef);
            
            if (!userPicksSnap.exists()) {
                return { error: 'User has no survivor picks' };
            }
            
            const userPicksData = userPicksSnap.data();
            const userPicks = userPicksData.picks || {};
            
            // Check all weeks for this user
            const userResults = [];
            let shouldBeEliminated = false;
            let eliminationWeek = null;
            
            for (let week = 1; week <= 18; week++) {
                const weekPick = userPicks[week];
                if (!weekPick) continue;
                
                try {
                    let gameResults = {};

                    // Try ESPN API first
                    if (typeof window.espnApi !== 'undefined') {
                        const espnGames = await window.espnApi.getWeekGames(week);
                        if (espnGames && Array.isArray(espnGames) && espnGames.length > 0) {
                            espnGames.forEach(game => {
                                gameResults[game.id] = {
                                    id: game.id,
                                    homeTeam: game.home_team,
                                    awayTeam: game.away_team,
                                    homeScore: game.home_score,
                                    awayScore: game.away_score,
                                    status: game.status,
                                    winner: this.determineESPNWinner(game)
                                };
                            });
                        }
                    }

                    // Check if user's specific game exists in ESPN data
                    const userGameExists = gameResults[weekPick.gameId];
                    if (!userGameExists) {
                        console.log(`🔄 User's Game ${weekPick.gameId} not found in ESPN data, using embedded JSON`);
                    }

                    if (!userGameExists) {
                        // Fallback to Firestore
                        const resultsDocRef = doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`);
                        const resultsSnap = await getDoc(resultsDocRef);
                        if (resultsSnap.exists()) {
                            gameResults = resultsSnap.data();
                        }

                        // Always try embedded JSON to fill gaps in Firestore data
                        try {
                            const response = await fetch(`nfl_2025_week_${week}.json`);
                            if (response.ok) {
                                const weekData = await response.json();
                                const games = weekData.games || [];

                                // Convert embedded format and merge with any existing Firestore data
                                games.forEach(game => {
                                    // Only add if not already in gameResults from Firestore
                                    if (!gameResults[game.id]) {
                                        gameResults[game.id] = {
                                            id: game.id,
                                            homeTeam: game.h,
                                            awayTeam: game.a,
                                            homeScore: game.homeScore || 0,
                                            awayScore: game.awayScore || 0,
                                            status: game.status || 'TBD',
                                            winner: game.winner || 'TBD'
                                        };
                                    }
                                });
                            }
                        } catch (error) {
                            console.log(`Could not load embedded data for Week ${week}`);
                        }
                    }
                    
                    const gameResult = gameResults[weekPick.gameId];
                    if (gameResult && gameResult.winner && (gameResult.status === 'FINAL' || gameResult.status === 'Final')) {
                        const isWinner = gameResult.winner === weekPick.team;
                        
                        userResults.push({
                            week,
                            pickedTeam: weekPick.team,
                            winner: gameResult.winner,
                            result: isWinner ? 'WIN' : 'LOSS',
                            gameId: weekPick.gameId
                        });
                        
                        if (!isWinner && !shouldBeEliminated) {
                            shouldBeEliminated = true;
                            eliminationWeek = week;
                        }
                    }
                } catch (e) {
                    console.log(`Week ${week}: No results available`);
                }
            }
            
            // Get current elimination status
            const statusDocRef = doc(this.db, this.survivorStatusPath());
            const statusSnap = await getDoc(statusDocRef);
            const allStatuses = statusSnap.exists() ? statusSnap.data() : {};
            const currentStatus = allStatuses[userId];
            
            return {
                userId,
                userResults,
                shouldBeEliminated,
                eliminationWeek,
                currentStatus: currentStatus || { eliminated: false },
                needsFix: shouldBeEliminated !== (currentStatus?.eliminated || false)
            };
            
        } catch (error) {
            console.error(`Error checking user ${userId}:`, error);
            return { error: error.message };
        }
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.SurvivorAutoElimination = SurvivorAutoElimination;
}

// Export for Node.js
if (typeof module !== 'undefined') {
    module.exports = SurvivorAutoElimination;
}