// BULLETPROOF SURVIVOR DEAD OR ALIVE CHECKER
// Automatically determines elimination status from ESPN results
// Replaces manual elimination tracking with real-time calculation

console.log('🚨 BULLETPROOF SCRIPT LOADING: bulletproofSurvivorChecker.js started executing');

class BulletproofSurvivorChecker {
    constructor(db) {
        this.db = db;
        this.currentWeek = window.currentWeek || 2; // Week 2 as of now
        console.log('💎 BulletproofSurvivorChecker initialized for Week', this.currentWeek);
    }

    // MAIN FUNCTION: Get DEAD OR ALIVE status for all users
    async getSurvivorTable(poolId) {
        console.log(`💎 BULLETPROOF: Calculating DEAD OR ALIVE status for pool ${poolId}`);
        try {
            // Get pool members
            const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`));
            if (!poolDoc.exists()) {
                console.log('❌ Pool members not found');
                return [];
            }

            const poolMembers = poolDoc.data();
            const results = [];

            // Process each user
            for (const [uid, member] of Object.entries(poolMembers)) {
                const userStatus = await this.calculateUserDeadOrAlive(uid, member);
                results.push(userStatus);
            }

            console.log(`💎 BULLETPROOF: Processed ${results.length} users`);
            return results;

        } catch (error) {
            console.error('❌ BulletproofSurvivorChecker error:', error);
            return [];
        }
    }

    // BULLETPROOF SURVIVOR RULES: Week-by-week elimination, no repeat teams per user
    async calculateUserDeadOrAlive(uid, member) {
        console.log(`🔍 BULLETPROOF: Checking ${member.displayName || member.email} (${uid}) - Week ${this.currentWeek}`);

        try {
            // Get all user picks
            const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`));
            const allPicks = picksDoc.exists() ? picksDoc.data().picks || {} : {};

            // Track teams used by this user across all weeks (no repeats allowed)
            const teamsUsed = new Set();

            // Check each COMPLETED week chronologically to find elimination point
            // Since we're in Week 2, Week 1 is completed and should be checked for eliminations
            const completedWeeks = [];
            for (let week = 1; week < this.currentWeek; week++) {
                completedWeeks.push(week);
            }
            console.log(`📊 BULLETPROOF: Checking ${completedWeeks.length} completed weeks: ${completedWeeks.join(', ')}`);

            for (const week of completedWeeks) {
                const weekPick = allPicks[week];

                // No pick for completed week = DEAD
                if (!weekPick || !weekPick.team) {
                    console.log(`💀 ${member.displayName}: ELIMINATED - No pick for Week ${week}`);
                    return this.createDeadStatus(uid, member, week, 'No Pick', `Failed to make pick for Week ${week}`);
                }

                // Track team usage (no duplicates allowed)
                const normalizedTeam = this.normalizeTeamName(weekPick.team);
                if (teamsUsed.has(normalizedTeam)) {
                    console.log(`💀 ${member.displayName}: ELIMINATED - Used ${weekPick.team} twice (Week ${week})`);
                    return this.createDeadStatus(uid, member, week, weekPick.team, `Picked ${weekPick.team} multiple times (not allowed)`);
                }
                teamsUsed.add(normalizedTeam);

                // Check if their team WON or LOST that week (completed weeks only)
                const teamResult = await this.getTeamResult(weekPick.team, week);

                if (teamResult && teamResult.status === 'lost') {
                    console.log(`💀 ${member.displayName}: ELIMINATED - ${weekPick.team} lost in Week ${week}`);
                    return this.createDeadStatus(uid, member, week, weekPick.team, teamResult.reason);
                } else if (teamResult && teamResult.status === 'won') {
                    console.log(`✅ ${member.displayName}: Survived Week ${week} with ${weekPick.team}`);
                } else {
                    console.log(`⚠️ ${member.displayName}: Week ${week} ${weekPick.team} result unclear - assuming survived`);
                }
            }

