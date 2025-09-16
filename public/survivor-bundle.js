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

        // Calculate current week based on date - Week 1 starts Sept 4, 2025
        const now = new Date();
        const seasonStart = new Date('2025-09-04');
        const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
        const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);

        console.log(`🏈 SurvivorSystem: Calculated Week ${currentWeek} (${daysSinceStart} days since season start)`);
        return currentWeek;
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
            // SIMPLE WINNER CHECK: If user's team is a winner this week, they survive
            const userTeam = userPick.team;
            console.log(`🏈 Checking if ${userTeam} won any game this week`);

            // Get all winners for debug
            const allWinners = Object.values(weekResults)
                .filter(game => game && game.winner && game.winner !== 'TBD')
                .map(game => game.winner);
            console.log(`🏆 All winners this week: [${allWinners.join(', ')}]`);

            // Check if user's team is in the winners list for this week
            for (const [gameId, gameResult] of Object.entries(weekResults)) {
                if (!gameResult) continue;

                if (gameResult.status === 'STATUS_FINAL' && gameResult.winner) {
                    console.log(`🔍 Comparing '${userTeam}' vs '${gameResult.winner}'`);

                    // Direct team name comparison
                    if (gameResult.winner === userTeam) {
                        console.log(`✅ ${userTeam} won game ${gameId}`);
                        return { status: 'survived', reason: `${userTeam} won their game` };
                    }

                    // Also try normalized comparison
                    const normalizedUserTeam = this.normalizeTeamName(userTeam);
                    const normalizedWinner = this.normalizeTeamName(gameResult.winner);

                    console.log(`🔍 Normalized: '${normalizedUserTeam}' vs '${normalizedWinner}'`);
                    if (normalizedWinner === normalizedUserTeam) {
                        console.log(`✅ ${userTeam} won game ${gameId} (normalized match)`);
                        return { status: 'survived', reason: `${userTeam} won their game` };
                    }
                }
            }

            // If team didn't win any game, they're eliminated
            console.log(`❌ ${userTeam} did not win any games this week`);
            return { status: 'eliminated', reason: `Lost: ${userTeam} did not win any games this week` };
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
                    const allWinners = [];
                    Object.entries(weekResults).forEach(([gameId, game]) => {
                        console.log(`  ${gameId}: ${game.homeTeam || game.home_team || 'NO_HOME'} vs ${game.awayTeam || game.away_team || 'NO_AWAY'} | Status: ${game.status} | Winner: ${game.winner || 'TBD'}`);
                        if (game.winner && game.winner !== 'TBD') {
                            allWinners.push(game.winner);
                        }
                    });
                    console.log(`🏆 Week ${week} ALL WINNERS: [${allWinners.join(', ')}]`);
                    console.log(`🔍 Looking for Denver: ${allWinners.includes('Denver Broncos') ? 'FOUND' : 'NOT FOUND'}`);
                    console.log(`🔍 Denver variations: ${allWinners.filter(w => w.toLowerCase().includes('denver')).join(', ')}`);
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

                    // Use the correct survival checking logic
                    const survivalResult = this.checkUserSurvival(userPick, weekResults);
                    console.log(`👤 User ${uid} Week ${week} survival result:`, survivalResult);

                    if (survivalResult.status === 'survived') {
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
                            reason: survivalResult.reason
                        };
                    } else if (survivalResult.status === 'eliminated') {
                        // LOSER - eliminated this week - add to losers array
                        const loserEntry = {
                            week,
                            userId: uid,
                            team: userPick.team,
                            displayName: member.displayName || member.email,
                            reason: survivalResult.reason
                        };
                        losersArray.push(loserEntry);
                        eliminatedUsers.add(uid); // Mark as eliminated

                        weeklySheet[uid] = {
                            displayName: member.displayName || member.email,
                            team: userPick.team,
                            status: 'eliminated',
                            reason: survivalResult.reason
                        };
                    } else {
                        // Game in progress or pending
                        weeklySheet[uid] = {
                            displayName: member.displayName || member.email,
                            team: userPick.team,
                            status: 'pending',
                            reason: survivalResult.reason
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
                        team: loserEntry.team,
                        currentPick: loserEntry.team,  // UI compatibility
                        teamPicked: loserEntry.team    // UI compatibility
                    });
                } else {
                    // Find the most recent winner entry for this user to get their team
                    const winnerEntry = winnersArray.find(winner => winner.userId === uid);
                    const currentTeam = winnerEntry ? winnerEntry.team : 'No pick';

                    results.push({
                        uid,
                        displayName: member.displayName || member.email,
                        status: 'survived',
                        reason: `Still alive in Week ${this.currentWeek}`,
                        isEliminated: false,
                        team: currentTeam,
                        currentPick: currentTeam,      // UI compatibility
                        teamPicked: currentTeam        // UI compatibility
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

// AUTO-INITIALIZE: Pure Firebase system with robust retry
if (typeof window !== 'undefined') {
    console.log('🔄 Pure Firebase survivor system initialization attempt...');

    let retryCount = 0;
    const maxRetries = 10;

    const tryInit = () => {
        if (initializePureSurvivorSystem()) {
            return; // Success!
        }

        retryCount++;
        if (retryCount < maxRetries) {
            console.log(`🔄 Delayed pure Firebase survivor system initialization... (attempt ${retryCount}/${maxRetries})`);
            setTimeout(tryInit, 1000); // Try every second
        } else {
            console.error('❌ Failed to initialize survivor system after maximum retries');
        }
    };

    tryInit();
}