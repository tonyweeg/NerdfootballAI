const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function investigateMissingWeek2Picks() {
  console.log('🔍 INVESTIGATING MISSING WEEK 2 PICKS - DATA INTEGRITY ANALYSIS\n');

  const poolId = 'nerduniverse-2025';

  // Users with missing Week 2 picks who are still ACTIVE
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
    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    console.log(`📊 Analyzing ${Object.keys(poolData).length} pool members for missing Week 2 data...\n`);

    // Week calculation
    const seasonStart = new Date('2025-09-04');
    const now = new Date();
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
    const currentWeekGamesStarted = false;
    const completedWeeks = currentWeekGamesStarted ? currentWeek : currentWeek - 1;

    console.log(`📅 CRITICAL TIMING ANALYSIS:`);
    console.log(`   Current week: ${currentWeek}`);
    console.log(`   Completed weeks: ${completedWeeks}`);
    console.log(`   Week 2 status: ${completedWeeks >= 2 ? 'COMPLETED ✅' : 'IN PROGRESS'}`);
    console.log(`   Week 2 deadline: ${completedWeeks >= 2 ? 'PASSED' : 'ACTIVE'}\n`);

    if (completedWeeks < 2) {
      console.log('⚠️ Week 2 not yet completed - missing picks may be normal');
      return;
    }

    console.log('🚨 WEEK 2 IS COMPLETED - MISSING PICKS ARE DATA INTEGRITY VIOLATIONS\n');

    // Analyze each suspicious user
    const foundUsers = [];
    const dataIntegrityIssues = [];

    for (const suspiciousUser of suspiciousUsers) {
      console.log(`🔍 INVESTIGATING: ${suspiciousUser.name}`);

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
        foundUsers.push({ suspiciousUser, foundUser, userUID });

        const survivor = foundUser.survivor || {};
        const pickHistory = survivor.pickHistory || '';
        const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());
        const isAlive = survivor.alive !== false && !survivor.eliminationWeek;

        console.log(`   ✅ FOUND in Firebase:`);
        console.log(`   UID: ${userUID}`);
        console.log(`   Email: ${foundUser.email || 'No email'}`);
        console.log(`   Display Name: ${foundUser.displayName || 'No display name'}`);
        console.log(`   Pick History: "${pickHistory}"`);
        console.log(`   Parsed Picks: [${picks.map(p => `"${p}"`).join(', ')}]`);
        console.log(`   Total Picks: ${picks.length}`);
        console.log(`   Alive Status: ${isAlive ? 'ACTIVE' : 'ELIMINATED'}`);
        console.log(`   Elimination Week: ${survivor.eliminationWeek || 'None'}`);

        // Verify Week 1 pick matches expectation
        const week1Match = picks.length > 0 && picks[0].trim().toLowerCase().includes(suspiciousUser.week1Pick.toLowerCase().split(' ')[0]);
        console.log(`   Week 1 Verification: ${week1Match ? '✅ MATCHES' : '❌ MISMATCH'}`);
        console.log(`   Expected Week 1: ${suspiciousUser.week1Pick}`);
        console.log(`   Actual Week 1: ${picks[0] || 'NONE'}`);

        // Check for Week 2 pick
        const hasWeek2 = picks.length >= 2;
        console.log(`   Week 2 Pick: ${hasWeek2 ? `"${picks[1]}"` : '❌ MISSING'}`);

        // DATA INTEGRITY ANALYSIS
        if (!hasWeek2 && isAlive && completedWeeks >= 2) {
          console.log(`   🚨 DATA INTEGRITY VIOLATION:`);
          console.log(`      - Week 2 is COMPLETED`);
          console.log(`      - User is still ACTIVE`);
          console.log(`      - NO Week 2 pick found`);
          console.log(`      - User should be ELIMINATED or have missing pick RESTORED`);

          dataIntegrityIssues.push({
            name: suspiciousUser.name,
            uid: userUID,
            email: foundUser.email,
            issue: 'MISSING_WEEK2_PICK_ACTIVE_USER',
            week1Pick: picks[0] || 'None',
            alive: isAlive,
            eliminationWeek: survivor.eliminationWeek,
            action: 'NEEDS_ELIMINATION_OR_PICK_RESTORATION'
          });
        }

        console.log('');
      } else {
        console.log(`   ❌ NOT FOUND in Firebase`);
        console.log('');
      }
    }

    // SUMMARY AND RECOMMENDATIONS
    console.log('📋 DATA INTEGRITY ANALYSIS SUMMARY:');
    console.log('===================================');
    console.log(`Users investigated: ${suspiciousUsers.length}`);
    console.log(`Users found in Firebase: ${foundUsers.length}`);
    console.log(`Data integrity violations: ${dataIntegrityIssues.length}\n`);

    if (dataIntegrityIssues.length > 0) {
      console.log('🚨 CRITICAL DATA INTEGRITY VIOLATIONS FOUND:');
      console.log('============================================');

      dataIntegrityIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.name} (${issue.email})`);
        console.log(`   UID: ${issue.uid}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Week 1 Pick: ${issue.week1Pick}`);
        console.log(`   Current Status: ${issue.alive ? 'ACTIVE' : 'ELIMINATED'}`);
        console.log(`   Action Required: ${issue.action}`);
        console.log('');
      });

      console.log('🔧 RECOMMENDED ACTIONS:');
      console.log('======================');
      console.log('1. INVESTIGATE: Check if Week 2 picks were submitted but lost');
      console.log('2. VERIFY: Confirm if these users should be eliminated');
      console.log('3. RESTORE: Add missing Week 2 picks if they were lost');
      console.log('4. ELIMINATE: Mark users as eliminated if they failed to submit');
      console.log('5. AUDIT: Check all other weeks for similar data integrity issues');

      console.log('\n💡 POSSIBLE CAUSES:');
      console.log('==================');
      console.log('- Database write failures during Week 2 submission');
      console.log('- Frontend submission bugs that appeared successful');
      console.log('- Network issues during pick submission');
      console.log('- Race conditions in Firebase updates');
      console.log('- Manual data corruption');

    } else {
      console.log('✅ No data integrity violations found (this should not happen)');
    }

    // Check if ANY users properly submitted Week 2 picks
    console.log('\n📊 WEEK 2 SUBMISSION VERIFICATION:');
    console.log('==================================');

    let usersWithWeek2 = 0;
    let usersWithoutWeek2 = 0;

    for (const [uid, user] of Object.entries(poolData)) {
      const survivor = user.survivor || {};
      const pickHistory = survivor.pickHistory || '';
      const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());

      if (picks.length >= 2) {
        usersWithWeek2++;
      } else if (picks.length === 1) {
        usersWithoutWeek2++;
      }
    }

    console.log(`Users WITH Week 2 picks: ${usersWithWeek2}`);
    console.log(`Users WITHOUT Week 2 picks: ${usersWithoutWeek2}`);
    console.log(`Week 2 submission rate: ${((usersWithWeek2 / (usersWithWeek2 + usersWithoutWeek2)) * 100).toFixed(1)}%`);

    if (usersWithWeek2 > 0) {
      console.log('\n✅ OTHER USERS SUCCESSFULLY SUBMITTED WEEK 2 PICKS');
      console.log('This confirms the missing picks are individual data issues, not system-wide failure');
    }

  } catch (error) {
    console.error('❌ Error investigating missing Week 2 picks:', error);
  }
}

investigateMissingWeek2Picks().then(() => {
  console.log('\n✅ Investigation complete');
  process.exit(0);
}).catch(error => {
  console.error('Investigation failed:', error);
  process.exit(1);
});