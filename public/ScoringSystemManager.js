// 🏆 Scoring System Manager - Main Controller for NerdFootball Scoring
// Integrates ScoringCalculator and WeeklyLeaderboardGenerator into unified system

window.ScoringSystemManager = {

    /**
     * Process complete scoring for a specific week
     * @param {number} weekNumber - Week to process
     * @param {boolean} forceRecalculate - Whether to recalculate existing scores
     * @returns {Object} Processing results
     */
    async processWeekScoring(weekNumber, forceRecalculate = false) {
        try {
            console.log(`🚀 Processing complete scoring for Week ${weekNumber}...`);

            const results = {
                weekNumber,
                phase1_userScoring: null,
                phase2_leaderboard: null,
                phase3_seasonUpdate: null,
                startTime: new Date().toISOString(),
                success: false
            };

            // Phase 1: Calculate and save individual user scores
            console.log(`📊 Phase 1: Calculating user scores for Week ${weekNumber}...`);
            results.phase1_userScoring = await window.ScoringCalculator.processWeekScoring(weekNumber);

            // Phase 2: Generate weekly leaderboard
            console.log(`🏆 Phase 2: Generating weekly leaderboard for Week ${weekNumber}...`);
            results.phase2_leaderboard = await window.WeeklyLeaderboardGenerator.generateWeeklyLeaderboard(weekNumber, true);

            // Phase 3: Update season aggregates for all users
            console.log(`🎯 Phase 3: Updating season totals...`);
            results.phase3_seasonUpdate = await this.updateSeasonTotals(weekNumber);

            results.endTime = new Date().toISOString();
            results.success = true;

            console.log(`✅ Complete scoring process finished for Week ${weekNumber}`);
            console.log(`📈 Results: ${results.phase1_userScoring.usersProcessed} users scored, leaderboard saved, season totals updated`);

            return results;

        } catch (error) {
            console.error(`❌ Error in complete scoring process for Week ${weekNumber}:`, error);
            throw error;
        }
    },

    /**
     * Update season totals for all users after a week is processed
     * @param {number} weekNumber - Week that was just processed
     * @returns {Object} Update results
     */
    async updateSeasonTotals(weekNumber) {
        try {
            console.log(`🎯 Updating season totals after Week ${weekNumber}...`);

            const results = {
                usersUpdated: 0,
                errors: [],
                seasonLeaderboard: null
            };

            // Get all pool members
            const poolMembers = await this.getPoolMembers();

            // Get list of completed weeks (1 through weekNumber)
            const completedWeeks = Array.from({length: weekNumber}, (_, i) => i + 1);

            // Update each user's season totals
            for (const member of poolMembers) {
                try {
                    const seasonTotals = await window.ScoringCalculator.calculateSeasonTotals(member.uid, completedWeeks);
                    await this.saveUserSeasonTotals(member.uid, seasonTotals);
                    results.usersUpdated++;
                } catch (userError) {
                    console.error(`❌ Error updating season totals for user ${member.uid}:`, userError);
                    results.errors.push({
                        userId: member.uid,
                        error: userError.message
                    });
                }
            }

            // Generate season leaderboard
            results.seasonLeaderboard = await this.generateSeasonLeaderboard(completedWeeks);

            console.log(`✅ Season totals updated: ${results.usersUpdated} users, ${results.errors.length} errors`);
            return results;

        } catch (error) {
            console.error(`❌ Error updating season totals:`, error);
            throw error;
        }
    },

    /**
     * Generate current season leaderboard
     * @param {Array} completedWeeks - Array of completed week numbers
     * @returns {Object} Season leaderboard
     */
    async generateSeasonLeaderboard(completedWeeks = []) {
        try {
            console.log(`🏆 Generating season leaderboard for weeks: ${completedWeeks.join(', ')}`);

            const leaderboard = {
                type: 'season',
                weeks: completedWeeks,
                generatedAt: new Date().toISOString(),
                standings: [],
                metadata: {
                    totalUsers: 0,
                    totalWeeks: completedWeeks.length,
                    averageScore: 0,
                    highScore: 0
                }
            };

            // Use stored weekly data for FAST and CONSISTENT results
            const poolMembers = await this.getPoolMembers();
            const userTotals = [];

            console.log(`🏆 Loading season data for ${completedWeeks.length} weeks: ${completedWeeks.join(', ')}`);

            for (const member of poolMembers) {
                try {
                    // Get stored scoring data document
                    const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${member.uid}`;
                    const docRef = window.doc(window.db, scorePath);
                    const docSnap = await window.getDoc(docRef);

                    let totalPoints = 0;
                    let totalCorrectPicks = 0;
                    let totalPicks = 0;
                    let weeksPlayed = 0;
                    let bestWeek = null;
                    let worstWeek = null;

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const weeklyPoints = data.weeklyPoints || {};

                        // Aggregate ONLY the completed weeks
                        for (const weekNumber of completedWeeks) {
                            const weekData = weeklyPoints[weekNumber.toString()]; // Try string key
                            if (!weekData) {
                                // Also try integer key
                                const weekDataInt = weeklyPoints[weekNumber];
                                if (weekDataInt) {
                                    const points = weekDataInt.totalPoints || 0;
                                    totalPoints += points;
                                    totalCorrectPicks += weekDataInt.correctPicks || 0;
                                    totalPicks += weekDataInt.totalPicks || 0;
                                    weeksPlayed++;

                                    if (!bestWeek || points > bestWeek.points) {
                                        bestWeek = { week: weekNumber, points };
                                    }
                                    if (!worstWeek || points < worstWeek.points) {
                                        worstWeek = { week: weekNumber, points };
                                    }
                                }
                            } else {
                                const points = weekData.totalPoints || 0;
                                totalPoints += points;
                                totalCorrectPicks += weekData.correctPicks || 0;
                                totalPicks += weekData.totalPicks || 0;
                                weeksPlayed++;

                                if (!bestWeek || points > bestWeek.points) {
                                    bestWeek = { week: weekNumber, points };
                                }
                                if (!worstWeek || points < worstWeek.points) {
                                    worstWeek = { week: weekNumber, points };
                                }
                            }
                        }
                    }

                    const overallAccuracy = totalPicks > 0 ? (totalCorrectPicks / totalPicks * 100) : 0;

                    userTotals.push({
                        userId: member.uid,
                        displayName: member.displayName || member.email || `User ${member.uid.slice(-6)}`,
                        email: member.email,
                        totalPoints: totalPoints,
                        totalCorrectPicks: totalCorrectPicks,
                        totalPicks: totalPicks,
                        overallAccuracy: overallAccuracy,
                        weeksPlayed: weeksPlayed,
                        consistency: 0,
                        bestWeek: bestWeek,
                        worstWeek: worstWeek
                    });

                    if (totalPoints > 0) {
                        console.log(`✅ ${member.displayName || member.uid.slice(-6)}: ${totalPoints} points (${weeksPlayed} weeks)`);
                    }
                } catch (userError) {
                    console.warn(`⚠️ Error loading stored data for ${member.uid}:`, userError);
                }
            }

            // Sort by total points with tie-breaking
            userTotals.sort((a, b) => {
                if (a.totalPoints !== b.totalPoints) {
                    return b.totalPoints - a.totalPoints;
                }
                if (a.overallAccuracy !== b.overallAccuracy) {
                    return b.overallAccuracy - a.overallAccuracy;
                }
                if (a.weeksPlayed !== b.weeksPlayed) {
                    return b.weeksPlayed - a.weeksPlayed;
                }
                return a.displayName.localeCompare(b.displayName);
            });

            // Assign ranks
            let currentRank = 1;
            let previousScore = null;

            for (let i = 0; i < userTotals.length; i++) {
                const user = userTotals[i];

                if (previousScore !== null && user.totalPoints < previousScore) {
                    currentRank = i + 1;
                }

                user.rank = currentRank;
                previousScore = user.totalPoints;
                leaderboard.standings.push(user);
            }

            // Calculate metadata
            if (userTotals.length > 0) {
                const scores = userTotals.map(u => u.totalPoints);
                leaderboard.metadata.totalUsers = userTotals.length;
                leaderboard.metadata.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                leaderboard.metadata.highScore = Math.max(...scores);
            }

            // Save season leaderboard
            await this.saveSeasonLeaderboard(leaderboard);

            console.log(`✅ Season leaderboard generated: ${leaderboard.standings.length} users, high score: ${leaderboard.metadata.highScore}`);
            return leaderboard;

        } catch (error) {
            console.error(`❌ Error generating season leaderboard:`, error);
            throw error;
        }
    },

    /**
     * Save user season totals to Firestore
     * @param {string} userId - User ID
     * @param {Object} seasonTotals - Season totals data
     */
    async saveUserSeasonTotals(userId, seasonTotals) {
        try {
            const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
            const docRef = window.doc(window.db, scorePath);

            const updateData = {
                totalPoints: seasonTotals.totalPoints,
                seasonStats: seasonTotals,
                lastUpdated: new Date().toISOString()
            };

            await window.setDoc(docRef, updateData, { merge: true });

        } catch (error) {
            console.error(`❌ Error saving season totals for user ${userId}:`, error);
            throw error;
        }
    },

    /**
     * Get user season totals from Firestore
     * @param {string} userId - User ID
     * @returns {Object} Season totals data
     */
    async getUserSeasonTotals(userId) {
        try {
            const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
            const docRef = window.doc(window.db, scorePath);
            const docSnap = await window.getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return data.seasonStats || null;
            }
            return null;

        } catch (error) {
            console.error(`❌ Error getting season totals for user ${userId}:`, error);
            return null;
        }
    },

    /**
     * Save season leaderboard to Firestore
     * @param {Object} leaderboard - Season leaderboard data
     */
    async saveSeasonLeaderboard(leaderboard) {
        try {
            const leaderboardPath = `artifacts/nerdfootball/pools/nerduniverse-2025/leaderboards/season-2025`;
            const docRef = window.doc(window.db, leaderboardPath);

            await window.setDoc(docRef, leaderboard);
            console.log(`✅ Saved season leaderboard to Firestore`);

        } catch (error) {
            console.error(`❌ Error saving season leaderboard:`, error);
            throw error;
        }
    },

    /**
     * Get season leaderboard from Firestore
     * @returns {Object} Season leaderboard data
     */
    async getSeasonLeaderboard() {
        try {
            const leaderboardPath = `artifacts/nerdfootball/pools/nerduniverse-2025/leaderboards/season-2025`;
            const docRef = window.doc(window.db, leaderboardPath);
            const docSnap = await window.getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;

        } catch (error) {
            console.error(`❌ Error getting season leaderboard:`, error);
            return null;
        }
    },

    /**
     * Initialize scoring system for new users or migrate existing users
     * @param {boolean} forceMigration - Whether to force migration of existing users
     * @returns {Object} Migration results
     */
    async initializeScoringSystem(forceMigration = false) {
        try {
            console.log(`🚀 Initializing scoring system${forceMigration ? ' (forced migration)' : ''}...`);

            const results = {
                usersInitialized: 0,
                usersMigrated: 0,
                errors: [],
                startTime: new Date().toISOString()
            };

            const poolMembers = await this.getPoolMembers();

            for (const member of poolMembers) {
                try {
                    // Validate member has required fields
                    if (!member.uid || member.uid === 'undefined') {
                        console.error('❌ Invalid pool member (missing uid):', member);
                        results.errors.push({
                            userId: member.uid || 'undefined',
                            error: `Invalid pool member: missing uid. Member data: ${JSON.stringify(member)}`
                        });
                        continue;
                    }

                    const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${member.uid}`;
                    const docRef = window.doc(window.db, scorePath);
                    const docSnap = await window.getDoc(docRef);

                    if (!docSnap.exists() || forceMigration) {
                        // Initialize user scoring document
                        const initialData = {
                            userId: member.uid,
                            displayName: member.displayName || member.email || `User ${member.uid.slice(-6)}`,
                            email: member.email || '',
                            totalPoints: 0,
                            weeklyPoints: {},
                            seasonStats: {
                                totalPoints: 0,
                                totalCorrectPicks: 0,
                                totalPicks: 0,
                                overallAccuracy: 0,
                                weeksPlayed: 0
                            },
                            createdAt: new Date().toISOString(),
                            lastUpdated: new Date().toISOString()
                        };

                        await window.setDoc(docRef, initialData);

                        if (docSnap.exists()) {
                            results.usersMigrated++;
                        } else {
                            results.usersInitialized++;
                        }
                    }

                } catch (userError) {
                    console.error(`❌ Error initializing user ${member.uid}:`, userError);
                    results.errors.push({
                        userId: member.uid || 'unknown',
                        error: userError.message,
                        memberData: JSON.stringify(member)
                    });
                }
            }

            results.endTime = new Date().toISOString();
            console.log(`✅ Scoring system initialization complete: ${results.usersInitialized} new, ${results.usersMigrated} migrated, ${results.errors.length} errors`);

            return results;

        } catch (error) {
            console.error(`❌ Error initializing scoring system:`, error);
            throw error;
        }
    },

    /**
     * Batch process multiple weeks
     * @param {Array} weekNumbers - Weeks to process
     * @param {boolean} forceRecalculate - Whether to recalculate existing scores
     * @returns {Object} Batch processing results
     */
    async batchProcessWeeks(weekNumbers, forceRecalculate = false) {
        console.log(`🚀 Batch processing weeks: ${weekNumbers.join(', ')}`);

        const results = {
            processed: [],
            errors: [],
            startTime: new Date().toISOString()
        };

        for (const weekNumber of weekNumbers) {
            try {
                const weekResult = await this.processWeekScoring(weekNumber, forceRecalculate);
                results.processed.push(weekResult);

                // Brief delay to avoid overwhelming Firestore
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ Error processing week ${weekNumber}:`, error);
                results.errors.push({
                    week: weekNumber,
                    error: error.message
                });
            }
        }

        results.endTime = new Date().toISOString();
        console.log(`✅ Batch processing complete: ${results.processed.length} weeks processed, ${results.errors.length} errors`);

        return results;
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
                const validMembers = allMembers.filter(member => member && member.uid && member.uid !== 'undefined');
                const invalidMembers = allMembers.filter(member => !member || !member.uid || member.uid === 'undefined');

                if (invalidMembers.length > 0) {
                    console.warn(`⚠️ Found ${invalidMembers.length} pool members without UIDs:`, invalidMembers.map(m => m?.email || 'unknown'));
                }

                return validMembers;
            }
            return [];
        } catch (error) {
            console.error('❌ Error fetching pool members:', error);
            return [];
        }
    },

    /**
     * Get invalid pool members for manual fixing
     */
    async getInvalidPoolMembers() {
        try {
            const membersRef = window.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
            const membersSnap = await window.getDoc(membersRef);

            if (membersSnap.exists()) {
                const allMembers = Object.values(membersSnap.data());
                return allMembers.filter(member => !member || !member.uid || member.uid === 'undefined');
            }
            return [];
        } catch (error) {
            console.error('❌ Error fetching invalid pool members:', error);
            return [];
        }
    },

    /**
     * Quick system status check
     * @returns {Object} System status information
     */
    async getSystemStatus() {
        try {
            const status = {
                scoringCalculator: !!window.ScoringCalculator,
                leaderboardGenerator: !!window.WeeklyLeaderboardGenerator,
                poolMembers: 0,
                weeksWithData: 0,
                timestamp: new Date().toISOString()
            };

            // Check pool members
            const members = await this.getPoolMembers();
            status.poolMembers = members.length;

            // Check for weekly data
            for (let week = 1; week <= 18; week++) {
                const leaderboard = await window.WeeklyLeaderboardGenerator.getWeeklyLeaderboard(week);
                if (leaderboard) {
                    status.weeksWithData++;
                }
            }

            return status;

        } catch (error) {
            console.error('❌ Error getting system status:', error);
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏆 ScoringSystemManager loaded and ready');
});