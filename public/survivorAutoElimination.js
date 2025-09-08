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
        const currentPool = getCurrentPool();
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
                        continue; // User has no picks
                    }
                    
                    const userPicksData = userPicksSnap.data();
                    const userPicks = userPicksData.picks || {};
                    const weekPick = userPicks[weekNumber];
                    
                    if (!weekPick) {
                        console.log(`User ${userId} has no pick for Week ${weekNumber}`);
                        continue;
                    }
                    
                    // Check if their pick lost
                    const gameResult = gameResults[weekPick.gameId];
                    
                    if (gameResult && gameResult.winner && gameResult.status === 'FINAL') {
                        const userTeam = weekPick.team;
                        const winner = gameResult.winner;
                        
                        if (winner !== userTeam && winner !== 'TBD') {
                            // User picked losing team - eliminate them
                            console.log(`❌ ELIMINATING USER ${userId}: Picked ${userTeam}, Winner was ${winner}`);
                            
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
                            console.log(`✅ User ${userId} survived Week ${weekNumber}: Picked ${userTeam}, Winner was ${winner}`);
                        }
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
        const currentWeek = this.getCurrentWeek();
        return await this.checkEliminationsForWeek(currentWeek);
    }
    
    // Get current NFL week
    getCurrentWeek() {
        const now = new Date();
        const seasonStart = new Date('2024-09-05');
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const weeksDiff = Math.floor((now - seasonStart) / weekMs) + 1;
        return Math.min(Math.max(weeksDiff, 1), 18);
    }
    
    // Manual trigger for specific user elimination check
    async checkSpecificUser(userId, weekNumber = null) {
        const targetWeek = weekNumber || this.getCurrentWeek();
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