// CONFIDENCE POINTS MATH AUDIT - Line by Line Verification
// Compares raw data calculations vs displayed results to find discrepancies

const admin = require('firebase-admin');

// Initialize Firebase Admin with explicit project ID
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'nerdfootball'
    });
}

class ConfidenceMathAuditor {
    constructor() {
        this.db = admin.firestore();
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
        this.audit = {
            rawPicks: {},
            rawGameResults: {},
            calculatedScores: {},
            displayedScores: {},
            discrepancies: [],
            summary: {}
        };
    }

    // STEP 1: Get all raw confidence picks data
    async getRawPicksData(weekNumber) {
        console.log(`\n🔍 AUDIT STEP 1: Getting raw picks data for Week ${weekNumber}...`);

        const picksPath = `artifacts/nerdfootball/pools/${this.poolId}/confidence/${this.season}/weeks/${weekNumber}`;
        const picksDoc = await this.db.doc(picksPath).get();

        if (!picksDoc.exists) {
            console.log(`❌ No picks data found at: ${picksPath}`);
            return null;
        }

        const picksData = picksDoc.data();
        this.audit.rawPicks[weekNumber] = picksData;

        console.log(`✅ Raw picks data retrieved for ${Object.keys(picksData).length} users`);

        // Log each user's picks in detail
        Object.entries(picksData).forEach(([userId, userData]) => {
            if (userData.picks) {
                console.log(`\n📋 USER ${userId} (${userData.meta?.displayName || 'Unknown'}):`);
                Object.entries(userData.picks).forEach(([gameId, pick]) => {
                    console.log(`  Game ${gameId}: ${pick.winner} (Confidence: ${pick.confidence})`);
                });
            }
        });

        return picksData;
    }

    // STEP 2: Get all raw ESPN game results
    async getRawGameResults() {
        console.log(`\n🔍 AUDIT STEP 2: Getting raw ESPN game results...`);

        const cachePath = 'cache/espn_current_data';
        const cacheDoc = await this.db.doc(cachePath).get();

        if (!cacheDoc.exists) {
            console.log(`❌ No ESPN cache data found at: ${cachePath}`);
            return null;
        }

        const cacheData = cacheDoc.data();
        this.audit.rawGameResults = cacheData;

        console.log(`✅ ESPN cache data retrieved, last updated: ${new Date(cacheData.lastUpdated)}`);

        // Log all team results
        console.log(`\n🏈 GAME RESULTS FROM ESPN CACHE:`);
        Object.entries(cacheData.teamResults || {}).forEach(([key, result]) => {
            console.log(`  ${key}: Winner = ${result.winner}, Score = ${result.homeScore}-${result.awayScore}`);
        });

        return cacheData;
    }

    // STEP 3: Recalculate scores from scratch with detailed logging
    async recalculateScores(weekNumber, picksData, gameResults) {
        console.log(`\n🔍 AUDIT STEP 3: Recalculating Week ${weekNumber} scores from scratch...`);

        const calculatedScores = {};
        const detailedBreakdown = {};

        Object.entries(picksData).forEach(([userId, userData]) => {
            if (!userData.picks) return;

            const userDisplayName = userData.meta?.displayName || `User-${userId}`;
            let userWeeklyScore = 0;
            const userGameBreakdown = [];

            console.log(`\n👤 CALCULATING FOR ${userDisplayName} (${userId}):`);

            Object.entries(userData.picks).forEach(([gameId, pick]) => {
                const pickWinner = pick.winner;
                const pickConfidence = pick.confidence;

                // Find the corresponding game result
                let gameResult = null;
                let gameKey = null;

                // Search for game result by team name
                if (pickWinner && gameResults.teamResults) {
                    for (const [key, result] of Object.entries(gameResults.teamResults)) {
                        if (key.includes(pickWinner) && key.includes(`_${weekNumber}`)) {
                            gameResult = result;
                            gameKey = key;
                            break;
                        }
                    }
                }

                let pointsEarned = 0;
                let status = 'NO_RESULT';

                if (gameResult) {
                    if (gameResult.winner === pickWinner) {
                        pointsEarned = pickConfidence || 0;
                        status = 'CORRECT';
                        userWeeklyScore += pointsEarned;
                    } else {
                        status = 'INCORRECT';
                    }
                } else {
                    status = 'GAME_NOT_FOUND';
                }

                const gameBreakdown = {
                    gameId,
                    pickedTeam: pickWinner,
                    confidence: pickConfidence,
                    actualWinner: gameResult?.winner || 'UNKNOWN',
                    gameKey,
                    pointsEarned,
                    status
                };

                userGameBreakdown.push(gameBreakdown);

                console.log(`  Game ${gameId}: Picked ${pickWinner} (${pickConfidence}) -> ${status} -> ${pointsEarned} points`);
                if (gameResult) {
                    console.log(`    Actual winner: ${gameResult.winner}, Score: ${gameResult.homeScore}-${gameResult.awayScore}`);
                } else {
                    console.log(`    ⚠️  Could not find game result for ${pickWinner}`);
                }
            });

            calculatedScores[userId] = userWeeklyScore;
            detailedBreakdown[userId] = {
                displayName: userDisplayName,
                weeklyScore: userWeeklyScore,
                games: userGameBreakdown
            };

            console.log(`  💯 TOTAL CALCULATED SCORE: ${userWeeklyScore}`);
        });

        this.audit.calculatedScores[weekNumber] = calculatedScores;
        this.audit.detailedBreakdown = detailedBreakdown;

        return { calculatedScores, detailedBreakdown };
    }

