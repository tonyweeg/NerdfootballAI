const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWeek4TieGame() {
    try {
        console.log('🔍 Checking Week 4 game data for GB vs DAL tie game...\n');

        const week4GamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        const gamesDoc = await db.doc(week4GamesPath).get();

        if (!gamesDoc.exists) {
            console.log('❌ No Week 4 games found');
            process.exit(1);
        }

        const games = gamesDoc.data();

        // Find GB vs DAL game
        let tieGame = null;
        let tieGameId = null;

        for (const [gameId, game] of Object.entries(games)) {
            if (gameId.startsWith('_')) continue;
            if (gameId === '000') continue;

            const isGBvsDAL = (
                (game.h === 'Dallas Cowboys' && game.a === 'Green Bay Packers') ||
                (game.a === 'Dallas Cowboys' && game.h === 'Green Bay Packers')
            );

            if (isGBvsDAL) {
                tieGame = game;
                tieGameId = gameId;
                break;
            }
        }

        if (!tieGame) {
            console.log('❌ GB vs DAL game not found in Week 4');
            process.exit(1);
        }

        console.log('✅ Found GB vs DAL game:');
        console.log(`   Game ID: ${tieGameId}`);
        console.log(`   Away Team: ${tieGame.a}`);
        console.log(`   Home Team: ${tieGame.h}`);
        console.log(`   Away Score: ${tieGame.awayScore}`);
        console.log(`   Home Score: ${tieGame.homeScore}`);
        console.log(`   Winner: "${tieGame.winner}"`);
        console.log(`   Status: ${tieGame.status}`);
        console.log(`   Date: ${tieGame.dt}`);
        console.log('\n🔍 Tie Detection Analysis:');

        // Check if winner field indicates tie
        const winnerIndicatesTie = tieGame.winner && (
            tieGame.winner.toUpperCase() === 'TIE' ||
            tieGame.winner.toUpperCase() === 'TIE/OT' ||
            tieGame.winner.toUpperCase() === 'DRAW' ||
            tieGame.winner.toUpperCase().includes('TIE')
        );
        console.log(`   Winner field indicates tie: ${winnerIndicatesTie}`);

        // Check if scores indicate tie
        const scoresIndicateTie = (
            tieGame.awayScore !== undefined &&
            tieGame.homeScore !== undefined &&
            parseInt(tieGame.awayScore) === parseInt(tieGame.homeScore) &&
            parseInt(tieGame.awayScore) > 0
        );
        console.log(`   Scores indicate tie: ${scoresIndicateTie} (${tieGame.awayScore} === ${tieGame.homeScore})`);

        const isTieGame = winnerIndicatesTie || scoresIndicateTie;
        console.log(`   🎯 IS TIE GAME: ${isTieGame}`);

        if (!isTieGame) {
            console.log('\n⚠️  PROBLEM DETECTED: Game is not being detected as a tie!');
            console.log('   The winner field should be "TIE" or scores should be equal.');
            console.log(`   Current winner field: "${tieGame.winner}"`);

            if (tieGame.winner && tieGame.winner !== 'TIE') {
                console.log('\n🔧 SOLUTION: The winner field needs to be updated to "TIE"');
                console.log('   OR ensure awayScore and homeScore are both 40');
            }
        }

        // Check Andy's pick for this game
        console.log('\n🔍 Checking Andy Anderson\'s pick for this game:');
        const andyId = 'bEVzcZtSExT8cIjamWnGbWZ3J5s1';
        const andyPicksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/${andyId}`;
        const andyPicksDoc = await db.doc(andyPicksPath).get();

        if (andyPicksDoc.exists) {
            const andyPicks = andyPicksDoc.data();
            const andyPick = andyPicks[tieGameId];

            if (andyPick) {
                console.log(`   Andy picked: ${andyPick.winner} with confidence ${andyPick.confidence}`);
                console.log(`   Should get credit: ${isTieGame ? 'YES (tie game)' : 'NO (not detected as tie)'}`);
            } else {
                console.log(`   ⚠️  Andy has no pick for game ${tieGameId}`);
            }
        } else {
            console.log('   ❌ Andy\'s picks not found for Week 4');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkWeek4TieGame();
