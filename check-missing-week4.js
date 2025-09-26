const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });

async function checkWeek2Scoring() {
    console.log('🔍 Checking Week 2 scoring for discrepancies...');

    // Get pool members
    const poolMembersRef = admin.firestore().doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    const poolMembersSnap = await poolMembersRef.get();
    const poolMembers = poolMembersSnap.data();

    const week2Issues = [];

    for (const [uid, member] of Object.entries(poolMembers)) {
        if (uid === 'okl4sw2aDhW3yKpOfOwe5lH7OQj1') continue; // Skip ghost user

        try {
            const scoringRef = admin.firestore().doc(`artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${uid}`);
            const scoringSnap = await scoringRef.get();

            if (scoringSnap.exists) {
                const weeklyPoints = scoringSnap.data().weeklyPoints || {};
                const week2Data = weeklyPoints['2'];

                if (week2Data) {
                    const { correctPicks = 0, totalPoints = 0, gamesWon = [], gamesLost = [], gamesPending = [] } = week2Data;

                    console.log(`\n👤 ${member.displayName || 'Unknown'} (${uid.slice(-6)}):`);
                    console.log(`  📊 Total Points: ${totalPoints}`);
                    console.log(`  ✅ Correct Picks: ${correctPicks}`);
                    console.log(`  🏆 Games Won: ${gamesWon.length}`);
                    console.log(`  ❌ Games Lost: ${gamesLost.length}`);
                    console.log(`  ⏳ Games Pending: ${gamesPending.length}`);

                    // Check if points seem too high for correct picks
                    if (totalPoints > 0 && correctPicks > 0) {
                        const avgPointsPerWin = totalPoints / correctPicks;
                        if (avgPointsPerWin > 15) { // High average could indicate over-scoring
                            week2Issues.push({
                                user: `${member.displayName || 'Unknown'} (${uid.slice(-6)})`,
                                totalPoints,
                                correctPicks,
                                avgPointsPerWin: avgPointsPerWin.toFixed(1),
                                gamesWon: gamesWon.length,
                                issue: 'High average points per win'
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error checking ${uid}:`, error.message);
        }
    }

    if (week2Issues.length > 0) {
        console.log(`\n🚨 POTENTIAL WEEK 2 SCORING ISSUES:`);
        week2Issues.forEach(issue => {
            console.log(`  - ${issue.user}: ${issue.totalPoints} pts, ${issue.correctPicks} correct, avg ${issue.avgPointsPerWin} pts/win`);
        });
    }

    process.exit(0);
}

checkWeek2Scoring().catch(console.error);