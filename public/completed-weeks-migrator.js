// 🚀 COMPLETED WEEKS DATA MIGRATOR
// Migrates Week 1 & 2 data to new precomputed structure for lightning performance

class CompletedWeeksMigrator {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.completedWeeks = [1, 2]; // Weeks to migrate
        this.results = {
            migratedWeeks: [],
            errors: [],
            performance: {}
        };
    }

    // 🏆 MAIN MIGRATION FUNCTION
    async migrateAllCompletedWeeks() {
        console.log('🚀 Starting completed weeks migration...');
        const startTime = performance.now();

        try {
            // Step 1: Migrate individual weeks
            for (const weekNumber of this.completedWeeks) {
                console.log(`📊 Migrating Week ${weekNumber}...`);
                await this.migrateWeek(weekNumber);
            }

            // Step 2: Create season aggregate
            console.log('🏆 Creating season aggregate...');
            await this.createSeasonAggregate();

            // Step 3: Verify migration
            console.log('✅ Verifying migration...');
            await this.verifyMigration();

            const endTime = performance.now();
            this.results.performance.totalTime = endTime - startTime;

            console.log('🎉 Migration complete!', this.results);
            return this.results;

        } catch (error) {
            console.error('❌ Migration failed:', error);
            this.results.errors.push(error.message);
            return this.results;
        }
    }

    // 📊 MIGRATE INDIVIDUAL WEEK
    async migrateWeek(weekNumber) {
        const weekStartTime = performance.now();

        try {
            // Get all the current data for this week
            const weekData = await this.getCurrentWeekData(weekNumber);

            // Calculate confidence pool results
            const confidenceResults = await this.calculateConfidenceResults(weekNumber, weekData);

            // Calculate survivor pool results
            const survivorResults = await this.calculateSurvivorResults(weekNumber, weekData);

            // Create week meta data
            const meta = {
                weekNumber: weekNumber,
                completedAt: new Date().toISOString(),
                totalGames: weekData.games.length,
                finalizedBy: "migration-script",
                pools: ["confidence", "survivor"]
            };

            // Write to new structure
            const completedWeekData = {
                meta: meta,
                confidence: confidenceResults,
                survivor: survivorResults
            };

            await this.writeCompletedWeek(weekNumber, completedWeekData);

            this.results.migratedWeeks.push(weekNumber);

            const weekEndTime = performance.now();
            console.log(`✅ Week ${weekNumber} migrated in ${weekEndTime - weekStartTime}ms`);

        } catch (error) {
            console.error(`❌ Week ${weekNumber} migration failed:`, error);
            this.results.errors.push(`Week ${weekNumber}: ${error.message}`);
        }
    }

    // 📈 GET CURRENT WEEK DATA
    async getCurrentWeekData(weekNumber) {
        console.log(`📊 Reading current Week ${weekNumber} data...`);

        // Get games data
        const gamesResponse = await fetch(`nfl_2025_week_${weekNumber}.json`);
        const gamesData = await gamesResponse.json();

        // Get all user picks for confidence pool
        const confidencePicksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions`;
        console.log(`🎯 Confidence picks path: ${confidencePicksPath}`);

        let confidencePicks = {};
        try {
            const confidencePicksSnap = await window.getDocs(window.collection(window.db, confidencePicksPath));
            confidencePicksSnap.forEach(doc => {
                confidencePicks[doc.id] = doc.data();
            });
            console.log(`✅ Found ${Object.keys(confidencePicks).length} confidence pick users`);
        } catch (error) {
            console.log(`⚠️ Confidence picks error:`, error.message);
        }

        // Get survivor picks using the correct path from working app
        let survivorPicks = {};
        console.log(`🏆 Getting survivor picks for Week ${weekNumber}...`);

        // Try the path that works in the main app
        try {
            // This is the path used in the working survivor system
            const survivorPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks`;
            const survivorPicksSnap = await window.getDocs(window.collection(window.db, survivorPicksPath));

            survivorPicksSnap.forEach(doc => {
                const userPicks = doc.data();
                if (userPicks && userPicks[weekNumber]) {
                    survivorPicks[doc.id] = userPicks[weekNumber];
                }
            });

            console.log(`✅ Found ${Object.keys(survivorPicks).length} survivor pick users`);
        } catch (error) {
            console.log(`⚠️ Survivor picks error:`, error.message);
        }

        // Get pool members
        const poolMembersPath = `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
        const poolMembersDoc = await window.getDoc(window.doc(window.db, poolMembersPath));
        const poolMembers = poolMembersDoc.exists() ? poolMembersDoc.data() : {};

        return {
            games: gamesData.games,
            confidencePicks: confidencePicks,
            survivorPicks: survivorPicks,
            poolMembers: poolMembers
        };
    }

    // 🎯 CALCULATE CONFIDENCE RESULTS
    async calculateConfidenceResults(weekNumber, weekData) {
        console.log(`🎯 Calculating confidence results for Week ${weekNumber}...`);

        const userScores = {};
        const allScores = [];

        // Calculate each user's score
        for (const [userId, userPicks] of Object.entries(weekData.confidencePicks)) {
            if (!weekData.poolMembers[userId]) continue; // Skip non-pool members

            const userScore = this.calculateUserConfidenceScore(userPicks, weekData.games);
            userScores[userId] = userScore;
            allScores.push({ ...userScore, uid: userId });
        }

        // Create leaderboard (sorted by total points, then by correct picks)
        const leaderboard = allScores
            .sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                return b.correctPicks - a.correctPicks;
            })
            .map((user, index) => ({
                uid: user.uid,
                displayName: weekData.poolMembers[user.uid]?.displayName || 'Unknown',
                totalPoints: user.totalPoints,
                correctPicks: user.correctPicks,
                rank: index + 1,
                tiebreaker: null
            }));

        // Calculate week statistics
        const weekStats = this.calculateConfidenceWeekStats(allScores, weekData.games);

        return {
            userScores: userScores,
            leaderboard: leaderboard,
            weekStats: weekStats
        };
    }

    // 👤 CALCULATE USER CONFIDENCE SCORE
    calculateUserConfidenceScore(userPicks, games) {
        let totalPoints = 0;
        let correctPicks = 0;
        let incorrectPicks = 0;
        let totalConfidence = 0;
        const picks = {};

        games.forEach(game => {
            const pick = userPicks[game.id];
            if (pick && pick.winner) {
                const isCorrect = game.winner === pick.winner;
                const points = isCorrect ? (pick.confidence || 0) : 0;

                totalPoints += points;
                totalConfidence += (pick.confidence || 0);

                if (isCorrect) correctPicks++;
                else incorrectPicks++;

                picks[game.id] = {
                    team: pick.winner,
                    confidence: pick.confidence || 0,
                    correct: isCorrect,
                    points: points
                };
            }
        });

        return {
            totalPoints: totalPoints,
            correctPicks: correctPicks,
            incorrectPicks: incorrectPicks,
            averageConfidence: totalConfidence / games.length,
            picks: picks
        };
    }

    // 📊 CALCULATE CONFIDENCE WEEK STATS
    calculateConfidenceWeekStats(allScores, games) {
        const scores = allScores.map(s => s.totalPoints);

        return {
            averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            highScore: Math.max(...scores),
            lowScore: Math.min(...scores),
            totalParticipants: allScores.length,
            mostPickedTeam: "TBD", // Would need pick analysis
            leastPickedTeam: "TBD", // Would need pick analysis
            upsets: [] // Would need upset analysis
        };
    }

    // 🏆 CALCULATE SURVIVOR RESULTS
    async calculateSurvivorResults(weekNumber, weekData) {
        console.log(`🏆 Calculating survivor results for Week ${weekNumber}...`);

        const userStatus = {};
        const aliveUsers = [];
        const eliminatedUsers = [];

        // Calculate each user's survivor status
        for (const [userId, userPick] of Object.entries(weekData.survivorPicks)) {
            if (!weekData.poolMembers[userId]) continue; // Skip non-pool members

            const status = this.calculateUserSurvivorStatus(userPick, weekData.games, weekNumber);
            userStatus[userId] = status;

            if (status.status === 'alive') {
                aliveUsers.push({ ...status, uid: userId });
            } else {
                eliminatedUsers.push({ ...status, uid: userId });
            }
        }

        // Create survivor leaderboard
        const leaderboard = [
            ...aliveUsers.map((user, index) => ({
                uid: user.uid,
                displayName: weekData.poolMembers[user.uid]?.displayName || 'Unknown',
                status: 'alive',
                weeksAlive: user.weeksAlive || weekNumber,
                rank: index + 1
            })),
            ...eliminatedUsers.map((user, index) => ({
                uid: user.uid,
                displayName: weekData.poolMembers[user.uid]?.displayName || 'Unknown',
                status: 'eliminated',
                weeksAlive: user.weeksAlive || 0,
                rank: aliveUsers.length + index + 1
            }))
        ];

        // Calculate survivor stats
        const survivorStats = {
            totalParticipants: Object.keys(userStatus).length,
            remainingAlive: aliveUsers.length,
            eliminatedThisWeek: eliminatedUsers.filter(u => u.eliminatedInWeek === weekNumber).length,
            mostPickedTeam: "TBD", // Would need pick analysis
            safestPick: "TBD",
            riskiestPick: "TBD"
        };

        return {
            userStatus: userStatus,
            leaderboard: leaderboard,
            survivorStats: survivorStats
        };
    }

    // 👤 CALCULATE USER SURVIVOR STATUS
    calculateUserSurvivorStatus(userPick, games, weekNumber) {
        if (!userPick || !userPick.team) {
            return {
                status: 'eliminated',
                teamPicked: null,
                gameId: null,
                teamWon: false,
                eliminatedInWeek: weekNumber,
                teamsUsed: []
            };
        }

        // Find the game this user picked
        const pickedGame = games.find(game =>
            game.away === userPick.team || game.home === userPick.team
        );

        if (!pickedGame) {
            return {
                status: 'eliminated',
                teamPicked: userPick.team,
                gameId: null,
                teamWon: false,
                eliminatedInWeek: weekNumber,
                teamsUsed: [userPick.team]
            };
        }

        const teamWon = pickedGame.winner === userPick.team;

        return {
            status: teamWon ? 'alive' : 'eliminated',
            teamPicked: userPick.team,
            gameId: pickedGame.id,
            teamWon: teamWon,
            eliminatedInWeek: teamWon ? null : weekNumber,
            teamsUsed: [userPick.team]
        };
    }

    // 🏆 CREATE SEASON AGGREGATE
    async createSeasonAggregate() {
        console.log('🏆 Creating season aggregate data...');

        // This will be implemented to combine all completed weeks
        // For now, create placeholder structure
        const seasonAggregate = {
            meta: {
                currentWeek: 3,
                completedWeeks: this.completedWeeks,
                lastUpdated: new Date().toISOString(),
                season: "2025"
            },
            confidence: {
                userTotals: {},
                seasonLeaderboard: [],
                seasonStats: {}
            },
            survivor: {
                userStatus: {},
                seasonLeaderboard: [],
                seasonStats: {}
            }
        };

        await this.writeSeasonAggregate(seasonAggregate);
    }

    // 💾 WRITE COMPLETED WEEK
    async writeCompletedWeek(weekNumber, data) {
        const docPath = `completed-weeks/week-${weekNumber}`;
        await window.setDoc(window.doc(window.db, docPath), data);
        console.log(`💾 Week ${weekNumber} data written to Firestore`);
    }

    // 💾 WRITE SEASON AGGREGATE
    async writeSeasonAggregate(data) {
        const docPath = `completed-weeks/season-aggregate`;
        await window.setDoc(window.doc(window.db, docPath), data);
        console.log(`💾 Season aggregate data written to Firestore`);
    }

    // ✅ VERIFY MIGRATION
    async verifyMigration() {
        console.log('✅ Verifying migration integrity...');

        for (const weekNumber of this.completedWeeks) {
            const docPath = `completed-weeks/week-${weekNumber}`;
            const doc = await window.getDoc(window.doc(window.db, docPath));

            if (!doc.exists()) {
                throw new Error(`Week ${weekNumber} migration verification failed - document not found`);
            }

            const data = doc.data();
            if (!data.meta || !data.confidence || !data.survivor) {
                throw new Error(`Week ${weekNumber} migration verification failed - incomplete data structure`);
            }

            console.log(`✅ Week ${weekNumber} verification passed`);
        }
    }
}

// 🚀 MIGRATION EXECUTION FUNCTION
window.migrateCompletedWeeks = async function() {
    console.log('🚀 Starting completed weeks migration...');

    const migrator = new CompletedWeeksMigrator();
    const results = await migrator.migrateAllCompletedWeeks();

    console.log('🎉 Migration results:', results);
    return results;
};

console.log('🏆 Completed Weeks Migrator loaded - ready for migration!');