            // Check current week pick (Week 2) for validation AND elimination if game finished
            const currentWeekPick = allPicks[this.currentWeek];
            let currentPickInfo = 'No current pick';

            if (currentWeekPick && currentWeekPick.team) {
                const normalizedCurrentTeam = this.normalizeTeamName(currentWeekPick.team);

                // Check if they're trying to reuse a team
                if (teamsUsed.has(normalizedCurrentTeam)) {
                    console.log(`💀 ${member.displayName}: ELIMINATED - Trying to reuse ${currentWeekPick.team} in Week ${this.currentWeek}`);
                    return this.createDeadStatus(uid, member, this.currentWeek, currentWeekPick.team, `Picked ${currentWeekPick.team} multiple times (not allowed)`);
                }

                // ADD CURRENT TEAM TO USED SET
                teamsUsed.add(normalizedCurrentTeam);

                // CHECK IF CURRENT WEEK GAME HAS FINISHED AND TEAM LOST
                const currentTeamResult = await this.getTeamResult(currentWeekPick.team, this.currentWeek);
                if (currentTeamResult && currentTeamResult.status === 'lost') {
                    console.log(`💀 ${member.displayName}: ELIMINATED - ${currentWeekPick.team} lost in Week ${this.currentWeek}`);
                    return this.createDeadStatus(uid, member, this.currentWeek, currentWeekPick.team, currentTeamResult.reason);
                } else if (currentTeamResult && currentTeamResult.status === 'won') {
                    console.log(`✅ ${member.displayName}: Survived Week ${this.currentWeek} with ${currentWeekPick.team}`);
                } else {
                    console.log(`⚠️ ${member.displayName}: Week ${this.currentWeek} ${currentWeekPick.team} result unclear - game may be pending`);
                }

                currentPickInfo = `Week ${this.currentWeek}: ${currentWeekPick.team}`;
                console.log(`📋 ${member.displayName}: Week ${this.currentWeek} pick is ${currentWeekPick.team} (valid new team)`);
            } else {
                console.log(`⚠️ ${member.displayName}: No pick yet for Week ${this.currentWeek}`);
            }

            // ALIVE - survived all completed weeks and has valid picks
            console.log(`🟢 ${member.displayName}: ALIVE - Survived all completed weeks, used ${teamsUsed.size} different teams`);

