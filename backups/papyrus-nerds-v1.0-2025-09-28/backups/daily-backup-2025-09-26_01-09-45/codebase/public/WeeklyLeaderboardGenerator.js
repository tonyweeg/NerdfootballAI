// 🏆 Weekly Leaderboard Generator - NerdFootball Scoring System
// Generates weekly leaderboards with intelligent tie-breaking and historical storage

window.WeeklyLeaderboardGenerator = {

    /**
     * Generate complete leaderboard for a specific week
     * @param {number} weekNumber - Week to generate leaderboard for
     * @param {boolean} saveToFirestore - Whether to save results to Firestore
     * @returns {Object} Complete leaderboard data
     */
    async generateWeeklyLeaderboard(weekNumber, saveToFirestore = true) {
        try {
            console.log(`🏆 Generating weekly leaderboard for Week ${weekNumber}...`);

            const leaderboard = {
                weekNumber,
                generatedAt: new Date().toISOString(),
                standings: [],
                metadata: {
                    totalUsers: 0,
                    gamesInWeek: 0,
                    maxPossiblePoints: 0,
                    averageScore: 0,
                    highScore: 0,
                    participationRate: 0
                },
                tieBreaking: {
                    method: 'score -> accuracy -> totalPicks',
                    ties: []
                }
            };

            // Get week games to determine max possible points
            const weekGames = await this.getWeekGames(weekNumber);
            const completedGames = weekGames.filter(g => g.winner && g.status === 'Final');

            leaderboard.metadata.gamesInWeek = completedGames.length;
            leaderboard.metadata.maxPossiblePoints = completedGames.length > 0 ?
                (completedGames.length * (completedGames.length + 1)) / 2 : 0;

            // Get all pool members
            const poolMembers = await this.getPoolMembers();
            leaderboard.metadata.totalUsers = poolMembers.length;

            // Process each user's week performance
            const userPerformances = [];

            for (const member of poolMembers) {
                try {
                    const performance = await this.getUserWeekPerformance(member, weekNumber, completedGames);
                    if (performance) {
                        userPerformances.push(performance);
                    }
                } catch (userError) {
                    console.warn(`⚠️ Error processing user ${member.uid} for week ${weekNumber}:`, userError);
                }
            }

            // Sort users with intelligent tie-breaking
            const sortedPerformances = this.sortWithTieBreaking(userPerformances);

            // Assign rankings and detect ties
            let currentRank = 1;
            let previousScore = null;
            let previousAccuracy = null;
            let usersAtCurrentRank = 0;

            for (let i = 0; i < sortedPerformances.length; i++) {
                const user = sortedPerformances[i];

                // Detect ties based on score and accuracy
                const isTied = previousScore === user.totalPoints &&
                              previousAccuracy === user.accuracy;

                if (!isTied && usersAtCurrentRank > 0) {
                    currentRank += usersAtCurrentRank;
                    usersAtCurrentRank = 0;
                }

                user.rank = currentRank;
                user.isTied = isTied && i > 0;

                if (isTied) {
                    // Track ties for metadata
                    const existingTie = leaderboard.tieBreaking.ties.find(t =>
                        t.score === user.totalPoints && t.accuracy === user.accuracy);

                    if (existingTie) {
                        existingTie.users.push(user.displayName);
                    } else {
                        leaderboard.tieBreaking.ties.push({
                            rank: currentRank,
                            score: user.totalPoints,
                            accuracy: user.accuracy,
                            users: [sortedPerformances[i-1].displayName, user.displayName]
                        });
                    }
                }

                usersAtCurrentRank++;
                previousScore = user.totalPoints;
                previousAccuracy = user.accuracy;

                leaderboard.standings.push(user);
            }

            // Calculate metadata statistics
            if (userPerformances.length > 0) {
                const scores = userPerformances.map(u => u.totalPoints);
                const participatedUsers = userPerformances.filter(u => u.totalPicks > 0);

                leaderboard.metadata.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                leaderboard.metadata.highScore = Math.max(...scores);
                leaderboard.metadata.participationRate = (participatedUsers.length / poolMembers.length) * 100;
            }

            console.log(`✅ Week ${weekNumber} leaderboard: ${leaderboard.standings.length} users, high score: ${leaderboard.metadata.highScore}`);

            // Save to Firestore if requested
            if (saveToFirestore && leaderboard.standings.length > 0) {
                await this.saveWeeklyLeaderboard(weekNumber, leaderboard);
            }

            return leaderboard;

        } catch (error) {
            console.error(`❌ Error generating weekly leaderboard for week ${weekNumber}:`, error);
            throw error;
        }
    },

    /**
     * Get user's performance for a specific week
     * @param {Object} member - Pool member object
     * @param {number} weekNumber - Week number
     * @param {Array} completedGames - Completed games for the week
     * @returns {Object} User performance data
     */
    async getUserWeekPerformance(member, weekNumber, completedGames) {
        try {
            // Get user's picks for this week
            const userPicks = await this.getUserPicks(member.uid, weekNumber);

            // Use ScoringCalculator to get detailed scoring
            const weeklyResults = await window.ScoringCalculator.calculateWeeklyPoints(
                userPicks, completedGames, weekNumber
            );

            // Get user display name
            const displayName = member.displayName || member.email || `User ${member.uid.slice(-6)}`;

            return {
                userId: member.uid,
                displayName,
                email: member.email,
                totalPoints: weeklyResults.totalPoints || 0,
                possiblePoints: weeklyResults.possiblePoints || 0,
                correctPicks: weeklyResults.correctPicks || 0,
                totalPicks: weeklyResults.totalPicks || 0,
                accuracy: weeklyResults.accuracy || 0,
                gamesPlayed: weeklyResults.totalPicks,
                incomplete: weeklyResults.incomplete || false,
                confidenceDistribution: weeklyResults.confidencePointsUsed || [],
                gameResults: weeklyResults.gameResults || []
            };

        } catch (error) {
            console.error(`❌ Error getting user performance for ${member.uid}, week ${weekNumber}:`, error);
            return null;
        }
    },

    /**
     * Sort users with intelligent tie-breaking
     * @param {Array} performances - Array of user performance objects
     * @returns {Array} Sorted array with tie-breaking applied
     */
    sortWithTieBreaking(performances) {
        return performances.sort((a, b) => {
            // Primary: Total points (descending)
            if (a.totalPoints !== b.totalPoints) {
                return b.totalPoints - a.totalPoints;
            }

            // Secondary: Accuracy percentage (descending)
            if (a.accuracy !== b.accuracy) {
                return b.accuracy - a.accuracy;
            }

            // Tertiary: Total picks made (descending) - rewards participation
            if (a.totalPicks !== b.totalPicks) {
                return b.totalPicks - a.totalPicks;
            }

            // Quaternary: Alphabetical by display name (ascending) - final deterministic tie-breaker
            return a.displayName.localeCompare(b.displayName);
        });
    },

    /**
     * Save weekly leaderboard to Firestore
     * @param {number} weekNumber - Week number
     * @param {Object} leaderboard - Leaderboard data
     */
    async saveWeeklyLeaderboard(weekNumber, leaderboard) {
        try {
            const leaderboardPath = `artifacts/nerdfootball/pools/nerduniverse-2025/leaderboards/weekly-${weekNumber}`;
            const docRef = window.doc(window.db, leaderboardPath);

            await window.setDoc(docRef, leaderboard);
            console.log(`✅ Saved weekly leaderboard for week ${weekNumber} to Firestore`);

        } catch (error) {
            console.error(`❌ Error saving weekly leaderboard for week ${weekNumber}:`, error);
            throw error;
        }
    },

    /**
     * Get saved weekly leaderboard from Firestore
     * @param {number} weekNumber - Week number
     * @returns {Object} Saved leaderboard data or null
     */
    async getWeeklyLeaderboard(weekNumber) {
        try {
            const leaderboardPath = `artifacts/nerdfootball/pools/nerduniverse-2025/leaderboards/weekly-${weekNumber}`;
            const docRef = window.doc(window.db, leaderboardPath);
            const docSnap = await window.getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;

        } catch (error) {
            console.error(`❌ Error fetching weekly leaderboard for week ${weekNumber}:`, error);
            return null;
        }
    },

    /**
     * Generate leaderboards for multiple weeks
     * @param {Array} weekNumbers - Array of week numbers to process
     * @param {boolean} forceRegenerate - Whether to regenerate existing leaderboards
     * @returns {Object} Batch processing results
     */
    async generateMultipleWeekLeaderboards(weekNumbers, forceRegenerate = false) {
        console.log(`🚀 Generating leaderboards for weeks: ${weekNumbers.join(', ')}`);

        const results = {
            processed: [],
            skipped: [],
            errors: [],
            startTime: new Date().toISOString()
        };

        for (const weekNumber of weekNumbers) {
            try {
                // Check if leaderboard already exists
                const existing = await this.getWeeklyLeaderboard(weekNumber);

                if (existing && !forceRegenerate) {
                    console.log(`⏭️ Week ${weekNumber} leaderboard already exists, skipping...`);
                    results.skipped.push(weekNumber);
                    continue;
                }

                // Generate new leaderboard
                const leaderboard = await this.generateWeeklyLeaderboard(weekNumber, true);
                results.processed.push({
                    week: weekNumber,
                    users: leaderboard.standings.length,
                    highScore: leaderboard.metadata.highScore
                });

                // Brief delay to avoid overwhelming Firestore
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`❌ Error processing week ${weekNumber}:`, error);
                results.errors.push({
                    week: weekNumber,
                    error: error.message
                });
            }
        }

        results.endTime = new Date().toISOString();
        console.log(`✅ Batch leaderboard generation complete: ${results.processed.length} processed, ${results.skipped.length} skipped, ${results.errors.length} errors`);

        return results;
    },

    /**
     * Get week games data
     */
    async getWeekGames(weekNumber) {
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
    async getUserPicks(userId, weekNumber) {
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
     * Get leaderboard summary for display
     * @param {number} weekNumber - Week number
     * @param {number} topN - Number of top users to return (default: 10)
     * @returns {Object} Leaderboard summary
     */
    async getLeaderboardSummary(weekNumber, topN = 10) {
        try {
            const fullLeaderboard = await this.getWeeklyLeaderboard(weekNumber);

            if (!fullLeaderboard) {
                return {
                    weekNumber,
                    topUsers: [],
                    metadata: { message: 'Leaderboard not yet generated' }
                };
            }

            return {
                weekNumber,
                topUsers: fullLeaderboard.standings.slice(0, topN),
                metadata: fullLeaderboard.metadata,
                generatedAt: fullLeaderboard.generatedAt
            };

        } catch (error) {
            console.error(`❌ Error getting leaderboard summary for week ${weekNumber}:`, error);
            return {
                weekNumber,
                topUsers: [],
                metadata: { error: error.message }
            };
        }
    }
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏆 WeeklyLeaderboardGenerator loaded and ready');
});