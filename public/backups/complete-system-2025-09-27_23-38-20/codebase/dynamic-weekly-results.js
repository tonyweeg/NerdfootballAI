// DYNAMIC WEEKLY RESULTS SYSTEM
// Automatically determines losing teams + manual override capability

window.DynamicWeeklyResults = {

    // Automatically determine losing teams from ESPN API
    async autoDetectLosingTeams(weekNumber) {
        console.log(`🔍 Auto-detecting losing teams for Week ${weekNumber} from ESPN...`);

        try {
            // Use existing ESPN API system
            if (!window.espnAPI) {
                console.error('❌ ESPN API not available');
                return { error: 'ESPN API not available' };
            }

            const games = await window.espnAPI.getGames(weekNumber);
            console.log(`📊 Retrieved ${games.length} games for Week ${weekNumber}`);

            const losingTeams = [];
            const winningTeams = [];
            const incompleteGames = [];

            for (const game of games) {
                // Check if game is complete
                if (game.status === 'FINAL' || game.status === 'Final') {
                    const homeScore = parseInt(game.homeScore) || 0;
                    const awayScore = parseInt(game.awayScore) || 0;

                    if (homeScore > awayScore) {
                        // Home team won, away team lost
                        winningTeams.push(game.homeTeam);
                        losingTeams.push(game.awayTeam);
                        console.log(`✅ ${game.homeTeam} beat ${game.awayTeam} (${homeScore}-${awayScore})`);
                    } else if (awayScore > homeScore) {
                        // Away team won, home team lost
                        winningTeams.push(game.awayTeam);
                        losingTeams.push(game.homeTeam);
                        console.log(`✅ ${game.awayTeam} beat ${game.homeTeam} (${awayScore}-${homeScore})`);
                    } else {
                        // Tie - both teams survive in survivor logic
                        console.log(`🤝 TIE: ${game.homeTeam} vs ${game.awayTeam} (${homeScore}-${awayScore})`);
                    }
                } else {
                    incompleteGames.push({
                        home: game.homeTeam,
                        away: game.awayTeam,
                        status: game.status
                    });
                    console.log(`⏳ Incomplete: ${game.awayTeam} @ ${game.homeTeam} (Status: ${game.status})`);
                }
            }

            const result = {
                weekNumber,
                losingTeams,
                winningTeams,
                incompleteGames,
                totalGames: games.length,
                completedGames: losingTeams.length + (winningTeams.length - losingTeams.length), // Account for ties
                source: 'espn_api_auto',
                detectedAt: new Date().toISOString()
            };

            console.log(`🎯 Auto-detection results for Week ${weekNumber}:`);
            console.log(`   💀 Losing teams: ${losingTeams.length}`);
            console.log(`   ✅ Winning teams: ${winningTeams.length}`);
            console.log(`   ⏳ Incomplete games: ${incompleteGames.length}`);

            return result;

        } catch (error) {
            console.error(`❌ Auto-detection failed for Week ${weekNumber}:`, error);
            return { error: error.message };
        }
    },

    // Smart weekly results processor - auto + manual override
    async processWeeklyResults(weekNumber, manualLosingTeams = null) {
        console.log(`🧠 SMART PROCESSING - Week ${weekNumber}`);

        let finalResult;

        if (manualLosingTeams) {
            // Manual override provided
            console.log(`👤 Using manual override: ${manualLosingTeams.length} losing teams`);
            finalResult = {
                weekNumber,
                losingTeams: manualLosingTeams,
                source: 'manual_override',
                processedAt: new Date().toISOString()
            };
        } else {
            // Try auto-detection first
            console.log(`🤖 Attempting auto-detection...`);
            const autoResult = await this.autoDetectLosingTeams(weekNumber);

            if (autoResult.error) {
                console.log(`❌ Auto-detection failed: ${autoResult.error}`);
                return { error: 'Auto-detection failed and no manual override provided' };
            }

            if (autoResult.incompleteGames.length > 0) {
                console.log(`⚠️ ${autoResult.incompleteGames.length} games still incomplete`);
                console.log(`❓ Continue with partial results? Or wait for completion?`);

                // For now, continue with partial results but flag them
                finalResult = {
                    ...autoResult,
                    source: 'espn_api_partial',
                    warning: `${autoResult.incompleteGames.length} games incomplete`
                };
            } else {
                console.log(`✅ All games complete - using auto-detected results`);
                finalResult = autoResult;
            }
        }

        // Store in authoritative database
        await window.SurvivorWeeklyResults.storeWeeklyResults(
            finalResult.weekNumber,
            finalResult.losingTeams,
            finalResult.winningTeams
        );

        return finalResult;
    },

    // Weekly elimination workflow
    async weeklyEliminationWorkflow(weekNumber, manualLosingTeams = null) {
        console.log(`🔄 WEEKLY ELIMINATION WORKFLOW - Week ${weekNumber}`);

        try {
            // Step 1: Process weekly results (auto + manual)
            const weeklyResults = await this.processWeeklyResults(weekNumber, manualLosingTeams);

            if (weeklyResults.error) {
                console.error(`❌ Weekly results processing failed: ${weeklyResults.error}`);
                return weeklyResults;
            }

            // Step 2: Execute eliminations using stored authoritative data
            const eliminationResults = await window.SurvivorWeeklyResults.executeEliminationsForWeek(weekNumber);

            // Step 3: Combined report
            console.log(`📊 WEEKLY WORKFLOW COMPLETE - Week ${weekNumber}`);
            console.log(`   📋 Results Source: ${weeklyResults.source}`);
            console.log(`   💀 Losing Teams: ${weeklyResults.losingTeams.length}`);
            console.log(`   ☠️ Users Eliminated: ${eliminationResults.eliminatedPicks?.length || 0}`);

            return {
                weekNumber,
                weeklyResults,
                eliminationResults,
                workflow: 'completed'
            };

        } catch (error) {
            console.error(`❌ Weekly elimination workflow failed:`, error);
            return { error: error.message };
        }
    }
};

