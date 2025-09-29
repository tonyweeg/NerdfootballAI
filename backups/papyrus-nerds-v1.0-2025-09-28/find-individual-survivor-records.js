#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findIndividualSurvivorRecords() {
  console.log('🔍 FINDING INDIVIDUAL SURVIVOR RECORDS...\n');

  try {
    // From previous conversations, we know Erik Weeg's UID is BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2
    const erikUID = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';

    // Check multiple possible survivor data locations
    const pathsToCheck = [
      `artifacts/nerdfootball/pools/nerduniverse-2025/users/${erikUID}`,
      `artifacts/nerdfootball/public/data/nerdfootball_users/${erikUID}`,
      `artifacts/nerdfootball/pools/nerduniverse-2025/survivor_status/${erikUID}`,
      `users/${erikUID}`,
      `nerdfootball_users/${erikUID}`
    ];

    for (const path of pathsToCheck) {
      console.log(`\n📄 Checking: ${path}`);
      try {
        const doc = await db.doc(path).get();
        if (doc.exists) {
          const data = doc.data();
          console.log(`   ✅ FOUND Erik Weeg data!`);
          console.log(`   Email: ${data.email}`);
          console.log(`   Status: ${data.status}`);
          console.log(`   Week1Pick: ${data.week1Pick}`);
          console.log(`   Eliminated: ${data.eliminated}`);
          console.log(`   EliminatedWeek: ${data.eliminatedWeek}`);

          // Critical check
          if (data.week1Pick === 'Miami Dolphins') {
            if (data.status === 18 || !data.eliminated) {
              console.log('   ❌ CRITICAL ISSUE: Picked Miami but still ALIVE!');
            } else {
              console.log('   ✅ Correctly eliminated for Miami pick');
            }
          }
        } else {
          console.log(`   ❌ Not found`);
        }
      } catch (error) {
        console.log(`   🚫 Error: ${error.message}`);
      }
    }

    // Also check in collections for all survivor data
    console.log('\n🔍 SEARCHING ALL SURVIVOR COLLECTIONS...');

    const collectionsToCheck = [
      'artifacts/nerdfootball/pools/nerduniverse-2025/users',
      'artifacts/nerdfootball/public/data/nerdfootball_users',
      'users',
      'nerdfootball_users'
    ];

    for (const collectionPath of collectionsToCheck) {
      console.log(`\n📚 Collection: ${collectionPath}`);
      try {
        const collection = db.collection(collectionPath);
        const snapshot = await collection.get();

        if (!snapshot.empty) {
          console.log(`   Found ${snapshot.size} user documents`);

          let miamiPickersCount = 0;
          let miamiPickersAlive = 0;
          let erikFound = false;

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const uid = doc.id;

            // Check for Erik Weeg
            if (uid === erikUID || (data.email && data.email.includes('erweeg'))) {
              erikFound = true;
              console.log(`\n   👤 ERIK WEEG FOUND: ${uid}`);
              console.log(`      Email: ${data.email}`);
              console.log(`      Status: ${data.status}`);
              console.log(`      Week1Pick: ${data.week1Pick}`);
              console.log(`      Eliminated: ${data.eliminated}`);

              if (data.week1Pick === 'Miami Dolphins') {
                if (data.status === 18 || !data.eliminated) {
                  console.log('      ❌ CRITICAL: Picked Miami but STILL ALIVE!');
                } else {
                  console.log('      ✅ Correctly eliminated');
                }
              }
            }

            // Check all Miami picks
            if (data.week1Pick === 'Miami Dolphins') {
              miamiPickersCount++;
              if (data.status === 18 || !data.eliminated) {
                miamiPickersAlive++;
                console.log(`\n   🐬 ALIVE Miami picker: ${data.email || uid}`);
                console.log(`      Status: ${data.status}, Eliminated: ${data.eliminated}`);
              }
            }
          });

          if (!erikFound) {
            console.log(`   ❌ Erik Weeg not found in ${collectionPath}`);
          }

          console.log(`\n   📊 Miami Summary for ${collectionPath}:`);
          console.log(`      Total Miami pickers: ${miamiPickersCount}`);
          console.log(`      Still alive: ${miamiPickersAlive}`);

        } else {
          console.log(`   ❌ No documents found`);
        }
      } catch (error) {
        console.log(`   🚫 Error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findIndividualSurvivorRecords().then(() => {
  process.exit(0);
});