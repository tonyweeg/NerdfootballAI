const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function deepSearchChuckUpshur() {
  console.log('🔍 DEEP SEARCH FOR CHUCK UPSHUR DATA - LOOKING EVERYWHERE\n');

  const chuckUID = 'GaCfzAGnuVUXlcyaAAGVCF8bUro2';
  const poolId = 'nerduniverse-2025';

  try {
    console.log('📍 SEARCHING ALL POSSIBLE FIREBASE PATHS FOR CHUCK UPSHUR:\n');

    // 1. Pool members path (already checked)
    console.log('1️⃣ POOL MEMBERS PATH:');
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();
    if (poolDoc.exists) {
      const poolData = poolDoc.data();
      const chuckData = poolData[chuckUID];
      if (chuckData) {
        console.log(`   ✅ Found in pool members:`);
        console.log(`   Pick History: "${chuckData.survivor?.pickHistory || 'None'}"`);
        console.log(`   Survivor Data:`, JSON.stringify(chuckData.survivor, null, 4));
      } else {
        console.log('   ❌ Not found in pool members');
      }
    }

    // 2. Individual user document
    console.log('\n2️⃣ INDIVIDUAL USER DOCUMENT:');
    const userDocPath = `users/${chuckUID}`;
    const userDoc = await db.doc(userDocPath).get();
    if (userDoc.exists) {
      console.log('   ✅ Found individual user document:');
      console.log('   Data:', JSON.stringify(userDoc.data(), null, 4));
    } else {
      console.log('   ❌ No individual user document found');
    }

    // 3. Picks collection
    console.log('\n3️⃣ PICKS COLLECTION:');
    const picksPath = `users/${chuckUID}/picks`;
    const picksSnapshot = await db.collection(picksPath).get();
    if (!picksSnapshot.empty) {
      console.log('   ✅ Found picks collection:');
      picksSnapshot.forEach(doc => {
        console.log(`   Document ${doc.id}:`, JSON.stringify(doc.data(), null, 4));
      });
    } else {
      console.log('   ❌ No picks collection found');
    }

    // 4. Survivor picks collection
    console.log('\n4️⃣ SURVIVOR PICKS COLLECTION:');
    const survivorPicksPath = `users/${chuckUID}/survivorPicks`;
    const survivorSnapshot = await db.collection(survivorPicksPath).get();
    if (!survivorSnapshot.empty) {
      console.log('   ✅ Found survivor picks collection:');
      survivorSnapshot.forEach(doc => {
        console.log(`   Document ${doc.id}:`, JSON.stringify(doc.data(), null, 4));
      });
    } else {
      console.log('   ❌ No survivor picks collection found');
    }

    // 5. Pool-specific picks
    console.log('\n5️⃣ POOL-SPECIFIC PICKS:');
    const poolPicksPath = `users/${chuckUID}/pools/${poolId}/picks`;
    const poolPicksSnapshot = await db.collection(poolPicksPath).get();
    if (!poolPicksSnapshot.empty) {
      console.log('   ✅ Found pool-specific picks:');
      poolPicksSnapshot.forEach(doc => {
        console.log(`   Document ${doc.id}:`, JSON.stringify(doc.data(), null, 4));
      });
    } else {
      console.log('   ❌ No pool-specific picks found');
    }

    // 6. Week-specific documents
    console.log('\n6️⃣ WEEK-SPECIFIC SURVIVOR PICKS:');
    for (let week = 1; week <= 3; week++) {
      const weekPickPath = `users/${chuckUID}/survivorPicks/week${week}`;
      const weekDoc = await db.doc(weekPickPath).get();
      if (weekDoc.exists) {
        console.log(`   ✅ Found Week ${week} document:`);
        console.log(`   Data:`, JSON.stringify(weekDoc.data(), null, 4));
      } else {
        console.log(`   ❌ No Week ${week} document`);
      }
    }

    // 7. Alternative pools path
    console.log('\n7️⃣ ALTERNATIVE POOLS STRUCTURE:');
    const altPoolPath = `pools/${poolId}/members/${chuckUID}`;
    const altPoolDoc = await db.doc(altPoolPath).get();
    if (altPoolDoc.exists) {
      console.log('   ✅ Found in alternative pools structure:');
      console.log('   Data:', JSON.stringify(altPoolDoc.data(), null, 4));
    } else {
      console.log('   ❌ No alternative pools structure');
    }

    // 8. Search by email in all users
    console.log('\n8️⃣ SEARCHING ALL USERS BY EMAIL (chuck.upshur@gmail.com):');
    const usersSnapshot = await db.collection('users').where('email', '==', 'chuck.upshur@gmail.com').get();
    if (!usersSnapshot.empty) {
      console.log('   ✅ Found users by email:');
      usersSnapshot.forEach(doc => {
        console.log(`   User ID: ${doc.id}`);
        console.log(`   Data:`, JSON.stringify(doc.data(), null, 4));
      });
    } else {
      console.log('   ❌ No users found by email');
    }

    // 9. Raw document search for "Baltimore Ravens"
    console.log('\n9️⃣ SEARCHING FOR "BALTIMORE RAVENS" IN CHUCK\'S DATA:');
    const allPaths = [
      `artifacts/nerdfootball/pools/${poolId}/metadata/members`,
      `users/${chuckUID}`,
      `pools/${poolId}/members/${chuckUID}`
    ];

    for (const path of allPaths) {
      try {
        const doc = await db.doc(path).get();
        if (doc.exists) {
          const data = doc.data();
          const dataString = JSON.stringify(data);
          if (dataString.toLowerCase().includes('baltimore ravens')) {
            console.log(`   🎯 FOUND "Baltimore Ravens" in path: ${path}`);
            console.log(`   Full data:`, JSON.stringify(data, null, 4));
          }
        }
      } catch (error) {
        // Skip errors for non-existent paths
      }
    }

    console.log('\n🔍 CHUCK UPSHUR DATA SEARCH COMPLETE');
    console.log('==========================================');
    console.log('If Baltimore Ravens exists for Chuck Upshur, it should appear above.');
    console.log('If not found, please indicate WHERE you are seeing this data.');

  } catch (error) {
    console.error('❌ Error in deep search:', error);
  }
}

deepSearchChuckUpshur().then(() => {
  console.log('\n✅ Deep search complete');
  process.exit(0);
}).catch(error => {
  console.error('Search failed:', error);
  process.exit(1);
});