const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });

async function fixWeek3MissingGame() {
    console.log('🔧 FIXING WEEK 3 - Adding missing game 301...');

    try {
        // Get current Week 3 data
        const docPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/3';
        const docRef = admin.firestore().doc(docPath);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new Error('Week 3 document not found');
        }

        const data = docSnap.data();
        console.log(`📊 Current Week 3 games: ${Object.keys(data).filter(k => !k.startsWith('_')).length}`);

        // Add missing game 301
        data['301'] = {
            id: "301",
            a: "TEAM_A_TO_BE_SET",     // TO BE FILLED MANUALLY
            h: "TEAM_H_TO_BE_SET",     // TO BE FILLED MANUALLY
            dt: "2025-09-21T17:00:00Z", // Estimated time
            stadium: "STADIUM_TO_BE_SET",
            awayScore: null,
            homeScore: null,
            status: "scheduled",
            winner: null
        };

        // Update metadata
        data._metadata.totalGames = 16;
        data._metadata.lastUpdated = new Date().toISOString();
        data._metadata.fixApplied = 'Added missing game 301';

        // Save back to Firestore
        await docRef.set(data);

        console.log('✅ Added game 301 to Week 3');
        console.log(`📊 Week 3 now has: ${Object.keys(data).filter(k => !k.startsWith('_')).length} games`);
        console.log('⚠️  Game 301 needs manual team assignment in nerd-game-updater.html');

    } catch (error) {
        console.error('❌ Error fixing Week 3:', error.message);
    }

    process.exit(0);
}

fixWeek3MissingGame().catch(console.error);