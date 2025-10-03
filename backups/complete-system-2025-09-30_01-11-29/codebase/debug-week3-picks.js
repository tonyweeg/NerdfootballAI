const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function debugWeek3Picks() {
    try {
        console.log('🔍 Comparing Week 3 vs Week 4 pick data structures...');

        const tonyUID = 'WxSPmEildJdqs6T5hIpBUZrscwt2';

        // Check Week 3 picks
        console.log('\n📊 Week 3 Pick Structure:');
        const week3Path = `artifacts/nerdfootball/public/data/nerdfootball_picks/3/submissions/${tonyUID}`;
        const week3Doc = await db.doc(week3Path).get();

        if (week3Doc.exists) {
            const week3Picks = week3Doc.data();
            const week3Keys = Object.keys(week3Picks).filter(k =>
                week3Picks[k] && typeof week3Picks[k] === 'object'
            );

            console.log('Sample Week 3 picks:');
            week3Keys.slice(0, 3).forEach(gameId => {
                const pick = week3Picks[gameId];
                console.log(`Game ${gameId}:`, JSON.stringify(pick, null, 2));
            });
        } else {
            console.log('❌ Week 3 picks not found');
        }

        // Check Week 4 picks
        console.log('\n📊 Week 4 Pick Structure:');
        const week4Path = `artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/${tonyUID}`;
        const week4Doc = await db.doc(week4Path).get();

        if (week4Doc.exists) {
            const week4Picks = week4Doc.data();
            const week4Keys = Object.keys(week4Picks).filter(k =>
                week4Picks[k] && typeof week4Picks[k] === 'object'
            );

            console.log('Sample Week 4 picks:');
            week4Keys.slice(0, 3).forEach(gameId => {
                const pick = week4Picks[gameId];
                console.log(`Game ${gameId}:`, JSON.stringify(pick, null, 2));
            });
        } else {
            console.log('❌ Week 4 picks not found');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugWeek3Picks();