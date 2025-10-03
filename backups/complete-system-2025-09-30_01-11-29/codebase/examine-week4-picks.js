const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function examineWeek4Picks() {
    try {
        console.log('🔍 Examining Week 4 pick data structure...');

        const userId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Tony
        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/${userId}`;
        const picksRef = db.doc(picksPath);
        const picksSnap = await picksRef.get();

        if (!picksSnap.exists) {
            console.log('❌ Tony has no Week 4 picks');
            return;
        }

        const picks = picksSnap.data();
        console.log('📊 Tony\'s Week 4 Pick Data Structure:');
        console.log(JSON.stringify(picks, null, 2));

        // Analyze each pick
        const gameIds = Object.keys(picks);
        console.log(`\n🎯 Found ${gameIds.length} picks:`);

        let validPicks = 0;
        let malformedPicks = 0;

        gameIds.forEach(gameId => {
            const pick = picks[gameId];
            const hasTeam = pick && pick.team && pick.team !== 'No team';
            const hasConfidence = pick && pick.confidence;

            console.log(`Game ${gameId}:`);
            console.log(`   Team: ${pick?.team || 'MISSING'}`);
            console.log(`   Confidence: ${pick?.confidence || 'MISSING'}`);
            console.log(`   Valid: ${hasTeam && hasConfidence ? '✅' : '❌'}`);

            if (hasTeam && hasConfidence) {
                validPicks++;
            } else {
                malformedPicks++;
            }
        });

        console.log(`\n📈 Pick Analysis Summary:`);
        console.log(`   Valid picks: ${validPicks}`);
        console.log(`   Malformed picks: ${malformedPicks}`);
        console.log(`   Total picks: ${gameIds.length}`);

        if (malformedPicks > 0) {
            console.log(`\n🚨 ISSUE IDENTIFIED: ${malformedPicks} malformed picks prevent scoring!`);
        } else {
            console.log(`\n✅ All picks are valid - issue may be elsewhere`);
        }

        // Check a working week for comparison (Week 3)
        console.log('\n🔄 Comparing with working Week 3 data...');
        const week3Path = `artifacts/nerdfootball/public/data/nerdfootball_picks/3/submissions/${userId}`;
        const week3Ref = db.doc(week3Path);
        const week3Snap = await week3Ref.get();

        if (week3Snap.exists) {
            const week3Picks = week3Snap.data();
            const week3GameIds = Object.keys(week3Picks);

            if (week3GameIds.length > 0) {
                const samplePick = week3Picks[week3GameIds[0]];
                console.log('📋 Week 3 Pick Structure (for comparison):');
                console.log(JSON.stringify(samplePick, null, 2));
            }
        }

    } catch (error) {
        console.error('❌ Error examining Week 4 picks:', error);
    }
}

examineWeek4Picks();