// Preset data for quick initialization
window.WeeklyResultsPresets = {
    week1Losers: [
        'Dallas Cowboys', 'Kansas City Chiefs', 'Atlanta Falcons', 'Cleveland Browns',
        'Miami Dolphins', 'Carolina Panthers', 'New England Patriots', 'New Orleans Saints',
        'New York Jets', 'New York Giants', 'Tennessee Titans', 'Seattle Seahawks',
        'Detroit Lions', 'Houston Texans', 'Baltimore Ravens', 'Minnesota Vikings'
    ],

    week2Losers: [
        'New York Giants', 'Pittsburgh Steelers', 'Tennessee Titans', 'New York Jets',
        'Miami Dolphins', 'Jacksonville Jaguars', 'New Orleans Saints', 'Cleveland Browns',
        'Chicago Bears', 'Denver Broncos', 'Carolina Panthers', 'Kansas City Chiefs',
        'Minnesota Vikings', 'Houston Texans', 'Las Vegas Raiders'
    ]
};

console.log('🚀 DYNAMIC WEEKLY RESULTS SYSTEM LOADED');
console.log('🤖 Available functions:');
console.log('   • DynamicWeeklyResults.autoDetectLosingTeams(1) - Auto-detect Week 1 losers');
console.log('   • DynamicWeeklyResults.weeklyEliminationWorkflow(1) - Full Week 1 workflow (auto)');
console.log('   • DynamicWeeklyResults.weeklyEliminationWorkflow(1, WeeklyResultsPresets.week1Losers) - Week 1 with manual override');
console.log('   • DynamicWeeklyResults.weeklyEliminationWorkflow(2, WeeklyResultsPresets.week2Losers) - Week 2 workflow');