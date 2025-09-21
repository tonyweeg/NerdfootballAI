// 🔬 PHASE 1: CONSERVATIVE FORENSIC ANALYSIS
// Data-driven investigation using Tony's picks as reference standard

async function phase1ForensicAnalysis() {
    console.log('🔬 PHASE 1: CONSERVATIVE FORENSIC ANALYSIS STARTING...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";
    const REMOVAL_THRESHOLD = 0.30; // Only remove games if <30% of users have them

    const analysis = {
        tonyReference: { week1: null, week2: null },
        week1: { gameFrequency: {}, safeToRemove: [], userPatterns: {}, tonyGames: [] },
        week2: { gameFrequency: {}, safeToRemove: [], userPatterns: {}, tonyGames: [] },
        summary: { totalUsers: 0, conservativeApproach: true }
    };

    try {
        // Get pool members
        const poolMembers = await window.ScoringSystemManager.getPoolMembers();
        analysis.summary.totalUsers = poolMembers.length;

        console.log('🛡️ CONSERVATIVE APPROACH: Using Tony\'s picks as reference standard');
        console.log(`📊 Total users to analyze: ${poolMembers.length}`);

        // STEP 1: Get Tony's picks as reference standard
        console.log('\n🎯 STEP 1: Analyzing Tony\'s picks as reference...');

        for (const week of [1, 2]) {
            const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
            const tonyDocRef = window.doc(window.db, picksPath, TONY_UID);
            const tonySnap = await window.getDoc(tonyDocRef);

            if (tonySnap.exists() && tonySnap.data()) {
                const tonyGames = Object.keys(tonySnap.data()).sort();
                analysis.tonyReference[`week${week}`] = tonySnap.data();
                analysis[`week${week}`].tonyGames = tonyGames;

                console.log(`✅ Tony's Week ${week}: ${tonyGames.length} games (${tonyGames.join(', ')})`);
            } else {
                console.log(`⚠️ Tony's Week ${week}: No picks found`);
                analysis[`week${week}`].tonyGames = [];
            }
        }

        // STEP 2: Analyze game frequency across all users
        console.log('\n📊 STEP 2: Analyzing game frequency across all users...');

        for (const week of [1, 2]) {
            console.log(`\n--- WEEK ${week} FREQUENCY ANALYSIS ---`);

            for (const member of poolMembers) {
                try {
                    const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
                    const picksDocRef = window.doc(window.db, picksPath, member.uid);
                    const picksSnap = await window.getDoc(picksDocRef);

                    const userName = member.displayName || member.email || `User-${member.uid.slice(-6)}`;

                    if (picksSnap.exists() && picksSnap.data()) {
                        const picksData = picksSnap.data();
                        const userGameIds = Object.keys(picksData).sort();

                        // Count frequency of each game across all users
                        userGameIds.forEach(gameId => {
                            if (!analysis[`week${week}`].gameFrequency[gameId]) {
                                analysis[`week${week}`].gameFrequency[gameId] = { count: 0, users: [] };
                            }
                            analysis[`week${week}`].gameFrequency[gameId].count++;
                            analysis[`week${week}`].gameFrequency[gameId].users.push(userName);
                        });

                        // Store user pattern
                        analysis[`week${week}`].userPatterns[member.uid] = {
                            userName: userName,
                            gameIds: userGameIds,
                            gameCount: userGameIds.length,
                            confidenceValues: userGameIds.map(id => parseInt(picksData[id].confidence)).filter(c => !isNaN(c)).sort((a,b) => a-b)
                        };

                    } else {
                        console.log(`⏭️ ${userName}: Week ${week} - No picks data`);
                    }
                } catch (userError) {
                    console.error(`💥 Error analyzing ${member.displayName} Week ${week}:`, userError);
                }
            }
        }

        // STEP 3: Conservative analysis for safe removal
        console.log('\n🛡️ STEP 3: Conservative analysis for safe removal...');

        for (const week of [1, 2]) {
            console.log(`\n--- WEEK ${week} SAFE REMOVAL ANALYSIS ---`);

            const tonyGames = analysis[`week${week}`].tonyGames;
            const gameFreq = analysis[`week${week}`].gameFrequency;
            const totalUsers = poolMembers.length;

            if (tonyGames.length === 0) {
                console.log(`⚠️ Week ${week}: Tony has no picks - skipping analysis`);
                continue;
            }

            console.log(`🎯 Tony's Week ${week} games (${tonyGames.length}): ${tonyGames.join(', ')}`);

            // Analyze each game for removal safety
            Object.entries(gameFreq).forEach(([gameId, data]) => {
                const userPercentage = data.count / totalUsers;
                const tonyHasIt = tonyGames.includes(gameId);

                console.log(`📊 Game ${gameId}: ${data.count}/${totalUsers} users (${(userPercentage * 100).toFixed(1)}%) - Tony: ${tonyHasIt ? '✅' : '❌'}`);

                // CONSERVATIVE REMOVAL CRITERIA - ALL must be true:
                // 1. Tony doesn't have it
                // 2. Less than 30% of users have it
                // 3. It's clearly an outlier
                if (!tonyHasIt && userPercentage < REMOVAL_THRESHOLD) {
                    analysis[`week${week}`].safeToRemove.push({
                        gameId: gameId,
                        userCount: data.count,
                        percentage: userPercentage,
                        reason: `Tony doesn't have it AND only ${(userPercentage * 100).toFixed(1)}% of users have it`,
                        affectedUsers: data.users
                    });
                    console.log(`   🚨 SAFE TO REMOVE: ${gameId} (${data.count} users, ${(userPercentage * 100).toFixed(1)}%)`);
                } else if (tonyHasIt) {
                    console.log(`   🛡️ PROTECTED: Tony has this game - NEVER remove`);
                } else if (userPercentage >= REMOVAL_THRESHOLD) {
                    console.log(`   🛡️ PROTECTED: Too many users have it (${(userPercentage * 100).toFixed(1)}%) - too risky`);
                }
            });

            console.log(`\n🎯 Week ${week} Safe Removal Summary:`);
            if (analysis[`week${week}`].safeToRemove.length > 0) {
                console.log(`   🚨 Games safe to remove: ${analysis[`week${week}`].safeToRemove.map(g => g.gameId).join(', ')}`);
                analysis[`week${week}`].safeToRemove.forEach(game => {
                    console.log(`      ${game.gameId}: ${game.reason}`);
                });
            } else {
                console.log(`   ✅ No games meet conservative removal criteria`);
            }
        }

        // FINAL SUMMARY REPORT
        console.log('\n🎯 === CONSERVATIVE FORENSIC ANALYSIS COMPLETE ===');
        console.log(`👥 Total users analyzed: ${analysis.summary.totalUsers}`);
        console.log(`🛡️ Conservative threshold: ${(REMOVAL_THRESHOLD * 100)}% (only remove if fewer users have it)`);
        console.log(`🎯 Tony's UID: ${TONY_UID}`);

        console.log('\n📋 TONY\'S REFERENCE PICKS:');
        for (const week of [1, 2]) {
            const tonyGames = analysis[`week${week}`].tonyGames;
            if (tonyGames.length > 0) {
                console.log(`   Week ${week}: ${tonyGames.length} games (${tonyGames.join(', ')})`);
            } else {
                console.log(`   Week ${week}: No picks found`);
            }
        }

        console.log('\n🚨 SAFE REMOVAL CANDIDATES:');
        for (const week of [1, 2]) {
            const safeToRemove = analysis[`week${week}`].safeToRemove;
            if (safeToRemove.length > 0) {
                console.log(`   Week ${week}: ${safeToRemove.map(g => g.gameId).join(', ')}`);
                safeToRemove.forEach(game => {
                    console.log(`      ${game.gameId}: ${game.affectedUsers.length} users affected - ${game.reason}`);
                });
            } else {
                console.log(`   Week ${week}: No games meet removal criteria`);
            }
        }

        // Store analysis globally
        window.forensicAnalysis = analysis;
        console.log('\n📁 Full analysis stored in window.forensicAnalysis for subsequent phases');

        console.log('\n🛡️ CONSERVATIVE APPROACH COMPLETE - READY FOR PHASE 2');
        console.log('🎯 Only games that meet ALL conservative criteria will be removed');
        console.log('🛡️ Tony\'s picks are protected as the reference standard');

        return analysis;

    } catch (error) {
        console.error('💥 PHASE 1 CONSERVATIVE ANALYSIS FAILED:', error);
        return null;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    console.log('🔬 Phase 1 Forensic Analysis loaded');
    window.phase1ForensicAnalysis = phase1ForensicAnalysis;
}