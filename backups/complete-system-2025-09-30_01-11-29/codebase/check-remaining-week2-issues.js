const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkRemainingWeek2Issues() {
  console.log('🔍 CHECKING REMAINING WEEK 2 DATA INTEGRITY ISSUES\n');

  const poolId = 'nerduniverse-2025';

  // Users previously identified with missing Week 2 picks
  const suspiciousUsers = [
    { name: 'David Dulany', expectedEmail: 'daviddulany@yahoo.com', week1Pick: 'Arizona Cardinals' },
    { name: 'James Stewart', expectedUID: 'UiQyobvibJgXwEexUj6AhaUUg7P2', week1Pick: 'Arizona Cardinals' },
    { name: 'Chuck Upshur', expectedEmail: 'chuck.upshur@gmail.com', week1Pick: 'Tampa Bay Buccaneers' },
    { name: 'Wholeeoh', expectedEmail: 'juliorico75@gmail.com', week1Pick: 'San Francisco 49ers' },
    { name: 'Lisa Guerrieri', expectedEmail: 'lmgue@yahoo.com', week1Pick: 'Tampa Bay Buccaneers' },
    { name: 'Trae Anderson', expectedEmail: 'trae@blackstonearch.com', week1Pick: 'Cincinnati Bengals' },
    { name: 'Frank Hanna', expectedEmail: 'frankhanna00@gmail.com', week1Pick: 'Cincinnati Bengals' },
    { name: 'Douglas Reynolds', expectedEmail: 'douglas@reynoldsexcavatinginc.com', week1Pick: 'Cincinnati Bengals' }
  ];

  try {
    // Week calculation
    const seasonStart = new Date('2025-09-04');
    const now = new Date();
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
    const currentWeekGamesStarted = false;
    const completedWeeks = currentWeekGamesStarted ? currentWeek : currentWeek - 1;

    console.log(`📅 Current week: ${currentWeek}, Completed weeks: ${completedWeeks}\n`);

    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    console.log(`📊 Analyzing ${Object.keys(poolData).length} pool members...\n`);

    const stillMissingWeek2 = [];
    const nowHaveWeek2 = [];

    // Check each suspicious user
    for (const suspiciousUser of suspiciousUsers) {
      console.log(`🔍 CHECKING: ${suspiciousUser.name}`);

      // Find user in Firebase
      let foundUser = null;
      let userUID = null;

      for (const [uid, user] of Object.entries(poolData)) {
        const displayName = (user.displayName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();

        const matchByEmail = suspiciousUser.expectedEmail && email === suspiciousUser.expectedEmail.toLowerCase();
        const matchByUID = suspiciousUser.expectedUID && uid === suspiciousUser.expectedUID;
        const matchByName = displayName.includes(suspiciousUser.name.toLowerCase().split(' ')[0]);

        if (matchByEmail || matchByUID || (matchByName && !matchByEmail)) {
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

        console.log(`   ✅ Found: ${foundUser.displayName || foundUser.email}`);
        console.log(`   Pick History: "${pickHistory}"`);
        console.log(`   Total Picks: ${picks.length}`);
        console.log(`   Alive: ${isAlive}`);

        if (picks.length >= 2) {
          console.log(`   ✅ HAS WEEK 2: ${picks[1]}`);
          nowHaveWeek2.push({
            name: suspiciousUser.name,
            uid: userUID,
            week1: picks[0],
            week2: picks[1],
            status: 'RESTORED_OR_FOUND'
          });
        } else if (isAlive && completedWeeks >= 2) {
          console.log(`   🚨 STILL MISSING WEEK 2 (Active user, completed week)`);
          stillMissingWeek2.push({
            name: suspiciousUser.name,
            uid: userUID,
            email: foundUser.email,
            week1: picks[0] || 'None',
            status: 'NEEDS_RESTORATION'
          });
        } else {
          console.log(`   ⏳ Missing Week 2 but not critical yet`);
        }

        console.log('');
      } else {
        console.log(`   ❌ NOT FOUND in Firebase\n`);
      }
    }

    // Summary
    console.log('📋 WEEK 2 DATA INTEGRITY SUMMARY:');
    console.log('==================================');
    console.log(`Users checked: ${suspiciousUsers.length}`);
    console.log(`Now have Week 2 picks: ${nowHaveWeek2.length}`);
    console.log(`Still missing Week 2 picks: ${stillMissingWeek2.length}\n`);

    if (nowHaveWeek2.length > 0) {
      console.log('✅ USERS WHO NOW HAVE WEEK 2 PICKS:');
      nowHaveWeek2.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}: Week 1=${user.week1}, Week 2=${user.week2}`);
      });
      console.log('');
    }

    if (stillMissingWeek2.length > 0) {
      console.log('🚨 USERS STILL MISSING WEEK 2 PICKS:');
      stillMissingWeek2.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Week 1: ${user.week1}`);
        console.log(`   Status: ${user.status}\n`);
      });

      console.log('🔧 NEXT ACTIONS NEEDED:');
      console.log('- Investigate if these users submitted Week 2 picks that were lost');
      console.log('- Contact users to confirm their Week 2 team selections');
      console.log('- Restore missing picks or eliminate users as appropriate');
    } else {
      console.log('🎉 ALL USERS NOW HAVE PROPER WEEK 2 DATA!');
    }

  } catch (error) {
    console.error('❌ Error checking Week 2 issues:', error);
  }
}

checkRemainingWeek2Issues().then(() => {
  console.log('\n✅ Week 2 data integrity check complete');
  process.exit(0);
}).catch(error => {
  console.error('Check failed:', error);
  process.exit(1);
});