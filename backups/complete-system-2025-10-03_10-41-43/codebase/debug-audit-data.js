const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugAuditData() {
    console.log('🔍 DEBUGGING AUDIT DATA SOURCES\n');

    // 1. Check pool members
    const poolMembersRef = db.collection('artifacts').doc('nerdfootball')
        .collection('pools').doc('nerduniverse-2025')
        .collection('metadata').doc('members');
    const poolMembersSnap = await poolMembersRef.get();
    const poolMembers = poolMembersSnap.exists ? poolMembersSnap.data() : {};
    const totalUsers = Object.keys(poolMembers).length;

    console.log(`✅ Pool Members: ${totalUsers} users`);
    console.log(`   First 5: ${Object.keys(poolMembers).slice(0, 5).join(', ')}`);

    // 2. Check weeks 1-4 for picks and calculate high scores
    let weeklyHighScores = [];

    for (let week = 1; week <= 4; week++) {
        console.log(`\n📊 WEEK ${week}:`);

        // Load bible data
        const bibleRef = db.collection('artifacts').doc('nerdfootball')
            .collection('public').doc('data')
            .collection('nerdfootball_games').doc(week.toString());
        const bibleSnap = await bibleRef.get();

        if (!bibleSnap.exists) {
            console.log(`   ❌ No bible data found`);
            continue;
        }

        const bibleData = bibleSnap.data();
        const gameCount = Object.keys(bibleData).filter(k => k !== '_metadata').length;
        console.log(`   📖 Bible: ${gameCount} games`);

        // Load picks
        const picksRef = db.collection('artifacts').doc('nerdfootball')
            .collection('public').doc('data')
            .collection('nerdfootball_picks').doc(week.toString())
            .collection('submissions');
        const picksSnap = await picksRef.get();

        console.log(`   🎯 Picks: ${picksSnap.size} submissions`);

        let weekHighScore = 0;
        let weekHighScoreUser = '';

        picksSnap.forEach(doc => {
            const picks = doc.data();
            const gameIds = Object.keys(picks).filter(key =>
                !['userName', 'submittedAt', 'weekNumber', 'timestamp', 'mondayNightPoints',
                  'mnfTotalPoints', 'tiebreaker', 'totalPoints', 'userId', 'lastUpdated',
                  'poolId', 'survivorPick', 'createdAt', 'week', 'games'].includes(key)
            );

            let pointsEarned = 0;
            gameIds.forEach(gameId => {
                const pick = picks[gameId];
                if (pick && typeof pick === 'object' && bibleData[gameId]) {
                    const isCorrect = bibleData[gameId].winner === pick.winner;
                    if (isCorrect && typeof pick.confidence === 'number') {
                        pointsEarned += pick.confidence;
                    }
                }
            });

            if (pointsEarned > weekHighScore) {
                weekHighScore = pointsEarned;
                weekHighScoreUser = picks.userName || doc.id;
            }
        });

        console.log(`   🏆 High Score: ${weekHighScore} (${weekHighScoreUser})`);
        weeklyHighScores.push({ week, score: weekHighScore, user: weekHighScoreUser });
    }

    console.log(`\n🎯 OVERALL HIGH SCORE: ${Math.max(...weeklyHighScores.map(w => w.score))}`);
    console.log(`   Week breakdown: ${weeklyHighScores.map(w => `W${w.week}: ${w.score}`).join(', ')}`);

    process.exit(0);
}

debugAuditData().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
