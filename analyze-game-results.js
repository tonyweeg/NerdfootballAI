// Analyze Game Results - Find the actual issue with elimination logic
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nerdfootball-dd237-default-rtdb.firebaseio.com/'
});

const db = admin.firestore();

async function analyzeGameResults() {
    console.log('🔍 ANALYZING GAME RESULTS FOR TARGET USER');
    console.log('='.repeat(60));

    const targetUserId = 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1';

    try {
        // 1. Get target user's picks
        console.log('1. TARGET USER PICKS:');
        const picksDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${targetUserId}`).get();
        const picksData = picksDoc.data();
        const picks = picksData.picks || {};

        for (const [week, pick] of Object.entries(picks)) {
            console.log(`   Week ${week}: ${pick.team} (Game ${pick.gameId})`);
        }

        // 2. Get ESPN cache data
        console.log('\n2. ESPN CACHE DATA:');
        const cacheDoc = await db.doc('cache/espn_current_data').get();
        const cacheData = cacheDoc.data();

        console.log(`   Cache contains ${Object.keys(cacheData).length} entries:`);
        for (const [key, value] of Object.entries(cacheData)) {
            if (key !== 'lastUpdated') {
                console.log(`   📊 ${key}: ${JSON.stringify(value, null, 2).slice(0, 200)}...`);
            }
        }

        // 3. Get Week 1 game results
        console.log('\n3. WEEK 1 GAME RESULTS:');
        const week1Doc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/1').get();
        const week1Data = week1Doc.data();

        console.log(`   Week 1 contains ${Object.keys(week1Data).length} games:`);
        for (const [gameId, gameData] of Object.entries(week1Data)) {
            console.log(`   🏈 Game ${gameId}: ${gameData.awayTeam || 'Away'} @ ${gameData.homeTeam || 'Home'}`);
            console.log(`      Score: ${gameData.awayScore || 0} - ${gameData.homeScore || 0}`);
            console.log(`      Status: ${gameData.status}`);
            console.log(`      Winner: ${gameData.winner || 'TBD'}`);
            console.log('');
        }

        // 4. Check target user's Week 1 pick specifically
        const week1Pick = picks['1'];
        if (week1Pick) {
            console.log('\n4. TARGET USER WEEK 1 ANALYSIS:');
            console.log(`   User picked: ${week1Pick.team} in Game ${week1Pick.gameId}`);

            // Find the game result for Game 111
            const gameResult = week1Data[week1Pick.gameId];
            if (gameResult) {
                console.log(`   Game Result Found:`);
                console.log(`      ${gameResult.awayTeam} ${gameResult.awayScore} - ${gameResult.homeScore} ${gameResult.homeTeam}`);
                console.log(`      Status: ${gameResult.status}`);
                console.log(`      Winner: ${gameResult.winner}`);

                // Check if user's team won
                const userTeam = normalizeTeam(week1Pick.team);
                const winner = normalizeTeam(gameResult.winner);

                console.log(`   Normalized comparison:`);
                console.log(`      User team: "${userTeam}"`);
                console.log(`      Winner: "${winner}"`);
                console.log(`      User won: ${userTeam === winner}`);

                if (userTeam === winner) {
                    console.log(`   🎉 USER SHOULD BE ALIVE - TEAM WON!`);
                } else {
                    console.log(`   💀 User should be eliminated - team lost`);
                }
            } else {
                console.log(`   ❌ No game result found for Game ${week1Pick.gameId}`);
            }
        }

        // 5. Load schedule to see Game 111 details
        console.log('\n5. SCHEDULE ANALYSIS FOR GAME 111:');
        const fs = require('fs');
        const scheduleData = JSON.parse(fs.readFileSync('/Users/tonyweeg/nerdfootball-project/public/nfl_2025_schedule_raw.json', 'utf8'));
        const week1Games = scheduleData.weeks.find(w => w.week === 1)?.games || [];
        const game111 = week1Games.find(g => g.id == 111);

        if (game111) {
            console.log(`   Internal Game 111: ${game111.a} @ ${game111.h}`);
            console.log(`   Date: ${game111.dt}`);

            // Find matching ESPN result by teams
            for (const [gameId, result] of Object.entries(week1Data)) {
                if (result.homeTeam && result.awayTeam) {
                    const homeMatch = normalizeTeam(result.homeTeam) === normalizeTeam(game111.h);
                    const awayMatch = normalizeTeam(result.awayTeam) === normalizeTeam(game111.a);

                    if (homeMatch && awayMatch) {
                        console.log(`   ✅ MATCHING ESPN RESULT FOUND in Game ${gameId}:`);
                        console.log(`      ${result.awayTeam} ${result.awayScore} - ${result.homeScore} ${result.homeTeam}`);
                        console.log(`      Status: ${result.status}`);
                        console.log(`      Winner: ${result.winner}`);

                        // Final check for Denver Broncos
                        const denverWon = normalizeTeam(result.winner) === normalizeTeam('Denver Broncos');
                        console.log(`      Denver Broncos won: ${denverWon}`);
                        break;
                    }
                }
            }
        }

    } catch (error) {
        console.error('❌ Analysis failed:', error);
    }
}

function normalizeTeam(teamName) {
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

// Run if called directly
if (require.main === module) {
    analyzeGameResults().then(() => {
        process.exit(0);
    });
}

module.exports = { analyzeGameResults };