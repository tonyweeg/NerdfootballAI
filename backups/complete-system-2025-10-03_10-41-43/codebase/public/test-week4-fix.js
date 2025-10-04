// Test Week 4 Scoring Fix
// Test the corrected getWeekGamesWithResults function

console.log('🧪 Testing Week 4 scoring fix...');

// Simulate the corrected function
async function testGetWeekGamesWithResults(weekNumber) {
    try {
        const response = await fetch(`./nfl_2025_week_${weekNumber}.json`);
        if (!response.ok) throw new Error(`Failed to fetch week ${weekNumber} games`);

        const weekData = await response.json();

        // Convert games object to array format
        // JSON stores games as {gameId: gameData} but we need array of games with id property
        if (weekData.games && Array.isArray(weekData.games)) {
            return weekData.games; // Already array format
        } else {
            // Convert object format to array
            const gameIds = Object.keys(weekData).filter(key => !key.startsWith('_'));
            return gameIds.map(id => ({
                id: id,
                ...weekData[id]
            }));
        }
    } catch (error) {
        console.error(`❌ Error fetching week ${weekNumber} games:`, error);
        return [];
    }
}

// Test Weeks 1, 2, 3, and 4
async function runTests() {
    for (let week = 1; week <= 4; week++) {
        console.log(`\n🔍 Testing Week ${week}:`);

        const games = await testGetWeekGamesWithResults(week);
        console.log(`   Games found: ${games.length}`);

        if (games.length > 0) {
            const completedGames = games.filter(g => g.winner && (g.status === 'final' || g.status === 'Final'));
            console.log(`   Completed games: ${completedGames.length}`);

            // Calculate max possible points for this week
            const maxPoints = games.length > 0 ? (games.length * (games.length + 1)) / 2 : 0;
            console.log(`   Max possible points: ${maxPoints}`);

            if (completedGames.length > 0) {
                console.log(`   Sample completed game: ${completedGames[0].a} @ ${completedGames[0].h} (Winner: ${completedGames[0].winner})`);
            }
        }
    }
}

// Export for console use
window.testWeek4Fix = runTests;

console.log('🔧 Week 4 fix test loaded. Run: await testWeek4Fix()');