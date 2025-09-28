#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findFutureGameResults() {
  console.log('🔍 FINDING GAME RESULTS FOR WEEKS > 3...\n');

  const currentWeek = 3;
  const futureWeeksWithResults = [];

  try {
    // Check weeks 4 through 18 for any game results
    for (let week = currentWeek + 1; week <= 18; week++) {
      console.log(`Checking Week ${week}...`);

      // Check nerdfootball_games path
      const gamesPath = `nerdfootball_games/week_${week}`;
      const gamesDoc = await db.doc(gamesPath).get();

      if (gamesDoc.exists) {
        const data = gamesDoc.data();
        const gameCount = Object.keys(data).length;
        console.log(`   ❌ FOUND ${gameCount} game results at: ${gamesPath}`);
        futureWeeksWithResults.push({
          week: week,
          path: gamesPath,
          gameCount: gameCount,
          sampleKeys: Object.keys(data).slice(0, 3)
        });
      }

      // Also check old path nerdfootball_results
      const resultsPath = `nerdfootball_results/week_${week}`;
      const resultsDoc = await db.doc(resultsPath).get();

      if (resultsDoc.exists) {
        const data = resultsDoc.data();
        const gameCount = Object.keys(data).length;
        console.log(`   ❌ FOUND ${gameCount} game results at: ${resultsPath}`);
        futureWeeksWithResults.push({
          week: week,
          path: resultsPath,
          gameCount: gameCount,
          sampleKeys: Object.keys(data).slice(0, 3)
        });
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log('===========');
    if (futureWeeksWithResults.length === 0) {
      console.log('✅ No future game results found - database is clean!');
    } else {
      console.log(`❌ Found ${futureWeeksWithResults.length} future week documents with game results:`);
      futureWeeksWithResults.forEach(item => {
        console.log(`   - Week ${item.week}: ${item.gameCount} results at ${item.path}`);
        console.log(`     Sample game IDs: ${item.sampleKeys.join(', ')}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findFutureGameResults().then(() => {
  process.exit(0);
});