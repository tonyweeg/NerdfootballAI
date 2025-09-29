// Week elimination checker - run in console at nerdfootball.web.app

window.checkWeekEliminations = async function(weekNumber = 1) {
    console.log(`🔍 CHECKING WEEK ${weekNumber} ELIMINATIONS`);

    try {
        // Wait for Firebase to be ready
        if (!window.db) {
            console.error('❌ Firebase not ready');
            return;
        }

        // Get elimination status
        const statusDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
        const statusSnap = await window.getDoc(statusDocRef);

        if (!statusSnap.exists()) {
            console.log('📋 No survivor status document found');
            return { error: 'No status document' };
        }

        const allStatuses = statusSnap.data();
        console.log(`📊 Total users in status document: ${Object.keys(allStatuses).length}`);

        // Filter for this week's eliminations
        const weekEliminations = [];
        let totalEliminated = 0;
        let stillActive = 0;

        for (const [userId, status] of Object.entries(allStatuses)) {
            // Handle null status entries
            if (!status || typeof status !== 'object') {
                stillActive++; // Assume active if no valid status
                continue;
            }

            if (status.eliminated) {
                totalEliminated++;
                if (status.eliminatedWeek === weekNumber) {
                    weekEliminations.push({
                        userId,
                        eliminatedWeek: status.eliminatedWeek,
                        eliminationReason: status.eliminationReason,
                        eliminatedDate: status.eliminatedDate
                    });
                }
            } else {
                stillActive++;
            }
        }

        console.log(`🎯 WEEK ${weekNumber} RESULTS:`);
        console.log(`   • Eliminated in Week ${weekNumber}: ${weekEliminations.length}`);
        console.log(`   • Total eliminated: ${totalEliminated}`);
        console.log(`   • Still active: ${stillActive}`);

        if (weekEliminations.length > 0) {
            console.log(`📋 Week ${weekNumber} eliminations:`);
            weekEliminations.forEach(user => {
                console.log(`   🚫 ${user.userId}: ${user.eliminationReason}`);
            });

            // Extract teams
            const teamCounts = {};
            weekEliminations.forEach(user => {
                const reason = user.eliminationReason || '';
                const teamMatch = reason.match(/Picked (.+?)(?:,|$)/);
                if (teamMatch) {
                    const team = teamMatch[1];
                    teamCounts[team] = (teamCounts[team] || 0) + 1;
                }
            });

            console.log(`💀 Teams that caused Week ${weekNumber} eliminations:`);
            Object.entries(teamCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([team, count]) => {
                    console.log(`   ${team}: ${count} elimination${count > 1 ? 's' : ''}`);
                });
        }

        // Initialize teamCounts
        const teamCounts = {};
        if (weekEliminations.length > 0) {
            weekEliminations.forEach(user => {
                const reason = user.eliminationReason || '';
                const teamMatch = reason.match(/Picked (.+?)(?:,|$)/);
                if (teamMatch) {
                    const team = teamMatch[1];
                    teamCounts[team] = (teamCounts[team] || 0) + 1;
                }
            });
        }

        return {
            weekNumber,
            weekEliminations: weekEliminations.length,
            totalEliminated,
            stillActive,
            details: weekEliminations,
            teamCounts
        };

    } catch (error) {
        console.error(`❌ Error checking Week ${weekNumber}:`, error);
        return { error: error.message };
    }
};

// Check all weeks
window.checkAllWeeks = async function() {
    console.log('🚀 CHECKING ALL WEEKS 1-3');

    for (let week = 1; week <= 3; week++) {
        await window.checkWeekEliminations(week);
        console.log('─'.repeat(50));
    }
};

// Quick check for Miami user
window.checkMiamiUser = async function() {
    console.log('🐬 CHECKING MIAMI USER STATUS');

    try {
        const statusDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
        const statusSnap = await window.getDoc(statusDocRef);

        if (statusSnap.exists()) {
            const allStatuses = statusSnap.data();
            const miamiUserId = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';
            const miamiStatus = allStatuses[miamiUserId];

            console.log(`🐬 Miami user (${miamiUserId}) status:`, miamiStatus);
            return miamiStatus;
        }
    } catch (error) {
        console.error('Error checking Miami user:', error);
    }
};

// Function to actually RUN eliminations for a week
window.runEliminationsForWeek = async function(weekNumber = 1) {
    console.log(`🚀 RUNNING ELIMINATIONS FOR WEEK ${weekNumber}`);

    try {
        // Initialize survivorAutoElimination if not available
        if (!window.survivorAutoElimination) {
            console.log('🔧 Initializing survivorAutoElimination...');

            if (window.SurvivorAutoElimination) {
                window.survivorAutoElimination = new window.SurvivorAutoElimination(window.db);
                console.log('✅ survivorAutoElimination initialized');
            } else {
                console.error('❌ SurvivorAutoElimination class not available - loading script...');

                // Load the survivor elimination script
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = './survivorAutoElimination.js';
                    script.onload = () => {
                        window.survivorAutoElimination = new window.SurvivorAutoElimination(window.db);
                        console.log('✅ survivorAutoElimination loaded and initialized');
                        resolve();
                    };
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
        }

        const result = await window.survivorAutoElimination.checkEliminationsForWeek(weekNumber);
        console.log(`✅ Elimination run complete for Week ${weekNumber}:`, result);

        // Now check results
        await window.checkWeekEliminations(weekNumber);
        return result;

    } catch (error) {
        console.error(`❌ Error running eliminations for Week ${weekNumber}:`, error);
        return { error: error.message };
    }
};

// Show complete survivor pool status
window.showSurvivorStatus = async function() {
    console.log('🏈 SURVIVOR POOL STATUS');

    try {
        const statusDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
        const statusSnap = await window.getDoc(statusDocRef);

        if (!statusSnap.exists()) {
            console.log('📋 No survivor status document found');
            return;
        }

        const allStatuses = statusSnap.data();
        const alive = [];
        const dead = [];

        for (const [userId, status] of Object.entries(allStatuses)) {
            if (!status || typeof status !== 'object') {
                alive.push(userId);
                continue;
            }

            if (status.eliminated) {
                dead.push({
                    userId: userId.substring(0, 8) + '...',
                    week: status.eliminatedWeek,
                    reason: status.eliminationReason
                });
            } else {
                alive.push(userId);
            }
        }

        console.log(`💀 DEAD (${dead.length} users):`);
        dead.forEach(user => {
            console.log(`   Week ${user.week}: ${user.userId} - ${user.reason}`);
        });

        console.log(`✅ ALIVE (${alive.length} users) - can continue picking`);
        console.log(`📊 TOTAL: ${dead.length + alive.length} users in survivor pool`);

        return { alive: alive.length, dead: dead.length, deadDetails: dead };

    } catch (error) {
        console.error('❌ Error checking survivor status:', error);
    }
};

console.log('✅ Elimination checker loaded!');
console.log('📋 SURVIVOR POOL FUNCTIONS:');
console.log('   • showSurvivorStatus() - Show who is ALIVE vs DEAD');
console.log('   • runEliminationsForWeek(1) - RUN Week 1 eliminations (KILL THE DEAD)');
console.log('   • checkWeekEliminations(1) - Check Week 1 results');
console.log('   • checkMiamiUser() - Check Miami user specifically');
console.log('   • checkAllWeeks() - Check all weeks 1-3');

// Auto-run Week 1 check
setTimeout(() => {
    console.log('🚀 Auto-running Week 1 check...');
    window.checkWeekEliminations(1);
}, 2000);