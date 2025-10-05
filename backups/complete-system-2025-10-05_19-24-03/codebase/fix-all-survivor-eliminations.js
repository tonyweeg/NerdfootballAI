#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixAllSurvivorEliminations() {
  console.log('🚨 COMPREHENSIVE SURVIVOR ELIMINATION FIX - ALL WEEKS\n');
  console.log('Checking ALL survivor picks against CORRECTED ESPN data...\n');

  try {
    // Load corrected ESPN cache
    console.log('📡 Loading corrected ESPN cache...');
    const cacheDoc = await db.doc('cache/espn_current_data').get();
    if (!cacheDoc.exists) {
      console.error('❌ ESPN cache not found - run ESPN cache fix first!');
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

    // Get current week
    const getCurrentWeek = () => {
      const now = new Date();
      const seasonStart = new Date('2025-09-04');
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (now < seasonStart) return 1;
      const weeksSinceStart = Math.floor((now - seasonStart) / weekMs) + 1;
      return Math.min(Math.max(weeksSinceStart, 1), 18);
    };

    const currentWeek = getCurrentWeek();
    console.log(`📅 Current week: ${currentWeek}`);
    console.log(`🔍 Analyzing eliminations for weeks 1-${currentWeek}\n`);

    let eliminationUpdates = [];
    let stillAliveCount = 0;
    let eliminatedCount = 0;

    console.log('👥 CHECKING EACH SURVIVOR PARTICIPANT:');
    console.log('=====================================');

    for (const [userId, memberData] of Object.entries(poolMembers)) {
      if (!memberData.survivor || !memberData.participation?.survivor?.enabled) {
        continue; // Skip non-survivor participants
      }

      const userName = memberData.displayName || 'Unknown';
      console.log(`\n🔍 Analyzing: ${userName} (${userId})`);

      // Parse their pick history
      let picks = [];
      if (memberData.survivor.pickHistory) {
        picks = memberData.survivor.pickHistory.split(', ').filter(pick => pick && pick.trim());
      }

      console.log(`   Pick history: [${picks.map(p => `"${p}"`).join(', ')}]`);
      console.log(`   Current status: ${memberData.survivor.alive} (${memberData.survivor.alive === 18 ? 'ALIVE' : `ELIMINATED Week ${memberData.survivor.alive}`})`);

      // Check each pick against corrected results
      let eliminationWeek = null;
      let stillAlive = true;

      for (let week = 1; week <= Math.min(picks.length, currentWeek); week++) {
        const pick = picks[week - 1]?.trim();
        if (!pick) continue;

        // Check if this team won in this week
        const teamKey = `${pick}_${week}`;
        const result = cacheData.teamResults[teamKey];

        console.log(`   Week ${week}: Picked "${pick}"`);

        if (!result || result.result !== 'W') {
          // This team lost or no result found - user is eliminated
          eliminationWeek = week;
          stillAlive = false;
          console.log(`   ❌ ELIMINATED in Week ${week} - ${pick} lost!`);
          break;
        } else {
          console.log(`   ✅ Week ${week} - ${pick} won`);
        }
      }

      // Determine correct survivor status
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

      // Check if update is needed
      const currentStatus = memberData.survivor.alive;
      const currentEliminationWeek = memberData.survivor.eliminationWeek;

      if (currentStatus !== correctStatus || currentEliminationWeek !== correctEliminationWeek) {
        console.log(`   🔧 UPDATE NEEDED:`);
        console.log(`      Current: alive=${currentStatus}, eliminationWeek=${currentEliminationWeek}`);
        console.log(`      Correct: alive=${correctStatus}, eliminationWeek=${correctEliminationWeek}`);

        eliminationUpdates.push({
          userId,
          userName,
          currentStatus,
          correctStatus,
          currentEliminationWeek,
          correctEliminationWeek,
          picks: picks.slice()
        });
      } else {
        console.log(`   ✅ STATUS CORRECT - No update needed`);
      }
    }

    console.log('\n📊 ELIMINATION ANALYSIS SUMMARY:');
    console.log('================================');
    console.log(`Still alive: ${stillAliveCount}`);
    console.log(`Eliminated: ${eliminatedCount}`);
    console.log(`Updates needed: ${eliminationUpdates.length}`);

    if (eliminationUpdates.length === 0) {
      console.log('\n🎯 All survivor statuses are already correct!');
      return { success: true, updatesNeeded: 0 };
    }

    console.log('\n🔧 APPLYING SURVIVOR STATUS CORRECTIONS:');
    console.log('========================================');

    const batch = db.batch();
    let updateCount = 0;

    for (const update of eliminationUpdates) {
      console.log(`\n🔄 Updating ${update.userName}:`);
      console.log(`   ${update.currentStatus} → ${update.correctStatus}`);
      console.log(`   eliminationWeek: ${update.currentEliminationWeek} → ${update.correctEliminationWeek}`);

      const userDocRef = db.doc(`artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members`);

      batch.update(userDocRef, {
        [`${update.userId}.survivor.alive`]: update.correctStatus,
        [`${update.userId}.survivor.eliminationWeek`]: update.correctEliminationWeek,
        [`${update.userId}.survivor.lastUpdated`]: new Date().toISOString(),
        [`${update.userId}.survivor.correctionApplied`]: true,
        [`${update.userId}.survivor.correctionTimestamp`]: Date.now()
      });

      updateCount++;
    }

    // Commit all updates
    console.log(`\n💾 Committing ${updateCount} survivor status updates...`);
    await batch.commit();

    console.log('\n🎯 COMPREHENSIVE SURVIVOR FIX COMPLETED!');
    console.log('========================================');
    console.log(`✅ Total updates applied: ${updateCount}`);
    console.log(`✅ Still alive: ${stillAliveCount}`);
    console.log(`✅ Correctly eliminated: ${eliminatedCount}`);
    console.log(`✅ Data integrity restored for all ${Object.keys(poolMembers).length} participants`);

    console.log('\n🚨 CRITICAL CORRECTIONS APPLIED:');
    eliminationUpdates.forEach(update => {
      if (update.correctStatus < 18) {
        console.log(`❌ ${update.userName}: Eliminated Week ${update.correctStatus}`);
      } else {
        console.log(`✅ ${update.userName}: Still alive`);
      }
    });

    return {
      success: true,
      updatesApplied: updateCount,
      stillAlive: stillAliveCount,
      eliminated: eliminatedCount,
      corrections: eliminationUpdates
    };

  } catch (error) {
    console.error('❌ Error fixing survivor eliminations:', error);
    return { success: false, error: error.message };
  }
}

fixAllSurvivorEliminations().then((result) => {
  if (result.success) {
    console.log('\n🎯 SURVIVOR ELIMINATION FIX SUCCESSFUL!');
  } else {
    console.log('\n❌ SURVIVOR ELIMINATION FIX FAILED:', result.error);
  }
  process.exit(0);
});