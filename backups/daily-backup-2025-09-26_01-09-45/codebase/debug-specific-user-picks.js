#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugSpecificUserPicks() {
  try {
    console.log('🔍 Debugging specific user picks for tonyweeg@gmail.com (Ållfåther)...');

    // My user ID (from the verification table)
    const myUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2';

    // Check pool members document
    console.log('\n1️⃣ Pool member data:');
    const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
    if (poolDoc.exists) {
      const userData = poolDoc.data()[myUserId];
      console.log('   User data:', JSON.stringify(userData, null, 2));
    }

    // Check survivor picks document
    console.log('\n2️⃣ Survivor picks document:');
    const picksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${myUserId}`;
    console.log(`   Path: ${picksPath}`);

    const picksDoc = await db.doc(picksPath).get();
    if (picksDoc.exists) {
      const picksData = picksDoc.data();
      console.log('   ✅ Document EXISTS');
      console.log('   Full data:', JSON.stringify(picksData, null, 2));
    } else {
      console.log('   ❌ Document DOES NOT EXIST');
    }

    // Check a few other users for comparison
    console.log('\n3️⃣ Checking other users with embedded data:');
    const usersWithEmbeddedData = [
      'BPQvRhpVVBNXvpGKfhw6gdcKSKh2', // Erik Weeg
      'dTZoM31JSkh2SJfgEUE3ltpzUEf2', // Brian Weeg
      '3UNx3z6jd8TUXMq5C2IHq0GNgr92', // John Durkin
    ];

    for (const userId of usersWithEmbeddedData) {
      console.log(`\n   👤 User: ${userId.substring(0,8)}...`);

      const userPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
      const userPicksDoc = await db.doc(userPicksPath).get();

      if (userPicksDoc.exists) {
        const picksData = userPicksDoc.data();
        console.log('      ✅ Has picks document');
        console.log('      Picks:', JSON.stringify(picksData.picks, null, 2));
      } else {
        console.log('      ❌ No picks document');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugSpecificUserPicks().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
});