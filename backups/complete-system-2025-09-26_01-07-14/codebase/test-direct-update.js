const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function testDirectUpdate() {
    try {
        console.log('🏈 Testing direct database update for Game 401...');

        const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        const gamesRef = db.doc(gamesPath);

        // Direct update with live ESPN data
        const updateData = {
            '401.status': 'IN_PROGRESS',
            '401.awayScore': 17,
            '401.homeScore': 6,
            '401.winner': null,
            '401.lastUpdated': new Date().toISOString()
        };

        console.log('📡 Updating with data:', updateData);

        await gamesRef.update(updateData);

        console.log('✅ Direct update successful!');

        // Verify the update
        const snapshot = await gamesRef.get();
        const data = snapshot.data();
        console.log('🎯 Game 401 after update:', data['401']);

    } catch (error) {
        console.error('❌ Direct update failed:', error);
    }
}

testDirectUpdate();