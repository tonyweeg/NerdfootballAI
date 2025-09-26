// 🔍 DEBUG: Pick Matching Analysis
// Test why scoring system shows 0 points despite having picks

async function debugPickMatching() {
    console.log('🔍 DEBUGGING Pick Matching for Week 1...');

    // Step 1: Test user pick fetching with new path
    console.log('\n📋 STEP 1: Test picking data retrieval');
    const testUserId = '0XGe3s1uLlhKXnhmlkyEGBJ72S22'; // Tony Weeg
    try {
        const picksCollectionPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/1/submissions`;
        const picksDocRef = window.doc(window.db, picksCollectionPath, testUserId);
        const picksSnap = await window.getDoc(picksDocRef);

        if (picksSnap.exists()) {
            const picks = picksSnap.data();
            console.log('✅ Found picks for Tony Weeg:', picks);
            console.log('📊 Pick count:', Object.keys(picks).length);

            // Show first few picks
            const firstPicks = Object.entries(picks).slice(0, 3);
            console.log('🎯 Sample picks:');
            firstPicks.forEach(([gameId, pick]) => {
                console.log(`   Game ${gameId}: ${pick.team} (confidence: ${pick.confidence})`);
            });
        } else {
            console.log('❌ No picks found for Tony Weeg');
            return;
        }
    } catch (error) {
        console.log('❌ Error fetching picks:', error);
        return;
    }

    // Step 2: Test game results fetching
    console.log('\n📋 STEP 2: Test game results retrieval');
    try {
        const gameResultsPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/1';
        const gameResultsRef = window.doc(window.db, gameResultsPath);
        const gameResultsSnap = await window.getDoc(gameResultsRef);

        if (gameResultsSnap.exists()) {
            const gameResults = gameResultsSnap.data();
            console.log('✅ Found game results:', Object.keys(gameResults).length, 'games');

            // Show first few game results
            const firstGames = Object.entries(gameResults).slice(0, 3);
            console.log('🏈 Sample game results:');
            firstGames.forEach(([gameId, result]) => {
                console.log(`   Game ${gameId}: ${result.awayTeam} @ ${result.homeTeam} = ${result.winner} (${result.status})`);
            });
        } else {
            console.log('❌ No game results found');
            return;
        }
    } catch (error) {
        console.log('❌ Error fetching game results:', error);
        return;
    }

    // Step 3: Test manual pick matching logic
    console.log('\n📋 STEP 3: Manual pick vs game result matching');
    try {
        // Get Tony's picks again
        const picksCollectionPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/1/submissions`;
        const picksDocRef = window.doc(window.db, picksCollectionPath, testUserId);
        const picksSnap = await window.getDoc(picksDocRef);
        const userPicks = picksSnap.data();

        // Get game results
        const gameResultsPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/1';
        const gameResultsRef = window.doc(window.db, gameResultsPath);
        const gameResultsSnap = await window.getDoc(gameResultsRef);
        const gameResults = gameResultsSnap.data();

        let correctPicks = 0;
        let totalPoints = 0;
        let totalPicks = 0;

        console.log('🔍 Checking each pick:');
        for (const [gameId, pick] of Object.entries(userPicks)) {
            const gameResult = gameResults[gameId];

            if (gameResult && gameResult.status === 'FINAL') {
                totalPicks++;
                const isCorrect = pick.team === gameResult.winner;

                console.log(`   Game ${gameId}:`);
                console.log(`     Picked: ${pick.team} (confidence: ${pick.confidence})`);
                console.log(`     Winner: ${gameResult.winner}`);
                console.log(`     Correct: ${isCorrect ? '✅' : '❌'}`);

                if (isCorrect) {
                    correctPicks++;
                    totalPoints += pick.confidence;
                }
            } else {
                console.log(`   Game ${gameId}: Not final or not found`);
            }
        }

        const accuracy = totalPicks > 0 ? (correctPicks / totalPicks * 100) : 0;
        console.log(`\n🏆 MANUAL CALCULATION RESULTS:`);
        console.log(`   Total picks: ${totalPicks}`);
        console.log(`   Correct picks: ${correctPicks}`);
        console.log(`   Total points: ${totalPoints}`);
        console.log(`   Accuracy: ${accuracy.toFixed(1)}%`);

    } catch (error) {
        console.log('❌ Error in manual calculation:', error);
    }

    // Step 4: Test ScoringCalculator function directly
    console.log('\n📋 STEP 4: Test ScoringCalculator.calculateWeeklyPoints directly');
    try {
        if (window.ScoringCalculator && window.ScoringCalculator.calculateWeeklyPoints) {
            const result = await window.ScoringCalculator.calculateWeeklyPoints(testUserId, 1);
            console.log('✅ ScoringCalculator result:', result);
        } else {
            console.log('❌ ScoringCalculator not available');
        }
    } catch (error) {
        console.log('❌ Error calling ScoringCalculator:', error);
    }

    console.log('\n🎯 DEBUG COMPLETE - Check results above for discrepancies');
}

// Run the debug
debugPickMatching();