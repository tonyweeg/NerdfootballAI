const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugSurvivorData() {
  console.log('🔍 EXAMINING ERIK WEEG\'S FIREBASE DATA FOR LOGIC FLAW\n');

  const poolId = 'nerduniverse-2025';
  let targetUserId = null; // We'll find Erik Weeg's ID
  
  try {
    // 1. Find Erik Weeg in pool members
    console.log('1️⃣ SEARCHING FOR ERIK WEEG:');
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();
      console.log(`   Found ${Object.keys(poolData).length} members, searching for Erik Weeg...`);

      // Search for Erik Weeg
      for (const [uid, user] of Object.entries(poolData)) {
        const displayName = (user.displayName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();

        if (displayName.includes('erik') && (displayName.includes('weeg') || email.includes('weeg'))) {
          targetUserId = uid;
          console.log(`   🎯 FOUND ERIK WEEG! User ID: ${uid}`);
          console.log(`      Display Name: ${user.displayName}`);
          console.log(`      Email: ${user.email}`);

          // Detailed analysis of Erik's survivor data
          if (user.survivor) {
            console.log(`\n🏆 ERIK'S SURVIVOR DATA:`);
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
                console.log(`\n🙈 PICKS THAT SHOULD BE HIDDEN:`);
                hiddenPicks.forEach((teamName, index) => {
                  const week = completedWeeks + index + 1;
                  console.log(`  Week ${week}: ${teamName.trim()}`);
                });
              }

              // IDENTIFY POTENTIAL LOGIC FLAWS
              console.log(`\n🚨 POTENTIAL LOGIC FLAWS:`);
              console.log(`========================`);

              if (picks.length > currentWeek) {
                console.log(`⚠️  FLAW 1: User has ${picks.length} picks but current week is ${currentWeek}`);
                console.log(`    This suggests picks beyond the current week exist!`);
              }

              if (picks.length > completedWeeks + 1) {
                console.log(`⚠️  FLAW 2: User has ${picks.length} picks but only ${completedWeeks + 1} weeks have occurred`);
                console.log(`    This suggests future picks are stored and might be displayed!`);
              }

              // Check if the totalPicks field matches array length
              if (user.survivor.totalPicks !== picks.length) {
                console.log(`⚠️  FLAW 3: totalPicks field (${user.survivor.totalPicks}) doesn't match pick array length (${picks.length})`);
              }

              // Security check: display cap logic
              const displayedTotalPicks = Math.min(user.survivor.totalPicks || 0, currentWeek);
              console.log(`\n🛡️  SECURITY CAP ANALYSIS:`);
              console.log(`   Actual total picks: ${user.survivor.totalPicks}`);
              console.log(`   Displayed total picks: ${displayedTotalPicks}`);
              console.log(`   Current week cap: ${currentWeek}`);

              if (displayedTotalPicks < picks.length) {
                console.log(`⚠️  FLAW 4: Displayed picks (${displayedTotalPicks}) < actual picks (${picks.length})`);
                console.log(`    This might hide legitimate picks or reveal the cap is working`);
              }
            }
          } else {
            console.log(`   ❌ No survivor data found for Erik Weeg`);
          }
          break;
        }
      }

      if (!targetUserId) {
        console.log('   ❌ Erik Weeg not found. Available members:');
        Object.entries(poolData).forEach(([uid, user]) => {
          console.log(`      - ${user.displayName || 'Unknown'} (${user.email || 'No email'}) [${uid.slice(-8)}]`);
        });
      }
    } else {
      console.log('   ❌ Pool members document not found');
    }
    // Additional analysis if Erik is found
    if (targetUserId) {
      console.log(`\n✅ ANALYSIS COMPLETE FOR ERIK WEEG (${targetUserId})`);
    }
    
  } catch (error) {
    console.error('Error debugging survivor data:', error);
  }
}

debugSurvivorData().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('Debug failed:', error);
  process.exit(1);
});