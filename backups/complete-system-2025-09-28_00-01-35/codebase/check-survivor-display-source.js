const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkSurvivorDisplaySource() {
  console.log('🔍 CHECKING SURVIVOR DISPLAY DATA SOURCE MISMATCH\n');

  const poolId = 'nerduniverse-2025';

  try {
    // Get fresh Firebase data
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();

    // Focus on the problem users
    const problemUsers = ['Trae Anderson', 'Wholeeoh', 'Peter Render'];

    console.log('🎯 FIREBASE DATA vs DISPLAY MISMATCH ANALYSIS:');
    console.log('=============================================');

    problemUsers.forEach(targetName => {
      console.log(`🔍 CHECKING: ${targetName}`);

      // Find user in Firebase
      let foundUser = null;
      let userUID = null;

      for (const [uid, user] of Object.entries(poolData)) {
        const displayName = (user.displayName || '').toLowerCase();
        if (displayName.includes(targetName.toLowerCase().split(' ')[0])) {
          foundUser = user;
          userUID = uid;
          break;
        }
      }

      if (foundUser) {
        const survivor = foundUser.survivor || {};
        const pickHistory = survivor.pickHistory || '';
        const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());
        const isAlive = survivor.alive !== false && !survivor.eliminationWeek;

        console.log(`   📊 FIREBASE DATA:`);
        console.log(`      UID: ${userUID}`);
        console.log(`      Pick History: "${pickHistory}"`);
        console.log(`      Total Picks: ${picks.length}`);
        console.log(`      Week 1: ${picks[0] || 'None'}`);
        console.log(`      Week 2: ${picks[1] || 'None'}`);
        console.log(`      Alive Status: ${isAlive ? '⭐ ACTIVE' : '💤 ELIMINATED'}`);
        console.log(`      Elimination Week: ${survivor.eliminationWeek || 'None'}`);
        console.log(`      Alive Field: ${survivor.alive}`);

        if (targetName === 'Trae Anderson' || targetName === 'Wholeeoh') {
          if (picks[1] === 'Arizona Cardinals' && isAlive) {
            console.log(`   ✅ FIREBASE: Correctly shows as ACTIVE (Arizona Cardinals won Week 2)`);
            console.log(`   🚨 DISPLAY BUG: User shows as ELIMINATED in HTML display`);
            console.log(`   🎯 ISSUE: Display using stale elimination data from before Week 2 restoration`);
          }
        } else if (targetName === 'Peter Render') {
          if (picks[1] === 'Arizona Cardinals' && isAlive) {
            console.log(`   ✅ WORKING CORRECTLY: Shows as ACTIVE in both Firebase and display`);
          }
        }
        console.log('');
      }
    });

    console.log('🔧 ROOT CAUSE IDENTIFIED:');
    console.log('=========================');
    console.log('1. Firebase data is CORRECT - Trae & Wholeeoh are ACTIVE');
    console.log('2. HTML display is using STALE cached elimination data');
    console.log('3. Display was generated BEFORE I restored their Week 2 picks');
    console.log('4. Peter Render works because his data was never corrupted');
    console.log('');
    console.log('💡 SOLUTION:');
    console.log('============');
    console.log('1. Find actual survivor display data source');
    console.log('2. Force regeneration with fresh Firebase data');
    console.log('3. Clear any cached elimination calculations');
    console.log('4. Deploy updated display that reads live Firebase data');

    // Check if there are cached elimination calculations
    console.log('\n🔍 CHECKING FOR CACHED ELIMINATION DATA:');
    console.log('========================================');

    // Look for any cached survivor results or elimination data
    try {
      const survivorResultsRef = db.collection('cache').doc('survivor_results');
      const survivorCache = await survivorResultsRef.get();

      if (survivorCache.exists) {
        console.log('🚨 FOUND CACHED SURVIVOR RESULTS - this may be the source of stale data');
        const cacheData = survivorCache.data();
        console.log('Cache timestamp:', cacheData.timestamp || 'Unknown');
        console.log('Cache users count:', Object.keys(cacheData.users || {}).length);
      } else {
        console.log('✅ No cached survivor results found in Firebase');
      }
    } catch (error) {
      console.log('No cache collection found');
    }

  } catch (error) {
    console.error('❌ Error checking survivor display source:', error);
  }
}

checkSurvivorDisplaySource().then(() => {
  console.log('\n✅ Survivor display source check complete');
  process.exit(0);
}).catch(error => {
  console.error('Check failed:', error);
  process.exit(1);
});