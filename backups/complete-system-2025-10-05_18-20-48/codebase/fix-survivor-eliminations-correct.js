#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixSurvivorEliminationsCorrect() {
  console.log('🚨 CORRECTED SURVIVOR ELIMINATION FIX - ONLY COMPLETED WEEKS\n');
  console.log('⚠️  CRITICAL: Only processing games that have ACTUALLY been played!\n');

  try {
    // Load corrected ESPN cache
    console.log('📡 Loading corrected ESPN cache...');
    const cacheDoc = await db.doc('cache/espn_current_data').get();
    if (!cacheDoc.exists) {
      console.error('❌ ESPN cache not found');
      return;
    }

    const cacheData = cacheDoc.data();
    console.log(`✅ ESPN cache loaded (version: ${cacheData.version})`);

    // Load pool members
    console.log('📡 Loading pool members...');
    const poolMembersDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
    if (!poolMembersDoc.exists) {
      console.error('❌ Pool members not found');
      return;
    }

    const poolMembers = poolMembersDoc.data();
    console.log(`✅ Loaded ${Object.keys(poolMembers).length} pool members\n`);

    // CRITICAL: Determine COMPLETED weeks only
    const today = new Date();
    const seasonStart = new Date('2025-09-04');
    const now = new Date();

    console.log('📅 DATE ANALYSIS:');
    console.log('================');
    console.log(`Today: ${today.toDateString()}`);
    console.log(`Season start: ${seasonStart.toDateString()}`);

    // Week 1: Sep 4-10, Week 2: Sep 11-17, Week 3: Sep 18-24
    let completedWeeks;
    if (now < new Date('2025-09-11')) {
      completedWeeks = 0; // Week 1 not yet complete
    } else if (now < new Date('2025-09-18')) {
      completedWeeks = 1; // Only Week 1 complete
    } else if (now < new Date('2025-09-25')) {
      completedWeeks = 2; // Weeks 1-2 complete, Week 3 in progress
    } else {
      completedWeeks = 2; // Conservative - only process first 2 weeks for now
    }

    console.log(`🏈 COMPLETED WEEKS: ${completedWeeks}`);
    console.log(`⚠️  Week 3 games: IN PROGRESS or NOT YET PLAYED`);
    console.log(`🚨 ONLY PROCESSING WEEKS 1-${completedWeeks}\n`);

    if (completedWeeks === 0) {
      console.log('❌ No weeks completed yet - no eliminations to process');
      return;
    }

    let eliminationUpdates = [];
    let stillAliveCount = 0;
    let eliminatedCount = 0;

    console.log('👥 CHECKING SURVIVOR PARTICIPANTS (COMPLETED WEEKS ONLY):');
    console.log('========================================================');

    for (const [userId, memberData] of Object.entries(poolMembers)) {
      if (!memberData.survivor || !memberData.participation?.survivor?.enabled) {
        continue;
      }

      const userName = memberData.displayName || 'Unknown';
      console.log(`\n🔍 Analyzing: ${userName}`);

      // Parse their pick history
      let picks = [];
      if (memberData.survivor.pickHistory) {
        picks = memberData.survivor.pickHistory.split(', ').filter(pick => pick && pick.trim());
      }

      console.log(`   Pick history: [${picks.map(p => `"${p}"`).join(', ')}]`);
      console.log(`   Current status: ${memberData.survivor.alive}`);

      // Check ONLY completed weeks
      let eliminationWeek = null;
      let stillAlive = true;

      for (let week = 1; week <= Math.min(picks.length, completedWeeks); week++) {
        const pick = picks[week - 1]?.trim();
        if (!pick) continue;

        const teamKey = `${pick}_${week}`;
        const result = cacheData.teamResults[teamKey];

        console.log(`   Week ${week}: Picked "${pick}"`);

        if (!result || result.result !== 'W') {
          eliminationWeek = week;
          stillAlive = false;
          console.log(`   ❌ ELIMINATED Week ${week} - ${pick} lost!`);
          break;
        } else {
          console.log(`   ✅ Week ${week} - ${pick} won`);
        }
      }

      // Don't process picks beyond completed weeks
      if (picks.length > completedWeeks) {
        const futurePicks = picks.slice(completedWeeks);
        console.log(`   ⏳ Future picks (not processed): [${futurePicks.map(p => `"${p}"`).join(', ')}]`);
      }

      // Determine correct status
      let correctStatus, correctEliminationWeek;

      if (stillAlive) {
        correctStatus = 18; // Still alive
        correctEliminationWeek = null;
        stillAliveCount++;
        console.log(`   🏆 SHOULD BE: ALIVE (status 18)`);
      } else {
        correctStatus = eliminationWeek;
        correctEliminationWeek = eliminationWeek;
        eliminatedCount++;
        console.log(`   💀 SHOULD BE: ELIMINATED Week ${eliminationWeek}`);
      }

      // Check if update needed
      const currentStatus = memberData.survivor.alive;
      const currentEliminationWeek = memberData.survivor.eliminationWeek;

      if (currentStatus !== correctStatus || currentEliminationWeek !== correctEliminationWeek) {
        console.log(`   🔧 UPDATE NEEDED: ${currentStatus} → ${correctStatus}`);
        eliminationUpdates.push({
          userId,
          userName,
          currentStatus,
          correctStatus,
          currentEliminationWeek,
          correctEliminationWeek
        });
      } else {
        console.log(`   ✅ STATUS CORRECT`);
      }
    }

    console.log('\n📊 CORRECTED ANALYSIS (COMPLETED WEEKS ONLY):');
    console.log('=============================================');
    console.log(`Weeks processed: 1-${completedWeeks}`);
    console.log(`Still alive: ${stillAliveCount}`);
    console.log(`Eliminated: ${eliminatedCount}`);
    console.log(`Updates needed: ${eliminationUpdates.length}`);

    if (eliminationUpdates.length === 0) {
      console.log('\n🎯 All survivor statuses correct for completed weeks!');
      return { success: true, updatesNeeded: 0 };
    }

    console.log('\n🔧 APPLYING CORRECTIONS (COMPLETED WEEKS ONLY):');
    console.log('==============================================');

    const batch = db.batch();
    const userDocRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');

    for (const update of eliminationUpdates) {
      console.log(`🔄 ${update.userName}: ${update.currentStatus} → ${update.correctStatus}`);

      batch.update(userDocRef, {
        [`${update.userId}.survivor.alive`]: update.correctStatus,
        [`${update.userId}.survivor.eliminationWeek`]: update.correctEliminationWeek,
        [`${update.userId}.survivor.lastUpdated`]: new Date().toISOString(),
        [`${update.userId}.survivor.correctionApplied`]: true,
        [`${update.userId}.survivor.correctionTimestamp`]: Date.now(),
        [`${update.userId}.survivor.correctionNote`]: `Fixed for completed weeks 1-${completedWeeks} only`
      });
    }

    await batch.commit();

    console.log('\n🎯 CORRECTED SURVIVOR FIX COMPLETED!');
    console.log('===================================');
    console.log(`✅ Updates applied: ${eliminationUpdates.length}`);
    console.log(`✅ Processing limited to completed weeks 1-${completedWeeks}`);
    console.log(`⚠️  Week 3+ picks preserved but not processed`);

    return {
      success: true,
      updatesApplied: eliminationUpdates.length,
      completedWeeks: completedWeeks,
      corrections: eliminationUpdates
    };

  } catch (error) {
    console.error('❌ Error in corrected survivor fix:', error);
    return { success: false, error: error.message };
  }
}

fixSurvivorEliminationsCorrect().then((result) => {
  if (result.success) {
    console.log('\n🎯 CORRECTED SURVIVOR FIX SUCCESSFUL!');
  } else {
    console.log('\n❌ CORRECTED SURVIVOR FIX FAILED:', result.error);
  }
  process.exit(0);
});