#!/usr/bin/env node

/**
 * 🎯 WEEK-BY-WEEK SURVIVOR BREAKDOWN
 * Create distinct lists for Week 1 and Week 2 winners/losers with full details
 */

const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function createWeekByWeekBreakdown() {
  console.log('🎯 CREATING WEEK-BY-WEEK SURVIVOR BREAKDOWN\n');

  try {
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    // Step 1: Load pool members (names, emails, userids)
    console.log('1️⃣ Loading pool members with full details...');
    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const allUserIds = Object.keys(poolData);
    console.log(`✅ Found ${allUserIds.length} pool members`);

    // Step 2: Load Week 1 and Week 2 game results
    console.log('\n2️⃣ Loading game results...');

    // Week 1 Results
    const week1ResultsDoc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/1').get();
    const week1Results = week1ResultsDoc.exists ? week1ResultsDoc.data() : {};
    const week1Winners = new Set();
    Object.values(week1Results).forEach(game => {
      if (game.winner) week1Winners.add(game.winner);
    });
    console.log(`📊 Week 1: ${week1Winners.size} winning teams`);

    // Week 2 Results
    const week2ResultsDoc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/2').get();
    const week2Results = week2ResultsDoc.exists ? week2ResultsDoc.data() : {};
    const week2Winners = new Set();
    Object.values(week2Results).forEach(game => {
      if (game.winner) week2Winners.add(game.winner);
    });
    console.log(`📊 Week 2: ${week2Winners.size} winning teams`);

    // Step 3: Analyze Week 1 picks vs results
    console.log('\n3️⃣ Analyzing Week 1 picks vs results...');

    const week1Survivors = [];
    const week1Eliminated = [];

    for (const userId of allUserIds) {
      const userPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;

      try {
        const userPicksDoc = await db.doc(userPicksPath).get();

        if (userPicksDoc.exists) {
          const picksData = userPicksDoc.data();

          if (picksData.picks && picksData.picks['1']) {
            const userData = poolData[userId];
            const week1Pick = picksData.picks['1'];
            const pickedTeam = week1Pick.team;
            const teamWon = week1Winners.has(pickedTeam);

            const playerInfo = {
              name: userData.displayName || userData.name || 'Unknown',
              userId: userId,
              email: userData.email || userData.emailAddress || 'No email',
              team: pickedTeam,
              result: teamWon ? 'WON' : 'LOST'
            };

            if (teamWon) {
              week1Survivors.push(playerInfo);
            } else {
              week1Eliminated.push(playerInfo);
            }
          }
        }
      } catch (error) {
        // Skip users without pick documents
      }
    }

    // Step 4: Analyze Week 2 picks vs results (only for Week 1 survivors)
    console.log('\n4️⃣ Analyzing Week 2 picks vs results...');

    const week2Survivors = [];
    const week2Eliminated = [];

    // Only check Week 2 for people who survived Week 1
    const week1SurvivorIds = week1Survivors.map(s => s.userId);

    for (const userId of week1SurvivorIds) {
      const userPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;

      try {
        const userPicksDoc = await db.doc(userPicksPath).get();

        if (userPicksDoc.exists) {
          const picksData = userPicksDoc.data();

          if (picksData.picks && picksData.picks['2']) {
            const userData = poolData[userId];
            const week2Pick = picksData.picks['2'];
            const pickedTeam = week2Pick.team;
            const teamWon = week2Winners.has(pickedTeam);

            const playerInfo = {
              name: userData.displayName || userData.name || 'Unknown',
              userId: userId,
              email: userData.email || userData.emailAddress || 'No email',
              team: pickedTeam,
              result: teamWon ? 'WON' : 'LOST'
            };

            if (teamWon) {
              week2Survivors.push(playerInfo);
            } else {
              week2Eliminated.push(playerInfo);
            }
          }
        }
      } catch (error) {
        // Skip users without pick documents
      }
    }

    // Step 5: Display results
    console.log('\n' + '='.repeat(80));
    console.log('🎯 WEEK-BY-WEEK SURVIVOR BREAKDOWN');
    console.log('='.repeat(80));

    // Week 1 Results
    console.log('\n📅 WEEK 1 RESULTS:');
    console.log(`✅ Week 1 Survivors: ${week1Survivors.length}`);
    console.log(`💀 Week 1 Eliminated: ${week1Eliminated.length}`);
    console.log(`📊 Total Week 1 Participants: ${week1Survivors.length + week1Eliminated.length}`);

    console.log('\n✅ WEEK 1 SURVIVORS (ADVANCED TO WEEK 2):');
    console.log('NAME | USERID | EMAIL | TEAM PICKED | RESULT');
    console.log('-'.repeat(80));
    week1Survivors.forEach(player => {
      console.log(`${player.name} | ${player.userId.substring(0,8)} | ${player.email} | ${player.team} | ${player.result}`);
    });

    console.log('\n💀 WEEK 1 ELIMINATIONS:');
    console.log('NAME | USERID | EMAIL | TEAM PICKED | RESULT');
    console.log('-'.repeat(80));
    week1Eliminated.forEach(player => {
      console.log(`${player.name} | ${player.userId.substring(0,8)} | ${player.email} | ${player.team} | ${player.result}`);
    });

    // Week 2 Results
    console.log('\n📅 WEEK 2 RESULTS:');
    console.log(`✅ Week 2 Survivors: ${week2Survivors.length}`);
    console.log(`💀 Week 2 Eliminated: ${week2Eliminated.length}`);
    console.log(`📊 Total Week 2 Participants: ${week2Survivors.length + week2Eliminated.length}`);

    console.log('\n✅ WEEK 2 SURVIVORS (STILL ALIVE):');
    console.log('NAME | USERID | EMAIL | TEAM PICKED | RESULT');
    console.log('-'.repeat(80));
    week2Survivors.forEach(player => {
      console.log(`${player.name} | ${player.userId.substring(0,8)} | ${player.email} | ${player.team} | ${player.result}`);
    });

    console.log('\n💀 WEEK 2 ELIMINATIONS:');
    console.log('NAME | USERID | EMAIL | TEAM PICKED | RESULT');
    console.log('-'.repeat(80));
    week2Eliminated.forEach(player => {
      console.log(`${player.name} | ${player.userId.substring(0,8)} | ${player.email} | ${player.team} | ${player.result}`);
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL SUMMARY:');
    console.log('='.repeat(80));
    console.log(`🎯 Pool Started: ${week1Survivors.length + week1Eliminated.length} players`);
    console.log(`📈 After Week 1: ${week1Survivors.length} survivors, ${week1Eliminated.length} eliminated`);
    console.log(`📈 After Week 2: ${week2Survivors.length} survivors, ${week2Eliminated.length} more eliminated`);
    console.log(`🏆 CURRENT SURVIVORS: ${week2Survivors.length} players still alive`);
    console.log(`💀 TOTAL ELIMINATED: ${week1Eliminated.length + week2Eliminated.length} players`);

    return {
      week1Survivors,
      week1Eliminated,
      week2Survivors,
      week2Eliminated,
      success: true
    };

  } catch (error) {
    console.error('❌ BREAKDOWN ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  createWeekByWeekBreakdown().then((result) => {
    if (result.success) {
      console.log('\n🎯 Week-by-week breakdown completed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Breakdown failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Breakdown error:', error);
    process.exit(1);
  });
}

module.exports = { createWeekByWeekBreakdown };