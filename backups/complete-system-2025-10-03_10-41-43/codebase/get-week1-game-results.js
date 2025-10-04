#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function getWeek1GameResults() {
  console.log('🔍 ACCESSING ESPN CACHE FOR WEEK 1 GAME RESULTS\n');

  try {
    // Check the ESPN cache document
    console.log('📡 Loading ESPN cache data...');
    const cacheDoc = await db.doc('cache/espn_current_data').get();

    if (!cacheDoc.exists) {
      console.error('❌ ESPN cache document not found');
      return;
    }

    const cacheData = cacheDoc.data();
    console.log(`✅ ESPN cache loaded. Current week: ${cacheData.currentWeek}`);
    console.log(`Last updated: ${new Date(cacheData.lastUpdated).toLocaleString()}\n`);

    // Check teamResults for Week 1
    console.log('🏈 WEEK 1 TEAM RESULTS:');
    console.log('=======================');

    if (cacheData.teamResults) {
      const week1Results = {};

      // Look for Week 1 results in teamResults
      for (const [key, result] of Object.entries(cacheData.teamResults)) {
        if (key.includes('_1') || key.endsWith('_1')) {
          week1Results[key] = result;
        }
      }

      if (Object.keys(week1Results).length > 0) {
        console.log('Found Week 1 results:');
        for (const [team, result] of Object.entries(week1Results)) {
          console.log(`${team}: ${result}`);
        }
      } else {
        console.log('❌ No Week 1 results found in teamResults');
        console.log('\nAvailable teamResults keys (first 20):');
        Object.keys(cacheData.teamResults).slice(0, 20).forEach(key => {
          console.log(`  - ${key}: ${cacheData.teamResults[key]}`);
        });
      }
    }

    // Check allGamesData for Week 1
    console.log('\n🗓️ WEEK 1 GAMES DATA:');
    console.log('=====================');

    if (cacheData.allGamesData && cacheData.allGamesData['1']) {
      const week1Games = cacheData.allGamesData['1'];
      console.log(`Found ${Object.keys(week1Games).length} games for Week 1:`);

      for (const [gameId, game] of Object.entries(week1Games)) {
        console.log(`\nGame ${gameId}:`);
        console.log(`  ${game.awayTeam} @ ${game.homeTeam}`);
        console.log(`  Score: ${game.awayScore} - ${game.homeScore}`);
        console.log(`  Status: ${game.status}`);
        console.log(`  Winner: ${game.awayScore > game.homeScore ? game.awayTeam : game.homeTeam}`);
      }
    } else {
      console.log('❌ No Week 1 games found in allGamesData');

      if (cacheData.allGamesData) {
        console.log('\nAvailable weeks in allGamesData:');
        Object.keys(cacheData.allGamesData).forEach(week => {
          console.log(`  - Week ${week}`);
        });
      }
    }

    // Manual check - try to find any game data that might contain Week 1 results
    console.log('\n🔍 MANUAL SEARCH FOR WEEK 1 DATA:');
    console.log('==================================');

    const dataKeys = Object.keys(cacheData);
    console.log('Available cache keys:', dataKeys);

    // Look for any key that might contain week 1 data
    for (const key of dataKeys) {
      if (typeof cacheData[key] === 'object' && cacheData[key] !== null) {
        const subKeys = Object.keys(cacheData[key]);
        const week1Keys = subKeys.filter(k => k.includes('1') || k.toLowerCase().includes('week'));
        if (week1Keys.length > 0) {
          console.log(`\nFound potential Week 1 data in ${key}:`);
          week1Keys.slice(0, 5).forEach(k => {
            console.log(`  - ${k}`);
          });
        }
      }
    }

    return cacheData;

  } catch (error) {
    console.error('❌ Error accessing ESPN cache:', error);
  }
}

getWeek1GameResults().then(() => {
  process.exit(0);
});