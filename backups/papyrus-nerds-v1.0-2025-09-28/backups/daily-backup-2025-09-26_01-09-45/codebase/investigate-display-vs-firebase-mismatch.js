const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function investigateDisplayVsFirebaseMismatch() {
  console.log('🔍 INVESTIGATING DISPLAY vs FIREBASE DATA MISMATCH\n');
  console.log('Checking users who APPEAR to be missing Week 2 but may actually have it...\n');

  const poolId = 'nerduniverse-2025';

  // Users reported as "missing Week 2" from display
  const reportedMissingUsers = [
    { name: 'Chuck Upshur', email: 'chuck.upshur@gmail.com', displayWeek1: 'Tampa Bay Buccaneers' },
    { name: 'David Dulany', email: 'daviddulany@yahoo.com', displayWeek1: 'Denver Broncos' },
    { name: 'Douglas Reynolds', email: 'douglas@reynoldsexcavatinginc.com', displayWeek1: 'Cincinnati Bengals' },
    { name: 'Frank Hanna', email: 'frankhanna00@gmail.com', displayWeek1: 'Cincinnati Bengals' },
    { name: 'Lisa Guerrieri', email: 'lmgue@yahoo.com', displayWeek1: 'Tampa Bay Buccaneers' },
    { name: 'Trae Anderson', email: 'trae@blackstonearch.com', displayWeek1: 'Cincinnati Bengals' },
    { name: 'Wholeeoh', email: 'juliorico75@gmail.com', displayWeek1: 'San Francisco 49ers' }
  ];

  try {
    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();

      console.log('🎯 DETAILED ANALYSIS OF "MISSING" USERS:\n');

      const results = [];

      for (const reportedUser of reportedMissingUsers) {
        console.log(`🔍 CHECKING: ${reportedUser.name}`);
        console.log(`   Email: ${reportedUser.email}`);
        console.log(`   Display shows Week 1: ${reportedUser.displayWeek1}`);

        // Find user in Firebase
        let foundUser = null;
        let userUID = null;

        for (const [uid, user] of Object.entries(poolData)) {
          const displayName = (user.displayName || '').toLowerCase();
          const email = (user.email || '').toLowerCase();

          if (email === reportedUser.email.toLowerCase() ||
              (displayName.includes(reportedUser.name.split(' ')[0].toLowerCase()) &&
               displayName.includes(reportedUser.name.split(' ')[1].toLowerCase()))) {
            foundUser = user;
            userUID = uid;
            break;
          }
        }

        if (foundUser && foundUser.survivor) {
          const pickHistory = foundUser.survivor.pickHistory || '';
          const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());

          console.log(`   ✅ FOUND in Firebase:`);
          console.log(`   UID: ${userUID}`);
          console.log(`   Firebase picks: "${pickHistory}"`);
          console.log(`   Parsed picks: [${picks.map(p => `"${p}"`).join(', ')}]`);
          console.log(`   Total picks: ${picks.length}`);

          picks.forEach((pick, index) => {
            console.log(`      Week ${index + 1}: "${pick.trim()}"`);
          });

          // Compare with what display shows
          const firebaseWeek1 = picks[0] || 'NONE';
          const hasWeek2 = picks.length >= 2;
          const firebaseWeek2 = picks[1] || 'NONE';

          console.log(`   📊 COMPARISON:`);
          console.log(`      Display Week 1: ${reportedUser.displayWeek1}`);
          console.log(`      Firebase Week 1: ${firebaseWeek1}`);
          console.log(`      Week 1 Match: ${firebaseWeek1.toLowerCase().includes(reportedUser.displayWeek1.toLowerCase().split(' ')[0]) ? '✅' : '❌'}`);
          console.log(`      Display Week 2: MISSING`);
          console.log(`      Firebase Week 2: ${firebaseWeek2}`);
          console.log(`      Actually has Week 2: ${hasWeek2 ? '✅ YES' : '❌ NO'}`);

          results.push({
            name: reportedUser.name,
            email: reportedUser.email,
            uid: userUID,
            displayWeek1: reportedUser.displayWeek1,
            firebaseWeek1: firebaseWeek1,
            hasWeek2InFirebase: hasWeek2,
            firebaseWeek2: firebaseWeek2,
            totalPicks: picks.length,
            mismatch: hasWeek2 // If they have Week 2 in Firebase but display shows missing
          });

        } else {
          console.log(`   ❌ NOT FOUND in Firebase or no survivor data`);
          results.push({
            name: reportedUser.name,
            email: reportedUser.email,
            uid: null,
            found: false
          });
        }

        console.log(''); // Blank line between users
      }

      // Summary analysis
      console.log('📋 SUMMARY ANALYSIS:');
      console.log('====================\n');

      const usersWithWeek2InFirebase = results.filter(r => r.hasWeek2InFirebase);
      const usersActuallyMissingWeek2 = results.filter(r => r.found !== false && !r.hasWeek2InFirebase);

      console.log(`Users reported as "missing Week 2": ${reportedMissingUsers.length}`);
      console.log(`Users who ACTUALLY have Week 2 in Firebase: ${usersWithWeek2InFirebase.length}`);
      console.log(`Users who ACTUALLY are missing Week 2: ${usersActuallyMissingWeek2.length}`);

      if (usersWithWeek2InFirebase.length > 0) {
        console.log('\n🚨 DISPLAY BUG DETECTED:');
        console.log('These users HAVE Week 2 picks but display shows they don\'t:');
        usersWithWeek2InFirebase.forEach(user => {
          console.log(`   - ${user.name}: Week 2 = "${user.firebaseWeek2}"`);
        });
      }

      if (usersActuallyMissingWeek2.length > 0) {
        console.log('\n📋 ACTUALLY MISSING Week 2:');
        usersActuallyMissingWeek2.forEach(user => {
          console.log(`   - ${user.name}: Only ${user.totalPicks} pick(s)`);
        });
      }

    } else {
      console.log('❌ Pool members document not found');
    }

  } catch (error) {
    console.error('Error investigating display mismatch:', error);
  }
}

investigateDisplayVsFirebaseMismatch().then(() => {
  console.log('\n✅ Display vs Firebase investigation complete');
  process.exit(0);
}).catch(error => {
  console.error('Investigation failed:', error);
  process.exit(1);
});