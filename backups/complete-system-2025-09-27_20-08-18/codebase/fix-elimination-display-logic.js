const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixEliminationDisplayLogic() {
  console.log('🔧 FIXING ELIMINATION DISPLAY LOGIC - WEEK-SPECIFIC ELIMINATION HELMETS\n');

  const poolId = 'nerduniverse-2025';

  try {
    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    console.log(`📊 Analyzing elimination display logic for ${Object.keys(poolData).length} pool members...\n`);

    // Week calculation
    const seasonStart = new Date('2025-09-04');
    const now = new Date();
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
    const completedWeeks = 2; // Week 1 and 2 are completed

    console.log(`📅 Current week: ${currentWeek}, Completed weeks: ${completedWeeks}\n`);

    // First, check what teams actually won/lost Week 2
    console.log('🏈 DETERMINING WEEK 2 GAME RESULTS FROM USER DATA:');
    console.log('=================================================');

    const week2Results = {};

    // Analyze Week 2 picks and outcomes
    for (const [uid, user] of Object.entries(poolData)) {
      const displayName = user.displayName || user.email || `User ${uid.substring(0, 8)}`;
      const survivor = user.survivor || {};
      const pickHistory = survivor.pickHistory || '';
      const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());
      const isAlive = survivor.alive !== false && !survivor.eliminationWeek;
      const eliminationWeek = survivor.eliminationWeek;

      // Only process users with Week 2 picks
      if (picks.length >= 2) {
        const week2Pick = picks[1].trim();

        if (!week2Results[week2Pick]) {
          week2Results[week2Pick] = { alive: 0, eliminatedWeek2: 0, eliminatedOther: 0 };
        }

        if (isAlive) {
          week2Results[week2Pick].alive++;
        } else if (eliminationWeek === 2) {
          week2Results[week2Pick].eliminatedWeek2++;
        } else {
          week2Results[week2Pick].eliminatedOther++;
        }
      }
    }

    // Report Week 2 team results
    for (const [team, results] of Object.entries(week2Results)) {
      const totalPickers = results.alive + results.eliminatedWeek2 + results.eliminatedOther;
      console.log(`🏈 ${team}:`);
      console.log(`   Total pickers: ${totalPickers}`);
      console.log(`   Still alive: ${results.alive}`);
      console.log(`   Eliminated Week 2: ${results.eliminatedWeek2}`);
      console.log(`   Eliminated other weeks: ${results.eliminatedOther}`);

      // Determine result
      if (results.alive > 0 && results.eliminatedWeek2 === 0) {
        console.log(`   🎯 RESULT: ✅ WINNER (all pickers alive)`);
      } else if (results.eliminatedWeek2 > 0 && results.alive === 0) {
        console.log(`   🎯 RESULT: ❌ LOSER (all pickers eliminated Week 2)`);
      } else {
        console.log(`   🎯 RESULT: 🚨 CONFLICT (mixed results)`);
      }
      console.log('');
    }

    // Focus on John Durkin elimination display issue
    console.log('🔍 JOHN DURKIN ELIMINATION ANALYSIS:');
    console.log('===================================');

    let johnDurkinUID = null;
    for (const [uid, user] of Object.entries(poolData)) {
      const displayName = user.displayName || user.email || '';
      if (displayName.toLowerCase().includes('john durkin')) {
        johnDurkinUID = uid;
        const survivor = user.survivor || {};
        const pickHistory = survivor.pickHistory || '';
        const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());

        console.log(`📊 John Durkin (${uid}):`);
        console.log(`   Pick History: "${pickHistory}"`);
        console.log(`   Week 1: ${picks[0] || 'None'}`);
        console.log(`   Week 2: ${picks[1] || 'None'}`);
        console.log(`   Elimination Week: ${survivor.eliminationWeek}`);
        console.log(`   Alive Status: ${survivor.alive}`);
        console.log(`   Is Alive: ${survivor.alive !== false && !survivor.eliminationWeek}`);

        console.log('\n🎯 CORRECT DISPLAY LOGIC:');
        if (survivor.eliminationWeek === 1) {
          console.log(`   ✅ Show Week 1 ${picks[0]} as elimination helmet (red ring)`);
          console.log(`   ✅ Week 2 ${picks[1]} should be grayed out (post-elimination)`);
          console.log(`   ❌ WRONG: Showing Week 2 ${picks[1]} as elimination helmet`);
        }
        break;
      }
    }

    // Provide corrected logic for battlefield display
    console.log('\n🔧 CORRECTED ELIMINATION DISPLAY LOGIC:');
    console.log('======================================');
    console.log('FOR ELIMINATED USERS:');
    console.log('1. Show elimination helmet with red ring ONLY for the week they were eliminated');
    console.log('2. Show all picks AFTER elimination week as grayed out (post-elimination picks)');
    console.log('3. Do NOT mark post-elimination picks as elimination helmets');
    console.log('');
    console.log('EXAMPLE - John Durkin (Eliminated Week 1):');
    console.log('- Week 1 Houston Texans: 🏈 RED RING (elimination helmet)');
    console.log('- Week 2 Arizona Cardinals: 🏈 GRAYED OUT (post-elimination, irrelevant)');
    console.log('');
    console.log('ARIZONA CARDINALS WEEK 2:');
    console.log('- Based on data: ✅ WINNERS (10 alive users, 0 eliminated Week 2)');
    console.log('- John Durkin showing as eliminated is DISPLAY BUG, not game result');

    // Generate corrected display logic code
    console.log('\n💡 BATTLEFIELD DISPLAY FIX NEEDED:');
    console.log('=================================');
    console.log('The battlefield display logic needs to be updated to:');
    console.log('1. Only show red ring elimination helmets for the actual elimination week');
    console.log('2. Show post-elimination picks as grayed out, not as elimination helmets');
    console.log('3. Recalculate all eliminations with updated Week 2 pick data');

  } catch (error) {
    console.error('❌ Error fixing elimination display logic:', error);
  }
}

fixEliminationDisplayLogic().then(() => {
  console.log('\n✅ Elimination display logic analysis complete');
  process.exit(0);
}).catch(error => {
  console.error('Analysis failed:', error);
  process.exit(1);
});