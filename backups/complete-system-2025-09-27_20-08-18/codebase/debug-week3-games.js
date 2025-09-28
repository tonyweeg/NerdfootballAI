const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function debugWeek3Games() {
    try {
        console.log('🔍 Debugging Week 3 games and game ID filtering...');

        // Load Week 3 games
        const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/3';
        const gamesDoc = await db.doc(gamesPath).get();

        if (!gamesDoc.exists) {
            console.log('❌ Week 3 games not found');
            return;
        }

        const bibleData = gamesDoc.data();
        console.log('📊 Raw Week 3 game keys:', Object.keys(bibleData));

        // Apply the same filtering logic as the Grid
        const gameIds = Object.keys(bibleData)
            .filter(k => !k.startsWith('_') && !k.includes('401772')) // Filter out metadata and ESPN IDs
            .filter(k => parseInt(k) >= 401 && parseInt(k) <= 416) // Only games 401-416
            .sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically

        console.log('🔍 Filtered game IDs (Grid logic):', gameIds);
        console.log('📈 Expected range: 401-416, Found:', gameIds.length);

        // Show what games actually exist in Week 3
        const actualGameIds = Object.keys(bibleData)
            .filter(k => !k.startsWith('_'))
            .filter(k => parseInt(k) >= 300 && parseInt(k) <= 320) // Week 3 range
            .sort((a, b) => parseInt(a) - parseInt(b));

        console.log('🎯 Actual Week 3 game IDs (300-320 range):', actualGameIds);

        // Check Tony's picks against actual game IDs
        const tonyUID = 'WxSPmEildJdqs6T5hIpBUZrscwt2';
        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/3/submissions/${tonyUID}`;
        const picksDoc = await db.doc(picksPath).get();

        if (picksDoc.exists) {
            const picks = picksDoc.data();
            const pickGameIds = Object.keys(picks).filter(k =>
                picks[k] && typeof picks[k] === 'object' && picks[k].confidence
            );

            console.log('📋 Tony\'s pick game IDs:', pickGameIds);
            console.log('❗ MISMATCH: Grid expects 401-416, but Week 3 has 301-316!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugWeek3Games();