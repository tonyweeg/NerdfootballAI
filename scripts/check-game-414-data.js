const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkGame414Data() {
    try {
        console.log('🔍 Checking Game 414 (GB vs DAL) data structure...\n');

        const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        const gamesDoc = await db.doc(gamesPath).get();

        if (!gamesDoc.exists) {
            console.log('❌ No games found');
            process.exit(1);
        }

        const games = gamesDoc.data();
        const game = games['414'];

        if (!game) {
            console.log('❌ Game 414 not found');
            process.exit(1);
        }

        console.log('✅ Game 414 Complete Data:');
        console.log(JSON.stringify(game, null, 2));

        console.log('\n🔍 Tie Detection Analysis:');
        console.log('   game.winner:', game.winner, `(type: ${typeof game.winner})`);
        console.log('   game.awayScore:', game.awayScore, `(type: ${typeof game.awayScore})`);
        console.log('   game.homeScore:', game.homeScore, `(type: ${typeof game.homeScore})`);
        console.log('   game.status:', game.status);

        // Check if winner field indicates tie
        const winnerIndicatesTie = game.winner && (
            game.winner.toUpperCase() === 'TIE' ||
            game.winner.toUpperCase() === 'TIE/OT' ||
            game.winner.toUpperCase() === 'DRAW' ||
            game.winner.toUpperCase().includes('TIE')
        );
        console.log('   winnerIndicatesTie:', winnerIndicatesTie);

        // Check if scores indicate tie
        const scoresIndicateTie = (
            game.awayScore !== undefined &&
            game.homeScore !== undefined &&
            parseInt(game.awayScore) === parseInt(game.homeScore) &&
            parseInt(game.awayScore) > 0
        );
        console.log('   scoresIndicateTie:', scoresIndicateTie);

        const isTie = winnerIndicatesTie || scoresIndicateTie;
        console.log('   🎯 isTie:', isTie);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkGame414Data();
