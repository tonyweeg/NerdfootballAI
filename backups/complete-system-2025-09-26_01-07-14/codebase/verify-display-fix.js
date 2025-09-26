const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function verifyDisplayFix() {
  console.log('🔍 VERIFYING DISPLAY FIX - CHECKING IF ELIMINATION STATUS CLEARED\n');

  try {
    // Check legacy status to see if elimination was cleared
    const legacyStatusPath = `artifacts/nerdfootball/public/data/nerdSurvivor_status/status`;
    const legacyStatusDoc = await db.doc(legacyStatusPath).get();

    if (legacyStatusDoc.exists) {
      const statusData = legacyStatusDoc.data();

      console.log('📊 LEGACY ELIMINATION STATUS AFTER SYNC:');
      console.log('========================================');

      const checkUsers = [
        { name: 'Trae Anderson', uid: '30bXFADO8jaFIQTHxSj7Qi2YSRi2' },
        { name: 'Wholeeoh', uid: 'Ym8yukuU84ddcP6q5WRVMfdaKME3' },
        { name: 'Lisa Guerrieri', uid: 'aVY5Ev25EoX9t1cKax1fEUeblUF2' },
        { name: 'Douglas Reynolds', uid: 'IapIQ9n4ugTplJ2JAJUI2GrvJML2' }
      ];

      checkUsers.forEach(user => {
        const userStatus = statusData[user.uid];
        console.log(`👤 ${user.name}:`);
        if (userStatus) {
          console.log(`   Eliminated: ${userStatus.eliminated || false}`);
          console.log(`   Eliminated Week: ${userStatus.eliminatedWeek || 'None'}`);
          console.log(`   Status: ${userStatus.eliminated ? '💤 ELIMINATED' : '⭐ ACTIVE'}`);
        } else {
          console.log(`   No status record (defaults to ACTIVE)`);
        }
        console.log('');
      });

      console.log('🎯 VERIFICATION RESULT:');
      console.log('======================');

      const traeStatus = statusData['30bXFADO8jaFIQTHxSj7Qi2YSRi2'];
      const wholeeohStatus = statusData['Ym8yukuU84ddcP6q5WRVMfdaKME3'];

      if (!traeStatus?.eliminated && !wholeeohStatus?.eliminated) {
        console.log('✅ SUCCESS: Trae & Wholeeoh elimination status cleared!');
        console.log('✅ They should now show as ACTIVE in survivor display');
        console.log('');
        console.log('🌐 CHECK RESULTS AT:');
        console.log('https://nerdfootball.web.app/?view=survivor');
        console.log('');
        console.log('🔄 If display still shows them as eliminated, try hard refresh (Ctrl+F5)');
      } else {
        console.log('🚨 Still showing as eliminated - may need additional fixes');
      }

    } else {
      console.log('📊 Legacy status document not found');
      console.log('💡 This might mean the system only uses pool members data');
      console.log('✅ In that case, the display should already be fixed!');
    }

    // Double-check pool members data as well
    console.log('\n📊 DOUBLE-CHECKING POOL MEMBERS DATA:');
    console.log('====================================');

    const poolMembersPath = `artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();

      const traeUser = poolData['30bXFADO8jaFIQTHxSj7Qi2YSRi2'];
      const wholeeohUser = poolData['Ym8yukuU84ddcP6q5WRVMfdaKME3'];

      console.log('👤 Trae Anderson (Pool Members):');
      if (traeUser?.survivor) {
        console.log(`   Pick History: "${traeUser.survivor.pickHistory}"`);
        console.log(`   Alive: ${traeUser.survivor.alive !== false && !traeUser.survivor.eliminationWeek}`);
        console.log(`   Status: ${traeUser.survivor.alive !== false && !traeUser.survivor.eliminationWeek ? '⭐ ACTIVE' : '💤 ELIMINATED'}`);
      }

      console.log('\n👤 Wholeeoh (Pool Members):');
      if (wholeeohUser?.survivor) {
        console.log(`   Pick History: "${wholeeohUser.survivor.pickHistory}"`);
        console.log(`   Alive: ${wholeeohUser.survivor.alive !== false && !wholeeohUser.survivor.eliminationWeek}`);
        console.log(`   Status: ${wholeeohUser.survivor.alive !== false && !wholeeohUser.survivor.eliminationWeek ? '⭐ ACTIVE' : '💤 ELIMINATED'}`);
      }
    }

  } catch (error) {
    console.error('❌ Error verifying display fix:', error);
  }
}

verifyDisplayFix().then(() => {
  console.log('\n✅ Display fix verification complete');
  process.exit(0);
}).catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});