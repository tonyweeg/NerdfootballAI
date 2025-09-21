// ESPN to NerdFootball Game ID Mapping System
// Auto-generated mapping for 2025 season

window.espnGameMapping = {
    // Week 1 Games (101-116)
    "101": "401772936", "102": "401772725", "103": "401772834", "104": "401772835",
    "105": "401772724", "106": "401772728", "107": "401772833", "108": "401772727",
    "109": "401772836", "110": "401772726", "111": "401772729", "112": "401772730",
    "113": "401772837", "114": "401772919", "115": "401772715", "116": "401772811",

    // Week 2 Games (201-216) - FIXED: Use unique Week 2 ESPN IDs
    "201": "401773010", "202": "401773011", "203": "401773012", "204": "401773013",
    "205": "401773014", "206": "401773015", "207": "401773016", "208": "401773017",
    "209": "401773018", "210": "401773019", "211": "401773020", "212": "401773021",
    "213": "401773022", "214": "401773023", "215": "401773024", "216": "401773025",

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
                console.log(`📅 No ESPN data available for Week ${week}`);
                return { success: true, synced: 0, updates: {} };
            }

            // Skip if ESPN is returning cached data from a different week
            if (espnData.week && espnData.week !== week && week > 18) {
                console.log(`⚠️ ESPN returned Week ${espnData.week} data when requesting Week ${week} - skipping`);
                return { success: true, synced: 0, updates: {} };
            }

            const updates = {};
            let syncedCount = 0;

            // Get our local games for team matching (no more positional mapping!)
            const localResponse = await fetch(`nfl_2025_week_${week}.json`);
            const localWeekData = await localResponse.json();
            const localGames = localWeekData.games;

            // Use team-based matching instead of positional mapping
            localGames.forEach(localGame => {
                const espnGame = espnData.games.find(espn =>
                    espn.away_team === localGame.a && espn.home_team === localGame.h
                );

                if (espnGame && espnGame.status === 'STATUS_FINAL' && espnGame.home_score && espnGame.away_score) {
                    const homeScore = parseInt(espnGame.home_score);
                    const awayScore = parseInt(espnGame.away_score);
                    const winner = homeScore > awayScore ? espnGame.home_team : espnGame.away_team;

                    updates[localGame.id] = {
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
                    console.log(`✅ ${localGame.id}: ${winner} wins (${homeScore}-${awayScore})`);
                }
            });

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
            const docRef = doc(db, primaryPath);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                console.log(`📅 No data found for Week ${week}`);
                return { success: true, cleaned: 0 };
            }

            const currentData = docSnap.data();
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
    },

    // Emergency fix for Week 1 ESPN contamination
    async emergencyCleanWeek1() {
        try {
            console.log('🚨 EMERGENCY: Cleaning Week 1 ESPN contamination...');

            const week1Path = `artifacts/nerdfootball/public/data/nerdfootball_games/1`;
            const docRef = doc(db, week1Path);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                console.log('❌ Week 1 data not found');
                return { success: false, error: 'No Week 1 data' };
            }

            const currentData = docSnap.data();
            const cleanData = {};
            let cleanedCount = 0;
            let keptCount = 0;

            // Keep only clean game IDs (101-116), remove ESPN IDs (2211-2237)
            Object.entries(currentData).forEach(([gameId, gameData]) => {
                if (gameId.match(/^1\d{2}$/)) { // Week 1 format: 101, 102, 103, etc.
                    cleanData[gameId] = gameData;
                    keptCount++;
                    console.log(`✅ Keeping clean game ${gameId}`);
                } else {
                    console.log(`🗑️ Removing contaminated game ID: ${gameId}`);
                    cleanedCount++;
                }
            });

            // Save clean data
            await setDoc(docRef, cleanData);
            console.log(`🎉 Week 1 cleaned: Kept ${keptCount} clean games, removed ${cleanedCount} contaminated IDs`);

            return { success: true, cleaned: cleanedCount, kept: keptCount };

        } catch (error) {
            console.error('❌ Emergency clean failed:', error);
            return { success: false, error: error.message };
        }
    }
};

// Initialize mapping system when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 ESPN Game Mapping System loaded');

    // 🏆 BATTLEFIELD BYPASS: Skip ESPN auto-sync on survivor page (battlefield uses embedded data only)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'survivor') {
        console.log('🏆 BATTLEFIELD MODE: Skipping ESPN auto-sync - using embedded data only');
        return;
    }

    // DISABLED: Auto-run sync causing infinite loops
    // Auto-sync disabled due to ESPN API contamination issue
    // Users can manually trigger sync from admin interface if needed
    if (window.espnNerdApi && false) {
        // Run initial sync after 2 seconds to allow other systems to load
        setTimeout(() => {
            window.espnWinnerSync.autoSyncCurrentWeeks();
        }, 2000);
    }
});