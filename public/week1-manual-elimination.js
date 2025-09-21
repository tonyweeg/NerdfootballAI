// MANUAL WEEK 1 ELIMINATION - Using authoritative losing teams list
// Run in console at nerdfootball.web.app

window.executeManualWeek1Eliminations = async function() {
    console.log('🚨 MANUAL WEEK 1 ELIMINATION - AUTHORITATIVE RESULTS');

    // DEFINITIVE Week 1 losing teams from user
    const week1LosingTeams = [
        'Dallas Cowboys',
        'Kansas City Chiefs',
        'Atlanta Falcons',
        'Cleveland Browns',
        'Miami Dolphins',
        'Carolina Panthers',
        'New England Patriots',
        'New Orleans Saints',
        'New York Jets',
        'New York Giants',
        'Tennessee Titans',
        'Seattle Seahawks',
        'Detroit Lions',
        'Houston Texans',
        'Baltimore Ravens',
        'Minnesota Vikings'
    ];

    console.log('💀 Week 1 LOSING TEAMS (16 teams):');
    week1LosingTeams.forEach((team, i) => {
        console.log(`   ${i+1}. ${team}`);
    });

    try {
        // Get pool members
        const poolMembersRef = window.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const poolMembersSnap = await window.getDoc(poolMembersRef);

        if (!poolMembersSnap.exists()) {
            console.error('❌ Pool members not found');
            return;
        }

        const memberIds = Object.keys(poolMembersSnap.data());
        console.log(`👥 Checking ${memberIds.length} pool members for Week 1 picks...`);

        // Get current status
        const statusDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
        const statusSnap = await window.getDoc(statusDocRef);
        const allStatuses = statusSnap.exists() ? statusSnap.data() : {};

        const auditReport = {
            totalMembers: memberIds.length,
            membersWithPicks: 0,
            membersWithoutPicks: 0,
            survivedPicks: [],
            eliminatedPicks: [],
            alreadyEliminated: [],
            noGameId: []
        };

        const eliminationUpdates = {};

        // Check each member
        for (const userId of memberIds) {
            try {
                // Skip already eliminated users
                if (allStatuses[userId]?.eliminated) {
                    auditReport.alreadyEliminated.push({
                        userId: userId.substring(0, 8) + '...',
                        reason: allStatuses[userId].eliminationReason
                    });
                    continue;
                }

                // Get user's picks
                const userPicksDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', userId);
                const userPicksSnap = await window.getDoc(userPicksDocRef);

                if (!userPicksSnap.exists()) {
                    auditReport.membersWithoutPicks++;
                    console.log(`⚠️ ${userId.substring(0, 8)}... - No picks document`);
                    continue;
                }

                const userPicksData = userPicksSnap.data();
                const userPicks = userPicksData.picks || {};
                const week1Pick = userPicks[1];

                if (!week1Pick) {
                    auditReport.membersWithoutPicks++;
                    console.log(`⚠️ ${userId.substring(0, 8)}... - No Week 1 pick`);
                    continue;
                }

                auditReport.membersWithPicks++;

                // Check if no gameId
                if (!week1Pick.gameId) {
                    auditReport.noGameId.push({
                        userId: userId.substring(0, 8) + '...',
                        team: week1Pick.team || 'UNKNOWN'
                    });
                    console.log(`⚠️ ${userId.substring(0, 8)}... - No gameId: ${week1Pick.team}`);
                    continue;
                }

                const pickedTeam = week1Pick.team;
                const shortUserId = userId.substring(0, 8) + '...';

                // Check if picked a losing team
                if (week1LosingTeams.includes(pickedTeam)) {
                    console.log(`💀 ELIMINATING: ${shortUserId} picked ${pickedTeam} (LOSER)`);

                    // Add to elimination updates
                    eliminationUpdates[userId] = {
                        eliminated: true,
                        eliminatedWeek: 1,
                        eliminatedDate: new Date().toISOString(),
                        eliminationReason: `Lost in Week 1: Picked ${pickedTeam} (losing team)`
                    };

                    auditReport.eliminatedPicks.push({
                        userId: shortUserId,
                        team: pickedTeam,
                        gameId: week1Pick.gameId
                    });
                } else {
                    console.log(`✅ SURVIVED: ${shortUserId} picked ${pickedTeam} (WINNER)`);

                    auditReport.survivedPicks.push({
                        userId: shortUserId,
                        team: pickedTeam,
                        gameId: week1Pick.gameId
                    });
                }

            } catch (error) {
                console.error(`❌ Error checking user ${userId}:`, error);
            }
        }

        // Apply eliminations
        if (Object.keys(eliminationUpdates).length > 0) {
            console.log(`💾 Writing ${Object.keys(eliminationUpdates).length} eliminations to database...`);
            await window.setDoc(statusDocRef, eliminationUpdates, { merge: true });
            console.log('✅ Database updated successfully');
        }

        // Print audit report
        console.log('📊 WEEK 1 ELIMINATION AUDIT REPORT:');
        console.log(`   👥 Total pool members: ${auditReport.totalMembers}`);
        console.log(`   🎯 Members with Week 1 picks: ${auditReport.membersWithPicks}`);
        console.log(`   ❓ Members without picks: ${auditReport.membersWithoutPicks}`);
        console.log(`   ⚠️ Members with no gameId: ${auditReport.noGameId.length}`);
        console.log(`   ☠️ Already eliminated: ${auditReport.alreadyEliminated.length}`);
        console.log(`   💀 NEW eliminations: ${auditReport.eliminatedPicks.length}`);
        console.log(`   ✅ Survived: ${auditReport.survivedPicks.length}`);

        if (auditReport.eliminatedPicks.length > 0) {
            console.log('💀 ELIMINATED USERS:');
            // Group by team for easier analysis
            const eliminationsByTeam = {};
            auditReport.eliminatedPicks.forEach(pick => {
                eliminationsByTeam[pick.team] = (eliminationsByTeam[pick.team] || 0) + 1;
            });

            Object.entries(eliminationsByTeam)
                .sort((a, b) => b[1] - a[1])
                .forEach(([team, count]) => {
                    console.log(`   ${team}: ${count} elimination${count > 1 ? 's' : ''}`);
                });
        }

        if (auditReport.survivedPicks.length > 0) {
            console.log('✅ SURVIVING TEAMS:');
            const survivalsByTeam = {};
            auditReport.survivedPicks.forEach(pick => {
                survivalsByTeam[pick.team] = (survivalsByTeam[pick.team] || 0) + 1;
            });

            Object.entries(survivalsByTeam)
                .sort((a, b) => b[1] - a[1])
                .forEach(([team, count]) => {
                    console.log(`   ${team}: ${count} survivor${count > 1 ? 's' : ''}`);
                });
        }

        return auditReport;

    } catch (error) {
        console.error('❌ Manual elimination failed:', error);
        return { error: error.message };
    }
};

console.log('🚨 MANUAL Week 1 elimination script loaded!');
console.log('💀 Run: executeManualWeek1Eliminations()');
console.log('📋 This will eliminate ALL users who picked the 16 losing teams');

// Auto-run
setTimeout(() => {
    console.log('🚀 Auto-executing manual Week 1 eliminations...');
    window.executeManualWeek1Eliminations();
}, 2000);