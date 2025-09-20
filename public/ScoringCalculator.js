// 🏆 NerdFootball Scoring Calculator - Confidence Points System
// Handles all scoring logic with bulletproof edge case management

window.ScoringCalculator = {

    /**
     * Calculate points for a user's picks in a specific week
     * @param {Object} userPicks - User's picks for the week
     * @param {Array} weekGames - Games for the week with results
     * @param {number} weekNumber - Week number
     * @returns {Object} Scoring results with detailed breakdown
     */
    async calculateWeeklyPoints(userPicks, weekGames, weekNumber) {
        try {
            console.log(`🏆 Calculating weekly points for week ${weekNumber}`);

            const results = {
                weekNumber,
                totalPoints: 0,
                possiblePoints: 0,
                correctPicks: 0,
                totalPicks: 0,
                accuracy: 0,
                gameResults: [],
                incomplete: false,
                confidencePointsUsed: [],
                timestamp: new Date().toISOString()
            };

            // Validate inputs
            if (!userPicks || !weekGames || !Array.isArray(weekGames)) {
                console.warn(`⚠️ Invalid inputs for week ${weekNumber} scoring`);
                return results;
            }

            // Process each game
            for (const game of weekGames) {
                const gameId = game.id.toString();
                const userPick = userPicks[gameId];

                const gameResult = {
                    gameId: gameId,
                    homeTeam: game.home || game.h,
                    awayTeam: game.away || game.a,
                    actualWinner: game.winner,
                    userPick: userPick?.winner || null,
                    confidencePoints: userPick?.confidence || 0,
                    pointsEarned: 0,
                    correct: false,
                    gameCompleted: !!(game.winner && game.status === 'Final')
                };

                // Only score completed games
                if (gameResult.gameCompleted) {
                    results.totalPicks++;
                    results.possiblePoints += gameResult.confidencePoints;
                    results.confidencePointsUsed.push(gameResult.confidencePoints);

                    // Check if pick is correct
                    if (userPick && userPick.winner === game.winner) {
                        gameResult.correct = true;
                        gameResult.pointsEarned = gameResult.confidencePoints;
                        results.totalPoints += gameResult.confidencePoints;
                        results.correctPicks++;
                    }
                }

                results.gameResults.push(gameResult);
            }

            // Calculate accuracy
            results.accuracy = results.totalPicks > 0 ?
                (results.correctPicks / results.totalPicks * 100) : 0;

            // Check for incomplete picks (missing confidence points)
            const expectedGames = weekGames.filter(g => g.winner && g.status === 'Final').length;
            results.incomplete = results.totalPicks < expectedGames;

            // Validate confidence points (should be 1 through N where N = games that week)
            if (!results.incomplete && expectedGames > 0) {
                const sortedConfidence = results.confidencePointsUsed.sort((a, b) => a - b);
                const expectedConfidence = Array.from({length: expectedGames}, (_, i) => i + 1);

                if (JSON.stringify(sortedConfidence) !== JSON.stringify(expectedConfidence)) {
                    console.warn(`⚠️ Week ${weekNumber} has ${expectedGames} games - Invalid confidence distribution:`, {
                        expected: expectedConfidence,
                        actual: sortedConfidence
                    });
                }
            }

            // Add week metadata for reference
            results.gamesInWeek = expectedGames;
            results.maxPossiblePoints = expectedGames > 0 ? (expectedGames * (expectedGames + 1)) / 2 : 0;

            console.log(`✅ Week ${weekNumber}: ${results.totalPoints}/${results.possiblePoints} points (${results.accuracy.toFixed(1)}% accuracy)`);
            return results;

        } catch (error) {
            console.error(`❌ Error calculating weekly points for week ${weekNumber}:`, error);
            return {
                weekNumber,
                totalPoints: 0,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    },

    /**
     * Calculate season totals for a user across all weeks
     * @param {string} userId - User ID
     * @param {Array} completedWeeks - Array of week numbers to include
     * @returns {Object} Season totals and statistics
     */
    async calculateSeasonTotals(userId, completedWeeks = []) {
        try {
            console.log(`🏆 Calculating season totals for user ${userId}`);

            const seasonResults = {
                userId,
                totalPoints: 0,
                totalPossiblePoints: 0,
                totalCorrectPicks: 0,
                totalPicks: 0,
                overallAccuracy: 0,
                weeksPlayed: 0,
                weeklyBreakdown: [],
                bestWeek: null,
                worstWeek: null,
                consistency: 0,
                lastUpdated: new Date().toISOString()
            };

            // Process each completed week
            for (const weekNumber of completedWeeks) {
                try {
                    // Get user's weekly scoring data
                    const weeklyData = await this.getWeeklyScoreFromFirestore(userId, weekNumber);

                    if (weeklyData && weeklyData.totalPoints !== undefined) {
                        seasonResults.totalPoints += weeklyData.totalPoints || 0;
                        seasonResults.totalPossiblePoints += weeklyData.possiblePoints || 0;
                        seasonResults.totalCorrectPicks += weeklyData.correctPicks || 0;
                        seasonResults.totalPicks += weeklyData.totalPicks || 0;
                        seasonResults.weeksPlayed++;

                        const weekSummary = {
                            week: weekNumber,
                            points: weeklyData.totalPoints || 0,
                            accuracy: weeklyData.accuracy || 0
                        };

                        seasonResults.weeklyBreakdown.push(weekSummary);

                        // Track best/worst weeks
                        if (!seasonResults.bestWeek || weekSummary.points > seasonResults.bestWeek.points) {
                            seasonResults.bestWeek = weekSummary;
                        }
                        if (!seasonResults.worstWeek || weekSummary.points < seasonResults.worstWeek.points) {
                            seasonResults.worstWeek = weekSummary;
                        }
                    }
                } catch (weekError) {
                    console.warn(`⚠️ Error processing week ${weekNumber} for user ${userId}:`, weekError);
                }
            }

            // Calculate derived statistics
            if (seasonResults.totalPicks > 0) {
                seasonResults.overallAccuracy = seasonResults.totalCorrectPicks / seasonResults.totalPicks * 100;
            }

            // Calculate consistency (standard deviation of weekly scores)
            if (seasonResults.weeklyBreakdown.length > 1) {
                const scores = seasonResults.weeklyBreakdown.map(w => w.points);
                const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
                const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
                seasonResults.consistency = Math.sqrt(variance);
            }

            console.log(`✅ Season totals: ${seasonResults.totalPoints} points across ${seasonResults.weeksPlayed} weeks`);
            return seasonResults;

        } catch (error) {
            console.error(`❌ Error calculating season totals for user ${userId}:`, error);
            return {
                userId,
                totalPoints: 0,
                error: error.message,
                lastUpdated: new Date().toISOString()
            };
        }
    },

    /**
     * Get weekly score from Firestore
     * @param {string} userId - User ID
     * @param {number} weekNumber - Week number
     * @returns {Object} Weekly scoring data
     */
    async getWeeklyScoreFromFirestore(userId, weekNumber) {
        try {
            const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
            const docRef = window.doc(window.db, scorePath);
            const docSnap = await window.getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return data.weeklyPoints?.[weekNumber] || null;
            }
            return null;
        } catch (error) {
            console.error(`❌ Error fetching weekly score for user ${userId}, week ${weekNumber}:`, error);
            return null;
        }
    },

    /**
     * Save weekly score to Firestore
     * @param {string} userId - User ID
     * @param {number} weekNumber - Week number
     * @param {Object} weeklyResults - Weekly scoring results
     */
    async saveWeeklyScoreToFirestore(userId, weekNumber, weeklyResults) {
        try {
            const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
            const docRef = window.doc(window.db, scorePath);

            // Update both weekly points and total points
            const updateData = {
                [`weeklyPoints.${weekNumber}`]: weeklyResults,
                totalPoints: await this.calculateUserTotalPoints(userId, weekNumber, weeklyResults.totalPoints),
                lastUpdated: new Date().toISOString()
            };

            await window.setDoc(docRef, updateData, { merge: true });
            console.log(`✅ Saved weekly score for user ${userId}, week ${weekNumber}: ${weeklyResults.totalPoints} points`);

        } catch (error) {
            console.error(`❌ Error saving weekly score for user ${userId}, week ${weekNumber}:`, error);
        }
    },

    /**
     * Calculate updated total points for a user
     * @param {string} userId - User ID
     * @param {number} weekNumber - Week being updated
     * @param {number} weeklyPoints - Points for this week
     * @returns {number} New total points
     */
    async calculateUserTotalPoints(userId, weekNumber, weeklyPoints) {
        try {
            const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
            const docRef = window.doc(window.db, scorePath);
            const docSnap = await window.getDoc(docRef);

            let totalPoints = weeklyPoints; // Start with this week's points

            if (docSnap.exists()) {
                const data = docSnap.data();
                const existingWeekly = data.weeklyPoints || {};

                // Sum all weeks except the current one (to avoid double counting)
                for (const [week, weekData] of Object.entries(existingWeekly)) {
                    if (parseInt(week) !== weekNumber && weekData.totalPoints) {
                        totalPoints += weekData.totalPoints;
                    }
                }
            }

            return totalPoints;
        } catch (error) {
            console.error(`❌ Error calculating total points for user ${userId}:`, error);
            return weeklyPoints; // Fallback to just this week's points
        }
    },

    /**
     * Batch calculate and save scores for all users for a specific week
     * @param {number} weekNumber - Week to process
     * @returns {Object} Processing results
     */
    async processWeekScoring(weekNumber) {
        try {
            console.log(`🚀 Processing week ${weekNumber} scoring for all users...`);

            const results = {
                weekNumber,
                usersProcessed: 0,
                errors: [],
                startTime: new Date().toISOString()
            };

            // Get week games with results
            const weekGames = await this.getWeekGamesWithResults(weekNumber);
            if (!weekGames || weekGames.length === 0) {
                throw new Error(`No games found for week ${weekNumber}`);
            }

            // Get all pool members
            const poolMembers = await this.getPoolMembers();

            for (const member of poolMembers) {
                try {
                    // Get user picks for this week
                    const userPicks = await this.getUserPicksForWeek(member.uid, weekNumber);

                    // Calculate weekly points
                    const weeklyResults = await this.calculateWeeklyPoints(userPicks, weekGames, weekNumber);

                    // Save to Firestore
                    await this.saveWeeklyScoreToFirestore(member.uid, weekNumber, weeklyResults);

                    results.usersProcessed++;

                } catch (userError) {
                    console.error(`❌ Error processing user ${member.uid} for week ${weekNumber}:`, userError);
                    results.errors.push({
                        userId: member.uid,
                        error: userError.message
                    });
                }
            }

            results.endTime = new Date().toISOString();
            console.log(`✅ Week ${weekNumber} scoring complete: ${results.usersProcessed} users processed`);

            return results;

        } catch (error) {
            console.error(`❌ Error processing week ${weekNumber} scoring:`, error);
            throw error;
        }
    },

    /**
     * Get games for a week with results
     */
    async getWeekGamesWithResults(weekNumber) {
        try {
            const response = await fetch(`nfl_2025_week_${weekNumber}.json`);
            if (!response.ok) throw new Error(`Failed to fetch week ${weekNumber} games`);

            const weekData = await response.json();
            return weekData.games || [];
        } catch (error) {
            console.error(`❌ Error fetching week ${weekNumber} games:`, error);
            return [];
        }
    },

    /**
     * Get pool members - filter out invalid entries
     */
    async getPoolMembers() {
        try {
            const membersRef = window.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
            const membersSnap = await window.getDoc(membersRef);

            if (membersSnap.exists()) {
                const allMembers = Object.values(membersSnap.data());
                return allMembers.filter(member => member && member.uid && member.uid !== 'undefined');
            }
            return [];
        } catch (error) {
            console.error('❌ Error fetching pool members:', error);
            return [];
        }
    },

    /**
     * Get user picks for a week
     */
    async getUserPicksForWeek(userId, weekNumber) {
        try {
            // Use EXACT same path as The Grid
            const picksCollectionPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions`;
            const picksDocRef = window.doc(window.db, picksCollectionPath, userId);
            const picksSnap = await window.getDoc(picksDocRef);

            if (picksSnap.exists()) {
                return picksSnap.data();
            }
            return {};
        } catch (error) {
            console.error(`❌ Error fetching picks for user ${userId}, week ${weekNumber}:`, error);
            return {};
        }
    },

    /**
     * Verify game counts across all weeks (diagnostic function)
     * @returns {Object} Game count analysis across all 18 weeks
     */
    async verifyWeeklyGameCounts() {
        console.log('🔍 Verifying game counts across all weeks...');

        const results = {
            weeks: {},
            summary: {
                totalWeeks: 0,
                averageGames: 0,
                minGames: Infinity,
                maxGames: 0,
                uniqueCounts: new Set()
            }
        };

        for (let week = 1; week <= 18; week++) {
            try {
                const weekGames = await this.getWeekGamesWithResults(week);
                const gameCount = weekGames.length;
                const maxPoints = gameCount > 0 ? (gameCount * (gameCount + 1)) / 2 : 0;

                results.weeks[week] = {
                    gameCount,
                    maxPoints,
                    status: gameCount > 0 ? 'valid' : 'no_games'
                };

                if (gameCount > 0) {
                    results.summary.totalWeeks++;
                    results.summary.minGames = Math.min(results.summary.minGames, gameCount);
                    results.summary.maxGames = Math.max(results.summary.maxGames, gameCount);
                    results.summary.uniqueCounts.add(gameCount);
                }

            } catch (error) {
                results.weeks[week] = {
                    gameCount: 0,
                    maxPoints: 0,
                    status: 'error',
                    error: error.message
                };
            }
        }

        // Calculate average
        const validWeeks = Object.values(results.weeks).filter(w => w.gameCount > 0);
        results.summary.averageGames = validWeeks.length > 0 ?
            validWeeks.reduce((sum, w) => sum + w.gameCount, 0) / validWeeks.length : 0;

        // Convert Set to Array for display
        results.summary.uniqueCounts = Array.from(results.summary.uniqueCounts).sort();

        console.log('📊 Game Count Analysis:', {
            uniqueGameCounts: results.summary.uniqueCounts,
            range: `${results.summary.minGames}-${results.summary.maxGames} games per week`,
            average: results.summary.averageGames.toFixed(1)
        });

        return results;
    }
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏆 ScoringCalculator loaded and ready');
});