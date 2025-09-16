// DIAMOND LEVEL: 100% Pure Firebase Survivor System - ZERO ESPN Dependencies
// Revolutionary Performance: 4 Firebase calls only, sub-500ms target

class SurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = window.currentWeek || window.getCurrentWeek?.() || 1;
        console.log(`🏆 PURE FIREBASE Survivor System using week ${this.currentWeek}`);
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

                const opponent = (normalizedWinner === normalizedHome) ? awayTeam : homeTeam;

                if (normalizedWinner === normalizedUserTeam) {
                    return { status: 'survived', reason: `${userTeam} won against ${opponent}` };
                } else {
                    return { status: 'eliminated', reason: `${userTeam} lost to ${gameResult.winner}` };
                }
            }
        }

        // No game found for user's team
        return { status: 'pending', reason: 'Game not found or not started' };
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

    // 100% PURE FIREBASE: 4 parallel calls only
    async getPoolSurvivalStatus(poolId) {
        try {
            console.log('🚀 PURE FIREBASE: Starting 4-call optimization');
            const startTime = performance.now();

            // PURE FIREBASE OPTIMIZATION: Only 4 calls needed!
            const [poolDoc, statusDoc, allPicksSnapshot, weekResultsDoc] = await Promise.all([
                getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`)),
                getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`)),
                getDocs(collection(this.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks')),
                getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${this.currentWeek}`))
            ]);

            const dbTime = performance.now() - startTime;
            console.log(`⚡ PURE FIREBASE: 4 parallel calls completed in ${dbTime.toFixed(1)}ms`);

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
            console.log(`🎯 PURE FIREBASE: Using ${Object.keys(weekResults).length} games from Firebase`);

            const results = [];

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
                    team: userPick?.team || 'No pick',
                    isEliminated: survival.status === 'eliminated'
                });
            }

            const totalTime = performance.now() - startTime;
            console.log(`🏆 PURE FIREBASE COMPLETE: ${totalTime.toFixed(1)}ms total (target: <500ms)`);

            return results;

        } catch (error) {
            console.error('❌ Pure Firebase survivor error:', error);
            throw error;
        }
    }

    getSummaryStats(results) {
        const stats = {
            totalPlayers: results.length,
            activePlayers: 0,
            eliminatedPlayers: 0,
            pendingPlayers: 0
        };

        results.forEach(result => {
            if (result.status === 'eliminated') {
                stats.eliminatedPlayers++;
            } else if (result.status === 'survived') {
                stats.activePlayers++;
            } else {
                stats.pendingPlayers++;
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