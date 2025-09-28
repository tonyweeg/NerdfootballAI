#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkGameResultsStructure() {
  try {
    console.log('🔍 Checking game results structure...');

    const cacheDoc = await db.doc('cache/espn_current_data').get();
    if (cacheDoc.exists) {
      const cacheData = cacheDoc.data();

      console.log('📊 Current week:', cacheData.currentWeek);
      console.log('📊 Last updated:', cacheData.lastUpdated);

      // Check allGamesData structure
      if (cacheData.allGamesData) {
        console.log('\n📊 allGamesData structure:');
        const weeks = Object.keys(cacheData.allGamesData);
        console.log('   Available weeks:', weeks.sort());

        // Sample one week
        if (weeks.length > 0) {
          const sampleWeek = weeks[0];
          const weekData = cacheData.allGamesData[sampleWeek];
          console.log(`\n📋 Sample week (${sampleWeek}):`);
          console.log('   Keys:', Object.keys(weekData));

          if (weekData.games && weekData.games.length > 0) {
            const sampleGame = weekData.games[0];
            console.log('\n🏈 Sample game structure:');
            console.log('   Keys:', Object.keys(sampleGame));

            if (sampleGame.competitions && sampleGame.competitions[0]) {
              console.log('   Competition keys:', Object.keys(sampleGame.competitions[0]));

              if (sampleGame.competitions[0].competitors) {
                console.log('   Competitors count:', sampleGame.competitions[0].competitors.length);
                const comp = sampleGame.competitions[0].competitors[0];
                console.log('   Sample competitor keys:', Object.keys(comp));
              }
            }
          }
        }
      }

      // Check teamResults structure
      if (cacheData.teamResults) {
        console.log('\n📊 teamResults structure:');
        const teamKeys = Object.keys(cacheData.teamResults);
        console.log('   Team count:', teamKeys.length);
        console.log('   Sample teams:', teamKeys.slice(0, 5));

        if (teamKeys.length > 0) {
          const sampleTeam = cacheData.teamResults[teamKeys[0]];
          console.log('\n🏈 Sample team result structure:');
          console.log('   Keys:', Object.keys(sampleTeam || {}));
        }
      }

    } else {
      console.log('❌ ESPN cache document not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkGameResultsStructure().then(() => {
  console.log('\n✅ Structure check complete');
  process.exit(0);
});