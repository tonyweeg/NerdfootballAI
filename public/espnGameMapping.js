// ESPN to NerdFootball Game ID Mapping System
// Auto-generated mapping for 2025 season

window.espnGameMapping = {
    // Week 1 Games (101-116)
    "101": "401772936", "102": "401772725", "103": "401772834", "104": "401772835",
    "105": "401772724", "106": "401772728", "107": "401772833", "108": "401772727",
    "109": "401772836", "110": "401772726", "111": "401772729", "112": "401772730",
    "113": "401772837", "114": "401772919", "115": "401772715", "116": "401772811",

    // Week 2 Games (201-216)
    "201": "401772936", "202": "401772725", "203": "401772834", "204": "401772835",
    "205": "401772724", "206": "401772728", "207": "401772833", "208": "401772727",
    "209": "401772836", "210": "401772726", "211": "401772729", "212": "401772730",
    "213": "401772837", "214": "401772919", "215": "401772715", "216": "401772811",

    // Weeks 3-18 use positional mapping (no static ESPN IDs needed)
    // The sync system will map by position: Week X Game Y = ESPN games[Y-1]
};

// Automated ESPN Winner Sync System
window.espnWinnerSync = {
    // Sync ESPN winners to our game format
    async syncWeekWinners(week) {
        try {
            console.log(`🔄 Syncing ESPN winners for Week ${week}...`);

            if (!window.espnNerdApi) {
                throw new Error('ESPN API not available');
            }

            const espnData = await window.espnNerdApi.getCurrentWeekScores(week);
            if (!espnData || !espnData.games) {
                throw new Error(`No ESPN data for Week ${week}`);
            }

            const updates = {};
            let syncedCount = 0;

            // Use positional mapping - ESPN game index maps to our game ID
            for (let gameIndex = 0; gameIndex < espnData.games.length && gameIndex < 16; gameIndex++) {
                const ourGameId = `${week}${String(gameIndex + 1).padStart(2, '0')}`;
                const espnGame = espnData.games[gameIndex];

                if (espnGame && espnGame.status === 'STATUS_FINAL' && espnGame.home_score && espnGame.away_score) {
                    const homeScore = parseInt(espnGame.home_score);
                    const awayScore = parseInt(espnGame.away_score);
                    const winner = homeScore > awayScore ? espnGame.home_team : espnGame.away_team;

                    updates[ourGameId] = {
                        homeTeam: espnGame.home_team,
                        awayTeam: espnGame.away_team,
                        homeScore: homeScore,
                        awayScore: awayScore,
                        winner: winner,
                        status: 'FINAL',
                        espnId: espnGame.id,
                        lastSynced: new Date().toISOString()
                    };

                    syncedCount++;
                    console.log(`✅ ${ourGameId}: ${winner} wins (${homeScore}-${awayScore})`);
                }
            }

            if (syncedCount > 0) {
                // Save to both data paths for compatibility
                const primaryPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
                const legacyPath = `artifacts/nerdfootball/public/data/nerdfootball_results/${week}`;

                await setDoc(doc(db, primaryPath), updates, { merge: true });
                await setDoc(doc(db, legacyPath), updates, { merge: true });

                console.log(`🎉 Successfully synced ${syncedCount} completed games for Week ${week}`);

                // Trigger survivor pool update if available
                if (window.survivorSystem && window.survivorSystem.refreshStats) {
                    await window.survivorSystem.refreshStats();
                }

                return { success: true, synced: syncedCount, updates };
            } else {
                console.log(`📅 No completed games found for Week ${week}`);
                return { success: true, synced: 0, updates: {} };
            }

        } catch (error) {
            console.error(`❌ ESPN sync failed for Week ${week}:`, error);
            return { success: false, error: error.message };
        }
    },

    // Auto-sync all current weeks
    async autoSyncCurrentWeeks() {
        try {
            console.log('🚀 Starting auto-sync of all 18 weeks...');

            const results = {};

            // Sync all 18 weeks of the season
            for (let week = 1; week <= 18; week++) {
                console.log(`📡 Syncing Week ${week}...`);
                results[week] = await this.syncWeekWinners(week);

                // Small delay between weeks to avoid rate limiting
                if (week < 18) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            const totalSynced = Object.values(results).reduce((sum, result) => sum + (result.synced || 0), 0);
            const weeksWithData = Object.values(results).filter(result => result.synced > 0).length;
            console.log(`🎯 Auto-sync complete: ${totalSynced} total games synced across ${weeksWithData} weeks`);

            return results;

        } catch (error) {
            console.error('❌ Auto-sync failed:', error);
            return { error: error.message };
        }
    },

    // Clean contaminated ESPN IDs from existing data
    async cleanContaminatedData(week) {
        try {
            console.log(`🧹 Cleaning contaminated ESPN IDs from Week ${week}...`);

            const primaryPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
            const legacyPath = `artifacts/nerdfootball/public/data/nerdfootball_results/${week}`;

            // Read current data
            const doc = await getDoc(doc(db, primaryPath));
            if (!doc.exists()) {
                console.log(`📅 No data found for Week ${week}`);
                return { success: true, cleaned: 0 };
            }

            const currentData = doc.data();
            const cleanData = {};
            let cleanedCount = 0;

            // Keep only our clean game IDs (week + 01-16 format)
            Object.entries(currentData).forEach(([gameId, gameData]) => {
                if (gameId.match(/^[1-9]\d{2}$/)) { // Our format: 101, 102, 201, etc.
                    cleanData[gameId] = gameData;
                } else {
                    console.log(`🗑️ Removing contaminated game ID: ${gameId}`);
                    cleanedCount++;
                }
            });

            if (cleanedCount > 0) {
                // Save clean data to both paths
                await setDoc(doc(db, primaryPath), cleanData);
                await setDoc(doc(db, legacyPath), cleanData);

                console.log(`✅ Cleaned ${cleanedCount} contaminated IDs from Week ${week}`);
                return { success: true, cleaned: cleanedCount };
            } else {
                console.log(`✨ Week ${week} already clean`);
                return { success: true, cleaned: 0 };
            }

        } catch (error) {
            console.error(`❌ Clean failed for Week ${week}:`, error);
            return { success: false, error: error.message };
        }
    },

    // Clean and sync all weeks
    async cleanAndSyncAllWeeks() {
        try {
            console.log('🧹 Starting clean and sync of all 18 weeks...');

            const results = {};
            let totalCleaned = 0;
            let totalSynced = 0;

            // First pass: Clean contaminated data
            for (let week = 1; week <= 18; week++) {
                console.log(`🧹 Cleaning Week ${week}...`);
                const cleanResult = await this.cleanContaminatedData(week);
                if (cleanResult.success) {
                    totalCleaned += cleanResult.cleaned;
                }

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            console.log(`✅ Cleaning complete: ${totalCleaned} contaminated IDs removed`);

            // Second pass: Sync clean ESPN data
            for (let week = 1; week <= 18; week++) {
                console.log(`📡 Syncing Week ${week}...`);
                results[week] = await this.syncWeekWinners(week);
                if (results[week].success) {
                    totalSynced += results[week].synced;
                }

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const weeksWithData = Object.values(results).filter(result => result.synced > 0).length;
            console.log(`🎯 Clean and sync complete!`);
            console.log(`🧹 Cleaned: ${totalCleaned} contaminated IDs`);
            console.log(`📡 Synced: ${totalSynced} games across ${weeksWithData} weeks`);

            return { success: true, totalCleaned, totalSynced, results };

        } catch (error) {
            console.error('❌ Clean and sync failed:', error);
            return { success: false, error: error.message };
        }
    }
};

// Initialize mapping system when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 ESPN Game Mapping System loaded');

    // Auto-run sync if ESPN API is available
    if (window.espnNerdApi) {
        // Run initial sync after 2 seconds to allow other systems to load
        setTimeout(() => {
            window.espnWinnerSync.autoSyncCurrentWeeks();
        }, 2000);
    }
});