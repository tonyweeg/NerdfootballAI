#!/usr/bin/env node

const fs = require('fs');

async function testWeek3Fetch() {
    console.log('🔍 TESTING WEEK 3 JSON FILE FETCH...\n');

    // Test 1: Check if file exists and is readable
    const filePath = './public/nfl_2025_week_3.json';

    try {
        const fileExists = fs.existsSync(filePath);
        console.log(`📁 File exists: ${fileExists}`);

        if (fileExists) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            console.log(`📄 File size: ${fileContent.length} bytes`);

            // Test JSON parsing
            const jsonData = JSON.parse(fileContent);
            console.log(`✅ JSON parsed successfully`);
            console.log(`   Week: ${jsonData.week}`);
            console.log(`   Games: ${jsonData.games ? jsonData.games.length : 'NO GAMES ARRAY'}`);

            if (jsonData.games && jsonData.games.length > 0) {
                console.log(`   Sample game: ${jsonData.games[0].a} @ ${jsonData.games[0].h}`);
                console.log(`   Game date format: ${jsonData.games[0].dt}`);
            }
        }
    } catch (error) {
        console.error('❌ Error reading file:', error.message);
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    console.log('If file exists and JSON is valid, the issue is likely:');
    console.log('1. Network request to file is failing (404, CORS, etc.)');
    console.log('2. JavaScript error in getGamesForWeek() function');
    console.log('3. Date format mismatch between static file and cache');
    console.log('4. Admin view not handling Week 3 data structure correctly');
}

testWeek3Fetch().then(() => {
    process.exit(0);
});