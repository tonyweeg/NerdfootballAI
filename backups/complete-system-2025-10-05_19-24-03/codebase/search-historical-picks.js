#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function searchHistoricalPicks() {
  try {
    console.log('🔍 SEARCHING FOR HISTORICAL SURVIVOR PICKS...');
    console.log('Based on SURVIVOR-ALIVE-FIELD-IMPLEMENTATION-PLAN.md, you picked:');
    console.log('   Week 1: Denver Broncos');
    console.log('   Week 2: Arizona Cardinals');

    const yourUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2';

    // Search in all possible storage locations
    const searchLocations = [
      // Legacy formats
      `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${yourUserId}`,

      // Weekly unified documents
      `artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/1`,
      `artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/2`,

      // Old pick format by week
      `artifacts/nerdfootball/picks/survivor/week-1/${yourUserId}`,
      `artifacts/nerdfootball/picks/survivor/week-2/${yourUserId}`,

      // Single survivor status document
      'artifacts/nerdfootball/public/data/nerdfootball_survivor_picks',
      'artifacts/nerdfootball/public/data/nerdfootball_survivor_status',

      // Regular picks format (maybe survivor was mixed in)
      `artifacts/nerdfootball/public/data/nerdfootball_picks/1/submissions/${yourUserId}`,
      `artifacts/nerdfootball/public/data/nerdfootball_picks/2/submissions/${yourUserId}`,
    ];

    for (const path of searchLocations) {
      try {
        console.log(`\n📍 Checking: ${path}`);
        const doc = await db.doc(path).get();

        if (doc.exists) {
          const data = doc.data();
          console.log('   ✅ Document exists!');

          // Look for your user ID or any survivor data
          if (data[yourUserId]) {
            console.log(`   🎯 FOUND YOUR DATA: ${JSON.stringify(data[yourUserId], null, 2)}`);
          } else if (data.picks && data.picks[yourUserId]) {
            console.log(`   🎯 FOUND YOUR PICKS: ${JSON.stringify(data.picks[yourUserId], null, 2)}`);
          } else if (data.survivorPick || data.team) {
            console.log(`   🎯 FOUND SURVIVOR DATA: ${JSON.stringify(data, null, 2)}`);
          } else {
            // Check if this is a week document that might contain your data
            console.log(`   📋 Keys in document: ${Object.keys(data).slice(0, 10).join(', ')}...`);

            // Look for patterns that might be your data
            const possibleMatches = Object.keys(data).filter(key =>
              key.includes('WxSP') ||
              key === yourUserId ||
              (data[key] && typeof data[key] === 'object' &&
               (data[key].team === 'Denver Broncos' || data[key].team === 'Arizona Cardinals'))
            );

            if (possibleMatches.length > 0) {
              console.log(`   🔍 Possible matches: ${possibleMatches.join(', ')}`);
              possibleMatches.forEach(key => {
                console.log(`      ${key}: ${JSON.stringify(data[key])}`);
              });
            }
          }
        } else {
          console.log('   ❌ Document does not exist');
        }
      } catch (error) {
        console.log(`   ⚠️ Error: ${error.message}`);
      }
    }

    // Also search collections for your user ID
    console.log('\n🔍 Searching collections for your data...');

    try {
      // Check if there's a collection-based approach
      const collectionsToCheck = [
        'artifacts/nerdfootball/public/data/nerdSurvivor_picks',
        'artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks'
      ];

      for (const collectionPath of collectionsToCheck) {
        try {
          console.log(`\n📁 Checking collection: ${collectionPath}`);
          const snapshot = await db.collection(collectionPath).where('userId', '==', yourUserId).get();

          if (!snapshot.empty) {
            console.log(`   ✅ Found ${snapshot.size} documents in collection!`);
            snapshot.docs.forEach(doc => {
              console.log(`      Doc ID: ${doc.id}`);
              console.log(`      Data: ${JSON.stringify(doc.data(), null, 2)}`);
            });
          } else {
            console.log('   ❌ No documents found with your user ID');
          }
        } catch (error) {
          console.log(`   ⚠️ Collection error: ${error.message}`);
        }
      }

    } catch (error) {
      console.log(`   ⚠️ Collection search error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Search error:', error);
  }
}

searchHistoricalPicks().then(() => {
  console.log('\n✅ Historical search complete');
  process.exit(0);
});