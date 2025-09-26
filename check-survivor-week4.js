const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function checkSurvivorWeek4() {
    console.log('🏈 Checking Week 4 survivor picks...');

    try {
        const picksPath = 'artifacts/nerdfootball/public/data/nerdSurvivor_picks/4';
        const picksRef = db.doc(picksPath);
        const picksSnap = await picksRef.get();

        if (!picksSnap.exists()) {
            console.log('❌ No Week 4 survivor picks found');
            return;
        }

        const picksData = picksSnap.data();
        const users = Object.keys(picksData);
        console.log('📊 Week 4 survivor picks:', users.length, 'users');

        users.forEach(userId => {
            const pick = picksData[userId];
            console.log('  ', userId.slice(0,8) + '...', '- picked:', pick.team || pick);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkSurvivorWeek4().then(() => process.exit(0));