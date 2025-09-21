// WEEK 2 GAMEID REPAIR TOOL - Fix missing gameIds in Week 2 survivor picks
// Run in console at nerdfootball.web.app

window.Week2GameIdRepair = {

    // Week 2 team to gameId mapping (from nfl_2025_week_2.json)
    week2TeamToGameMapping: {
        'Washington Commanders': 201,
        'Green Bay Packers': 201,
        'Cleveland Browns': 202,
        'Baltimore Ravens': 202,
        'Jacksonville Jaguars': 203,
        'Cincinnati Bengals': 203,
        'New York Giants': 204,
        'Dallas Cowboys': 204,
        'Chicago Bears': 205,
        'Detroit Lions': 205,
        'New England Patriots': 206,
        'Miami Dolphins': 206,
        'San Francisco 49ers': 207,
        'New Orleans Saints': 207,
        'Buffalo Bills': 208,
        'New York Jets': 208,
        'Seattle Seahawks': 209,
        'Pittsburgh Steelers': 209,
        'Los Angeles Rams': 210,
        'Tennessee Titans': 210,
        'Carolina Panthers': 211,
        'Arizona Cardinals': 211,
        'Denver Broncos': 212,
        'Indianapolis Colts': 212,
        'Philadelphia Eagles': 213,
        'Kansas City Chiefs': 213,
        'Atlanta Falcons': 214,
        'Minnesota Vikings': 214,
        'Tampa Bay Buccaneers': 215,
        'Houston Texans': 215,
        'Los Angeles Chargers': 216,
        'Las Vegas Raiders': 216
    },

    // Week 2 losing teams for verification
    week2LosingTeams: [
        'New York Giants', 'Pittsburgh Steelers', 'Tennessee Titans', 'New York Jets',
        'Miami Dolphins', 'Jacksonville Jaguars', 'New Orleans Saints', 'Cleveland Browns',
        'Chicago Bears', 'Denver Broncos', 'Carolina Panthers', 'Kansas City Chiefs',
        'Minnesota Vikings', 'Houston Texans', 'Las Vegas Raiders'
    ],

    // Analyze and repair Week 2 missing gameIds
    async analyzeAndRepairWeek2(dryRun = true) {
        console.log(`🔧 ${dryRun ? 'DRY RUN' : 'EXECUTING'} WEEK 2 GAMEID REPAIR`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        try {
            // Get pool members
            const poolMembersRef = window.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
            const poolMembersSnap = await window.getDoc(poolMembersRef);

            if (!poolMembersSnap.exists()) {
                console.error('❌ Pool members not found');
                return;
            }

            const memberIds = Object.keys(poolMembersSnap.data());
            console.log(`👥 Analyzing ${memberIds.length} pool members for Week 2...`);

            const analysis = {
                totalMembers: memberIds.length,
                withGameId: [],
                withoutGameId: [],
                canRepair: [],
                cannotRepair: [],
                losingTeamPicks: [],
                winningTeamPicks: []
            };

            // Analyze each member
            for (const userId of memberIds) {
                const shortUserId = userId.substring(0, 8) + '...';

                try {
                    const userPicksDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', userId);
                    const userPicksSnap = await window.getDoc(userPicksDocRef);

                    if (!userPicksSnap.exists()) continue;

                    const userPicksData = userPicksSnap.data();
                    const userPicks = userPicksData.picks || {};
                    const week2Pick = userPicks['2'];

                    if (!week2Pick) continue;

                    const pickedTeam = week2Pick.team;

                    // Check if has gameId
                    if (week2Pick.gameId) {
                        analysis.withGameId.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            gameId: week2Pick.gameId,
                            timestamp: week2Pick.timestamp || 'unknown'
                        });
                    } else {
                        analysis.withoutGameId.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            timestamp: week2Pick.timestamp || 'unknown'
                        });

                        // Check if we can repair (team exists in mapping)
                        if (this.week2TeamToGameMapping[pickedTeam]) {
                            analysis.canRepair.push({
                                userId: shortUserId,
                                fullUserId: userId,
                                team: pickedTeam,
                                suggestedGameId: this.week2TeamToGameMapping[pickedTeam],
                                isLoser: this.week2LosingTeams.includes(pickedTeam),
                                timestamp: week2Pick.timestamp || 'unknown'
                            });
                        } else {
                            analysis.cannotRepair.push({
                                userId: shortUserId,
                                team: pickedTeam,
                                reason: 'Team not found in Week 2 schedule'
                            });
                        }
                    }

                    // Categorize by win/loss for audit
                    if (this.week2LosingTeams.includes(pickedTeam)) {
                        analysis.losingTeamPicks.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            hasGameId: !!week2Pick.gameId
                        });
                    } else {
                        analysis.winningTeamPicks.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            hasGameId: !!week2Pick.gameId
                        });
                    }

                } catch (error) {
                    console.error(`❌ Error analyzing user ${userId}:`, error);
                }
            }

            // Print analysis report
            this.printRepairReport(analysis, dryRun);

            // Execute repairs if not dry run
            if (!dryRun && analysis.canRepair.length > 0) {
                return await this.executeRepairs(analysis.canRepair);
            }

            return analysis;

        } catch (error) {
            console.error(`❌ Week 2 repair analysis failed:`, error);
            return null;
        }
    },

    // Print detailed repair report
    printRepairReport(analysis, dryRun) {
        console.log(`\n📊 WEEK 2 GAMEID REPAIR REPORT:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`👥 Total members: ${analysis.totalMembers}`);
        console.log(`✅ With gameId: ${analysis.withGameId.length}`);
        console.log(`⚠️ Without gameId: ${analysis.withoutGameId.length}`);
        console.log(`🔧 Can repair: ${analysis.canRepair.length}`);
        console.log(`❌ Cannot repair: ${analysis.cannotRepair.length}`);

        if (analysis.canRepair.length > 0) {
            console.log(`\n🔧 ${dryRun ? 'WOULD REPAIR' : 'REPAIRING'} (${analysis.canRepair.length}):`);
            analysis.canRepair.forEach(pick => {
                const indicator = pick.isLoser ? '💀' : '✅';
                console.log(`   ${indicator} ${pick.userId}: ${pick.team} → GameID ${pick.suggestedGameId} ${pick.isLoser ? '(SHOULD BE ELIMINATED)' : '(SHOULD SURVIVE)'}`);
            });
        }

        if (analysis.cannotRepair.length > 0) {
            console.log(`\n❌ CANNOT REPAIR (${analysis.cannotRepair.length}):`);
            analysis.cannotRepair.forEach(pick => {
                console.log(`   ${pick.userId}: ${pick.team} (${pick.reason})`);
            });
        }

        // Show elimination impact analysis
        const losingPicksNeedingRepair = analysis.canRepair.filter(pick => pick.isLoser);
        if (losingPicksNeedingRepair.length > 0) {
            console.log(`\n💀 CRITICAL: ${losingPicksNeedingRepair.length} users picked losing teams but have no gameId - they should be eliminated!`);
            losingPicksNeedingRepair.forEach(pick => {
                console.log(`   💀 ${pick.userId}: ${pick.team} (losing team, needs elimination)`);
            });
        }

        if (dryRun && analysis.canRepair.length > 0) {
            console.log(`\n✅ To execute repairs, run: Week2GameIdRepair.analyzeAndRepairWeek2(false)`);
        }
    },

    // Execute actual repairs
    async executeRepairs(repairList) {
        console.log(`💾 Executing ${repairList.length} gameId repairs...`);

        const repairs = [];
        for (const pick of repairList) {
            try {
                const userPicksDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', pick.fullUserId);
                const userPicksSnap = await window.getDoc(userPicksDocRef);

                if (userPicksSnap.exists()) {
                    const userPicksData = userPicksSnap.data();
                    const userPicks = userPicksData.picks || {};

                    // Update Week 2 pick with gameId
                    if (userPicks['2']) {
                        userPicks['2'].gameId = pick.suggestedGameId;

                        // Write back to database
                        await window.setDoc(userPicksDocRef, {
                            picks: userPicks
                        }, { merge: true });

                        repairs.push(pick);
                        console.log(`✅ Repaired ${pick.userId}: ${pick.team} → GameID ${pick.suggestedGameId}`);
                    }
                }
            } catch (error) {
                console.error(`❌ Failed to repair ${pick.userId}:`, error);
            }
        }

        console.log(`\n🎉 REPAIR COMPLETE: Fixed ${repairs.length}/${repairList.length} gameIds`);
        return repairs;
    },

    // Run full repair workflow with elimination impact
    async fullWeek2RepairWorkflow() {
        console.log('🚀 FULL WEEK 2 GAMEID REPAIR WORKFLOW');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Step 1: Dry run analysis
        console.log('📋 Step 1: Analyzing current state (dry run)...');
        const analysis = await this.analyzeAndRepairWeek2(true);

        if (!analysis || analysis.canRepair.length === 0) {
            console.log('✅ No gameId repairs needed for Week 2');
            return;
        }

        // Step 2: Execute repairs
        console.log('\n💾 Step 2: Executing gameId repairs...');
        const repairs = await this.analyzeAndRepairWeek2(false);

        // Step 3: Verify elimination impact
        console.log('\n💀 Step 3: Verifying elimination impact...');
        const losingPicksRepaired = repairs.filter(pick => pick.isLoser);
        if (losingPicksRepaired.length > 0) {
            console.log(`⚠️ ${losingPicksRepaired.length} users with losing team picks now have gameIds - they should be eliminated!`);
            console.log('🚨 Consider running elimination logic after gameId repairs');
        }

        return { analysis, repairs };
    }
};

console.log('🔧 WEEK 2 GAMEID REPAIR TOOL LOADED');
console.log('📋 Available functions:');
console.log('   • Week2GameIdRepair.analyzeAndRepairWeek2(true) - Dry run analysis');
console.log('   • Week2GameIdRepair.analyzeAndRepairWeek2(false) - Execute repairs');
console.log('   • Week2GameIdRepair.fullWeek2RepairWorkflow() - Complete workflow');

// Auto-run dry run analysis
setTimeout(() => {
    console.log('🚀 Auto-analyzing Week 2 gameId issues...');
    window.Week2GameIdRepair.analyzeAndRepairWeek2(true);
}, 2000);