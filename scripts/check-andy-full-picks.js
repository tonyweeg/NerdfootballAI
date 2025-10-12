const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAndyFullPicks() {
    try {
        console.log('🔍 Checking Andy Anderson full Week 4 picks...\n');

        const andyId = 'bEVzcZtSExT8cIjamWnGbWZ3J5s1';
        const andyPicksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/${andyId}`;
        const andyPicksDoc = await db.doc(andyPicksPath).get();

        if (!andyPicksDoc.exists) {
            console.log('❌ Andy picks not found');
            process.exit(1);
        }

        const picks = andyPicksDoc.data();
        console.log('📊 All Andy picks for Week 4:\n');
        
        for (const [gameId, pick] of Object.entries(picks)) {
            if (gameId.startsWith('_')) continue;
            console.log(`Game ${gameId}: ${pick.winner} (confidence ${pick.confidence})`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAndyFullPicks();
