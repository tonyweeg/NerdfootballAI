// Survivor Elimination Diagnostic and Fix System
// Direct Firestore access to bulletproof survivor eliminations

class SurvivorDiagnostic {
    constructor(db) {
        this.db = db;
        this.poolId = 'nerduniverse-2025';
    }

    // Get pool members (authoritative source)
    async getPoolMembers() {
        const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`));
        if (!poolDoc.exists()) {
            throw new Error('Pool members not found');
        }
        return Object.keys(poolDoc.data());
    }

    // Get game results for a specific week from Firestore
    async getWeekGameResults(week) {
        try {
            const resultsDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`));
            if (!resultsDoc.exists()) {
                console.log(`⚠️ No game results found for Week ${week}`);
                return {};
            }

            const gameData = resultsDoc.data();
            console.log(`📊 Week ${week} games loaded:`, Object.keys(gameData).length);
            return gameData;
        } catch (error) {
            console.error(`❌ Error loading Week ${week} results:`, error);
            return {};
        }
    }

    // Get user's survivor picks
    async getUserPicks(userId) {
        try {
            const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`));
            if (!picksDoc.exists()) {
                return { picks: {} };
            }
            return picksDoc.data();
        } catch (error) {
            console.error(`❌ Error loading picks for user ${userId}:`, error);
            return { picks: {} };
        }
    }

    // Get current survivor status
    async getSurvivorStatus() {
        try {
            const statusDoc = await getDoc(doc(this.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status'));
            if (!statusDoc.exists()) {
                return {};
            }
            return statusDoc.data();
        } catch (error) {
            console.error('❌ Error loading survivor status:', error);
            return {};
        }
    }

    // Determine game winner from Firestore data
    determineWinner(gameData) {
        // Handle different possible status formats
        const status = gameData.status || gameData.game_status;

        if (!status || status === 'Not Started' || status.includes('Q') || status.includes('Half')) {
            return null; // Game not finished
        }

        if (status === 'Final' || status === 'FINAL' || status === 'Complete') {
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

        return null; // Game in progress or unknown status
    }

    // Analyze a specific user's elimination status
    async analyzeUser(userId) {
        console.log(`🔍 Analyzing user ${userId}...`);

        const userPicks = await this.getUserPicks(userId);
        const picks = userPicks.picks || {};

        const analysis = {
            userId,
            weekResults: [],
            shouldBeEliminated: false,
            eliminationWeek: null,
            eliminationReason: null
        };

        // Check each week's pick
        for (let week = 1; week <= 18; week++) {
            const weekPick = picks[week];
            if (!weekPick) {
                continue; // No pick for this week
            }

            const gameResults = await this.getWeekGameResults(week);
            const gameData = gameResults[weekPick.gameId];

            if (!gameData) {
                analysis.weekResults.push({
                    week,
                    pick: weekPick,
                    status: 'GAME_NOT_FOUND',
                    result: 'UNKNOWN'
                });
                continue;
            }

            const winner = this.determineWinner(gameData);

            if (winner === null) {
                analysis.weekResults.push({
                    week,
                    pick: weekPick,
                    status: gameData.status,
                    result: 'IN_PROGRESS'
                });
            } else if (winner === weekPick.team) {
                analysis.weekResults.push({
                    week,
                    pick: weekPick,
                    winner,
                    status: gameData.status,
                    result: 'WIN'
                });
            } else {
                analysis.weekResults.push({
                    week,
                    pick: weekPick,
                    winner,
                    status: gameData.status,
                    result: 'LOSS'
                });

                // First loss eliminates the user
                if (!analysis.shouldBeEliminated) {
                    analysis.shouldBeEliminated = true;
                    analysis.eliminationWeek = week;
                    analysis.eliminationReason = `Picked ${weekPick.team}, ${winner} won`;
                }
            }
        }

        return analysis;
    }

    // Analyze all pool members
    async analyzeAllUsers() {
        console.log('🔍 Starting comprehensive survivor analysis...');

        const poolMembers = await this.getPoolMembers();
        const currentStatus = await this.getSurvivorStatus();

        const results = {
            totalUsers: poolMembers.length,
            correctlyEliminated: [],
            incorrectlyEliminated: [],
            correctlyAlive: [],
            shouldBeEliminated: []
        };

        for (const userId of poolMembers) {
            console.log(`👤 Analyzing ${userId}...`);

            const analysis = await this.analyzeUser(userId);
            const currentUserStatus = currentStatus[userId] || { eliminated: false };
            const isCurrentlyEliminated = currentUserStatus.eliminated;

            if (analysis.shouldBeEliminated && isCurrentlyEliminated) {
                results.correctlyEliminated.push({
                    userId,
                    eliminationWeek: analysis.eliminationWeek,
                    reason: analysis.eliminationReason
                });
            } else if (analysis.shouldBeEliminated && !isCurrentlyEliminated) {
                results.shouldBeEliminated.push({
                    userId,
                    eliminationWeek: analysis.eliminationWeek,
                    reason: analysis.eliminationReason,
                    weekResults: analysis.weekResults
                });
            } else if (!analysis.shouldBeEliminated && isCurrentlyEliminated) {
                results.incorrectlyEliminated.push({
                    userId,
                    currentStatus: currentUserStatus,
                    weekResults: analysis.weekResults
                });
            } else {
                results.correctlyAlive.push({
                    userId,
                    weekResults: analysis.weekResults
                });
            }
        }

        // Summary
        console.log('📊 SURVIVOR ANALYSIS COMPLETE:');
        console.log(`✅ Correctly eliminated: ${results.correctlyEliminated.length}`);
        console.log(`❌ Incorrectly eliminated: ${results.incorrectlyEliminated.length}`);
        console.log(`✅ Correctly alive: ${results.correctlyAlive.length}`);
        console.log(`⚠️ Should be eliminated: ${results.shouldBeEliminated.length}`);

        return results;
    }

    // Fix incorrect eliminations
    async fixIncorrectEliminations(analysisResults) {
        console.log('🔧 Starting elimination fixes...');

        const fixes = [];
        const statusUpdates = {};

        // Restore incorrectly eliminated users
        for (const user of analysisResults.incorrectlyEliminated) {
            console.log(`🔧 RESTORING user ${user.userId} - incorrectly eliminated`);
            statusUpdates[`${user.userId}.eliminated`] = false;
            statusUpdates[`${user.userId}.eliminatedWeek`] = null;
            statusUpdates[`${user.userId}.eliminatedDate`] = null;
            statusUpdates[`${user.userId}.eliminationReason`] = null;
            fixes.push(`RESTORED: ${user.userId}`);
        }

        // Eliminate users who should be eliminated
        for (const user of analysisResults.shouldBeEliminated) {
            console.log(`🔧 ELIMINATING user ${user.userId} - Week ${user.eliminationWeek}: ${user.reason}`);
            statusUpdates[`${user.userId}.eliminated`] = true;
            statusUpdates[`${user.userId}.eliminatedWeek`] = user.eliminationWeek;
            statusUpdates[`${user.userId}.eliminatedDate`] = new Date().toISOString();
            statusUpdates[`${user.userId}.eliminationReason`] = user.reason;
            fixes.push(`ELIMINATED: ${user.userId} (Week ${user.eliminationWeek})`);
        }

        // Apply updates to Firestore
        if (Object.keys(statusUpdates).length > 0) {
            console.log('💾 Applying status updates to Firestore...');
            const statusDocRef = doc(this.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
            await setDoc(statusDocRef, statusUpdates, { merge: true });
            console.log('✅ Status updates complete');
        } else {
            console.log('✅ No fixes needed - all eliminations are correct');
        }

        return {
            fixesApplied: fixes.length,
            fixes
        };
    }

    // Complete diagnostic and fix workflow
    async runCompleteAnalysis() {
        try {
            console.log('🚀 Starting complete survivor elimination analysis...');

            // Step 1: Analyze all users
            const analysis = await this.analyzeAllUsers();

            // Step 2: Apply fixes if needed
            const fixes = await this.fixIncorrectEliminations(analysis);

            // Step 3: Final report
            console.log('📋 FINAL REPORT:');
            console.log(`Total users analyzed: ${analysis.totalUsers}`);
            console.log(`Fixes applied: ${fixes.fixesApplied}`);

            if (fixes.fixes.length > 0) {
                console.log('Changes made:');
                fixes.fixes.forEach(fix => console.log(`  • ${fix}`));
            }

            return {
                analysis,
                fixes,
                success: true
            };

        } catch (error) {
            console.error('❌ Analysis failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.SurvivorDiagnostic = SurvivorDiagnostic;
}

if (typeof module !== 'undefined') {
    module.exports = SurvivorDiagnostic;
}