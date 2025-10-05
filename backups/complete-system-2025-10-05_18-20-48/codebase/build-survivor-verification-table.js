#!/usr/bin/env node

/**
 * 🎯 SURVIVOR VERIFICATION TABLE GENERATOR
 * Creates HTML table showing all picks, results, and alive status for verification
 */

const admin = require('firebase-admin');
const fs = require('fs');

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
  console.log(`📊 Getting game results for Week ${weekNumber}...`);

  try {
    // Get game results from artifacts/nerdfootball/public/data/nerdfootball_games/{week}
    const gameResultsPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`;
    const gameResultsDoc = await db.doc(gameResultsPath).get();

    if (gameResultsDoc.exists) {
      const weekGames = gameResultsDoc.data();
      console.log(`   ✅ Found ${Object.keys(weekGames).length} games for Week ${weekNumber}`);

      const gameResults = {};

      Object.entries(weekGames).forEach(([gameId, game]) => {
        // Handle two different game data formats:
        // 1. Week 1-2: { winner: "Team Name", homeScore: X, awayScore: Y }
        // 2. Week 3+: { winner: "Team Name", homeTeam: "X", awayTeam: "Y", status: "FINAL", ... }

        const hasWinner = game.winner && game.homeScore !== undefined && game.awayScore !== undefined;
        const isFinalStatus = game.status === 'FINAL' || !game.hasOwnProperty('status');

        if (hasWinner && isFinalStatus) {
          const winner = normalizeTeamName(game.winner);

          // For Week 1-2 format, we need to determine the teams from the pick matching
          // We'll mark the winner as WIN and store it for lookup
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
          } else {
            // Week 1-2 format: we only know the winner
            // The loser will be determined when we find a team that's not the winner
            // Store additional info for later processing
            if (!gameResults._winnerGames) gameResults._winnerGames = [];
            gameResults._winnerGames.push({
              winner: winner,
              homeScore: game.homeScore,
              awayScore: game.awayScore,
              gameId: gameId
            });
          }
        }
      });

      // For Week 1-2 format, we need to infer losers
      if (gameResults._winnerGames) {
        // This is a simplified approach - in a real scenario we'd need team roster data
        // For now, we'll just mark winners and let the pick matching determine results
        delete gameResults._winnerGames; // Clean up temp data
      }

      console.log(`   📊 Processed ${Object.keys(gameResults).length / 2} completed games`);
      return gameResults;
    }

    console.log(`   ⚠️ No game results found for Week ${weekNumber}`);
    return {};

  } catch (error) {
    console.log(`   ❌ Error getting game results for Week ${weekNumber}:`, error.message);
    return {};
  }
}

async function getUserSurvivorPick(userId, weekNumber) {
  try {
    // CORRECT survivor picks path - this is where they're actually stored!
    const userPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
    const userPicksDoc = await db.doc(userPicksPath).get();

    if (userPicksDoc.exists) {
      const picksData = userPicksDoc.data();

      // Check if user made pick for this week
      if (picksData.picks && picksData.picks[weekNumber.toString()]) {
        const weekPick = picksData.picks[weekNumber.toString()];
        return weekPick.team || null;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function buildSurvivorVerificationTable() {
  console.log('🎯 BUILDING SURVIVOR VERIFICATION TABLE\n');

  try {
    // Step 1: Get all pool members
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    console.log('1️⃣ Loading pool members...');
    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const allUserIds = Object.keys(poolData);
    console.log(`✅ Found ${allUserIds.length} pool members`);

    // Step 2: Get game results for weeks 1-4 (adjust as needed)
    const maxWeek = 4;
    const gameResultsByWeek = {};

    for (let week = 1; week <= maxWeek; week++) {
      gameResultsByWeek[week] = await getGameResults(week);
    }

    // Step 3: Build data for each user
    console.log('\n2️⃣ Gathering pick data for all users...');
    const userData = [];

    for (const userId of allUserIds) {
      const user = poolData[userId];
      const userInfo = {
        name: user.displayName || user.name || 'Unknown',
        email: user.email || user.emailAddress || 'No email',
        userId: userId,
        picks: {},
        currentAlive: user.survivor ? user.survivor.alive : null,
        currentPickHistory: user.survivor ? user.survivor.pickHistory : null,
        calculatedAlive: 18 // Start assuming alive
      };

      // Get picks for each week
      for (let week = 1; week <= maxWeek; week++) {
        const pickedTeam = await getUserSurvivorPick(userId, week);

        if (pickedTeam) {
          const normalizedTeam = normalizeTeamName(pickedTeam);
          const gameResult = gameResultsByWeek[week][normalizedTeam];

          userInfo.picks[week] = {
            team: pickedTeam,
            result: gameResult || 'UNKNOWN'
          };

          // Calculate alive status
          if (gameResult === 'LOSS' && userInfo.calculatedAlive === 18) {
            userInfo.calculatedAlive = week; // Eliminated this week
          }
        }
      }

      userData.push(userInfo);

      if (userData.length % 10 === 0) {
        console.log(`   📊 Processed ${userData.length}/${allUserIds.length} users...`);
      }
    }

    // Step 4: Generate HTML table
    console.log('\n3️⃣ Generating HTML verification table...');

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Survivor Pool Verification Table</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .win { background-color: #d4edda; color: #155724; }
        .loss { background-color: #f8d7da; color: #721c24; }
        .unknown { background-color: #fff3cd; color: #856404; }
        .no-pick { background-color: #f8f9fa; color: #6c757d; }
        .alive { background-color: #d1ecf1; color: #0c5460; }
        .eliminated { background-color: #f5c6cb; color: #721c24; }
        .mismatch { background-color: #ffeaa7; border: 2px solid #e17055; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .email { font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <h1>🎯 Survivor Pool Verification Table</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Total Players:</strong> ${userData.length}</p>

    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Week 1</th>
                <th>Week 2</th>
                <th>Week 3</th>
                <th>Week 4</th>
                <th>Current Alive</th>
                <th>Calculated Alive</th>
                <th>Current Pick History</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
`;

    // Sort by calculated alive status (alive first, then by elimination week)
    userData.sort((a, b) => {
      if (a.calculatedAlive === 18 && b.calculatedAlive !== 18) return -1;
      if (a.calculatedAlive !== 18 && b.calculatedAlive === 18) return 1;
      if (a.calculatedAlive !== 18 && b.calculatedAlive !== 18) {
        return b.calculatedAlive - a.calculatedAlive; // Later eliminations first
      }
      return a.name.localeCompare(b.name);
    });

    for (const user of userData) {
      const statusMatch = user.currentAlive === user.calculatedAlive;
      const rowClass = statusMatch ? '' : 'mismatch';

      html += `            <tr class="${rowClass}">
                <td><strong>${user.name}</strong></td>
                <td class="email">${user.email}</td>`;

      // Week columns
      for (let week = 1; week <= maxWeek; week++) {
        const pick = user.picks[week];
        if (pick) {
          const resultClass = pick.result === 'WIN' ? 'win' :
                             pick.result === 'LOSS' ? 'loss' : 'unknown';
          html += `                <td class="${resultClass}">${pick.team}<br><small>${pick.result}</small></td>`;
        } else {
          html += `                <td class="no-pick">No pick</td>`;
        }
      }

      // Status columns
      const currentAliveClass = user.currentAlive === 18 ? 'alive' : 'eliminated';
      const calculatedAliveClass = user.calculatedAlive === 18 ? 'alive' : 'eliminated';

      html += `                <td class="${currentAliveClass}">${user.currentAlive || 'NULL'}</td>
                <td class="${calculatedAliveClass}">${user.calculatedAlive}</td>
                <td>${user.currentPickHistory || 'None'}</td>
                <td>${statusMatch ? '✅ Match' : '❌ Mismatch'}</td>
            </tr>`;
    }

    html += `        </tbody>
    </table>

    <h2>📊 Summary</h2>
    <ul>
        <li><strong>Still Alive (18):</strong> ${userData.filter(u => u.calculatedAlive === 18).length} players</li>
        <li><strong>Eliminated Week 1:</strong> ${userData.filter(u => u.calculatedAlive === 1).length} players</li>
        <li><strong>Eliminated Week 2:</strong> ${userData.filter(u => u.calculatedAlive === 2).length} players</li>
        <li><strong>Eliminated Week 3:</strong> ${userData.filter(u => u.calculatedAlive === 3).length} players</li>
        <li><strong>Eliminated Week 4:</strong> ${userData.filter(u => u.calculatedAlive === 4).length} players</li>
        <li><strong>Data Mismatches:</strong> ${userData.filter(u => u.currentAlive !== u.calculatedAlive).length} players</li>
    </ul>

    <h2>🎨 Legend</h2>
    <ul>
        <li><span class="win">Green:</span> Team won</li>
        <li><span class="loss">Red:</span> Team lost (elimination)</li>
        <li><span class="unknown">Yellow:</span> Game result unknown</li>
        <li><span class="no-pick">Gray:</span> No pick found</li>
        <li><span class="mismatch">Orange border:</span> Current vs calculated alive mismatch</li>
    </ul>
</body>
</html>`;

    // Save HTML file
    const outputPath = '/Users/tonyweeg/nerdfootball-project/public/survivor-verification-table.html';
    fs.writeFileSync(outputPath, html);

    console.log(`✅ HTML verification table generated: ${outputPath}`);
    console.log('📊 Summary:');
    console.log(`   - Still Alive (18): ${userData.filter(u => u.calculatedAlive === 18).length} players`);
    console.log(`   - Eliminated Week 1: ${userData.filter(u => u.calculatedAlive === 1).length} players`);
    console.log(`   - Eliminated Week 2: ${userData.filter(u => u.calculatedAlive === 2).length} players`);
    console.log(`   - Eliminated Week 3: ${userData.filter(u => u.calculatedAlive === 3).length} players`);
    console.log(`   - Eliminated Week 4: ${userData.filter(u => u.calculatedAlive === 4).length} players`);
    console.log(`   - Data Mismatches: ${userData.filter(u => u.currentAlive !== u.calculatedAlive).length} players`);

    return {
      success: true,
      outputPath,
      userData
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
  buildSurvivorVerificationTable().then((result) => {
    if (result.success) {
      console.log('\n🎯 Verification table completed successfully!');
      console.log(`\n🌐 Open this file in your browser: ${result.outputPath}`);
      process.exit(0);
    } else {
      console.log('\n💥 Table generation failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Script error:', error);
    process.exit(1);
  });
}

module.exports = { buildSurvivorVerificationTable };