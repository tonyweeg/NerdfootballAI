#!/usr/bin/env node

/**
 * 🎯 CALCULATE WEEK 2 SURVIVORS - CORRECTED VERSION
 * Use "winner" field from game results to determine survivors
 */

const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function calculateWeek2SurvivorsCorrect() {
  console.log('🎯 CALCULATING WEEK 2 SURVIVORS (CORRECTED)\n');

  try {
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    // Step 1: Get pool members
    console.log('1️⃣ Loading pool members...');
    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const allUserIds = Object.keys(poolData);
    console.log(`✅ Found ${allUserIds.length} pool members`);

    // Step 2: Get Week 2 game results
    console.log('\n2️⃣ Loading Week 2 game results...');
    const week2ResultsPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/2';
    const week2ResultsDoc = await db.doc(week2ResultsPath).get();

    let week2Results = {};
    if (week2ResultsDoc.exists) {
      week2Results = week2ResultsDoc.data();
      console.log(`✅ Found Week 2 results: ${Object.keys(week2Results).length} games`);

      // Show winning teams
      console.log('\n🏆 Week 2 winning teams:');
      Object.entries(week2Results).forEach(([gameId, game]) => {
        if (game.winner) {
          console.log(`   Game ${gameId}: ${game.winner} won (${game.homeScore}-${game.awayScore})`);
        }
      });
    } else {
      console.log('❌ No Week 2 results found');
      return { success: false, error: 'No Week 2 results available' };
    }

    // Create lookup of winning teams
    const winningTeams = new Set();
    Object.values(week2Results).forEach(game => {
      if (game.winner) {
        winningTeams.add(game.winner);
      }
    });

    console.log(`\n🏆 Total winning teams in Week 2: ${winningTeams.size}`);
    console.log('Winning teams:', Array.from(winningTeams).join(', '));

    // Step 3: Analyze Week 2 picks vs winning teams
    console.log('\n3️⃣ Analyzing Week 2 picks vs winning teams...');

    let week2PickersCount = 0;
    let week2SurvivorsCount = 0;
    let week2EliminatedCount = 0;
    const survivorDetails = [];
    const eliminatedDetails = [];

    for (const userId of allUserIds) {
      const userPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;

      try {
        const userPicksDoc = await db.doc(userPicksPath).get();

        if (userPicksDoc.exists) {
          const picksData = userPicksDoc.data();

          // Check if user made Week 2 pick
          if (picksData.picks && picksData.picks['2']) {
            week2PickersCount++;
            const userName = poolData[userId].displayName;
            const week2Pick = picksData.picks['2'];
            const pickedTeam = week2Pick.team;

            // Check if picked team won
            const teamWon = winningTeams.has(pickedTeam);

            if (teamWon) {
              week2SurvivorsCount++;
              console.log(`   ✅ ${userName}: ${pickedTeam} WON - SURVIVED`);
              survivorDetails.push({
                name: userName,
                team: pickedTeam,
                result: 'WON'
              });
            } else {
              week2EliminatedCount++;
              console.log(`   💀 ${userName}: ${pickedTeam} LOST - ELIMINATED`);
              eliminatedDetails.push({
                name: userName,
                team: pickedTeam,
                result: 'LOST'
              });
            }
          }
        }
      } catch (error) {
        // Skip users without pick documents
      }
    }

    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 WEEK 2 SURVIVOR ANALYSIS RESULTS');
    console.log('='.repeat(60));
    console.log(`📊 Users who made Week 2 picks: ${week2PickersCount}`);
    console.log(`✅ Survivors after Week 2: ${week2SurvivorsCount}`);
    console.log(`💀 Eliminated in Week 2: ${week2EliminatedCount}`);

    if (survivorDetails.length > 0) {
      console.log('\n✅ SURVIVORS AFTER WEEK 2:');
      survivorDetails.forEach(survivor => {
        console.log(`   ${survivor.name}: ${survivor.team}`);
      });
    }

    if (eliminatedDetails.length > 0) {
      console.log('\n💀 ELIMINATED IN WEEK 2:');
      eliminatedDetails.forEach(eliminated => {
        console.log(`   ${eliminated.name}: ${eliminated.team}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎯 FINAL ANSWER: ${week2SurvivorsCount} users are alive after Week 2`);
    console.log('='.repeat(60));

    return {
      week2Pickers: week2PickersCount,
      week2Survivors: week2SurvivorsCount,
      week2Eliminated: week2EliminatedCount,
      survivorDetails,
      eliminatedDetails,
      success: true
    };

  } catch (error) {
    console.error('❌ CALCULATION ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  calculateWeek2SurvivorsCorrect().then((result) => {
    if (result.success) {
      process.exit(0);
    } else {
      console.log('\n💥 Calculation failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Calculation error:', error);
    process.exit(1);
  });
}

module.exports = { calculateWeek2SurvivorsCorrect };