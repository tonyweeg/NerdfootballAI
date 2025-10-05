#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkCurrentWeek() {
  console.log('🔍 DETERMINING CURRENT NFL WEEK...\n');

  try {
    // Check ESPN cache for current week
    let currentWeekFromCache = null;
    const espnCache = await db.doc('cache/espn_current_data').get();
    if (espnCache.exists) {
      const data = espnCache.data();
      currentWeekFromCache = data.currentWeek;
      console.log('📊 ESPN CACHE DATA:');
      console.log(`Current week from cache: ${data.currentWeek}`);
    }

    // Also check what week we're actually in based on date
    const now = new Date();
    console.log(`\n📅 Current date: ${now.toISOString()}`);
    console.log(`Current date (readable): ${now.toString()}`);

    // NFL 2025 season starts September 4th (Week 1)
    const week1Start = new Date('2025-09-04');
    const daysSinceWeek1 = Math.floor((now - week1Start) / (1000 * 60 * 60 * 24));
    const calculatedWeek = Math.max(1, Math.ceil(daysSinceWeek1 / 7));

    console.log(`\n🧮 WEEK CALCULATION:`);
    console.log(`Week 1 started: ${week1Start.toDateString()}`);
    console.log(`Days since Week 1: ${daysSinceWeek1}`);
    console.log(`Calculated current week: ${calculatedWeek}`);

    const finalCurrentWeek = currentWeekFromCache || calculatedWeek;
    console.log(`\n✅ CURRENT WEEK DETERMINATION: ${finalCurrentWeek}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCurrentWeek().then(() => {
  process.exit(0);
});