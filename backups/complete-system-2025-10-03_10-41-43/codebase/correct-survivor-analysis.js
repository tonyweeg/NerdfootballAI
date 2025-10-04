#!/usr/bin/env node

/**
 * 🎯 CORRECT SURVIVOR ANALYSIS
 * Use embedded survivor data (alive field + pickHistory) instead of wrong cross-referencing
 */

const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function correctSurvivorAnalysis() {
  console.log('🎯 CORRECT SURVIVOR ANALYSIS USING EMBEDDED DATA\n');

  try {
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    // Step 1: Load pool members with embedded survivor data
    console.log('1️⃣ Loading pool members with embedded survivor data...');
    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const allUserIds = Object.keys(poolData);
    console.log(`✅ Found ${allUserIds.length} pool members`);

    // Step 2: Categorize users by survivor status
    console.log('\n2️⃣ Analyzing embedded survivor data...');

    const stillAlive = [];           // alive >= 3 (survived Week 2)
    const eliminatedWeek1 = [];      // alive == 1
    const eliminatedWeek2 = [];      // alive == 2
    const noSurvivorData = [];       // no survivor field

    for (const userId of allUserIds) {
      const userData = poolData[userId];
      const survivorData = userData.survivor;

      const playerInfo = {
        name: userData.displayName || userData.name || 'Unknown',
        userId: userId,
        email: userData.email || userData.emailAddress || 'No email',
        alive: survivorData ? survivorData.alive : null,
        pickHistory: survivorData ? survivorData.pickHistory : null,
        totalPicks: survivorData ? survivorData.totalPicks : null
      };

      if (!survivorData) {
        noSurvivorData.push(playerInfo);
      } else if (survivorData.alive >= 3) {
        stillAlive.push(playerInfo);
      } else if (survivorData.alive === 2) {
        eliminatedWeek2.push(playerInfo);
      } else if (survivorData.alive === 1) {
        eliminatedWeek1.push(playerInfo);
      } else {
        // alive field has unexpected value
        console.log(`⚠️ Unexpected alive value for ${playerInfo.name}: ${survivorData.alive}`);
        noSurvivorData.push(playerInfo);
      }
    }

    // Step 3: Display results
    console.log('\n' + '='.repeat(80));
    console.log('🎯 CORRECT SURVIVOR ANALYSIS RESULTS');
    console.log('='.repeat(80));

    console.log(`📊 Total Pool Members: ${allUserIds.length}`);
    console.log(`✅ Still Alive (alive >= 3): ${stillAlive.length}`);
    console.log(`💀 Eliminated Week 1 (alive == 1): ${eliminatedWeek1.length}`);
    console.log(`💀 Eliminated Week 2 (alive == 2): ${eliminatedWeek2.length}`);
    console.log(`❓ No Survivor Data: ${noSurvivorData.length}`);

    // Still Alive (survived Week 2)
    if (stillAlive.length > 0) {
      console.log('\n✅ STILL ALIVE AFTER WEEK 2:');
      console.log('NAME | USERID | EMAIL | ALIVE | PICK HISTORY | TOTAL PICKS');
      console.log('-'.repeat(100));
      stillAlive.forEach(player => {
        console.log(`${player.name} | ${player.userId.substring(0,8)} | ${player.email} | ${player.alive} | ${player.pickHistory || 'None'} | ${player.totalPicks || 0}`);
      });
    }

    // Week 1 Eliminations
    if (eliminatedWeek1.length > 0) {
      console.log('\n💀 ELIMINATED IN WEEK 1:');
      console.log('NAME | USERID | EMAIL | ALIVE | PICK HISTORY | TOTAL PICKS');
      console.log('-'.repeat(100));
      eliminatedWeek1.forEach(player => {
        console.log(`${player.name} | ${player.userId.substring(0,8)} | ${player.email} | ${player.alive} | ${player.pickHistory || 'None'} | ${player.totalPicks || 0}`);
      });
    }

    // Week 2 Eliminations
    if (eliminatedWeek2.length > 0) {
      console.log('\n💀 ELIMINATED IN WEEK 2:');
      console.log('NAME | USERID | EMAIL | ALIVE | PICK HISTORY | TOTAL PICKS');
      console.log('-'.repeat(100));
      eliminatedWeek2.forEach(player => {
        console.log(`${player.name} | ${player.userId.substring(0,8)} | ${player.email} | ${player.alive} | ${player.pickHistory || 'None'} | ${player.totalPicks || 0}`);
      });
    }

    // No Survivor Data
    if (noSurvivorData.length > 0) {
      console.log('\n❓ NO SURVIVOR DATA (need to check individual pick documents):');
      console.log('NAME | USERID | EMAIL');
      console.log('-'.repeat(80));
      noSurvivorData.forEach(player => {
        console.log(`${player.name} | ${player.userId.substring(0,8)} | ${player.email}`);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL CORRECT SUMMARY:');
    console.log('='.repeat(80));
    console.log(`🏆 SURVIVORS AFTER WEEK 2: ${stillAlive.length} players`);
    console.log(`💀 TOTAL ELIMINATED: ${eliminatedWeek1.length + eliminatedWeek2.length} players`);
    console.log(`   - Week 1: ${eliminatedWeek1.length} eliminated`);
    console.log(`   - Week 2: ${eliminatedWeek2.length} eliminated`);
    console.log(`❓ Need Manual Check: ${noSurvivorData.length} players`);

    return {
      stillAlive,
      eliminatedWeek1,
      eliminatedWeek2,
      noSurvivorData,
      success: true
    };

  } catch (error) {
    console.error('❌ ANALYSIS ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  correctSurvivorAnalysis().then((result) => {
    if (result.success) {
      console.log('\n🎯 Correct survivor analysis completed!');
      process.exit(0);
    } else {
      console.log('\n💥 Analysis failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Analysis error:', error);
    process.exit(1);
  });
}

module.exports = { correctSurvivorAnalysis };