#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugWeek3AdminIssue() {
  console.log('🔍 DEBUGGING WEEK 3 ADMIN GAME RESULTS ISSUE...\n');

  // Check all possible Week 3 storage locations
  const paths = [
    'nerdfootball_games/week_3',
    'nerdfootball_results/week_3',
    'artifacts/nerdfootball/games/week_3',
    'games/week_3',
    'weeks/3/games',
    'schedule/week_3',
    'nfl_2025_week_3'
  ];

  console.log('📍 CHECKING DOCUMENT PATHS:');
  console.log('===========================');

  for (const path of paths) {
    try {
      const doc = await db.doc(path).get();
      if (doc.exists) {
        const data = doc.data();
        console.log(`✅ FOUND Week 3 data at: ${path}`);
        console.log(`   Data type: ${typeof data}`);
        console.log(`   Keys count: ${Object.keys(data).length}`);
        console.log(`   Sample keys: ${Object.keys(data).slice(0, 5).join(', ')}`);

        // Check if it has games array
        if (data.games && Array.isArray(data.games)) {
          console.log(`   ✅ Has games array: ${data.games.length} games`);
          console.log(`   Sample game: ${data.games[0]?.awayTeam} @ ${data.games[0]?.homeTeam}`);
        } else if (typeof data === 'object') {
          console.log(`   ⚠️  Object format, checking for game objects...`);
          const gameKeys = Object.keys(data).filter(key =>
            data[key] && typeof data[key] === 'object' &&
            (data[key].awayTeam || data[key].homeTeam)
          );
          console.log(`   Game-like objects: ${gameKeys.length}`);
        }
        console.log('');
      } else {
        console.log(`❌ No data at: ${path}`);
      }
    } catch (error) {
      console.log(`🚫 Error checking ${path}: ${error.message}`);
    }
  }

  console.log('\n📁 CHECKING COLLECTIONS:');
  console.log('=========================');

  // Check collections too
  const collections = ['nerdfootball_games', 'games', 'schedule'];
  for (const collection of collections) {
    try {
      const snapshot = await db.collection(collection).get();
      console.log(`📁 Collection ${collection}: ${snapshot.size} documents`);

      snapshot.docs.forEach(doc => {
        if (doc.id.includes('3') || doc.id.includes('week_3') || doc.id === 'week_3') {
          console.log(`   - Week 3 related: ${doc.id}`);
          const data = doc.data();
          if (data.games && Array.isArray(data.games)) {
            console.log(`     ✅ Has ${data.games.length} games`);
          }
        }
      });
    } catch (error) {
      console.log(`🚫 Collection ${collection} error: ${error.message}`);
    }
  }

  console.log('\n🔍 CHECKING RESULTSCONFIG PATH FUNCTION:');
  console.log('========================================');

  // Test the resultsPath function logic
  const testWeeks = [1, 2, 3, 4];
  for (const week of testWeeks) {
    const path = `nerdfootball_games/week_${week}`;
    console.log(`Week ${week} path: ${path}`);

    try {
      const doc = await db.doc(path).get();
      console.log(`   Exists: ${doc.exists()}`);
      if (doc.exists()) {
        const data = doc.data();
        console.log(`   Keys: ${Object.keys(data).length}`);
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log('\n🎯 DIAGNOSIS:');
  console.log('=============');
  console.log('If Week 3 data exists but admin view is empty, the issue is likely:');
  console.log('1. Wrong path in resultsPath() function for Week 3');
  console.log('2. Week 3 data in different format than expected');
  console.log('3. Admin view not handling Week 3 data structure');
  console.log('4. JavaScript error preventing Week 3 from loading');
}

debugWeek3AdminIssue().then(() => {
  process.exit(0);
});