const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function processAllUsersWeek4() {
    console.log('🏆 Processing Week 4 scoring for all users...');

    // Get pool members
    const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
    const poolMembersDoc = await db.doc(poolMembersPath).get();
    const poolMembers = poolMembersDoc.data();
    const memberIds = Object.keys(poolMembers);

    console.log(`Found ${memberIds.length} pool members to process`);

    // Load Week 4 games
    const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
    const gamesDoc = await db.doc(gamesPath).get();
    const bibleData = gamesDoc.data();

    let processedCount = 0;
    let foundPicksCount = 0;

    for (const memberId of memberIds) {
        try {
            // Get user's Week 4 picks
            const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/${memberId}`;
            const picksDoc = await db.doc(picksPath).get();

            if (!picksDoc.exists) {
                console.log(`⚠️ No Week 4 picks for ${memberId.slice(-6)}`);
                continue;
            }

            foundPicksCount++;
            const picks = picksDoc.data();

            // Calculate scoring using same logic as other weeks
            const gameIds = Object.keys(picks).filter(key =>
                !['userName', 'submittedAt', 'weekNumber', 'timestamp', 'mondayNightPoints',
                  'mnfTotalPoints', 'tiebreaker', 'totalPoints', 'userId', 'lastUpdated',
                  'poolId', 'survivorPick', 'createdAt', 'week', 'games'].includes(key)
            );

            let totalPoints = 0;
            let correctPicks = 0;
            let totalPicks = 0;

            // Process each pick
            for (const gameId of gameIds) {
                const pick = picks[gameId];
                if (!pick || !pick.confidence) continue;

                const pickedTeam = pick.team || pick.winner;
                if (!pickedTeam) continue;

                const game = bibleData[gameId];
                if (!game || !game.winner || game.winner === 'TBD') continue;

                totalPicks++;
                if (game.winner === pickedTeam) {
                    correctPicks++;
                    totalPoints += pick.confidence;
                }
            }

            // Update user's scoring document
            const scoringPath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${memberId}`;
            await db.doc(scoringPath).update({
                [`weeklyPoints.4`]: {
                    totalPoints: totalPoints,
                    gamesWon: correctPicks,
                    gamesPlayed: totalPicks,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }
            });

            console.log(`✅ ${memberId.slice(-6)}: ${totalPoints} pts (${correctPicks}/${totalPicks})`);
            processedCount++;

        } catch (error) {
            console.error(`❌ Error processing ${memberId.slice(-6)}:`, error.message);
        }
    }

    console.log(`🎉 Week 4 scoring complete: ${processedCount} users processed, ${foundPicksCount} had picks`);
}

processAllUsersWeek4().catch(console.error);