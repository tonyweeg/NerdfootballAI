const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugGridPicks() {
    const userId = 'bEVzcZtSExT8cIjamWnGbWZ3J5s1'; // NerdMamma
    const week = 5;
    const gameId = '501'; // LAR vs SF Thursday game

    console.log(`\n🔍 DEBUG: Checking Grid logic for NerdMamma's Week ${week} picks`);
    console.log(`Looking for game ${gameId} (LAR vs SF)`);

    try {
        // Load picks exactly how the Grid does
        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions/${userId}`;
        const userPicksDoc = await db.doc(picksPath).get();

        if (userPicksDoc.exists) {
            const userPicks = userPicksDoc.data();
            console.log(`\n✅ User picks loaded successfully`);
            console.log(`Total picks object:`, Object.keys(userPicks).length, 'keys');

            // Check if game 501 exists
            if (userPicks[gameId]) {
                console.log(`\n✅ Game ${gameId} pick EXISTS:`);
                console.log(JSON.stringify(userPicks[gameId], null, 2));

                const pick = userPicks[gameId];
                console.log(`\nPick details:`);
                console.log(`- Winner: ${pick.winner}`);
                console.log(`- Confidence: ${pick.confidence}`);
                console.log(`- This SHOULD show on the Grid as LAR with confidence 14`);
            } else {
                console.log(`\n❌ Game ${gameId} pick DOES NOT EXIST in userPicks`);
                console.log(`Available game IDs:`, Object.keys(userPicks).filter(k => k.match(/^\d+$/)));
            }

        } else {
            console.log(`\n❌ No picks document found at ${picksPath}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

debugGridPicks();
