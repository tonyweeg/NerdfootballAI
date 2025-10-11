const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../nerdfootball-firebase-adminsdk-z8k1g-4ed45f6e99.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteGame000() {
    try {
        console.log('🗑️  Deleting game 000 from Week 6...');

        const week6Path = 'artifacts/nerdfootball/public/data/nerdfootball_games/6';
        const week6Ref = db.doc(week6Path);

        // Delete the 000 field
        await week6Ref.update({
            '000': admin.firestore.FieldValue.delete()
        });

        console.log('✅ Game 000 deleted successfully from Week 6');

        // Verify deletion
        const week6Snap = await week6Ref.get();
        const games = week6Snap.data();
        const gameIds = Object.keys(games).filter(k => !k.startsWith('_'));

        console.log(`📊 Week 6 now has ${gameIds.length} games:`);
        gameIds.forEach(id => {
            const game = games[id];
            console.log(`  Game ${id}: ${game.a || '?'} @ ${game.h || '?'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error deleting game 000:', error);
        process.exit(1);
    }
}

deleteGame000();
