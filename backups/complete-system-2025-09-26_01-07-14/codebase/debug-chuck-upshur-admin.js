const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugChuckUpshurData() {
  console.log('🔍 EXAMINING CHUCK UPSHUR\'S FIREBASE DATA FOR HELMET DISPLAY ISSUES\n');

  const poolId = 'nerduniverse-2025';
  let targetUserId = null; // We'll find Chuck Upshur's ID

  try {
    // 1. Find Chuck Upshur in pool members
    console.log('1️⃣ SEARCHING FOR CHUCK UPSHUR:');
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();
      console.log(`   Found ${Object.keys(poolData).length} members, searching for Chuck Upshur...`);

      // Search for Chuck Upshur
      for (const [uid, user] of Object.entries(poolData)) {
        const displayName = (user.displayName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();

        if (displayName.includes('chuck') && (displayName.includes('upshur') || email.includes('upshur'))) {
          targetUserId = uid;
          console.log(`   🎯 FOUND CHUCK UPSHUR! User ID: ${uid}`);
          console.log(`      Display Name: ${user.displayName}`);
          console.log(`      Email: ${user.email}`);

          // Detailed analysis of Chuck's survivor data
          if (user.survivor) {
            console.log(`\n🏆 CHUCK'S SURVIVOR DATA:`);
            console.log('========================');
            console.log(JSON.stringify(user.survivor, null, 2));

            // Analyze pick history
            if (user.survivor.pickHistory) {
              const picks = user.survivor.pickHistory.split(', ').filter(pick => pick && pick.trim());
              console.log(`\n📊 PICK ANALYSIS:`);
              console.log(`=================`);
              console.log(`Pick History String: "${user.survivor.pickHistory}"`);
              console.log(`Split into array: [${picks.map(p => `"${p}"`).join(', ')}]`);
              console.log(`Array length: ${picks.length}`);
              console.log(`Total picks field: ${user.survivor.totalPicks}`);

              picks.forEach((pick, index) => {
                console.log(`  Week ${index + 1}: "${pick.trim()}"`);
              });

              // Calculate current week for logic analysis
              const seasonStart = new Date('2025-09-04');
              const now = new Date();
              const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
              const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);

              console.log(`\n📅 TIMING ANALYSIS:`);
              console.log(`==================`);
              console.log(`Current calculated week: ${currentWeek}`);
              console.log(`Season start: ${seasonStart.toDateString()}`);
              console.log(`Today: ${now.toDateString()}`);
              console.log(`Days since start: ${daysSinceStart}`);

              // HELMET DISPLAY LOGIC ANALYSIS (from survivor-battlefield-display.js)
              console.log(`\n🎯 HELMET DISPLAY LOGIC ANALYSIS:`);
              console.log(`=================================`);

              const currentWeekGamesStarted = false; // From the code: "Assume safer default"
              const completedWeeks = currentWeekGamesStarted ? currentWeek : currentWeek - 1;
              const maxPicksToProcess = currentWeek;

              console.log(`Current week games started: ${currentWeekGamesStarted}`);
              console.log(`Completed weeks (shown): ${completedWeeks}`);
              console.log(`Max picks to process: ${maxPicksToProcess}`);
              console.log(`Picks available: ${picks.length}`);
              console.log(`Should be sliced to: ${Math.min(picks.length, maxPicksToProcess)}`);

              // Simulate the buildHelmetDisplay logic
              const picksToProcess = picks.slice(0, maxPicksToProcess);
              console.log(`\nPicks after slice(0, ${maxPicksToProcess}): [${picksToProcess.map(p => `"${p}"`).join(', ')}]`);

              const visibleHelmets = [];
              picksToProcess.forEach((teamName, index) => {
                const week = index + 1;
                if (week <= completedWeeks) {
                  visibleHelmets.push({ week, teamName: teamName.trim() });
                }
              });

              console.log(`\n👁️ HELMETS THAT SHOULD BE VISIBLE:`);
              visibleHelmets.forEach(helmet => {
                console.log(`  Week ${helmet.week}: ${helmet.teamName}`);
              });

              const hiddenPicks = picksToProcess.filter((_, index) => {
                const week = index + 1;
                return week > completedWeeks;
              });

              if (hiddenPicks.length > 0) {
                console.log(`\n🙈 PICKS THAT SHOULD BE HIDDEN (thinking emoji):`);
                hiddenPicks.forEach((teamName, index) => {
                  const week = completedWeeks + index + 1;
                  console.log(`  Week ${week}: ${teamName.trim()}`);
                });
              }

              // CHUCK-SPECIFIC ANALYSIS
              console.log(`\n🏈 CHUCK'S SPECIFIC ISSUE ANALYSIS:`);
              console.log(`==================================`);

              // Week 1 Tampa Bay check
              if (picks.length > 0 && picks[0]) {
                const week1Pick = picks[0].trim();
                console.log(`Week 1 pick: "${week1Pick}"`);
                console.log(`Expected: "Tampa Bay"`);
                console.log(`Contains Tampa: ${week1Pick.toLowerCase().includes('tampa')}`);
                console.log(`Should show Week 1 helmet: ${completedWeeks >= 1}`);

                if (completedWeeks >= 1 && week1Pick.toLowerCase().includes('tampa')) {
                  console.log(`✅ Week 1 Tampa Bay helmet SHOULD be visible`);
                } else {
                  console.log(`❌ Week 1 Tampa Bay helmet will NOT be visible`);
                }
              } else {
                console.log(`❌ No Week 1 pick found in data`);
              }

              // Week 2 pick check
              if (picks.length > 1 && picks[1]) {
                const week2Pick = picks[1].trim();
                console.log(`Week 2 pick: "${week2Pick}"`);
                console.log(`Should show Week 2 helmet: ${completedWeeks >= 2}`);
                console.log(`Should show Week 2 thinking emoji: ${currentWeek === 2 && !currentWeekGamesStarted}`);
              } else {
                console.log(`❌ No Week 2 pick found in data - this explains missing Week 2 display`);
              }

              // Display logic verification
              const displayedTotalPicks = Math.min(user.survivor.totalPicks || 0, currentWeek);
              console.log(`\n🔢 DISPLAY COUNT ANALYSIS:`);
              console.log(`=========================`);
              console.log(`Actual total picks: ${user.survivor.totalPicks}`);
              console.log(`Pick history length: ${picks.length}`);
              console.log(`Displayed total picks: ${displayedTotalPicks}`);
              console.log(`Display text should show: "Pick History (${displayedTotalPicks} weeks)"`);

              if (displayedTotalPicks === 1 && picks.length === 1) {
                console.log(`✅ "Pick History (1 weeks)" matches the data`);
              } else {
                console.log(`❌ Display count mismatch detected`);
              }

              // IDENTIFY POTENTIAL LOGIC FLAWS
              console.log(`\n🚨 CHUCK'S ISSUES IDENTIFIED:`);
              console.log(`============================`);

              if (picks.length === 1 && picks[0].toLowerCase().includes('tampa') && completedWeeks >= 1) {
                console.log(`🐛 ISSUE 1: Week 1 Tampa Bay helmet should be visible but isn't rendering`);
                console.log(`   - Data exists: ✅`);
                console.log(`   - Week completed: ✅ (${completedWeeks} >= 1)`);
                console.log(`   - Problem likely in helmet rendering logic or CSS`);
              }

              if (picks.length === 1) {
                console.log(`🐛 ISSUE 2: Only 1 pick in history, Week 2 pick is missing`);
                console.log(`   - Expected: Week 1: Tampa Bay, Week 2: [some team]`);
                console.log(`   - Actual: Week 1: Tampa Bay only`);
                console.log(`   - Week 2 pick never submitted or lost in data`);
              }

              if (user.survivor.totalPicks !== picks.length) {
                console.log(`🐛 ISSUE 3: totalPicks (${user.survivor.totalPicks}) != picks array length (${picks.length})`);
              }

            } else {
              console.log(`   ❌ No pick history string found for Chuck Upshur`);
            }
          } else {
            console.log(`   ❌ No survivor data found for Chuck Upshur`);
          }
          break;
        }
      }

      if (!targetUserId) {
        console.log('   ❌ Chuck Upshur not found. Available members:');
        Object.entries(poolData).forEach(([uid, user]) => {
          console.log(`      - ${user.displayName || 'Unknown'} (${user.email || 'No email'}) [${uid.slice(-8)}]`);
        });
      }
    } else {
      console.log('   ❌ Pool members document not found');
    }

    // Additional analysis if Chuck is found
    if (targetUserId) {
      console.log(`\n✅ ANALYSIS COMPLETE FOR CHUCK UPSHUR (${targetUserId})`);
      console.log(`\n📋 SUMMARY FOR CHUCK UPSHUR:`);
      console.log(`============================`);
      console.log(`• Expected: Week 1 Tampa helmet visible, Week 2 pick exists`);
      console.log(`• Display shows: "Pick History (1 weeks)" but no helmet`);
      console.log(`• Root cause: Check helmet rendering logic and Week 2 data integrity`);
    }

  } catch (error) {
    console.error('Error debugging Chuck Upshur data:', error);
  }
}

debugChuckUpshurData().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('Debug failed:', error);
  process.exit(1);
});