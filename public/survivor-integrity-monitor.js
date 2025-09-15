// DIAMOND LEVEL: Survivor System Integrity Monitor
// Prevents incorrect eliminations through continuous validation and auto-correction

class SurvivorIntegrityMonitor {
    constructor(db) {
        this.db = db;
        this.poolId = 'nerduniverse-2025';
        this.validationInterval = null;
        this.integrityErrors = [];
        this.autoCorrectEnabled = true;
    }

    // Start continuous monitoring
    startMonitoring() {
        console.log('🛡️ Starting Survivor Integrity Monitor...');

        // Run initial validation
        this.validateAllUsers();

        // Set up periodic validation (every 5 minutes)
        this.validationInterval = setInterval(() => {
            this.validateAllUsers();
        }, 5 * 60 * 1000);

        console.log('✅ Integrity Monitor active - validating every 5 minutes');
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.validationInterval) {
            clearInterval(this.validationInterval);
            this.validationInterval = null;
            console.log('🛑 Integrity Monitor stopped');
        }
    }

    // Validate all users in the pool
    async validateAllUsers() {
        try {
            console.log('🔍 Running integrity validation...');

            const { doc, getDoc } = window.firestoreImports;

            // Get pool members
            const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`));
            if (!poolDoc.exists()) {
                this.logError('Pool members document not found');
                return;
            }

            const members = poolDoc.data();
            const userIds = Object.keys(members);

            console.log(`📋 Validating ${userIds.length} pool members...`);

            for (const userId of userIds) {
                await this.validateUser(userId, members[userId]);
            }

            if (this.integrityErrors.length === 0) {
                console.log('✅ All users passed integrity validation');
            } else {
                console.warn(`⚠️ Found ${this.integrityErrors.length} integrity issues`);
                this.reportErrors();
            }

        } catch (error) {
            console.error('❌ Integrity validation failed:', error);
            this.logError(`Validation error: ${error.message}`);
        }
    }

    // Validate a specific user
    async validateUser(userId, userInfo) {
        try {
            const { doc, getDoc } = window.firestoreImports;

            // Get user's picks
            const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`));
            if (!picksDoc.exists()) {
                this.logError(`User ${userInfo.displayName} (${userId}) has no picks document`);
                return;
            }

            const picks = picksDoc.data().picks || {};

            // Get current status
            const statusDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${this.poolId}/survivor/${userId}`));
            const currentStatus = statusDoc.exists() ? statusDoc.data() : null;

            // Calculate what status should be
            const calculatedStatus = await this.calculateCorrectStatus(picks);

            // Compare current vs calculated
            const statusMismatch = this.detectStatusMismatch(currentStatus, calculatedStatus);

            if (statusMismatch) {
                const error = {
                    userId,
                    userName: userInfo.displayName,
                    currentStatus: currentStatus ? (currentStatus.eliminated ? 'ELIMINATED' : 'ALIVE') : 'NO STATUS',
                    calculatedStatus: calculatedStatus.eliminated ? 'ELIMINATED' : 'ALIVE',
                    issue: statusMismatch,
                    timestamp: new Date().toISOString()
                };

                this.integrityErrors.push(error);

                // Auto-correct if enabled
                if (this.autoCorrectEnabled) {
                    await this.autoCorrectUser(userId, calculatedStatus, error);
                }
            }

        } catch (error) {
            this.logError(`User validation failed for ${userId}: ${error.message}`);
        }
    }

    // Calculate what user's status should be based on picks and game results
    async calculateCorrectStatus(picks) {
        const status = {
            eliminated: false,
            eliminatedWeek: null,
            eliminationReason: null,
            calculation: []
        };

        // Check each week's pick
        for (let week = 1; week <= 3; week++) {
            const pick = picks[week];

            if (!pick) {
                status.eliminated = true;
                status.eliminatedWeek = week;
                status.eliminationReason = `No pick made for Week ${week}`;
                status.calculation.push(`Week ${week}: NO PICK - ELIMINATED`);
                break;
            }

            // Get ESPN results for this week
            if (window.espnNerdApi) {
                try {
                    const weekGames = await window.espnNerdApi.getWeekGames(week, false); // Use cache for integrity check
                    const gameResult = this.findGameForPick(pick, weekGames.games);

                    if (gameResult && gameResult.status?.toLowerCase() === 'final') {
                        const userWon = this.didUserWinGame(pick, gameResult);

                        if (userWon) {
                            status.calculation.push(`Week ${week}: ${pick.team} WON - SURVIVED`);
                        } else {
                            status.eliminated = true;
                            status.eliminatedWeek = week;
                            status.eliminationReason = `${pick.team} lost in Week ${week}`;
                            status.calculation.push(`Week ${week}: ${pick.team} LOST - ELIMINATED`);
                            break;
                        }
                    } else {
                        status.calculation.push(`Week ${week}: ${pick.team} - GAME PENDING`);
                    }
                } catch (error) {
                    status.calculation.push(`Week ${week}: ESPN data error - ${error.message}`);
                }
            }
        }

        return status;
    }

    // Find the ESPN game result for a user's pick
    findGameForPick(pick, espnGames) {
        if (!espnGames) return null;

        return espnGames.find(game => {
            const homeMatch = this.normalizeTeamName(game.home_team) === this.normalizeTeamName(pick.team);
            const awayMatch = this.normalizeTeamName(game.away_team) === this.normalizeTeamName(pick.team);
            return homeMatch || awayMatch;
        });
    }

    // Determine if user won their game
    didUserWinGame(pick, gameResult) {
        const homeWon = (gameResult.home_score || 0) > (gameResult.away_score || 0);
        const userPickedHome = this.normalizeTeamName(pick.team) === this.normalizeTeamName(gameResult.home_team);

        return userPickedHome ? homeWon : !homeWon;
    }

    // Normalize team names for comparison
    normalizeTeamName(teamName) {
        if (!teamName) return '';
        return teamName.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/patriots/g, 'patriots')
            .replace(/newengland/g, 'patriots')
            .replace(/ne$/g, 'patriots');
    }

    // Detect if there's a status mismatch
    detectStatusMismatch(currentStatus, calculatedStatus) {
        if (!currentStatus) {
            return 'No status document exists';
        }

        const currentEliminated = currentStatus.eliminated || false;
        const calculatedEliminated = calculatedStatus.eliminated;

        if (currentEliminated !== calculatedEliminated) {
            if (currentEliminated && !calculatedEliminated) {
                return 'User incorrectly marked as ELIMINATED (should be ALIVE)';
            } else {
                return 'User incorrectly marked as ALIVE (should be ELIMINATED)';
            }
        }

        return null; // No mismatch
    }

    // Auto-correct a user's status
    async autoCorrectUser(userId, correctStatus, error) {
        try {
            console.log(`🔧 Auto-correcting user ${error.userName}...`);

            const { doc, setDoc } = window.firestoreImports;

            const statusData = {
                eliminated: correctStatus.eliminated,
                eliminatedWeek: correctStatus.eliminatedWeek,
                eliminationReason: correctStatus.eliminationReason,
                lastUpdated: new Date().toISOString(),
                autoCorrection: true,
                correctionReason: error.issue,
                correctionTimestamp: new Date().toISOString(),
                calculationDetails: correctStatus.calculation
            };

            await setDoc(doc(this.db, `artifacts/nerdfootball/pools/${this.poolId}/survivor/${userId}`), statusData);

            console.log(`✅ Auto-corrected ${error.userName}: ${correctStatus.eliminated ? 'ELIMINATED' : 'ALIVE'}`);

            // Clear caches to reflect change
            this.clearCaches();

        } catch (error) {
            console.error(`❌ Auto-correction failed for user ${userId}:`, error);
            this.logError(`Auto-correction failed: ${error.message}`);
        }
    }

    // Clear all caches
    clearCaches() {
        localStorage.clear();
        sessionStorage.clear();
        console.log('🧹 Caches cleared after auto-correction');
    }

    // Log an integrity error
    logError(message) {
        const error = {
            message,
            timestamp: new Date().toISOString(),
            type: 'integrity_error'
        };

        this.integrityErrors.push(error);
        console.error('🚨 INTEGRITY ERROR:', message);
    }

    // Report all errors
    reportErrors() {
        console.group('🚨 INTEGRITY ERRORS DETECTED');
        this.integrityErrors.forEach((error, index) => {
            console.error(`${index + 1}. ${error.message || error.issue}`, error);
        });
        console.groupEnd();

        // Optionally send errors to monitoring system
        this.sendErrorsToMonitoring();
    }

    // Send errors to monitoring system (placeholder for future implementation)
    sendErrorsToMonitoring() {
        // TODO: Implement error reporting to external monitoring
        console.log('📡 Error reporting to monitoring system (placeholder)');
    }

    // Manual integrity check for specific user
    async checkSpecificUser(userId) {
        console.log(`🔍 Running manual integrity check for user ${userId}...`);

        this.integrityErrors = []; // Clear previous errors

        const { doc, getDoc } = window.firestoreImports;
        const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`));

        if (poolDoc.exists()) {
            const members = poolDoc.data();
            const userInfo = members[userId];

            if (userInfo) {
                await this.validateUser(userId, userInfo);

                if (this.integrityErrors.length === 0) {
                    console.log('✅ User passed integrity check');
                    return { status: 'valid', errors: [] };
                } else {
                    console.warn('⚠️ User failed integrity check');
                    this.reportErrors();
                    return { status: 'invalid', errors: this.integrityErrors };
                }
            } else {
                console.error('❌ User not found in pool');
                return { status: 'not_found', errors: [] };
            }
        }
    }

    // Get integrity status
    getStatus() {
        return {
            monitoring: this.validationInterval !== null,
            autoCorrectEnabled: this.autoCorrectEnabled,
            errorCount: this.integrityErrors.length,
            lastCheck: new Date().toISOString()
        };
    }
}

// Global instance
window.survivorIntegrityMonitor = new SurvivorIntegrityMonitor(window.db);

// Auto-initialization when Firebase is ready
const initMonitor = () => {
    if (window.db && window.firestoreImports) {
        console.log('🛡️ Survivor Integrity Monitor initialized');
        console.log('📋 Available commands:');
        console.log('  survivorIntegrityMonitor.startMonitoring() - Start continuous monitoring');
        console.log('  survivorIntegrityMonitor.stopMonitoring() - Stop monitoring');
        console.log('  survivorIntegrityMonitor.validateAllUsers() - Run manual validation');
        console.log('  survivorIntegrityMonitor.checkSpecificUser("userId") - Check specific user');
        console.log('  survivorIntegrityMonitor.getStatus() - Get monitor status');
    } else {
        setTimeout(initMonitor, 1000);
    }
};

initMonitor();