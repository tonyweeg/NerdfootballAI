const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function verifyTonyWeek4Score() {
    try {
        console.log('🔍 Verifying Tony\'s Week 4 scoring update...');

        const userId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Tony
        const scoringRef = db.doc(`artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`);
        const scoringSnap = await scoringRef.get();

        if (!scoringSnap.exists) {
            console.log('❌ No scoring document found for Tony');
            return;
        }

        const scoring = scoringSnap.data();
        const weeklyPoints = scoring.weeklyPoints || {};

        console.log('📊 Tony\'s Complete Scoring History:');

        // Show all weeks
        for (let week = 1; week <= 4; week++) {
            const weekData = weeklyPoints[week.toString()] || weeklyPoints[week];
            if (weekData) {
                console.log(`Week ${week}:`);
                console.log(`   Total Points: ${weekData.totalPoints}`);
                console.log(`   Correct Picks: ${weekData.correctPicks}`);
                console.log(`   Total Picks: ${weekData.totalPicks}`);
                console.log(`   Accuracy: ${weekData.accuracy}%`);
                console.log(`   Calculated At: ${weekData.calculatedAt}`);
            } else {
                console.log(`Week ${week}: ❌ NO DATA`);
            }
        }

        // Focus on Week 4
        const week4Data = weeklyPoints['4'] || weeklyPoints[4];

        console.log('\n🎯 Week 4 Status Check:');
        if (week4Data) {
            console.log('✅ WEEK 4 SCORING SUCCESS!');
            console.log(`   Points: ${week4Data.totalPoints}`);
            console.log(`   Picks: ${week4Data.correctPicks}/${week4Data.totalPicks}`);
            console.log(`   Accuracy: ${week4Data.accuracy}%`);

            if (week4Data.totalPoints === 16) {
                console.log('✅ Expected 16 points confirmed!');
            } else {
                console.log(`⚠️  Expected 16 points, got ${week4Data.totalPoints}`);
            }
        } else {
            console.log('❌ Week 4 data still missing!');
        }

        console.log(`\n📝 Document Last Updated: ${scoring.lastUpdated || 'Unknown'}`);

    } catch (error) {
        console.error('❌ Error verifying Tony\'s score:', error);
    }
}

verifyTonyWeek4Score();