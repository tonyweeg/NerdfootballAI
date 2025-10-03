const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWeek5AndSeasonTotal() {
    console.log('🔍 CHECKING WEEK 5 DATA AND SEASON TOTALS\n');

    // Check Week 5 specifically
    console.log('📊 WEEK 5 CHECK:');
    const week5BibleRef = db.collection('artifacts').doc('nerdfootball')
        .collection('public').doc('data')
        .collection('nerdfootball_games').doc('5');
    const week5BibleSnap = await week5BibleRef.get();

    if (!week5BibleSnap.exists) {
        console.log('   ❌ NO WEEK 5 BIBLE DATA EXISTS!');
    } else {
        const week5Bible = week5BibleSnap.data();
        const gameCount = Object.keys(week5Bible).filter(k => k !== '_metadata').length;
        console.log(`   ✅ Week 5 Bible: ${gameCount} games`);

        // Show first few games
        const games = Object.keys(week5Bible).filter(k => k !== '_metadata').slice(0, 3);
        games.forEach(gameId => {
            const game = week5Bible[gameId];
            console.log(`      ${gameId}: ${game.awayTeam} @ ${game.homeTeam} - Winner: ${game.winner || 'TBD'}`);
        });
    }

    // Check Week 5 picks
    const week5PicksRef = db.collection('artifacts').doc('nerdfootball')
        .collection('public').doc('data')
        .collection('nerdfootball_picks').doc('5')
        .collection('submissions');
    const week5PicksSnap = await week5PicksRef.get();
    console.log(`   🎯 Week 5 Picks: ${week5PicksSnap.size} submissions`);

    // Calculate season totals for top users
    console.log('\n🏆 SEASON TOTALS (Weeks 1-5):');

    const userSeasonTotals = {};

    for (let week = 1; week <= 5; week++) {
        const bibleRef = db.collection('artifacts').doc('nerdfootball')
            .collection('public').doc('data')
            .collection('nerdfootball_games').doc(week.toString());
        const bibleSnap = await bibleRef.get();

        if (!bibleSnap.exists) continue;

        const bibleData = bibleSnap.data();

        const picksRef = db.collection('artifacts').doc('nerdfootball')
            .collection('public').doc('data')
            .collection('nerdfootball_picks').doc(week.toString())
            .collection('submissions');
        const picksSnap = await picksRef.get();

        picksSnap.forEach(doc => {
            const userId = doc.id;
            const picks = doc.data();

            if (!userSeasonTotals[userId]) {
                userSeasonTotals[userId] = {
                    userName: picks.userName || userId,
                    total: 0,
                    weeks: {}
                };
            }

            const gameIds = Object.keys(picks).filter(key =>
                !['userName', 'submittedAt', 'weekNumber', 'timestamp', 'mondayNightPoints',
                  'mnfTotalPoints', 'tiebreaker', 'totalPoints', 'userId', 'lastUpdated',
                  'poolId', 'survivorPick', 'createdAt', 'week', 'games'].includes(key)
            );

            let weekPoints = 0;
            gameIds.forEach(gameId => {
                const pick = picks[gameId];
                if (pick && typeof pick === 'object' && bibleData[gameId]) {
                    const isCorrect = bibleData[gameId].winner === pick.winner;
                    if (isCorrect && typeof pick.confidence === 'number') {
                        weekPoints += pick.confidence;
                    }
                }
            });

            userSeasonTotals[userId].total += weekPoints;
            userSeasonTotals[userId].weeks[week] = weekPoints;
        });
    }

    // Sort by total and show top 10
    const sorted = Object.values(userSeasonTotals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    sorted.forEach((user, idx) => {
        const weekBreakdown = [1, 2, 3, 4, 5]
            .map(w => `W${w}:${user.weeks[w] || 0}`)
            .join(', ');
        console.log(`   ${idx + 1}. ${user.userName}: ${user.total} pts (${weekBreakdown})`);
    });

    console.log(`\n🎯 SEASON HIGH SCORE: ${sorted[0].total}`);
    console.log(`   Leader: ${sorted[0].userName}`);

    process.exit(0);
}

checkWeek5AndSeasonTotal().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
