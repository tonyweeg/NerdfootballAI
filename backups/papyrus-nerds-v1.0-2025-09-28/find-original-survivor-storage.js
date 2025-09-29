#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findOriginalSurvivorStorage() {
  try {
    console.log('🔍 SEARCHING FOR ORIGINAL SURVIVOR PICK STORAGE\n');

    // Pattern 1: Single document with all user picks - correct Firestore structure
    console.log('1️⃣ Checking: artifacts -> nerdfootball -> public -> data -> nerdfootball_survivor_picks');
    const survivorPicksDoc = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').collection('nerdfootball_survivor_picks').doc('picks').get();
    if (survivorPicksDoc.exists) {
      const data = survivorPicksDoc.data();
      console.log('   ✅ FOUND! Document exists');
      console.log('   📊 Keys:', Object.keys(data));
      console.log('   📋 Sample data (first 3 users):');
      Object.entries(data).slice(0, 3).forEach(([userId, userData]) => {
        console.log(`      ${userId.substring(0,8)}: ${JSON.stringify(userData)}`);
      });
    } else {
      console.log('   ❌ NOT FOUND');
    }

    // Pattern 2: Single document with user status
    console.log('\n2️⃣ Checking: artifacts/nerdfootball/public/data (collection) -> nerdfootball_survivor_status (document)');
    const survivorStatusDoc = await db.collection('artifacts/nerdfootball/public/data').doc('nerdfootball_survivor_status').get();
    if (survivorStatusDoc.exists) {
      const data = survivorStatusDoc.data();
      console.log('   ✅ FOUND! Document exists');
      console.log('   📊 Keys:', Object.keys(data));
      console.log('   📋 Sample data (first 3 users):');
      Object.entries(data).slice(0, 3).forEach(([userId, userData]) => {
        console.log(`      ${userId.substring(0,8)}: ${JSON.stringify(userData)}`);
      });
    } else {
      console.log('   ❌ NOT FOUND');
    }

    // Pattern 3: Unified weekly documents
    console.log('\n3️⃣ Checking: artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/');
    for (let week = 1; week <= 4; week++) {
      const weeklyPath = `artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/${week}`;
      const weeklyDoc = await db.doc(weeklyPath).get();
      if (weeklyDoc.exists) {
        const data = weeklyDoc.data();
        console.log(`   ✅ Week ${week}: FOUND! ${Object.keys(data).length} keys`);
        if (Object.keys(data).length > 0) {
          console.log(`      Sample keys: ${Object.keys(data).slice(0, 3).join(', ')}`);
        }
      } else {
        console.log(`   ❌ Week ${week}: NOT FOUND`);
      }
    }

    // Pattern 4: Compiled sheets
    console.log('\n4️⃣ Checking: artifacts/nerdfootball/pools/nerduniverse-2025/survivor/compiled_sheets');
    const compiledDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/survivor/compiled_sheets').get();
    if (compiledDoc.exists) {
      const data = compiledDoc.data();
      console.log('   ✅ FOUND! Compiled sheets exist');
      console.log('   📊 Structure:', Object.keys(data));
      if (data.winners) {
        console.log(`   🏆 Winners: ${data.winners.length} entries`);
        console.log('   📋 Sample winners:', JSON.stringify(data.winners.slice(0, 2), null, 2));
      }
      if (data.losers) {
        console.log(`   💀 Losers: ${data.losers.length} entries`);
        console.log('   📋 Sample losers:', JSON.stringify(data.losers.slice(0, 2), null, 2));
      }
    } else {
      console.log('   ❌ NOT FOUND');
    }

    // Pattern 5: Survivor entries collection
    console.log('\n5️⃣ Checking: artifacts/nerdfootball/survivor/entries');
    const entriesSnapshot = await db.collection('artifacts/nerdfootball/survivor/entries/entries').get();
    if (!entriesSnapshot.empty) {
      console.log(`   ✅ FOUND! ${entriesSnapshot.size} survivor entries`);
      entriesSnapshot.docs.slice(0, 3).forEach(doc => {
        console.log(`      ${doc.id}: ${JSON.stringify(doc.data())}`);
      });
    } else {
      console.log('   ❌ NOT FOUND or EMPTY');
    }

    // Pattern 6: Individual pick documents by week - correct path structure
    console.log('\n6️⃣ Checking: artifacts/nerdfootball/picks/survivor (collection) -> week-X (document) -> userPicksCollection (subcollection)');
    const testUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Your user ID

    // Try different structures
    for (let week = 1; week <= 4; week++) {
      // Structure 1: collection/document/collection/document
      const pickPath1 = `artifacts/nerdfootball/picks/survivor/week-${week}/${testUserId}`;
      try {
        const pickDoc1 = await db.doc(pickPath1).get();
        if (pickDoc1.exists) {
          console.log(`   ✅ Week ${week} (Structure 1): FOUND pick document!`);
          console.log(`      Data: ${JSON.stringify(pickDoc1.data())}`);
        } else {
          console.log(`   ❌ Week ${week} (Structure 1): No pick document`);
        }
      } catch (error) {
        console.log(`   ❌ Week ${week} (Structure 1): Path error - ${error.message}`);
      }

      // Structure 2: Try as collection query
      try {
        const weekCollection = await db.collection(`artifacts/nerdfootball/picks/survivor`).doc(`week-${week}`).collection('picks').doc(testUserId).get();
        if (weekCollection.exists) {
          console.log(`   ✅ Week ${week} (Structure 2): FOUND pick in subcollection!`);
          console.log(`      Data: ${JSON.stringify(weekCollection.data())}`);
        }
      } catch (error) {
        // Ignore - just testing structures
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findOriginalSurvivorStorage().then(() => {
  console.log('\n✅ Search complete');
  process.exit(0);
});