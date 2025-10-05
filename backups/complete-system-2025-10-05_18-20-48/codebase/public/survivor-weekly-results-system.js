// AUTHORITATIVE WEEKLY RESULTS SYSTEM FOR SURVIVOR POOL
// Stores definitive losing teams for each week in Firestore
// Run in console at nerdfootball.web.app

window.SurvivorWeeklyResults = {

    // Store authoritative weekly results
    async storeWeeklyResults(weekNumber, losingTeams, winningTeams = null) {
        console.log(`📝 Storing Week ${weekNumber} authoritative results...`);

        try {
            const weeklyResultsRef = window.doc(window.db, `artifacts/nerdfootball/public/data/survivor_weekly_results`, `week${weekNumber}`);

            const weekData = {
                week: weekNumber,
                losingTeams: losingTeams,
                winningTeams: winningTeams,
                lastUpdated: new Date().toISOString(),
                source: 'manual_authoritative',
                totalLosingTeams: losingTeams.length
            };

            await window.setDoc(weeklyResultsRef, weekData);
            console.log(`✅ Week ${weekNumber} results stored: ${losingTeams.length} losing teams`);
            return weekData;

        } catch (error) {
            console.error(`❌ Error storing Week ${weekNumber} results:`, error);
            return { error: error.message };
        }
    },

    // Get authoritative weekly results
    async getWeeklyResults(weekNumber) {
        try {
            const weeklyResultsRef = window.doc(window.db, `artifacts/nerdfootball/public/data/survivor_weekly_results`, `week${weekNumber}`);
            const weekSnap = await window.getDoc(weeklyResultsRef);

            if (weekSnap.exists()) {
                return weekSnap.data();
            } else {
                console.log(`⚠️ No authoritative results found for Week ${weekNumber}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ Error getting Week ${weekNumber} results:`, error);
            return { error: error.message };
        }
    },

    // Initialize with Week 1 & 2 data
    async initializeWeeklyResults() {
        console.log('🚀 Initializing authoritative weekly results database...');

        // Week 1 losing teams (from user)
        const week1Losers = [
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

        // Week 2 losing teams (from user)
        const week2Losers = [
            'New York Giants',
            'Pittsburgh Steelers',
            'Tennessee Titans',
            'New York Jets',
            'Miami Dolphins',
            'Jacksonville Jaguars',
            'New Orleans Saints',
            'Cleveland Browns',
            'Chicago Bears',
            'Denver Broncos',
            'Carolina Panthers',
            'Kansas City Chiefs',
            'Minnesota Vikings',
            'Houston Texans',
            'Las Vegas Raiders'
        ];

        await this.storeWeeklyResults(1, week1Losers);
        await this.storeWeeklyResults(2, week2Losers);

        console.log('✅ Weekly results database initialized');
        return { week1: week1Losers.length, week2: week2Losers.length };
    },

    // Execute eliminations using authoritative data
    async executeEliminationsForWeek(weekNumber) {
        console.log(`🚨 EXECUTING ELIMINATIONS FOR WEEK ${weekNumber} - AUTHORITATIVE DATA`);

        try {
            // Get authoritative results
            const weekResults = await this.getWeeklyResults(weekNumber);
            if (!weekResults) {
                console.error(`❌ No authoritative data for Week ${weekNumber}`);
                return { error: 'No weekly results found' };
            }

            const losingTeams = weekResults.losingTeams;
            console.log(`💀 Week ${weekNumber} losing teams (${losingTeams.length}):`);
            losingTeams.forEach((team, i) => {
                console.log(`   ${i+1}. ${team}`);
            });

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

            const auditReport = {
                weekNumber,
                totalMembers: memberIds.length,
                membersWithPicks: 0,
                membersWithoutPicks: 0,
                survivedPicks: [],
                eliminatedPicks: [],
                alreadyEliminated: [],
                noGameId: [],
                eliminationsByTeam: {}
            };

            const eliminationUpdates = {};

            // Check each member
            for (const userId of memberIds) {
                try {
                    // Skip already eliminated users
                    if (allStatuses[userId]?.eliminated) {
                        auditReport.alreadyEliminated.push({
                            userId: userId.substring(0, 8) + '...',
                            eliminatedWeek: allStatuses[userId].eliminatedWeek,
                            reason: allStatuses[userId].eliminationReason
                        });
                        continue;
                    }

                    // Get user's picks
                    const userPicksDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', userId);
                    const userPicksSnap = await window.getDoc(userPicksDocRef);

                    if (!userPicksSnap.exists()) {
                        auditReport.membersWithoutPicks++;
                        continue;
                    }

                    const userPicksData = userPicksSnap.data();
                    const userPicks = userPicksData.picks || {};
                    const weekPick = userPicks[weekNumber];

                    if (!weekPick) {
                        auditReport.membersWithoutPicks++;
                        continue;
                    }

                    auditReport.membersWithPicks++;

                    // Check if no gameId
                    if (!weekPick.gameId) {
                        auditReport.noGameId.push({
                            userId: userId.substring(0, 8) + '...',
                            team: weekPick.team || 'UNKNOWN'
                        });
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

                        auditReport.eliminatedPicks.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            gameId: weekPick.gameId
                        });

                        // Count eliminations by team
                        auditReport.eliminationsByTeam[pickedTeam] = (auditReport.eliminationsByTeam[pickedTeam] || 0) + 1;

                    } else {
                        console.log(`✅ SURVIVED: ${shortUserId} picked ${pickedTeam} (WINNER)`);

                        auditReport.survivedPicks.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            gameId: weekPick.gameId
                        });
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

            // Print comprehensive audit report
            this.printAuditReport(auditReport);

            return auditReport;

        } catch (error) {
            console.error(`❌ Elimination execution failed for Week ${weekNumber}:`, error);
            return { error: error.message };
        }
    },

    // Print detailed audit report
    printAuditReport(report) {
        console.log(`📊 WEEK ${report.weekNumber} ELIMINATION AUDIT REPORT:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`   👥 Total pool members: ${report.totalMembers}`);
        console.log(`   🎯 Members with Week ${report.weekNumber} picks: ${report.membersWithPicks}`);
        console.log(`   ❓ Members without picks: ${report.membersWithoutPicks}`);
        console.log(`   ⚠️ Members with no gameId: ${report.noGameId.length}`);
        console.log(`   ☠️ Already eliminated: ${report.alreadyEliminated.length}`);
        console.log(`   💀 NEW eliminations: ${report.eliminatedPicks.length}`);
        console.log(`   ✅ Survived: ${report.survivedPicks.length}`);

        if (Object.keys(report.eliminationsByTeam).length > 0) {
            console.log(`💀 ELIMINATIONS BY TEAM:`);
            Object.entries(report.eliminationsByTeam)
                .sort((a, b) => b[1] - a[1])
                .forEach(([team, count]) => {
                    console.log(`   ${team}: ${count} elimination${count > 1 ? 's' : ''}`);
                });
        }

        // Show survival stats
        if (report.survivedPicks.length > 0) {
            const survivalsByTeam = {};
            report.survivedPicks.forEach(pick => {
                survivalsByTeam[pick.team] = (survivalsByTeam[pick.team] || 0) + 1;
            });

            console.log(`✅ SURVIVORS BY TEAM:`);
            Object.entries(survivalsByTeam)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10) // Top 10
                .forEach(([team, count]) => {
                    console.log(`   ${team}: ${count} survivor${count > 1 ? 's' : ''}`);
                });
        }
    }
};

// Initialize and execute
console.log('🏈 SURVIVOR WEEKLY RESULTS SYSTEM LOADED');
console.log('📋 Available functions:');
console.log('   • SurvivorWeeklyResults.initializeWeeklyResults() - Setup Week 1 & 2 data');
console.log('   • SurvivorWeeklyResults.executeEliminationsForWeek(1) - Execute Week 1 eliminations');
console.log('   • SurvivorWeeklyResults.executeEliminationsForWeek(2) - Execute Week 2 eliminations');
console.log('   • SurvivorWeeklyResults.getWeeklyResults(1) - Get Week 1 authoritative data');

// Auto-initialize and execute Week 1
setTimeout(async () => {
    console.log('🚀 Auto-initializing weekly results system...');
    await window.SurvivorWeeklyResults.initializeWeeklyResults();

    console.log('🚀 Auto-executing Week 1 eliminations...');
    await window.SurvivorWeeklyResults.executeEliminationsForWeek(1);
}, 3000);