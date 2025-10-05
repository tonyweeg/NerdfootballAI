#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const fs = require('fs');

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
    console.log(`Error getting game results for Week ${weekNumber}:`, error.message);
    return {};
  }
}

async function generateSurvivorAnalysis() {
  console.log('🎯 GENERATING COMPREHENSIVE SURVIVOR ANALYSIS\n');

  // Get pool members for name/email mapping
  const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
  const poolMembers = poolDoc.data();

  // Get all survivor picks
  const survivorPicksSnapshot = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').collection('nerdSurvivor_picks').get();

  // Get game results
  const week1Results = await getGameResults(1);
  const week2Results = await getGameResults(2);

  console.log('Week 1 Results:', week1Results);
  console.log('Week 2 Results:', week2Results);

  const allUsers = [];
  const usersWithPicks = new Set();

  // Process users with picks
  survivorPicksSnapshot.docs.forEach(doc => {
    const userId = doc.id;
    const data = doc.data();
    const userData = poolMembers[userId];
    usersWithPicks.add(userId);

    const user = {
      userId,
      name: userData?.displayName || 'Unknown',
      email: userData?.email || 'Unknown',
      week1Pick: null,
      week1Result: null,
      week2Pick: null,
      week2Result: null,
      status: 'ALIVE',
      eliminatedWeek: null
    };

    if (data.picks) {
      // Week 1
      if (data.picks['1']) {
        user.week1Pick = data.picks['1'].team;
        const normalizedTeam = normalizeTeamName(user.week1Pick);
        if (week1Results[normalizedTeam] === 'WIN') {
          user.week1Result = '✅ WIN';
        } else if (week1Results[normalizedTeam] === 'LOSS') {
          user.week1Result = '💀 LOSS';
          user.status = 'ELIMINATED';
          user.eliminatedWeek = 1;
        } else {
          user.week1Result = '❓ UNKNOWN';
        }
      }

      // Week 2 (only if survived Week 1)
      if (data.picks['2'] && user.status === 'ALIVE') {
        user.week2Pick = data.picks['2'].team;
        const normalizedTeam = normalizeTeamName(user.week2Pick);
        if (week2Results[normalizedTeam] === 'WIN') {
          user.week2Result = '✅ WIN';
        } else if (week2Results[normalizedTeam] === 'LOSS') {
          user.week2Result = '💀 LOSS';
          user.status = 'ELIMINATED';
          user.eliminatedWeek = 2;
        } else {
          user.week2Result = '❓ UNKNOWN';
        }
      }
    }

    allUsers.push(user);
  });

  // Add users without picks
  const allPoolMembers = Object.keys(poolMembers);
  const usersWithoutPicks = allPoolMembers.filter(userId => !usersWithPicks.has(userId));

  usersWithoutPicks.forEach(userId => {
    const userData = poolMembers[userId];
    allUsers.push({
      userId,
      name: userData?.displayName || 'Unknown',
      email: userData?.email || 'Unknown',
      week1Pick: 'NO PICK',
      week1Result: '💀 NO PICK',
      week2Pick: 'NO PICK',
      week2Result: '💀 NO PICK',
      status: 'ELIMINATED',
      eliminatedWeek: 1
    });
  });

  // Sort by name
  allUsers.sort((a, b) => a.name.localeCompare(b.name));

  // Generate HTML
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Survivor Pool Analysis - ${new Date().toLocaleDateString()}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #3498db;
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-card.alive { background: #27ae60; }
        .stat-card.eliminated { background: #e74c3c; }
        .stat-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
        }
        .stat-card .number {
            font-size: 32px;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #34495e;
            color: white;
            position: sticky;
            top: 0;
        }
        .alive-row {
            background-color: #d4edda;
        }
        .eliminated-row {
            background-color: #f8d7da;
        }
        .week-header {
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }
        .pick-cell {
            font-weight: bold;
        }
        .result-win {
            color: #27ae60;
            font-weight: bold;
        }
        .result-loss {
            color: #e74c3c;
            font-weight: bold;
        }
        .result-unknown {
            color: #f39c12;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏆 Survivor Pool Analysis</h1>
        <p style="text-align: center; color: #7f8c8d;">Generated: ${new Date().toLocaleString()}</p>

        <div class="summary">
            <div class="stat-card">
                <h3>Total Players</h3>
                <div class="number">${allUsers.length}</div>
            </div>
            <div class="stat-card alive">
                <h3>Still Alive</h3>
                <div class="number">${allUsers.filter(u => u.status === 'ALIVE').length}</div>
            </div>
            <div class="stat-card eliminated">
                <h3>Eliminated</h3>
                <div class="number">${allUsers.filter(u => u.status === 'ELIMINATED').length}</div>
            </div>
            <div class="stat-card">
                <h3>Week 1 Picks</h3>
                <div class="number">${allUsers.filter(u => u.week1Pick && u.week1Pick !== 'NO PICK').length}</div>
            </div>
            <div class="stat-card">
                <h3>Week 2 Picks</h3>
                <div class="number">${allUsers.filter(u => u.week2Pick && u.week2Pick !== 'NO PICK').length}</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Email</th>
                    <th class="week-header">Week 1 Pick</th>
                    <th class="week-header">Week 1 Result</th>
                    <th class="week-header">Week 2 Pick</th>
                    <th class="week-header">Week 2 Result</th>
                    <th>Status</th>
                    <th>Eliminated Week</th>
                </tr>
            </thead>
            <tbody>
`;

  allUsers.forEach(user => {
    const rowClass = user.status === 'ALIVE' ? 'alive-row' : 'eliminated-row';

    html += `
                <tr class="${rowClass}">
                    <td><strong>${user.name}</strong></td>
                    <td style="font-size: 11px;">${user.email}</td>
                    <td class="pick-cell">${user.week1Pick || '-'}</td>
                    <td class="${user.week1Result?.includes('WIN') ? 'result-win' : user.week1Result?.includes('LOSS') ? 'result-loss' : 'result-unknown'}">${user.week1Result || '-'}</td>
                    <td class="pick-cell">${user.week2Pick || '-'}</td>
                    <td class="${user.week2Result?.includes('WIN') ? 'result-win' : user.week2Result?.includes('LOSS') ? 'result-loss' : 'result-unknown'}">${user.week2Result || '-'}</td>
                    <td><strong>${user.status}</strong></td>
                    <td>${user.eliminatedWeek || '-'}</td>
                </tr>
`;
  });

  html += `
            </tbody>
        </table>

        <div style="margin-top: 30px; padding: 20px; background-color: #ecf0f1; border-radius: 8px;">
            <h3>🎮 Game Results Reference:</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h4>Week 1 Winners:</h4>
                    <ul>
`;

  Object.entries(week1Results).forEach(([team, result]) => {
    if (result === 'WIN') {
      html += `                        <li><strong>${team}</strong> ✅</li>\n`;
    }
  });

  html += `
                    </ul>
                </div>
                <div>
                    <h4>Week 2 Winners:</h4>
                    <ul>
`;

  Object.entries(week2Results).forEach(([team, result]) => {
    if (result === 'WIN') {
      html += `                        <li><strong>${team}</strong> ✅</li>\n`;
    }
  });

  html += `
                    </ul>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
`;

  // Write HTML file
  fs.writeFileSync('/Users/tonyweeg/nerdfootball-project/public/survivor-analysis.html', html);

  console.log('✅ HTML file generated: /Users/tonyweeg/nerdfootball-project/public/survivor-analysis.html');

  // Summary stats
  const alive = allUsers.filter(u => u.status === 'ALIVE').length;
  const eliminated = allUsers.filter(u => u.status === 'ELIMINATED').length;
  const week1Picks = allUsers.filter(u => u.week1Pick && u.week1Pick !== 'NO PICK').length;
  const week2Picks = allUsers.filter(u => u.week2Pick && u.week2Pick !== 'NO PICK').length;

  console.log('\n📊 SUMMARY STATISTICS:');
  console.log(`Total Players: ${allUsers.length}`);
  console.log(`Still Alive: ${alive}`);
  console.log(`Eliminated: ${eliminated}`);
  console.log(`Week 1 Picks: ${week1Picks}`);
  console.log(`Week 2 Picks: ${week2Picks}`);

  // Show Tony's status specifically
  const tonyUser = allUsers.find(u => u.email === 'tonyweeg@gmail.com');
  if (tonyUser) {
    console.log('\n🎯 TONY\'S STATUS:');
    console.log(`Name: ${tonyUser.name}`);
    console.log(`Week 1: ${tonyUser.week1Pick} ${tonyUser.week1Result}`);
    console.log(`Week 2: ${tonyUser.week2Pick || 'NO PICK'} ${tonyUser.week2Result || 'NO RESULT'}`);
    console.log(`Status: ${tonyUser.status}`);
  }
}

generateSurvivorAnalysis().then(() => process.exit(0)).catch(console.error);