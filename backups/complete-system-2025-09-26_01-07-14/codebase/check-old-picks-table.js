#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkOldPicksTable() {
  try {
    console.log('🔍 Checking OLD picks table for your survivor picks...');

    // Your user ID
    const yourUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Ållfåther

    // Check in the old picks table path
    console.log('\n1️⃣ Checking: artifacts/nerdfootball/public/data/nerdSurvivor_picks/{userId}');
    const oldPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${yourUserId}`;
    const oldPicksDoc = await db.doc(oldPicksPath).get();

    if (oldPicksDoc.exists) {
      const pickData = oldPicksDoc.data();
      console.log('✅ FOUND your picks in old table!');
      console.log('📋 Full document:', JSON.stringify(pickData, null, 2));

      if (pickData.picks) {
        console.log('\n📊 Your picks by week:');
        Object.entries(pickData.picks).forEach(([week, pick]) => {
          console.log(`   Week ${week}: ${pick.team || 'No team'} ${pick.gameId ? `(Game ID: ${pick.gameId})` : ''}`);
        });

        // Specifically answer your question
        console.log('\n🎯 ANSWERS TO YOUR QUESTIONS:');

        const week1Pick = pickData.picks['1'];
        if (week1Pick) {
          console.log(`   Week 1: You picked ${week1Pick.team}`);
        } else {
          console.log('   Week 1: NO PICK FOUND');
        }

        const week2Pick = pickData.picks['2'];
        if (week2Pick) {
          console.log(`   Week 2: You picked ${week2Pick.team}`);
        } else {
          console.log('   Week 2: NO PICK FOUND');
        }

      } else {
        console.log('❌ No picks field in document');
      }
    } else {
      console.log('❌ NO picks document found in old table either');
    }

    // Let's also check if there are other possible locations
    console.log('\n2️⃣ Let me search for ANY document with your user ID...');

    // Check if you have picks under a different structure
    const possiblePaths = [
      `artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/1`,
      `artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/2`,
      `artifacts/nerdfootball/picks/survivor/week-1/${yourUserId}`,
      `artifacts/nerdfootball/picks/survivor/week-2/${yourUserId}`
    ];

    for (const path of possiblePaths) {
      try {
        console.log(`\n   Checking: ${path}`);
        const doc = await db.doc(path).get();
        if (doc.exists) {
          const data = doc.data();
          console.log(`   ✅ FOUND document at ${path}`);

          // Look for your user ID in the data
          if (data[yourUserId]) {
            console.log(`   🎯 Found YOUR data: ${JSON.stringify(data[yourUserId])}`);
          } else {
            console.log(`   📋 Document exists but no data for your user ID`);
            console.log(`   📋 Available user IDs: ${Object.keys(data).slice(0, 5).join(', ')}...`);
          }
        } else {
          console.log(`   ❌ No document at ${path}`);
        }
      } catch (error) {
        console.log(`   ⚠️ Error checking ${path}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOldPicksTable().then(() => {
  console.log('\n✅ Old picks table check complete');
  process.exit(0);
});