    // STEP 4: Get displayed scores from current system
    async getDisplayedScores(weekNumber) {
        console.log(`\n🔍 AUDIT STEP 4: Getting displayed scores from leaderboard...`);

        // Get season summary which contains the displayed totals
        const summaryPath = `artifacts/nerdfootball/pools/${this.poolId}/confidence/${this.season}/summary`;
        const summaryDoc = await this.db.doc(summaryPath).get();

        let displayedScores = {};

        if (summaryDoc.exists) {
            const summaryData = summaryDoc.data();
            displayedScores = summaryData.weeklyTotals?.[weekNumber] || {};
            this.audit.displayedScores[weekNumber] = displayedScores;

            console.log(`✅ Retrieved displayed scores for Week ${weekNumber}:`);
            Object.entries(displayedScores).forEach(([userId, score]) => {
                console.log(`  ${userId}: ${score} points`);
            });
        } else {
            console.log(`❌ No summary data found at: ${summaryPath}`);
        }

        return displayedScores;
    }

    // STEP 5: Compare and find discrepancies
    async findDiscrepancies(weekNumber, calculatedScores, displayedScores) {
        console.log(`\n🔍 AUDIT STEP 5: Comparing calculated vs displayed scores...`);

        const discrepancies = [];
        const allUserIds = new Set([...Object.keys(calculatedScores), ...Object.keys(displayedScores)]);

        allUserIds.forEach(userId => {
            const calculated = calculatedScores[userId] || 0;
            const displayed = displayedScores[userId] || 0;

            if (calculated !== displayed) {
                const discrepancy = {
                    userId,
                    displayName: this.audit.detailedBreakdown[userId]?.displayName || 'Unknown',
                    weekNumber,
                    calculatedScore: calculated,
                    displayedScore: displayed,
                    difference: calculated - displayed,
                    gameBreakdown: this.audit.detailedBreakdown[userId]?.games || []
                };

                discrepancies.push(discrepancy);

                console.log(`❌ DISCREPANCY FOUND:`);
                console.log(`   User: ${discrepancy.displayName} (${userId})`);
                console.log(`   Calculated: ${calculated}, Displayed: ${displayed}, Diff: ${discrepancy.difference}`);
            } else {
                console.log(`✅ ${userId}: Calculated (${calculated}) = Displayed (${displayed})`);
            }
        });

        this.audit.discrepancies = discrepancies;
        return discrepancies;
    }

    // STEP 6: Generate comprehensive audit report
    generateAuditReport(weekNumber) {
        console.log(`\n📊 CONFIDENCE POINTS AUDIT REPORT - WEEK ${weekNumber}`);
        console.log(`==================================================`);

        if (this.audit.discrepancies.length === 0) {
            console.log(`✅ NO DISCREPANCIES FOUND - All calculations match!`);
        } else {
            console.log(`❌ FOUND ${this.audit.discrepancies.length} DISCREPANCIES:`);

            this.audit.discrepancies.forEach((disc, index) => {
                console.log(`\n${index + 1}. ${disc.displayName} (${disc.userId})`);
                console.log(`   Calculated Score: ${disc.calculatedScore}`);
                console.log(`   Displayed Score: ${disc.displayedScore}`);
                console.log(`   Difference: ${disc.difference} points`);
                console.log(`   Game-by-Game Breakdown:`);

                disc.gameBreakdown.forEach(game => {
                    const status = game.status === 'CORRECT' ? '✅' :
                                  game.status === 'INCORRECT' ? '❌' : '⚠️';
                    console.log(`     ${status} Game ${game.gameId}: ${game.pickedTeam} (${game.confidence}) -> ${game.pointsEarned} pts`);
                    if (game.actualWinner !== 'UNKNOWN') {
                        console.log(`       Actual winner: ${game.actualWinner}`);
                    }
                });
            });
        }

        return this.audit;
    }

    // MAIN AUDIT FUNCTION
    async auditWeek(weekNumber) {
        console.log(`🚀 STARTING COMPREHENSIVE AUDIT FOR WEEK ${weekNumber}`);
        console.log(`===============================================`);

        try {
            // Step 1: Get raw picks data
            const picksData = await this.getRawPicksData(weekNumber);
            if (!picksData) return null;

            // Step 2: Get raw game results
            const gameResults = await this.getRawGameResults();
            if (!gameResults) return null;

            // Step 3: Recalculate scores
            const { calculatedScores } = await this.recalculateScores(weekNumber, picksData, gameResults);

            // Step 4: Get displayed scores
            const displayedScores = await this.getDisplayedScores(weekNumber);

            // Step 5: Find discrepancies
            await this.findDiscrepancies(weekNumber, calculatedScores, displayedScores);

            // Step 6: Generate report
            const report = this.generateAuditReport(weekNumber);

            return report;

        } catch (error) {
            console.error(`❌ AUDIT FAILED:`, error);
            return null;
        }
    }
}

// Run audit for specific week
async function runAudit() {
    const auditor = new ConfidenceMathAuditor();

    // You can specify which week to audit here
    const weekToAudit = 2; // Change this as needed

    console.log(`Starting audit for Week ${weekToAudit}...`);
    const result = await auditor.auditWeek(weekToAudit);

    if (result) {
        console.log(`\n✅ Audit completed. Check the detailed output above for any discrepancies.`);
    } else {
        console.log(`\n❌ Audit failed. Check error messages above.`);
    }
}

// Export for use as module or run directly
if (require.main === module) {
    runAudit().catch(console.error);
}

module.exports = ConfidenceMathAuditor;