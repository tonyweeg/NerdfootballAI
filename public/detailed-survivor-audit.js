// DETAILED SURVIVOR AUDIT - Shows name, email, team picked by week
// Run in console at nerdfootball.web.app

window.DetailedSurvivorAudit = {

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

    // Get user profile info (name, email)
    async getUserProfile(userId) {
        try {
            const userDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdfootball_users', userId);
            const userSnap = await window.getDoc(userDocRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                return {
                    name: userData.displayName || 'Unknown',
                    email: userData.email || 'Unknown'
                };
            }
            return { name: 'Unknown', email: 'Unknown' };
        } catch (error) {
            return { name: 'Error', email: 'Error' };
        }
    },

    // Detailed audit for a specific week
    async detailedWeekAudit(weekNumber) {
        console.log(`📋 DETAILED SURVIVOR AUDIT - WEEK ${weekNumber}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

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
            console.log(`\n👥 Auditing ${memberIds.length} pool members for Week ${weekNumber}...`);

            // Get current elimination status
            const statusDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
            const statusSnap = await window.getDoc(statusDocRef);
            const allStatuses = statusSnap.exists() ? statusSnap.data() : {};

            const detailedAudit = {
                weekNumber,
                totalMembers: memberIds.length,
                userDetails: [],
                winningPicks: [],
                losingPicks: [],
                noPicks: [],
                eliminated: []
            };

            // Audit each member with full details
            for (const userId of memberIds) {
                try {
                    // Get user profile
                    const profile = await this.getUserProfile(userId);
                    const shortUserId = userId.substring(0, 8) + '...';

                    // Check if already eliminated
                    if (allStatuses[userId]?.eliminated) {
                        detailedAudit.eliminated.push({
                            userId: shortUserId,
                            fullUserId: userId,
                            name: profile.name,
                            email: profile.email,
                            eliminatedWeek: allStatuses[userId].eliminatedWeek,
                            reason: allStatuses[userId].eliminationReason
                        });
                        continue;
                    }

                    // Get user's picks
                    const userPicksDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', userId);
                    const userPicksSnap = await window.getDoc(userPicksDocRef);

                    if (!userPicksSnap.exists()) {
                        detailedAudit.noPicks.push({
                            userId: shortUserId,
                            fullUserId: userId,
                            name: profile.name,
                            email: profile.email,
                            reason: 'No picks document'
                        });
                        continue;
                    }

                    const userPicksData = userPicksSnap.data();
                    const userPicks = userPicksData.picks || {};
                    const weekPick = userPicks[weekNumber];

                    if (!weekPick) {
                        detailedAudit.noPicks.push({
                            userId: shortUserId,
                            fullUserId: userId,
                            name: profile.name,
                            email: profile.email,
                            reason: `No Week ${weekNumber} pick`
                        });
                        continue;
                    }

                    const pickedTeam = weekPick.team;
                    const hasGameId = !!weekPick.gameId;

                    const userDetail = {
                        userId: shortUserId,
                        fullUserId: userId,
                        name: profile.name,
                        email: profile.email,
                        pickedTeam: pickedTeam,
                        gameId: weekPick.gameId || 'MISSING',
                        timestamp: weekPick.timestamp || 'Unknown',
                        hasGameId: hasGameId
                    };

                    detailedAudit.userDetails.push(userDetail);

                    // Categorize by win/loss
                    if (losingTeams.includes(pickedTeam)) {
                        detailedAudit.losingPicks.push({
                            ...userDetail,
                            shouldBeEliminated: true
                        });
                    } else {
                        detailedAudit.winningPicks.push({
                            ...userDetail,
                            shouldSurvive: true
                        });
                    }

                } catch (error) {
                    console.error(`❌ Error auditing user ${userId}:`, error);
                }
            }

            // Print detailed audit report
            this.printDetailedAuditReport(detailedAudit);

            return detailedAudit;

        } catch (error) {
            console.error(`❌ Detailed audit failed for Week ${weekNumber}:`, error);
            return null;
        }
    },

    // Print comprehensive detailed report
    printDetailedAuditReport(audit) {
        console.log(`\n📊 DETAILED WEEK ${audit.weekNumber} SURVIVOR AUDIT REPORT:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`👥 Total members: ${audit.totalMembers}`);
        console.log(`✅ Winning picks: ${audit.winningPicks.length}`);
        console.log(`💀 Losing picks: ${audit.losingPicks.length}`);
        console.log(`❓ No picks: ${audit.noPicks.length}`);
        console.log(`☠️ Already eliminated: ${audit.eliminated.length}`);

        // Show all winning picks with full details
        if (audit.winningPicks.length > 0) {
            console.log(`\n✅ WINNING PICKS (${audit.winningPicks.length}) - SHOULD SURVIVE:`);
            console.log(`   Name                    | Email                           | Team Picked           | GameID`);
            console.log(`   ──────────────────────────────────────────────────────────────────────────────────────────`);
            audit.winningPicks.forEach(pick => {
                const name = pick.name.padEnd(23);
                const email = pick.email.padEnd(31);
                const team = pick.pickedTeam.padEnd(22);
                const gameId = pick.gameId || 'MISSING';
                console.log(`   ${name} | ${email} | ${team} | ${gameId}`);
            });
        }

        // Show all losing picks with full details
        if (audit.losingPicks.length > 0) {
            console.log(`\n💀 LOSING PICKS (${audit.losingPicks.length}) - SHOULD BE ELIMINATED:`);
            console.log(`   Name                    | Email                           | Team Picked           | GameID`);
            console.log(`   ──────────────────────────────────────────────────────────────────────────────────────────`);
            audit.losingPicks.forEach(pick => {
                const name = pick.name.padEnd(23);
                const email = pick.email.padEnd(31);
                const team = pick.pickedTeam.padEnd(22);
                const gameId = pick.gameId || 'MISSING';
                console.log(`   💀 ${name} | ${email} | ${team} | ${gameId}`);
            });
        }

        // Show users with no picks
        if (audit.noPicks.length > 0) {
            console.log(`\n❓ NO PICKS (${audit.noPicks.length}):`);
            console.log(`   Name                    | Email                           | Reason`);
            console.log(`   ──────────────────────────────────────────────────────────────────────────────────────────`);
            audit.noPicks.forEach(user => {
                const name = user.name.padEnd(23);
                const email = user.email.padEnd(31);
                console.log(`   ${name} | ${email} | ${user.reason}`);
            });
        }

        // Show eliminated users
        if (audit.eliminated.length > 0) {
            console.log(`\n☠️ ALREADY ELIMINATED (${audit.eliminated.length}):`);
            console.log(`   Name                    | Email                           | Week | Reason`);
            console.log(`   ──────────────────────────────────────────────────────────────────────────────────────────`);
            audit.eliminated.forEach(user => {
                const name = user.name.padEnd(23);
                const email = user.email.padEnd(31);
                const week = user.eliminatedWeek || 'Unknown';
                console.log(`   ${name} | ${email} | ${week}    | ${user.reason}`);
            });
        }

        // Team distribution
        if (audit.winningPicks.length > 0) {
            const teamCounts = {};
            audit.winningPicks.forEach(pick => {
                teamCounts[pick.pickedTeam] = (teamCounts[pick.pickedTeam] || 0) + 1;
            });

            console.log(`\n🏈 TEAM PICK DISTRIBUTION (WINNING TEAMS):`);
            Object.entries(teamCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([team, count]) => {
                    console.log(`   ✅ ${team}: ${count} pick${count > 1 ? 's' : ''}`);
                });
        }
    },

    // Audit multiple weeks with full details
    async detailedMultiWeekAudit(weeks = [1, 2]) {
        console.log(`🔍 DETAILED MULTI-WEEK SURVIVOR AUDIT`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        const results = {};

        for (const week of weeks) {
            results[week] = await this.detailedWeekAudit(week);
            if (week < Math.max(...weeks)) {
                console.log(`\n⏳ Waiting 3 seconds before next week...\n`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // Cross-week summary
        console.log(`\n\n🎯 CROSS-WEEK DETAILED SUMMARY:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        weeks.forEach(week => {
            if (results[week] && !results[week].error) {
                console.log(`Week ${week}: ${results[week].losingPicks.length} losing picks, ${results[week].winningPicks.length} winning picks, ${results[week].noPicks.length} no picks`);
            }
        });

        return results;
    }
};

console.log('📋 DETAILED SURVIVOR AUDITOR LOADED');
console.log('🔍 Available functions:');
console.log('   • DetailedSurvivorAudit.detailedWeekAudit(1) - Detailed Week 1 audit with names/emails');
console.log('   • DetailedSurvivorAudit.detailedWeekAudit(2) - Detailed Week 2 audit with names/emails');
console.log('   • DetailedSurvivorAudit.detailedMultiWeekAudit([1,2]) - Both weeks with full details');