/**
 * 🔄 SURVIVOR RECALCULATOR - Fix All Elimination Logic
 *
 * Recalculates all survivor eliminations using the corrected ESPN mapping and team names.
 * This will fix the "wrong winners logic" mentioned by the user.
 */

class SurvivorRecalculator {
    constructor() {
        this.survivorSystem = null;
        this.currentWeek = this.calculateCurrentWeek();
        this.poolId = 'nerduniverse-2025';
    }

    // Calculate current week based on season start
    calculateCurrentWeek() {
        const seasonStart = new Date('2025-09-04');
        const now = new Date();
        const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
        const week = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
        return week;
    }

    // Check if it's past Thursday (games can be revealed)
    isAfterThursday() {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 4 = Thursday
        const hour = now.getHours();

        // If it's Friday (5), Saturday (6), Sunday (0), Monday (1), Tuesday (2), Wednesday (3)
        // OR if it's Thursday (4) after 8 PM
        const isAfterThursday = dayOfWeek >= 5 || dayOfWeek <= 3 || (dayOfWeek === 4 && hour >= 20);

        return isAfterThursday;
    }

    // Initialize the survivor system
    async init() {

        // Wait for Firebase to be ready
        await this.waitForFirebase();

        // Initialize survivor system
        if (window.SurvivorSystem) {
            this.survivorSystem = new window.SurvivorSystem(window.db);
        } else {
            throw new Error('SurvivorSystem not available');
        }

    }

    // Wait for Firebase to be ready
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;

            const checkFirebase = () => {
                attempts++;

                if (window.doc && window.getDoc && window.db && window.SurvivorSystem) {
                    resolve();
                    return;
                }

                if (attempts >= maxAttempts) {
                    reject(new Error('Firebase/SurvivorSystem initialization timeout'));
                    return;
                }

                setTimeout(checkFirebase, 100);
            };

