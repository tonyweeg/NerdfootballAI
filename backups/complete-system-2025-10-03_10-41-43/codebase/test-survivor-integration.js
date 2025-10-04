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

// Import integration functions
const {
  updateSurvivorFieldOnPickSave,
  updateSurvivorFieldOnPickClear,
  initializeSurvivorFieldForUser,
  getSurvivorFieldForUser
} = require('./survivor-field-integration.js');

async function testSurvivorFieldIntegration() {
  console.log('🧪 TESTING SURVIVOR FIELD INTEGRATION\n');
  console.log('Verifying that new survivor field updates work with existing pick system...\n');

  const testUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Ållfåther
  const poolId = 'nerduniverse-2025';
  const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
  const survivorPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${testUserId}`;

  try {
    // Test 1: Initialize survivor field
    console.log('1️⃣ TESTING SURVIVOR FIELD INITIALIZATION:');

    await initializeSurvivorFieldForUser(testUserId);

    // Verify initialization
    const poolDoc = await db.doc(poolMembersPath).get();
    const userData = poolDoc.data()[testUserId];

    if (userData.survivor && userData.survivor.alive === 18) {
      console.log('   ✅ Survivor field initialized correctly');
      console.log('   📊 Initial field:', JSON.stringify(userData.survivor, null, 6));
    } else {
      console.log('   ❌ Survivor field initialization failed');
      return false;
    }

    // Test 2: Simulate existing pick save process + new field update
    console.log('\n2️⃣ TESTING SURVIVOR PICK SAVE INTEGRATION:');

    const testWeek = 1;
    const testTeam = 'Denver Broncos';

    // Simulate existing pick save (what the current system does)
    console.log('   📝 Simulating existing pick save process...');

    const survivorPicksDocRef = db.doc(survivorPicksPath);
    const survivorData = { picks: { [testWeek]: { team: testTeam } } };

    await survivorPicksDocRef.set(survivorData, { merge: true });
    console.log('   ✅ Old system pick saved successfully');

    // Now test our new field integration
    console.log('   📝 Updating new survivor field...');

    const updatedField = await updateSurvivorFieldOnPickSave(testUserId, testTeam, testWeek);

    if (updatedField) {
      console.log('   ✅ New survivor field updated successfully');
      console.log('   📊 Updated field:', JSON.stringify(updatedField, null, 6));

      // Verify the update
      const verifyDoc = await db.doc(poolMembersPath).get();
      const verifyData = verifyDoc.data()[testUserId];

      if (verifyData.survivor.pickHistory.includes(testTeam) &&
          verifyData.survivor.totalPicks === 1) {
        console.log('   ✅ Field update verification passed');
      } else {
        console.log('   ❌ Field update verification failed');
        return false;
      }
    } else {
      console.log('   ❌ New survivor field update failed');
      return false;
    }

    // Test 3: Add second pick
    console.log('\n3️⃣ TESTING SECOND PICK ADDITION:');

    const testWeek2 = 2;
    const testTeam2 = 'Arizona Cardinals';

    // Add second pick to old system
    const survivorData2 = { picks: { [testWeek2]: { team: testTeam2 } } };
    await survivorPicksDocRef.set(survivorData2, { merge: true });

    // Update new field
    const updatedField2 = await updateSurvivorFieldOnPickSave(testUserId, testTeam2, testWeek2);

    if (updatedField2) {
      console.log('   ✅ Second pick added successfully');
      console.log('   📊 Pick History:', updatedField2.pickHistory);
      console.log('   📊 Total Picks:', updatedField2.totalPicks);

      // Verify pick history format
      const expectedHistory = 'Denver Broncos, Arizona Cardinals';
      if (updatedField2.pickHistory === expectedHistory && updatedField2.totalPicks === 2) {
        console.log('   ✅ Pick history format verification passed');
      } else {
        console.log('   ❌ Pick history format verification failed');
        console.log('   Expected:', expectedHistory);
        console.log('   Actual:', updatedField2.pickHistory);
        return false;
      }
    } else {
      console.log('   ❌ Second pick addition failed');
      return false;
    }

    // Test 4: Pick clear functionality
    console.log('\n4️⃣ TESTING PICK CLEAR INTEGRATION:');

    // Clear second pick from old system
    const clearData = { picks: { [testWeek2]: { team: '' } } };
    await survivorPicksDocRef.set(clearData, { merge: true });

    // Update new field for clear
    const clearedField = await updateSurvivorFieldOnPickClear(testUserId, testTeam2, testWeek2);

    if (clearedField) {
      console.log('   ✅ Pick cleared successfully');
      console.log('   📊 Pick History after clear:', clearedField.pickHistory);
      console.log('   📊 Total Picks after clear:', clearedField.totalPicks);

      // Verify clear worked correctly
      const expectedHistoryAfterClear = 'Denver Broncos';
      if (clearedField.pickHistory === expectedHistoryAfterClear && clearedField.totalPicks === 1) {
        console.log('   ✅ Pick clear verification passed');
      } else {
        console.log('   ❌ Pick clear verification failed');
        console.log('   Expected:', expectedHistoryAfterClear);
        console.log('   Actual:', clearedField.pickHistory);
        return false;
      }
    } else {
      console.log('   ❌ Pick clear failed');
      return false;
    }

    // Test 5: Data consistency check
    console.log('\n5️⃣ TESTING DATA CONSISTENCY:');

    // Check both old and new systems have consistent data
    const oldSystemDoc = await survivorPicksDocRef.get();
    const newSystemDoc = await db.doc(poolMembersPath).get();

    const oldSystemPicks = oldSystemDoc.exists ? oldSystemDoc.data().picks : {};
    const newSystemField = newSystemDoc.data()[testUserId].survivor;

    console.log('   📊 Old system picks:', JSON.stringify(oldSystemPicks, null, 6));
    console.log('   📊 New system field:', JSON.stringify(newSystemField, null, 6));

    // Verify consistency
    const week1PickInOld = oldSystemPicks['1'] && oldSystemPicks['1'].team;
    const pickHistoryInNew = newSystemField.pickHistory;

    if (week1PickInOld && pickHistoryInNew.includes(week1PickInOld)) {
      console.log('   ✅ Data consistency check passed');
    } else {
      console.log('   ❌ Data consistency check failed');
      return false;
    }

    // Test 6: Clean up test data
    console.log('\n6️⃣ CLEANING UP TEST DATA:');

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

    // Clear old system picks
    await survivorPicksDocRef.delete();

    console.log('   ✅ Test data cleaned up successfully');

    // Final verification
    console.log('\n' + '='.repeat(60));
    console.log('🎯 SURVIVOR FIELD INTEGRATION TEST RESULTS:');
    console.log('='.repeat(60));

    const testResults = [
      '✅ Survivor field initialization',
      '✅ Pick save integration',
      '✅ Pick history management',
      '✅ Pick clear integration',
      '✅ Data consistency',
      '✅ Cleanup completed'
    ];

    testResults.forEach(result => console.log(result));

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
    console.log('🚀 Survivor field integration is ready for production use');
    console.log('🔗 Existing pick system will seamlessly update new survivor fields');

    return true;

  } catch (error) {
    console.error('❌ INTEGRATION TEST ERROR:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testSurvivorFieldIntegration().then((success) => {
    if (success) {
      console.log('\n🎯 Integration test completed successfully');
      process.exit(0);
    } else {
      console.log('\n💥 Integration test failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Integration test failed:', error);
    process.exit(1);
  });
}