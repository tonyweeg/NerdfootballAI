const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkBibleData() {
    const week = 5;
    const biblePath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;

    try {
        const bibleDoc = await db.doc(biblePath).get();

        if (bibleDoc.exists) {
            const bibleData = bibleDoc.data();
            console.log('\n📖 FULL BIBLE DATA for Week 5, Game 501:');
            console.log(JSON.stringify(bibleData['501'], null, 2));
        } else {
            console.log('\n❌ NO BIBLE DATA FOUND');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

checkBibleData();
