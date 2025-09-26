// Debug script to check survivor elimination logic for user BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2
console.log('🔍 Debugging survivor elimination logic...');

// This will run in the browser console with access to Firebase
const userId = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';

async function debugSurvivorElimination() {
    console.log(`🔍 Checking survivor data for user: ${userId}`);
    
    try {
        // Get survivor picks
        const picksDoc = await getDoc(doc(db, 'artifacts/nerdfootball/public/data/nerdfootball_survivor_picks'));
        const picks = picksDoc.exists() ? picksDoc.data() : {};
        
        console.log('📋 User picks:', JSON.stringify(picks[userId], null, 2));
        
        // Get survivor status
        const statusDoc = await getDoc(doc(db, 'artifacts/nerdfootball/public/data/nerdfootball_survivor_status'));
        const status = statusDoc.exists() ? statusDoc.data() : {};
        
        console.log('📊 User status:', JSON.stringify(status[userId], null, 2));
        
        // Check each week's results against user picks
        const userPicks = picks[userId] || {};
        let eliminationFound = false;
        
        for (let week = 1; week <= 18; week++) {
            try {
                const resultsDoc = await getDoc(doc(db, `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`));
                if (resultsDoc.exists() && userPicks[week]) {
                    const results = resultsDoc.data();
                    const userPick = userPicks[week];
                    const gameResult = results[userPick.gameId];
                    
                    if (gameResult) {
                        const isWinner = gameResult.winner === userPick.team;
                        const gameStatus = gameResult.status || 'TBD';
                        
                        console.log(`Week ${week}: Picked ${userPick.team} in game ${userPick.gameId}`);
                        console.log(`  Game result: ${gameResult.winner} (Status: ${gameStatus})`);
                        console.log(`  User result: ${isWinner ? '✅ WIN' : '❌ LOSS'}`);
                        
                        if (!isWinner && gameResult.winner !== 'TBD' && gameStatus === 'FINAL') {
                            console.log(`❌ ELIMINATION FOUND - Week ${week}: Should be eliminated!`);
                            console.log(`  Pick: ${userPick.team}`);
                            console.log(`  Winner: ${gameResult.winner}`);
                            console.log(`  Game: ${userPick.gameId}`);
                            eliminationFound = true;
                        }
                    }
                }
            } catch (e) {
                console.log(`Week ${week}: No data or error:`, e.message);
            }
        }
        
        if (eliminationFound) {
            console.log('🚨 ELIMINATION BUG CONFIRMED: User should be eliminated but status shows:', status[userId]);
        } else {
            console.log('✅ No eliminations found - user should still be active');
        }
        
        // Check if elimination logic is working in the survivor page
        const currentEliminated = status[userId]?.eliminated || false;
        console.log(`Current elimination status in database: ${currentEliminated}`);
        
        return {
            userId,
            picks: userPicks,
            status: status[userId],
            eliminationFound,
            currentEliminated
        };
        
    } catch (error) {
        console.error('Error debugging survivor elimination:', error);
    }
}

// Export for browser console use
if (typeof window !== 'undefined') {
    window.debugSurvivorElimination = debugSurvivorElimination;
    console.log('🔧 Debug function available: debugSurvivorElimination()');
    
    // Auto-run if we have Firebase access
    if (typeof db !== 'undefined') {
        debugSurvivorElimination();
    } else {
        console.log('⚠️ Firebase not available. Run this in browser console on survivor page.');
    }
}