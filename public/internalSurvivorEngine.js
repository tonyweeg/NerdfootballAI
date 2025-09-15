// Internal Survivor Engine - Pure Firestore Logic
// Diamond Level Performance: Sub-500ms execution target
// EMERGENCY PRODUCTION SYSTEM - NO EXTERNAL DEPENDENCIES

class InternalSurvivorEngine {
    constructor(firestore) {
        this.db = firestore;
        this.poolId = 'nerduniverse-2025';
        this.currentWeek = 2; // Week 2 of 2025 season
    }

    // Core survivor status calculation - DEAD or ALIVE with reasoning
    async calculateSurvivorStatus(userId) {
        try {
            const startTime = performance.now();

            // Get user's picks for weeks 1 and 2
            const week1Pick = await this.getUserPick(userId, 1);
            const week2Pick = await this.getUserPick(userId, 2);

            // Check for elimination scenarios
            const eliminationCheck = await this.checkElimination(userId, week1Pick, week2Pick);

            const executionTime = performance.now() - startTime;
            console.log(`Survivor status calculated in ${executionTime.toFixed(2)}ms`);

            return eliminationCheck;

        } catch (error) {
            console.error('Error calculating survivor status:', error);
            return {
                status: 'ERROR',
                reason: 'System error calculating status',
                isAlive: false
            };
        }
    }

    // Get user's pick for specific week
    async getUserPick(userId, weekNumber) {
        try {
            const pickPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
            const pickDoc = await getDoc(doc(this.db, pickPath));

            if (pickDoc.exists()) {
                const pickData = pickDoc.data();
                const weekPick = pickData.picks && pickData.picks[weekNumber];

                if (weekPick) {
                    return {
                        team: weekPick.team || null,
                        confidence: weekPick.confidence || 0,
                        timestamp: weekPick.timestamp,
                        exists: true
                    };
                }
            }

            return { team: null, exists: false };

        } catch (error) {
            console.error(`Error getting pick for week ${weekNumber}:`, error);
            return { team: null, exists: false };
        }
    }

    // Core elimination logic - checks all elimination scenarios
    async checkElimination(userId, week1Pick, week2Pick) {
        // NO PICK ELIMINATION - Must have picks for completed weeks
        if (!week1Pick.exists || !week1Pick.team) {
            return {
                status: 'DEAD',
                reason: 'No pick submitted for Week 1',
                isAlive: false,
                eliminatedWeek: 1,
                eliminationType: 'NO_PICK'
            };
        }

        if (this.currentWeek >= 2 && (!week2Pick.exists || !week2Pick.team)) {
            return {
                status: 'DEAD',
                reason: 'No pick submitted for Week 2',
                isAlive: false,
                eliminatedWeek: 2,
                eliminationType: 'NO_PICK'
            };
        }

        // DUPLICATE TEAM ELIMINATION - Cannot pick same team twice
        if (week1Pick.team && week2Pick.team && week1Pick.team === week2Pick.team) {
            return {
                status: 'DEAD',
                reason: `Picked ${week1Pick.team} in multiple weeks`,
                isAlive: false,
                eliminatedWeek: 2,
                eliminationType: 'DUPLICATE_TEAM'
            };
        }

        // GAME LOSS ELIMINATION - Check if picked teams lost
        const week1Result = await this.getGameResult(week1Pick.team, 1);
        if (week1Result && week1Result.result === 'LOSS') {
            return {
                status: 'DEAD',
                reason: `${week1Pick.team} lost in Week 1`,
                isAlive: false,
                eliminatedWeek: 1,
                eliminationType: 'GAME_LOSS'
            };
        }

        if (week2Pick.team) {
            const week2Result = await this.getGameResult(week2Pick.team, 2);
            if (week2Result && week2Result.result === 'LOSS') {
                return {
                    status: 'DEAD',
                    reason: `${week2Pick.team} lost in Week 2`,
                    isAlive: false,
                    eliminatedWeek: 2,
                    eliminationType: 'GAME_LOSS'
                };
            }
        }

        // ALIVE - Survived all elimination checks
        return {
            status: 'ALIVE',
            reason: 'All picks valid and winning',
            isAlive: true,
            eliminatedWeek: null,
            eliminationType: null
        };
    }

    // Get game result for team in specific week - INTERNAL DATA ONLY
    async getGameResult(teamName, weekNumber) {
        try {
            // Load internal game data from Firestore - NO ESPN CACHE
            const gamesDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`));

            if (!gamesDoc.exists()) {
                console.warn(`No internal game data found for Week ${weekNumber}`);
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
                        console.log(`⚠️ Game not finished yet: ${teamName} Week ${weekNumber}`);
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

    // Normalize team names for consistent matching
    normalizeTeamName(teamName) {
        if (!teamName) return '';

        const teamMap = {
            'Arizona Cardinals': 'Cardinals',
            'Atlanta Falcons': 'Falcons',
            'Baltimore Ravens': 'Ravens',
            'Buffalo Bills': 'Bills',
            'Carolina Panthers': 'Panthers',
            'Chicago Bears': 'Bears',
            'Cincinnati Bengals': 'Bengals',
            'Cleveland Browns': 'Browns',
            'Dallas Cowboys': 'Cowboys',
            'Denver Broncos': 'Broncos',
            'Detroit Lions': 'Lions',
            'Green Bay Packers': 'Packers',
            'Houston Texans': 'Texans',
            'Indianapolis Colts': 'Colts',
            'Jacksonville Jaguars': 'Jaguars',
            'Kansas City Chiefs': 'Chiefs',
            'Las Vegas Raiders': 'Raiders',
            'Los Angeles Chargers': 'Chargers',
            'Los Angeles Rams': 'Rams',
            'Miami Dolphins': 'Dolphins',
            'Minnesota Vikings': 'Vikings',
            'New England Patriots': 'Patriots',
            'New Orleans Saints': 'Saints',
            'New York Giants': 'Giants',
            'New York Jets': 'Jets',
            'Philadelphia Eagles': 'Eagles',
            'Pittsburgh Steelers': 'Steelers',
            'San Francisco 49ers': '49ers',
            'Seattle Seahawks': 'Seahawks',
            'Tampa Bay Buccaneers': 'Buccaneers',
            'Tennessee Titans': 'Titans',
            'Washington Commanders': 'Commanders'
        };

        // Return mapped team name or original if no mapping found
        return teamMap[teamName] || teamName;
    }

    // Get all survivor pool participants with status
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
                const status = await this.calculateSurvivorStatus(userId);

                results.push({
                    userId,
                    displayName: memberData.displayName || 'Unknown',
                    email: memberData.email || '',
                    ...status
                });
            }

            const executionTime = performance.now() - startTime;
            console.log(`All survivor statuses calculated in ${executionTime.toFixed(2)}ms`);

            return results;

        } catch (error) {
            console.error('Error getting all survivor statuses:', error);
            return [];
        }
    }

    // Get detailed survivor summary for display
    async getSurvivorSummary() {
        const allStatuses = await this.getAllSurvivorStatuses();

        const alive = allStatuses.filter(user => user.isAlive);
        const dead = allStatuses.filter(user => !user.isAlive);

        return {
            totalPlayers: allStatuses.length,
            alive: alive.length,
            dead: dead.length,
            players: allStatuses,
            aliveList: alive,
            deadList: dead
        };
    }
}

// Global initialization function
window.initInternalSurvivorEngine = function(firestore) {
    return new InternalSurvivorEngine(firestore);
};

console.log('Internal Survivor Engine loaded - Diamond Level Performance');