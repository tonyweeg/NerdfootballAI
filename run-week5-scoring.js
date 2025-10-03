const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runWeek5Scoring() {
    console.log('🏆 RUNNING WEEK 5 SCORING FOR ALL USERS\n');

    const weekNumber = 5;

    // Load Week 5 bible data
    console.log('📖 Loading Week 5 bible data...');
    const bibleRef = db.collection('artifacts').doc('nerdfootball')
        .collection('public').doc('data')
        .collection('nerdfootball_games').doc(weekNumber.toString());
    const bibleSnap = await bibleRef.get();

    if (!bibleSnap.exists) {
        console.error('❌ No bible data for Week 5');
        process.exit(1);
    }

    const bibleData = bibleSnap.data();

    // Find completed games
    const completedGames = [];
    for (const [gameId, game] of Object.entries(bibleData)) {
        if (gameId !== '_metadata' && game.status && (game.status === 'STATUS_FINAL' || game.status === 'final') && game.winner) {
            completedGames.push({ gameId, ...game });
        }
    }

    console.log(`✅ Found ${completedGames.length} completed games:`);
    completedGames.forEach(game => {
        console.log(`   ${game.gameId}: ${game.awayTeam} @ ${game.homeTeam} - Winner: ${game.winner}`);
    });

    if (completedGames.length === 0) {
        console.log('\n⚠️  No completed games yet for Week 5');
        process.exit(0);
    }

    // Load all user picks for Week 5
    console.log('\n🎯 Loading Week 5 picks...');
    const picksRef = db.collection('artifacts').doc('nerdfootball')
        .collection('public').doc('data')
        .collection('nerdfootball_picks').doc(weekNumber.toString())
        .collection('submissions');
    const picksSnap = await picksRef.get();

    console.log(`Found ${picksSnap.size} user submissions\n`);

    let usersProcessed = 0;
    const batch = db.batch();

    picksSnap.forEach(userDoc => {
        const userId = userDoc.id;
        const picks = userDoc.data();

        let totalPoints = 0;
        let correctPicks = 0;
        let totalValidPicks = 0;

        // Process each completed game
        completedGames.forEach(game => {
            const pick = picks[game.gameId];
            if (pick && typeof pick === 'object' && pick.winner) {
                totalValidPicks++;
                const isCorrect = pick.winner === game.winner;
                if (isCorrect && typeof pick.confidence === 'number') {
                    totalPoints += pick.confidence;
                    correctPicks++;
                }
            }
        });

        // Update the picks document with Week 5 points
        const picksDocRef = db.collection('artifacts').doc('nerdfootball')
            .collection('public').doc('data')
            .collection('nerdfootball_picks').doc(weekNumber.toString())
            .collection('submissions').doc(userId);

        batch.update(picksDocRef, {
            totalPoints: totalPoints,
            correctPicks: correctPicks,
            totalValidPicks: totalValidPicks,
            lastScored: new Date().toISOString()
        });

        if (totalPoints > 0) {
            console.log(`✅ ${picks.userName || userId}: ${totalPoints} pts (${correctPicks}/${totalValidPicks})`);
        }

        usersProcessed++;
    });

    console.log(`\n💾 Updating ${usersProcessed} user scores...`);
    await batch.commit();

    console.log('✅ Week 5 scoring complete!');
    console.log(`📊 Processed ${usersProcessed} users across ${completedGames.length} completed games`);

    process.exit(0);
}

runWeek5Scoring().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
