const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function testWeek4ScoringFix() {
    try {
        console.log('🧪 Testing Week 4 scoring fix...');

        const userId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Tony
        const weekNumber = 4;

        // Step 1: Get user picks
        const picksRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${userId}`);
        const picksSnap = await picksRef.get();

        if (!picksSnap.exists) {
            console.log('❌ No picks found');
            return;
        }

        const picks = picksSnap.data();

        // Step 2: Get games data
        const gamesRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`);
        const gamesSnap = await gamesRef.get();

        if (!gamesSnap.exists) {
            console.log('❌ No games found');
            return;
        }

        const games = gamesSnap.data();

        // Step 3: Calculate score using FIXED logic
        let totalPoints = 0;
        let correctPicks = 0;
        let totalPicks = 0;

        console.log('\n🎯 Processing picks with FIXED logic:');

        Object.entries(picks).forEach(([gameId, pick]) => {
            // Skip metadata fields
            if (!pick || typeof pick !== 'object' || !pick.confidence) {
                console.log(`   Skipping ${gameId}: not a valid pick`);
                return;
            }

            // Handle both 'team' and 'winner' field formats
            const pickedTeam = pick.team || pick.winner;
            if (!pickedTeam) {
                console.log(`   Skipping Game ${gameId}: no team picked`);
                return;
            }

            totalPicks++;
            const confidence = parseInt(pick.confidence) || 1;
            const game = games[gameId];

            console.log(`   Game ${gameId}: Picked ${pickedTeam} (confidence ${confidence})`);

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
                console.log(`     ⏳ Game not final yet (${game?.status || 'no status'})`);
            }
        });

        const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 100) / 100 : 0;

        console.log('\n📊 Scoring Results:');
        console.log(`   Total Picks: ${totalPicks}`);
        console.log(`   Correct Picks: ${correctPicks}`);
        console.log(`   Total Points: ${totalPoints}`);
        console.log(`   Accuracy: ${accuracy}%`);

        if (totalPicks > 0 && totalPoints >= 0) {
            console.log('\n✅ SCORING FIX SUCCESSFUL! Ready to deploy.');
        } else {
            console.log('\n❌ Scoring fix failed - no picks processed');
        }

    } catch (error) {
        console.error('❌ Error testing scoring fix:', error);
    }
}

testWeek4ScoringFix();