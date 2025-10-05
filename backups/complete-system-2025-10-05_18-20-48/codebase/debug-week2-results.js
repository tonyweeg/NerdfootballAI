#!/usr/bin/env node

/**
 * 🔍 DEBUG WEEK 2 GAME RESULTS DATA STRUCTURE
 */

const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugWeek2Results() {
  console.log('🔍 DEBUGGING WEEK 2 GAME RESULTS STRUCTURE\n');

  try {
    // Check multiple possible locations
    const possiblePaths = [
      'artifacts/nerdfootball/public/data/nerdfootball_games/2',
      'artifacts/nerdfootball/public/data/nerdfootball_results/2',
      'cache/espn_current_data'
    ];

    for (const path of possiblePaths) {
      console.log(`\n📍 Checking: ${path}`);

      try {
        const doc = await db.doc(path).get();

        if (doc.exists) {
          const data = doc.data();
          console.log(`✅ Found data with ${Object.keys(data).length} entries`);

          // Show first game structure
          const firstGameId = Object.keys(data)[0];
          const firstGame = data[firstGameId];
          console.log(`📊 Sample game structure (${firstGameId}):`);
          console.log(JSON.stringify(firstGame, null, 2));

          // Check if any games have team names
          let gamesWithTeams = 0;
          Object.values(data).forEach(game => {
            if (game.homeTeam && game.awayTeam &&
                game.homeTeam !== 'undefined' && game.awayTeam !== 'undefined') {
              gamesWithTeams++;
            }
          });

          console.log(`🏈 Games with valid team names: ${gamesWithTeams}/${Object.keys(data).length}`);

        } else {
          console.log('❌ No data found');
        }

      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    // Also check ESPN cache for current week data
    console.log('\n📍 Checking ESPN cache for Week 2 team names...');
    try {
      const espnCache = await db.doc('cache/espn_current_data').get();
      if (espnCache.exists) {
        const cacheData = espnCache.data();
        console.log('📊 ESPN Cache keys:', Object.keys(cacheData));

        // Look for Week 2 specific data
        const week2Keys = Object.keys(cacheData).filter(key => key.includes('2') || key.includes('week'));
        console.log('🎯 Week 2 related keys:', week2Keys);

        if (week2Keys.length > 0) {
          console.log('📊 Sample Week 2 cache data:');
          console.log(JSON.stringify(cacheData[week2Keys[0]], null, 2));
        }
      }
    } catch (error) {
      console.log(`❌ ESPN Cache error: ${error.message}`);
    }

  } catch (error) {
    console.error('💥 DEBUG ERROR:', error);
  }
}

// Run if called directly
if (require.main === module) {
  debugWeek2Results().catch(error => {
    console.error('\n💥 Debug error:', error);
    process.exit(1);
  });
}

module.exports = { debugWeek2Results };