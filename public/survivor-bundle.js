// Internal-Only Survivor System - Pure Firestore Logic
// NO ESPN DEPENDENCIES - Uses internal data only

class SurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = window.currentWeek || 1;
        this.poolId = 'nerduniverse-2025';
    }

    // Get all survivor pool participants with status - INTERNAL DATA ONLY
    async getAllSurvivorStatuses() {
        try {
            const startTime = performance.now();

            // Get pool members
            const membersDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`));

            if (!membersDoc.exists()) {
                throw new Error('Pool members not found');
            }

            const members = membersDoc.data();
            const results = [];

            // Calculate status for each member
            for (const [userId, memberData] of Object.entries(members)) {
                const status = await this.calculateUserStatus(userId, memberData);
                results.push(status);
            }

            const executionTime = performance.now() - startTime;
            console.log(`All survivor statuses calculated in ${executionTime.toFixed(2)}ms`);

            return results;

        } catch (error) {
            console.error('Error getting survivor statuses:', error);
            return [];
        }
    }

    // Calculate individual user status - INTERNAL DATA ONLY
    async calculateUserStatus(userId, memberData) {
        try {
            console.log(`🔍 Calculating status for ${memberData.displayName || memberData.email} (${userId})`);

            // Get user's picks for all completed weeks
            const week1Pick = await this.getUserPick(userId, 1);
            const week2Pick = this.currentWeek >= 2 ? await this.getUserPick(userId, 2) : null;

            // Check for elimination scenarios
            const eliminationResult = await this.checkElimination(userId, memberData, week1Pick, week2Pick);

            return eliminationResult;

        } catch (error) {
            console.error(`Error calculating status for ${userId}:`, error);
            return {
                userId,
                displayName: memberData.displayName || memberData.email,
                status: 'ERROR',
                reason: 'System error calculating status',
                teamPicked: 'Unknown'
            };
        }
    }

    // Get user's pick for specific week - INTERNAL DATA ONLY
    async getUserPick(userId, weekNumber) {
        try {
            const pickPath = `artifacts/nerdfootball/pools/${this.poolId}/picks/survivor/${userId}/week${weekNumber}`;
            const pickDoc = await getDoc(doc(this.db, pickPath));

            if (pickDoc.exists()) {
                const pickData = pickDoc.data();
                return {
                    team: pickData.team || null,
                    confidence: pickData.confidence || 0,
                    timestamp: pickData.timestamp,
                    exists: true
                };
            }

            return { team: null, exists: false };

        } catch (error) {
            console.error(`Error getting pick for week ${weekNumber}:`, error);
            return { team: null, exists: false };
        }
    }

    // Core elimination logic - INTERNAL DATA ONLY
    async checkElimination(userId, memberData, week1Pick, week2Pick) {
        const displayName = memberData.displayName || memberData.email;

        // NO PICK ELIMINATION - Must have picks for completed weeks
        if (!week1Pick.exists || !week1Pick.team) {
            return {
                userId,
                displayName,
                status: 'DEAD',
                reason: 'No pick submitted for Week 1',
                teamPicked: 'No Pick',
                eliminatedWeek: 1,
                eliminationType: 'NO_PICK'
            };
        }

        if (this.currentWeek >= 2 && (!week2Pick || !week2Pick.exists || !week2Pick.team)) {
            return {
                userId,
                displayName,
                status: 'DEAD',
                reason: 'No pick submitted for Week 2',
                teamPicked: week1Pick.team,
                eliminatedWeek: 2,
                eliminationType: 'NO_PICK'
            };
        }

        // DUPLICATE TEAM ELIMINATION - Cannot pick same team twice
        if (week2Pick && week1Pick.team && week2Pick.team && week1Pick.team === week2Pick.team) {
            return {
                userId,
                displayName,
                status: 'DEAD',
                reason: `Picked ${week1Pick.team} in multiple weeks`,
                teamPicked: week2Pick.team,
                eliminatedWeek: 2,
                eliminationType: 'DUPLICATE_TEAM'
            };
        }

        // GAME LOSS ELIMINATION - Check if picked teams lost using INTERNAL DATA ONLY
        const week1Result = await this.getInternalGameResult(week1Pick.team, 1);
        if (week1Result && week1Result.result === 'LOSS') {
            return {
                userId,
                displayName,
                status: 'DEAD',
                reason: `${week1Pick.team} lost in Week 1`,
                teamPicked: week1Pick.team,
                eliminatedWeek: 1,
                eliminationType: 'GAME_LOSS'
            };
        }

        if (week2Pick && week2Pick.team) {
            const week2Result = await this.getInternalGameResult(week2Pick.team, 2);
            if (week2Result && week2Result.result === 'LOSS') {
                return {
                    userId,
                    displayName,
                    status: 'DEAD',
                    reason: `${week2Pick.team} lost in Week 2`,
                    teamPicked: week2Pick.team,
                    eliminatedWeek: 2,
                    eliminationType: 'GAME_LOSS'
                };
            }
        }

        // ALIVE - Survived all elimination checks
        const currentTeam = this.currentWeek === 1 ? week1Pick.team : (week2Pick ? week2Pick.team : week1Pick.team);
        return {
            userId,
            displayName,
            status: 'ALIVE',
            reason: 'All picks valid and winning',
            teamPicked: currentTeam,
            eliminatedWeek: null,
            eliminationType: null
        };
    }

    // Get game result for team in specific week - INTERNAL DATA ONLY
    async getInternalGameResult(teamName, weekNumber) {
        try {
            // Load internal game data from Firestore
            const gamesDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`));

            if (!gamesDoc.exists()) {
                console.warn(`No game data found for Week ${weekNumber}`);
                return null;
            }

            const weekGames = gamesDoc.data();

            // Find the game where this team played
            for (const [gameKey, gameData] of Object.entries(weekGames)) {
                if (gameData.home_team === teamName || gameData.away_team === teamName) {
                    // Found the team's game
                    if (gameData.winner) {
                        const teamResult = gameData.winner === teamName ? 'WIN' : 'LOSS';

                        console.log(`📊 Internal Game Result: ${teamName} ${teamResult} (Week ${weekNumber})`);

                        return {
                            result: teamResult,
                            homeTeam: gameData.home_team,
                            awayTeam: gameData.away_team,
                            homeScore: gameData.home_score || 0,
                            awayScore: gameData.away_score || 0,
                            winner: gameData.winner,
                            status: 'FINAL'
                        };
                    } else {
                        // Game not finished yet
                        return null;
                    }
                }
            }

            console.warn(`No game found for team ${teamName} in Week ${weekNumber}`);
            return null;

        } catch (error) {
            console.error(`Error getting internal game result for ${teamName} week ${weekNumber}:`, error);
            return null;
        }
    }

    // Simple display method for survivor table
    async displaySurvivorTable() {
        try {
            const statuses = await this.getAllSurvivorStatuses();

            console.log('\n🏈 SURVIVOR POOL STATUS (Internal Data Only):');
            console.log('=====================================');

            statuses.forEach(status => {
                const statusIcon = status.status === 'ALIVE' ? '✅' : '💀';
                console.log(`${statusIcon} ${status.displayName}: ${status.teamPicked} - ${status.status}`);
                if (status.reason) {
                    console.log(`   Reason: ${status.reason}`);
                }
            });

            const aliveCount = statuses.filter(s => s.status === 'ALIVE').length;
            const deadCount = statuses.filter(s => s.status === 'DEAD').length;

            console.log(`\n📊 SUMMARY: ${aliveCount} ALIVE, ${deadCount} ELIMINATED`);

            return statuses;

        } catch (error) {
            console.error('Error displaying survivor table:', error);
            return [];
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SurvivorSystem;
}