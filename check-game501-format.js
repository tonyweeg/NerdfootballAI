const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkGame501Format() {
    console.log('🔍 CHECKING GAME 501 FORMAT MISMATCH\n');

    // Check bible data
    const bibleRef = db.collection('artifacts').doc('nerdfootball')
        .collection('public').doc('data')
        .collection('nerdfootball_games').doc('5');
    const bibleSnap = await bibleRef.get();
    const bibleData = bibleSnap.data();

    console.log('📖 BIBLE DATA (Game 501):');
    console.log(JSON.stringify(bibleData['501'], null, 2));

    // Check a few user picks
    const picksRef = db.collection('artifacts').doc('nerdfootball')
        .collection('public').doc('data')
        .collection('nerdfootball_picks').doc('5')
        .collection('submissions');
    const picksSnap = await picksRef.get();

    console.log('\n🎯 SAMPLE USER PICKS (Game 501):');
    let count = 0;
    picksSnap.forEach(doc => {
        if (count < 5) {
            const pick = doc.data()['501'];
            if (pick) {
                console.log(`${doc.data().userName || doc.id}: picked "${pick.winner}"`);
                count++;
            }
        }
    });

    console.log('\n❌ MISMATCH DETECTED:');
    console.log(`   Bible winner: "${bibleData['501'].winner}" (abbreviation)`);
    console.log(`   User picks: "San Francisco 49ers" or "Los Angeles Rams" (full names)`);
    console.log('\n💡 Need to convert bible winner to full team name OR convert picks to abbreviations');

    process.exit(0);
}

checkGame501Format().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
