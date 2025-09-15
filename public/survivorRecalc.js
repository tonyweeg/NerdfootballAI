// DIAMOND LEVEL: Survivor System Recalculation Script
// Forces recalculation of all survivor statuses using the fixed week-isolation logic

class SurvivorRecalculator {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.currentWeek = 1;
    }

    // Force complete recalculation of all survivor statuses
    async forceRecalculation() {
        console.log('🔄 STARTING: Survivor status recalculation with fixed logic...');

        try {
            // Ensure survivor system is available
            if (!window.survivorSystem) {
                console.log('⚠️ SurvivorSystem not found, initializing...');
                window.survivorSystem = new SurvivorSystem(window.db);
            }

            // Get current survival status with fixed logic
            console.log('📊 Calculating survival status with fixed getWeekGames logic...');
            const survivalResults = await window.survivorSystem.getPoolSurvivalStatus(this.poolId);

            console.log(`✅ Calculated status for ${survivalResults.length} users`);

            // Show summary
            const summary = window.survivorSystem.getSummaryStats(survivalResults);
            console.log('📈 SUMMARY:', summary);

            // Show detailed results
            console.log('\n👥 DETAILED RESULTS:');
            survivalResults.forEach(user => {
                const status = user.isEliminated ? '❌ ELIMINATED' : '✅ ALIVE';
                console.log(`${status} ${user.displayName}: ${user.reason}`);
            });

            // Check specific target user
            const targetUser = survivalResults.find(u => u.uid === 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1');
            if (targetUser) {
                console.log('\n🎯 TARGET USER STATUS:');
                console.log(`User: ${targetUser.displayName}`);
                console.log(`Status: ${targetUser.status}`);
                console.log(`Reason: ${targetUser.reason}`);
                console.log(`Pick: ${targetUser.currentPick}`);
                console.log(`Game ID: ${targetUser.gameId}`);
            }

            return survivalResults;

        } catch (error) {
            console.error('❌ Recalculation failed:', error);
            throw error;
        }
    }

    // Clear all cached data and force fresh calculation
    async clearCacheAndRecalculate() {
        console.log('🧹 Clearing all cache and forcing recalculation...');

        // Clear local storage
        localStorage.clear();

        // Clear any cached schedule data
        if (window.survivorSystem) {
            window.survivorSystem.cachedSchedule = null;
        }

        // Force ESPN data refresh for current weeks
        if (window.espnNerdApi) {
            console.log('🔄 Refreshing ESPN data...');
            await window.espnNerdApi.getWeekGames(1, true);
            await window.espnNerdApi.getWeekGames(2, true);
            await window.espnNerdApi.getWeekGames(3, true);
        }

        // Run recalculation
        return await this.forceRecalculation();
    }

    // Quick status check for a specific user
    async checkUserStatus(uid) {
        if (!window.survivorSystem) {
            window.survivorSystem = new SurvivorSystem(window.db);
        }

        const results = await window.survivorSystem.getPoolSurvivalStatus(this.poolId);
        const user = results.find(u => u.uid === uid);

        if (user) {
            console.log('👤 USER STATUS:');
            console.log(`Name: ${user.displayName}`);
            console.log(`Status: ${user.status}`);
            console.log(`Eliminated: ${user.isEliminated}`);
            console.log(`Reason: ${user.reason}`);
            console.log(`Current Pick: ${user.currentPick}`);
            console.log(`Game ID: ${user.gameId}`);
            return user;
        } else {
            console.log(`❌ User ${uid} not found`);
            return null;
        }
    }

    // Force reload of survivor page with fresh data
    async reloadSurvivorPage() {
        console.log('🔄 Reloading survivor page with fresh data...');
        await this.clearCacheAndRecalculate();
        window.location.href = './index.html?view=survivor';
    }
}

// Create global instance
window.survivorRecalc = new SurvivorRecalculator();

// Auto-initialization
console.log('✅ Survivor Recalculator loaded');
console.log('📋 Available commands:');
console.log('  survivorRecalc.forceRecalculation() - Recalculate all statuses');
console.log('  survivorRecalc.clearCacheAndRecalculate() - Clear cache and recalculate');
console.log('  survivorRecalc.checkUserStatus("aaG5Wc2JZkZJD1r7ozfJG04QRrf1") - Check specific user');
console.log('  survivorRecalc.reloadSurvivorPage() - Full refresh');