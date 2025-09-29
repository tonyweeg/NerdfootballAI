const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function debugWeek4Document() {
    console.log('🔍 DEBUGGING Week 4 Game Document');

    const weekPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
    console.log(`📋 Checking path: ${weekPath}`);

    try {
        const weekDoc = await db.doc(weekPath).get();

        console.log(`📋 Week 4 document exists: ${weekDoc.exists}`);

        if (weekDoc.exists) {
            const weekData = weekDoc.data();
            console.log(`🎯 Week 4 document data:`, JSON.stringify(weekData, null, 2));

            const gameKeys = Object.keys(weekData || {});
            console.log(`🔥 Week 4 game keys (${gameKeys.length}):`, gameKeys);

            if (gameKeys.length === 0) {
                console.log('❌ PROBLEM FOUND: Week 4 document exists but is EMPTY!');
            } else {
                gameKeys.forEach(gameId => {
                    const game = weekData[gameId];
                    console.log(`🎯 Game ${gameId}:`, JSON.stringify(game, null, 2));
                });
            }
        } else {
            console.log('❌ PROBLEM FOUND: Week 4 document does NOT exist!');
        }
    } catch (error) {
        console.error('❌ ERROR reading Week 4 document:', error);
    }
}

debugWeek4Document().then(() => {
    console.log('✅ Debug complete');
    process.exit(0);
}).catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
});