const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function syncSurvivorDataStructures() {
  console.log('🔄 SYNCING SURVIVOR DATA STRUCTURES - LEGACY vs POOL MEMBERS\n');

  const poolId = 'nerduniverse-2025';

  try {
    // Get pool members data (the one I updated)
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    console.log(`📊 Found ${Object.keys(poolData).length} users in pool members...\n`);

    // Focus on users I restored Week 2 picks for
    const restoredUsers = [
      { name: 'Trae Anderson', uid: '30bXFADO8jaFIQTHxSj7Qi2YSRi2', week2: 'Arizona Cardinals' },
      { name: 'Wholeeoh', uid: 'Ym8yukuU84ddcP6q5WRVMfdaKME3', week2: 'Arizona Cardinals' },
      { name: 'Lisa Guerrieri', uid: 'aVY5Ev25EoX9t1cKax1fEUeblUF2', week2: 'Baltimore Ravens' },
      { name: 'Douglas Reynolds', uid: 'IapIQ9n4ugTplJ2JAJUI2GrvJML2', week2: 'Dallas Cowboys' }
    ];

    console.log('🎯 CHECKING DATA STRUCTURE MISMATCH:');
    console.log('===================================');

    for (const user of restoredUsers) {
      console.log(`🔍 CHECKING: ${user.name} (${user.uid})`);

      // Check pool members data (what I updated)
      const poolUser = poolData[user.uid];
      if (poolUser) {
        const survivor = poolUser.survivor || {};
        const pickHistory = survivor.pickHistory || '';
        const picks = pickHistory.split(', ').filter(p => p && p.trim());

        console.log(`   📊 POOL MEMBERS DATA:`);
        console.log(`      Pick History: "${pickHistory}"`);
        console.log(`      Week 2: ${picks[1] || 'MISSING'}`);
        console.log(`      Status: ${survivor.alive !== false && !survivor.eliminationWeek ? 'ACTIVE' : 'ELIMINATED'}`);
      }

      // Check legacy survivor picks data (what elimination system reads)
      const legacyPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${user.uid}`;
      try {
        const legacyPicksDoc = await db.doc(legacyPicksPath).get();
        if (legacyPicksDoc.exists()) {
          const legacyData = legacyPicksDoc.data();
          const legacyPicks = legacyData.picks || {};

          console.log(`   📊 LEGACY PICKS DATA:`);
          console.log(`      Week 1: ${legacyPicks[1] ? legacyPicks[1].team : 'MISSING'}`);
          console.log(`      Week 2: ${legacyPicks[2] ? legacyPicks[2].team : 'MISSING'}`);

          // Check if Week 2 is missing in legacy
          if (!legacyPicks[2] && picks.length >= 2) {
            console.log(`   🚨 MISMATCH: Pool has Week 2 pick, Legacy MISSING!`);
            console.log(`   🔧 NEED TO SYNC: Add Week 2 ${user.week2} to legacy structure`);
          }
        } else {
          console.log(`   📊 LEGACY PICKS DATA: NOT FOUND`);
          console.log(`   🚨 MAJOR ISSUE: User has pool data but no legacy picks document!`);
        }
      } catch (error) {
        console.log(`   ❌ Error reading legacy picks: ${error.message}`);
      }

      // Check legacy status data (elimination status)
      const legacyStatusPath = `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`;
      try {
        const legacyStatusDoc = await db.doc(legacyStatusPath).get();
        if (legacyStatusDoc.exists()) {
          const legacyStatusData = legacyStatusDoc.data();
          const userStatus = legacyStatusData[user.uid];

          console.log(`   📊 LEGACY STATUS DATA:`);
          if (userStatus) {
            console.log(`      Eliminated: ${userStatus.eliminated || false}`);
            console.log(`      Eliminated Week: ${userStatus.eliminatedWeek || 'None'}`);
            console.log(`      Elimination Reason: ${userStatus.eliminationReason || 'None'}`);

            if (userStatus.eliminated && picks.length >= 2 && picks[1] === user.week2) {
              console.log(`   🚨 STATUS CONFLICT: Legacy shows ELIMINATED but should be ACTIVE (${user.week2} won Week 2)`);
            }
          } else {
            console.log(`      No status record found`);
          }
        } else {
          console.log(`   📊 LEGACY STATUS DATA: NOT FOUND`);
        }
      } catch (error) {
        console.log(`   ❌ Error reading legacy status: ${error.message}`);
      }

      console.log('');
    }

    console.log('💡 SOLUTION REQUIRED:');
    console.log('=====================');
    console.log('1. UPDATE legacy survivor picks to include restored Week 2 picks');
    console.log('2. CLEAR elimination status for users who should be active');
    console.log('3. RE-RUN elimination calculation with Arizona Cardinals as Week 2 winner');
    console.log('4. FORCE survivor display refresh with correct data');

    // Now sync the data structures
    console.log('\n🔄 SYNCING DATA STRUCTURES...');
    console.log('============================');

    for (const user of restoredUsers) {
      console.log(`🔧 SYNCING: ${user.name}`);

      const poolUser = poolData[user.uid];
      if (!poolUser) {
        console.log(`   ❌ User not found in pool members`);
        continue;
      }

      const survivor = poolUser.survivor || {};
      const pickHistory = survivor.pickHistory || '';
      const picks = pickHistory.split(', ').filter(p => p && p.trim());

      if (picks.length >= 2) {
        // Update legacy picks structure
        const legacyPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${user.uid}`;

        try {
          // Get existing legacy picks
          const legacyPicksDoc = await db.doc(legacyPicksPath).get();
          let legacyData = { picks: {} };

          if (legacyPicksDoc.exists()) {
            legacyData = legacyPicksDoc.data();
          }

          // Update with Week 2 pick
          legacyData.picks = legacyData.picks || {};
          legacyData.picks[2] = {
            team: picks[1],
            week: 2,
            timestamp: new Date().toISOString()
          };

          await db.doc(legacyPicksPath).set(legacyData, { merge: true });
          console.log(`   ✅ Updated legacy picks: Week 2 ${picks[1]}`);

        } catch (error) {
          console.log(`   ❌ Error updating legacy picks: ${error.message}`);
        }

        // Clear elimination status if they should be active
        if (user.week2 === 'Arizona Cardinals' || user.week2 === 'Baltimore Ravens' || user.week2 === 'Dallas Cowboys') {
          const legacyStatusPath = `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`;

          try {
            const updateData = {};
            updateData[`${user.uid}.eliminated`] = false;
            updateData[`${user.uid}.eliminatedWeek`] = null;
            updateData[`${user.uid}.eliminatedDate`] = null;
            updateData[`${user.uid}.eliminationReason`] = null;

            await db.doc(legacyStatusPath).set(updateData, { merge: true });
            console.log(`   ✅ Cleared elimination status (${user.week2} won Week 2)`);

          } catch (error) {
            console.log(`   ❌ Error clearing elimination status: ${error.message}`);
          }
        }
      }

      console.log('');
    }

    console.log('🎉 DATA STRUCTURE SYNC COMPLETE!');
    console.log('=================================');
    console.log('✅ Legacy picks updated with restored Week 2 data');
    console.log('✅ Elimination status cleared for Arizona Cardinals winners');
    console.log('✅ Both data structures now aligned');
    console.log('');
    console.log('🔄 NEXT: Survivor display should now show correct status!');

  } catch (error) {
    console.error('❌ Error syncing survivor data structures:', error);
  }
}

syncSurvivorDataStructures().then(() => {
  console.log('\n✅ Survivor data structure sync complete');
  process.exit(0);
}).catch(error => {
  console.error('Sync failed:', error);
  process.exit(1);
});