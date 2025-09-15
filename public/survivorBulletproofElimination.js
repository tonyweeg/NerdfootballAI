// BULLETPROOF Survivor Auto Elimination System
// Pharoah's Architecture: Week-Specific Validation with Zero Cross-Contamination

class SurvivorBulletproofElimination {
    constructor(db, gameStateCache) {
        this.db = db;
        this.gameStateCache = gameStateCache;
        this.poolId = 'nerduniverse-2025';
        console.log('🛡️ Bulletproof Survivor Elimination System initialized');
    }

    // CORE PRINCIPLE: Direct Firestore access for week-specific game results
    async getWeekGameResultsFromFirestore(week) {
        try {
            const resultsDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`));

            if (!resultsDoc.exists()) {
                console.warn(`⚠️ No Firestore results found for Week ${week}`);
                return {};
            }

            const weekData = resultsDoc.data();
            console.log(`📊 Week ${week}: Direct Firestore access loaded ${Object.keys(weekData).length} games`);

            return weekData;

        } catch (error) {
            console.error(`❌ Error loading Week ${week} from Firestore:`, error);
            return {};
        }
    }

    // BULLETPROOF: Winner determination from Firestore data
    determineWinnerFromFirestore(gameData) {
        const status = gameData.status || gameData.game_status;

        // Game not finished
        if (!status ||
            status === 'Not Started' ||
            status === 'Scheduled' ||
            status.includes('Q') ||
            status.includes('Half') ||
            status.includes('Overtime')) {
            return null;
        }

        // Game finished - determine winner
        if (status === 'Final' || status === 'FINAL' || status === 'Complete' || status === 'F') {
            const homeScore = parseInt(gameData.home_score || gameData.homeScore || 0);
            const awayScore = parseInt(gameData.away_score || gameData.awayScore || 0);

            if (homeScore > awayScore) {
                return gameData.home_team || gameData.homeTeam;
            } else if (awayScore > homeScore) {
                return gameData.away_team || gameData.awayTeam;
            } else {
                return 'TIE';
            }
        }

        return null; // Game status unclear
    }

    // BULLETPROOF: Get user's pick for SPECIFIC week only
    async getUserPickForSpecificWeek(userId, targetWeek) {
        try {
            const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`));

            if (!picksDoc.exists()) {
                return null;
            }

            const userData = picksDoc.data();
            const picks = userData.picks || {};

            // CRITICAL: Return ONLY the pick for the target week
            const weekPick = picks[targetWeek];

            if (weekPick) {
                console.log(`👤 User ${userId} Week ${targetWeek} pick: ${weekPick.team} (Game: ${weekPick.gameId})`);
            }