            return this.createAliveStatus(uid, member, currentPickInfo, Array.from(teamsUsed));

        } catch (error) {
            console.error(`❌ Error checking ${uid}:`, error);
            return this.createErrorStatus(uid, member);
        }
    }

    // Get team result for specific week using TRUSTED ESPN data
    async getTeamResult(teamName, weekNumber) {
        try {
            console.log(`🔍 Getting ESPN result for ${teamName} Week ${weekNumber}`);

            // PRIORITY 1: Use ESPN cache manager (fastest, most reliable)
            if (window.espnCacheManager) {
                const cachedResult = await window.espnCacheManager.getCachedTeamResult(teamName, weekNumber);
                if (cachedResult && cachedResult.winner) {
                    console.log(`⚡ ESPN Cache hit for ${teamName}:`, cachedResult);
                    const normalizedTeam = this.normalizeTeamName(teamName);
                    const normalizedWinner = this.normalizeTeamName(cachedResult.winner);

                    if (normalizedWinner === normalizedTeam) {
                        console.log(`✅ ${teamName} WON - cache result`);
                        return { status: 'won', reason: `${teamName} won ${cachedResult.homeScore}-${cachedResult.awayScore}` };
                    } else {
                        console.log(`💀 ${teamName} LOST to ${cachedResult.winner} - cache result`);
                        return { status: 'lost', reason: `${teamName} lost to ${cachedResult.winner} ${cachedResult.homeScore}-${cachedResult.awayScore}` };
                    }
                } else {
                    console.log(`⚠️ ESPN Cache miss for ${teamName} Week ${weekNumber}`);
                }
            }

            // Fallback: Check if ESPN API is available
            if (window.espnNerdApi) {
                const weekGames = await window.espnNerdApi.getWeekGames(weekNumber);
                if (weekGames && weekGames.games) {
                    const normalizedTeam = this.normalizeTeamName(teamName);

                    for (const game of weekGames.games) {
                        const homeTeam = this.normalizeTeamName(game.home || game.homeTeam);
                        const awayTeam = this.normalizeTeamName(game.away || game.awayTeam);

                        if (homeTeam === normalizedTeam || awayTeam === normalizedTeam) {
                            if (game.winner && game.winner !== 'TBD') {
                                const winner = this.normalizeTeamName(game.winner);
                                if (winner === normalizedTeam) {
                                    return { status: 'won', reason: `${teamName} won` };
                                } else {
                                    return { status: 'lost', reason: `${teamName} lost to ${game.winner}` };
                                }
                            } else {
                                return { status: 'pending', reason: `${teamName} game not finished` };
                            }
                        }
                    }
                }
            }

            // No result found
            return { status: 'pending', reason: `No result found for ${teamName} in Week ${weekNumber}` };

        } catch (error) {
            console.error(`Error getting team result for ${teamName} Week ${weekNumber}:`, error);
            return { status: 'pending', reason: `Error checking ${teamName} result` };
        }
    }

    // Normalize team names for consistent matching
    normalizeTeamName(teamName) {
        if (!teamName) return '';

        const normalizations = {
            'NE': 'Patriots', 'New England': 'Patriots',
            'SF': '49ers', 'San Francisco': '49ers',
            'TB': 'Buccaneers', 'Tampa Bay': 'Buccaneers',
            'GB': 'Packers', 'Green Bay': 'Packers',
            'NO': 'Saints', 'New Orleans': 'Saints',
            'LV': 'Raiders', 'Las Vegas': 'Raiders',
            'LAR': 'Rams', 'LA Rams': 'Rams', 'Los Angeles Rams': 'Rams',
            'LAC': 'Chargers', 'LA Chargers': 'Chargers', 'Los Angeles Chargers': 'Chargers',
            'KC': 'Chiefs', 'Kansas City': 'Chiefs',
            'NYG': 'Giants', 'NY Giants': 'Giants', 'New York Giants': 'Giants',
            'NYJ': 'Jets', 'NY Jets': 'Jets', 'New York Jets': 'Jets'
        };

        const normalized = normalizations[teamName] || teamName;
        return normalized.replace(/\s+/g, ' ').trim();
    }

    // Create DEAD status object
    createDeadStatus(uid, member, eliminationWeek, team, reason) {
        return {
            uid,
            displayName: member.displayName || member.email,
            teamPicked: team,
            status: 'eliminated',
            reason: reason,
            week: this.currentWeek,
            eliminationWeek: eliminationWeek,
            eliminationDetails: reason,
            eliminationTeam: team,
            weeksActive: eliminationWeek - 1,
            cached: false
        };
    }

    // Create ALIVE status object
    createAliveStatus(uid, member, currentPickInfo, teamsUsed = []) {
        return {
            uid,
            displayName: member.displayName || member.email,
            teamPicked: currentPickInfo,
            status: 'alive',
            reason: `Survived all completed weeks (used ${teamsUsed.length} teams)`,
            week: this.currentWeek,
            eliminationWeek: null,
            eliminationDetails: null,
            eliminationTeam: null,
            weeksActive: this.currentWeek - 1, // Completed weeks survived
            teamsUsed: teamsUsed, // Track teams for admin reference
            cached: false
        };
    }

    // Create error status object
    createErrorStatus(uid, member) {
        return {
            uid,
            displayName: member.displayName || member.email,
            teamPicked: 'Error',
            status: 'error',
            reason: 'Calculation failed',
            week: this.currentWeek,
            eliminationWeek: null,
            eliminationDetails: null,
            eliminationTeam: null,
            weeksActive: 0,
            cached: false
        };
    }
}

