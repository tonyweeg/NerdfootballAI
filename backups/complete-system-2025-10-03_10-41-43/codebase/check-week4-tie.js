const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWeek4Games() {
    const week4Ref = db.collection('artifacts').doc('nerdfootball')
        .collection('public').doc('data')
        .collection('nerdfootball_games').doc('4');

    const week4Snap = await week4Ref.get();
    const week4Data = week4Snap.data();

    console.log('All Week 4 games detailed analysis:\n');

    const gameIds = Object.keys(week4Data).filter(k => k !== '_metadata');
    console.log(`Total games: ${gameIds.length}\n`);

    let completedCount = 0;

    gameIds.forEach(gameId => {
        const game = week4Data[gameId];
        const hasWinner = game.winner && game.winner !== 'TBD';
        const isCompleted = hasWinner;

        if (isCompleted) completedCount++;

        console.log(`${gameId}: status=${game.status}, winner=${game.winner || 'NULL'}, hasWinner=${hasWinner}, counted=${isCompleted}`);
    });

    console.log(`\n✅ Completed count using current logic: ${completedCount}/${gameIds.length}`);

    process.exit(0);
}

checkWeek4Games().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