            return weekPick || null;

        } catch (error) {
            console.error(`❌ Error getting Week ${targetWeek} pick for user ${userId}:`, error);
            return null;
        }
    }

    // Get pool members (authoritative source)
    async getPoolMembers() {
        try {
            const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`));

            if (!poolDoc.exists()) {
                console.log('No pool members found');
                return [];
            }

            const poolMembers = poolDoc.data();
            return Object.keys(poolMembers);

        } catch (error) {
            console.error('❌ Error getting pool members:', error);
            return [];
        }
    }

    // BULLETPROOF: Check eliminations for SPECIFIC week using direct Firestore access
    async checkEliminationsForWeek(weekNumber) {
        console.log(`🔍 BULLETPROOF: Checking eliminations for Week ${weekNumber} using direct Firestore access...`);

        try {
            // Get pool members
            const memberIds = await this.getPoolMembers();
            if (memberIds.length === 0) {
                console.log('No pool members to check');
                return { eliminatedCount: 0, details: [] };
            }

            // Get current survivor status
            const statusDocRef = doc(this.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
            const statusSnap = await getDoc(statusDocRef);
            const allStatuses = statusSnap.exists() ? statusSnap.data() : {};

            // CRITICAL: Get game results for THIS SPECIFIC WEEK ONLY from Firestore
            const gameResults = await this.getWeekGameResultsFromFirestore(weekNumber);

            if (Object.keys(gameResults).length === 0) {
                console.log(`⚠️ No game results available for Week ${weekNumber}`);
                return { eliminatedCount: 0, details: [] };
            }

            // Check if ANY games have finished (to determine if picks deadline has passed)
            const hasFinishedGames = Object.values(gameResults).some(game => {
                const status = game.status || game.game_status;
                return status === 'FINAL' || status === 'Final' || status === 'Complete' || status === 'F';
            });

            // Check each active user's picks for THIS WEEK ONLY
            const eliminationUpdates = {};
            const eliminatedUsers = [];

            for (const userId of memberIds) {
                // Skip already eliminated users
                if (allStatuses[userId]?.eliminated) {
                    continue;
                }

                try {
                    // CRITICAL: Get user's pick for THIS SPECIFIC WEEK ONLY
                    const userPick = await this.getUserPickForSpecificWeek(userId, weekNumber);

                    if (!userPick) {
                        // If games have started and user has no pick for this week, eliminate them
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

                    // CRITICAL: Check ONLY the specific game from THIS WEEK'S results
                    const specificGame = gameResults[userPick.gameId];

                    if (!specificGame) {
                        console.log(`⚠️ User ${userId} picked game ${userPick.gameId} but game not found in Week ${weekNumber} results`);
                        continue;
                    }

                    // Determine winner using bulletproof method
                    const winner = this.determineWinnerFromFirestore(specificGame);

                    if (winner === null) {
                        console.log(`⏳ Game ${userPick.gameId} not final yet (Status: ${specificGame.status})`);
                        continue;
                    }

                    const userTeam = userPick.team;

                    console.log(`👤 User ${userId} Week ${weekNumber}: Picked ${userTeam} | Winner: ${winner} | Game: ${userPick.gameId}`);

                    if (winner !== userTeam) {
                        // User picked losing team - eliminate them
                        console.log(`❌ ELIMINATING USER ${userId}: Picked ${userTeam}, Winner was ${winner} (Week ${weekNumber} Game: ${userPick.gameId})`);

                        eliminationUpdates[`${userId}.eliminated`] = true;
                        eliminationUpdates[`${userId}.eliminatedWeek`] = weekNumber;
                        eliminationUpdates[`${userId}.eliminatedDate`] = new Date().toISOString();
                        eliminationUpdates[`${userId}.eliminationReason`] = `Lost in Week ${weekNumber}: Picked ${userTeam}, ${winner} won`;

                        eliminatedUsers.push({
                            userId,
                            week: weekNumber,
                            pickedTeam: userTeam,
                            winningTeam: winner,
                            gameId: userPick.gameId
                        });
                    } else {
                        console.log(`✅ User ${userId} survived Week ${weekNumber}: Picked ${userTeam}, Winner was ${winner} (Game: ${userPick.gameId})`);
                    }

                } catch (error) {
                    console.error(`Error checking user ${userId} for Week ${weekNumber}:`, error);
                }
            }

            // Apply elimination updates if any
            if (Object.keys(eliminationUpdates).length > 0) {
                console.log(`📝 Updating survivor status with ${eliminatedUsers.length} eliminations for Week ${weekNumber}...`);

                await setDoc(statusDocRef, eliminationUpdates, { merge: true });

                // Invalidate cache to trigger UI updates
                if (this.gameStateCache) {
                    this.gameStateCache.invalidateAfterDataUpdate('survivor_eliminations', weekNumber);
                }

                console.log(`💎 BULLETPROOF elimination complete: ${eliminatedUsers.length} users eliminated in Week ${weekNumber}`);
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

    // BULLETPROOF: Check eliminations for current week
    async checkCurrentWeekEliminations() {
        const currentWeek = window.currentWeek || this.getCurrentWeek();
        console.log(`🛡️ BULLETPROOF: Checking current week ${currentWeek} eliminations...`);
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

    // Legacy compatibility methods with bulletproof implementation
    survivorPicksPath(uid) {
        return `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`;
    }

    survivorStatusPath() {
        return `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`;
    }

    // BULLETPROOF: ESPN winner determination for backward compatibility
    determineESPNWinner(game) {
        return this.determineWinnerFromFirestore(game);
    }

    // Manual trigger for specific user elimination check with bulletproof validation
    async checkSpecificUser(userId, weekNumber = null) {
        const targetWeek = weekNumber || window.currentWeek || this.getCurrentWeek();
        console.log(`🔍 BULLETPROOF: Checking specific user ${userId} for Week ${targetWeek}...`);

        try {
            // Get user's pick for the specific week
            const userPick = await this.getUserPickForSpecificWeek(userId, targetWeek);

            if (!userPick) {
                return { error: `User has no pick for Week ${targetWeek}` };
            }

            // Get game results for the specific week
            const gameResults = await this.getWeekGameResultsFromFirestore(targetWeek);
            const gameResult = gameResults[userPick.gameId];

            if (!gameResult) {
                return { error: `Game ${userPick.gameId} not found in Week ${targetWeek} results` };
            }

            const winner = this.determineWinnerFromFirestore(gameResult);

            if (winner === null) {
                return {
                    status: 'pending',
                    reason: `Game not finished (Status: ${gameResult.status})`
                };
            }

            const userWon = (winner === userPick.team);

            // Get current elimination status
            const statusDocRef = doc(this.db, this.survivorStatusPath());
            const statusSnap = await getDoc(statusDocRef);
            const allStatuses = statusSnap.exists() ? statusSnap.data() : {};
            const currentStatus = allStatuses[userId];

            return {
                userId,
                week: targetWeek,
                pickedTeam: userPick.team,
                winner,
                gameId: userPick.gameId,
                gameStatus: gameResult.status,
                shouldBeEliminated: !userWon,
                currentStatus: currentStatus || { eliminated: false },
                needsFix: !userWon !== (currentStatus?.eliminated || false),
                result: userWon ? 'SURVIVED' : 'ELIMINATED'
            };

        } catch (error) {
            console.error(`Error checking user ${userId}:`, error);
            return { error: error.message };
        }
    }
}

// Export for use in main app (replace the original)
if (typeof window !== 'undefined') {
    window.SurvivorAutoElimination = SurvivorBulletproofElimination;
    console.log('🛡️ BULLETPROOF Survivor Auto Elimination System loaded and replaced original');
}

// Export for Node.js
if (typeof module !== 'undefined') {
    module.exports = SurvivorBulletproofElimination;
}