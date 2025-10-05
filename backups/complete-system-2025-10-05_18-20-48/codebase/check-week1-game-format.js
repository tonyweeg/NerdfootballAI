#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkWeek1GameFormat() {
  try {
    console.log('🔍 Checking Week 1 game format...');

    const gameResultsPath = `artifacts/nerdfootball/public/data/nerdfootball_games/1`;
    const gameResultsDoc = await db.doc(gameResultsPath).get();

    if (gameResultsDoc.exists) {
      const weekGames = gameResultsDoc.data();
      console.log(`✅ Found ${Object.keys(weekGames).length} games for Week 1`);

      // Check first few games
      const gameIds = Object.keys(weekGames).slice(0, 3);

      gameIds.forEach(gameId => {
        const game = weekGames[gameId];
        console.log(`\n🏈 Game ${gameId}:`);
        console.log('   Full game object:', JSON.stringify(game, null, 2));
      });

    } else {
      console.log('❌ No Week 1 games found');
    }

    // Also check Week 3 for comparison
    console.log('\n🔍 Checking Week 3 game format for comparison...');

    const week3ResultsPath = `artifacts/nerdfootball/public/data/nerdfootball_games/3`;
    const week3ResultsDoc = await db.doc(week3ResultsPath).get();

    if (week3ResultsDoc.exists) {
      const week3Games = week3ResultsDoc.data();
      const gameIds = Object.keys(week3Games).slice(0, 2);

      gameIds.forEach(gameId => {
        const game = week3Games[gameId];
        console.log(`\n🏈 Week 3 Game ${gameId}:`);
        console.log('   Full game object:', JSON.stringify(game, null, 2));
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWeek1GameFormat().then(() => {
  console.log('\n✅ Format check complete');
  process.exit(0);
});