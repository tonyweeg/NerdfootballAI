#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function examineESPNCacheData() {
  console.log('🔍 EXAMINING ESPN CACHE DATA\n');

  const cacheDoc = await db.doc('cache/espn_current_data').get();
  if (cacheDoc.exists) {
    const cache = cacheDoc.data();

    console.log('📋 ESPN CACHE STRUCTURE:');
    console.log('Keys:', Object.keys(cache));
    console.log('');

    if (cache.teamResults) {
      console.log('🏈 TEAM RESULTS STRUCTURE:');
      const teamResultKeys = Object.keys(cache.teamResults).slice(0, 10);
      console.log('Sample keys:', teamResultKeys);

      // Show a sample team result
      const sampleKey = teamResultKeys[0];
      if (sampleKey) {
        console.log('\nSample team result (' + sampleKey + '):');
        console.log(JSON.stringify(cache.teamResults[sampleKey], null, 2));
      }
    }

    if (cache.allGamesData) {
      console.log('\n🎮 ALL GAMES DATA STRUCTURE:');
      console.log('Keys:', Object.keys(cache.allGamesData).slice(0, 10));

      // Look for Week 1 and 2 data
      ['1', '2'].forEach(week => {
        if (cache.allGamesData[week]) {
          console.log('\nWeek ' + week + ' games:');
          const weekGames = cache.allGamesData[week];
          const gameIds = Object.keys(weekGames).slice(0, 3);

          gameIds.forEach(gameId => {
            console.log('Game ' + gameId + ':');
            console.log(JSON.stringify(weekGames[gameId], null, 2));
          });
        }
      });
    }
  }
}

examineESPNCacheData().then(() => process.exit(0)).catch(console.error);