// Survivor Auto Elimination System
// Automatically eliminates users who pick losing teams

class SurvivorAutoElimination {
    constructor(db, gameStateCache) {
        this.db = db;
        this.gameStateCache = gameStateCache;
    }
    
    // Get survivor picks path for user
    survivorPicksPath(uid) {
        return `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`;
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
    
    // Check eliminations for a specific week
    async checkEliminationsForWeek(weekNumber) {
        console.log(`🔍 Checking survivor eliminations for Week ${weekNumber}...`);
        
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
            
            // Get game results for this week
            const resultsDocRef = doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`);
            const resultsSnap = await getDoc(resultsDocRef);
            
            if (!resultsSnap.exists()) {
                console.log(`No game results found for Week ${weekNumber}`);
                return { eliminatedCount: 0, details: [] };
            }
            
            const gameResults = resultsSnap.data();
            
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
                    // Get user's survivor picks
                    const userPicksDocRef = doc(this.db, this.survivorPicksPath(userId));
                    const userPicksSnap = await getDoc(userPicksDocRef);
                    
                    if (!userPicksSnap.exists()) {
                        // If games have started and user has no picks document at all, eliminate them
                        if (hasFinishedGames) {
                            console.log(`❌ ELIMINATING USER ${userId}: No survivor picks document and games have started`);
                            
                            eliminationUpdates[`${userId}.eliminated`] = true;
                            eliminationUpdates[`${userId}.eliminatedWeek`] = weekNumber;
                            eliminationUpdates[`${userId}.eliminatedDate`] = new Date().toISOString();
                            eliminationUpdates[`${userId}.eliminationReason`] = `No pick made for Week ${weekNumber}`;
                            
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
                            
                            eliminationUpdates[`${userId}.eliminated`] = true;
                            eliminationUpdates[`${userId}.eliminatedWeek`] = weekNumber;
                            eliminationUpdates[`${userId}.eliminatedDate`] = new Date().toISOString();
                            eliminationUpdates[`${userId}.eliminationReason`] = `No pick made for Week ${weekNumber}`;
                            
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
                    
                    // Check ONLY the specific game the user picked
                    const specificGame = gameResults[weekPick.gameId];
                    
                    if (!specificGame) {
                        console.log(`⚠️ User ${userId} picked game ${weekPick.gameId} but game not found in results`);
                        continue;
                    }
                    
                    if (specificGame.status === 'FINAL' && specificGame.winner && specificGame.winner !== 'TBD') {
                        const userTeam = weekPick.team;
                        const winner = specificGame.winner;
                        
                        console.log(`👤 User ${userId} pick: ${userTeam} | 🏆 Winner: ${winner} | 🎮 Game: ${weekPick.gameId}`);
                        
                        if (winner !== userTeam) {
                            // User picked losing team - eliminate them
                            console.log(`❌ ELIMINATING USER ${userId}: Picked ${userTeam}, Winner was ${winner} (Game: ${weekPick.gameId})`);
                            
                            eliminationUpdates[`${userId}.eliminated`] = true;
                            eliminationUpdates[`${userId}.eliminatedWeek`] = weekNumber;
                            eliminationUpdates[`${userId}.eliminatedDate`] = new Date().toISOString();
                            eliminationUpdates[`${userId}.eliminationReason`] = `Lost in Week ${weekNumber}: Picked ${userTeam}, ${winner} won`;
                            
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
                
                await setDoc(statusDocRef, eliminationUpdates, { merge: true });
                
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
            // Get user's survivor picks
            const userPicksDocRef = doc(this.db, this.survivorPicksPath(userId));
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
                    const resultsDocRef = doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`);
                    const resultsSnap = await getDoc(resultsDocRef);
                    
                    if (resultsSnap.exists()) {
                        const gameResults = resultsSnap.data();
                        const gameResult = gameResults[weekPick.gameId];
                        
                        if (gameResult && gameResult.winner && gameResult.status === 'FINAL') {
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