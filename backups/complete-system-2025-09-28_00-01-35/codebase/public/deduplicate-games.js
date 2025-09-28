// 🧹 GAME DEDUPLICATION UTILITY
// Removes duplicate games from picks data while preserving user picks

async function deduplicateGames() {
    console.log('🧹 STARTING GAME DEDUPLICATION...');

    if (!window.picksBackup) {
        console.error('❌ NO BACKUP FOUND! Run backupPicksData() first!');
        return null;
    }

    const deduplicationResults = {
        timestamp: new Date().toISOString(),
        weeks: {},
        summary: {
            totalUsersProcessed: 0,
            totalDuplicatesRemoved: 0,
            totalGamesCleaned: 0,
            errors: []
        }
    };

    try {
        // Process each week
        for (const week of [1, 2]) {
            console.log(`\n🧹 === DEDUPLICATING WEEK ${week} ===`);

            const weekBackup = window.picksBackup.weeks[week];
            if (!weekBackup) {
                console.error(`❌ No backup data for Week ${week}`);
                continue;
            }

            deduplicationResults.weeks[week] = {
                usersProcessed: 0,
                duplicatesRemoved: 0,
                errors: [],
                gameMapping: {}
            };

            // Analyze game patterns to identify canonical games
            const gameAnalysis = analyzeGameDuplicates(weekBackup);
            console.log(`🔍 Week ${week} Game Analysis:`, gameAnalysis);

            // Process each user
            for (const [userId, userData] of Object.entries(weekBackup.users)) {
                if (!userData.originalData || userData.gameCount === 0) {
                    console.log(`⏭️ Skipping ${userData.userName}: No picks data`);
                    continue;
                }

                try {
                    const cleanedPicks = deduplicateUserPicks(userData.originalData, gameAnalysis);
                    const originalCount = Object.keys(userData.originalData).length;
                    const cleanedCount = Object.keys(cleanedPicks).length;
                    const duplicatesRemoved = originalCount - cleanedCount;

                    if (duplicatesRemoved > 0) {
                        console.log(`🧹 ${userData.userName}: ${originalCount} → ${cleanedCount} games (${duplicatesRemoved} duplicates removed)`);

                        // Save cleaned picks back to Firebase
                        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
                        const picksDocRef = window.doc(window.db, picksPath, userId);

                        await window.setDoc(picksDocRef, cleanedPicks);
                        console.log(`✅ ${userData.userName}: Cleaned picks saved to Firebase`);

                        deduplicationResults.weeks[week].duplicatesRemoved += duplicatesRemoved;
                    } else {
                        console.log(`✅ ${userData.userName}: No duplicates found (${cleanedCount} games)`);
                    }

                    deduplicationResults.weeks[week].usersProcessed++;

                } catch (userError) {
                    console.error(`💥 Error processing ${userData.userName}:`, userError);
                    deduplicationResults.weeks[week].errors.push({
                        userId: userId,
                        userName: userData.userName,
                        error: userError.message
                    });
                }
            }

            // Update summary
            deduplicationResults.summary.totalUsersProcessed += deduplicationResults.weeks[week].usersProcessed;
            deduplicationResults.summary.totalDuplicatesRemoved += deduplicationResults.weeks[week].duplicatesRemoved;
        }

        console.log('\n🎉 === DEDUPLICATION COMPLETE ===');
        console.log(`👥 Total users processed: ${deduplicationResults.summary.totalUsersProcessed}`);
        console.log(`🧹 Total duplicates removed: ${deduplicationResults.summary.totalDuplicatesRemoved}`);
        console.log(`💥 Total errors: ${deduplicationResults.summary.errors.length}`);

        window.deduplicationResults = deduplicationResults;
        return deduplicationResults;

    } catch (error) {
        console.error('💥 DEDUPLICATION FAILED:', error);
        return null;
    }
}

function analyzeGameDuplicates(weekData) {
    console.log('🔍 Analyzing game duplicate patterns...');

    const gameTeams = {}; // Map game IDs to team matchups
    const teamMatchups = {}; // Map team matchups to game IDs

    // Collect all games and their team matchups
    Object.values(weekData.users).forEach(user => {
        if (user.originalData) {
            Object.entries(user.originalData).forEach(([gameId, gameData]) => {
                if (gameData.pick && gameData.pick.includes(' vs ')) {
                    const teams = gameData.pick.split(' vs ').map(team => team.trim()).sort().join(' vs ');

                    gameTeams[gameId] = teams;

                    if (!teamMatchups[teams]) {
                        teamMatchups[teams] = [];
                    }
                    if (!teamMatchups[teams].includes(gameId)) {
                        teamMatchups[teams].push(gameId);
                    }
                }
            });
        }
    });

    // Identify duplicates and canonical games
    const duplicateGroups = {};
    const canonicalGames = {};

    Object.entries(teamMatchups).forEach(([teams, gameIds]) => {
        if (gameIds.length > 1) {
            // Multiple game IDs for same matchup = duplicates
            duplicateGroups[teams] = gameIds;
            // Use the first (shortest) game ID as canonical
            canonicalGames[teams] = gameIds.sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
            console.log(`🔍 Duplicate matchup "${teams}": ${gameIds.length} IDs, canonical: ${canonicalGames[teams]}`);
        } else {
            // Only one game ID = no duplicates
            canonicalGames[teams] = gameIds[0];
        }
    });

    return {
        gameTeams,
        teamMatchups,
        duplicateGroups,
        canonicalGames,
        totalMatchups: Object.keys(teamMatchups).length,
        duplicateMatchups: Object.keys(duplicateGroups).length
    };
}

function deduplicateUserPicks(originalPicks, gameAnalysis) {
    const cleanedPicks = {};

    Object.entries(originalPicks).forEach(([gameId, gameData]) => {
        const teams = gameAnalysis.gameTeams[gameId];

        if (teams && gameAnalysis.canonicalGames[teams]) {
            const canonicalGameId = gameAnalysis.canonicalGames[teams];

            // Only keep picks for canonical games
            if (gameId === canonicalGameId) {
                cleanedPicks[gameId] = gameData;
            } else {
                // This is a duplicate - check if we already have the canonical version
                if (!cleanedPicks[canonicalGameId]) {
                    // Move this pick to the canonical game ID
                    cleanedPicks[canonicalGameId] = {
                        ...gameData,
                        // Ensure the pick text matches canonical format
                        pick: teams
                    };
                }
                // Otherwise, this duplicate is discarded (canonical already exists)
            }
        } else {
            // Couldn't identify teams - keep as-is (shouldn't happen with good data)
            cleanedPicks[gameId] = gameData;
        }
    });

    return cleanedPicks;
}

// Auto-setup when loaded
if (typeof window !== 'undefined') {
    console.log('🧹 Game Deduplication Utility loaded');
    console.log('📋 Run deduplicateGames() to clean duplicate games');
    window.deduplicateGames = deduplicateGames;
    window.analyzeGameDuplicates = analyzeGameDuplicates;
    window.deduplicateUserPicks = deduplicateUserPicks;
}