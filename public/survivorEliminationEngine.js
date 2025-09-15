// BULLETPROOF Survivor Elimination Engine
// Pharoah's Architecture: Clean, Direct Firestore Access with Week-Specific Validation

class SurvivorEliminationEngine {
    constructor(db) {
        this.db = db;
        this.poolId = 'nerduniverse-2025';
        console.log('🏗️ Survivor Elimination Engine initialized');
    }

    // CORE PRINCIPLE: Each week's picks are ONLY validated against that week's results
    async validateUserPickForWeek(userId, week) {
        try {
            // Get user's specific pick for this week
            const userPick = await this.getUserPickForWeek(userId, week);
            if (!userPick) {
                return {
                    userId,
                    week,
                    status: 'NO_PICK',
                    shouldBeEliminated: true,
                    reason: `No pick made for Week ${week}`
                };
            }

            // Get the actual game results for this specific week
            const weekResults = await this.getWeekGameResults(week);
            const gameResult = weekResults[userPick.gameId];

            if (!gameResult) {
                return {
                    userId,
                    week,
                    status: 'GAME_NOT_FOUND',
                    shouldBeEliminated: false,
                    reason: `Game ${userPick.gameId} not found in Week ${week} results`
                };
            }

            // Determine if the game is finished and who won
            const winner = this.determineWinner(gameResult);

            if (winner === null) {
                return {
                    userId,
                    week,
                    status: 'GAME_PENDING',
                    shouldBeEliminated: false,
                    reason: `Game not finished yet (Status: ${gameResult.status})`
                };
            }

            // Check if user's pick won
            const userWon = (winner === userPick.team);

            return {
                userId,
                week,
                pickedTeam: userPick.team,
                winner,
                gameId: userPick.gameId,
                gameStatus: gameResult.status,
                status: userWon ? 'SURVIVED' : 'ELIMINATED',
                shouldBeEliminated: !userWon,
                reason: userWon ? `${userPick.team} won` : `${userPick.team} lost to ${winner}`
            };

        } catch (error) {
            console.error(`❌ Error validating user ${userId} for Week ${week}:`, error);
            return {
                userId,
                week,
                status: 'ERROR',
                shouldBeEliminated: false,
                reason: `Validation error: ${error.message}`
            };
        }
    }

    // Get user's pick for a specific week ONLY
    async getUserPickForWeek(userId, week) {
        try {
            const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`));

            if (!picksDoc.exists()) {
                return null;
            }

            const userData = picksDoc.data();
            const picks = userData.picks || {};

            return picks[week] || null;

        } catch (error) {
            console.error(`❌ Error getting pick for user ${userId}, week ${week}:`, error);
            return null;
        }
    }

    // Get game results for a specific week from Firestore
    async getWeekGameResults(week) {
        try {
            const resultsDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`));

            if (!resultsDoc.exists()) {
                console.warn(`⚠️ No game results found for Week ${week}`);
                return {};
            }

            const weekData = resultsDoc.data();
            console.log(`📊 Week ${week}: Loaded ${Object.keys(weekData).length} game results`);

