#!/usr/bin/env node

/**
 * 🎯 READ ORIGINAL SURVIVOR PICKS AND GENESIS EMBEDDED DATA
 * Found the original storage! Now read all picks and process them correctly.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// ESPN team name normalizations
const teamNameMap = {
  'NE Patriots': 'New England Patriots',
  'NY Jets': 'New York Jets',
  'NY Giants': 'New York Giants',
  'SF 49ers': 'San Francisco 49ers',
  'TB Buccaneers': 'Tampa Bay Buccaneers',
  'LV Raiders': 'Las Vegas Raiders',
  'LA Rams': 'Los Angeles Rams',
  'LA Chargers': 'Los Angeles Chargers'
};

function normalizeTeamName(teamName) {
  return teamNameMap[teamName] || teamName;
}

async function getGameResults(weekNumber) {
  try {
    const gameResultsPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`;
    const gameResultsDoc = await db.doc(gameResultsPath).get();

    if (gameResultsDoc.exists) {
      const weekGames = gameResultsDoc.data();
      const gameResults = {};

      Object.entries(weekGames).forEach(([gameId, game]) => {
        // Handle two different game data formats:
        // 1. Week 1-2: { winner: "Team Name", homeScore: X, awayScore: Y }
        // 2. Week 3+: { winner: "Team Name", homeTeam: "X", awayTeam: "Y", status: "FINAL", ... }

        const hasWinner = game.winner && game.homeScore !== undefined && game.awayScore !== undefined;
        const isFinalStatus = game.status === 'FINAL' || !game.hasOwnProperty('status');

        if (hasWinner && isFinalStatus) {
          const winner = normalizeTeamName(game.winner);
          gameResults[winner] = 'WIN';

          // For Week 3+ format, we can determine the loser
          if (game.homeTeam && game.awayTeam) {
            const homeTeam = normalizeTeamName(game.homeTeam);
            const awayTeam = normalizeTeamName(game.awayTeam);

            if (game.homeScore > game.awayScore) {
              gameResults[homeTeam] = 'WIN';
              gameResults[awayTeam] = 'LOSS';
            } else if (game.awayScore > game.homeScore) {
              gameResults[awayTeam] = 'WIN';
              gameResults[homeTeam] = 'LOSS';
            } else {
              gameResults[homeTeam] = 'TIE';
              gameResults[awayTeam] = 'TIE';
            }
          }
        }
      });

      return gameResults;
    }

    return {};
  } catch (error) {
    console.log(`   ❌ Error getting game results for Week ${weekNumber}:`, error.message);
    return {};
  }
}

async function readOriginalSurvivorPicks() {
  console.log('🎯 READING ORIGINAL SURVIVOR PICKS AND PROCESSING\n');

  try {
    // Step 1: Read all original survivor picks
    console.log('1️⃣ Reading original survivor picks collection...');
    const originalPicksSnapshot = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').collection('nerdSurvivor_picks').get();

    if (originalPicksSnapshot.empty) {
      throw new Error('No survivor picks found in original storage');
    }

    console.log(`✅ Found ${originalPicksSnapshot.size} users with survivor picks`);

    // Step 2: Load pool members for name mapping
    console.log('\n2️⃣ Loading pool member data...');
    const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }
    const poolMembers = poolDoc.data();

    // Step 3: Load game results for all weeks
    console.log('\n3️⃣ Loading game results for all weeks...');
    const gameResultsByWeek = {};
    for (let week = 1; week <= 6; week++) {
      gameResultsByWeek[week] = await getGameResults(week);
      console.log(`   Week ${week}: ${Object.keys(gameResultsByWeek[week]).length / 2} games with results`);
    }

    // Step 4: Process each user's picks and determine survivor status
    console.log('\n4️⃣ Processing survivor picks and calculating alive status...');
    const survivorData = {};
    let totalProcessed = 0;

    originalPicksSnapshot.docs.forEach(doc => {
      const userId = doc.id;
      const userData = poolMembers[userId];
      const pickData = doc.data();

      if (!userData) {
        console.log(`   ⚠️ User ${userId} not found in pool members`);
        return;
      }

      const userPicks = pickData.picks || {};
      const pickWeeks = Object.keys(userPicks).map(w => parseInt(w)).sort((a, b) => a - b);

      let alive = 18; // Start assuming alive
      let pickHistory = [];

      console.log(`\n   👤 ${userData.displayName || userId.substring(0,8)}: ${pickWeeks.length} picks`);

      // Process picks chronologically
      for (const week of pickWeeks) {
        const weekPick = userPicks[week];
        const pickedTeam = normalizeTeamName(weekPick.team);
        const gameResults = gameResultsByWeek[week];

        pickHistory.push(pickedTeam);
        console.log(`      Week ${week}: ${pickedTeam}`);

        // Check if team won this week
        if (gameResults[pickedTeam] === 'WIN') {
          console.log(`         ✅ ${pickedTeam} WON - survived Week ${week}`);
        } else if (gameResults[pickedTeam] === 'LOSS') {
          console.log(`         💀 ${pickedTeam} LOST - eliminated in Week ${week}`);
          alive = week; // Set elimination week
          break; // Stop processing further weeks
        } else {
          console.log(`         ❓ ${pickedTeam} result unknown - continuing`);
        }
      }

      survivorData[userId] = {
        displayName: userData.displayName,
        alive: alive,
        pickHistory: pickHistory.join(', '),
        totalPicks: pickHistory.length,
        lastUpdated: new Date().toISOString(),
        weeksPicked: pickWeeks
      };

      totalProcessed++;
    });

    console.log(`\n✅ Processed ${totalProcessed} users`);

    // Step 5: Summary statistics
    console.log('\n5️⃣ SURVIVOR STATUS SUMMARY:');
    const stillAlive = Object.values(survivorData).filter(user => user.alive === 18);
    const eliminated = Object.values(survivorData).filter(user => user.alive < 18);

    console.log(`🏆 Still Alive: ${stillAlive.length} users`);
    console.log(`💀 Eliminated: ${eliminated.length} users`);

    if (eliminated.length > 0) {
      const eliminationsByWeek = {};
      eliminated.forEach(user => {
        if (!eliminationsByWeek[user.alive]) eliminationsByWeek[user.alive] = 0;
        eliminationsByWeek[user.alive]++;
      });

      console.log('\n📊 Eliminations by week:');
      Object.entries(eliminationsByWeek).sort(([a], [b]) => parseInt(a) - parseInt(b)).forEach(([week, count]) => {
        console.log(`   Week ${week}: ${count} eliminated`);
      });
    }

    // Step 6: Show samples
    console.log('\n6️⃣ SAMPLE SURVIVOR DATA:');
    console.log('\n🏆 Still Alive (sample):');
    stillAlive.slice(0, 5).forEach(user => {
      console.log(`   ${user.displayName}: "${user.pickHistory}" (${user.totalPicks} picks)`);
    });

    if (eliminated.length > 0) {
      console.log('\n💀 Eliminated (sample):');
      eliminated.slice(0, 5).forEach(user => {
        console.log(`   ${user.displayName}: "${user.pickHistory}" (eliminated Week ${user.alive})`);
      });
    }

    return {
      success: true,
      survivorData,
      summary: {
        totalProcessed,
        stillAlive: stillAlive.length,
        eliminated: eliminated.length
      }
    };

  } catch (error) {
    console.error('❌ ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  readOriginalSurvivorPicks().then((result) => {
    if (result.success) {
      console.log('\n🎯 Original survivor picks processing completed!');
      console.log(`📊 Final: ${result.summary.stillAlive} alive, ${result.summary.eliminated} eliminated`);
      process.exit(0);
    } else {
      console.log('\n💥 Processing failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Processing error:', error);
    process.exit(1);
  });
}

module.exports = { readOriginalSurvivorPicks };