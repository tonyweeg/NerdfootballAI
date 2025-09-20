const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function restoreChuckWeek2Ravens() {
  console.log('🔧 RESTORING CHUCK UPSHUR WEEK 2 BALTIMORE RAVENS PICK\n');

  const poolId = 'nerduniverse-2025';
  const chuckUID = 'GaCfzAGnuVUXlcyaAAGVCF8bUro2';

  try {
    // 1. Get current Chuck data
    console.log('📡 Loading Chuck Upshur current data...');
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const chuckData = poolData[chuckUID];

    if (!chuckData) {
      throw new Error('Chuck Upshur not found in pool members');
    }

    console.log('✅ Found Chuck Upshur in Firebase:');
    console.log(`   Display Name: ${chuckData.displayName}`);
    console.log(`   Email: ${chuckData.email}`);
    console.log(`   Current Pick History: "${chuckData.survivor?.pickHistory || 'None'}"`);
    console.log(`   Current Total Picks: ${chuckData.survivor?.pickHistory?.split(', ').filter(p => p && p.trim()).length || 0}`);
    console.log(`   Current Alive Status: ${chuckData.survivor?.alive !== false && !chuckData.survivor?.eliminationWeek}`);

    // 2. Validate current state
    const currentPickHistory = chuckData.survivor?.pickHistory || '';
    const currentPicks = currentPickHistory.split(', ').filter(pick => pick && pick.trim());

    console.log('\n🔍 VALIDATION:');
    console.log(`   Expected Week 1: "Tampa Bay Buccaneers"`);
    console.log(`   Actual Week 1: "${currentPicks[0] || 'NONE'}"`);
    console.log(`   Expected Week 2: "Baltimore Ravens" (MISSING)`);
    console.log(`   Actual Week 2: "${currentPicks[1] || 'MISSING'}"`);

    // Verify Week 1 is Tampa Bay Buccaneers
    if (!currentPicks[0] || !currentPicks[0].toLowerCase().includes('tampa bay')) {
      throw new Error(`Week 1 pick validation failed. Expected Tampa Bay Buccaneers, got: ${currentPicks[0]}`);
    }

    // Verify Week 2 is missing
    if (currentPicks.length >= 2) {
      console.log('⚠️ WARNING: Chuck already has Week 2 pick. Current picks:');
      currentPicks.forEach((pick, index) => {
        console.log(`   Week ${index + 1}: ${pick}`);
      });
      console.log('\n❓ Proceeding anyway to update Week 2 to Baltimore Ravens...');
    }

    // 3. Create new pick history with Baltimore Ravens
    const newPickHistory = currentPicks.length >= 2
      ? `${currentPicks[0]}, Baltimore Ravens` // Replace existing Week 2
      : `${currentPicks[0]}, Baltimore Ravens`; // Add new Week 2

    console.log('\n🔧 RESTORATION PLAN:');
    console.log(`   OLD Pick History: "${currentPickHistory}"`);
    console.log(`   NEW Pick History: "${newPickHistory}"`);
    console.log(`   Action: ${currentPicks.length >= 2 ? 'REPLACE Week 2' : 'ADD Week 2'} with Baltimore Ravens`);

    // 4. Update Firebase
    console.log('\n💾 Updating Firebase...');

    const updatedChuckData = {
      ...chuckData,
      survivor: {
        ...chuckData.survivor,
        pickHistory: newPickHistory,
        alive: true, // Ensure Chuck remains active
        eliminationWeek: null // Clear any elimination
      }
    };

    const updatedPoolData = {
      ...poolData,
      [chuckUID]: updatedChuckData
    };

    await db.doc(poolMembersPath).set(updatedPoolData);

    console.log('✅ FIREBASE UPDATE COMPLETE');

    // 5. Verify the update
    console.log('\n🔍 VERIFICATION - Reading updated data...');
    const verifyDoc = await db.doc(poolMembersPath).get();
    const verifyData = verifyDoc.data();
    const verifyChuck = verifyData[chuckUID];

    const verifyPickHistory = verifyChuck.survivor?.pickHistory || '';
    const verifyPicks = verifyPickHistory.split(', ').filter(pick => pick && pick.trim());

    console.log('📊 VERIFICATION RESULTS:');
    console.log(`   Updated Pick History: "${verifyPickHistory}"`);
    console.log(`   Total Picks: ${verifyPicks.length}`);
    console.log(`   Week 1: ${verifyPicks[0] || 'MISSING'}`);
    console.log(`   Week 2: ${verifyPicks[1] || 'MISSING'}`);
    console.log(`   Alive Status: ${verifyChuck.survivor?.alive !== false && !verifyChuck.survivor?.eliminationWeek}`);

    // Validate restoration
    const week2Success = verifyPicks[1] && verifyPicks[1].toLowerCase().includes('baltimore ravens');
    console.log(`\n${week2Success ? '✅ SUCCESS' : '❌ FAILED'}: Week 2 Baltimore Ravens restoration`);

    if (week2Success) {
      console.log('\n🎉 CHUCK UPSHUR WEEK 2 RAVENS PICK SUCCESSFULLY RESTORED!');
      console.log('   Chuck now has both Week 1 Tampa Bay and Week 2 Baltimore Ravens');
      console.log('   Battlefield display will show proper helmets on next refresh');
    } else {
      throw new Error('Verification failed - Week 2 Baltimore Ravens not found after update');
    }

  } catch (error) {
    console.error('❌ Error restoring Chuck Week 2 pick:', error);
    throw error;
  }
}

restoreChuckWeek2Ravens().then(() => {
  console.log('\n✅ Chuck Upshur Week 2 Ravens restoration complete');
  process.exit(0);
}).catch(error => {
  console.error('Restoration failed:', error);
  process.exit(1);
});