// Test to check survivor elimination bug for user BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2
const puppeteer = require('puppeteer');

const userId = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';

async function testSurvivorElimination() {
    console.log('🔍 Testing survivor elimination for user:', userId);
    
    const browser = await puppeteer.launch({ headless: false, devtools: true });
    const page = await browser.newPage();
    
    try {
        // Navigate to production survivor page
        await page.goto('https://nerdfootball.web.app/index.html?view=survivor');
        
        // Wait for Firebase to initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Inject our debug function
        await page.addScriptTag({
            path: './debug-survivor-elimination.js'
        });
        
        // Execute the debug function and get results
        const results = await page.evaluate(async () => {
            const userId = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';
            
            try {
                // Check if Firebase is available
                if (typeof db === 'undefined') {
                    return { error: 'Firebase not initialized' };
                }
                
                console.log('🔍 Checking survivor data for user:', userId);
                
                // Get survivor picks
                const picksDocRef = doc(db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`);
                const picksDoc = await getDoc(picksDocRef);
                const picks = picksDoc.exists() ? picksDoc.data() : {};
                
                console.log('📋 User picks:', picks);
                
                // Get survivor status
                const statusDocRef = doc(db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
                const statusDoc = await getDoc(statusDocRef);
                const allStatuses = statusDoc.exists() ? statusDoc.data() : {};
                const userStatus = allStatuses[userId];
                
                console.log('📊 User status:', userStatus);
                
                // Check each week's results against user picks
                const userPicks = picks.picks || {};
                let eliminationFound = false;
                const weekResults = [];
                
                for (let week = 1; week <= 18; week++) {
                    try {
                        const resultsDocRef = doc(db, `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`);
                        const resultsDoc = await getDoc(resultsDocRef);
                        
                        if (resultsDoc.exists() && userPicks[week]) {
                            const results = resultsDoc.data();
                            const userPick = userPicks[week];
                            const gameResult = results[userPick.gameId];
                            
                            if (gameResult) {
                                const isWinner = gameResult.winner === userPick.team;
                                const gameStatus = gameResult.status || 'TBD';
                                
                                const weekResult = {
                                    week,
                                    userTeam: userPick.team,
                                    gameId: userPick.gameId,
                                    winner: gameResult.winner,
                                    status: gameStatus,
                                    result: isWinner ? 'WIN' : 'LOSS'
                                };
                                
                                weekResults.push(weekResult);
                                console.log(`Week ${week}: ${weekResult.result} - Picked ${userPick.team}, Winner: ${gameResult.winner}`);
                                
                                if (!isWinner && gameResult.winner !== 'TBD' && gameStatus === 'FINAL') {
                                    console.log(`❌ ELIMINATION FOUND - Week ${week}: Should be eliminated!`);
                                    eliminationFound = true;
                                }
                            }
                        }
                    } catch (e) {
                        console.log(`Week ${week}: No data or error:`, e.message);
                    }
                }
                
                return {
                    userId,
                    picks: picks,
                    status: userStatus,
                    weekResults: weekResults,
                    eliminationFound,
                    currentEliminated: userStatus?.eliminated || false
                };
                
            } catch (error) {
                console.error('Error debugging survivor elimination:', error);
                return { error: error.message };
            }
        });
        
        console.log('\n🏁 RESULTS:');
        console.log('==========================================');
        
        if (results.error) {
            console.log('❌ Error:', results.error);
        } else {
            console.log('👤 User ID:', results.userId);
            console.log('📋 Total picks:', Object.keys(results.picks?.picks || {}).length);
            console.log('📊 Current elimination status:', results.currentEliminated);
            console.log('🎯 Should be eliminated:', results.eliminationFound);
            
            if (results.weekResults.length > 0) {
                console.log('\n📅 Weekly Results:');
                results.weekResults.forEach(result => {
                    const icon = result.result === 'WIN' ? '✅' : '❌';
                    console.log(`   Week ${result.week}: ${icon} ${result.result} - Picked ${result.userTeam}, Winner: ${result.winner} (${result.status})`);
                });
            }
            
            if (results.eliminationFound && !results.currentEliminated) {
                console.log('\n🚨 BUG CONFIRMED: User should be eliminated but is marked as active!');
            } else if (!results.eliminationFound && results.currentEliminated) {
                console.log('\n⚠️ User is eliminated but no losing picks found - may be manual elimination');  
            } else if (results.eliminationFound && results.currentEliminated) {
                console.log('\n✅ Elimination status is correct');
            } else {
                console.log('\n✅ User should be active and is marked as active');
            }
        }
        
        // Keep browser open for manual inspection
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
testSurvivorElimination();