// Script to extract actual eliminations and generate simple survivor data
// Run this once to get the elimination data, then copy to simpleSurvivor.js

const admin = require('firebase-admin');
const serviceAccount = require('./nerdfootball-firebase-adminsdk-zrrgr-3b57e3c3d9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

// Simulate the bulletproof checker logic server-side
class ServerSurvivorChecker {
    constructor() {
        this.currentWeek = 2; // We're in Week 2
    }

    async getPoolMembers() {
        const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
        if (!poolDoc.exists) return {};
        return poolDoc.data();
    }

    async getUserPicks(uid) {
        const picksDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`).get();
        return picksDoc.exists ? picksDoc.data().picks || {} : {};
    }

    async getWeekGameResults(week) {
        const gamesDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${week}`).get();
        return gamesDoc.exists ? gamesDoc.data() : {};
    }

    normalizeTeamName(teamName) {
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

    async checkTeamResult(teamName, week) {
        const weekGames = await this.getWeekGameResults(week);

        for (const [gameKey, gameData] of Object.entries(weekGames)) {
            if (gameData.home_team === teamName || gameData.away_team === teamName) {
                if (gameData.winner) {
                    if (gameData.winner === teamName) {
                        return { status: 'won', reason: `${teamName} won` };
                    } else {
                        return { status: 'lost', reason: `${teamName} lost to ${gameData.winner}` };
                    }
                }
            }
        }
        return { status: 'pending', reason: `No result found for ${teamName}` };
    }

    async checkUserElimination(uid, member) {
        const allPicks = await this.getUserPicks(uid);
        const teamsUsed = new Set();

        // Check completed weeks (Week 1)
        for (let week = 1; week < this.currentWeek; week++) {
            const weekPick = allPicks[week];

            // No pick = DEAD
            if (!weekPick || !weekPick.team) {
                return {
                    eliminated: true,
                    week,
                    team: 'No Pick',
                    reason: `Failed to make pick for Week ${week}`
                };
            }

            // Team reuse = DEAD
            const normalizedTeam = this.normalizeTeamName(weekPick.team);
            if (teamsUsed.has(normalizedTeam)) {
                return {
                    eliminated: true,
                    week,
                    team: weekPick.team,
                    reason: `Picked ${weekPick.team} multiple times (not allowed)`
                };
            }
            teamsUsed.add(normalizedTeam);

            // Check team result
            const teamResult = await this.checkTeamResult(weekPick.team, week);
            if (teamResult.status === 'lost') {
                return {
                    eliminated: true,
                    week,
                    team: weekPick.team,
                    reason: teamResult.reason
                };
            }
        }

        // Check current week for team reuse
        const currentWeekPick = allPicks[this.currentWeek];
        if (currentWeekPick && currentWeekPick.team) {
            const normalizedCurrentTeam = this.normalizeTeamName(currentWeekPick.team);
            if (teamsUsed.has(normalizedCurrentTeam)) {
                return {
                    eliminated: true,
                    week: this.currentWeek,
                    team: currentWeekPick.team,
                    reason: `Picked ${currentWeekPick.team} multiple times (not allowed)`
                };
            }

            // Check if current week team lost (if game finished)
            const currentTeamResult = await this.checkTeamResult(currentWeekPick.team, this.currentWeek);
            if (currentTeamResult.status === 'lost') {
                return {
                    eliminated: true,
                    week: this.currentWeek,
                    team: currentWeekPick.team,
                    reason: currentTeamResult.reason
                };
            }
        }

        return { eliminated: false };
    }

    async getAllEliminations() {
        console.log('🔍 Getting all eliminations...');
        const poolMembers = await this.getPoolMembers();
        const eliminations = {};

        for (const [uid, member] of Object.entries(poolMembers)) {
            console.log(`Checking ${member.displayName || member.email} (${uid})`);
            const elimination = await this.checkUserElimination(uid, member);

            if (elimination.eliminated) {
                eliminations[uid] = {
                    week: elimination.week,
                    team: elimination.team,
                    reason: elimination.reason,
                    displayName: member.displayName || member.email
                };
                console.log(`💀 ELIMINATED: ${member.displayName} - ${elimination.reason}`);
            } else {
                console.log(`✅ ALIVE: ${member.displayName}`);
            }
        }

        return eliminations;
    }
}

async function main() {
    try {
        console.log('🏈 Getting actual elimination data...');
        const checker = new ServerSurvivorChecker();
        const eliminations = await checker.getAllEliminations();

        console.log('\n💎 ELIMINATION DATA FOR SIMPLE SURVIVOR:');
        console.log('Copy this into simpleSurvivor.js ELIMINATED_USERS:');
        console.log('\nthis.ELIMINATED_USERS = {');

        for (const [uid, data] of Object.entries(eliminations)) {
            console.log(`    '${uid}': { week: ${data.week}, team: '${data.team}', reason: '${data.reason}' }, // ${data.displayName}`);
        }

        console.log('};');

        console.log(`\n📊 SUMMARY:`);
        console.log(`Total eliminations: ${Object.keys(eliminations).length}`);
        console.log(`Week 1 eliminations: ${Object.values(eliminations).filter(e => e.week === 1).length}`);
        console.log(`Week 2 eliminations: ${Object.values(eliminations).filter(e => e.week === 2).length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

main();