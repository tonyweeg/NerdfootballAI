#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkEspnCache() {
  try {
    console.log('🔍 Checking ESPN cache data...');

    const cacheDoc = await db.doc('cache/espn_current_data').get();
    if (cacheDoc.exists) {
      const cacheData = cacheDoc.data();
      console.log('📊 Cache document exists. Keys:', Object.keys(cacheData));

      // Check for week data
      for (let week = 1; week <= 18; week++) {
        const weekKey = `week_${week}`;
        if (cacheData[weekKey]) {
          console.log(`   ✅ Found ${weekKey}: ${cacheData[weekKey].games ? cacheData[weekKey].games.length : 'unknown'} games`);
        }
      }

      // Check current week data
      if (cacheData.currentWeek) {
        console.log(`📅 Current week: ${cacheData.currentWeek}`);
      }

    } else {
      console.log('❌ ESPN cache document not found');
    }

    // Also check if there's historical game data elsewhere
    console.log('\n🔍 Looking for other game data sources...');

    // Check artifacts
    const artifactsSnap = await db.collection('artifacts').limit(5).get();
    console.log(`📁 Found ${artifactsSnap.size} documents in artifacts collection`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkEspnCache().then(() => {
  console.log('\n✅ Cache check complete');
  process.exit(0);
});