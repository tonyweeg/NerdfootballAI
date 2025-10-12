const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function calculateAndyScore() {
    try {
        console.log('🔍 Calculating Andy Anderson Week 4 score with tie logic...\n');

        const andyId = 'q8UNFeg4f1YrvrHATgpmcKfploo1';

        // Get Andy's picks
        const andyPicksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/${andyId}`;
        const andyPicksDoc = await db.doc(andyPicksPath).get();

        if (!andyPicksDoc.exists) {
            console.log('❌ Andy picks not found');
            process.exit(1);
        }

        // Get Week 4 games
        const week4GamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        const gamesDoc = await db.doc(week4GamesPath).get();

        if (!gamesDoc.exists) {
            console.log('❌ No Week 4 games found');
            process.exit(1);
        }

        const picks = andyPicksDoc.data();
        const games = gamesDoc.data();

        let totalPoints = 0;
        let correctPicks = 0;
        let incorrectPicks = 0;
        let tieGames = 0;

        console.log('📊 Game-by-Game Breakdown:\n');

        for (const [gameId, pick] of Object.entries(picks)) {
            // Skip metadata fields
            if (gameId.startsWith('_') || !pick.winner || !pick.confidence) continue;

            const game = games[gameId];
            if (!game) continue;

            // Use same status check as Grid code
            const status = (game.status || '').toLowerCase();
            const isGameComplete = status === 'final' ||
                                   status === 'final/ot' ||
                                   status === 'status_final' ||
                                   (game.winner && game.winner !== 'TBD');

            // TIE GAME LOGIC
            const isTie = isGameComplete && (
                (game.winner && (
                    game.winner.toUpperCase() === 'TIE' ||
                    game.winner.toUpperCase() === 'TIE/OT' ||
                    game.winner.toUpperCase() === 'DRAW' ||
                    game.winner.toUpperCase().includes('TIE')
                )) ||
                (game.awayScore !== undefined && game.homeScore !== undefined &&
                 parseInt(game.awayScore) === parseInt(game.homeScore) &&
                 parseInt(game.awayScore) > 0)
            );

            let isCorrect;
            if (isTie) {
                isCorrect = true;
                tieGames++;
                console.log(`🎯 Game ${gameId}: ${game.a} @ ${game.h} (${game.awayScore}-${game.homeScore}) - TIE`);
                console.log(`   Andy picked: ${pick.winner} (confidence ${pick.confidence}) ✅ CREDIT FOR TIE`);
            } else {
                isCorrect = isGameComplete && game.winner === pick.winner;
                const result = isCorrect ? '✅ CORRECT' : '❌ WRONG';
                console.log(`   Game ${gameId}: ${game.a} @ ${game.h} (${game.awayScore}-${game.homeScore})`);
                console.log(`   Winner: ${game.winner} | Andy picked: ${pick.winner} (confidence ${pick.confidence}) ${result}`);
            }

            if (isCorrect) {
                totalPoints += pick.confidence;
                correctPicks++;
            } else {
                incorrectPicks++;
            }
            console.log('');
        }

        console.log('📈 FINAL SCORE SUMMARY:');
        console.log(`   Total Points: ${totalPoints}`);
        console.log(`   Correct Picks: ${correctPicks}`);
        console.log(`   Incorrect Picks: ${incorrectPicks}`);
        console.log(`   Tie Games: ${tieGames}`);
        console.log(`   Points Lost: ${136 - totalPoints} (out of 136 possible)`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

calculateAndyScore();
