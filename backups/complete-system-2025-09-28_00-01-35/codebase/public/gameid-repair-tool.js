// GAMEID REPAIR TOOL - Fix missing gameIds in survivor picks
// Run in console at nerdfootball.web.app

window.GameIdRepairTool = {

    // Week 2 team to gameId mapping (need to build this from actual game data)
    async buildTeamToGameMapping(weekNumber) {
        console.log(`🔧 Building team-to-gameId mapping for Week ${weekNumber}...`);

        try {
            // Get week schedule data to build team -> gameId mapping
            const response = await fetch(`nfl_2025_week_${weekNumber}.json`);
            if (!response.ok) {
                console.error(`❌ Could not fetch Week ${weekNumber} schedule`);
                return null;
            }

            const weekData = await response.json();
            const games = weekData.games || [];

            const teamToGameId = {};

            games.forEach(game => {
                // Map both home and away teams to this game ID
                if (game.away && game.home && game.id) {
                    teamToGameId[game.away] = game.id;
                    teamToGameId[game.home] = game.id;
                }
            });

            console.log(`✅ Built mapping for ${Object.keys(teamToGameId).length / 2} games`);
            console.log('🗺️ Team to GameId mapping:', teamToGameId);

            return teamToGameId;

        } catch (error) {
            console.error(`❌ Error building team mapping for Week ${weekNumber}:`, error);
            return null;
        }
    },

    // Analyze missing gameId patterns
    async analyzeMissingGameIds(weekNumber) {
        console.log(`🔍 ANALYZING MISSING GAMEIDS - WEEK ${weekNumber}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        try {
            // Get team to game mapping
            const teamToGameId = await this.buildTeamToGameMapping(weekNumber);
            if (!teamToGameId) {
                console.error('❌ Could not build team mapping');
                return;
            }

            // Get pool members
            const poolMembersRef = window.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
            const poolMembersSnap = await window.getDoc(poolMembersRef);

            if (!poolMembersSnap.exists()) {
                console.error('❌ Pool members not found');
                return;
            }

            const memberIds = Object.keys(poolMembersSnap.data());
            console.log(`👥 Analyzing ${memberIds.length} members...`);

            const analysis = {
                totalMembers: memberIds.length,
                withGameId: [],
                withoutGameId: [],
                canRepair: [],
                cannotRepair: [],
                pickTimestamps: []
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
                    const weekPick = userPicks[weekNumber];

                    if (!weekPick) continue;

                    const pickedTeam = weekPick.team;

                    // Check if has gameId
                    if (weekPick.gameId) {
                        analysis.withGameId.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            gameId: weekPick.gameId,
                            timestamp: weekPick.timestamp || 'unknown'
                        });
                    } else {
                        analysis.withoutGameId.push({
                            userId: shortUserId,
                            team: pickedTeam,
                            timestamp: weekPick.timestamp || 'unknown'
                        });

                        // Check if we can repair (team exists in mapping)
                        if (teamToGameId[pickedTeam]) {
                            analysis.canRepair.push({
                                userId: shortUserId,
                                fullUserId: userId,
                                team: pickedTeam,
                                suggestedGameId: teamToGameId[pickedTeam],
                                timestamp: weekPick.timestamp || 'unknown'
                            });
                        } else {
                            analysis.cannotRepair.push({
                                userId: shortUserId,
                                team: pickedTeam,
                                reason: 'Team not found in schedule'
                            });
                        }
                    }

                    // Collect timestamps for pattern analysis
                    if (weekPick.timestamp) {
                        analysis.pickTimestamps.push({
                            userId: shortUserId,
                            timestamp: weekPick.timestamp,
                            hasGameId: !!weekPick.gameId
                        });
                    }

                } catch (error) {
                    console.error(`❌ Error analyzing user ${userId}:`, error);
                }
            }

            // Print analysis report
            this.printAnalysisReport(analysis, weekNumber);

            return analysis;

        } catch (error) {
            console.error(`❌ Analysis failed:`, error);
            return null;
        }
    },

    // Print detailed analysis report
    printAnalysisReport(analysis, weekNumber) {
        console.log(`\n📊 WEEK ${weekNumber} GAMEID ANALYSIS REPORT:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`👥 Total members: ${analysis.totalMembers}`);
        console.log(`✅ With gameId: ${analysis.withGameId.length}`);
        console.log(`⚠️ Without gameId: ${analysis.withoutGameId.length}`);
        console.log(`🔧 Can repair: ${analysis.canRepair.length}`);
        console.log(`❌ Cannot repair: ${analysis.cannotRepair.length}`);

        if (analysis.canRepair.length > 0) {
            console.log(`\n🔧 REPAIRABLE PICKS (${analysis.canRepair.length}):`);
            analysis.canRepair.forEach(pick => {
                console.log(`   ${pick.userId}: ${pick.team} → GameID ${pick.suggestedGameId}`);
            });
        }

        if (analysis.cannotRepair.length > 0) {
            console.log(`\n❌ CANNOT REPAIR (${analysis.cannotRepair.length}):`);
            analysis.cannotRepair.forEach(pick => {
                console.log(`   ${pick.userId}: ${pick.team} (${pick.reason})`);
            });
        }

        // Timestamp pattern analysis
        if (analysis.pickTimestamps.length > 0) {
            console.log(`\n📅 TIMESTAMP PATTERN ANALYSIS:`);
            const withGameIdTimes = analysis.pickTimestamps.filter(p => p.hasGameId);
            const withoutGameIdTimes = analysis.pickTimestamps.filter(p => !p.hasGameId);

            console.log(`   Picks with gameId: ${withGameIdTimes.length}`);
            console.log(`   Picks without gameId: ${withoutGameIdTimes.length}`);

            if (withGameIdTimes.length > 0) {
                const avgWithGameId = new Date(withGameIdTimes[0].timestamp);
                console.log(`   Sample with gameId: ${avgWithGameId.toLocaleString()}`);
            }

            if (withoutGameIdTimes.length > 0) {
                const avgWithoutGameId = new Date(withoutGameIdTimes[0].timestamp);
                console.log(`   Sample without gameId: ${avgWithoutGameId.toLocaleString()}`);
            }
        }
    },

    // Repair missing gameIds (DRY RUN first)
    async repairMissingGameIds(weekNumber, dryRun = true) {
        console.log(`🔧 ${dryRun ? 'DRY RUN' : 'EXECUTING'} GAMEID REPAIR - WEEK ${weekNumber}`);

        const analysis = await this.analyzeMissingGameIds(weekNumber);
        if (!analysis || analysis.canRepair.length === 0) {
            console.log('❌ No repairable gameIds found');
            return;
        }

        console.log(`\n🔧 ${dryRun ? 'Would repair' : 'Repairing'} ${analysis.canRepair.length} missing gameIds...`);

        if (dryRun) {
            console.log('📋 DRY RUN - No actual changes made');
            analysis.canRepair.forEach(pick => {
                console.log(`   ${pick.userId}: ${pick.team} → GameID ${pick.suggestedGameId}`);
            });
            console.log('\n✅ To execute repairs, run: GameIdRepairTool.repairMissingGameIds(2, false)');
            return analysis;
        }

        // Execute actual repairs
        const repairs = [];
        for (const pick of analysis.canRepair) {
            try {
                const userPicksDocRef = window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', pick.fullUserId);
                const userPicksSnap = await window.getDoc(userPicksDocRef);

                if (userPicksSnap.exists()) {
                    const userPicksData = userPicksSnap.data();
                    const userPicks = userPicksData.picks || {};

                    // Update the specific week pick with gameId
                    userPicks[weekNumber].gameId = pick.suggestedGameId;

                    // Write back to database
                    await window.setDoc(userPicksDocRef, {
                        picks: userPicks
                    }, { merge: true });

                    repairs.push(pick);
                    console.log(`✅ Repaired ${pick.userId}: ${pick.team} → GameID ${pick.suggestedGameId}`);
                }
            } catch (error) {
                console.error(`❌ Failed to repair ${pick.userId}:`, error);
            }
        }

        console.log(`\n🎉 REPAIR COMPLETE: Fixed ${repairs.length}/${analysis.canRepair.length} gameIds`);
        return repairs;
    }
};

console.log('🔧 GAMEID REPAIR TOOL LOADED');
console.log('📋 Available functions:');
console.log('   • GameIdRepairTool.analyzeMissingGameIds(2) - Analyze Week 2 missing gameIds');
console.log('   • GameIdRepairTool.repairMissingGameIds(2, true) - Dry run repair');
console.log('   • GameIdRepairTool.repairMissingGameIds(2, false) - Execute repair');

// Auto-run analysis
setTimeout(() => {
    console.log('🚀 Auto-analyzing Week 2 missing gameIds...');
    window.GameIdRepairTool.analyzeMissingGameIds(2);
}, 2000);