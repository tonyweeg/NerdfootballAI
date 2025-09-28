const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugDavidDulanyDisplay() {
  console.log('🔧 DEBUGGING DAVID DULANY BATTLEFIELD DISPLAY BUG\n');

  const poolId = 'nerduniverse-2025';
  const davidUID = 'nKwmN2JLvQhD77W7TzZLv95mngS2';

  try {
    // Get David's data from pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();
      const davidData = poolData[davidUID];

      if (davidData) {
        console.log('✅ DAVID DULANY FIREBASE DATA:');
        console.log(`UID: ${davidUID}`);
        console.log(`Display Name: "${davidData.displayName}"`);
        console.log(`Email: "${davidData.email}"`);
        console.log('\nSURVIVOR DATA:');
        console.log(JSON.stringify(davidData.survivor, null, 2));

        // Simulate battlefield display logic
        const pickHistory = davidData.survivor.pickHistory || '';
        const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());

        console.log('\n🎯 BATTLEFIELD DISPLAY SIMULATION:');
        console.log(`Pick History String: "${pickHistory}"`);
        console.log(`Split Picks Array: [${picks.map(p => `"${p}"`).join(', ')}]`);
        console.log(`Array Length: ${picks.length}`);

        // Week calculation (from survivor-battlefield-display.js logic)
        const seasonStart = new Date('2025-09-04');
        const now = new Date();
        const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
        const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);

        console.log(`\n📅 TIMING CALCULATION:`);
        console.log(`Season start: ${seasonStart.toDateString()}`);
        console.log(`Today: ${now.toDateString()}`);
        console.log(`Days since start: ${daysSinceStart}`);
        console.log(`Current week: ${currentWeek}`);

        // Display logic simulation
        const currentWeekGamesStarted = false; // Assume safer default
        const completedWeeks = currentWeekGamesStarted ? currentWeek : currentWeek - 1;
        const maxPicksToProcess = currentWeek;

        console.log(`\n🔍 DISPLAY LOGIC VARIABLES:`);
        console.log(`Current week games started: ${currentWeekGamesStarted}`);
        console.log(`Completed weeks (shown): ${completedWeeks}`);
        console.log(`Max picks to process: ${maxPicksToProcess}`);
        console.log(`Picks available: ${picks.length}`);

        // Simulate buildHelmetDisplay logic
        const picksToProcess = picks.slice(0, maxPicksToProcess);
        console.log(`\n🎨 HELMET DISPLAY SIMULATION:`);
        console.log(`Picks after slice(0, ${maxPicksToProcess}): [${picksToProcess.map(p => `"${p}"`).join(', ')}]`);

        const visibleHelmets = [];
        const hiddenPicks = [];

        picksToProcess.forEach((teamName, index) => {
          const week = index + 1;
          if (week <= completedWeeks) {
            visibleHelmets.push({ week, teamName: teamName.trim() });
          } else {
            hiddenPicks.push({ week, teamName: teamName.trim() });
          }
        });

        console.log(`\n👁️ HELMETS THAT SHOULD BE VISIBLE:`);
        if (visibleHelmets.length > 0) {
          visibleHelmets.forEach(helmet => {
            console.log(`  Week ${helmet.week}: ${helmet.teamName} helmet ✅`);
          });
        } else {
          console.log(`  ❌ NO HELMETS SHOULD BE VISIBLE`);
        }

        console.log(`\n🙈 PICKS THAT SHOULD BE HIDDEN (thinking emoji):`);
        if (hiddenPicks.length > 0) {
          hiddenPicks.forEach(pick => {
            console.log(`  Week ${pick.week}: ${pick.teamName} → 🤔`);
          });
        } else {
          console.log(`  No hidden picks`);
        }

        // Specific Week 2 analysis
        console.log(`\n🎯 WEEK 2 ARIZONA CARDINALS ANALYSIS:`);
        if (picks.length >= 2) {
          const week2Pick = picks[1].trim();
          console.log(`Week 2 pick exists: "${week2Pick}"`);
          console.log(`Should Week 2 be visible: ${completedWeeks >= 2 ? 'YES ✅' : 'NO ❌'}`);
          console.log(`Current completed weeks: ${completedWeeks}`);

          if (completedWeeks >= 2) {
            console.log(`✅ Week 2 ${week2Pick} helmet SHOULD be visible`);
          } else {
            console.log(`❌ Week 2 ${week2Pick} helmet should be HIDDEN (too early)`);
          }
        } else {
          console.log(`❌ No Week 2 pick found`);
        }

        // Check if this is a timing issue
        console.log(`\n🚨 POTENTIAL BATTLEFIELD BUG DIAGNOSIS:`);
        if (picks.length >= 2 && completedWeeks >= 2) {
          console.log(`🐛 BUG CONFIRMED: David should show Week 2 helmet but doesn't`);
          console.log(`   - Week 2 pick exists: ✅`);
          console.log(`   - Week 2 should be visible: ✅`);
          console.log(`   - Problem: Battlefield rendering logic or cache issue`);
        } else if (picks.length >= 2 && completedWeeks < 2) {
          console.log(`📅 TIMING ISSUE: Week 2 helmet hidden because only ${completedWeeks} weeks completed`);
          console.log(`   - This is correct behavior (Week 2 not yet completed)`);
        } else {
          console.log(`❓ UNCLEAR: Need more investigation`);
        }

      } else {
        console.log('❌ David Dulany not found in pool members');
      }
    } else {
      console.log('❌ Pool members document not found');
    }

  } catch (error) {
    console.error('Error debugging David Dulany display:', error);
  }
}

debugDavidDulanyDisplay().then(() => {
  console.log('\n✅ David Dulany display debug complete');
  process.exit(0);
}).catch(error => {
  console.error('Display debug failed:', error);
  process.exit(1);
});