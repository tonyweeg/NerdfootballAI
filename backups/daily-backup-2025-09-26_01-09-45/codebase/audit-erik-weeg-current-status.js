#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function auditErikWeegCurrentStatus() {
  console.log('🚨 AUDITING ERIK WEEG CURRENT STATUS - CRITICAL CHECK...\n');

  try {
    // From the conversation context, Erik Weeg was found to have picked Miami and be incorrectly alive
    // Let me check the exact path that was used in the original examine-erik-user-doc.js

    const erikUID = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';

    // Check the main user document where survivor data might be stored
    console.log('📊 CHECKING USER DOCUMENT WITH SURVIVOR DATA...');

    const userDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdfootball_users/${erikUID}`).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('✅ Found Erik Weeg user document');
      console.log(`Email: ${userData.email}`);

      // The critical survivor data might be nested or in a different field
      console.log('\n🔍 FULL USER DATA EXAMINATION:');
      console.log('================================');

      for (const [key, value] of Object.entries(userData)) {
        console.log(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      }

      // Look specifically for survivor-related fields
      const survivorFields = ['status', 'week1Pick', 'eliminated', 'eliminatedWeek', 'survivorStatus', 'picks'];
      let hasSurvivorData = false;

      console.log('\n🏆 SURVIVOR-SPECIFIC FIELDS:');
      console.log('============================');

      for (const field of survivorFields) {
        if (userData[field] !== undefined) {
          hasSurvivorData = true;
          console.log(`${field}: ${typeof userData[field] === 'object' ? JSON.stringify(userData[field]) : userData[field]}`);

          // Critical Miami check
          if (field === 'week1Pick' && userData[field] === 'Miami Dolphins') {
            console.log('🐬 CONFIRMED: Erik picked Miami Dolphins!');

            if (userData.status === 18 || !userData.eliminated) {
              console.log('❌ CRITICAL ISSUE: Still shows as ALIVE despite Miami loss!');
            }
          }
        }
      }

      if (!hasSurvivorData) {
        console.log('❌ No survivor fields found in main user document');

        // The data might be in a subcollection or separate document
        console.log('\n🔍 CHECKING FOR SUBCOLLECTIONS...');

        try {
          // Check if there are subcollections
          const subcollections = await userDoc.ref.listCollections();
          for (const subcollection of subcollections) {
            console.log(`Found subcollection: ${subcollection.id}`);

            const subDocs = await subcollection.get();
            subDocs.docs.forEach(subDoc => {
              console.log(`  - Document: ${subDoc.id}`);
              const subData = subDoc.data();
              console.log(`    Data: ${JSON.stringify(subData)}`);
            });
          }
        } catch (subError) {
          console.log('No subcollections accessible');
        }
      }

    } else {
      console.log('❌ Erik Weeg user document not found at expected path');
    }

    // Also check if there's a completely separate survivor data structure
    console.log('\n🔍 CHECKING FOR SEPARATE SURVIVOR DATA STRUCTURES...');

    // Check all documents in the artifacts tree that might contain survivor data
    const possibleSurvivorPaths = [
      'artifacts/nerdfootball/pools/nerduniverse-2025/survivor_data',
      'artifacts/nerdfootball/pools/nerduniverse-2025/status',
      'artifacts/nerdfootball/survivor_picks',
      'artifacts/nerdfootball/survivor_status'
    ];

    for (const path of possibleSurvivorPaths) {
      try {
        const doc = await db.doc(path).get();
        if (doc.exists) {
          const data = doc.data();
          console.log(`\n✅ Found data at: ${path}`);

          // Look for Erik's UID in the data
          if (data[erikUID]) {
            console.log(`🎯 ERIK WEEG DATA FOUND: ${JSON.stringify(data[erikUID])}`);

            const erikData = data[erikUID];
            if (erikData.week1Pick === 'Miami Dolphins') {
              console.log('🐬 CONFIRMED: Erik picked Miami Dolphins!');

              if (erikData.status === 18 || !erikData.eliminated) {
                console.log('❌ CRITICAL ISSUE: Still alive despite Miami loss!');
              } else {
                console.log('✅ Correctly eliminated');
              }
            }
          }
        }
      } catch (error) {
        // Path doesn't exist, continue
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

auditErikWeegCurrentStatus().then(() => {
  process.exit(0);
});