#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findSurvivorDataLocations() {
  console.log('🔍 FINDING ALL SURVIVOR DATA LOCATIONS...\n');

  try {
    // Check all possible survivor data paths
    const pathsToCheck = [
      'artifacts/nerdfootball/pools/nerduniverse-2025/survivor',
      'artifacts/nerdfootball/survivor',
      'survivor',
      'nerdfootball_survivor',
      'pools/nerduniverse-2025/survivor'
    ];

    for (const path of pathsToCheck) {
      console.log(`\n📁 Checking: ${path}`);
      try {
        const collection = db.collection(path);
        const snapshot = await collection.limit(5).get();

        if (!snapshot.empty) {
          console.log(`   ✅ FOUND ${snapshot.size} survivor documents`);

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`   - ${doc.id}: status=${data.status}, eliminated=${data.eliminated}, week1Pick=${data.week1Pick || 'N/A'}`);
          });
        } else {
          console.log(`   ❌ No documents found`);
        }
      } catch (error) {
        console.log(`   🚫 Error accessing: ${error.message}`);
      }
    }

    // Also check for documents directly
    const docPathsToCheck = [
      'artifacts/nerdfootball/pools/nerduniverse-2025/survivors',
      'artifacts/nerdfootball/survivor_status',
      'artifacts/nerdfootball/pools/nerduniverse-2025/status'
    ];

    for (const docPath of docPathsToCheck) {
      console.log(`\n📄 Checking document: ${docPath}`);
      try {
        const doc = await db.doc(docPath).get();
        if (doc.exists) {
          const data = doc.data();
          console.log(`   ✅ Document exists with ${Object.keys(data).length} entries`);

          // Look for Erik Weeg or Miami picks
          for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value.week1Pick === 'Miami Dolphins') {
              console.log(`   🐬 FOUND Miami pick: ${key} - status=${value.status}, eliminated=${value.eliminated}`);
            }
            if (key.includes('BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2') ||
                (typeof value === 'object' && value.email && value.email.includes('erweeg'))) {
              console.log(`   👤 FOUND Erik Weeg data: ${key} - ${JSON.stringify(value).substring(0, 100)}...`);
            }
          }
        } else {
          console.log(`   ❌ Document does not exist`);
        }
      } catch (error) {
        console.log(`   🚫 Error accessing: ${error.message}`);
      }
    }

    // Let's also search all collections for any survivor-related data
    console.log('\n🔍 SCANNING ALL COLLECTIONS FOR SURVIVOR DATA...');
    const collections = await db.listCollections();

    for (const collection of collections) {
      if (collection.id.toLowerCase().includes('survivor') ||
          collection.id.toLowerCase().includes('pool') ||
          collection.id.toLowerCase().includes('nerdfootball')) {

        console.log(`\n📚 Collection: ${collection.id}`);
        try {
          const snapshot = await collection.limit(3).get();
          if (!snapshot.empty) {
            console.log(`   Found ${snapshot.size} documents`);
            snapshot.docs.forEach(doc => {
              const data = doc.data();
              if (data.week1Pick || data.status || data.eliminated !== undefined) {
                console.log(`   - ${doc.id}: survivor-like data found`);
              }
            });
          }
        } catch (error) {
          console.log(`   Error: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findSurvivorDataLocations().then(() => {
  process.exit(0);
});