            checkFirebase();
        });
    }

    // Main function: Recalculate all survivor eliminations
    async recalculateAllEliminations() {
        try {

            await this.init();

            // Get all pool members
            const poolDoc = await window.getDoc(window.doc(window.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`));
            if (!poolDoc.exists()) {
                throw new Error('Pool members not found');
            }

            const poolMembers = poolDoc.data();
            const recalculatedData = {};
            let recalculationSummary = {
                totalPlayers: 0,
                alive: 0,
                eliminated: 0,
                changes: []
            };


            // Process each member
            for (const [userId, member] of Object.entries(poolMembers)) {
                try {
                    recalculationSummary.totalPlayers++;

                    const userResult = await this.recalculateUserElimination(userId, member);
                    recalculatedData[userId] = userResult;

                    if (userResult.isAlive) {
                        recalculationSummary.alive++;
                    } else {
                        recalculationSummary.eliminated++;
                    }

                    // Track if this is a change from stored data
                    const storedData = member.survivor || {};
                    const wasAlive = storedData.alive === 18;
                    const nowAlive = userResult.isAlive;

                    if (wasAlive !== nowAlive) {
                        recalculationSummary.changes.push({
                            userId,
                            name: member.displayName || member.email,
                            before: wasAlive ? 'alive' : 'eliminated',
                            after: nowAlive ? 'alive' : 'eliminated',
                            reason: userResult.eliminationReason
                        });
                    }


                } catch (error) {
                    console.error(`❌ Error processing user ${userId}:`, error);
                }
            }


            if (recalculationSummary.changes.length > 0) {
                recalculationSummary.changes.forEach(change => {
                });
            }

            return {
                recalculatedData,
                summary: recalculationSummary,
                isAfterThursday: this.isAfterThursday()
            };

        } catch (error) {
            console.error('❌ Error in survivor recalculation:', error);
            throw error;
        }
    }

    // Recalculate elimination status for a single user
    async recalculateUserElimination(userId, member) {
        const result = {
            userId,
            name: member.displayName || member.email || 'Unknown',
            isAlive: true,
            eliminationWeek: null,
            eliminationReason: null,
            pickHistory: [],
            totalPicks: 0
        };

        try {
            // Get user's picks for all weeks
            const picksDoc = await window.getDoc(window.doc(window.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`));
            const allPicks = picksDoc.exists() ? (picksDoc.data().picks || {}) : {};

            // Process each week sequentially to find elimination
            for (let week = 1; week <= this.currentWeek; week++) {
                const weekPick = allPicks[week];

                if (!weekPick || !weekPick.team) {
                    // No pick made - user is eliminated
                    result.isAlive = false;
                    result.eliminationWeek = week;
                    result.eliminationReason = `No pick made for Week ${week}`;
                    break;
                }

                // Add to pick history
                result.pickHistory.push(weekPick.team);
                result.totalPicks++;

                // Get ESPN results for this week
                this.survivorSystem.currentWeek = week;
                const weekResults = await this.survivorSystem.getESPNWeekResults(week);

                // Check if user survived this week
                const survival = await this.survivorSystem.checkUserSurvival(weekPick, weekResults);

                if (survival.status === 'eliminated') {
                    result.isAlive = false;
                    result.eliminationWeek = week;
                    result.eliminationReason = survival.reason;
                    break;
                } else if (survival.status === 'pending') {
                    // Game not finished yet - user is still alive but may be eliminated later
                    break;
                }

                // User survived this week, continue to next week
            }

        } catch (error) {
            console.error(`❌ Error recalculating user ${userId}:`, error);
            // Default to eliminated if we can't determine status
            result.isAlive = false;
            result.eliminationWeek = 1;
            result.eliminationReason = 'Error calculating status';
        }

        return result;
    }

    // Apply recalculated data to update the battlefield display
    async applyRecalculatedData(recalculatedData) {
        try {

            // Update the battlefield display with fresh data
            if (window.survivorBattlefield) {
                // Override the processBattlefieldData method to use our recalculated data
                const originalData = await this.convertRecalculatedDataToBattlefieldFormat(recalculatedData);

                // Update the battlefield display
                window.survivorBattlefield.updateBattlefieldStats(originalData);
                window.survivorBattlefield.renderBattlefieldDisplay(originalData);

            }

        } catch (error) {
            console.error('❌ Error applying recalculated data:', error);
        }
    }

    // Convert recalculated data to battlefield display format
    async convertRecalculatedDataToBattlefieldFormat(recalculatedData) {
        const living = [];
        const dead = [];

        for (const [userId, userData] of Object.entries(recalculatedData.recalculatedData)) {
            const playerData = {
                userId,
                name: userData.name,
                email: '', // Not needed for display
                isAlive: userData.isAlive,
                pickHistory: userData.pickHistory.join(', '),
                totalPicks: userData.totalPicks,
                eliminationWeek: userData.eliminationWeek,
                lastUpdated: new Date().toISOString(),
                helmets: this.buildHelmetDisplay(userData),
                currentWeekPick: this.getCurrentWeekPick(userData)
            };

            if (userData.isAlive) {
                living.push(playerData);
            } else {
                dead.push(playerData);
            }
        }

        // Sort alphabetically
        living.sort((a, b) => a.name.localeCompare(b.name));
        dead.sort((a, b) => a.name.localeCompare(b.name));

        return {
            living,
            dead,
            stats: {
                total: living.length + dead.length,
                alive: living.length,
                eliminated: dead.length,
                survivalRate: living.length + dead.length > 0 ? Math.round((living.length / (living.length + dead.length)) * 100) : 0
            }
        };
    }

    // Build helmet display for recalculated data
    buildHelmetDisplay(userData) {
        const helmets = [];

        userData.pickHistory.forEach((teamName, index) => {
            const week = index + 1;

            // Only show helmets for completed weeks or if after Thursday
            if (week < this.currentWeek || this.isAfterThursday()) {
                helmets.push({
                    teamName,
                    week,
                    helmetClass: this.getHelmetClass(teamName),
                    isKillerHelmet: !userData.isAlive && userData.eliminationWeek === week,
                    tooltip: !userData.isAlive && userData.eliminationWeek === week
                        ? `This team eliminated ${userData.name} in Week ${week}`
                        : `Week ${week}: ${teamName}`
                });
            }
        });

        return helmets;
    }

    // Get current week pick display
    getCurrentWeekPick(userData) {
        const isAfterThursday = this.isAfterThursday();
        const hasCurrentWeekPick = userData.pickHistory.length >= this.currentWeek;

        if (isAfterThursday && hasCurrentWeekPick) {
            const currentPick = userData.pickHistory[this.currentWeek - 1];
            return {
                isHidden: false,
                displayText: `🏈`, // Show helmet icon or team name
                tooltip: `Week ${this.currentWeek}: ${currentPick}`,
                teamName: currentPick
            };
        } else {
            return {
                isHidden: true,
                displayText: '🤔',
                tooltip: 'Pick hidden until Thursday'
            };
        }
    }

    // Get helmet CSS class for team
    getHelmetClass(teamName) {
        const teamToHelmetMap = {
            'Arizona Cardinals': 'ari',
            'Atlanta Falcons': 'atl',
            'Baltimore Ravens': 'bal',
            'Buffalo Bills': 'buf',
            'Carolina Panthers': 'car',
            'Chicago Bears': 'chi',
            'Cincinnati Bengals': 'cin',
            'Cleveland Browns': 'cle',
            'Dallas Cowboys': 'dal',
            'Denver Broncos': 'den',
            'Detroit Lions': 'det',
            'Green Bay Packers': 'gb',
            'Houston Texans': 'hou',
            'Indianapolis Colts': 'ind',
            'Jacksonville Jaguars': 'jax',
            'Kansas City Chiefs': 'kc',
            'Las Vegas Raiders': 'lv',
            'Los Angeles Chargers': 'lac',
            'Los Angeles Rams': 'lar',
            'Miami Dolphins': 'mia',
            'Minnesota Vikings': 'min',
            'New England Patriots': 'ne',
            'New Orleans Saints': 'no',
            'New York Giants': 'nyg',
            'New York Jets': 'nyj',
            'Philadelphia Eagles': 'phi',
            'Pittsburgh Steelers': 'pit',
            'San Francisco 49ers': 'sf',
            'Seattle Seahawks': 'sea',
            'Tampa Bay Buccaneers': 'tb',
            'Tennessee Titans': 'ten',
            'Washington Commanders': 'was'
        };

        return teamToHelmetMap[teamName] || 'default';
    }
}

// Global function to trigger recalculation
window.recalculateSurvivorEliminations = async function() {
    try {

        const recalculator = new SurvivorRecalculator();
        const results = await recalculator.recalculateAllEliminations();


        // Apply the recalculated data to update the display
        await recalculator.applyRecalculatedData(results);

        return results;

    } catch (error) {
        console.error('❌ RECALCULATION FAILED:', error);
        throw error;
    }
};

// Auto-initialize and expose globally
window.SurvivorRecalculator = SurvivorRecalculator;

