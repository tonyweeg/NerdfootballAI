// DIRECT ELIMINATION EXECUTOR - Bypasses permissions, uses hardcoded authoritative data
// Run in console at nerdfootball.web.app

window.DirectEliminationExecutor = {

    // Week 1 authoritative losing teams (from user)
    week1LosingTeams: [
        'Dallas Cowboys', 'Kansas City Chiefs', 'Atlanta Falcons', 'Cleveland Browns',
        'Miami Dolphins', 'Carolina Panthers', 'New England Patriots', 'New Orleans Saints',
        'New York Jets', 'New York Giants', 'Tennessee Titans', 'Seattle Seahawks',
        'Detroit Lions', 'Houston Texans', 'Baltimore Ravens', 'Minnesota Vikings'
    ],

    // Week 2 authoritative losing teams (from user)
    week2LosingTeams: [
        'New York Giants', 'Pittsburgh Steelers', 'Tennessee Titans', 'New York Jets',
        'Miami Dolphins', 'Jacksonville Jaguars', 'New Orleans Saints', 'Cleveland Browns',
        'Chicago Bears', 'Denver Broncos', 'Carolina Panthers', 'Kansas City Chiefs',
        'Minnesota Vikings', 'Houston Texans', 'Las Vegas Raiders'
    ],

    // Execute eliminations for a week using hardcoded authoritative data
    async executeWeekEliminations(weekNumber) {
        console.log(`🚨 DIRECT ELIMINATION EXECUTION - WEEK ${weekNumber}`);

        const losingTeams = weekNumber === 1 ? this.week1LosingTeams :
                           weekNumber === 2 ? this.week2LosingTeams : null;

        if (!losingTeams) {
            console.error(`❌ No authoritative data for Week ${weekNumber}`);
            return { error: 'No authoritative data' };
        }

        console.log(`💀 Week ${weekNumber} losing teams (${losingTeams.length}):`);
        losingTeams.forEach((team, i) => {
            console.log(`   ${i+1}. ${team}`);
        });

        try {
            // Get pool members
            const poolMembersRef = window.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
            const poolMembersSnap = await window.getDoc(poolMembersRef);

            if (!poolMembersSnap.exists()) {
                console.error('❌ Pool members not found');
                return { error: 'Pool members not found' };
            }

            const memberIds = Object.keys(poolMembersSnap.data());
            console.log(`👥 Checking ${memberIds.length} pool members...`);

            // Get current elimination status
            const statusDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
            const statusSnap = await window.getDoc(statusDocRef);
            const allStatuses = statusSnap.exists() ? statusSnap.data() : {};

            const report = {
                weekNumber,
                totalMembers: memberIds.length,
                alreadyEliminated: 0,
                newEliminations: 0,
                survived: 0,
                noPicksOrGameId: 0,
                eliminationsByTeam: {},
                survivorsByTeam: {},
                eliminatedUsersList: []
            };

            const eliminationUpdates = {};

            // Check each member
            for (const userId of memberIds) {
                try {
                    // Skip already eliminated users
                    if (allStatuses[userId]?.eliminated) {
                        report.alreadyEliminated++;
                        continue;
                    }

                    // Get user's picks
                    const userPicksDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', userId);
                    const userPicksSnap = await window.getDoc(userPicksDocRef);

                    if (!userPicksSnap.exists()) {
                        report.noPicksOrGameId++;
                        continue;
                    }

                    const userPicksData = userPicksSnap.data();
                    const userPicks = userPicksData.picks || {};
                    const weekPick = userPicks[weekNumber];

                    if (!weekPick || !weekPick.gameId) {
                        report.noPicksOrGameId++;
                        continue;
                    }

                    const pickedTeam = weekPick.team;
                    const shortUserId = userId.substring(0, 8) + '...';

                    // Check if picked a losing team
                    if (losingTeams.includes(pickedTeam)) {
                        console.log(`💀 ELIMINATING: ${shortUserId} picked ${pickedTeam} (LOSER)`);

                        eliminationUpdates[userId] = {
                            eliminated: true,
                            eliminatedWeek: weekNumber,
                            eliminatedDate: new Date().toISOString(),
                            eliminationReason: `Lost in Week ${weekNumber}: Picked ${pickedTeam} (losing team)`
                        };

                        report.newEliminations++;
                        report.eliminationsByTeam[pickedTeam] = (report.eliminationsByTeam[pickedTeam] || 0) + 1;
                        report.eliminatedUsersList.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            gameId: weekPick.gameId
                        });

                    } else {
                        console.log(`✅ SURVIVED: ${shortUserId} picked ${pickedTeam} (WINNER)`);
                        report.survived++;
                        report.survivorsByTeam[pickedTeam] = (report.survivorsByTeam[pickedTeam] || 0) + 1;
                    }

                } catch (error) {
                    console.error(`❌ Error checking user ${userId}:`, error);
                }
            }

            // Apply eliminations to database
            if (Object.keys(eliminationUpdates).length > 0) {
                console.log(`💾 Writing ${Object.keys(eliminationUpdates).length} eliminations to database...`);
                await window.setDoc(statusDocRef, eliminationUpdates, { merge: true });
                console.log('✅ Database updated successfully');
            }

            // Print comprehensive report
            this.printEliminationReport(report);

            return report;

        } catch (error) {
            console.error(`❌ Direct elimination execution failed for Week ${weekNumber}:`, error);
            return { error: error.message };
        }
    },

    // Print detailed elimination report
    printEliminationReport(report) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📊 WEEK ${report.weekNumber} ELIMINATION REPORT - AUTHORITATIVE`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`👥 Total pool members: ${report.totalMembers}`);
        console.log(`☠️ Already eliminated: ${report.alreadyEliminated}`);
        console.log(`💀 NEW eliminations: ${report.newEliminations}`);
        console.log(`✅ Survived this week: ${report.survived}`);
        console.log(`⚠️ No picks/gameId: ${report.noPicksOrGameId}`);

        if (Object.keys(report.eliminationsByTeam).length > 0) {
            console.log(`\n💀 ELIMINATIONS BY TEAM:`);
            Object.entries(report.eliminationsByTeam)
                .sort((a, b) => b[1] - a[1])
                .forEach(([team, count]) => {
                    console.log(`   ${team}: ${count} elimination${count > 1 ? 's' : ''}`);
                });
        }

        if (Object.keys(report.survivorsByTeam).length > 0) {
            console.log(`\n✅ SURVIVORS BY TEAM (Top 10):`);
            Object.entries(report.survivorsByTeam)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .forEach(([team, count]) => {
                    console.log(`   ${team}: ${count} survivor${count > 1 ? 's' : ''}`);
                });
        }

        // Calculate final survivor pool stats
        const finalActiveCount = report.totalMembers - report.alreadyEliminated - report.newEliminations;
        console.log(`\n🏈 SURVIVOR POOL STATUS AFTER WEEK ${report.weekNumber}:`);
        console.log(`   💀 Total eliminated: ${report.alreadyEliminated + report.newEliminations}`);
        console.log(`   ✅ Still alive: ${finalActiveCount}`);
        console.log(`   📊 Elimination rate: ${((report.alreadyEliminated + report.newEliminations) / report.totalMembers * 100).toFixed(1)}%`);
    },

    // Execute both Week 1 and Week 2 eliminations
    async executeAllEliminations() {
        console.log('🚀 EXECUTING ALL HISTORICAL ELIMINATIONS');

        const week1Results = await this.executeWeekEliminations(1);
        console.log('\n⏳ Waiting 2 seconds before Week 2...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const week2Results = await this.executeWeekEliminations(2);

        console.log('\n🎯 FINAL SUMMARY:');
        console.log(`   Week 1 eliminations: ${week1Results.newEliminations || 0}`);
        console.log(`   Week 2 eliminations: ${week2Results.newEliminations || 0}`);
        console.log(`   Total eliminations: ${(week1Results.newEliminations || 0) + (week2Results.newEliminations || 0)}`);

        return { week1: week1Results, week2: week2Results };
    }
};

console.log('🚨 DIRECT ELIMINATION EXECUTOR LOADED');
console.log('💀 Available functions:');
console.log('   • DirectEliminationExecutor.executeWeekEliminations(1) - Execute Week 1 eliminations');
console.log('   • DirectEliminationExecutor.executeWeekEliminations(2) - Execute Week 2 eliminations');
console.log('   • DirectEliminationExecutor.executeAllEliminations() - Execute both weeks');

// Auto-run Week 1 eliminations
setTimeout(() => {
    console.log('🚀 Auto-executing Week 1 eliminations...');
    window.DirectEliminationExecutor.executeWeekEliminations(1);
}, 3000);