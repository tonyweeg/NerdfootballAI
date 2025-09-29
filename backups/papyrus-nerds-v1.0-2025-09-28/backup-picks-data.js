// 🛡️ PICKS DATA BACKUP UTILITY
// Creates comprehensive backup before deduplication cleanup

async function backupPicksData() {
    console.log('🛡️ CREATING COMPREHENSIVE PICKS BACKUP...');

    const backupData = {
        timestamp: new Date().toISOString(),
        weeks: {},
        metadata: {
            totalUsers: 0,
            totalWeeks: 0,
            backupVersion: '1.0'
        }
    };

    try {
        // Get all pool members
        const poolMembers = await window.ScoringSystemManager.getPoolMembers();
        backupData.metadata.totalUsers = poolMembers.length;

        console.log(`📊 Backing up picks for ${poolMembers.length} users...`);

        // Backup Weeks 1-2
        for (const week of [1, 2]) {
            console.log(`\n📋 === BACKING UP WEEK ${week} ===`);

            backupData.weeks[week] = {
                users: {},
                gamesSummary: {},
                duplicateAnalysis: {}
            };

            for (const member of poolMembers) {
                try {
                    const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
                    const picksDocRef = window.doc(window.db, picksPath, member.uid);
                    const picksSnap = await window.getDoc(picksDocRef);

                    const userName = member.displayName || member.email || `User-${member.uid.slice(-6)}`;

                    if (picksSnap.exists() && picksSnap.data()) {
                        const picksData = picksSnap.data();

                        backupData.weeks[week].users[member.uid] = {
                            userName: userName,
                            originalData: picksData,
                            gameCount: Object.keys(picksData).length,
                            gameIds: Object.keys(picksData),
                            confidenceValues: Object.values(picksData).map(game => parseInt(game.confidence)).sort((a,b) => a-b)
                        };

                        console.log(`✅ ${userName}: ${Object.keys(picksData).length} games backed up`);
                    } else {
                        backupData.weeks[week].users[member.uid] = {
                            userName: userName,
                            originalData: null,
                            gameCount: 0,
                            gameIds: [],
                            confidenceValues: []
                        };
                        console.log(`❌ ${userName}: NO PICKS FOUND`);
                    }
                } catch (userError) {
                    console.error(`💥 Error backing up ${member.displayName}:`, userError);
                    backupData.weeks[week].users[member.uid] = {
                        userName: member.displayName || 'Unknown',
                        error: userError.message,
                        originalData: null
                    };
                }
            }

            // Analyze duplicate patterns for this week
            console.log(`🔍 Analyzing duplicate patterns for Week ${week}...`);
            const allGameIds = [];
            const gameIdCounts = {};

            Object.values(backupData.weeks[week].users).forEach(user => {
                if (user.gameIds) {
                    user.gameIds.forEach(gameId => {
                        allGameIds.push(gameId);
                        gameIdCounts[gameId] = (gameIdCounts[gameId] || 0) + 1;
                    });
                }
            });

            // Find duplicates
            const duplicateGameIds = Object.keys(gameIdCounts).filter(gameId => gameIdCounts[gameId] > 1);
            const uniqueGameIds = [...new Set(allGameIds)];

            backupData.weeks[week].duplicateAnalysis = {
                totalGameIds: allGameIds.length,
                uniqueGameIds: uniqueGameIds.length,
                duplicateGameIds: duplicateGameIds,
                gameIdCounts: gameIdCounts,
                expectedGameCount: uniqueGameIds.length // This should be the "clean" count
            };

            console.log(`📊 Week ${week} Analysis:`);
            console.log(`   Total game ID references: ${allGameIds.length}`);
            console.log(`   Unique game IDs: ${uniqueGameIds.length}`);
            console.log(`   Duplicate game IDs: ${duplicateGameIds.length}`);
            if (duplicateGameIds.length > 0) {
                console.log(`   Duplicated IDs: ${duplicateGameIds.join(', ')}`);
            }

            backupData.metadata.totalWeeks++;
        }

        // Store backup globally and create downloadable version
        window.picksBackup = backupData;

        // Create downloadable backup file
        const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], {type: 'application/json'});
        const backupUrl = URL.createObjectURL(backupBlob);

        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = backupUrl;
        downloadLink.download = `picks-backup-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
        downloadLink.textContent = 'Download Picks Backup';
        downloadLink.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;background:green;color:white;padding:10px;border-radius:5px;text-decoration:none;';
        document.body.appendChild(downloadLink);

        console.log('\n🎉 === BACKUP COMPLETE ===');
        console.log(`📁 Backup stored in window.picksBackup`);
        console.log(`💾 Download link added to page (top-right corner)`);
        console.log(`📊 Total users backed up: ${backupData.metadata.totalUsers}`);
        console.log(`📅 Total weeks backed up: ${backupData.metadata.totalWeeks}`);

        return backupData;

    } catch (error) {
        console.error('💥 BACKUP FAILED:', error);
        return null;
    }
}

// Auto-setup when loaded
if (typeof window !== 'undefined') {
    console.log('🛡️ Picks Backup Utility loaded');
    console.log('📋 Run backupPicksData() to create backup');
    window.backupPicksData = backupPicksData;
}