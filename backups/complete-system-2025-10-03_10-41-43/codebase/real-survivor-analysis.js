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

async function generateRealSurvivorAnalysis() {
  console.log('🎯 REAL SURVIVOR ANALYSIS - USING PICK PROGRESSION LOGIC\n');

  // Get pool members
  const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
  const poolMembers = poolDoc.data();

  // Get all survivor picks
  const survivorPicksSnapshot = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').collection('nerdSurvivor_picks').get();

  const allUsers = [];
  const week1Pickers = new Set();
  const week2Pickers = new Set();

  // Process users with picks
  survivorPicksSnapshot.docs.forEach(doc => {
    const userId = doc.id;
    const data = doc.data();
    const userData = poolMembers[userId];

    const user = {
      userId,
      name: userData?.displayName || 'Unknown',
      email: userData?.email || 'Unknown',
      week1Pick: null,
      week2Pick: null,
      status: 'NO PICKS',
      eliminatedWeek: null,
      pickHistory: []
    };

    if (data.picks) {
      // Week 1
      if (data.picks['1']) {
        user.week1Pick = data.picks['1'].team;
        user.pickHistory.push(data.picks['1'].team);
        week1Pickers.add(userId);
        user.status = 'ELIMINATED WEEK 1'; // Assume eliminated unless they made Week 2 pick
        user.eliminatedWeek = 1;
      }

      // Week 2
      if (data.picks['2']) {
        user.week2Pick = data.picks['2'].team;
        user.pickHistory.push(data.picks['2'].team);
        week2Pickers.add(userId);
        user.status = 'ALIVE'; // Made Week 2 pick = survived Week 1
        user.eliminatedWeek = null;
      }
    }

    allUsers.push(user);
  });

  // Add users without any picks
  const allPoolMembers = Object.keys(poolMembers);
  const usersWithPicks = new Set(survivorPicksSnapshot.docs.map(doc => doc.id));
  const usersWithoutPicks = allPoolMembers.filter(userId => !usersWithPicks.has(userId));

  usersWithoutPicks.forEach(userId => {
    const userData = poolMembers[userId];
    allUsers.push({
      userId,
      name: userData?.displayName || 'Unknown',
      email: userData?.email || 'Unknown',
      week1Pick: 'NO PICK',
      week2Pick: 'NO PICK',
      status: 'NEVER PARTICIPATED',
      eliminatedWeek: 'N/A',
      pickHistory: []
    });
  });

  // Sort by status, then name
  allUsers.sort((a, b) => {
    if (a.status !== b.status) {
      const statusOrder = { 'ALIVE': 1, 'ELIMINATED WEEK 1': 2, 'NEVER PARTICIPATED': 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return a.name.localeCompare(b.name);
  });

  // Calculate statistics
  const alive = allUsers.filter(u => u.status === 'ALIVE').length;
  const eliminatedWeek1 = allUsers.filter(u => u.status === 'ELIMINATED WEEK 1').length;
  const neverParticipated = allUsers.filter(u => u.status === 'NEVER PARTICIPATED').length;

  console.log('📊 REAL SURVIVOR STATISTICS:');
  console.log(`Total Pool Members: ${allUsers.length}`);
  console.log(`Week 1 Picks: ${week1Pickers.size}`);
  console.log(`Week 2 Picks: ${week2Pickers.size}`);
  console.log(`Still Alive: ${alive}`);
  console.log(`Eliminated Week 1: ${eliminatedWeek1}`);
  console.log(`Never Participated: ${neverParticipated}`);

  // Find your status
  const tonyUser = allUsers.find(u => u.email === 'tonyweeg@gmail.com');
  if (tonyUser) {
    console.log('\n🎯 TONY\'S REAL STATUS:');
    console.log(`Name: ${tonyUser.name}`);
    console.log(`Week 1: ${tonyUser.week1Pick}`);
    console.log(`Week 2: ${tonyUser.week2Pick}`);
    console.log(`Status: ${tonyUser.status}`);
    console.log(`Pick History: ${tonyUser.pickHistory.join(', ')}`);
  }

  // Generate HTML
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎯 REAL Survivor Pool Analysis - ${new Date().toLocaleDateString()}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center;
            color: #e74c3c;
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #3498db;
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            transition: transform 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-5px);
        }
        .stat-card.alive { background: #27ae60; }
        .stat-card.eliminated { background: #e74c3c; }
        .stat-card.never { background: #95a5a6; }
        .stat-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .stat-card .number {
            font-size: 36px;
            font-weight: bold;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }
        th {
            background: linear-gradient(135deg, #34495e, #2c3e50);
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1px;
        }
        .alive-row {
            background: linear-gradient(135deg, #d4edda, #c3e6cb);
            border-left: 4px solid #27ae60;
        }
        .eliminated-row {
            background: linear-gradient(135deg, #f8d7da, #f5c6cb);
            border-left: 4px solid #e74c3c;
        }
        .never-row {
            background: linear-gradient(135deg, #e2e3e5, #d1d3d4);
            border-left: 4px solid #95a5a6;
        }
        .pick-cell {
            font-weight: 600;
            color: #2c3e50;
        }
        .status-alive {
            color: #27ae60;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-eliminated {
            color: #e74c3c;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-never {
            color: #95a5a6;
            font-weight: bold;
            text-transform: uppercase;
        }
        .logic-explanation {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            padding: 20px;
            margin: 30px 0;
        }
        .logic-explanation h3 {
            color: #495057;
            margin-top: 0;
        }
        .logic-explanation ul {
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 REAL Survivor Pool Analysis</h1>
        <div class="subtitle">Based on Pick Progression Logic (Not Impossible Game Results)</div>
        <p style="text-align: center; color: #7f8c8d;">Generated: ${new Date().toLocaleString()}</p>

        <div class="summary">
            <div class="stat-card">
                <h3>Total Pool</h3>
                <div class="number">${allUsers.length}</div>
            </div>
            <div class="stat-card">
                <h3>Week 1 Picks</h3>
                <div class="number">${week1Pickers.size}</div>
            </div>
            <div class="stat-card">
                <h3>Week 2 Picks</h3>
                <div class="number">${week2Pickers.size}</div>
            </div>
            <div class="stat-card alive">
                <h3>Still Alive</h3>
                <div class="number">${alive}</div>
            </div>
            <div class="stat-card eliminated">
                <h3>Eliminated Wk1</h3>
                <div class="number">${eliminatedWeek1}</div>
            </div>
            <div class="stat-card never">
                <h3>Never Played</h3>
                <div class="number">${neverParticipated}</div>
            </div>
        </div>

        <div class="logic-explanation">
            <h3>🧠 Analysis Logic Used:</h3>
            <ul>
                <li><strong>ALIVE</strong>: Made Week 2 pick → survived Week 1</li>
                <li><strong>ELIMINATED WEEK 1</strong>: Made Week 1 pick but no Week 2 pick → eliminated Week 1</li>
                <li><strong>NEVER PARTICIPATED</strong>: No picks in any week</li>
                <li><strong>Real elimination count</strong>: ${week1Pickers.size} Week 1 picks → ${week2Pickers.size} Week 2 picks = ${week1Pickers.size - week2Pickers.size} eliminations</li>
            </ul>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Email</th>
                    <th>Week 1 Pick</th>
                    <th>Week 2 Pick</th>
                    <th>Status</th>
                    <th>Pick History</th>
                </tr>
            </thead>
            <tbody>
`;

  allUsers.forEach(user => {
    const rowClass = user.status === 'ALIVE' ? 'alive-row' :
                     user.status === 'ELIMINATED WEEK 1' ? 'eliminated-row' : 'never-row';
    const statusClass = user.status === 'ALIVE' ? 'status-alive' :
                        user.status === 'ELIMINATED WEEK 1' ? 'status-eliminated' : 'status-never';

    html += `
                <tr class="${rowClass}">
                    <td><strong>${user.name}</strong></td>
                    <td style="font-size: 11px; color: #6c757d;">${user.email}</td>
                    <td class="pick-cell">${user.week1Pick || '-'}</td>
                    <td class="pick-cell">${user.week2Pick || '-'}</td>
                    <td class="${statusClass}">${user.status}</td>
                    <td style="font-style: italic;">${user.pickHistory.join(', ') || '-'}</td>
                </tr>
`;
  });

  html += `
            </tbody>
        </table>

        <div style="margin-top: 40px; padding: 25px; background: linear-gradient(135deg, #ffeaa7, #fdcb6e); border-radius: 12px;">
            <h3 style="color: #2d3436; margin-top: 0;">📈 Key Insights:</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; color: #2d3436;">
                <div>
                    <strong>Participation Rate:</strong><br>
                    ${Math.round((week1Pickers.size / allUsers.length) * 100)}% made Week 1 picks
                </div>
                <div>
                    <strong>Week 1 Survival Rate:</strong><br>
                    ${Math.round((week2Pickers.size / week1Pickers.size) * 100)}% survived to Week 2
                </div>
            </div>
        </div>

        <div style="margin-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
            This analysis uses pick progression logic since game result data is incomplete for Weeks 1-2
        </div>
    </div>
</body>
</html>
`;

  // Write HTML file
  fs.writeFileSync('/Users/tonyweeg/nerdfootball-project/public/real-survivor-analysis.html', html);

  console.log('\n✅ REAL HTML analysis generated: /Users/tonyweeg/nerdfootball-project/public/real-survivor-analysis.html');
}

generateRealSurvivorAnalysis().then(() => process.exit(0)).catch(console.error);