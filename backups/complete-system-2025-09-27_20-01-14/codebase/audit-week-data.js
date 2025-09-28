#!/usr/bin/env node

/**
 * 🔍 FIREBASE DATA AUDIT - Week Detection and Data Analysis
 * Audits what week system thinks it is and what data exists for weeks 1-2
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Calculate current NFL week (same logic as survivorAutoUpdate.js)
function getCurrentNflWeek() {
    // NFL 2025 season starts September 4, 2025
    const seasonStart = new Date('2025-09-04T00:00:00Z');
    const now = new Date();
    const diffTime = now.getTime() - seasonStart.getTime();
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

    // Clamp to valid range (1-18)
    return Math.max(1, Math.min(18, diffWeeks));
}

async function auditWeekData() {
  console.log('🔍 FIREBASE DATA AUDIT REPORT');
  console.log('='.repeat(60));

  try {
    // 1. Current week detection
    const currentWeek = getCurrentNflWeek();
    const currentDate = new Date().toISOString().split('T')[0];

    console.log(`📅 Today's Date: ${currentDate}`);
    console.log(`🏈 System Detected Week: ${currentWeek}`);
    console.log(`📊 Season Start: September 4, 2025 (Week 1)`);

    // 2. Check ESPN cache data for current week
    console.log('\n🔍 ESPN CACHE DATA AUDIT:');

    const espnCacheDoc = await db.doc('cache/espn_current_data').get();
    if (espnCacheDoc.exists) {
      const cacheData = espnCacheDoc.data();
      console.log(`   ✅ ESPN cache exists with ${Object.keys(cacheData).length} entries`);

      // Show sample cache entries
      const sampleKeys = Object.keys(cacheData).slice(0, 3);
      sampleKeys.forEach(key => {
        console.log(`   📝 Sample: ${key} (${cacheData[key].status || 'unknown status'})`);
      });
    } else {
      console.log('   ❌ No ESPN cache found');
    }

    // 3. Check weeks 1 and 2 data
    console.log('\n🏈 WEEK DATA AUDIT:');

    for (let week = 1; week <= 2; week++) {
      console.log(`\n--- WEEK ${week} ANALYSIS ---`);

      // Check survivor picks for this week
      const survivorPath = `artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/${week}`;
      const survivorDoc = await db.doc(survivorPath).get();

      if (survivorDoc.exists) {
        const survivorData = survivorDoc.data();
        const userCount = Object.keys(survivorData).length;
        console.log(`   ✅ Survivor picks: ${userCount} users have picks`);

        // Show sample picks
        const sampleUsers = Object.keys(survivorData).slice(0, 2);
        sampleUsers.forEach(userId => {
          const pick = survivorData[userId];
          console.log(`   👤 ${userId.substring(0,8)}: ${pick.team || 'no team'} (${pick.timestamp || 'no timestamp'})`);
        });
      } else {
        console.log(`   ❌ No survivor picks found for week ${week}`);
      }

      // Check individual pick files
      const poolId = 'nerduniverse-2025';
      const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
      const poolDoc = await db.doc(poolMembersPath).get();

      if (poolDoc.exists) {
        const members = poolDoc.data();
        const memberIds = Object.keys(members).slice(0, 2); // Check first 2 members

        for (const memberId of memberIds) {
          const individualPickPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${memberId}`;
          const individualDoc = await db.doc(individualPickPath).get();

          if (individualDoc.exists) {
            const pickData = individualDoc.data();
            const weekPick = pickData.picks && pickData.picks[week];
            if (weekPick) {
              console.log(`   🎯 ${memberId.substring(0,8)} individual pick: ${weekPick.team} (${weekPick.gameDate || 'no date'})`);
            }
          }
        }
      }

      // Check if we have game results for this week
      const gameResultsPath = `artifacts/nerdfootball/gameResults/week${week}`;
      const resultsDoc = await db.doc(gameResultsPath).get();

      if (resultsDoc.exists) {
        const results = resultsDoc.data();
        console.log(`   🏆 Game results: ${Object.keys(results).length} games with results`);
      } else {
        console.log(`   ❌ No game results found for week ${week}`);
      }
    }

    // 4. Check survivor field data in pool members
    console.log('\n👥 SURVIVOR FIELD DATA AUDIT:');

    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const members = poolDoc.data();
      const memberIds = Object.keys(members);

      let aliveCount = 0;
      let eliminatedCount = 0;
      let noSurvivorFieldCount = 0;

      memberIds.forEach(memberId => {
        const member = members[memberId];
        if (member.survivor) {
          if (member.survivor.alive === 18) {
            aliveCount++;
          } else {
            eliminatedCount++;
          }
        } else {
          noSurvivorFieldCount++;
        }
      });

      console.log(`   📊 Total members: ${memberIds.length}`);
      console.log(`   ✅ Alive: ${aliveCount}`);
      console.log(`   💀 Eliminated: ${eliminatedCount}`);
      console.log(`   ❓ No survivor field: ${noSurvivorFieldCount}`);

      // Show sample survivor fields
      const samplesWithSurvivor = memberIds.filter(id => members[id].survivor).slice(0, 3);
      samplesWithSurvivor.forEach(memberId => {
        const survivor = members[memberId].survivor;
        console.log(`   👤 ${members[memberId].displayName || memberId.substring(0,8)}: alive=${survivor.alive}, picks="${survivor.pickHistory}"`);
      });

    } else {
      console.log('   ❌ Pool members document not found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log(`   🗓️  System thinks we're in Week ${currentWeek}`);
    console.log(`   📊 Check Firebase console for detailed data`);
    console.log(`   🎯 Admin interface should show Week ${currentWeek} by default`);

    return {
      currentWeek,
      auditComplete: true
    };

  } catch (error) {
    console.error('❌ AUDIT ERROR:', error);
    return {
      currentWeek: null,
      auditComplete: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  auditWeekData().then((result) => {
    if (result.auditComplete) {
      console.log('\n✅ Audit completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Audit failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Audit failed:', error);
    process.exit(1);
  });
}

module.exports = { auditWeekData, getCurrentNflWeek };