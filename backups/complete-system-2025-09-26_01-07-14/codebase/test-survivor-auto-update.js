#!/usr/bin/env node

/**
 * 🎯 PHASE 2 TEST: SURVIVOR AUTO-UPDATE LOGIC
 * Test the integration between ESPN game monitoring and survivor elimination logic
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Import survivor auto-update functions
const {
  processSurvivorUpdatesForCompletedGames,
  processCompletedGamesForSurvivor
} = require('./functions/survivorAutoUpdate.js');

async function testSurvivorAutoUpdate() {
  console.log('🧪 TESTING SURVIVOR AUTO-UPDATE LOGIC\n');
  console.log('Verifying integration between ESPN game completion and survivor elimination...\n');

  const testUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Ållfåther
  const poolId = 'nerduniverse-2025';
  const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
  const testWeek = 1;

  try {
    // Test 1: Set up test user with known pick
    console.log('1️⃣ SETTING UP TEST USER WITH SURVIVOR PICK:');

    const testPick = 'Denver Broncos';

    // Initialize clean survivor field
    const cleanField = {
      alive: 18,
      pickHistory: testPick,
      lastUpdated: new Date().toISOString(),
      totalPicks: 1,
      manualOverride: false
    };

    await db.doc(poolMembersPath).update({
      [`${testUserId}.survivor`]: cleanField
    });

    console.log(`   ✅ Test user set up with pick: ${testPick}`);
    console.log(`   📊 Initial field:`, JSON.stringify(cleanField, null, 6));

    // Test 2: Simulate completed game - WINNING scenario
    console.log('\n2️⃣ TESTING WINNING SCENARIO:');

    const winningGame = {
      gameId: 'test-game-1',
      homeTeam: 'Denver Broncos',
      awayTeam: 'Las Vegas Raiders',
      homeScore: 24,
      awayScore: 17,
      winner: 'Denver Broncos',
      status: 'Final'
    };

    console.log(`   🏈 Simulating completed game: ${winningGame.awayTeam} @ ${winningGame.homeTeam}`);
    console.log(`   📊 Final Score: ${winningGame.awayScore}-${winningGame.homeScore}, Winner: ${winningGame.winner}`);

    const winResults = await processSurvivorUpdatesForCompletedGames([winningGame], testWeek);

    console.log(`   ✅ Processing completed`);
    console.log(`   📊 Results:`, JSON.stringify(winResults, null, 6));

    // Verify the user survived
    let verifyDoc = await db.doc(poolMembersPath).get();
    let userData = verifyDoc.data()[testUserId];

    if (userData.survivor.alive === 18) {
      console.log(`   ✅ User correctly survived (alive = ${userData.survivor.alive})`);
    } else {
      console.log(`   ❌ User incorrectly eliminated (alive = ${userData.survivor.alive})`);
      return false;
    }

    // Test 3: Reset and test LOSING scenario
    console.log('\n3️⃣ TESTING LOSING SCENARIO:');

    // Reset the user for losing test
    await db.doc(poolMembersPath).update({
      [`${testUserId}.survivor`]: cleanField
    });

    const losingGame = {
      gameId: 'test-game-2',
      homeTeam: 'Las Vegas Raiders',
      awayTeam: 'Denver Broncos',
      homeScore: 21,
      awayScore: 14,
      winner: 'Las Vegas Raiders',
      status: 'Final'
    };

    console.log(`   🏈 Simulating completed game: ${losingGame.awayTeam} @ ${losingGame.homeTeam}`);
    console.log(`   📊 Final Score: ${losingGame.awayScore}-${losingGame.homeScore}, Winner: ${losingGame.winner}`);

    const loseResults = await processSurvivorUpdatesForCompletedGames([losingGame], testWeek);

    console.log(`   ✅ Processing completed`);
    console.log(`   📊 Results:`, JSON.stringify(loseResults, null, 6));

    // Verify the user was eliminated
    verifyDoc = await db.doc(poolMembersPath).get();
    userData = verifyDoc.data()[testUserId];

    if (userData.survivor.alive === testWeek) {
      console.log(`   ✅ User correctly eliminated (alive = ${userData.survivor.alive})`);
    } else {
      console.log(`   ❌ User elimination failed (alive = ${userData.survivor.alive})`);
      return false;
    }

    // Test 4: Test ESPN integration format (processCompletedGamesForSurvivor)
    console.log('\n4️⃣ TESTING ESPN INTEGRATION FORMAT:');

    // Reset the user for ESPN format test
    await db.doc(poolMembersPath).update({
      [`${testUserId}.survivor`]: cleanField
    });

    // Mock gameUpdates format (what comes from ESPN monitoring)
    const gameUpdates = {
      'test-game-3': {
        gameId: 'test-game-3',
        homeTeam: 'Denver Broncos',
        awayTeam: 'Kansas City Chiefs',
        homeScore: 28,
        awayScore: 21,
        winner: 'Denver Broncos',
        status: 'Final'
      }
    };

    console.log(`   🔗 Testing ESPN integration format with gameUpdates object`);
    const espnResults = await processCompletedGamesForSurvivor(gameUpdates, testWeek);

    console.log(`   ✅ ESPN format processing completed`);
    console.log(`   📊 Results:`, JSON.stringify(espnResults, null, 6));

    // Verify the user survived (picked Denver Broncos, Denver won)
    verifyDoc = await db.doc(poolMembersPath).get();
    userData = verifyDoc.data()[testUserId];

    if (userData.survivor.alive === 18) {
      console.log(`   ✅ ESPN format test passed (alive = ${userData.survivor.alive})`);
    } else {
      console.log(`   ❌ ESPN format test failed (alive = ${userData.survivor.alive})`);
      return false;
    }

    // Test 5: Test multiple games scenario
    console.log('\n5️⃣ TESTING MULTIPLE GAMES SCENARIO:');

    // Set up multiple test users with different picks
    const user2Id = 'tAzAJaE5eGW4k9qdDXNBKvr92q03'; // Tony (me)

    // Set user2 pick
    const user2Pick = 'Kansas City Chiefs';
    const user2Field = {
      alive: 18,
      pickHistory: user2Pick,
      lastUpdated: new Date().toISOString(),
      totalPicks: 1,
      manualOverride: false
    };

    await db.doc(poolMembersPath).update({
      [`${user2Id}.survivor`]: user2Field
    });

    console.log(`   📝 Set up User 1 (${testUserId}): ${testPick}`);
    console.log(`   📝 Set up User 2 (${user2Id}): ${user2Pick}`);

    // Multiple completed games
    const multipleGames = [
      {
        gameId: 'test-game-4',
        homeTeam: 'Denver Broncos',
        awayTeam: 'Arizona Cardinals',
        homeScore: 31,
        awayScore: 14,
        winner: 'Denver Broncos',
        status: 'Final'
      },
      {
        gameId: 'test-game-5',
        homeTeam: 'Buffalo Bills',
        awayTeam: 'Kansas City Chiefs',
        homeScore: 17,
        awayScore: 24,
        winner: 'Kansas City Chiefs',
        status: 'Final'
      }
    ];

    console.log(`   🏈 Processing ${multipleGames.length} completed games simultaneously`);
    const multiResults = await processSurvivorUpdatesForCompletedGames(multipleGames, testWeek);

    console.log(`   ✅ Multiple games processing completed`);
    console.log(`   📊 Results:`, JSON.stringify(multiResults, null, 6));

    // Verify both users survived (both picked winning teams)
    verifyDoc = await db.doc(poolMembersPath).get();
    const allData = verifyDoc.data();
    const user1Final = allData[testUserId];
    const user2Final = allData[user2Id];

    if (user1Final.survivor.alive === 18 && user2Final.survivor.alive === 18) {
      console.log(`   ✅ Multiple users test passed - both survived`);
      console.log(`   📊 User 1 final: alive=${user1Final.survivor.alive}`);
      console.log(`   📊 User 2 final: alive=${user2Final.survivor.alive}`);
    } else {
      console.log(`   ❌ Multiple users test failed`);
      console.log(`   📊 User 1 final: alive=${user1Final.survivor.alive}`);
      console.log(`   📊 User 2 final: alive=${user2Final.survivor.alive}`);
      return false;
    }

    // Test 6: Clean up test data
    console.log('\n6️⃣ CLEANING UP TEST DATA:');

    const resetField = {
      alive: 18,
      pickHistory: "",
      lastUpdated: new Date().toISOString(),
      totalPicks: 0,
      manualOverride: false
    };

    await db.doc(poolMembersPath).update({
      [`${testUserId}.survivor`]: resetField,
      [`${user2Id}.survivor`]: resetField
    });

    console.log('   ✅ Test data cleaned up successfully');

    // Final verification
    console.log('\n' + '='.repeat(60));
    console.log('🎯 SURVIVOR AUTO-UPDATE TEST RESULTS:');
    console.log('='.repeat(60));

    const testResults = [
      '✅ Test user setup and initial state',
      '✅ Winning scenario - user survives',
      '✅ Losing scenario - user eliminated',
      '✅ ESPN integration format compatibility',
      '✅ Multiple games processing',
      '✅ Cleanup completed'
    ];

    testResults.forEach(result => console.log(result));

    console.log('\n🎉 ALL SURVIVOR AUTO-UPDATE TESTS PASSED!');
    console.log('🚀 Phase 2 auto-update logic is fully functional');
    console.log('🔗 ESPN game completion will automatically trigger survivor updates');

    return true;

  } catch (error) {
    console.error('❌ AUTO-UPDATE TEST ERROR:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testSurvivorAutoUpdate().then((success) => {
    if (success) {
      console.log('\n🎯 Auto-update test completed successfully');
      process.exit(0);
    } else {
      console.log('\n💥 Auto-update test failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Auto-update test failed:', error);
    process.exit(1);
  });
}