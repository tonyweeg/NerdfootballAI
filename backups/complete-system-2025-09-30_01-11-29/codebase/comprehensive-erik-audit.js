#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function comprehensiveErikAudit() {
  console.log('🚨 COMPREHENSIVE ERIK WEEG SURVIVOR AUDIT...\n');

  const erikUID = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';

  try {
    console.log('🔍 STEP 1: Current Erik Weeg user document status');
    console.log('================================================');

    const userDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdfootball_users/${erikUID}`).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`✅ Erik Weeg found: ${userData.email}`);

      // Check for any survivor fields
      const allFields = Object.keys(userData);
      const survivorKeywords = ['status', 'pick', 'eliminated', 'survivor', 'week'];
      const survivorFields = allFields.filter(field =>
        survivorKeywords.some(keyword => field.toLowerCase().includes(keyword))
      );

      if (survivorFields.length > 0) {
        console.log('🏆 SURVIVOR-RELATED FIELDS FOUND:');
        survivorFields.forEach(field => {
          console.log(`   ${field}: ${userData[field]}`);
        });
      } else {
        console.log('✅ NO SURVIVOR FIELDS - Data appears to have been cleaned up!');
      }
    }

    console.log('\n🔍 STEP 2: Check if Erik appears in ANY survivor data structures');
    console.log('===============================================================');

    // Check all collections for any trace of Erik's survivor data
    const collections = await db.listCollections();
    let erikFoundAnywhere = false;

    for (const collection of collections) {
      try {
        const snapshot = await collection.where('email', '==', 'erweeg@gmail.com').limit(5).get();
        if (!snapshot.empty) {
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.week1Pick || data.status || data.eliminated !== undefined) {
              erikFoundAnywhere = true;
              console.log(`🎯 ERIK FOUND in collection: ${collection.id}`);
              console.log(`   Document ID: ${doc.id}`);
              console.log(`   Status: ${data.status}`);
              console.log(`   Week1Pick: ${data.week1Pick}`);
              console.log(`   Eliminated: ${data.eliminated}`);

              if (data.week1Pick === 'Miami Dolphins' && (data.status === 18 || !data.eliminated)) {
                console.log('   ❌ STILL ALIVE WITH MIAMI PICK!');
              }
            }
          });
        }

        // Also check for his UID directly
        const uidDoc = await collection.doc(erikUID).get();
        if (uidDoc.exists) {
          const data = uidDoc.data();
          if (data.week1Pick || data.status || data.eliminated !== undefined) {
            erikFoundAnywhere = true;
            console.log(`🎯 ERIK UID FOUND in collection: ${collection.id}`);
            console.log(`   Status: ${data.status}`);
            console.log(`   Week1Pick: ${data.week1Pick}`);
            console.log(`   Eliminated: ${data.eliminated}`);

            if (data.week1Pick === 'Miami Dolphins' && (data.status === 18 || !data.eliminated)) {
              console.log('   ❌ STILL ALIVE WITH MIAMI PICK!');
            }
          }
        }

      } catch (error) {
        // Skip collections that can't be queried
      }
    }

    if (!erikFoundAnywhere) {
      console.log('✅ Erik Weeg NOT found in any survivor data structures');
      console.log('✅ This suggests the previous fix scripts successfully cleaned up his data');
    }

    console.log('\n🔍 STEP 3: Check for ANY remaining Miami Dolphins picks');
    console.log('======================================================');

    // Check the main user collection for any remaining Miami picks
    const usersCollection = db.collection('artifacts/nerdfootball/public/data/nerdfootball_users');
    const usersSnapshot = await usersCollection.get();

    let miamiPickersFound = 0;
    let miamiPickersStillAlive = 0;

    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();

      if (data.week1Pick === 'Miami Dolphins') {
        miamiPickersFound++;
        console.log(`🐬 Miami picker: ${data.email || doc.id}`);
        console.log(`   Status: ${data.status}, Eliminated: ${data.eliminated}`);

        if (data.status === 18 || !data.eliminated) {
          miamiPickersStillAlive++;
          console.log('   ❌ STILL ALIVE!');
        } else {
          console.log('   ✅ Correctly eliminated');
        }
      }
    });

    console.log('\n📊 FINAL AUDIT RESULTS:');
    console.log('========================');
    console.log(`Total Miami pickers found: ${miamiPickersFound}`);
    console.log(`Miami pickers still incorrectly alive: ${miamiPickersStillAlive}`);

    if (miamiPickersStillAlive === 0) {
      console.log('✅ SUCCESS: All Miami pickers correctly eliminated or data cleaned up!');
      console.log('✅ The previous fix scripts appear to have worked correctly!');
    } else {
      console.log('❌ CRITICAL: Some Miami pickers still incorrectly alive!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

comprehensiveErikAudit().then(() => {
  process.exit(0);
});