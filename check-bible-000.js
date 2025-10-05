const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkBible000() {
    const week = 5;
    const biblePath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;

    try {
        const bibleDoc = await db.doc(biblePath).get();

        if (bibleDoc.exists) {
            const bibleData = bibleDoc.data();
            const allKeys = Object.keys(bibleData);
            
            console.log('\n📖 ALL KEYS in Bible Data:');
            allKeys.forEach(key => {
                console.log(`  - ${key}`);
            });

            if (bibleData['000']) {
                console.log('\n⚠️ Game 000 EXISTS:');
                console.log(JSON.stringify(bibleData['000'], null, 2));
            } else {
                console.log('\n✅ Game 000 does NOT exist in bible data');
            }

            // Check game IDs after filtering
            const gameIds = allKeys.filter(k => k !== '_metadata');
            console.log('\n🎯 Game IDs after filtering _metadata:', gameIds.join(', '));
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

checkBible000();
