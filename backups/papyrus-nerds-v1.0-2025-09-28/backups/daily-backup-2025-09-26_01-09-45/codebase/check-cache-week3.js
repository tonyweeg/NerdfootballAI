#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkCacheWeek3() {
  console.log('🔍 CHECKING CACHE FOR WEEK 3 GAME DATA...\n');

  try {
    // Check ESPN cache
    const espnCache = await db.doc('cache/espn_current_data').get();
    if (espnCache.exists) {
      const data = espnCache.data();
      console.log('📊 ESPN CACHE DATA:');
      console.log('==================');
      console.log(`Current week: ${data.currentWeek}`);
      console.log(`All games data keys: ${Object.keys(data.allGamesData)}`);

      // Check each week's data
      for (const [week, games] of Object.entries(data.allGamesData)) {
        console.log(`\nWeek ${week}: ${Object.keys(games).length} games`);
        if (week === '3') {
          console.log('🎯 WEEK 3 DETAILED CHECK:');
          console.log(`   Games object: ${JSON.stringify(games).substring(0, 200)}...`);
        }
      }
    }

    // Check games cache
    const gamesCache = await db.doc('cache/games_current').get();
    if (gamesCache.exists) {
      const data = gamesCache.data();
      console.log('\n🎮 GAMES CACHE DATA:');
      console.log('===================');

      if (data.data && Array.isArray(data.data)) {
        console.log(`Total games in cache: ${data.data.length}`);

        // Find Week 3 games
        const week3Games = data.data.filter(game => {
          // Check if game date indicates Week 3
          const gameDate = new Date(game.dt);
          const week3Start = new Date('2025-09-18'); // Week 3 starts Sept 18
          const week3End = new Date('2025-09-25');   // Week 3 ends Sept 24
          return gameDate >= week3Start && gameDate < week3End;
        });

        console.log(`\n🎯 WEEK 3 GAMES FOUND: ${week3Games.length}`);
        week3Games.forEach((game, index) => {
          console.log(`   ${index + 1}. ${game.a} @ ${game.h} (${game.dt})`);
        });

        if (week3Games.length === 0) {
          console.log('\n❌ NO WEEK 3 GAMES IN GAMES CACHE!');
          console.log('Sample games:');
          data.data.slice(0, 5).forEach(game => {
            console.log(`   ${game.a} @ ${game.h} (${game.dt})`);
          });
        }
      }
    }

    console.log('\n🚨 DIAGNOSIS:');
    console.log('=============');
    console.log('The admin view loads games via getGamesForWeek() function.');
    console.log('If Week 3 is empty, the issue is likely:');
    console.log('1. getGamesForWeek(3) returns empty array');
    console.log('2. Week 3 data is missing from cache');
    console.log('3. ESPN API not returning Week 3 schedule');
    console.log('4. Date calculation putting Week 3 in wrong time range');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCacheWeek3().then(() => {
  process.exit(0);
});