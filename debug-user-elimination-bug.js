// EMERGENCY DEBUG: User aaG5Wc2JZkZJD1r7ozfJG04QRrf1 incorrectly eliminated
// This script will examine all their picks and game results to find the bug

console.log('🚨 EMERGENCY SURVIVOR DEBUG - Incorrect Elimination Investigation');

const targetUserId = 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1';

async function investigateUserElimination() {
    try {
        console.log(`🔍 INVESTIGATING USER: ${targetUserId}`);

        // Get current user status
        const statusDoc = await getDoc(doc(db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status'));
        const allStatuses = statusDoc.exists() ? statusDoc.data() : {};
        const userStatus = allStatuses[targetUserId];

        console.log('📊 CURRENT STATUS:', JSON.stringify(userStatus, null, 2));

        // Get user's picks
        const picksDoc = await getDoc(doc(db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${targetUserId}`));
        const userPicksData = picksDoc.exists() ? picksDoc.data() : {};
        const userPicks = userPicksData.picks || {};

        console.log('📋 USER PICKS:', JSON.stringify(userPicks, null, 2));

        // Get pool member info
        const poolDoc = await getDoc(doc(db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members'));
        const poolMembers = poolDoc.exists() ? poolDoc.data() : {};
        const userInfo = poolMembers[targetUserId];

        console.log('👤 USER INFO:', userInfo);

        // Analyze each week they made picks
        const analysis = {
            totalPicks: Object.keys(userPicks).length,
            weekAnalysis: {},
            shouldBeEliminated: false,
            eliminationWeek: null,
            eliminationReason: null
        };

        console.log('\n🔍 WEEK-BY-WEEK ANALYSIS:');
        console.log('='.repeat(50));

        for (const [week, pick] of Object.entries(userPicks)) {
            const weekNum = parseInt(week);
            console.log(`\n📅 WEEK ${weekNum}:`);
            console.log(`  Pick: ${pick.team} (Game ID: ${pick.gameId})`);

            try {
                // Get ESPN week results
                let weekResults = {};

                // Try ESPN first
                if (window.espnNerdApi) {
                    await window.espnNerdApi.ensureReady();
                    const espnData = await window.espnNerdApi.getWeekGames(weekNum);

                    if (espnData && espnData.games) {
                        console.log(`  ESPN returned ${espnData.games.length} games for Week ${weekNum}`);

                        // Process ESPN games
                        espnData.games.forEach(game => {
                            const gameResult = {
                                id: game.id,
                                homeTeam: game.home_team,
                                awayTeam: game.away_team,
                                homeScore: game.home_score || 0,
                                awayScore: game.away_score || 0,
                                status: game.status,
                                winner: determineWinner(game),
                                espnId: game.id
                            };
                            weekResults[game.id] = gameResult;
                        });
                    }
                }

                // Also try legacy path
                const legacyDoc = await getDoc(doc(db, `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNum}`));
                if (legacyDoc.exists()) {
                    const legacyResults = legacyDoc.data();
                    console.log(`  Legacy results: ${Object.keys(legacyResults).length} games`);
                    // Merge legacy results
                    Object.assign(weekResults, legacyResults);
                }

                console.log(`  Total results available: ${Object.keys(weekResults).length} games`);

                // Find the result for this user's pick
                let gameResult = weekResults[pick.gameId];

                if (!gameResult) {
                    // Try to find by team names
                    console.log(`  ⚠️ No direct game result for ID ${pick.gameId}, searching by team...`);

                    // Load schedule to map internal game IDs
                    const scheduleResponse = await fetch('/nfl_2025_schedule_raw.json');
                    const scheduleData = await scheduleResponse.json();
                    const weekGames = scheduleData.weeks.find(w => w.week === weekNum)?.games || [];
                    const internalGame = weekGames.find(g => g.id == pick.gameId);

                    if (internalGame) {
                        console.log(`  Internal game: ${internalGame.a} @ ${internalGame.h}`);

                        // Find ESPN game by teams
                        gameResult = Object.values(weekResults).find(result => {
                            if (!result.homeTeam || !result.awayTeam) return false;

                            const homeMatch = normalizeTeam(result.homeTeam) === normalizeTeam(internalGame.h);
                            const awayMatch = normalizeTeam(result.awayTeam) === normalizeTeam(internalGame.a);

                            return homeMatch && awayMatch;
                        });

                        if (gameResult) {
                            console.log(`  Found by team match: ${gameResult.awayTeam} @ ${gameResult.homeTeam}`);
                        }
                    }
                }

                if (gameResult) {
                    console.log(`  Game: ${gameResult.awayTeam} @ ${gameResult.homeTeam}`);
                    console.log(`  Score: ${gameResult.awayScore} - ${gameResult.homeScore}`);
                    console.log(`  Status: ${gameResult.status}`);
                    console.log(`  Winner: ${gameResult.winner || 'TBD'}`);

                    // Normalize teams for comparison
                    const normalizedPick = normalizeTeam(pick.team);
                    const normalizedWinner = normalizeTeam(gameResult.winner);

                    console.log(`  Normalized pick: "${normalizedPick}"`);
                    console.log(`  Normalized winner: "${normalizedWinner}"`);

                    // Check if game is final
                    const isFinal = gameResult.status === 'Final' || gameResult.status === 'FINAL' || gameResult.status === 'F';

                    if (isFinal && gameResult.winner && gameResult.winner !== 'TBD') {
                        const userWon = normalizedPick === normalizedWinner;
                        console.log(`  RESULT: ${userWon ? '✅ USER WON' : '❌ USER LOST'}`);

                        analysis.weekAnalysis[weekNum] = {
                            pick: pick.team,
                            gameId: pick.gameId,
                            actualWinner: gameResult.winner,
                            userWon,
                            gameStatus: gameResult.status,
                            gameScore: `${gameResult.awayScore} - ${gameResult.homeScore}`
                        };

                        if (!userWon && !analysis.shouldBeEliminated) {
                            analysis.shouldBeEliminated = true;
                            analysis.eliminationWeek = weekNum;
                            analysis.eliminationReason = `${pick.team} lost to ${gameResult.winner}`;
                            console.log(`🚨 ELIMINATION POINT FOUND: Week ${weekNum} - ${analysis.eliminationReason}`);
                        }
                    } else {
                        console.log(`  ⏳ Game not final or no winner determined`);
                        analysis.weekAnalysis[weekNum] = {
                            pick: pick.team,
                            gameId: pick.gameId,
                            gameStatus: gameResult.status,
                            pending: true
                        };
                    }
                } else {
                    console.log(`  ❌ No game result found for pick`);
                    analysis.weekAnalysis[weekNum] = {
                        pick: pick.team,
                        gameId: pick.gameId,
                        error: 'No game result found'
                    };
                }

            } catch (error) {
                console.error(`  ❌ Error analyzing Week ${weekNum}:`, error);
                analysis.weekAnalysis[weekNum] = {
                    pick: pick.team,
                    gameId: pick.gameId,
                    error: error.message
                };
            }
        }

        console.log('\n📊 FINAL ANALYSIS:');
        console.log('='.repeat(50));
        console.log(`Total picks made: ${analysis.totalPicks}`);
        console.log(`Should be eliminated: ${analysis.shouldBeEliminated}`);
        if (analysis.shouldBeEliminated) {
            console.log(`Elimination week: ${analysis.eliminationWeek}`);
            console.log(`Elimination reason: ${analysis.eliminationReason}`);
        }

        console.log(`Current database status: ${userStatus?.eliminated ? 'ELIMINATED' : 'ACTIVE'}`);

        if (userStatus?.eliminated && !analysis.shouldBeEliminated) {
            console.log('🚨 BUG FOUND: User is marked eliminated but should be active!');
        } else if (!userStatus?.eliminated && analysis.shouldBeEliminated) {
            console.log('🚨 BUG FOUND: User should be eliminated but is marked active!');
        } else {
            console.log('✅ Database status matches analysis');
        }

        return analysis;

    } catch (error) {
        console.error('❌ Error in investigation:', error);
        throw error;
    }
}

// Helper functions
function determineWinner(game) {
    if (!game.status || game.status === 'Not Started' || game.status.includes('Q') || game.status.includes('Half') || game.status.includes('Scheduled')) {
        return 'TBD';
    }

    if (game.status === 'Final' || game.status === 'FINAL' || game.status === 'F') {
        const homeScore = parseInt(game.home_score) || 0;
        const awayScore = parseInt(game.away_score) || 0;

        if (homeScore > awayScore) {
            return game.home_team;
        } else if (awayScore > homeScore) {
            return game.away_team;
        } else {
            return 'TIE';
        }
    }

    return 'TBD';
}

function normalizeTeam(teamName) {
    if (!teamName) return null;

    const teamMappings = {
        'LA Rams': 'Los Angeles Rams',
        'LA Chargers': 'Los Angeles Chargers',
        'LV Raiders': 'Las Vegas Raiders',
        'Vegas Raiders': 'Las Vegas Raiders',
        'NY Giants': 'New York Giants',
        'NY Jets': 'New York Jets',
        'TB Buccaneers': 'Tampa Bay Buccaneers',
        'NE Patriots': 'New England Patriots',
        'GB Packers': 'Green Bay Packers',
        'NO Saints': 'New Orleans Saints',
        'KC Chiefs': 'Kansas City Chiefs',
        'SF 49ers': 'San Francisco 49ers'
    };

    return teamMappings[teamName] || teamName;
}

// Make available globally for browser console
if (typeof window !== 'undefined') {
    window.investigateUserElimination = investigateUserElimination;
    console.log('🔧 Investigation function ready: investigateUserElimination()');

    // Auto-run if Firebase is available
    if (typeof db !== 'undefined') {
        console.log('🚀 Auto-running investigation...');
        investigateUserElimination().then(result => {
            console.log('🎯 Investigation complete. Run investigateUserElimination() again if needed.');
        }).catch(error => {
            console.error('❌ Investigation failed:', error);
        });
    } else {
        console.log('⚠️ Firebase not available. Run this script in browser console on survivor page.');
    }
}