// Initialize bulletproof checker
window.bulletproofSurvivorChecker = null;

async function initializeBulletproofChecker() {
    if (typeof window.db === 'undefined') {
        setTimeout(initializeBulletproofChecker, 500);
        return;
    }

    window.bulletproofSurvivorChecker = new BulletproofSurvivorChecker(window.db);
    console.log('💎 BulletproofSurvivorChecker initialized and ready');

    // FORCE OVERRIDE: Replace simple survivor system
    if (window.simpleSurvivorSystem) {
        console.log('🔄 OVERRIDE: Replacing simple survivor system with bulletproof checker');
        const oldSystem = window.simpleSurvivorSystem;
        window.simpleSurvivorSystem = {
            getSurvivorTable: async (poolId) => {
                console.log('🔄 REDIRECTED: Using bulletproof checker instead of simple system');
                return await window.bulletproofSurvivorChecker.getSurvivorTable(poolId);
            }
        };
    }

    // Add global helper functions for admins
    window.refreshSurvivorData = async function() {
        console.log('🔄 ADMIN: Manually refreshing survivor data...');

        // Force ESPN cache refresh if available
        if (window.espnCacheManager && window.espnCacheManager.refreshCache) {
            try {
                await window.espnCacheManager.refreshCache();
                console.log('✅ ESPN cache refreshed');
            } catch (error) {
                console.error('❌ ESPN cache refresh failed:', error);
            }
        }

        // Trigger survivor view refresh if currently showing
        if (window.SurvivorView && typeof window.SurvivorView.loadSurvivorResults === 'function') {
            try {
                await window.SurvivorView.loadSurvivorResults();
                console.log('✅ Survivor view refreshed');
            } catch (error) {
                console.error('❌ Survivor view refresh failed:', error);
            }
        }

        console.log('🔄 Survivor data refresh complete');
        return 'Refresh complete - check survivor view for updated DEAD/ALIVE status';
    };

    window.testSurvivorUser = async function(userId) {
        console.log(`🧪 ADMIN: Testing survivor status for user ${userId}`);

        const poolId = (typeof getCurrentPool === 'function') ? getCurrentPool() : 'nerduniverse-2025';

        // Get pool member data
        const poolDoc = await getDoc(doc(window.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`));
        if (!poolDoc.exists()) {
            return 'Pool not found';
        }

        const poolMembers = poolDoc.data();
        const member = poolMembers[userId];

        if (!member) {
            return 'User not found in pool';
        }

        const result = await window.bulletproofSurvivorChecker.calculateUserDeadOrAlive(userId, member);
        console.log('🧪 Test result:', result);
        return result;
    };

    // Quick test function for VibeDaddy to verify system is working
    window.testSurvivorSystem = async function() {
        console.log('🧪 TESTING BULLETPROOF SURVIVOR SYSTEM');

        if (!window.bulletproofSurvivorChecker) {
            console.log('⚠️ Bulletproof checker not found, attempting to initialize...');
            if (window.db) {
                await initializeBulletproofChecker();
            } else {
                return { error: 'Firebase database not ready' };
            }
        }

        console.log('Current Week:', window.bulletproofSurvivorChecker.currentWeek);

        const poolId = 'nerduniverse-2025';
        console.log('Testing pool:', poolId);

        try {
            const results = await window.bulletproofSurvivorChecker.getSurvivorTable(poolId);
            console.log('📊 SURVIVOR RESULTS:');

            results.forEach(user => {
                const statusIcon = user.status === 'alive' ? '🟢' : user.status === 'eliminated' ? '💀' : '❌';
                console.log(`${statusIcon} ${user.displayName}: ${user.status.toUpperCase()} - ${user.reason}`);
                if (user.teamsUsed) {
                    console.log(`   Teams used: ${user.teamsUsed.join(', ')}`);
                }
            });

            const alive = results.filter(r => r.status === 'alive').length;
            const dead = results.filter(r => r.status === 'eliminated').length;
            console.log(`📈 SUMMARY: ${alive} ALIVE, ${dead} ELIMINATED out of ${results.length} total`);

            return {
                totalUsers: results.length,
                alive: alive,
                eliminated: dead,
                results: results
            };
        } catch (error) {
            console.error('❌ Test failed:', error);
            return { error: error.message };
        }
    };

    // EMERGENCY MANUAL INIT FUNCTION
    window.initBulletproofSurvivor = async function() {
        console.log('🚨 MANUAL: Forcing bulletproof survivor initialization');
        window.currentWeek = 2;
        if (window.db) {
            await initializeBulletproofChecker();
            console.log('✅ MANUAL: Bulletproof survivor should now be initialized');
            return 'Initialization complete - try testSurvivorSystem() now';
        } else {
            console.log('❌ MANUAL: Firebase database not ready');
            return 'Firebase database not ready';
        }
    };
}

// IMMEDIATE GLOBAL FUNCTION AVAILABILITY (outside async)
window.initBulletproofSurvivor = async function() {
    console.log('🚨 MANUAL: Forcing bulletproof survivor initialization');
    window.currentWeek = 2;
    if (window.db) {
        if (typeof initializeBulletproofChecker === 'function') {
            await initializeBulletproofChecker();
            console.log('✅ MANUAL: Bulletproof survivor should now be initialized');
            return 'Initialization complete - try testSurvivorSystem() now';
        } else {
            return 'Error: initializeBulletproofChecker function not found';
        }
    } else {
        console.log('❌ MANUAL: Firebase database not ready');
        return 'Firebase database not ready';
    }
};

window.checkBulletproofStatus = function() {
    console.log('🔍 BULLETPROOF STATUS CHECK:');
    console.log('- Script loaded:', true);
    console.log('- initBulletproofSurvivor available:', typeof window.initBulletproofSurvivor);
    console.log('- testSurvivorSystem available:', typeof window.testSurvivorSystem);
    console.log('- bulletproofSurvivorChecker exists:', !!window.bulletproofSurvivorChecker);
    console.log('- Firebase db ready:', !!window.db);
    console.log('- Current week:', window.currentWeek);
    return 'Status check complete - see console output above';
};

// AGGRESSIVE INITIALIZATION - Try multiple approaches
if (typeof window !== 'undefined') {
    // FORCE Week 2 immediately
    window.currentWeek = 2;
    console.log('🔄 FORCED: Set currentWeek to 2 for survivor logic');

    // Try immediate initialization if db exists
    if (window.db) {
        initializeBulletproofChecker();
    }

    // Try on DOM ready
    document.addEventListener('DOMContentLoaded', initializeBulletproofChecker);

    // Try every 500ms for up to 10 seconds
    let attempts = 0;
    const maxAttempts = 20;
    const initInterval = setInterval(() => {
        attempts++;
        if (window.db && !window.bulletproofSurvivorChecker) {
            console.log(`🔄 RETRY: Bulletproof init attempt ${attempts}/${maxAttempts}`);
            initializeBulletproofChecker();
            clearInterval(initInterval);
        } else if (attempts >= maxAttempts) {
            console.log('❌ TIMEOUT: Bulletproof checker initialization failed after 10 seconds');
            clearInterval(initInterval);
        }
    }, 500);

    // Final fallback after 3 seconds
    setTimeout(() => {
        if (!window.bulletproofSurvivorChecker && window.db) {
            console.log('🚨 EMERGENCY: Final attempt to initialize bulletproof checker');
            initializeBulletproofChecker();
        }
    }, 3000);
}