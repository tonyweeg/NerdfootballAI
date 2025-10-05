#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function examineCompiledSheetsData() {
  console.log('🔍 EXAMINING COMPILED_SHEETS SURVIVOR DATA...\n');

  try {
    const compiledSheetsPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/survivor/compiled_sheets';
    const doc = await db.doc(compiledSheetsPath).get();

    if (doc.exists) {
      const data = doc.data();
      console.log('📊 COMPILED_SHEETS SURVIVOR DATA FOUND');
      console.log('=====================================');

      // Get all the keys to understand the structure
      const keys = Object.keys(data);
      console.log(`Total entries: ${keys.length}`);
      console.log(`Sample keys: ${keys.slice(0, 5).join(', ')}`);

      // Look for Erik Weeg specifically
      console.log('\n👤 SEARCHING FOR ERIK WEEG...');
      let erikFound = false;

      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null) {
          // Check if this is Erik Weeg's data
          if (key.includes('BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2') ||
              (value.email && value.email.includes('erweeg')) ||
              (value.displayName && value.displayName.toLowerCase().includes('erik'))) {

            erikFound = true;
            console.log(`✅ FOUND ERIK WEEG: ${key}`);
            console.log(`   Data: ${JSON.stringify(value, null, 2)}`);

            // Check specifically for Miami pick and status
            if (value.week1Pick === 'Miami Dolphins') {
              console.log('   🐬 CONFIRMED: Picked Miami Dolphins in Week 1');
              if (value.status === 18 || !value.eliminated) {
                console.log('   ❌ CRITICAL ISSUE: Still marked as ALIVE despite Miami loss!');
              } else {
                console.log('   ✅ Correctly eliminated for Miami pick');
              }
            }
          }
        }
      }

      if (!erikFound) {
        console.log('❌ Erik Weeg not found in compiled_sheets');
      }

      // Look for ALL Miami Dolphins picks
      console.log('\n🐬 SEARCHING FOR ALL MIAMI DOLPHINS PICKS...');
      let miamiCount = 0;
      let miamiAliveCount = 0;

      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null && value.week1Pick === 'Miami Dolphins') {
          miamiCount++;
          console.log(`\n🐬 Miami picker: ${key}`);
          console.log(`   Email: ${value.email || 'N/A'}`);
          console.log(`   Status: ${value.status}`);
          console.log(`   Eliminated: ${value.eliminated}`);
          console.log(`   Eliminated Week: ${value.eliminatedWeek || 'N/A'}`);

          if (value.status === 18 || !value.eliminated) {
            miamiAliveCount++;
            console.log('   ❌ PROBLEM: Still alive despite Miami loss!');
          } else {
            console.log('   ✅ Correctly eliminated');
          }
        }
      }

      console.log(`\n📊 MIAMI DOLPHINS SUMMARY:`);
      console.log(`Total Miami pickers: ${miamiCount}`);
      console.log(`Still incorrectly alive: ${miamiAliveCount}`);

      if (miamiAliveCount > 0) {
        console.log('\n❌ CRITICAL: Data integrity issue persists!');
        console.log('The survivor elimination fixes were not properly applied.');
      } else if (miamiCount === 0) {
        console.log('\n✅ No Miami picks found - fixes may have been applied');
      } else {
        console.log('\n✅ All Miami pickers correctly eliminated');
      }

      // Also check structure to understand status values
      console.log('\n📋 SURVIVOR STATUS ANALYSIS...');
      const statusCounts = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null && value.status !== undefined) {
          statusCounts[value.status] = (statusCounts[value.status] || 0) + 1;
        }
      }

      console.log('Status distribution:');
      for (const [status, count] of Object.entries(statusCounts)) {
        console.log(`   Status ${status}: ${count} users`);
      }

    } else {
      console.log('❌ compiled_sheets document not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

examineCompiledSheetsData().then(() => {
  process.exit(0);
});