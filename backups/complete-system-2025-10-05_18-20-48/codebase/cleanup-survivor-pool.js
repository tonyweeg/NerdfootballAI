const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function cleanupSurvivorPool() {
  console.log('🧹 CLEANING UP SURVIVOR POOL - REMOVING USERS WHO SHOULD NOT BE THERE\n');

  const poolId = 'nerduniverse-2025';

  // Users to remove from survivor pool
  const usersToCleanup = [
    { name: 'Lou Lombardo', action: 'REMOVE_SURVIVOR_ONLY', reason: 'Never was in survivor pool' },
    { name: 'Matt MacMillan', action: 'REMOVE_SURVIVOR_COMPLETELY', reason: 'Should never have been in survivor pool' },
    { name: 'Andy Kaufman', action: 'REMOVE_SURVIVOR_ONLY', reason: 'Never was in survivor pool' }
  ];

  try {
    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    console.log(`📊 Analyzing ${Object.keys(poolData).length} pool members for cleanup...\n`);

    const foundUsers = [];
    const updatedPoolData = { ...poolData };

    // Find and analyze each user to cleanup
    for (const userToCleanup of usersToCleanup) {
      console.log(`🔍 SEARCHING FOR: ${userToCleanup.name}`);

      let foundUser = null;
      let userUID = null;

      // Search for user by name
      for (const [uid, user] of Object.entries(poolData)) {
        const displayName = (user.displayName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();

        if (displayName.includes(userToCleanup.name.toLowerCase().split(' ')[0]) ||
            email.includes(userToCleanup.name.toLowerCase().split(' ')[0])) {
          foundUser = user;
          userUID = uid;
          break;
        }
      }

      if (foundUser) {
        foundUsers.push({ userToCleanup, foundUser, userUID });

        console.log(`   ✅ FOUND: ${foundUser.displayName || foundUser.email}`);
        console.log(`   UID: ${userUID}`);
        console.log(`   Email: ${foundUser.email || 'No email'}`);
        console.log(`   Action: ${userToCleanup.action}`);
        console.log(`   Reason: ${userToCleanup.reason}`);

        // Check current survivor data
        const survivor = foundUser.survivor || {};
        const pickHistory = survivor.pickHistory || '';
        const hasPickHistory = pickHistory && pickHistory.trim().length > 0;

        console.log(`   Current Survivor Data:`);
        console.log(`     Pick History: "${pickHistory}"`);
        console.log(`     Alive: ${survivor.alive}`);
        console.log(`     Elimination Week: ${survivor.eliminationWeek || 'None'}`);
        console.log(`     Has Pick Data: ${hasPickHistory}`);

        // Perform cleanup based on action
        if (userToCleanup.action === 'REMOVE_SURVIVOR_ONLY') {
          // Remove survivor data but keep user in pool for other games
          console.log(`   🧹 REMOVING survivor data only (keeping user for confidence pool)`);

          const cleanedUser = { ...foundUser };
          delete cleanedUser.survivor; // Remove entire survivor object

          updatedPoolData[userUID] = cleanedUser;
          console.log(`   ✅ Survivor data removed, user remains in pool`);

        } else if (userToCleanup.action === 'REMOVE_SURVIVOR_COMPLETELY') {
          // Remove survivor data completely
          console.log(`   🧹 REMOVING survivor data completely`);

          const cleanedUser = { ...foundUser };
          delete cleanedUser.survivor; // Remove entire survivor object

          updatedPoolData[userUID] = cleanedUser;
          console.log(`   ✅ Survivor data completely removed`);
        }

        console.log('');
      } else {
        console.log(`   ❌ NOT FOUND: ${userToCleanup.name}`);
        console.log('');
      }
    }

    // Update Firebase if we found users to cleanup
    if (foundUsers.length > 0) {
      console.log('💾 UPDATING FIREBASE WITH CLEANED DATA...\n');

      await db.doc(poolMembersPath).set(updatedPoolData);

      console.log('✅ FIREBASE UPDATE COMPLETE');

      // Verify the cleanup
      console.log('\n🔍 VERIFICATION - Checking cleaned users...');
      const verifyDoc = await db.doc(poolMembersPath).get();
      const verifyData = verifyDoc.data();

      foundUsers.forEach(({ userToCleanup, userUID }) => {
        const verifyUser = verifyData[userUID];
        const verifySurvivor = verifyUser.survivor || {};
        const hasPickHistory = verifySurvivor.pickHistory && verifySurvivor.pickHistory.trim().length > 0;

        console.log(`📊 ${userToCleanup.name}:`);
        console.log(`   Still in pool: ${verifyUser ? 'YES' : 'NO'}`);
        console.log(`   Has survivor data: ${Object.keys(verifySurvivor).length > 0 ? 'YES' : 'NO'}`);
        console.log(`   Has pick history: ${hasPickHistory ? 'YES' : 'NO'}`);
        console.log(`   Status: ${hasPickHistory ? '❌ CLEANUP FAILED' : '✅ CLEANED SUCCESSFULLY'}`);
        console.log('');
      });

    } else {
      console.log('⚠️ No users found to cleanup');
    }

    // Summary
    console.log('📋 SURVIVOR POOL CLEANUP SUMMARY:');
    console.log('=================================');
    console.log(`Users targeted for cleanup: ${usersToCleanup.length}`);
    console.log(`Users found and cleaned: ${foundUsers.length}`);
    console.log('');

    console.log('🎯 CLEANUP ACTIONS PERFORMED:');
    foundUsers.forEach(({ userToCleanup, foundUser }, index) => {
      console.log(`${index + 1}. ${userToCleanup.name}: ${userToCleanup.action}`);
      console.log(`   Reason: ${userToCleanup.reason}`);
    });

    console.log('\n✅ Survivor pool cleanup ready');
    console.log('Next: Ready to restore Week 2 picks for the 6 legitimate users');

  } catch (error) {
    console.error('❌ Error cleaning up survivor pool:', error);
  }
}

cleanupSurvivorPool().then(() => {
  console.log('\n✅ Survivor pool cleanup complete');
  process.exit(0);
}).catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});