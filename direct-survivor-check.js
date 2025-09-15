// Direct Survivor Check - Bypasses ESPN API, uses Firestore data directly
// This will find all incorrectly eliminated users using cached game data

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nerdfootball-dd237-default-rtdb.firebaseio.com/'
});

const db = admin.firestore();

class DirectSurvivorCheck {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.targetUserId = 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1';
        this.currentWeek = 1; // Season just started
    }

    async runAnalysis() {
        console.log('🚨 DIRECT SURVIVOR CHECK - FINDING ALL INCORRECTLY ELIMINATED USERS');
        console.log('='.repeat(80));

        try {
            // Get pool members
            const poolMembers = await this.getPoolMembers();
            console.log(`📊 Pool members: ${Object.keys(poolMembers).length}`);

            // Get elimination statuses
            const eliminationStatuses = await this.getEliminationStatuses();
            console.log(`📊 Elimination records: ${Object.keys(eliminationStatuses).length}`);

            // Load schedule for Week 1
            const weekGames = await this.loadWeekGames(this.currentWeek);
            console.log(`📊 Week ${this.currentWeek} games: ${weekGames.length}`);

            // Load cached ESPN results
            const espnResults = await this.loadCachedESPNResults();
            console.log(`📊 Cached ESPN results: ${Object.keys(espnResults).length}`);

            console.log('\n🔍 ANALYZING EACH POOL MEMBER:');
            console.log('-'.repeat(80));

            const incorrectEliminations = [];
            const shouldBeEliminated = [];
            const correctStatuses = [];

            for (const [uid, member] of Object.entries(poolMembers)) {
                const userPicks = await this.getUserPicks(uid);
                const currentStatus = eliminationStatuses[uid];
                const week1Pick = userPicks[this.currentWeek];

                console.log(`\n👤 ${member.displayName || member.email} (${uid})`);
                console.log(`   Current Status: ${currentStatus?.eliminated ? 'ELIMINATED' : 'ALIVE'}`);

                if (week1Pick) {
                    console.log(`   Week 1 Pick: ${week1Pick.team} (Game ${week1Pick.gameId})`);

                    // Find the actual game result
                    const gameResult = await this.findGameResult(week1Pick, weekGames, espnResults);

                    if (gameResult) {
                        console.log(`   Game Result: ${gameResult.away} ${gameResult.awayScore} - ${gameResult.homeScore} ${gameResult.home} (${gameResult.status})`);
                        console.log(`   Winner: ${gameResult.winner}`);

                        const userTeamNormalized = this.normalizeTeam(week1Pick.team);
                        const winnerNormalized = this.normalizeTeam(gameResult.winner);
                        const userWon = winnerNormalized === userTeamNormalized;

                        console.log(`   User Won: ${userWon ? 'YES' : 'NO'}`);

                        // Check for incorrect elimination
                        if (currentStatus?.eliminated && userWon) {
                            console.log(`   🚨 INCORRECT ELIMINATION: User eliminated but their team WON!`);
                            incorrectEliminations.push({
                                uid,
                                displayName: member.displayName || member.email,
                                pick: week1Pick,
                                gameResult,
                                shouldBeAlive: true,
                                currentStatus: 'ELIMINATED',
                                correctStatus: 'ALIVE'
                            });
                        }
                        // Check for missing elimination
                        else if (!currentStatus?.eliminated && !userWon && gameResult.status === 'Final') {
                            console.log(`   🚨 MISSING ELIMINATION: User should be eliminated but marked as ALIVE!`);
                            shouldBeEliminated.push({
                                uid,
                                displayName: member.displayName || member.email,
                                pick: week1Pick,
                                gameResult,
                                shouldBeEliminated: true,
                                currentStatus: 'ALIVE',
                                correctStatus: 'ELIMINATED'
                            });
                        }
                        // Correct status
                        else {
                            console.log(`   ✅ STATUS CORRECT`);
                            correctStatuses.push({
                                uid,
                                displayName: member.displayName || member.email,
                                pick: week1Pick,
                                gameResult,
                                status: currentStatus?.eliminated ? 'ELIMINATED' : 'ALIVE'
                            });
                        }
                    } else {
                        console.log(`   ⚠️  Game result not found`);
                    }
                } else {
                    console.log(`   ⚠️  No Week 1 pick found`);
                }
            }

            // Generate comprehensive report
            const report = {
                summary: {
                    totalUsers: Object.keys(poolMembers).length,
                    incorrectEliminations: incorrectEliminations.length,
                    shouldBeEliminated: shouldBeEliminated.length,
                    correctStatuses: correctStatuses.length
                },
                incorrectEliminations,
                shouldBeEliminated,
                correctStatuses
            };

            console.log('\n📋 COMPREHENSIVE REPORT');
            console.log('='.repeat(80));
            console.log(`📊 Total Users Checked: ${report.summary.totalUsers}`);
            console.log(`🚨 Incorrectly Eliminated: ${report.summary.incorrectEliminations}`);
            console.log(`🚨 Should Be Eliminated: ${report.summary.shouldBeEliminated}`);
            console.log(`✅ Correct Statuses: ${report.summary.correctStatuses}`);

            if (incorrectEliminations.length > 0) {
                console.log('\n🚨 USERS INCORRECTLY ELIMINATED (SHOULD BE ALIVE):');
                incorrectEliminations.forEach((user, index) => {
                    console.log(`${index + 1}. ${user.displayName} (${user.uid})`);
                    console.log(`   Picked: ${user.pick.team}`);
                    console.log(`   Result: ${user.gameResult.winner} won`);
                    console.log(`   Action: RESTORE TO ALIVE STATUS`);
                    console.log('');
                });
            }

            if (shouldBeEliminated.length > 0) {
                console.log('\n🚨 USERS WHO SHOULD BE ELIMINATED (CURRENTLY ALIVE):');
                shouldBeEliminated.forEach((user, index) => {
                    console.log(`${index + 1}. ${user.displayName} (${user.uid})`);
                    console.log(`   Picked: ${user.pick.team}`);
                    console.log(`   Result: ${user.gameResult.winner} won (user's team lost)`);
                    console.log(`   Action: ELIMINATE USER`);
                    console.log('');
                });
            }

            return report;

        } catch (error) {
            console.error('❌ Analysis failed:', error);
            throw error;
        }
    }

    async getPoolMembers() {
        const doc = await db.doc(`artifacts/nerdfootball/pools/${this.poolId}/metadata/members`).get();
        return doc.exists ? doc.data() : {};
    }

    async getEliminationStatuses() {
        const doc = await db.doc('artifacts/nerdfootball/public/data/nerdSurvivor_status/status').get();
        return doc.exists ? doc.data() : {};
    }

    async getUserPicks(uid) {
        const doc = await db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`).get();
        const data = doc.exists ? doc.data() : {};
        return data.picks || {};
    }

    async loadWeekGames(week) {
        try {
            const fs = require('fs');
            const scheduleData = JSON.parse(fs.readFileSync('/Users/tonyweeg/nerdfootball-project/public/nfl_2025_schedule_raw.json', 'utf8'));
            const weekData = scheduleData.weeks.find(w => w.week === week);
            return weekData ? weekData.games : [];
        } catch (error) {
            console.error('Error loading schedule:', error);
            return [];
        }
    }

    async loadCachedESPNResults() {
        try {
            // Try to get cached ESPN data from Firestore
            const doc = await db.doc('cache/espn_current_data').get();
            if (doc.exists) {
                return doc.data();
            }

            // Fallback: check if there's game data in legacy location
            const legacyDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdfootball_games/1`).get();
            if (legacyDoc.exists) {
                return legacyDoc.data();
            }

            return {};
        } catch (error) {
            console.error('Error loading ESPN results:', error);
            return {};
        }
    }

    async findGameResult(userPick, weekGames, espnResults) {
        // Find the internal game
        const internalGame = weekGames.find(g => g.id == userPick.gameId);
        if (!internalGame) {
            return null;
        }

        // Look for ESPN result by game ID first
        let espnResult = espnResults[userPick.gameId];
        if (espnResult) {
            return espnResult;
        }

        // Look for ESPN result by team matching
        for (const [key, result] of Object.entries(espnResults)) {
            if (result.homeTeam && result.awayTeam) {
                const homeMatch = this.normalizeTeam(result.homeTeam) === this.normalizeTeam(internalGame.h);
                const awayMatch = this.normalizeTeam(result.awayTeam) === this.normalizeTeam(internalGame.a);

                if (homeMatch && awayMatch) {
                    return result;
                }
            }
        }

        return null;
    }

    normalizeTeam(teamName) {
        if (!teamName) return null;

        const teamMappings = {
            'LA Rams': 'Los Angeles Rams',
            'LA Chargers': 'Los Angeles Chargers',
            'LV Raiders': 'Las Vegas Raiders',
            'Vegas Raiders': 'Las Vegas Raiders',
            'NY Giants': 'New York Giants',
            'NY Jets': 'New York Jets',
            'TB Buccaneers': 'Tampa Bay Buccaneers',
            'NE Patriots': 'New England Patriots',
            'GB Packers': 'Green Bay Packers',
            'NO Saints': 'New Orleans Saints',
            'KC Chiefs': 'Kansas City Chiefs',
            'SF 49ers': 'San Francisco 49ers'
        };

        return teamMappings[teamName] || teamName;
    }
}

// Run the analysis
async function main() {
    const checker = new DirectSurvivorCheck();
    try {
        const report = await checker.runAnalysis();

        // Write report to file
        const fs = require('fs');
        fs.writeFileSync('survivor-verification-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Report saved to: survivor-verification-report.json');

        process.exit(0);
    } catch (error) {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = DirectSurvivorCheck;