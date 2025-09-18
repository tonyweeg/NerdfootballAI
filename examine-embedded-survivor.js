#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function examineEmbeddedSurvivorData() {
  console.log('🎯 EXAMINING EMBEDDED SURVIVOR DATA\n');

  // Get pool members with embedded survivor data
  const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
  const poolMembers = poolDoc.data();

  console.log('📊 EMBEDDED SURVIVOR DATA ANALYSIS:');
  console.log('Name | Alive | Pick History | Total Picks');
  console.log('-----|-------|-------------|-------------');

  let usersWithEmbedded = 0;
  let stillAlive = 0;
  let eliminated = 0;

  Object.entries(poolMembers).forEach(([userId, userData]) => {
    if (userData.survivor) {
      usersWithEmbedded++;
      const s = userData.survivor;

      if (s.alive === 18) {
        stillAlive++;
      } else {
        eliminated++;
      }

      console.log(`${userData.displayName} | ${s.alive} | "${s.pickHistory}" | ${s.totalPicks}`);
    }
  });

  console.log(`\n📈 EMBEDDED DATA SUMMARY:`);
  console.log(`Users with embedded data: ${usersWithEmbedded}`);
  console.log(`Still alive (18): ${stillAlive}`);
  console.log(`Eliminated (<18): ${eliminated}`);

  // Now look at game storage structure
  console.log('\n🎮 EXAMINING GAME STORAGE STRUCTURE:\n');

  // Check all possible game storage locations
  const gameLocations = [
    'artifacts/nerdfootball/public/data/nerdfootball_games/1',
    'artifacts/nerdfootball/public/data/nerdfootball_games/2',
    'games/2025/week1',
    'games/2025/week2',
    'cache/espn_current_data'
  ];

  for (const location of gameLocations) {
    try {
      const doc = await db.doc(location).get();
      if (doc.exists) {
        const data = doc.data();
        console.log(`✅ FOUND: ${location}`);

        if (location.includes('espn_current_data')) {
          console.log(`   Keys: ${Object.keys(data).slice(0, 10).join(', ')}...`);
        } else {
          const gameIds = Object.keys(data);
          console.log(`   Games: ${gameIds.length} total`);

          // Show sample game with complete structure
          const sampleGame = data[gameIds[0]];
          console.log(`   Sample game structure:`);
          console.log(`   ${JSON.stringify(sampleGame, null, 4)}`);
        }
      } else {
        console.log(`❌ NOT FOUND: ${location}`);
      }
    } catch (error) {
      console.log(`⚠️ ERROR: ${location} - ${error.message}`);
    }
    console.log('');
  }
}

examineEmbeddedSurvivorData().then(() => process.exit(0)).catch(console.error);