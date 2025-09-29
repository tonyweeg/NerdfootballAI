#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findSurvivorPicksData() {
  console.log('🔍 FINDING SURVIVOR PICKS DATA STRUCTURE...\n');

  const erikUID = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';

  try {
    // Check for survivor picks in different possible locations
    const pathsToCheck = [
      `artifacts/nerdfootball/pools/nerduniverse-2025/picks/survivor/${erikUID}`,
      `artifacts/nerdfootball/picks/survivor/${erikUID}`,
      `artifacts/nerdfootball/survivor/${erikUID}`,
      `survivor_picks/${erikUID}`,
      `picks/survivor/${erikUID}`,
      `nerdfootball_survivor_picks/${erikUID}`
    ];

    for (const path of pathsToCheck) {
      console.log(`\n📄 Checking: ${path}`);
      try {
        const doc = await db.doc(path).get();
        if (doc.exists) {
          const data = doc.data();
          console.log(`   ✅ FOUND Erik Weeg survivor picks!`);
          console.log(`   Data: ${JSON.stringify(data, null, 2)}`);

          // Critical check for Miami
          if (data.week1Pick === 'Miami Dolphins' || data['1'] === 'Miami Dolphins') {
            console.log('   🐬 CONFIRMED: Erik picked Miami Dolphins!');
            console.log('   ❌ CRITICAL: Need to check if he\'s still alive');
          }
        } else {
          console.log(`   ❌ Not found`);
        }
      } catch (error) {
        console.log(`   🚫 Error: ${error.message}`);
      }
    }

    // Check for survivor picks collections
    const collectionsToCheck = [
      'artifacts/nerdfootball/pools/nerduniverse-2025/picks/survivor',
      'artifacts/nerdfootball/picks/survivor',
      'artifacts/nerdfootball/survivor',
      'survivor_picks',
      'picks/survivor',
      'nerdfootball_survivor_picks'
    ];

    for (const collectionPath of collectionsToCheck) {
      console.log(`\n📚 Collection: ${collectionPath}`);
      try {
        const collection = db.collection(collectionPath);
        const snapshot = await collection.get();

        if (!snapshot.empty) {
          console.log(`   Found ${snapshot.size} documents`);

          let miamiPickersCount = 0;
          let erikFound = false;

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const uid = doc.id;

            // Check for Erik Weeg
            if (uid === erikUID) {
              erikFound = true;
              console.log(`\n   👤 ERIK WEEG PICKS: ${uid}`);
              console.log(`      Data: ${JSON.stringify(data, null, 2)}`);

              // Check for Miami pick
              if (data.week1Pick === 'Miami Dolphins' || data['1'] === 'Miami Dolphins') {
                console.log('      🐬 CONFIRMED: Erik picked Miami Dolphins in Week 1!');
              }
            }

            // Count all Miami picks
            if (data.week1Pick === 'Miami Dolphins' || data['1'] === 'Miami Dolphins') {
              miamiPickersCount++;
              console.log(`\n   🐬 Miami picker: ${uid}`);
              console.log(`      Week 1: ${data.week1Pick || data['1']}`);
            }
          });

          if (!erikFound) {
            console.log(`   ❌ Erik Weeg not found in ${collectionPath}`);
          }

          console.log(`\n   📊 Miami pickers in ${collectionPath}: ${miamiPickersCount}`);

        } else {
          console.log(`   ❌ No documents found`);
        }
      } catch (error) {
        console.log(`   🚫 Error: ${error.message}`);
      }
    }

    // Now check for survivor STATUS separately (might be different from picks)
    console.log('\n\n🏆 CHECKING SURVIVOR STATUS DATA...');

    const statusPathsToCheck = [
      `artifacts/nerdfootball/pools/nerduniverse-2025/survivor_status/${erikUID}`,
      `artifacts/nerdfootball/survivor_status/${erikUID}`,
      `survivor_status/${erikUID}`,
      `nerdfootball_survivor_status/${erikUID}`
    ];

    for (const path of statusPathsToCheck) {
      console.log(`\n📄 Status path: ${path}`);
      try {
        const doc = await db.doc(path).get();
        if (doc.exists) {
          const data = doc.data();
          console.log(`   ✅ FOUND Erik Weeg survivor status!`);
          console.log(`   Status: ${data.status}`);
          console.log(`   Eliminated: ${data.eliminated}`);
          console.log(`   EliminatedWeek: ${data.eliminatedWeek}`);

          // Critical check
          if (data.status === 18 || !data.eliminated) {
            console.log('   ❌ CRITICAL: Erik still shows as ALIVE!');
          } else {
            console.log('   ✅ Correctly eliminated');
          }
        } else {
          console.log(`   ❌ Not found`);
        }
      } catch (error) {
        console.log(`   🚫 Error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findSurvivorPicksData().then(() => {
  process.exit(0);
});