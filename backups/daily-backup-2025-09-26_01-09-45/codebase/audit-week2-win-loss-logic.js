const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function auditWeek2WinLossLogic() {
  console.log('🔍 AUDITING WEEK 2 WIN/LOSS LOGIC AFTER RESTORATIONS\n');

  const poolId = 'nerduniverse-2025';

  try {
    // Get pool members with fresh data
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    console.log(`📊 Analyzing ${Object.keys(poolData).length} pool members for Week 2 win/loss inconsistencies...\n`);

    // Focus on users mentioned in the pattern + recently restored users
    const usersToCheck = [
      'Jerry Beauchamp',
      'John Durkin',
      'Wholeeoh',
      'Chuck Upshur',
      'Trae Anderson',
      'Lisa Guerrieri',
      'Douglas Reynolds'
    ];

    const week2Picks = {};
    const userStatuses = [];

    // Collect all Week 2 picks and current status
    for (const [uid, user] of Object.entries(poolData)) {
      const displayName = user.displayName || user.email || `User ${uid.substring(0, 8)}`;
      const survivor = user.survivor || {};
      const pickHistory = survivor.pickHistory || '';
      const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());
      const isAlive = survivor.alive !== false && !survivor.eliminationWeek;

      if (picks.length >= 2) {
        const week2Pick = picks[1].trim();

        // Track all Week 2 picks
        if (!week2Picks[week2Pick]) {
          week2Picks[week2Pick] = { alive: [], eliminated: [] };
        }

        if (isAlive) {
          week2Picks[week2Pick].alive.push(displayName);
        } else {
          week2Picks[week2Pick].eliminated.push(displayName);
        }

        // Check if this is one of our focus users
        if (usersToCheck.some(targetName => displayName.toLowerCase().includes(targetName.toLowerCase().split(' ')[0]))) {
          userStatuses.push({
            name: displayName,
            uid: uid,
            week1: picks[0] || 'None',
            week2: week2Pick,
            totalPicks: picks.length,
            pickHistory: pickHistory,
            isAlive: isAlive,
            eliminationWeek: survivor.eliminationWeek,
            alive: survivor.alive
          });
        }
      } else if (usersToCheck.some(targetName => displayName.toLowerCase().includes(targetName.toLowerCase().split(' ')[0]))) {
        // Track users with missing Week 2 picks
        userStatuses.push({
          name: displayName,
          uid: uid,
          week1: picks[0] || 'None',
          week2: 'MISSING',
          totalPicks: picks.length,
          pickHistory: pickHistory,
          isAlive: isAlive,
          eliminationWeek: survivor.eliminationWeek,
          alive: survivor.alive
        });
      }
    }

    // Report focus users current status
    console.log('👁️ FOCUS USERS CURRENT STATUS:');
    console.log('==============================');
    userStatuses.forEach(user => {
      console.log(`📊 ${user.name}:`);
      console.log(`   Pick History: "${user.pickHistory}"`);
      console.log(`   Total Picks: ${user.totalPicks}`);
      console.log(`   Week 1: ${user.week1}`);
      console.log(`   Week 2: ${user.week2}`);
      console.log(`   Alive Status: ${user.isAlive ? '⭐ ACTIVE' : '💤 ELIMINATED'}`);
      console.log(`   Elimination Week: ${user.eliminationWeek || 'None'}`);
      console.log(`   Alive Field: ${user.alive}`);
      console.log('');
    });

    // Analyze Week 2 team conflicts
    console.log('🚨 WEEK 2 TEAM WIN/LOSS CONFLICTS:');
    console.log('=================================');

    let conflictsFound = 0;

    for (const [team, results] of Object.entries(week2Picks)) {
      const hasWinners = results.alive.length > 0;
      const hasLosers = results.eliminated.length > 0;

      if (hasWinners && hasLosers) {
        conflictsFound++;
        console.log(`🚨 CONFLICT: ${team}`);
        console.log(`   ⭐ Active (Winners): ${results.alive.length} users`);
        results.alive.forEach(name => console.log(`      - ${name}`));
        console.log(`   💤 Eliminated (Losers): ${results.eliminated.length} users`);
        results.eliminated.forEach(name => console.log(`      - ${name}`));
        console.log('   🎯 ISSUE: Same team marked as both winner and loser!');
        console.log('');
      } else {
        console.log(`✅ ${team}: ${hasWinners ? 'WINNERS' : 'LOSERS'} (${hasWinners ? results.alive.length : results.eliminated.length} users)`);
      }
    }

    // Specific Arizona Cardinals analysis
    console.log('\n🔍 ARIZONA CARDINALS DETAILED ANALYSIS:');
    console.log('======================================');

    if (week2Picks['Arizona Cardinals']) {
      const ariResults = week2Picks['Arizona Cardinals'];
      console.log(`Total users who picked Arizona Cardinals Week 2: ${ariResults.alive.length + ariResults.eliminated.length}`);
      console.log(`⭐ Active (should be alive): ${ariResults.alive.length}`);
      ariResults.alive.forEach(name => console.log(`   - ${name}`));
      console.log(`💤 Eliminated (should be eliminated): ${ariResults.eliminated.length}`);
      ariResults.eliminated.forEach(name => console.log(`   - ${name}`));

      console.log('\n🎯 ARIZONA CARDINALS WEEK 2 ACTUAL RESULT:');
      // We need to determine what Arizona Cardinals actually did Week 2
      console.log('   We need to check ESPN data to determine if Arizona won or lost Week 2');
    }

    // Summary and recommendations
    console.log('\n📋 WIN/LOSS AUDIT SUMMARY:');
    console.log('=========================');
    console.log(`Team conflicts found: ${conflictsFound}`);
    console.log(`Users checked: ${userStatuses.length}`);

    if (conflictsFound > 0) {
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      console.log('1. Check ESPN Week 2 game results for conflicted teams');
      console.log('2. Recalculate eliminations based on actual game outcomes');
      console.log('3. Update elimination status for users with wrong status');
      console.log('4. Regenerate battlefield display with corrected data');

      console.log('\n💡 LIKELY CAUSE:');
      console.log('- Our Week 2 pick restorations added picks but didnt recalculate eliminations');
      console.log('- Display is using stale elimination data from before restorations');
      console.log('- Need to re-run elimination logic with updated pick history');
    }

  } catch (error) {
    console.error('❌ Error auditing Week 2 win/loss logic:', error);
  }
}

auditWeek2WinLossLogic().then(() => {
  console.log('\n✅ Week 2 win/loss audit complete');
  process.exit(0);
}).catch(error => {
  console.error('Audit failed:', error);
  process.exit(1);
});