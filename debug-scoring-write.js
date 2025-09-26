const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function debugScoringWrite() {
    try {
        console.log('🔍 Debugging Tony\'s Week 4 scoring write...');

        const userId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Tony
        const weekNumber = 4;

        // Step 1: Get user picks
        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${userId}`;
        console.log(`📂 Picks Path: ${picksPath}`);

        const picksRef = db.doc(picksPath);
        const picksSnap = await picksRef.get();

        if (!picksSnap.exists) {
            console.log('❌ No picks found');
            return;
        }

        const picks = picksSnap.data();
        console.log(`✅ Found picks: ${Object.keys(picks).length} entries`);

        // Step 2: Get games data
        const gamesPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`;
        console.log(`📂 Games Path: ${gamesPath}`);

        const gamesRef = db.doc(gamesPath);
        const gamesSnap = await gamesRef.get();

        if (!gamesSnap.exists) {
            console.log('❌ No games found');
            return;
        }

        const games = gamesSnap.data();
        console.log(`✅ Found games: ${Object.keys(games).length} entries`);

        // Step 3: Manual calculation with detailed logging
        let totalPoints = 0;
        let correctPicks = 0;
        let totalPicks = 0;

        console.log('\n🎯 Processing picks with detailed logging:');

        Object.entries(picks).forEach(([gameId, pick]) => {
            // Skip metadata fields
            if (!pick || typeof pick !== 'object' || !pick.confidence) {
                console.log(`   Skip ${gameId}: not a valid pick`);
                return;
            }

            // Handle both 'team' and 'winner' field formats
            const pickedTeam = pick.team || pick.winner;
            if (!pickedTeam) {
                console.log(`   Skip Game ${gameId}: no team picked`);
                return;
            }

            totalPicks++;
            const confidence = parseInt(pick.confidence) || 1;
            const game = games[gameId];

            if (!game) {
                console.log(`   Game ${gameId}: No game data found`);
                return;
            }

            console.log(`   Game ${gameId}: Picked ${pickedTeam} (${confidence}) vs Status: ${game.status || 'no status'}`);

            // Check if game is final and has a winner
            if (game && game.status && game.status.toUpperCase().includes('FINAL') && game.winner) {
                if (pickedTeam === game.winner) {
                    correctPicks++;
                    totalPoints += confidence;
                    console.log(`     ✅ CORRECT! Winner: ${game.winner} (+${confidence} pts)`);
                } else {
                    console.log(`     ❌ WRONG! Winner: ${game.winner} (0 pts)`);
                }
            } else {
                console.log(`     ⏳ Not scorable - Status: ${game.status}, Winner: ${game.winner || 'none'}`);
            }
        });

        const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 100) / 100 : 0;

        console.log('\n📊 Calculated Results:');
        console.log(`   Total Picks: ${totalPicks}`);
        console.log(`   Correct Picks: ${correctPicks}`);
        console.log(`   Total Points: ${totalPoints}`);
        console.log(`   Accuracy: ${accuracy}%`);

        // Step 4: Test the database write
        const scoringPath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
        console.log(`\n📂 Scoring Path: ${scoringPath}`);

        const scoringRef = db.doc(scoringPath);

        const weeklyData = {
            totalPoints: totalPoints,
            gamesWon: correctPicks,
            gamesPlayed: totalPicks,
            lastUpdated: new Date().toISOString(),
            recalculationApplied: true
        };

        console.log('\n💾 Writing to database...');
        console.log('Week 4 data:', JSON.stringify(weeklyData, null, 2));

        // First get current data
        const currentSnap = await scoringRef.get();
        const currentData = currentSnap.exists ? currentSnap.data() : {};

        // Update weeklyPoints object
        const updatedWeeklyPoints = currentData.weeklyPoints || {};
        updatedWeeklyPoints['4'] = weeklyData;

        // Test write with complete object
        await scoringRef.set({
            weeklyPoints: updatedWeeklyPoints,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        console.log('✅ Database write completed');

        // Step 5: Verify the write
        console.log('\n🔍 Verifying write...');
        const verifySnap = await scoringRef.get();

        if (verifySnap.exists) {
            const verifyData = verifySnap.data();
            const week4Verify = verifyData.weeklyPoints && verifyData.weeklyPoints['4'];

            if (week4Verify) {
                console.log('✅ Week 4 data found after write!');
                console.log('Verified data:', JSON.stringify(week4Verify, null, 2));
            } else {
                console.log('❌ Week 4 data still missing after write');
                console.log('Current weeklyPoints:', JSON.stringify(verifyData.weeklyPoints, null, 2));
            }
        } else {
            console.log('❌ Scoring document not found');
        }

    } catch (error) {
        console.error('❌ Error debugging scoring write:', error);
    }
}

debugScoringWrite();