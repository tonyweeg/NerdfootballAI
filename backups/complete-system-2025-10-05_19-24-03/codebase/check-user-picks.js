const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUserPicks() {
    const userId = 'bEVzcZtSExT8cIjamWnGbWZ3J5s1';
    const week = 5;
    const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions/${userId}`;

    console.log(`🔍 Checking picks at: ${picksPath}`);

    try {
        const picksDoc = await db.doc(picksPath).get();

        if (picksDoc.exists) {
            console.log('✅ PICKS FOUND:');
            console.log(JSON.stringify(picksDoc.data(), null, 2));
        } else {
            console.log('❌ NO PICKS FOUND - Document does not exist');

            // Check if they have picks for other weeks
            console.log('\n🔍 Checking other weeks...');
            for (let w = 1; w <= 18; w++) {
                const otherPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${w}/submissions/${userId}`;
                const otherDoc = await db.doc(otherPath).get();
                if (otherDoc.exists) {
                    console.log(`✅ Found picks for week ${w}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

checkUserPicks();
