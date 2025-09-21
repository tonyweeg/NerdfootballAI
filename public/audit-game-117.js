// 🔍 GAME 117 AUDIT SCRIPT
// Detailed investigation of what game 117 represents

async function auditGame117() {
    console.log('🔍 GAME 117 AUDIT STARTING...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";
    const TARGET_GAME = "117";

    const audit = {
        week1: { usersWithGame117: [], usersWithoutGame117: [], tonyHasIt: false },
        week2: { usersWithGame117: [], usersWithoutGame117: [], tonyHasIt: false },
        gameData: null,
        analysis: {}
    };

    try {
        // Get pool members
        const poolMembers = await window.ScoringSystemManager.getPoolMembers();
        console.log(`👥 Auditing ${poolMembers.length} users for Game 117`);

        // Check each week
        for (const week of [1, 2]) {
            console.log(`\n📊 === WEEK ${week} GAME 117 AUDIT ===`);

            for (const member of poolMembers) {
                try {
                    const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
                    const picksDocRef = window.doc(window.db, picksPath, member.uid);
                    const picksSnap = await window.getDoc(picksDocRef);

                    const userName = member.displayName || member.email || `User-${member.uid.slice(-6)}`;
                    const isTony = member.uid === TONY_UID;

                    if (picksSnap.exists() && picksSnap.data()) {
                        const picksData = picksSnap.data();
                        const hasGame117 = picksData.hasOwnProperty(TARGET_GAME);

                        if (hasGame117) {
                            audit[`week${week}`].usersWithGame117.push({
                                uid: member.uid,
                                userName: userName,
                                isTony: isTony,
                                gameData: picksData[TARGET_GAME],
                                totalGames: Object.keys(picksData).length,
                                confidence: picksData[TARGET_GAME].confidence,
                                pick: picksData[TARGET_GAME].pick
                            });

                            if (isTony) {
                                audit[`week${week}`].tonyHasIt = true;
                            }

                            // Store sample game data
                            if (!audit.gameData) {
                                audit.gameData = picksData[TARGET_GAME];
                            }

                            console.log(`✅ ${userName}${isTony ? ' (TONY)' : ''}: HAS Game 117 - ${picksData[TARGET_GAME].pick} (confidence: ${picksData[TARGET_GAME].confidence})`);
                        } else {
                            audit[`week${week}`].usersWithoutGame117.push({
                                uid: member.uid,
                                userName: userName,
                                isTony: isTony,
                                totalGames: Object.keys(picksData).length
                            });

                            console.log(`❌ ${userName}${isTony ? ' (TONY)' : ''}: NO Game 117 (${Object.keys(picksData).length} total games)`);
                        }
                    } else {
                        console.log(`⏭️ ${userName}: No picks data for Week ${week}`);
                    }
                } catch (userError) {
                    console.error(`💥 Error checking ${member.displayName}:`, userError);
                }
            }

            const withGame = audit[`week${week}`].usersWithGame117.length;
            const withoutGame = audit[`week${week}`].usersWithoutGame117.length;
            const percentage = (withGame / (withGame + withoutGame) * 100).toFixed(1);

            console.log(`\n📊 Week ${week} Summary:`);
            console.log(`   ✅ Users WITH Game 117: ${withGame} (${percentage}%)`);
            console.log(`   ❌ Users WITHOUT Game 117: ${withoutGame}`);
            console.log(`   🎯 Tony has Game 117: ${audit[`week${week}`].tonyHasIt ? 'YES' : 'NO'}`);
        }

        // Detailed Analysis
        console.log('\n🔍 === DETAILED GAME 117 ANALYSIS ===');

        if (audit.gameData) {
            console.log('📋 Game 117 Data Structure:');
            console.log('   Pick:', audit.gameData.pick);
            console.log('   Confidence:', audit.gameData.confidence);
            console.log('   Type:', typeof audit.gameData.confidence);

            if (audit.gameData.pick && audit.gameData.pick.includes(' vs ')) {
                const teams = audit.gameData.pick.split(' vs ');
                console.log('   Teams:', teams);
            }
        }

        // Cross-week analysis
        console.log('\n🔄 CROSS-WEEK ANALYSIS:');
        const week1With = audit.week1.usersWithGame117.map(u => u.uid);
        const week2With = audit.week2.usersWithGame117.map(u => u.uid);
        const inBothWeeks = week1With.filter(uid => week2With.includes(uid));

        console.log(`   Week 1 users with Game 117: ${week1With.length}`);
        console.log(`   Week 2 users with Game 117: ${week2With.length}`);
        console.log(`   Users with Game 117 in BOTH weeks: ${inBothWeeks.length}`);

        if (inBothWeeks.length > 0) {
            console.log('   Users in both weeks:', inBothWeeks.map(uid => {
                const user1 = audit.week1.usersWithGame117.find(u => u.uid === uid);
                return user1 ? user1.userName : uid;
            }).join(', '));
        }

        // Pattern analysis
        console.log('\n🧩 PATTERN ANALYSIS:');

        // Check if Game 117 users have specific patterns
        if (audit.week1.usersWithGame117.length > 0) {
            const gameCounts = audit.week1.usersWithGame117.map(u => u.totalGames);
            const avgGameCount = gameCounts.reduce((a, b) => a + b, 0) / gameCounts.length;
            const confidenceValues = audit.week1.usersWithGame117.map(u => parseInt(u.confidence)).filter(c => !isNaN(c));

            console.log(`   Average total games (users with 117): ${avgGameCount.toFixed(1)}`);
            console.log(`   Game counts: ${gameCounts.join(', ')}`);
            console.log(`   Confidence values for Game 117: ${confidenceValues.join(', ')}`);

            if (confidenceValues.length > 0) {
                const maxConf = Math.max(...confidenceValues);
                const minConf = Math.min(...confidenceValues);
                console.log(`   Confidence range: ${minConf} - ${maxConf}`);

                if (maxConf > 16) {
                    console.log(`   ⚠️ CONFIDENCE ISSUE: Game 117 has confidence > 16!`);
                }
            }
        }

        // Final verdict
        console.log('\n🎯 === GAME 117 VERDICT ===');
        console.log(`🎯 Tony has Game 117: Week 1: ${audit.week1.tonyHasIt ? 'YES' : 'NO'}, Week 2: ${audit.week2.tonyHasIt ? 'YES' : 'NO'}`);

        const shouldRemove = !audit.week1.tonyHasIt && (audit.week1.usersWithGame117.length / poolMembers.length) < 0.30;
        console.log(`🚨 Conservative removal criteria met: ${shouldRemove ? 'YES' : 'NO'}`);

        if (shouldRemove) {
            console.log('   ✅ SAFE TO REMOVE: Tony doesn\'t have it AND <30% of users have it');
        } else if (audit.week1.tonyHasIt) {
            console.log('   🛡️ PROTECTED: Tony has this game - never remove');
        } else {
            console.log('   🛡️ PROTECTED: Too many users have it - too risky to remove');
        }

        // Store results globally
        window.game117Audit = audit;
        console.log('\n📁 Full audit stored in window.game117Audit');

        return audit;

    } catch (error) {
        console.error('💥 GAME 117 AUDIT FAILED:', error);
        return null;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    console.log('🔍 Game 117 Audit Script loaded');
    window.auditGame117 = auditGame117;
}