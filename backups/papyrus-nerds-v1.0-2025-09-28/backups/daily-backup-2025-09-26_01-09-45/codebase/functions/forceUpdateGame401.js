const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Force update Game 401 with live data
exports.forceUpdateGame401 = functions.https.onCall(async (data, context) => {
    try {
        console.log('🏈 FORCE UPDATE Game 401 - Manual Override');

        const db = admin.firestore();
        const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        const gamesRef = db.doc(gamesPath);

        // Force update with current live ESPN data + game details
        const updateData = {
            '401.status': 'IN_PROGRESS',
            '401.awayScore': 17,
            '401.homeScore': 6,
            '401.winner': null,
            '401.lastUpdated': new Date().toISOString(),
            '401.period': 4,
            '401.clock': '11:04',
            '401.gameDetail': '11:04 - 4th Quarter',
            '401.lastPlay': 'PENALTY on SEA-E.Saubert, False Start, 5 yards, enforced at ARZ 8 - No Play.'
        };

        console.log('📡 Force updating Game 401 with:', updateData);

        await gamesRef.update(updateData);

        // Verify the update
        const snapshot = await gamesRef.get();
        const game401 = snapshot.data()['401'];

        console.log('✅ Game 401 updated successfully:', game401);

        return {
            success: true,
            message: 'Game 401 forcibly updated with live scores',
            gameData: game401
        };

    } catch (error) {
        console.error('❌ Force update failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
});