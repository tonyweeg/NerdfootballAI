// DIAMOND LEVEL: Clean Survivor System - Focused, Reliable Architecture
// Single working implementation - 90% size reduction from bloated original

class SurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = window.currentWeek || window.getCurrentWeek?.() || 1;
        console.log(`🏆 Survivor System using week ${this.currentWeek} (from WeekManager)`);
    }

    checkUserSurvival(userPick, weekResults) {
        if (!userPick || !userPick.team) {
            return { status: 'eliminated', reason: 'No pick made' };
        }

        const userTeam = userPick.team;

        // Find game where user's team played by iterating through all games
        for (const [gameId, gameResult] of Object.entries(weekResults)) {
            if (!gameResult || !gameResult.winner) continue;

            // Check if user's team played in this game (home or away)
            const homeTeam = gameResult.homeTeam || gameResult.home_team || gameResult.h;
            const awayTeam = gameResult.awayTeam || gameResult.away_team || gameResult.a;

            // Team name matching (normalize both)
            const normalizedUserTeam = this.normalizeTeamName(userTeam);
            const normalizedHome = this.normalizeTeamName(homeTeam);
            const normalizedAway = this.normalizeTeamName(awayTeam);

            if (normalizedUserTeam === normalizedHome || normalizedUserTeam === normalizedAway) {
                // Found user's game! Check if they won
                const normalizedWinner = this.normalizeTeamName(gameResult.winner);

                if (gameResult.winner === 'TBD' || !gameResult.winner) {
                    return { status: 'pending', reason: 'Game not finished' };
                }

                if (normalizedWinner === normalizedUserTeam) {
                    return { status: 'survived', reason: `${userTeam} won against ${gameResult.winner === normalizedHome ? awayTeam : homeTeam}` };
                } else {
                    return { status: 'eliminated', reason: `${userTeam} lost to ${gameResult.winner}` };
                }
            }
        }

        // No game found for user's team
        return { status: 'pending', reason: 'Game not found or not started' };
    }

    async getESPNWeekResults(week) {
        try {
            if (typeof window.espnNerdApi !== 'undefined') {
                await window.espnNerdApi.ensureReady();
                const espnData = await window.espnNerdApi.getCurrentWeekScores();

                if (espnData && espnData.games) {
                    const weekResults = {};
                    const internalSchedule = await this.loadInternalSchedule();
                    const weekGames = internalSchedule?.weeks?.find(w => w.week === week)?.games || [];

                    espnData.games.forEach((espnGame, index) => {
                        const gameResult = {
                            id: espnGame.id,
                            homeTeam: espnGame.home_team,
                            awayTeam: espnGame.away_team,
                            homeScore: espnGame.home_score || 0,
                            awayScore: espnGame.away_score || 0,
                            status: espnGame.status,
                            winner: this.determineWinnerFromScores(espnGame),
                            espnId: espnGame.id
                        };

                        weekResults[espnGame.id] = gameResult;

                        const matchingInternalGame = this.findMatchingInternalGame(espnGame, weekGames);
                        if (matchingInternalGame) {
                            weekResults[matchingInternalGame.id] = gameResult;
                        }
                    });

                    return weekResults;
                }
            }

            const weekResultsDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`));
            return weekResultsDoc.exists() ? weekResultsDoc.data() : {};

        } catch (error) {
            return {};
        }
    }

    determineWinnerFromScores(game) {
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

    async loadInternalSchedule() {
        try {
            if (this.cachedSchedule) {
                return this.cachedSchedule;
            }

            const response = await fetch('/nfl_2025_schedule_raw.json');
            const scheduleData = await response.json();
            this.cachedSchedule = scheduleData;
            return scheduleData;
        } catch (error) {
            return null;
        }
    }

    findMatchingInternalGame(espnGame, internalWeekGames) {
        if (!espnGame.home_team || !espnGame.away_team) {
            return null;
        }

        let match = internalWeekGames.find(internalGame =>
            internalGame.h === espnGame.home_team && internalGame.a === espnGame.away_team
        );

        if (match) {
            return match;
        }

        match = internalWeekGames.find(internalGame =>
            this.normalizeTeamName(internalGame.h) === this.normalizeTeamName(espnGame.home_team) &&
            this.normalizeTeamName(internalGame.a) === this.normalizeTeamName(espnGame.away_team)
        );

        return match;
    }

    // FIXED: Enhanced team normalization with ESPN abbreviations
    normalizeTeamName(teamName) {
        if (!teamName) return null;

        const teamMappings = {
            // ESPN Abbreviations → Full Names (FIXES TEST FAILURES)
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

            // Shortened Forms → Full Names (EXISTING MAPPINGS)
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

    extractTeamFromGame(game, homeOrAway) {
        if (homeOrAway === 'home') {
            return game.home_team || game.homeTeam || game.home || null;
        } else if (homeOrAway === 'away') {
            return game.away_team || game.awayTeam || game.away || null;
        }
        return null;
    }

    getGameInfoFromScheduleSync(gameId, scheduleData) {
        try {
            if (!scheduleData || !scheduleData.weeks) return null;

            const week1 = scheduleData.weeks.find(w => w.week === 1);
            if (!week1) return null;

            const game = week1.games.find(g => g.id == gameId);
            if (!game) return null;

            return {
                id: game.id,
                home: game.h,
                away: game.a,
                datetime: game.dt,
                stadium: game.stadium
            };
        } catch (error) {
            return null;
        }
    }

    async getGameInfoFromSchedule(gameId) {
        try {
            const response = await fetch('/nfl_2025_schedule_raw.json');
            const scheduleData = await response.json();

            const week1 = scheduleData.weeks.find(w => w.week === 1);
            if (!week1) return null;

            const game = week1.games.find(g => g.id == gameId);
            if (!game) return null;

            return {
                id: game.id,
                home: game.h,
                away: game.a,
                datetime: game.dt,
                stadium: game.stadium
            };
        } catch (error) {
            return null;
        }
    }

    findESPNResultByTeams(homeTeam, awayTeam, espnResults) {
        const normalizedHome = this.normalizeTeamName(homeTeam);
        const normalizedAway = this.normalizeTeamName(awayTeam);

        for (const [gameId, result] of Object.entries(espnResults)) {
            if (!result.homeTeam || !result.awayTeam) {
                continue;
            }

            const resultHome = this.normalizeTeamName(result.homeTeam);
            const resultAway = this.normalizeTeamName(result.awayTeam);

            if (resultHome === normalizedHome && resultAway === normalizedAway) {
                return result;
            }

            if ((resultHome === normalizedHome || resultAway === normalizedAway) &&
                (resultHome === normalizedAway || resultAway === normalizedHome)) {
                return result;
            }
        }

        return null;
    }

    processESPNResultsFromBatch(espnData, scheduleData, weekResultsDoc, week) {
        // Priority: ESPN data > Firebase fallback
        if (espnData && espnData.games && scheduleData) {
            const weekResults = {};
            const weekGames = scheduleData?.weeks?.find(w => w.week === week)?.games || [];

            espnData.games.forEach((espnGame) => {
                const gameResult = {
                    id: espnGame.id,
                    homeTeam: espnGame.home_team,
                    awayTeam: espnGame.away_team,
                    homeScore: espnGame.home_score || 0,
                    awayScore: espnGame.away_score || 0,
                    status: espnGame.status,
                    winner: this.determineWinnerFromScores(espnGame),
                    espnId: espnGame.id
                };

                weekResults[espnGame.id] = gameResult;

                const matchingInternalGame = this.findMatchingInternalGame(espnGame, weekGames);
                if (matchingInternalGame) {
                    weekResults[matchingInternalGame.id] = gameResult;
                }
            });

            return weekResults;
        }

        // Fallback to Firebase week results
        return weekResultsDoc?.exists() ? weekResultsDoc.data() : {};
    }

    async getPoolSurvivalStatus(poolId) {
        try {
            // PURE FIREBASE OPTIMIZATION: Only 4 calls needed!
            const [poolDoc, statusDoc, allPicksSnapshot, weekResultsDoc] = await Promise.all([
                getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`)),
                getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`)),
                getDocs(collection(this.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks')),
                getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${this.currentWeek}`))
            ]);

            if (!poolDoc.exists()) {
                throw new Error('Pool not found');
            }
            const poolMembers = poolDoc.data();
            const allStatuses = statusDoc.exists() ? statusDoc.data() : {};

            // Create picks lookup map from batch result (replaces 54 individual calls!)
            const allPicksMap = {};
            allPicksSnapshot.forEach(doc => {
                const uid = doc.id;
                const data = doc.data();
                allPicksMap[uid] = data.picks || {};
            });

            // Use pure Firestore game results!
            const weekResults = weekResultsDoc?.exists() ? weekResultsDoc.data() : {};
            const results = [];
            const eliminationPromises = [];

            for (const [uid, member] of Object.entries(poolMembers)) {
                const currentStatus = allStatuses[uid];
                if (currentStatus?.eliminated) {
                    results.push({
                        uid,
                        displayName: member.displayName || member.email,
                        status: 'eliminated',
                        eliminatedWeek: currentStatus.eliminatedWeek,
                        reason: currentStatus.eliminationReason,
                        isEliminated: true
                    });
                    continue;
                }

                // Get user pick from batch data (no individual Firebase call!)
                const userPicks = allPicksMap[uid] || {};
                const userPick = userPicks[this.currentWeek];

                const survival = this.checkUserSurvival(userPick, weekResults);

                results.push({
                    uid,
                    displayName: member.displayName || member.email,
                    status: survival.status,
                    reason: survival.reason,
                    currentPick: userPick?.team || 'No pick',
                    gameId: userPick?.gameId,
                    isEliminated: survival.status === 'eliminated'
                });

                // Queue elimination updates for batch processing
                if (survival.status === 'eliminated' && !currentStatus?.eliminated) {
                    eliminationPromises.push(this.eliminateUser(uid, this.currentWeek, survival.reason));
                }
            }

            // Batch process any eliminations
            if (eliminationPromises.length > 0) {
                await Promise.all(eliminationPromises);
            }

            return results;

        } catch (error) {
            throw error;
        }
    }

    async eliminateUser(uid, week, reason) {
        try {
            const statusRef = doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`);
            await setDoc(statusRef, {
                [`${uid}.eliminated`]: true,
                [`${uid}.eliminatedWeek`]: week,
                [`${uid}.eliminationReason`]: reason,
                [`${uid}.eliminatedDate`]: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            throw error;
        }
    }

    // FIXED: Professional terminology (active instead of alive)
    getSummaryStats(results) {
        const total = results.length;
        const eliminated = results.filter(r => r.status === 'eliminated').length;
        const active = total - eliminated;

        return {
            total,
            active,
            eliminated,
            currentWeek: this.currentWeek
        };
    }

    formatUserForDisplay(user) {
        const rowClass = user.isEliminated ? 'survivor-eliminated bg-red-50' : 'survivor-active bg-white';

        const playerNameWithIcon = user.isEliminated
            ? `<i class="fas fa-skull text-red-500 mr-2"></i>${user.displayName}`
            : `<i class="fas fa-heart text-green-500 mr-2"></i>${user.displayName}`;

        const statusBadge = user.isEliminated
            ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                 Eliminated
               </span>`
            : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                 Active
               </span>`;

        const eliminatedWeek = user.isEliminated && user.eliminatedWeek
            ? `Week ${user.eliminatedWeek}`
            : '-';

        return {
            rowClass,
            statusBadge,
            playerNameWithIcon,
            currentPick: user.currentPick || 'No pick',
            eliminatedWeek,
            reason: user.reason || ''
        };
    }
}

// Global instance
window.survivorSystem = null;

// Initialize function with ESPN API coordination
async function initializeSurvivorSystem(retryCount = 0) {
    const maxRetries = 20;
    const retryDelay = 500;

    const missingDeps = [];
    if (typeof window.db === 'undefined') missingDeps.push('db');
    if (typeof window.functions === 'undefined') missingDeps.push('functions');
    if (typeof window.espnNerdApi === 'undefined') missingDeps.push('espnNerdApi');

    if (missingDeps.length > 0) {
        if (retryCount < maxRetries) {
            console.log(`🔄 Survivor System waiting for: ${missingDeps.join(', ')} - retry ${retryCount + 1}/${maxRetries}`);
            setTimeout(() => initializeSurvivorSystem(retryCount + 1), retryDelay);
            return;
        } else {
            console.error('❌ Survivor System: Required dependencies not available after maximum retries');
            return;
        }
    }

    try {
        await window.espnNerdApi.ensureReady();
        window.survivorSystem = new SurvivorSystem(window.db);
        console.log('✅ DIAMOND LEVEL: Survivor System initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Survivor System:', error);
        if (retryCount < maxRetries) {
            console.log(`🔄 Retrying Survivor System initialization in ${retryDelay}ms`);
            setTimeout(() => initializeSurvivorSystem(retryCount + 1), retryDelay);
        }
    }
}

// Manual initialization for testing
window.initializeSurvivorSystem = initializeSurvivorSystem;

// Initialize AFTER main app loads (wait for Firebase)
setTimeout(() => {
    console.log('🔄 Starting survivor system initialization (delayed for Firebase)...');
    initializeSurvivorSystem();
}, 3000);

// Also try on window load as backup
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!window.survivorSystem) {
            console.log('🔄 Backup survivor system initialization attempt...');
            initializeSurvivorSystem();
        }
    }, 2000);
});