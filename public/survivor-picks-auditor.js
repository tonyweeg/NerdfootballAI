// SURVIVOR PICKS AUDITOR - Comprehensive audit of all survivor picks by week
// Run in console at nerdfootball.web.app

window.SurvivorPicksAuditor = {

    // Week losing teams for reference
    losingTeams: {
        1: ['Dallas Cowboys', 'Kansas City Chiefs', 'Atlanta Falcons', 'Cleveland Browns',
            'Miami Dolphins', 'Carolina Panthers', 'New England Patriots', 'New Orleans Saints',
            'New York Jets', 'New York Giants', 'Tennessee Titans', 'Seattle Seahawks',
            'Detroit Lions', 'Houston Texans', 'Baltimore Ravens', 'Minnesota Vikings'],
        2: ['New York Giants', 'Pittsburgh Steelers', 'Tennessee Titans', 'New York Jets',
            'Miami Dolphins', 'Jacksonville Jaguars', 'New Orleans Saints', 'Cleveland Browns',
            'Chicago Bears', 'Denver Broncos', 'Carolina Panthers', 'Kansas City Chiefs',
            'Minnesota Vikings', 'Houston Texans', 'Las Vegas Raiders']
    },

    // Comprehensive audit of survivor picks for a specific week
    async auditWeekPicks(weekNumber) {
        console.log(`🔍 COMPREHENSIVE SURVIVOR PICKS AUDIT - WEEK ${weekNumber}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        const losingTeams = this.losingTeams[weekNumber];
        if (!losingTeams) {
            console.error(`❌ No losing teams data for Week ${weekNumber}`);
            return;
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
                return;
            }

            const memberIds = Object.keys(poolMembersSnap.data());
            console.log(`\n👥 Auditing ${memberIds.length} pool members...`);

            // Get current elimination status
            const statusDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
            const statusSnap = await window.getDoc(statusDocRef);
            const allStatuses = statusSnap.exists() ? statusSnap.data() : {};

            const audit = {
                weekNumber,
                totalMembers: memberIds.length,
                categories: {
                    alreadyEliminated: [],
                    validPicks: [],
                    noPicksDocument: [],
                    noWeekPick: [],
                    noGameId: [],
                    shouldBeEliminated: [],
                    shouldSurvive: []
                },
                teamPicks: {},
                errors: []
            };

            // Audit each member
            for (const userId of memberIds) {
                const shortUserId = userId.substring(0, 8) + '...';

                try {
                    // Check if already eliminated
                    if (allStatuses[userId]?.eliminated) {
                        audit.categories.alreadyEliminated.push({
                            userId: shortUserId,
                            eliminatedWeek: allStatuses[userId].eliminatedWeek,
                            reason: allStatuses[userId].eliminationReason
                        });
                        continue;
                    }

                    // Get user's picks document
                    const userPicksDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', userId);
                    const userPicksSnap = await window.getDoc(userPicksDocRef);

                    if (!userPicksSnap.exists()) {
                        audit.categories.noPicksDocument.push({ userId: shortUserId });
                        continue;
                    }

                    const userPicksData = userPicksSnap.data();
                    const userPicks = userPicksData.picks || {};
                    const weekPick = userPicks[weekNumber];

                    if (!weekPick) {
                        audit.categories.noWeekPick.push({ userId: shortUserId });
                        continue;
                    }

                    if (!weekPick.gameId) {
                        audit.categories.noGameId.push({
                            userId: shortUserId,
                            team: weekPick.team || 'UNKNOWN'
                        });
                        continue;
                    }

                    // Valid pick - analyze it
                    const pickedTeam = weekPick.team;
                    audit.categories.validPicks.push({
                        userId: shortUserId,
                        team: pickedTeam,
                        gameId: weekPick.gameId
                    });

                    // Count team picks
                    audit.teamPicks[pickedTeam] = (audit.teamPicks[pickedTeam] || 0) + 1;

                    // Check if should be eliminated
                    if (losingTeams.includes(pickedTeam)) {
                        audit.categories.shouldBeEliminated.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            gameId: weekPick.gameId,
                            currentStatus: allStatuses[userId] ? 'has status' : 'no status'
                        });
                    } else {
                        audit.categories.shouldSurvive.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            gameId: weekPick.gameId
                        });
                    }

                } catch (error) {
                    audit.errors.push({
                        userId: shortUserId,
                        error: error.message
                    });
                }
            }

            // Print comprehensive audit report
            this.printAuditReport(audit);

            return audit;

        } catch (error) {
            console.error(`❌ Audit failed for Week ${weekNumber}:`, error);
            return { error: error.message };
        }
    },

    // Print detailed audit report
    printAuditReport(audit) {
        const { categories } = audit;

        console.log(`\n📊 WEEK ${audit.weekNumber} PICKS AUDIT SUMMARY:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`👥 Total members: ${audit.totalMembers}`);
        console.log(`☠️ Already eliminated: ${categories.alreadyEliminated.length}`);
        console.log(`✅ Valid picks made: ${categories.validPicks.length}`);
        console.log(`❓ No picks document: ${categories.noPicksDocument.length}`);
        console.log(`⚠️ No week pick: ${categories.noWeekPick.length}`);
        console.log(`⚠️ No gameId: ${categories.noGameId.length}`);
        console.log(`💀 Should be eliminated: ${categories.shouldBeEliminated.length}`);
        console.log(`✅ Should survive: ${categories.shouldSurvive.length}`);

        // Show already eliminated users
        if (categories.alreadyEliminated.length > 0) {
            console.log(`\n☠️ ALREADY ELIMINATED (${categories.alreadyEliminated.length}):`);
            categories.alreadyEliminated.forEach(user => {
                console.log(`   ${user.userId} - Week ${user.eliminatedWeek}: ${user.reason}`);
            });
        }

        // Show users who should be eliminated
        if (categories.shouldBeEliminated.length > 0) {
            console.log(`\n💀 SHOULD BE ELIMINATED (${categories.shouldBeEliminated.length}):`);
            categories.shouldBeEliminated.forEach(user => {
                console.log(`   ${user.userId} picked ${user.team} (LOSER) - GameID: ${user.gameId}`);
            });
        }

        // Show team pick distribution
        if (Object.keys(audit.teamPicks).length > 0) {
            console.log(`\n🏈 TEAM PICK DISTRIBUTION:`);
            Object.entries(audit.teamPicks)
                .sort((a, b) => b[1] - a[1])
                .forEach(([team, count]) => {
                    const isLoser = this.losingTeams[audit.weekNumber]?.includes(team);
                    const indicator = isLoser ? '💀' : '✅';
                    console.log(`   ${indicator} ${team}: ${count} pick${count > 1 ? 's' : ''}`);
                });
        }

        // Show users with issues
        if (categories.noGameId.length > 0) {
            console.log(`\n⚠️ USERS WITH NO GAMEID (${categories.noGameId.length}):`);
            categories.noGameId.forEach(user => {
                console.log(`   ${user.userId} picked ${user.team} (no gameId)`);
            });
        }

        // Show errors
        if (audit.errors.length > 0) {
            console.log(`\n❌ ERRORS (${audit.errors.length}):`);
            audit.errors.forEach(error => {
                console.log(`   ${error.userId}: ${error.error}`);
            });
        }

        // Validation check
        const expectedActive = audit.totalMembers - categories.alreadyEliminated.length - categories.shouldBeEliminated.length;
        console.log(`\n🔍 VALIDATION:`);
        console.log(`   Expected active after eliminations: ${expectedActive}`);
        console.log(`   Users who should survive: ${categories.shouldSurvive.length}`);
        console.log(`   Users with no picks: ${categories.noPicksDocument.length + categories.noWeekPick.length + categories.noGameId.length}`);
    },

    // Audit multiple weeks
    async auditMultipleWeeks(weeks = [1, 2]) {
        console.log(`🔍 MULTI-WEEK SURVIVOR AUDIT`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        const results = {};

        for (const week of weeks) {
            console.log(`\n\n`);
            results[week] = await this.auditWeekPicks(week);
            if (week < Math.max(...weeks)) {
                console.log(`\n⏳ Waiting 2 seconds before next week...\n`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Summary across weeks
        console.log(`\n\n🎯 MULTI-WEEK SUMMARY:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        weeks.forEach(week => {
            if (results[week] && !results[week].error) {
                console.log(`Week ${week}: ${results[week].categories.shouldBeEliminated.length} should be eliminated, ${results[week].categories.shouldSurvive.length} should survive`);
            }
        });

        return results;
    }
};

console.log('🔍 SURVIVOR PICKS AUDITOR LOADED');
console.log('📋 Available functions:');
console.log('   • SurvivorPicksAuditor.auditWeekPicks(2) - Audit Week 2 picks');
console.log('   • SurvivorPicksAuditor.auditWeekPicks(1) - Audit Week 1 picks');
console.log('   • SurvivorPicksAuditor.auditMultipleWeeks([1,2]) - Audit both weeks');

// Auto-run Week 2 audit
setTimeout(() => {
    console.log('🚀 Auto-running Week 2 survivor picks audit...');
    window.SurvivorPicksAuditor.auditWeekPicks(2);
}, 2000);