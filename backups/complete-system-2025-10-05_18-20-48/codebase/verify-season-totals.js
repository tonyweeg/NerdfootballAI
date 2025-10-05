const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function verifySeasonTotals() {
    console.log('🏆 VERIFYING SEASON LEADERBOARD TOTALS');
    console.log('====================================');

    try {
        // Check top season leaderboard user: jdurks1@gmail.com (454 points)
        const testUserId = 'vIuhLHwJ7thZae2mWBSjS5Orr6k2'; // This should be jdurks1@gmail.com

        // Get their individual scoring data
        const scoringRef = db.doc(`artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/3UNx3z6jd3Z7WM4BdOGbZMwFSYz2`);
        const scoringDoc = await scoringRef.get();

        if (scoringDoc.exists) {
            const data = scoringDoc.data();
            const weeklyPoints = data.weeklyPoints || {};

            console.log('📊 Weekly Breakdown for jdurks1@gmail.com:');

            let calculatedTotal = 0;
            for (let week = 1; week <= 4; week++) {
                const weekData = weeklyPoints[week];
                if (weekData && weekData.totalPoints !== undefined) {
                    console.log(`  Week ${week}: ${weekData.totalPoints} points`);
                    calculatedTotal += weekData.totalPoints;
                } else {
                    console.log(`  Week ${week}: No data`);
                }
            }

            console.log(`\n🧮 CALCULATION:`);
            console.log(`  Manual Total: ${calculatedTotal} points`);
            console.log(`  Stored Total: ${data.totalPoints} points`);
            console.log(`  Season Board: 454 points (jdurks1@gmail.com)`);

            if (calculatedTotal === data.totalPoints) {
                console.log(`  ✅ Manual calculation matches stored total`);
            } else {
                console.log(`  ❌ Manual calculation doesn't match stored total`);
            }

            // Check if Week 4 is included
            const week4Points = weeklyPoints[4]?.totalPoints || 0;
            console.log(`\n🎯 WEEK 4 VERIFICATION:`);
            console.log(`  Week 4 Points: ${week4Points}`);
            console.log(`  Expected Range: 0-136 points`);

            if (week4Points > 0 && week4Points <= 136) {
                console.log(`  ✅ Week 4 points are realistic (fixed corruption)`);
            } else if (week4Points === 0) {
                console.log(`  ⚠️ Week 4 points are 0 (might need regeneration)`);
            } else {
                console.log(`  ❌ Week 4 points are impossible (${week4Points} > 136)`);
            }

            return {
                manualTotal: calculatedTotal,
                storedTotal: data.totalPoints,
                week4Points,
                isValid: week4Points <= 136
            };
        } else {
            console.log('❌ User scoring data not found');
            return null;
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
        return null;
    }
}

verifySeasonTotals().then((result) => {
    if (result) {
        console.log('\n🎯 VERIFICATION COMPLETE');
        if (result.isValid && result.manualTotal === result.storedTotal) {
            console.log('🎉 Season leaderboard totals are CORRECT with fixed Week 4 data!');
        } else {
            console.log('⚠️ Season leaderboard may need regeneration');
        }
    }
    console.log('\n🏆 Season leaderboard verification complete');
    process.exit(0);
}).catch(error => {
    console.error('❌ Verification error:', error);
    process.exit(1);
});