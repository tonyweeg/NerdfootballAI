const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!initializeApp.apps || initializeApp.apps.length === 0) {
    initializeApp();
}
const db = getFirestore();

exports.verifyWeeksData = onRequest(
    {
        cors: true,
        timeoutSeconds: 60,
        memory: '512MiB',
        invoker: 'public'
    },
    async (req, res) => {
        console.log('🔍 Verifying NFL game data for Weeks 1, 2, and 3...');

        const weeks = [1, 2, 3];
        const results = {};

        for (const week of weeks) {
            console.log(`\n=== WEEK ${week} ===`);
            try {
                const docRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${week}`);
                const doc = await docRef.get();

                if (!doc.exists) {
                    console.log(`❌ Week ${week}: Document does not exist`);
                    results[week] = {
                        status: 'error',
                        message: 'Document does not exist'
                    };
                    continue;
                }

                const weekData = doc.data();
                const games = Object.keys(weekData);
                console.log(`📊 Week ${week}: ${games.length} games found`);

                let finalGames = 0;
                let validStructure = 0;
                const gameDetails = [];

                for (const gameId of games) {
                    const game = weekData[gameId];

                    // Check structure
                    if (game.a && game.h && game.hasOwnProperty('status')) {
                        validStructure++;
                        if (game.status === 'final' && game.winner) {
                            finalGames++;
                            gameDetails.push({
                                id: gameId,
                                away: game.a,
                                home: game.h,
                                winner: game.winner,
                                awayScore: game.awayScore || 'N/A',
                                homeScore: game.homeScore || 'N/A'
                            });
                        }
                    } else {
                        console.log(`❌ Game ${gameId}: Invalid structure`);
                        gameDetails.push({
                            id: gameId,
                            error: 'Invalid structure',
                            data: game
                        });
                    }
                }

                const isPerfect = validStructure === games.length && finalGames === games.length;

                results[week] = {
                    status: isPerfect ? 'perfect' : 'needs_attention',
                    totalGames: games.length,
                    validStructure,
                    finalGames,
                    gameDetails: isPerfect ? `All ${finalGames} games complete with winners` : gameDetails.slice(0, 5) // Limit to first 5 for response size
                };

                console.log(`📈 Week ${week} Summary:`);
                console.log(`   Valid structure: ${validStructure}/${games.length}`);
                console.log(`   Final games: ${finalGames}/${games.length}`);

                if (isPerfect) {
                    console.log(`🎯 Week ${week}: PERFECT DATA ✨`);
                } else {
                    console.log(`⚠️  Week ${week}: NEEDS ATTENTION`);
                }

            } catch (error) {
                console.error(`💥 Error checking Week ${week}:`, error);
                results[week] = {
                    status: 'error',
                    message: error.message
                };
            }
        }

        res.status(200).json({
            success: true,
            message: 'NFL data verification complete',
            results,
            timestamp: new Date().toISOString()
        });
    }
);