// LOCAL TEST: Show Week 1 and Week 2 losers step by step
const admin = require('firebase-admin');

// Initialize with environment variable or service account
try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com"
    });
} catch (error) {
    console.log('Using environment credentials...');
}

const db = admin.firestore();

async function showGameLosers() {
    console.log('🏈 ELIMINATION GAME - Who Lost Week 1 and Week 2?');
    console.log('================================================\n');

    try {
        // Get Week 1 game results
        console.log('📊 WEEK 1 GAME RESULTS:');
        const week1Doc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/1').get();

        if (week1Doc.exists()) {
            const week1Games = week1Doc.data();
            console.log(`Found ${Object.keys(week1Games).length} Week 1 games\n`);

            const week1Losers = [];
            Object.entries(week1Games).forEach(([gameId, game]) => {
                if (game.winner) {
                    const loser = game.winner === game.home_team ? game.away_team : game.home_team;
                    week1Losers.push(loser);
                    console.log(`⚡ ${game.winner} beat ${loser}`);
                } else {
                    console.log(`⏳ ${game.home_team} vs ${game.away_team} - No winner yet`);
                }
            });

            console.log(`\n💀 WEEK 1 LOSING TEAMS: ${week1Losers.length} teams lost`);
            week1Losers.forEach(team => console.log(`   - ${team}`));
        } else {
            console.log('❌ No Week 1 game data found');
        }

        // Get Week 2 game results
        console.log('\n📊 WEEK 2 GAME RESULTS:');
        const week2Doc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/2').get();

        if (week2Doc.exists()) {
            const week2Games = week2Doc.data();
            console.log(`Found ${Object.keys(week2Games).length} Week 2 games\n`);

            const week2Losers = [];
            Object.entries(week2Games).forEach(([gameId, game]) => {
                if (game.winner) {
                    const loser = game.winner === game.home_team ? game.away_team : game.home_team;
                    week2Losers.push(loser);
                    console.log(`⚡ ${game.winner} beat ${loser}`);
                } else {
                    console.log(`⏳ ${game.home_team} vs ${game.away_team} - No winner yet`);
                }
            });

            console.log(`\n💀 WEEK 2 LOSING TEAMS: ${week2Losers.length} teams lost`);
            week2Losers.forEach(team => console.log(`   - ${team}`));
        } else {
            console.log('❌ No Week 2 game data found');
        }

        // Now get some user picks to see who should be eliminated
        console.log('\n👥 SAMPLE USER PICKS:');

        // Get pool members
        const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
        if (poolDoc.exists()) {
            const poolMembers = poolDoc.data();
            console.log(`Found ${Object.keys(poolMembers).length} pool members\n`);

            // Check first 5 users
            const userIds = Object.keys(poolMembers).slice(0, 5);
            for (const uid of userIds) {
                const member = poolMembers[uid];
                console.log(`\n🔍 ${member.displayName || member.email} (${uid}):`);

                try {
                    const picksDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`).get();
                    if (picksDoc.exists()) {
                        const picks = picksDoc.data().picks || {};
                        const week1Pick = picks[1]?.team;
                        const week2Pick = picks[2]?.team;

                        console.log(`   Week 1 pick: ${week1Pick || 'NO PICK'}`);
                        console.log(`   Week 2 pick: ${week2Pick || 'NO PICK'}`);

                        // Check if eliminated
                        if (week1Pick && week1Losers.includes(week1Pick)) {
                            console.log(`   💀 ELIMINATED Week 1: ${week1Pick} lost!`);
                        } else if (week2Pick && week2Losers.includes(week2Pick)) {
                            console.log(`   💀 ELIMINATED Week 2: ${week2Pick} lost!`);
                        } else {
                            console.log(`   ✅ ALIVE`);
                        }
                    } else {
                        console.log(`   ❌ No picks found`);
                    }
                } catch (error) {
                    console.log(`   ❌ Error getting picks: ${error.message}`);
                }
            }

            // Check specific user mentioned
            const targetUser = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';
            if (poolMembers[targetUser]) {
                console.log(`\n🎯 TARGET USER CHECK: ${poolMembers[targetUser].displayName || poolMembers[targetUser].email}`);

                try {
                    const picksDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${targetUser}`).get();
                    if (picksDoc.exists()) {
                        const picks = picksDoc.data().picks || {};
                        const week1Pick = picks[1]?.team;
                        const week2Pick = picks[2]?.team;

                        console.log(`   Week 1 pick: ${week1Pick || 'NO PICK'}`);
                        console.log(`   Week 2 pick: ${week2Pick || 'NO PICK'}`);

                        if (week1Pick && week1Losers.includes(week1Pick)) {
                            console.log(`   💀 TARGET USER ELIMINATED Week 1: ${week1Pick} lost!`);
                        } else if (week2Pick && week2Losers.includes(week2Pick)) {
                            console.log(`   💀 TARGET USER ELIMINATED Week 2: ${week2Pick} lost!`);
                        } else {
                            console.log(`   ✅ TARGET USER ALIVE`);
                        }
                    }
                } catch (error) {
                    console.log(`   ❌ Error getting target user picks: ${error.message}`);
                }
            } else {
                console.log(`\n❌ Target user ${targetUser} not found in pool`);
            }

        } else {
            console.log('❌ No pool members found');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

showGameLosers();