const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });

async function debugWeek2Scoring() {
    console.log('🔍 Debugging Week 2 scoring using correct logic from picks-viewer-auth.html...');

    try {
        // Get Week 2 bible data
        console.log('📚 Loading Week 2 bible data...');
        const bibleResponse = await fetch('https://nerdfootball.web.app/nfl_2025_week_2.json');
        if (!bibleResponse.ok) {
            throw new Error(`Failed to load bible data: ${bibleResponse.status}`);
        }
        const bibleData = await bibleResponse.json();
        const gameIds = Object.keys(bibleData).filter(k => k !== '_metadata');
        console.log(`✅ Loaded ${gameIds.length} games from bible data`);

        // Get pool members
        const poolMembersRef = admin.firestore().doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const poolMembersSnap = await poolMembersRef.get();
        const poolMembers = poolMembersSnap.data();

        // Sample just a few users for detailed analysis
        const sampleUsers = Object.keys(poolMembers).slice(0, 3);
        console.log(`🔍 Analyzing ${sampleUsers.length} sample users...`);

        for (const uid of sampleUsers) {
            if (uid === 'okl4sw2aDhW3yKpOfOwe5lH7OQj1') continue; // Skip ghost user

            const member = poolMembers[uid];
            console.log(`\n👤 ${member.displayName || 'Unknown'} (${uid.slice(-6)}):`);

            // Get their Week 2 picks
            const picksRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_picks/2/submissions/${uid}`);
            const picksSnap = await picksRef.get();

            if (!picksSnap.exists) {
                console.log('  ❌ No picks found');
                continue;
            }

            const picks = picksSnap.data();
            console.log('  📄 Raw picks data keys:', Object.keys(picks));

            // Apply CORRECT scoring logic from picks-viewer-auth.html (lines 635-650)
            let correctPicks = 0;
            let totalPointsEarned = 0;
            const winningPicks = [];
            const losingPicks = [];

            gameIds.forEach(gameId => {
                const pick = picks[gameId];
                if (pick && typeof pick === 'object' && pick.winner && bibleData[gameId]) {
                    const actualWinner = bibleData[gameId].winner;
                    const userPick = pick.winner;
                    const isCorrect = actualWinner === userPick;
                    const confidence = pick.confidence;

                    if (isCorrect) {
                        correctPicks++;
                        if (typeof confidence === 'number' && confidence >= 1 && confidence <= gameIds.length) {
                            totalPointsEarned += confidence;
                            winningPicks.push({ gameId, team: userPick, points: confidence });
                        }
                    } else {
                        losingPicks.push({ gameId, team: userPick, points: confidence, actualWinner });
                    }
                }
            });

            console.log('  ✅ CORRECT CALCULATION:');
            console.log(`    Correct Picks: ${correctPicks}`);
            console.log(`    Total Points Earned: ${totalPointsEarned}`);
            console.log(`    Winning Picks: ${winningPicks.map(p => `${p.team}(${p.points})`).join(', ')}`);

            // Get stored scoring data
            const scoringRef = admin.firestore().doc(`artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${uid}`);
            const scoringSnap = await scoringRef.get();

            if (scoringSnap.exists) {
                const weeklyPoints = scoringSnap.data().weeklyPoints || {};
                const week2Data = weeklyPoints['2'];

                if (week2Data) {
                    console.log('  🗃️ STORED DATA:');
                    console.log(`    Correct Picks: ${week2Data.correctPicks || 0}`);
                    console.log(`    Total Points: ${week2Data.totalPoints || 0}`);
                    console.log(`    Games Won: ${(week2Data.gamesWon || []).length}`);
                    console.log(`    Games Lost: ${(week2Data.gamesLost || []).length}`);

                    // Compare
                    const correctPicksMatch = correctPicks === (week2Data.correctPicks || 0);
                    const pointsMatch = totalPointsEarned === (week2Data.totalPoints || 0);

                    console.log('  🔍 COMPARISON:');
                    console.log(`    Correct Picks Match: ${correctPicksMatch ? '✅' : '❌'}`);
                    console.log(`    Points Match: ${pointsMatch ? '✅' : '❌'}`);

                    if (!correctPicksMatch || !pointsMatch) {
                        console.log('  🚨 DISCREPANCY FOUND!');
                        console.log(`    Should be: ${correctPicks} correct, ${totalPointsEarned} points`);
                        console.log(`    Stored as: ${week2Data.correctPicks || 0} correct, ${week2Data.totalPoints || 0} points`);
                    }
                } else {
                    console.log('  ❌ No Week 2 scoring data found');
                }
            } else {
                console.log('  ❌ No scoring document found');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

debugWeek2Scoring().catch(console.error);