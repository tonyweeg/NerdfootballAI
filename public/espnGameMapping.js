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

    // Week 3 Games (301-316) - To be populated
    "301": "TBD", "302": "TBD", "303": "TBD", "304": "TBD",
    "305": "TBD", "306": "TBD", "307": "TBD", "308": "TBD",
    "309": "TBD", "310": "TBD", "311": "TBD", "312": "TBD",
    "313": "TBD", "314": "TBD", "315": "TBD", "316": "TBD"
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
            console.log('🚀 Starting auto-sync of current weeks...');

            const results = {};

            // Sync weeks 1-3 (current season status)
            for (let week = 1; week <= 3; week++) {
                results[week] = await this.syncWeekWinners(week);

                // Small delay between weeks to avoid rate limiting
                if (week < 3) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            const totalSynced = Object.values(results).reduce((sum, result) => sum + (result.synced || 0), 0);
            console.log(`🎯 Auto-sync complete: ${totalSynced} total games synced`);

            return results;

        } catch (error) {
            console.error('❌ Auto-sync failed:', error);
            return { error: error.message };
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