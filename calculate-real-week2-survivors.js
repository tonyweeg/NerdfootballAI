#!/usr/bin/env node

/**
 * 🎯 CALCULATE REAL WEEK 2 SURVIVORS
 * Cross-reference Week 2 picks with actual game results to find true survivors
 */

const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function calculateRealWeek2Survivors() {
  console.log('🎯 CALCULATING REAL WEEK 2 SURVIVORS\n');

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

      // Show sample results
      console.log('\n📊 Sample Week 2 game results:');
      Object.entries(week2Results).slice(0, 3).forEach(([gameId, game]) => {
        console.log(`   Game ${gameId}: ${game.homeTeam} vs ${game.awayTeam} - Status: ${game.status}`);
        if (game.homeScore !== undefined) {
          console.log(`     Score: ${game.homeTeam} ${game.homeScore} - ${game.awayScore} ${game.awayTeam}`);
        }
      });
    } else {
      console.log('❌ No Week 2 results found');
      return { success: false, error: 'No Week 2 results available' };
    }

    // Step 3: Analyze Week 2 picks and determine survivors
    console.log('\n3️⃣ Analyzing Week 2 picks vs results...');

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

            console.log(`   👤 ${userName}: picked ${pickedTeam}`);

            // Find game result for this team
            let gameResult = null;
            let won = null;

            for (const [gameId, game] of Object.entries(week2Results)) {
              if (game.homeTeam === pickedTeam || game.awayTeam === pickedTeam) {
                gameResult = game;

                // Determine if picked team won
                if (game.status === 'FINAL' && game.homeScore !== undefined && game.awayScore !== undefined) {
                  if (game.homeTeam === pickedTeam) {
                    won = game.homeScore > game.awayScore;
                  } else {
                    won = game.awayScore > game.homeScore;
                  }
                } else {
                  won = 'TBD'; // Game not final yet
                }
                break;
              }
            }

            if (gameResult) {
              console.log(`     🏈 Game: ${gameResult.homeTeam} ${gameResult.homeScore || '?'} - ${gameResult.awayScore || '?'} ${gameResult.awayTeam} (${gameResult.status})`);

              if (won === true) {
                week2SurvivorsCount++;
                console.log(`     ✅ SURVIVED - ${pickedTeam} won`);
                survivorDetails.push({
                  name: userName,
                  team: pickedTeam,
                  result: 'WON'
                });
              } else if (won === false) {
                week2EliminatedCount++;
                console.log(`     💀 ELIMINATED - ${pickedTeam} lost`);
                eliminatedDetails.push({
                  name: userName,
                  team: pickedTeam,
                  result: 'LOST'
                });
              } else {
                console.log(`     ⏳ TBD - Game not final yet`);
                survivorDetails.push({
                  name: userName,
                  team: pickedTeam,
                  result: 'TBD'
                });
              }
            } else {
              console.log(`     ❓ No game found for ${pickedTeam}`);
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
    console.log(`⏳ Games still pending: ${week2PickersCount - week2SurvivorsCount - week2EliminatedCount}`);

    if (survivorDetails.length > 0) {
      console.log('\n✅ SURVIVORS AFTER WEEK 2:');
      survivorDetails.forEach(survivor => {
        console.log(`   ${survivor.name}: ${survivor.team} (${survivor.result})`);
      });
    }

    if (eliminatedDetails.length > 0) {
      console.log('\n💀 ELIMINATED IN WEEK 2:');
      eliminatedDetails.forEach(eliminated => {
        console.log(`   ${eliminated.name}: ${eliminated.team} (${eliminated.result})`);
      });
    }

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
  calculateRealWeek2Survivors().then((result) => {
    if (result.success) {
      console.log(`\n🎯 FINAL ANSWER: ${result.week2Survivors} users are alive after Week 2`);
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

module.exports = { calculateRealWeek2Survivors };