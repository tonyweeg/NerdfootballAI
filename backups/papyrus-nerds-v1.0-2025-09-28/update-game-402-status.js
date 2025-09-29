const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nerdfootball-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function updateGame402Status() {
    try {
        console.log('🔄 Updating Game 402 status to IN_PROGRESS...');

        const docPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        const docRef = db.doc(docPath);

        // Get current document
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            console.log('❌ Document not found at path:', docPath);
            return;
        }

        const currentData = docSnap.data();
        console.log('📄 Current game_402 data:', currentData.game_402);

        // Update game_402 status and scores
        const updatedData = {
            ...currentData,
            game_402: {
                ...currentData.game_402,
                status: 'IN_PROGRESS',
                awayScore: 14,
                homeScore: 21,
                quarter: '3rd',
                clock: '8:42',
                down: 2,
                yardLine: 'HOU 35',
                possession: 'home',
                lastUpdated: new Date().toISOString(),
                // Keep any existing team info
                awayTeam: currentData.game_402?.awayTeam || 'Away Team',
                homeTeam: currentData.game_402?.homeTeam || 'Home Team'
            }
        };

        await docRef.set(updatedData);

        console.log('✅ Successfully updated Game 402 status to IN_PROGRESS');
        console.log('🎮 New game_402 data:', updatedData.game_402);

    } catch (error) {
        console.error('❌ Error updating Game 402:', error);
    } finally {
        process.exit(0);
    }
}

updateGame402Status();