// Test script to check Week 1 eliminations in the database
// Run this in browser console at https://nerdfootball.web.app

async function checkWeek1Eliminations() {
    console.log('🔍 Checking Week 1 eliminations in database...');

    try {
        // Wait for Firebase to be ready
        if (!window.db) {
            console.error('❌ Firebase database not available');
            return;
        }

        // Get survivor status document
        const statusDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status');
        const statusSnap = await window.getDoc(statusDocRef);

        if (!statusSnap.exists()) {
            console.log('📋 No survivor status document found');
            return { week1Eliminations: 0, details: [] };
        }

        const allStatuses = statusSnap.data();
        console.log('📊 Total users in status document:', Object.keys(allStatuses).length);

        // Filter for Week 1 eliminations
        const week1Eliminations = [];
        let totalEliminated = 0;

        for (const [userId, status] of Object.entries(allStatuses)) {
            if (status.eliminated && status.eliminatedWeek === 1) {
                week1Eliminations.push({
                    userId,
                    eliminatedWeek: status.eliminatedWeek,
                    eliminationReason: status.eliminationReason,
                    eliminatedDate: status.eliminatedDate
                });
            }

            if (status.eliminated) {
                totalEliminated++;
            }
        }

        console.log(`📊 WEEK 1 ELIMINATION SUMMARY:`);
        console.log(`   Total eliminated in Week 1: ${week1Eliminations.length}`);
        console.log(`   Total eliminated overall: ${totalEliminated}`);

        if (week1Eliminations.length > 0) {
            console.log('📋 Week 1 eliminated users:');
            week1Eliminations.forEach(user => {
                console.log(`   🚫 ${user.userId}: ${user.eliminationReason}`);
            });

            // Extract teams from elimination reasons
            const teamCounts = {};
            week1Eliminations.forEach(user => {
                const reason = user.eliminationReason || '';
                const teamMatch = reason.match(/Picked (.+?)$/);
                if (teamMatch) {
                    const team = teamMatch[1];
                    teamCounts[team] = (teamCounts[team] || 0) + 1;
                }
            });

            console.log('📊 Teams that caused Week 1 eliminations:');
            Object.entries(teamCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([team, count]) => {
                    console.log(`   ${team}: ${count} elimination${count > 1 ? 's' : ''}`);
                });
        }

        // Now let's also check if specific Miami user is eliminated
        const miamiUserId = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';
        const miamiUserStatus = allStatuses[miamiUserId];

        console.log(`🐬 Miami user (${miamiUserId}) status:`, miamiUserStatus);

        return {
            week1Eliminations: week1Eliminations.length,
            totalEliminated,
            details: week1Eliminations,
            teamCounts,
            miamiUserStatus
        };

    } catch (error) {
        console.error('❌ Error checking eliminations:', error);
        return { error: error.message };
    }
}

// Also check user picks to see who actually picked what
async function checkUserPicks() {
    console.log('🔍 Checking user picks for Week 1...');

    try {
        // Get pool members
        const poolMembersRef = window.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const poolMembersSnap = await window.getDoc(poolMembersRef);

        if (!poolMembersSnap.exists()) {
            console.error('❌ Pool members not found');
            return;
        }

        const memberIds = Object.keys(poolMembersSnap.data());
        console.log(`👥 Checking picks for ${memberIds.length} pool members`);

        const week1Picks = [];

        for (const userId of memberIds) {
            try {
                const userPicksDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', userId);
                const userPicksSnap = await window.getDoc(userPicksDocRef);

                if (userPicksSnap.exists()) {
                    const userPicksData = userPicksSnap.data();
                    const userPicks = userPicksData.picks || {};
                    const week1Pick = userPicks[1];

                    if (week1Pick) {
                        week1Picks.push({
                            userId,
                            team: week1Pick.team,
                            gameId: week1Pick.gameId
                        });
                    }
                }
            } catch (error) {
                console.log(`⚠️ Error checking user ${userId}:`, error.message);
            }
        }

        console.log(`📊 Week 1 picks summary (${week1Picks.length} users made picks):`);

        // Group by team
        const teamPicks = {};
        week1Picks.forEach(pick => {
            teamPicks[pick.team] = (teamPicks[pick.team] || 0) + 1;
        });

        Object.entries(teamPicks)
            .sort((a, b) => b[1] - a[1])
            .forEach(([team, count]) => {
                console.log(`   ${team}: ${count} pick${count > 1 ? 's' : ''}`);
            });

        // Check Miami specifically
        const miamiPickers = week1Picks.filter(pick => pick.team === 'Miami Dolphins');
        if (miamiPickers.length > 0) {
            console.log(`🐬 Users who picked Miami Dolphins:`, miamiPickers);
        }

        return { week1Picks, teamPicks };

    } catch (error) {
        console.error('❌ Error checking picks:', error);
        return { error: error.message };
    }
}

// Run both checks
async function runFullCheck() {
    console.log('🚀 Starting full Week 1 elimination check...');

    const eliminationResults = await checkWeek1Eliminations();
    const pickResults = await checkUserPicks();

    console.log('✅ Full check complete!');
    return { eliminationResults, pickResults };
}

// Auto-run if script is loaded
console.log('📋 Week 1 elimination checker loaded. Run: runFullCheck()');
runFullCheck();