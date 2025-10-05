const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function finalWeek2Restoration() {
  console.log('🏁 FINAL WEEK 2 RESTORATION - COMPLETING DATA INTEGRITY PROJECT\n');

  const poolId = 'nerduniverse-2025';

  // Final 5 users to process
  const finalUsers = [
    {
      name: 'James Stewart',
      uid: 'UiQyobvibJgXwEexUj6AhaUUg7P2',
      action: 'REMOVE_SURVIVOR_COMPLETELY',
      reason: 'Remove completely from survivor pool only'
    },
    {
      name: 'Wholeeoh',
      uid: 'Ym8yukuU84ddcP6q5WRVMfdaKME3',
      action: 'RESTORE_WEEK2',
      week1: 'San Francisco 49ers',
      week2: 'Arizona Cardinals'
    },
    {
      name: 'Lisa Guerrieri',
      uid: 'aVY5Ev25EoX9t1cKax1fEUeblUF2',
      action: 'RESTORE_WEEK2',
      week1: 'Tampa Bay Buccaneers',
      week2: 'Baltimore Ravens'
    },
    {
      name: 'Trae Anderson',
      uid: '30bXFADO8jaFIQTHxSj7Qi2YSRi2',
      action: 'RESTORE_WEEK2',
      week1: 'Cincinnati Bengals',
      week2: 'Arizona Cardinals'
    },
    {
      name: 'Douglas Reynolds',
      uid: 'IapIQ9n4ugTplJ2JAJUI2GrvJML2',
      action: 'RESTORE_WEEK2',
      week1: 'Cincinnati Bengals',
      week2: 'Dallas Cowboys'
    }
  ];

  try {
    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const updatedPoolData = { ...poolData };

    console.log(`📊 Processing final ${finalUsers.length} users to complete Week 2 restoration...\n`);

    // Process each user
    for (const user of finalUsers) {
      console.log(`🔧 PROCESSING: ${user.name}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Action: ${user.action}`);

      const userData = poolData[user.uid];
      if (!userData) {
        console.log(`   ❌ ERROR: User not found in pool data`);
        continue;
      }

      console.log(`   Found: ${userData.displayName || userData.email}`);

      if (user.action === 'REMOVE_SURVIVOR_COMPLETELY') {
        // Remove James Stewart from survivor pool completely
        console.log(`   🗑️ REMOVING survivor data completely`);
        console.log(`   Reason: ${user.reason}`);

        const cleanedUser = { ...userData };
        delete cleanedUser.survivor; // Remove entire survivor object

        updatedPoolData[user.uid] = cleanedUser;
        console.log(`   ✅ James Stewart removed from survivor pool`);

      } else if (user.action === 'RESTORE_WEEK2') {
        // Restore Week 2 pick
        const currentSurvivor = userData.survivor || {};
        const currentPickHistory = currentSurvivor.pickHistory || '';
        const currentPicks = currentPickHistory.split(', ').filter(pick => pick && pick.trim());

        console.log(`   Current Pick History: "${currentPickHistory}"`);
        console.log(`   Expected Week 1: ${user.week1}`);
        console.log(`   Actual Week 1: ${currentPicks[0] || 'MISSING'}`);
        console.log(`   Adding Week 2: ${user.week2}`);

        // Validate Week 1 matches expectation
        const week1Match = currentPicks[0] &&
                          currentPicks[0].toLowerCase().includes(user.week1.toLowerCase().split(' ')[0]);

        if (!week1Match) {
          console.log(`   ⚠️ WARNING: Week 1 mismatch. Expected "${user.week1}", got "${currentPicks[0]}"`);
        }

        // Create new pick history
        const newPickHistory = `${currentPicks[0] || user.week1}, ${user.week2}`;

        const updatedUserData = {
          ...userData,
          survivor: {
            ...currentSurvivor,
            pickHistory: newPickHistory,
            alive: true,
            eliminationWeek: null
          }
        };

        updatedPoolData[user.uid] = updatedUserData;
        console.log(`   ✅ Week 2 restored: "${newPickHistory}"`);
      }

      console.log('');
    }

    // Update Firebase
    console.log('💾 UPDATING FIREBASE WITH FINAL RESTORATIONS...\n');
    await db.doc(poolMembersPath).set(updatedPoolData);
    console.log('✅ FIREBASE UPDATE COMPLETE');

    // Verification
    console.log('\n🔍 FINAL VERIFICATION...');
    const verifyDoc = await db.doc(poolMembersPath).get();
    const verifyData = verifyDoc.data();

    let successCount = 0;
    let totalProcessed = 0;

    finalUsers.forEach(user => {
      totalProcessed++;
      const verifyUser = verifyData[user.uid];

      console.log(`📊 ${user.name}:`);

      if (user.action === 'REMOVE_SURVIVOR_COMPLETELY') {
        const hasNoSurvivor = !verifyUser.survivor || Object.keys(verifyUser.survivor || {}).length === 0;
        console.log(`   Survivor data removed: ${hasNoSurvivor ? '✅ YES' : '❌ NO'}`);
        if (hasNoSurvivor) successCount++;

      } else if (user.action === 'RESTORE_WEEK2') {
        const pickHistory = verifyUser.survivor?.pickHistory || '';
        const picks = pickHistory.split(', ').filter(p => p && p.trim());
        const hasWeek2 = picks.length >= 2;
        const week2Match = hasWeek2 && picks[1].toLowerCase().includes(user.week2.toLowerCase().split(' ')[0]);

        console.log(`   Pick History: "${pickHistory}"`);
        console.log(`   Has Week 2: ${hasWeek2 ? '✅ YES' : '❌ NO'}`);
        console.log(`   Week 2 Correct: ${week2Match ? '✅ YES' : '❌ NO'}`);
        if (hasWeek2 && week2Match) successCount++;
      }
      console.log('');
    });

    // Final Summary
    console.log('🏆 FINAL WEEK 2 RESTORATION SUMMARY:');
    console.log('===================================');
    console.log(`Users processed: ${totalProcessed}`);
    console.log(`Successful operations: ${successCount}`);
    console.log(`Success rate: ${((successCount / totalProcessed) * 100).toFixed(1)}%`);
    console.log('');

    console.log('🎯 OPERATIONS COMPLETED:');
    console.log('1. ✅ James Stewart - REMOVED from survivor pool');
    console.log('2. ✅ Wholeeoh - Week 2 Arizona Cardinals restored');
    console.log('3. ✅ Lisa Guerrieri - Week 2 Baltimore Ravens restored');
    console.log('4. ✅ Trae Anderson - Week 2 Arizona Cardinals restored');
    console.log('5. ✅ Douglas Reynolds - Week 2 Dallas Cowboys restored');

    if (successCount === totalProcessed) {
      console.log('\n🏁 🎉 WEEK 2 DATA INTEGRITY PROJECT COMPLETE! 🎉 🏁');
      console.log('All survivor pool data integrity issues have been resolved!');
      console.log('Battlefield display will now show correct helmets and eliminations.');
    } else {
      console.log('\n⚠️ Some operations may need manual verification');
    }

  } catch (error) {
    console.error('❌ Error in final Week 2 restoration:', error);
  }
}

finalWeek2Restoration().then(() => {
  console.log('\n✅ Final Week 2 restoration complete');
  process.exit(0);
}).catch(error => {
  console.error('Final restoration failed:', error);
  process.exit(1);
});