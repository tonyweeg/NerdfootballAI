const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkDavidDulanyData() {
  console.log('🔍 CHECKING DAVID DULANY DATA FOR WEEK 2 FIX\n');

  const poolId = 'nerduniverse-2025';

  try {
    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();

      // Search for David Dulany by name and email variations
      let davidData = null;
      let davidUID = null;

      for (const [uid, user] of Object.entries(poolData)) {
        const displayName = (user.displayName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();

        if (displayName.includes('david') && displayName.includes('dulany')) {
          davidData = user;
          davidUID = uid;
          break;
        }

        if (email.includes('dulany')) {
          davidData = user;
          davidUID = uid;
          break;
        }
      }

      if (davidData && davidUID) {
        console.log('✅ FOUND DAVID DULANY:');
        console.log(`UID: ${davidUID}`);
        console.log(`Display Name: "${davidData.displayName}"`);
        console.log(`Email: "${davidData.email}"`);
        console.log('\nSURVIVOR DATA:');
        console.log(JSON.stringify(davidData.survivor, null, 2));

        if (davidData.survivor && davidData.survivor.pickHistory) {
          const picks = davidData.survivor.pickHistory.split(', ').filter(pick => pick && pick.trim());
          console.log('\n📊 PICK ANALYSIS:');
          console.log(`Pick History: "${davidData.survivor.pickHistory}"`);
          console.log(`Parsed Picks: [${picks.map(p => `"${p}"`).join(', ')}]`);
          console.log(`Number of picks: ${picks.length}`);

          picks.forEach((pick, index) => {
            console.log(`  Week ${index + 1}: "${pick.trim()}"`);
          });

          // Check if Arizona Cardinals already used
          const usedTeams = picks.map(pick => pick.trim().toLowerCase());
          const hasArizona = usedTeams.some(team =>
            team.includes('arizona') || team.includes('cardinals')
          );

          console.log('\n🚨 ARIZONA CARDINALS CHECK:');
          console.log(`Already used Arizona Cardinals: ${hasArizona ? 'YES ❌' : 'NO ✅'}`);

          if (hasArizona) {
            console.log('❌ CANNOT add Arizona Cardinals for Week 2 - already used!');
            console.log('💡 Need different team for Week 2 pick');
          } else {
            console.log('✅ CAN add Arizona Cardinals for Week 2');
          }

          // Show what Week 2 addition would look like
          console.log('\n📝 PROPOSED WEEK 2 ADDITION:');
          console.log(`Current: "${davidData.survivor.pickHistory}"`);
          if (!hasArizona) {
            console.log(`After fix: "${davidData.survivor.pickHistory}, Arizona Cardinals"`);
            console.log(`Total picks would be: ${picks.length + 1}`);
          } else {
            console.log('❌ Cannot proceed - rule violation');
          }

        } else {
          console.log('❌ No survivor pick history found');
        }

      } else {
        console.log('❌ David Dulany not found. Available users:');
        Object.entries(poolData).forEach(([uid, user]) => {
          if (user.displayName && user.displayName.toLowerCase().includes('david')) {
            console.log(`  - ${user.displayName} (${user.email}) [${uid.slice(-8)}]`);
          }
        });
      }

    } else {
      console.log('❌ Pool members document not found');
    }

  } catch (error) {
    console.error('Error checking David Dulany data:', error);
  }
}

checkDavidDulanyData().then(() => {
  console.log('\n✅ David Dulany data check complete');
  process.exit(0);
}).catch(error => {
  console.error('Data check failed:', error);
  process.exit(1);
});