            return weekData;

        } catch (error) {
            console.error(`❌ Error loading Week ${week} results:`, error);
            return {};
        }
    }

    // Bulletproof winner determination from Firestore data
    determineWinner(gameData) {
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

    // Get pool members (authoritative source)
    async getPoolMembers() {
        try {
            const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`));

            if (!poolDoc.exists()) {
                throw new Error(`Pool ${this.poolId} not found`);
            }

            const poolData = poolDoc.data();
            return Object.keys(poolData);

        } catch (error) {
            console.error('❌ Error getting pool members:', error);
            throw error;
        }
    }

    // Get current survivor elimination status
    async getSurvivorStatus() {
        try {
            const statusDoc = await getDoc(doc(this.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status'));

            if (!statusDoc.exists()) {
                return {};
            }

            return statusDoc.data();

        } catch (error) {
            console.error('❌ Error getting survivor status:', error);
            return {};
        }
    }

    // Comprehensive analysis of all users across all weeks
    async analyzeAllEliminations() {
        console.log('🚀 Starting comprehensive elimination analysis...');

        const poolMembers = await this.getPoolMembers();
        const currentStatus = await this.getSurvivorStatus();

        const analysis = {
            totalUsers: poolMembers.length,
            correctEliminations: [],
            incorrectEliminations: [],
            correctSurvivors: [],
            missedEliminations: [],
            weekAnalysis: {}
        };

        console.log(`👥 Analyzing ${poolMembers.length} pool members...`);

        for (const userId of poolMembers) {
            console.log(`🔍 Analyzing user ${userId}...`);

            const userAnalysis = await this.analyzeUserAcrossAllWeeks(userId);
            const currentUserStatus = currentStatus[userId] || { eliminated: false };
            const isCurrentlyEliminated = currentUserStatus.eliminated;

            // Categorize the user based on analysis vs current status
            if (userAnalysis.shouldBeEliminated && isCurrentlyEliminated) {
                // Correctly eliminated
                analysis.correctEliminations.push({
                    userId,
                    eliminationWeek: userAnalysis.eliminationWeek,
                    reason: userAnalysis.eliminationReason,
                    currentStatus: currentUserStatus
                });

            } else if (userAnalysis.shouldBeEliminated && !isCurrentlyEliminated) {
                // Should be eliminated but isn't
                analysis.missedEliminations.push({
                    userId,
                    eliminationWeek: userAnalysis.eliminationWeek,
                    reason: userAnalysis.eliminationReason,
                    weekDetails: userAnalysis.weekResults
                });

            } else if (!userAnalysis.shouldBeEliminated && isCurrentlyEliminated) {
                // Incorrectly eliminated
                analysis.incorrectEliminations.push({
                    userId,
                    currentStatus: currentUserStatus,
                    weekDetails: userAnalysis.weekResults
                });

            } else {
                // Correctly surviving
                analysis.correctSurvivors.push({
                    userId,
                    weekDetails: userAnalysis.weekResults
                });
            }

            // Store week-by-week analysis for this user
            analysis.weekAnalysis[userId] = userAnalysis.weekResults;
        }

        // Summary
        console.log('📊 ELIMINATION ANALYSIS COMPLETE:');
        console.log(`✅ Correct eliminations: ${analysis.correctEliminations.length}`);
        console.log(`❌ Incorrect eliminations: ${analysis.incorrectEliminations.length}`);
        console.log(`✅ Correct survivors: ${analysis.correctSurvivors.length}`);
        console.log(`⚠️ Missed eliminations: ${analysis.missedEliminations.length}`);

        return analysis;
    }

    // Analyze a single user across all weeks to find when they should have been eliminated
    async analyzeUserAcrossAllWeeks(userId) {
        const userResults = {
            userId,
            weekResults: [],
            shouldBeEliminated: false,
            eliminationWeek: null,
            eliminationReason: null
        };

        // Check each week chronologically
        for (let week = 1; week <= 18; week++) {
            const weekValidation = await this.validateUserPickForWeek(userId, week);
            userResults.weekResults.push(weekValidation);

            // If this is the first elimination, record it
            if (weekValidation.shouldBeEliminated &&
                weekValidation.status === 'ELIMINATED' &&
                !userResults.shouldBeEliminated) {

                userResults.shouldBeEliminated = true;
                userResults.eliminationWeek = week;
                userResults.eliminationReason = weekValidation.reason;

                // Stop here - user is eliminated, no need to check further weeks
                console.log(`💀 User ${userId} should be eliminated in Week ${week}: ${weekValidation.reason}`);
                break;
            }
        }

        return userResults;
    }

    // Apply fixes to restore correct elimination status
    async applyEliminationFixes(analysis) {
        console.log('🔧 Applying elimination fixes...');

        const statusUpdates = {};
        const fixesApplied = [];

        // Restore incorrectly eliminated users
        for (const user of analysis.incorrectEliminations) {
            console.log(`🔧 RESTORING user ${user.userId} - incorrectly eliminated`);

            statusUpdates[`${user.userId}.eliminated`] = false;
            statusUpdates[`${user.userId}.eliminatedWeek`] = null;
            statusUpdates[`${user.userId}.eliminatedDate`] = null;
            statusUpdates[`${user.userId}.eliminationReason`] = null;

            fixesApplied.push(`RESTORED: ${user.userId}`);
        }

        // Eliminate users who should be eliminated
        for (const user of analysis.missedEliminations) {
            console.log(`🔧 ELIMINATING user ${user.userId} - Week ${user.eliminationWeek}: ${user.reason}`);

            statusUpdates[`${user.userId}.eliminated`] = true;
            statusUpdates[`${user.userId}.eliminatedWeek`] = user.eliminationWeek;
            statusUpdates[`${user.userId}.eliminatedDate`] = new Date().toISOString();
            statusUpdates[`${user.userId}.eliminationReason`] = user.reason;

            fixesApplied.push(`ELIMINATED: ${user.userId} (Week ${user.eliminationWeek})`);
        }

        // Apply all updates to Firestore
        if (Object.keys(statusUpdates).length > 0) {
            console.log(`💾 Applying ${Object.keys(statusUpdates).length} status updates...`);

            const statusDocRef = doc(this.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
            await setDoc(statusDocRef, statusUpdates, { merge: true });

            console.log('✅ All elimination fixes applied successfully');
        } else {
            console.log('✅ No fixes needed - all eliminations are correct');
        }

        return {
            fixesApplied: fixesApplied.length,
            changes: fixesApplied
        };
    }

    // Master function: Complete analysis and fix
    async fixAllSurvivorEliminations() {
        try {
            console.log('🚀 Starting comprehensive survivor elimination fix...');

            // Step 1: Analyze all eliminations
            const analysis = await this.analyzeAllEliminations();

            // Step 2: Apply fixes
            const fixes = await this.applyEliminationFixes(analysis);

            // Step 3: Final report
            const report = {
                success: true,
                totalUsers: analysis.totalUsers,
                correctEliminations: analysis.correctEliminations.length,
                incorrectEliminations: analysis.incorrectEliminations.length,
                correctSurvivors: analysis.correctSurvivors.length,
                missedEliminations: analysis.missedEliminations.length,
                fixesApplied: fixes.fixesApplied,
                changes: fixes.changes,
                analysis,
                fixes
            };

            console.log('🏆 SURVIVOR ELIMINATION FIX COMPLETE');
            console.log(`📊 Total users: ${report.totalUsers}`);
            console.log(`🔧 Fixes applied: ${report.fixesApplied}`);

            return report;

        } catch (error) {
            console.error('❌ Survivor elimination fix failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Validate a specific user for debugging
    async debugUser(userId) {
        console.log(`🔍 Debug analysis for user ${userId}:`);

        const currentStatus = await this.getSurvivorStatus();
        const userStatus = currentStatus[userId] || { eliminated: false };

        console.log(`Current status:`, userStatus);

        const userAnalysis = await this.analyzeUserAcrossAllWeeks(userId);

        console.log(`Analysis result:`, {
            shouldBeEliminated: userAnalysis.shouldBeEliminated,
            eliminationWeek: userAnalysis.eliminationWeek,
            eliminationReason: userAnalysis.eliminationReason
        });

        console.log(`Week-by-week results:`);
        userAnalysis.weekResults.forEach(week => {
            if (week.status !== 'NO_PICK') {
                console.log(`  Week ${week.week}: ${week.status} - ${week.reason}`);
            }
        });

        return userAnalysis;
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.SurvivorEliminationEngine = SurvivorEliminationEngine;
}

if (typeof module !== 'undefined') {
    module.exports = SurvivorEliminationEngine;
}