#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function resetTestUser() {
  console.log('🧹 Resetting test user to clean state...');

  const testUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Ållfåther
  const poolId = 'nerduniverse-2025';
  const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
  const survivorPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${testUserId}`;

  try {
    // Reset survivor field to default
    const cleanField = {
      alive: 18,
      pickHistory: "",
      lastUpdated: new Date().toISOString(),
      totalPicks: 0,
      manualOverride: false
    };

    await db.doc(poolMembersPath).update({
      [`${testUserId}.survivor`]: cleanField
    });

    console.log('✅ Pool member survivor field reset');

    // Clear old system picks
    try {
      await db.doc(survivorPicksPath).delete();
      console.log('✅ Old system picks cleared');
    } catch (error) {
      console.log('ℹ️ No old system picks to clear');
    }

    console.log('🎯 Test user reset complete - ready for testing');

  } catch (error) {
    console.error('❌ Error resetting test user:', error);
    throw error;
  }
}

resetTestUser().then(() => {
  console.log('\n✅ Reset complete');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Reset failed:', error);
  process.exit(1);
});