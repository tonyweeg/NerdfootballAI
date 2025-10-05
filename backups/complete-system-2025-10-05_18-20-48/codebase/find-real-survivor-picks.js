#!/usr/bin/env node

/**
 * 🔍 FIND REAL SURVIVOR PICKS LOCATION
 * Systematically explore Firebase to find where survivor picks are actually stored
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findRealSurvivorPicks() {
  console.log('🔍 SYSTEMATIC FIREBASE EXPLORATION - Finding Real Survivor Picks\n');

  try {
    // Step 1: Get pool members
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    console.log('1️⃣ Loading pool members...');
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      console.log('❌ Pool members document not found');
      return false;
    }

    const poolData = poolDoc.data();
    const userIds = Object.keys(poolData);
    console.log(`✅ Found ${userIds.length} pool members`);

    // Show first 3 user IDs and their data structure
    console.log('\n2️⃣ Pool member data structure sample:');
    userIds.slice(0, 3).forEach(userId => {
      console.log(`   ${userId}:`, JSON.stringify(poolData[userId], null, 2));
    });

    // Step 3: Check for survivor picks in various possible locations
    console.log('\n3️⃣ Searching for survivor picks in possible locations...');

    const testUserId = userIds[0]; // Use first user for testing
    console.log(`   Testing with user: ${testUserId}`);

    // Location 1: Original location (we know this is empty)
    console.log('\n   📍 Location 1: artifacts/nerdfootball/public/data/nerdSurvivor_picks/');
    try {
      const path1 = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${testUserId}`;
      const doc1 = await db.doc(path1).get();
      console.log(`      ${path1}: ${doc1.exists ? 'EXISTS' : 'NOT FOUND'}`);
      if (doc1.exists) {
        console.log(`      Data:`, JSON.stringify(doc1.data(), null, 2));
      }
    } catch (error) {
      console.log(`      ERROR: ${error.message}`);
    }

    // Location 2: Under pool structure
    console.log('\n   📍 Location 2: artifacts/nerdfootball/pools/nerduniverse-2025/picks/');
    try {
      const path2 = `artifacts/nerdfootball/pools/${poolId}/picks/${testUserId}`;
      const doc2 = await db.doc(path2).get();
      console.log(`      ${path2}: ${doc2.exists ? 'EXISTS' : 'NOT FOUND'}`);
      if (doc2.exists) {
        console.log(`      Data:`, JSON.stringify(doc2.data(), null, 2));
      }
    } catch (error) {
      console.log(`      ERROR: ${error.message}`);
    }

    // Location 3: Under pool survivor specific
    console.log('\n   📍 Location 3: artifacts/nerdfootball/pools/nerduniverse-2025/survivor/');
    try {
      const path3 = `artifacts/nerdfootball/pools/${poolId}/survivor/${testUserId}`;
      const doc3 = await db.doc(path3).get();
      console.log(`      ${path3}: ${doc3.exists ? 'EXISTS' : 'NOT FOUND'}`);
      if (doc3.exists) {
        console.log(`      Data:`, JSON.stringify(doc3.data(), null, 2));
      }
    } catch (error) {
      console.log(`      ERROR: ${error.message}`);
    }

    // Location 4: User documents with survivor subcollection
    console.log('\n   📍 Location 4: users/{userId}/survivor subcollection');
    try {
      const path4 = `users/${testUserId}`;
      const userDoc = await db.doc(path4).get();
      console.log(`      users/${testUserId}: ${userDoc.exists ? 'EXISTS' : 'NOT FOUND'}`);
      if (userDoc.exists) {
        console.log(`      User Data:`, JSON.stringify(userDoc.data(), null, 2));

        // Check for survivor subcollection
        const survivorCollection = await db.collection(`users/${testUserId}/survivor`).get();
        console.log(`      Survivor subcollection: ${survivorCollection.empty ? 'EMPTY' : survivorCollection.size + ' docs'}`);
        if (!survivorCollection.empty) {
          survivorCollection.forEach(doc => {
            console.log(`        ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
          });
        }
      }
    } catch (error) {
      console.log(`      ERROR: ${error.message}`);
    }

    // Location 5: Direct survivor collection
    console.log('\n   📍 Location 5: survivor/{userId} collection');
    try {
      const path5 = `survivor/${testUserId}`;
      const doc5 = await db.doc(path5).get();
      console.log(`      ${path5}: ${doc5.exists ? 'EXISTS' : 'NOT FOUND'}`);
      if (doc5.exists) {
        console.log(`      Data:`, JSON.stringify(doc5.data(), null, 2));
      }
    } catch (error) {
      console.log(`      ERROR: ${error.message}`);
    }

    // Location 6: Check if picks are embedded in pool member data
    console.log('\n   📍 Location 6: Embedded in pool member documents');
    try {
      // Look for picks, survivor, or week data in pool member objects
      userIds.slice(0, 5).forEach(userId => {
        const userData = poolData[userId];
        const hasPicksData = userData.picks || userData.survivor || userData.weeks ||
                            Object.keys(userData).some(key => key.includes('pick') || key.includes('survivor') || key.includes('week'));

        if (hasPicksData) {
          console.log(`      ${userId} HAS PICK-RELATED DATA:`, JSON.stringify(userData, null, 2));
        } else {
          console.log(`      ${userId}: Standard user data only`);
        }
      });
    } catch (error) {
      console.log(`      ERROR: ${error.message}`);
    }

    // Step 4: List all collections to find survivor-related data
    console.log('\n4️⃣ Listing all collections for survivor-related patterns...');
    try {
      const collections = await db.listCollections();
      console.log('   Root collections found:');
      collections.forEach(collection => {
        const name = collection.id;
        if (name.includes('survivor') || name.includes('pick') || name.includes('pool') || name.includes('game')) {
          console.log(`      🎯 RELEVANT: ${name}`);
        } else {
          console.log(`      ${name}`);
        }
      });
    } catch (error) {
      console.log(`      ERROR listing collections: ${error.message}`);
    }

    // Step 5: Check specific pool subcollections
    console.log('\n5️⃣ Checking pool subcollections...');
    try {
      const poolRef = db.doc(`artifacts/nerdfootball/pools/${poolId}`);
      const poolSubcollections = await poolRef.listCollections();

      console.log(`   Subcollections under pools/${poolId}:`);
      if (poolSubcollections.length === 0) {
        console.log('      No subcollections found');
      } else {
        for (const subcollection of poolSubcollections) {
          console.log(`      📁 ${subcollection.id}`);

          // Sample first few documents in each subcollection
          const docs = await subcollection.limit(3).get();
          if (!docs.empty) {
            docs.forEach(doc => {
              console.log(`        ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
            });
          } else {
            console.log('        (empty)');
          }
        }
      }
    } catch (error) {
      console.log(`      ERROR: ${error.message}`);
    }

    return true;

  } catch (error) {
    console.error('💥 EXPLORATION FAILED:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  findRealSurvivorPicks().then((success) => {
    if (success) {
      console.log('\n🔍 Firebase exploration completed');
      process.exit(0);
    } else {
      console.log('\n💥 Firebase exploration failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Exploration error:', error);
    process.exit(1);
  });
}

module.exports = { findRealSurvivorPicks };