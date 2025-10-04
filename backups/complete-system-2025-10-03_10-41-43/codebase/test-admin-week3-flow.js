#!/usr/bin/env node

// Test exactly what the admin view does for Week 3

async function testAdminWeek3Flow() {
    console.log('🔍 TESTING ADMIN VIEW WEEK 3 FLOW...\n');

    // Simulate the exact fetch that getGamesForWeek() does
    try {
        console.log('📡 Step 1: Fetching nfl_2025_week_3.json (simulating getGamesForWeek)');

        // Test using Node.js fetch equivalent
        const fs = require('fs');
        const path = require('path');

        const filePath = path.join(__dirname, 'public', 'nfl_2025_week_3.json');
        console.log(`   File path: ${filePath}`);

        if (fs.existsSync(filePath)) {
            console.log('   ✅ File exists');

            const fileContent = fs.readFileSync(filePath, 'utf8');
            const weekData = JSON.parse(fileContent);

            console.log(`   ✅ JSON parsed successfully`);
            console.log(`   Week: ${weekData.week}`);
            console.log(`   Games array exists: ${Array.isArray(weekData.games)}`);
            console.log(`   Games count: ${weekData.games ? weekData.games.length : 'NO GAMES'}`);

            if (weekData.games && weekData.games.length > 0) {
                // Test the exact mapping that getGamesForWeek does
                const mappedGames = weekData.games.map(game => ({
                    id: game.id,
                    away: game.a,
                    home: game.h,
                    kickoff: game.dt.slice(0, -1), // Remove 'Z' from end
                    stadium: game.stadium
                }));

                console.log(`   ✅ Games mapped successfully: ${mappedGames.length} games`);
                console.log(`   Sample mapped game: ${mappedGames[0].away} @ ${mappedGames[0].home}`);
                console.log(`   Sample kickoff: ${mappedGames[0].kickoff}`);

                // Test what renderGameResultsAdmin does next
                console.log('\n📊 Step 2: Testing renderGameResultsAdmin logic');

                const weekNumber = 3;
                const weekData_admin = { week: weekNumber, games: mappedGames };

                console.log(`   weekData created: week=${weekData_admin.week}, games=${weekData_admin.games.length}`);

                // Test the condition that fails
                if (!Array.isArray(weekData_admin.games) || weekData_admin.games.length === 0) {
                    console.log('   ❌ FAILURE: Array check failed!');
                    console.log(`     - Array.isArray(games): ${Array.isArray(weekData_admin.games)}`);
                    console.log(`     - games.length: ${weekData_admin.games.length}`);
                } else {
                    console.log('   ✅ SUCCESS: Array check passed');
                    console.log(`     - Games are valid array with ${weekData_admin.games.length} items`);
                }

            } else {
                console.log('   ❌ NO GAMES FOUND IN WEEK DATA');
            }

        } else {
            console.log('   ❌ File does not exist');
        }

    } catch (error) {
        console.error('❌ Error in test:', error.message);
        console.error('Stack:', error.stack);
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    console.log('If this test passes but admin view fails, the issue is likely:');
    console.log('1. GameStateCache.cacheSchedule() function failing for Week 3');
    console.log('2. Browser fetch() failing due to CORS or file serving issue');
    console.log('3. JavaScript error in browser preventing getGamesForWeek completion');
    console.log('4. Cache corruption for Week 3 specifically');
}

testAdminWeek3Flow().then(() => {
    process.exit(0);
});