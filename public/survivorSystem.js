// Clean Survivor System - Simple, Reliable Architecture
// Replaces all the broken patch layers with clean logic

class SurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = 1; // Simple, clear week management
    }

    // Simple game matching: user pick -> find their game -> check winner
    async checkUserSurvival(userPick, weekResults) {
        if (!userPick || !userPick.team) {
            return { status: 'eliminated', reason: 'No pick made' };
        }

        // Find the game the user picked
        const gameId = userPick.gameId;
        if (!gameId) {
            return { status: 'eliminated', reason: 'Invalid pick - no game ID' };
        }

        const game = weekResults[gameId];
        if (!game) {
            return { status: 'pending', reason: 'Game not found in results' };
        }

        if (!game.winner || game.winner === 'TBD') {
            return { status: 'pending', reason: 'Game not finished' };
        }

        // Simple comparison: did user's team win?
        if (game.winner === userPick.team) {
            return { status: 'survived', reason: `${userPick.team} won` };
        } else {
            return { status: 'eliminated', reason: `${userPick.team} lost to ${game.winner}` };
        }
    }

    // Get pool members and their survival status
    async getPoolSurvivalStatus(poolId) {
        try {
            // Get pool members
            const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`));
            if (!poolDoc.exists()) {
                throw new Error('Pool not found');
            }
            const poolMembers = poolDoc.data();

            // Get week results
            const weekResultsDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdfootball_games/${this.currentWeek}`));
            const weekResults = weekResultsDoc.exists() ? weekResultsDoc.data() : {};

            // Get elimination status
            const statusDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`));
            const allStatuses = statusDoc.exists() ? statusDoc.data() : {};

            const results = [];

            for (const [uid, member] of Object.entries(poolMembers)) {
                // Check if already eliminated
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

                // Get user's pick for current week
                const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`));
                const picks = picksDoc.exists() ? picksDoc.data().picks || {} : {};
                const userPick = picks[this.currentWeek];

                // Check survival for this week
                const survival = await this.checkUserSurvival(userPick, weekResults);

                results.push({
                    uid,
                    displayName: member.displayName || member.email,
                    status: survival.status,
                    reason: survival.reason,
                    currentPick: userPick?.team || 'No pick',
                    gameId: userPick?.gameId,
                    isEliminated: survival.status === 'eliminated'
                });

                // If newly eliminated, update status
                if (survival.status === 'eliminated' && !currentStatus?.eliminated) {
                    await this.eliminateUser(uid, this.currentWeek, survival.reason);
                }
            }

            return results;

        } catch (error) {
            console.error('Error getting pool survival status:', error);
            throw error;
        }
    }

    // Simple elimination: mark user as eliminated
    async eliminateUser(uid, week, reason) {
        try {
            const statusRef = doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`);
            await setDoc(statusRef, {
                [`${uid}.eliminated`]: true,
                [`${uid}.eliminatedWeek`]: week,
                [`${uid}.eliminationReason`]: reason,
                [`${uid}.eliminatedDate`]: new Date().toISOString()
            }, { merge: true });

            console.log(`✅ User ${uid} eliminated in Week ${week}: ${reason}`);
        } catch (error) {
            console.error('Error eliminating user:', error);
            throw error;
        }
    }

    // Simple summary counts
    getSummaryStats(results) {
        const total = results.length;
        const eliminated = results.filter(r => r.status === 'eliminated').length;
        const alive = total - eliminated;

        return {
            total,
            alive,
            eliminated,
            currentWeek: this.currentWeek
        };
    }

    // Simple display formatting
    formatUserForDisplay(user) {
        const rowClass = user.isEliminated ? 'survivor-eliminated bg-red-50' : 'survivor-active bg-white';
        const statusBadge = user.isEliminated 
            ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                 <i class="fas fa-skull mr-1"></i> Eliminated Week ${user.eliminatedWeek}
               </span>`
            : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                 <i class="fas fa-heart mr-1"></i> Active
               </span>`;

        return {
            rowClass,
            statusBadge,
            currentPick: user.currentPick || 'No pick',
            reason: user.reason || ''
        };
    }
}

// Global instance
window.survivorSystem = null;

// Initialize function with retry logic
async function initializeSurvivorSystem(retryCount = 0) {
    const maxRetries = 10;
    const retryDelay = 500; // 500ms
    
    if (typeof window.db === 'undefined') {
        if (retryCount < maxRetries) {
            console.log(`🔄 Firebase db not ready yet, retry ${retryCount + 1}/${maxRetries} in ${retryDelay}ms`);
            setTimeout(() => initializeSurvivorSystem(retryCount + 1), retryDelay);
            return;
        } else {
            console.error('❌ Firebase db not available for survivor system after maximum retries');
            return;
        }
    }

    window.survivorSystem = new SurvivorSystem(window.db);
    console.log('✅ Clean Survivor System initialized');
}

// Auto-initialize when DOM is ready with delayed start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Add a small delay to allow Firebase to initialize
        setTimeout(initializeSurvivorSystem, 100);
    });
} else {
    // Add a small delay to allow Firebase to initialize
    setTimeout(initializeSurvivorSystem, 100);
}