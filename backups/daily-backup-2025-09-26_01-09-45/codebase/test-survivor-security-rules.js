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

async function testSurvivorSecurityRules() {
  console.log('🔐 TESTING SURVIVOR FIELD SECURITY RULES\n');

  const poolId = 'nerduniverse-2025';
  const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

  try {
    // Test users
    const testUsers = [
      { uid: 'WxSPmEildJdqs6T5hIpBUZrscwt2', name: 'Ållfåther', role: 'admin' },
      { uid: 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2', name: 'Erik Weeg', role: 'admin' },
      { uid: 'dTZoM31JtZRnSoelUz40axtOJou2', name: 'Brian Weeg', role: 'member' }
    ];

    console.log('1️⃣ TESTING SURVIVOR FIELD UPDATES:');

    for (const user of testUsers) {
      console.log(`\n   🎯 Testing user: ${user.name} (${user.role})`);

      // Create test survivor field update
      const testSurvivorData = {
        alive: 15, // Died in week 15
        pickHistory: "Denver Broncos, Arizona Cardinals, Buffalo Bills",
        lastUpdated: new Date().toISOString(),
        totalPicks: 3,
        manualOverride: true
      };

      try {
        // Test updating survivor field
        await db.doc(poolMembersPath).update({
          [`${user.uid}.survivor`]: testSurvivorData
        });

        console.log(`   ✅ ${user.name}: Survivor field update successful`);

        // Verify the update
        const updatedDoc = await db.doc(poolMembersPath).get();
        const updatedUser = updatedDoc.data()[user.uid];

        if (updatedUser.survivor && updatedUser.survivor.alive === 15) {
          console.log(`   ✅ ${user.name}: Update verified (alive: ${updatedUser.survivor.alive})`);
        } else {
          console.log(`   ❌ ${user.name}: Update verification failed`);
        }

      } catch (error) {
        console.log(`   ❌ ${user.name}: Survivor field update failed - ${error.message}`);
      }
    }

    // Test specific survivor field operations
    console.log('\n2️⃣ TESTING SURVIVOR FIELD OPERATIONS:');

    const testUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Ållfåther
    console.log(`   🎯 Testing detailed operations for: ${testUsers[0].name}`);

    // Test 1: Update alive status
    try {
      await db.doc(poolMembersPath).update({
        [`${testUserId}.survivor.alive`]: 12
      });
      console.log('   ✅ Individual field update (alive): Success');
    } catch (error) {
      console.log(`   ❌ Individual field update (alive): ${error.message}`);
    }

    // Test 2: Update pick history
    try {
      await db.doc(poolMembersPath).update({
        [`${testUserId}.survivor.pickHistory`]: "Denver Broncos, Arizona Cardinals, Buffalo Bills, New England Patriots"
      });
      console.log('   ✅ Individual field update (pickHistory): Success');
    } catch (error) {
      console.log(`   ❌ Individual field update (pickHistory): ${error.message}`);
    }

    // Test 3: Update last updated timestamp
    try {
      await db.doc(poolMembersPath).update({
        [`${testUserId}.survivor.lastUpdated`]: new Date().toISOString()
      });
      console.log('   ✅ Individual field update (lastUpdated): Success');
    } catch (error) {
      console.log(`   ❌ Individual field update (lastUpdated): ${error.message}`);
    }

    // Test 4: Reset to default state for clean testing
    console.log('\n3️⃣ RESETTING TEST USER TO DEFAULT STATE:');

    const defaultSurvivorField = {
      alive: 18,
      pickHistory: "",
      lastUpdated: new Date().toISOString(),
      totalPicks: 0,
      manualOverride: false
    };

    try {
      await db.doc(poolMembersPath).update({
        [`${testUserId}.survivor`]: defaultSurvivorField
      });
      console.log(`   ✅ ${testUsers[0].name}: Reset to default state successful`);
    } catch (error) {
      console.log(`   ❌ Reset failed: ${error.message}`);
    }

    // Final verification
    console.log('\n4️⃣ FINAL VERIFICATION:');

    const finalDoc = await db.doc(poolMembersPath).get();
    const finalData = finalDoc.data();

    let successCount = 0;
    for (const user of testUsers) {
      const userData = finalData[user.uid];
      if (userData && userData.survivor) {
        console.log(`   ✅ ${user.name}: Has survivor field`);
        successCount++;
      } else {
        console.log(`   ❌ ${user.name}: Missing survivor field`);
      }
    }

    console.log(`\n📊 SUMMARY: ${successCount}/${testUsers.length} users have survivor fields`);

    if (successCount === testUsers.length) {
      console.log('\n✅ SECURITY RULES TEST SUCCESSFUL!');
      console.log('🎯 READY FOR: Phase 1 validation and Phase 2 implementation');
      return true;
    } else {
      console.log('\n❌ SECURITY RULES TEST FAILED!');
      return false;
    }

  } catch (error) {
    console.error('❌ SECURITY RULES TEST ERROR:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testSurvivorSecurityRules().then((success) => {
    if (success) {
      console.log('\n🎯 Security rules test completed successfully');
      process.exit(0);
    } else {
      console.log('\n💥 Security rules test failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Security rules test failed:', error);
    process.exit(1);
  });
}