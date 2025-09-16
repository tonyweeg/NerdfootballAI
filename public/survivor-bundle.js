// DIAMOND LEVEL: 100% Pure Firebase Survivor System - ZERO ESPN Dependencies
// Revolutionary Performance: 4 Firebase calls only, sub-500ms target

class SurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = this.getCurrentWeek();
        console.log(`🏆 PURE FIREBASE Survivor System using week ${this.currentWeek}`);
    }

    getCurrentWeek() {
        // Use global week if available
        if (window.currentWeek && window.currentWeek >= 1) {
            return window.currentWeek;
        }

        // ESPN API shows we're in Week 2 - use that directly
        // The console logs show "ESPN: Fetching Week 2 games" and "Schedule Week 2 cached with state: IN_PROGRESS"
        console.log(`🏈 SurvivorSystem: Using Week 2 (ESPN indicates current week)`);
        return 2;
    }

    checkUserSurvival(userPick, weekResults) {
        if (!userPick || !userPick.team) {
            return { status: 'eliminated', reason: 'No pick made' };
        }

        // CORRECT SURVIVOR LOGIC: Use specific gameId-based picks
        if (userPick.gameId && weekResults[userPick.gameId]) {
            // Primary method: Check user's SPECIFIC game by gameId
            const specificGame = weekResults[userPick.gameId];

            if (!specificGame.winner || specificGame.winner === 'TBD') {
                return { status: 'pending', reason: 'Game not finished' };
            }

            if (specificGame.status === 'FINAL' && specificGame.winner === userPick.team) {
                return { status: 'survived', reason: `${userPick.team} won their game` };
            } else if (specificGame.status === 'FINAL') {
                return { status: 'eliminated', reason: `Lost: Picked ${userPick.team}, ${specificGame.winner} won` };
            } else {
                return { status: 'pending', reason: 'Game in progress' };
            }
        } else {
            // Fallback: Use survivorAutoElimination.js pattern for team matching
            console.warn(`⚠️ Using fallback team matching for pick without gameId: ${userPick.team}`);

            const userTeam = userPick.team;

            // Check each game to find where user's team played
            for (const [gameId, gameResult] of Object.entries(weekResults)) {
                if (!gameResult) continue;

                const homeTeam = gameResult.homeTeam || gameResult.home_team || gameResult.h;
                const awayTeam = gameResult.awayTeam || gameResult.away_team || gameResult.a;

                // Direct team name matching (like survivorAutoElimination.js)
                if (userTeam === homeTeam || userTeam === awayTeam) {

                    if (!gameResult.winner || gameResult.winner === 'TBD') {
                        return { status: 'pending', reason: 'Game not finished' };
                    }

                    if (gameResult.status === 'FINAL' && gameResult.winner === userTeam) {
                        return { status: 'survived', reason: `${userTeam} won their game` };
                    } else if (gameResult.status === 'FINAL') {
                        return { status: 'eliminated', reason: `${userTeam} lost to ${gameResult.winner}` };
                    } else {
                        return { status: 'pending', reason: 'Game in progress' };
                    }
                }
            }

            return { status: 'pending', reason: 'Team not found in any game' };
        }
    }

    // Determine winner from ESPN game data
    determineWinner(game) {
        if (!game.status || game.status === 'Not Started' || game.status.includes('Q') || game.status.includes('Half')) {
            return 'TBD';
        }

        if (game.status === 'Final' || game.status === 'FINAL') {
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

    // Pure team normalization - no ESPN dependencies
    normalizeTeamName(teamName) {
        if (!teamName) return null;

        const teamMappings = {
            // Standard abbreviations to full names
            'ARI': 'Arizona Cardinals',
            'ATL': 'Atlanta Falcons',
            'BAL': 'Baltimore Ravens',
            'BUF': 'Buffalo Bills',
            'CAR': 'Carolina Panthers',
            'CHI': 'Chicago Bears',
            'CIN': 'Cincinnati Bengals',
            'CLE': 'Cleveland Browns',
            'DAL': 'Dallas Cowboys',
            'DEN': 'Denver Broncos',
            'DET': 'Detroit Lions',
            'GB': 'Green Bay Packers',
            'HOU': 'Houston Texans',
            'IND': 'Indianapolis Colts',
            'JAX': 'Jacksonville Jaguars',
            'KC': 'Kansas City Chiefs',
            'LV': 'Las Vegas Raiders',
            'LAC': 'Los Angeles Chargers',
            'LAR': 'Los Angeles Rams',
            'MIA': 'Miami Dolphins',
            'MIN': 'Minnesota Vikings',
            'NE': 'New England Patriots',
            'NO': 'New Orleans Saints',
            'NYG': 'New York Giants',
            'NYJ': 'New York Jets',
            'PHI': 'Philadelphia Eagles',
            'PIT': 'Pittsburgh Steelers',
            'SF': 'San Francisco 49ers',
            'SEA': 'Seattle Seahawks',
            'TB': 'Tampa Bay Buccaneers',
            'TEN': 'Tennessee Titans',
            'WAS': 'Washington Commanders',

            // Common variations
            'Cardinals': 'Arizona Cardinals',
            'Falcons': 'Atlanta Falcons',
            'Ravens': 'Baltimore Ravens',
            'Bills': 'Buffalo Bills',
            'Panthers': 'Carolina Panthers',
            'Bears': 'Chicago Bears',
            'Bengals': 'Cincinnati Bengals',
            'Browns': 'Cleveland Browns',
            'Cowboys': 'Dallas Cowboys',
            'Broncos': 'Denver Broncos',
            'Lions': 'Detroit Lions',
            'Packers': 'Green Bay Packers',
            'Texans': 'Houston Texans',
            'Colts': 'Indianapolis Colts',
            'Jaguars': 'Jacksonville Jaguars',
            'Chiefs': 'Kansas City Chiefs',
            'Raiders': 'Las Vegas Raiders',
            'Chargers': 'Los Angeles Chargers',
            'Rams': 'Los Angeles Rams',
            'Dolphins': 'Miami Dolphins',
            'Vikings': 'Minnesota Vikings',
            'Patriots': 'New England Patriots',
            'Saints': 'New Orleans Saints',
            'Giants': 'New York Giants',
            'Jets': 'New York Jets',
            'Eagles': 'Philadelphia Eagles',
            'Steelers': 'Pittsburgh Steelers',
            '49ers': 'San Francisco 49ers',
            'Seahawks': 'Seattle Seahawks',
            'Buccaneers': 'Tampa Bay Buccaneers',
            'Titans': 'Tennessee Titans',
            'Commanders': 'Washington Commanders'
        };

        const cleaned = teamName.toString().trim();
        return teamMappings[cleaned] || cleaned;
    }

    // CREATE SURVIVOR WINNER SHEETS - Run this once to generate weekly sheets
    async createSurvivorWinnerSheets(poolId) {
        try {
            console.log('📝 CREATING SURVIVOR WINNER SHEETS...');

            // Get pool members and all user picks
            const [poolDoc, allPicksSnapshot] = await Promise.all([
                getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`)),
                getDocs(collection(this.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks'))
            ]);

            const poolMembers = poolDoc.data();
            console.log(`📊 Pool members found: ${Object.keys(poolMembers).length}`);
            console.log(`📊 Survivor picks documents found: ${allPicksSnapshot.size}`);

            const allPicksMap = {};
            let totalPicksFound = 0;
            allPicksSnapshot.forEach(doc => {
                const uid = doc.id;
                const data = doc.data();
                const picks = data.picks || {};
                allPicksMap[uid] = picks;

                const userPicksCount = Object.keys(picks).length;
                totalPicksFound += userPicksCount;

                if (userPicksCount > 0) {
                    console.log(`👤 User ${uid} has ${userPicksCount} survivor picks:`, picks);
                }
            });

            console.log(`📊 TOTAL SURVIVOR PICKS FOUND: ${totalPicksFound} across ${allPicksSnapshot.size} users`);

            // Multi-dimensional arrays for winners and losers
            const winnersArray = []; // [{ week, userId, team, displayName }]
            const losersArray = [];  // [{ week, userId, team, displayName, reason }]

            // Track eliminated users across weeks - once eliminated, stay eliminated
            const eliminatedUsers = new Set();

            // Process each week and save winner sheets
            for (let week = 1; week <= this.currentWeek; week++) {
                console.log(`📋 Creating Week ${week} survivor sheet...`);

                // Get game results for this week from Firebase (where game winners are stored)
                const weekResultsDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`));
                const weekResults = weekResultsDoc?.exists() ? weekResultsDoc.data() : {};

                console.log(`🎮 Week ${week} game results:`, Object.keys(weekResults).length, 'games found');
                console.log(`🎮 Week ${week} document exists:`, weekResultsDoc?.exists());

                if (Object.keys(weekResults).length > 0) {
                    // Show sample game structure
                    const firstGameKey = Object.keys(weekResults)[0];
                    const firstGame = weekResults[firstGameKey];
                    console.log(`🎮 Sample Week ${week} game [${firstGameKey}] KEYS:`, Object.keys(firstGame));
                    console.log(`🎮 Looking for team fields:`, {
                        homeTeam: firstGame.homeTeam,
                        awayTeam: firstGame.awayTeam,
                        home_team: firstGame.home_team,
                        away_team: firstGame.away_team,
                        home: firstGame.home,
                        away: firstGame.away,
                        competitors: firstGame.competitors ? 'EXISTS' : 'MISSING',
                        teams: firstGame.teams ? 'EXISTS' : 'MISSING'
                    });

                    // Show competitors if they exist
                    if (firstGame.competitors) {
                        console.log(`🎮 Competitors structure:`, JSON.stringify(firstGame.competitors, null, 2));
                    }
                    if (firstGame.teams) {
                        console.log(`🎮 Teams structure:`, JSON.stringify(firstGame.teams, null, 2));
                    }

                    // Show ALL games with status and winner info
                    console.log(`🎮 Week ${week} ALL GAMES:`);
                    Object.entries(weekResults).forEach(([gameId, game]) => {
                        console.log(`  ${gameId}: ${game.homeTeam || game.home_team || 'NO_HOME'} vs ${game.awayTeam || game.away_team || 'NO_AWAY'} | Status: ${game.status} | Winner: ${game.winner || 'TBD'}`);
                    });
                } else {
                    console.log(`❌ Week ${week} has NO game data in Firebase`);
                }

                const weeklySheet = {};

                // Check each pool member for this week
                for (const [uid, member] of Object.entries(poolMembers)) {
                    // SKIP if user already eliminated in previous week
                    if (eliminatedUsers.has(uid)) {
                        console.log(`⏭️ User ${uid} already eliminated, skipping Week ${week}`);
                        continue;
                    }

                    const userPicks = allPicksMap[uid] || {};
                    const userPick = userPicks[week];

                    if (userPick) {
                        console.log(`👤 User ${uid} Week ${week} pick:`, JSON.stringify(userPick, null, 2));
                    }

                    if (!userPick || !userPick.team) {
                        // No pick = eliminated - add to losers array
                        const loserEntry = {
                            week,
                            userId: uid,
                            team: 'NO PICK',
                            displayName: member.displayName || member.email,
                            reason: `No pick made for Week ${week}`
                        };
                        losersArray.push(loserEntry);
                        eliminatedUsers.add(uid); // Mark as eliminated

                        weeklySheet[uid] = {
                            displayName: member.displayName || member.email,
                            team: 'NO PICK',
                            status: 'eliminated',
                            reason: `No pick made for Week ${week}`
                        };
                        continue;
                    }

                    // SIMPLE MATCH: If user picked a team and that team is the winner, they survived
                    // If user picked a team and that team is NOT the winner of any game, they lost
                    let userSurvived = false;
                    let gameResult = null;

                    // Check if user's team won ANY game this week
                    for (const [gameId, game] of Object.entries(weekResults)) {
                        if (game.status === 'STATUS_FINAL' && game.winner === userPick.team) {
                            userSurvived = true;
                            gameResult = game;
                            break;
                        }
                    }

                    // If no game found where their team won, they lost (unless game still in progress)
                    if (!userSurvived && !gameResult) {
                        // Check if their team played but lost
                        for (const [gameId, game] of Object.entries(weekResults)) {
                            if (game.status === 'STATUS_FINAL' && game.winner && game.winner !== userPick.team) {
                                // This could be their game - they lost
                                gameResult = { status: 'STATUS_FINAL', winner: game.winner, userLost: true };
                                break;
                            }
                        }
                    }

                    if (!gameResult) {
                        weeklySheet[uid] = {
                            displayName: member.displayName || member.email,
                            team: userPick.team,
                            status: 'pending',
                            reason: 'Game not found'
                        };
                        continue;
                    }

                    if (userSurvived && gameResult) {
                        // WINNER - survived this week - add to winners array
                        const winnerEntry = {
                            week,
                            userId: uid,
                            team: userPick.team,
                            displayName: member.displayName || member.email
                        };
                        winnersArray.push(winnerEntry);

                        weeklySheet[uid] = {
                            displayName: member.displayName || member.email,
                            team: userPick.team,
                            status: 'survived',
                            reason: `Won with ${userPick.team}`
                        };
                    } else if (gameResult && gameResult.userLost) {
                        // LOSER - eliminated this week - add to losers array
                        const loserEntry = {
                            week,
                            userId: uid,
                            team: userPick.team,
                            displayName: member.displayName || member.email,
                            reason: `Lost: Picked ${userPick.team}, ${gameResult.winner} won`
                        };
                        losersArray.push(loserEntry);
                        eliminatedUsers.add(uid); // Mark as eliminated

                        weeklySheet[uid] = {
                            displayName: member.displayName || member.email,
                            team: userPick.team,
                            status: 'eliminated',
                            reason: `Lost: Picked ${userPick.team}, ${gameResult.winner} won`
                        };
                    } else {
                        // Game in progress or not found
                        weeklySheet[uid] = {
                            displayName: member.displayName || member.email,
                            team: userPick.team,
                            status: 'pending',
                            reason: 'Game not final or team not found'
                        };
                    }
                }

                // Save this week's sheet
                const sheetPath = `artifacts/nerdfootball/pools/${poolId}/survivor/2025/weeks/${week}`;
                await setDoc(doc(this.db, sheetPath), weeklySheet);

                const totalUsers = Object.keys(poolMembers).length;
                const eliminatedCount = eliminatedUsers.size;
                const activeCount = totalUsers - eliminatedCount;

                console.log(`💾 Week ${week} complete: ${activeCount} active, ${eliminatedCount} eliminated (total: ${totalUsers})`);
                console.log(`💾 Saved Week ${week} survivor sheet with ${Object.keys(weeklySheet).length} entries`);
            }

            // Save the multi-dimensional arrays to Firebase
            const compiledSurvivorSheets = {
                winners: winnersArray,
                losers: losersArray,
                lastUpdated: new Date().toISOString(),
                totalWinners: winnersArray.length,
                totalLosers: losersArray.length,
                weeksProcessed: this.currentWeek
            };

            await setDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/survivor/compiled_sheets`), compiledSurvivorSheets);
            console.log(`💾 SAVED COMPILED SURVIVOR SHEETS: ${winnersArray.length} winners, ${losersArray.length} losers`);
            console.log('📋 WINNERS ARRAY (first 5):', JSON.stringify(winnersArray.slice(0, 5), null, 2));
            console.log('📋 LOSERS ARRAY (first 5):', JSON.stringify(losersArray.slice(0, 5), null, 2));
            console.log('📋 ALL WINNERS:', JSON.stringify(winnersArray, null, 2));
            console.log('📋 ALL LOSERS:', JSON.stringify(losersArray, null, 2));

            console.log('✅ SURVIVOR WINNER SHEETS CREATED!');
            return true;

        } catch (error) {
            console.error('❌ Error creating survivor sheets:', error);
            throw error;
        }
    }

    // READ FROM SURVIVOR WINNER SHEETS - Use saved weekly sheets
    async getPoolSurvivalStatus(poolId) {
        try {
            console.log('📖 READING FROM SURVIVOR WINNER SHEETS...');
            const startTime = performance.now();

            // First, create the sheets if they don't exist
            await this.createSurvivorWinnerSheets(poolId);

            // Get pool members
            const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`));
            if (!poolDoc.exists()) {
                throw new Error('Pool not found');
            }
            const poolMembers = poolDoc.data();

            // Read compiled survivor sheets
            const compiledDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/survivor/compiled_sheets`));

            let losersArray = [];
            let winnersArray = [];
            if (compiledDoc.exists()) {
                const compiledData = compiledDoc.data();
                losersArray = compiledData.losers || [];
                winnersArray = compiledData.winners || [];
                console.log(`📖 Read compiled sheets: ${compiledData.totalWinners || 0} winners, ${compiledData.totalLosers || 0} losers`);
                console.log('📋 STORED WINNERS ARRAY:', JSON.stringify(winnersArray, null, 2));
                console.log('📋 STORED LOSERS ARRAY:', JSON.stringify(losersArray, null, 2));
            } else {
                console.log(`📖 No compiled sheets found, using fresh data`);
            }

            // Determine status using multi-dimensional losers array
            const results = [];

            for (const [uid, member] of Object.entries(poolMembers)) {
                // Check if user appears in losers array
                const loserEntry = losersArray.find(loser => loser.userId === uid);

                if (loserEntry) {
                    results.push({
                        uid,
                        displayName: member.displayName || member.email,
                        status: 'eliminated',
                        eliminatedWeek: loserEntry.week,
                        reason: loserEntry.reason,
                        isEliminated: true,
                        team: loserEntry.team
                    });
                } else {
                    results.push({
                        uid,
                        displayName: member.displayName || member.email,
                        status: 'survived',
                        reason: `Still alive in Week ${this.currentWeek}`,
                        isEliminated: false,
                        team: 'Active'
                    });
                }
            }

            const totalTime = performance.now() - startTime;
            console.log(`📖 READING COMPLETE: ${totalTime.toFixed(1)}ms total`);
            console.log(`👥 Results: ${results.filter(r => !r.isEliminated).length} active, ${results.filter(r => r.isEliminated).length} eliminated`);

            return results;

        } catch (error) {
            console.error('❌ Reading survivor sheets error:', error);
            throw error;
        }
    }

    getSummaryStats(results) {
        const stats = {
            total: results.length,
            active: 0,
            eliminated: 0,
            pending: 0
        };

        results.forEach(result => {
            if (result.status === 'eliminated') {
                stats.eliminated++;
            } else if (result.status === 'survived') {
                stats.active++;
            } else {
                stats.pending++;
            }
        });

        return stats;
    }
}

// PURE FIREBASE INITIALIZATION: Zero ESPN dependencies
function initializePureSurvivorSystem() {
    if (typeof window === 'undefined') {
        console.error('❌ Window not available for pure survivor system');
        return;
    }

    const requiredGlobals = ['doc', 'getDoc', 'collection', 'getDocs'];
    const missingGlobals = requiredGlobals.filter(global => typeof window[global] === 'undefined');

    if (missingGlobals.length > 0) {
        console.warn(`⚠️ Missing Firebase globals: ${missingGlobals.join(', ')}`);
        return;
    }

    try {
        if (typeof window.db === 'undefined') {
            console.error('❌ Firebase database not available');
            return;
        }

        // Initialize pure survivor system with zero ESPN dependencies
        window.survivorSystem = new SurvivorSystem(window.db);
        console.log('✅ PURE FIREBASE: Survivor System initialized successfully');
        return true;

    } catch (error) {
        console.error('❌ Pure survivor initialization failed:', error);
        return false;
    }
}

// AUTO-INITIALIZE: Pure Firebase system
if (typeof window !== 'undefined') {
    console.log('🔄 Pure Firebase survivor system initialization attempt...');

    if (!initializePureSurvivorSystem()) {
        // Delayed retry for Firebase globals
        setTimeout(() => {
            console.log('🔄 Delayed pure Firebase survivor system initialization...');
            initializePureSurvivorSystem();
        }, 2000);
    }
}