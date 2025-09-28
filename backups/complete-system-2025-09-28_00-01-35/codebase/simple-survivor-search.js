#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function simpleSurvivorSearch() {
  try {
    console.log('🔍 SIMPLE SURVIVOR STORAGE SEARCH\n');

    // Let's try different combinations and see what works

    console.log('1️⃣ Testing basic document access patterns...\n');

    // Test 1: Check if document exists with various path structures
    const testPaths = [
      'artifacts/nerdfootball/public/data/nerdfootball_survivor_picks',
      'artifacts/nerdfootball/public/data/nerdfootball_survivor_status',
    ];

    for (const path of testPaths) {
      try {
        console.log(`   Testing: ${path}`);
        const doc = await db.doc(path).get();
        if (doc.exists) {
          console.log(`   ✅ FOUND: ${path}`);
          const data = doc.data();
          console.log(`      Keys: ${Object.keys(data).length} keys`);
          console.log(`      Sample keys: ${Object.keys(data).slice(0, 5).join(', ')}`);
          console.log(`      Sample data:`, JSON.stringify(Object.entries(data).slice(0, 2), null, 2));
        } else {
          console.log(`   ❌ NOT FOUND: ${path}`);
        }
      } catch (error) {
        console.log(`   ⚠️ ERROR: ${path} - ${error.message}`);
      }
    }

    console.log('\n2️⃣ Testing collection-based access...\n');

    // Test collection access for nerdSurvivor_picks
    try {
      console.log('   Testing: artifacts/nerdfootball/public/data -> nerdSurvivor_picks collection');
      const snapshot = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').collection('nerdSurvivor_picks').get();
      if (!snapshot.empty) {
        console.log(`   ✅ FOUND: Collection with ${snapshot.size} documents`);
        snapshot.docs.slice(0, 3).forEach(doc => {
          console.log(`      Doc ID: ${doc.id}`);
          console.log(`      Data: ${JSON.stringify(doc.data())}`);
        });
      } else {
        console.log('   ❌ Collection empty or not found');
      }
    } catch (error) {
      console.log(`   ⚠️ Collection access error: ${error.message}`);
    }

    console.log('\n3️⃣ Looking for ANY survivor-related collections...\n');

    // Search for any collections that might contain survivor data
    try {
      const publicDataDoc = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').get();
      if (publicDataDoc.exists) {
        console.log('   ✅ artifacts/nerdfootball/public/data document exists');
        console.log('   📋 Document data preview:');
        const data = publicDataDoc.data();
        if (data) {
          Object.keys(data).slice(0, 10).forEach(key => {
            console.log(`      ${key}: ${typeof data[key]}`);
          });
        }
      } else {
        console.log('   ❌ artifacts/nerdfootball/public/data does not exist');
      }

      // List subcollections of public/data
      const collections = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').listCollections();
      if (collections.length > 0) {
        console.log(`   📁 Found ${collections.length} subcollections:`);
        collections.forEach(collection => {
          console.log(`      - ${collection.id}`);
        });
      } else {
        console.log('   📁 No subcollections found');
      }

    } catch (error) {
      console.log(`   ⚠️ Search error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

simpleSurvivorSearch().then(() => {
  console.log('\n✅ Search complete');
  process.exit(0);
});