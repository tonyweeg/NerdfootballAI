// Week 4 Scoring Data Corruption Investigation
// Debug script to examine stored Week 4 scoring data

const debugWeek4Scoring = async () => {
    console.log('🔍 DEBUG: Investigating Week 4 scoring data corruption...');

    try {
        // Initialize Firebase connection
        if (!window.db) {
            console.error('❌ Firebase not initialized');
            return;
        }

        // Get pool members
        const membersRef = window.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const membersSnap = await window.getDoc(membersRef);

        if (!membersSnap.exists()) {
            console.error('❌ No pool members found');
            return;
        }

        const allMembers = Object.values(membersSnap.data());
        const validMembers = allMembers.filter(member => member && member.uid && member.uid !== 'undefined');

        console.log(`📊 Found ${validMembers.length} valid pool members`);

        // Check Week 4 scoring data for each user
        const week4Data = [];

        for (const member of validMembers.slice(0, 10)) { // First 10 users to avoid spam
            try {
                const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${member.uid}`;
                const docRef = window.doc(window.db, scorePath);
                const docSnap = await window.getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const weeklyPoints = data.weeklyPoints || {};
                    const week4Score = weeklyPoints[4] || weeklyPoints['4'] || null;

                    if (week4Score) {
                        week4Data.push({
                            user: member.displayName || member.email || member.uid.slice(-6),
                            uid: member.uid.slice(-6),
                            week4Points: week4Score.totalPoints,
                            week4Data: week4Score,
                            allWeeklyPoints: Object.keys(weeklyPoints).map(week => ({
                                week: week,
                                points: weeklyPoints[week].totalPoints
                            }))
                        });
                    } else {
                        week4Data.push({
                            user: member.displayName || member.email || member.uid.slice(-6),
                            uid: member.uid.slice(-6),
                            week4Points: 'NO DATA',
                            week4Data: null,
                            allWeeklyPoints: Object.keys(weeklyPoints).map(week => ({
                                week: week,
                                points: weeklyPoints[week].totalPoints
                            }))
                        });
                    }
                } else {
                    week4Data.push({
                        user: member.displayName || member.email || member.uid.slice(-6),
                        uid: member.uid.slice(-6),
                        week4Points: 'NO SCORING DOC',
                        week4Data: null,
                        allWeeklyPoints: []
                    });
                }
            } catch (userError) {
                console.error(`❌ Error checking user ${member.uid}:`, userError);
            }
        }

        // Display results
        console.log('\n📊 WEEK 4 SCORING DATA ANALYSIS:');
        console.log('='.repeat(80));

        week4Data.forEach(user => {
            console.log(`\n👤 ${user.user} (${user.uid}):`);
            console.log(`   Week 4 Points: ${user.week4Points}`);
            if (user.week4Data) {
                console.log(`   Week 4 Details:`, {
                    totalPoints: user.week4Data.totalPoints,
                    correctPicks: user.week4Data.correctPicks,
                    totalPicks: user.week4Data.totalPicks,
                    accuracy: user.week4Data.accuracy,
                    gamesInWeek: user.week4Data.gamesInWeek,
                    maxPossiblePoints: user.week4Data.maxPossiblePoints
                });
            }
            console.log(`   All Weeks: ${user.allWeeklyPoints.map(w => `Week ${w.week}: ${w.points}pts`).join(', ')}`);
        });

        // Check for impossible scores
        const impossibleScores = week4Data.filter(user =>
            typeof user.week4Points === 'number' && user.week4Points > 150
        );

        if (impossibleScores.length > 0) {
            console.log('\n🚨 IMPOSSIBLE SCORES FOUND:');
            impossibleScores.forEach(user => {
                console.log(`   ${user.user}: ${user.week4Points} points (IMPOSSIBLE)`);
            });
        }

        // Check Week 4 game data
        console.log('\n🏈 CHECKING WEEK 4 GAME DATA:');
        try {
            const response = await fetch('./nfl_2025_week_4.json');
            if (response.ok) {
                const weekData = await response.json();
                const games = weekData.games || [];
                const gameCount = games.length;
                const maxPossible = gameCount > 0 ? (gameCount * (gameCount + 1)) / 2 : 0;

                console.log(`   Week 4 Games: ${gameCount}`);
                console.log(`   Max Possible Points: ${maxPossible}`);
                console.log(`   Games Sample:`, games.slice(0, 3).map(g => `${g.away || g.a} @ ${g.home || g.h}`));

                // Check for completed games
                const completedGames = games.filter(g => g.winner && g.status === 'Final');
                console.log(`   Completed Games: ${completedGames.length}/${gameCount}`);

                if (completedGames.length > 0) {
                    console.log(`   Sample Completed:`, completedGames.slice(0, 2).map(g =>
                        `${g.away || g.a} @ ${g.home || g.h} (Winner: ${g.winner})`
                    ));
                }
            } else {
                console.log(`   ❌ Could not fetch Week 4 game data (${response.status})`);
            }
        } catch (gameError) {
            console.log(`   ❌ Error fetching Week 4 games:`, gameError.message);
        }

        return week4Data;

    } catch (error) {
        console.error('❌ Debug script error:', error);
    }
};

// Export for console use
window.debugWeek4Scoring = debugWeek4Scoring;

console.log('🔧 Week 4 debug script loaded. Run: await debugWeek4Scoring()');