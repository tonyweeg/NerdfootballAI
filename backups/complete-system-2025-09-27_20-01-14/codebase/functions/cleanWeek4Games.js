const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Clean Week 4 Games - Remove invalid game IDs (keep only 401-416)
exports.cleanWeek4Games = functions.https.onCall(async (data, context) => {
    try {
        console.log('=== CLEAN WEEK 4 GAMES STARTED ===');

        const db = admin.firestore();
        const week4DocRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/4');

        console.log('Getting current Week 4 data...');
        const week4Snap = await week4DocRef.get();

        if (!week4Snap.exists) {
            console.log('Week 4 document does not exist in Firestore');
            return { success: false, message: 'Week 4 document not found' };
        }

        const currentData = week4Snap.data();
        const allKeys = Object.keys(currentData);
        console.log('All keys found:', allKeys);

        // Filter to only include game IDs 401-416
        const cleanedData = {};
        const validGameIds = [];
        const invalidGameIds = [];

        for (const [gameId, gameData] of Object.entries(currentData)) {
            if (gameId === '_metadata') {
                cleanedData[gameId] = gameData;
            } else {
                const numericId = parseInt(gameId);
                if (numericId >= 401 && numericId <= 416) {
                    cleanedData[gameId] = gameData;
                    validGameIds.push(gameId);
                } else {
                    invalidGameIds.push(gameId);
                }
            }
        }

        console.log(`Valid game IDs (401-416): ${validGameIds.length}`);
        console.log('Valid IDs:', validGameIds.sort());
        console.log(`Invalid game IDs to remove: ${invalidGameIds.length}`);
        console.log('Invalid IDs:', invalidGameIds.sort());

        if (invalidGameIds.length > 0) {
            console.log('Updating Firestore with cleaned data...');
            await week4DocRef.set(cleanedData);
            console.log('Week 4 games cleaned successfully!');
            return {
                success: true,
                message: `Removed ${invalidGameIds.length} invalid games, kept ${validGameIds.length} valid games`,
                removedGameIds: invalidGameIds,
                keptGameIds: validGameIds
            };
        } else {
            console.log('No cleanup needed - Week 4 data already contains only games 401-416');
            return {
                success: true,
                message: 'Week 4 data is already clean (only games 401-416)',
                keptGameIds: validGameIds
            };
        }

    } catch (error) {
        console.error('Error cleaning Week 4 games:', error);
        return { success: false, message: error.message };
    }
});