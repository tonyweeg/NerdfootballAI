// WEEK 1 GAMEID REPAIR TOOL - Fix missing gameIds in Week 1 survivor picks
// Run in console at nerdfootball.web.app

window.Week1GameIdRepair = {

    // Week 1 team to gameId mapping (from nfl_2025_week_1.json)
    week1TeamToGameMapping: {
        'Dallas Cowboys': 101,
        'Philadelphia Eagles': 101,
        'Kansas City Chiefs': 102,
        'Los Angeles Chargers': 102,
        'Tampa Bay Buccaneers': 103,
        'Atlanta Falcons': 103,
        'Cincinnati Bengals': 104,
        'Cleveland Browns': 104,
        'Miami Dolphins': 105,
        'Indianapolis Colts': 105,
        'Carolina Panthers': 106,
        'Jacksonville Jaguars': 106,
        'Las Vegas Raiders': 107,
        'New England Patriots': 107,
        'Arizona Cardinals': 108,
        'New Orleans Saints': 108,
        'Pittsburgh Steelers': 109,
        'New York Jets': 109,
        'New York Giants': 110,
        'Washington Commanders': 110,
        'Tennessee Titans': 111,
        'Denver Broncos': 111,
        'San Francisco 49ers': 112,
        'Seattle Seahawks': 112,
        'Detroit Lions': 113,
        'Green Bay Packers': 113,
        'Houston Texans': 114,
        'Los Angeles Rams': 114,
        'Baltimore Ravens': 115,
        'Buffalo Bills': 115,
        'Minnesota Vikings': 116,
        'Chicago Bears': 116
    },

    // Week 1 losing teams for verification
    week1LosingTeams: [
        'Dallas Cowboys', 'Kansas City Chiefs', 'Atlanta Falcons', 'Cleveland Browns',
        'Miami Dolphins', 'Carolina Panthers', 'New England Patriots', 'New Orleans Saints',
        'New York Jets', 'New York Giants', 'Tennessee Titans', 'Seattle Seahawks',
        'Detroit Lions', 'Houston Texans', 'Baltimore Ravens', 'Minnesota Vikings'
    ],

    // Analyze and repair Week 1 missing gameIds
    async analyzeAndRepairWeek1(dryRun = true) {
        console.log(`🔧 ${dryRun ? 'DRY RUN' : 'EXECUTING'} WEEK 1 GAMEID REPAIR`);
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
            console.log(`👥 Analyzing ${memberIds.length} pool members for Week 1...`);

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
                    const week1Pick = userPicks['1'];

                    if (!week1Pick) continue;

                    const pickedTeam = week1Pick.team;

                    // Check if has gameId
                    if (week1Pick.gameId) {
                        analysis.withGameId.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            gameId: week1Pick.gameId,
                            timestamp: week1Pick.timestamp || 'unknown'
                        });
                    } else {
                        analysis.withoutGameId.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            timestamp: week1Pick.timestamp || 'unknown'
                        });

                        // Check if we can repair (team exists in mapping)
                        if (this.week1TeamToGameMapping[pickedTeam]) {
                            analysis.canRepair.push({
                                userId: shortUserId,
                                fullUserId: userId,
                                team: pickedTeam,
                                suggestedGameId: this.week1TeamToGameMapping[pickedTeam],
                                isLoser: this.week1LosingTeams.includes(pickedTeam),
                                timestamp: week1Pick.timestamp || 'unknown'
                            });
                        } else {
                            analysis.cannotRepair.push({
                                userId: shortUserId,
                                team: pickedTeam,
                                reason: 'Team not found in Week 1 schedule'
                            });
                        }
                    }

                    // Categorize by win/loss for audit
                    if (this.week1LosingTeams.includes(pickedTeam)) {
                        analysis.losingTeamPicks.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            hasGameId: !!week1Pick.gameId
                        });
                    } else {
                        analysis.winningTeamPicks.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            hasGameId: !!week1Pick.gameId
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
            console.error(`❌ Week 1 repair analysis failed:`, error);
            return null;
        }
    },

    // Print detailed repair report
    printRepairReport(analysis, dryRun) {
        console.log(`\n📊 WEEK 1 GAMEID REPAIR REPORT:`);
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
            console.log(`\n✅ To execute repairs, run: Week1GameIdRepair.analyzeAndRepairWeek1(false)`);
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

                    // Update Week 1 pick with gameId
                    if (userPicks['1']) {
                        userPicks['1'].gameId = pick.suggestedGameId;

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
    async fullWeek1RepairWorkflow() {
        console.log('🚀 FULL WEEK 1 GAMEID REPAIR WORKFLOW');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Step 1: Dry run analysis
        console.log('📋 Step 1: Analyzing current state (dry run)...');
        const analysis = await this.analyzeAndRepairWeek1(true);

        if (!analysis || analysis.canRepair.length === 0) {
            console.log('✅ No gameId repairs needed for Week 1');
            return;
        }

        // Step 2: Execute repairs
        console.log('\n💾 Step 2: Executing gameId repairs...');
        const repairs = await this.analyzeAndRepairWeek1(false);

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

console.log('🔧 WEEK 1 GAMEID REPAIR TOOL LOADED');
console.log('📋 Available functions:');
console.log('   • Week1GameIdRepair.analyzeAndRepairWeek1(true) - Dry run analysis');
console.log('   • Week1GameIdRepair.analyzeAndRepairWeek1(false) - Execute repairs');
console.log('   • Week1GameIdRepair.fullWeek1RepairWorkflow() - Complete workflow');