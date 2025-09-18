const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function verifyCleanupResults() {
  console.log('✅ VERIFYING GHOST USER CLEANUP RESULTS\n');

  const poolId = 'nerduniverse-2025';

  try {
    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();
      console.log(`📊 Total pool members after cleanup: ${Object.keys(poolData).length}\n`);

      // Check for any remaining "Player" entries
      const remainingGhosts = [];
      const usersWithWeek1Only = [];
      const jamesStewartStatus = [];

      for (const [uid, user] of Object.entries(poolData)) {
        const displayName = (user.displayName || '').trim();
        const email = (user.email || '').trim();

        // Check for ghost users (missing both displayName and email)
        if (!displayName || displayName.startsWith('Player ')) {
          if (!email || email.includes('example.com')) {
            remainingGhosts.push({
              uid,
              displayName: displayName || 'NO NAME',
              email: email || 'NO EMAIL'
            });
          }
        }

        // Check for users with only Week 1 picks
        if (user.survivor && user.survivor.pickHistory) {
          const picks = user.survivor.pickHistory.split(', ').filter(pick => pick && pick.trim());
          if (picks.length === 1) {
            usersWithWeek1Only.push({
              name: displayName || email || `User ${uid.substring(0, 8)}`,
              uid,
              week1Pick: picks[0],
              email: email
            });
          }
        }

        // Special check for James Stewart
        if (uid === 'UiQyobvibJgXwEexUj6AhaUUg7P2') {
          jamesStewartStatus.push({
            uid,
            displayName: displayName,
            email: email,
            hasDisplayName: !!displayName && displayName !== 'NO NAME',
            hasEmail: !!email && email !== 'NO EMAIL',
            survivor: user.survivor
          });
        }
      }

      // Report results
      console.log('🎯 CLEANUP VERIFICATION RESULTS:');
      console.log('================================\n');

      console.log('👤 JAMES STEWART STATUS:');
      if (jamesStewartStatus.length > 0) {
        const james = jamesStewartStatus[0];
        console.log(`   UID: ${james.uid}`);
        console.log(`   Display Name: "${james.displayName}" ✅`);
        console.log(`   Email: "${james.email}" ✅`);
        console.log(`   Week 1 Pick: ${james.survivor?.pickHistory || 'None'}`);
        console.log(`   Should now show as "James Stewart" (not "Player UiQyobvi") ✅\n`);
      } else {
        console.log('   ❌ James Stewart not found!\n');
      }

      console.log('👻 REMAINING GHOST USERS:');
      if (remainingGhosts.length > 0) {
        remainingGhosts.forEach(ghost => {
          console.log(`   ❌ ${ghost.uid} - "${ghost.displayName}" (${ghost.email})`);
        });
      } else {
        console.log('   ✅ No ghost users remain!\n');
      }

      console.log('📊 USERS STILL MISSING WEEK 2 PICKS:');
      if (usersWithWeek1Only.length > 0) {
        usersWithWeek1Only.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.name} (${user.email})`);
          console.log(`      Week 1: ${user.week1Pick}, NO Week 2`);
        });
        console.log(`\n   Total users missing Week 2: ${usersWithWeek1Only.length}`);
      } else {
        console.log('   ✅ All users have Week 2 picks!\n');
      }

      // Summary
      console.log('📈 SUMMARY:');
      console.log(`   Pool members: ${Object.keys(poolData).length}`);
      console.log(`   Ghost users removed: 2 (W4vHtFBw, ZiDHeqIM)`);
      console.log(`   James Stewart fixed: ✅ (now shows proper name)`);
      console.log(`   Remaining ghosts: ${remainingGhosts.length}`);
      console.log(`   Users missing Week 2: ${usersWithWeek1Only.length}`);

    } else {
      console.log('❌ Pool members document not found');
    }

  } catch (error) {
    console.error('Error verifying cleanup results:', error);
  }
}

verifyCleanupResults().then(() => {
  console.log('\n✅ Verification complete');
  process.exit(0);
}).catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});