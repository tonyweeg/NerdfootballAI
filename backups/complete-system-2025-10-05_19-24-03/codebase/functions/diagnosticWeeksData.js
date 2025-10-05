const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!initializeApp.apps || initializeApp.apps.length === 0) {
    initializeApp();
}
const db = getFirestore();

exports.diagnosticWeeksData = onRequest(
    {
        cors: true,
        timeoutSeconds: 60,
        memory: '512MiB',
        invoker: 'public'
    },
    async (req, res) => {
        console.log('🔍 Running detailed diagnostic on Weeks 1 and 2 NFL data...');

        const weeks = [1, 2];
        const diagnostics = {};

        for (const week of weeks) {
            console.log(`\n=== WEEK ${week} DETAILED DIAGNOSTIC ===`);
            try {
                const docRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${week}`);
                const doc = await docRef.get();

                if (!doc.exists) {
                    diagnostics[week] = { error: 'Document does not exist' };
                    continue;
                }

                const weekData = doc.data();
                const games = Object.keys(weekData);
                console.log(`📊 Week ${week}: ${games.length} games found`);

                const invalidGames = [];
                const validGames = [];

                for (const gameId of games) {
                    const game = weekData[gameId];
                    const diagnostic = {
                        gameId,
                        hasA: !!game.a,
                        hasH: !!game.h,
                        hasStatus: game.hasOwnProperty('status'),
                        statusValue: game.status,
                        hasWinner: !!game.winner,
                        rawData: game
                    };

                    // Check if valid structure
                    if (game.a && game.h && game.hasOwnProperty('status')) {
                        validGames.push(diagnostic);
                        console.log(`✅ Game ${gameId}: VALID - ${game.a} @ ${game.h}, Status: ${game.status}`);
                    } else {
                        invalidGames.push(diagnostic);
                        console.log(`❌ Game ${gameId}: INVALID - Missing required fields`);
                        console.log(`   Has 'a' (away): ${diagnostic.hasA}`);
                        console.log(`   Has 'h' (home): ${diagnostic.hasH}`);
                        console.log(`   Has 'status': ${diagnostic.hasStatus}`);
                        console.log(`   Raw data:`, JSON.stringify(game, null, 2));
                    }
                }

                diagnostics[week] = {
                    totalGames: games.length,
                    validCount: validGames.length,
                    invalidCount: invalidGames.length,
                    invalidGames: invalidGames.map(g => ({
                        gameId: g.gameId,
                        hasA: g.hasA,
                        hasH: g.hasH,
                        hasStatus: g.hasStatus,
                        statusValue: g.statusValue,
                        hasWinner: g.hasWinner,
                        rawData: g.rawData
                    })),
                    firstFewValid: validGames.slice(0, 3).map(g => ({
                        gameId: g.gameId,
                        summary: `${g.rawData.a} @ ${g.rawData.h} (${g.rawData.status})`
                    }))
                };

            } catch (error) {
                console.error(`💥 Error diagnosing Week ${week}:`, error);
                diagnostics[week] = {
                    error: error.message
                };
            }
        }

        res.status(200).json({
            success: true,
            message: 'Detailed diagnostic complete',
            diagnostics,
            timestamp: new Date().toISOString()
        });
    }
);