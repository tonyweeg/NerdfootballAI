const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findAllDisplayMismatches() {
  console.log('🔍 FINDING ALL POTENTIAL BATTLEFIELD DISPLAY MISMATCHES\n');

  const poolId = 'nerduniverse-2025';

  try {
    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();

      // Week calculation (same as battlefield logic)
      const seasonStart = new Date('2025-09-04');
      const now = new Date();
      const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
      const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
      const currentWeekGamesStarted = false;
      const completedWeeks = currentWeekGamesStarted ? currentWeek : currentWeek - 1;

      console.log(`📅 TIMING: Current week ${currentWeek}, Completed weeks ${completedWeeks}\n`);

      const usersWithMultiplePicks = [];
      const potentialMismatches = [];

      console.log('📊 ALL USERS WITH 2+ PICKS (potential display mismatches):\n');

      for (const [uid, user] of Object.entries(poolData)) {
        if (user.survivor && user.survivor.pickHistory) {
          const picks = user.survivor.pickHistory.split(', ').filter(pick => pick && pick.trim());

          if (picks.length >= 2) {
            const displayName = user.displayName || user.email || `User ${uid.substring(0, 8)}`;

            usersWithMultiplePicks.push({
              uid,
              name: displayName,
              email: user.email || 'No email',
              picks: picks,
              totalPicks: picks.length,
              pickHistory: user.survivor.pickHistory
            });

            // Simulate what should be visible
            const picksToProcess = picks.slice(0, currentWeek);
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

            console.log(`👤 ${displayName}:`);
            console.log(`   Total picks: ${picks.length}`);
            console.log(`   Pick history: "${user.survivor.pickHistory}"`);
            console.log(`   Should show helmets:`);
            visibleHelmets.forEach(helmet => {
              console.log(`      Week ${helmet.week}: ${helmet.teamName}`);
            });
            if (hiddenPicks.length > 0) {
              console.log(`   Should show thinking emojis:`);
              hiddenPicks.forEach(pick => {
                console.log(`      Week ${pick.week}: 🤔 (${pick.teamName})`);
              });
            }
            console.log('');

            // Flag if Week 2 should be visible (potential mismatch)
            if (picks.length >= 2 && completedWeeks >= 2) {
              potentialMismatches.push({
                name: displayName,
                email: user.email,
                week2Pick: picks[1],
                shouldShowWeek2: true
              });
            }
          }
        }
      }

      console.log('\n🚨 USERS WHO SHOULD SHOW WEEK 2 HELMETS:');
      console.log('(If battlefield shows these users as "missing Week 2", it\'s a display bug)\n');

      if (potentialMismatches.length > 0) {
        potentialMismatches.forEach((user, index) => {
          console.log(`${index + 1}. ${user.name} (${user.email})`);
          console.log(`   Week 2 pick: "${user.week2Pick}"`);
          console.log(`   Status: SHOULD show Week 2 helmet ✅`);
          console.log('');
        });
      } else {
        console.log('No users should show Week 2 helmets yet (timing is correct)');
      }

      console.log(`\n📈 SUMMARY:`);
      console.log(`Total pool members: ${Object.keys(poolData).length}`);
      console.log(`Users with 2+ picks: ${usersWithMultiplePicks.length}`);
      console.log(`Users who should show Week 2 helmets: ${potentialMismatches.length}`);

      if (potentialMismatches.length > 0) {
        console.log(`\n🔧 BATTLEFIELD REFRESH NEEDED:`);
        console.log(`If any of these ${potentialMismatches.length} users show as "missing Week 2" on the battlefield,`);
        console.log(`the battlefield display needs to be refreshed or regenerated.`);
      }

    } else {
      console.log('❌ Pool members document not found');
    }

  } catch (error) {
    console.error('Error finding display mismatches:', error);
  }
}

findAllDisplayMismatches().then(() => {
  console.log('\n✅ Display mismatch search complete');
  process.exit(0);
}).catch(error => {
  console.error('Search failed:', error);
  process.exit(1);
});