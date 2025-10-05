const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function restoreFrankHannaWeek2() {
  console.log('🔧 RESTORING FRANK HANNA WEEK 2 DALLAS COWBOYS PICK\n');

  const poolId = 'nerduniverse-2025';
  const frankUID = 'VgSENtkpw0aXjKBB4wBuPdnJyag2'; // From previous check

  try {
    // 1. Get current Frank data
    console.log('📡 Loading Frank Hanna current data...');
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const frankData = poolData[frankUID];

    if (!frankData) {
      throw new Error('Frank Hanna not found in pool members');
    }

    console.log('✅ Found Frank Hanna in Firebase:');
    console.log(`   Display Name: ${frankData.displayName}`);
    console.log(`   Email: ${frankData.email}`);
    console.log(`   Current Pick History: "${frankData.survivor?.pickHistory || 'None'}"`);
    console.log(`   Current Total Picks: ${frankData.survivor?.pickHistory?.split(', ').filter(p => p && p.trim()).length || 0}`);

    // 2. Validate current state
    const currentPickHistory = frankData.survivor?.pickHistory || '';
    const currentPicks = currentPickHistory.split(', ').filter(pick => pick && pick.trim());

    console.log('\n🔍 VALIDATION:');
    console.log(`   Expected Week 1: "Cincinnati Bengals"`);
    console.log(`   Actual Week 1: "${currentPicks[0] || 'NONE'}"`);
    console.log(`   Expected Week 2: "Dallas Cowboys" (MISSING)`);
    console.log(`   Actual Week 2: "${currentPicks[1] || 'MISSING'}"`);

    // Verify Week 1 is Cincinnati Bengals
    if (!currentPicks[0] || !currentPicks[0].toLowerCase().includes('cincinnati')) {
      throw new Error(`Week 1 pick validation failed. Expected Cincinnati Bengals, got: ${currentPicks[0]}`);
    }

    // 3. Create new pick history with Dallas Cowboys
    const newPickHistory = `${currentPicks[0]}, Dallas Cowboys`;

    console.log('\n🔧 RESTORATION PLAN:');
    console.log(`   OLD Pick History: "${currentPickHistory}"`);
    console.log(`   NEW Pick History: "${newPickHistory}"`);
    console.log(`   Action: ADD Week 2 Dallas Cowboys`);

    // 4. Update Firebase
    console.log('\n💾 Updating Firebase...');

    const updatedFrankData = {
      ...frankData,
      survivor: {
        ...frankData.survivor,
        pickHistory: newPickHistory,
        alive: true, // Ensure Frank remains active
        eliminationWeek: null // Clear any elimination
      }
    };

    const updatedPoolData = {
      ...poolData,
      [frankUID]: updatedFrankData
    };

    await db.doc(poolMembersPath).set(updatedPoolData);

    console.log('✅ FIREBASE UPDATE COMPLETE');

    // 5. Verify the update
    console.log('\n🔍 VERIFICATION - Reading updated data...');
    const verifyDoc = await db.doc(poolMembersPath).get();
    const verifyData = verifyDoc.data();
    const verifyFrank = verifyData[frankUID];

    const verifyPickHistory = verifyFrank.survivor?.pickHistory || '';
    const verifyPicks = verifyPickHistory.split(', ').filter(pick => pick && pick.trim());

    console.log('📊 VERIFICATION RESULTS:');
    console.log(`   Updated Pick History: "${verifyPickHistory}"`);
    console.log(`   Total Picks: ${verifyPicks.length}`);
    console.log(`   Week 1: ${verifyPicks[0] || 'MISSING'}`);
    console.log(`   Week 2: ${verifyPicks[1] || 'MISSING'}`);

    // Validate restoration
    const week2Success = verifyPicks[1] && verifyPicks[1].toLowerCase().includes('dallas cowboys');
    console.log(`\n${week2Success ? '✅ SUCCESS' : '❌ FAILED'}: Week 2 Dallas Cowboys restoration`);

    if (week2Success) {
      console.log('\n🎉 FRANK HANNA WEEK 2 COWBOYS PICK SUCCESSFULLY RESTORED!');
      console.log('   Frank now has both Week 1 Cincinnati Bengals and Week 2 Dallas Cowboys');
    } else {
      throw new Error('Verification failed - Week 2 Dallas Cowboys not found after update');
    }

  } catch (error) {
    console.error('❌ Error restoring Frank Week 2 pick:', error);
    throw error;
  }
}

restoreFrankHannaWeek2().then(() => {
  console.log('\n✅ Frank Hanna Week 2 Cowboys restoration complete');
  process.exit(0);
}).catch(error => {
  console.error('Restoration failed:', error);
  process.exit(1);
});