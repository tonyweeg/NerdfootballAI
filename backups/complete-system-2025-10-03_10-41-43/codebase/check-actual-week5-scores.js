const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkActualWeek5Scores() {
    console.log('🔍 CHECKING ACTUAL WEEK 5 SCORES IN FIRESTORE\n');

    const picksRef = db.collection('artifacts').doc('nerdfootball')
        .collection('public').doc('data')
        .collection('nerdfootball_picks').doc('5')
        .collection('submissions');
    const picksSnap = await picksRef.get();

    console.log(`Found ${picksSnap.size} submissions\n`);

    const usersWithPoints = [];

    picksSnap.forEach(doc => {
        const data = doc.data();
        if (data.totalPoints && data.totalPoints > 0) {
            usersWithPoints.push({
                userId: doc.id,
                userName: data.userName,
                totalPoints: data.totalPoints,
                correctPicks: data.correctPicks,
                totalValidPicks: data.totalValidPicks,
                pick501: data['501'] ? data['501'].winner : 'no pick'
            });
        }
    });

    console.log(`✅ Users with Week 5 points: ${usersWithPoints.length}\n`);

    usersWithPoints.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10).forEach(user => {
        console.log(`${user.userName || user.userId}: ${user.totalPoints} pts (${user.correctPicks}/${user.totalValidPicks}) - Game 501 pick: ${user.pick501}`);
    });

    if (usersWithPoints.length === 0) {
        console.log('\n❌ NO USERS HAVE WEEK 5 POINTS YET!');
        console.log('Checking a sample pick document...\n');

        const sampleDoc = picksSnap.docs[0];
        const sampleData = sampleDoc.data();
        console.log('Sample user:', sampleDoc.id);
        console.log('Has totalPoints field?', 'totalPoints' in sampleData);
        console.log('totalPoints value:', sampleData.totalPoints);
        console.log('Game 501 pick:', sampleData['501']);
    }

    process.exit(0);
}

checkActualWeek5Scores().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
