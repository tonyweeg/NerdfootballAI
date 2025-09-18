#!/usr/bin/env node

/**
 * 🔍 SURVIVOR FIRESTORE AUDIT - COMPREHENSIVE DATA VALIDATION
 *
 * This script performs a complete audit of:
 * 1. Individual survivor picks documents
 * 2. Embedded survivor data in pool members
 * 3. Game results for elimination calculation
 * 4. Data integrity and consistency validation
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

// Get game winners for each week
async function getWeekWinners(weekNumber) {
  try {
    const gameResultsPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`;
    const gameResultsDoc = await db.doc(gameResultsPath).get();

    if (gameResultsDoc.exists) {
      const weekGames = gameResultsDoc.data();
      const winners = Object.values(weekGames).map(game => normalizeTeamName(game.winner));
      return winners;
    }
    return [];
  } catch (error) {
    console.log(`⚠️ Error getting game results for Week ${weekNumber}:`, error.message);
    return [];
  }
}

// Calculate survivor status from picks (independent calculation)
function calculateSurvivorStatus(userId, userPicks, allWeekWinners, userData) {
  let alive = 18;
  let pickHistory = [];
  let eliminationWeek = null;
  let weekByWeekStatus = [];

  console.log(`\n🔍 CALCULATING for ${userData?.displayName || userId.substring(0,8)}:`);

  if (!userPicks.picks) {
    return {
      alive: 1,
      pickHistory: "",
      totalPicks: 0,
      eliminationWeek: 1,
      weekByWeekStatus: ["❌ No picks - eliminated Week 1"],
      calculationReason: "NO_PICKS_DOCUMENT"
    };
  }

  // Process weeks chronologically
  const pickedWeeks = Object.keys(userPicks.picks).map(w => parseInt(w)).sort((a, b) => a - b);

  for (const week of pickedWeeks) {
    const weekPick = userPicks.picks[week];
    const pickedTeam = normalizeTeamName(weekPick.team);
    const weekWinners = allWeekWinners[week] || [];

    pickHistory.push(pickedTeam);
    console.log(`   Week ${week}: ${pickedTeam} vs ${weekWinners.length} winners`);

    if (weekWinners.includes(pickedTeam)) {
      weekByWeekStatus.push(`✅ Week ${week}: ${pickedTeam} WON - survived`);
      console.log(`      ✅ ${pickedTeam} WON - survived Week ${week}`);
    } else if (weekWinners.length > 0) {
      weekByWeekStatus.push(`💀 Week ${week}: ${pickedTeam} LOST - eliminated`);
      console.log(`      💀 ${pickedTeam} LOST - eliminated in Week ${week}`);
      alive = week;
      eliminationWeek = week;
      break;
    } else {
      weekByWeekStatus.push(`❓ Week ${week}: ${pickedTeam} - no results yet`);
      console.log(`      ❓ ${pickedTeam} - no results yet for Week ${week}`);
    }
  }

  return {
    alive,
    pickHistory: pickHistory.join(', '),
    totalPicks: pickHistory.length,
    eliminationWeek,
    weekByWeekStatus,
    calculationReason: eliminationWeek ? `ELIMINATED_WEEK_${eliminationWeek}` : "STILL_ALIVE"
  };
}

async function comprehensiveAudit() {
  console.log('🔍 COMPREHENSIVE SURVIVOR FIRESTORE AUDIT\n');
  console.log('=' .repeat(80));

  try {
    // Step 1: Load game results for completed weeks
    console.log('\n1️⃣ LOADING GAME RESULTS...');
    const allWeekWinners = {};
    for (let week = 1; week <= 3; week++) {
      allWeekWinners[week] = await getWeekWinners(week);
      console.log(`   Week ${week}: ${allWeekWinners[week].length} winning teams`);
      console.log(`      Winners: ${allWeekWinners[week].join(', ')}`);
    }

    // Step 2: Load pool members (embedded data)
    console.log('\n2️⃣ LOADING EMBEDDED SURVIVOR DATA...');
    const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }
    const poolMembers = poolDoc.data();
    console.log(`   Found ${Object.keys(poolMembers).length} pool members with embedded data`);

    // Step 3: Load individual survivor picks
    console.log('\n3️⃣ LOADING INDIVIDUAL SURVIVOR PICKS...');
    const survivorPicksSnapshot = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').collection('nerdSurvivor_picks').get();
    console.log(`   Found ${survivorPicksSnapshot.size} individual pick documents`);

    // Step 4: Cross-reference and audit
    console.log('\n4️⃣ COMPREHENSIVE AUDIT ANALYSIS...');
    console.log('=' .repeat(80));

    const auditResults = {
      totalUsers: 0,
      usersWithPicks: 0,
      usersWithoutPicks: 0,
      embeddedMatches: 0,
      embeddedMismatches: 0,
      missingEmbedded: 0,
      discrepancies: [],
      userDetails: {}
    };

    // Process users WITH picks
    survivorPicksSnapshot.docs.forEach(doc => {
      const userId = doc.id;
      const pickData = doc.data();
      const userData = poolMembers[userId];
      const embeddedData = userData?.survivor;

      auditResults.totalUsers++;
      auditResults.usersWithPicks++;

      // Calculate independent survivor status
      const calculatedStatus = calculateSurvivorStatus(userId, pickData, allWeekWinners, userData);

      // Compare with embedded data
      let status = 'UNKNOWN';
      let discrepancy = null;

      if (!embeddedData) {
        status = 'MISSING_EMBEDDED';
        auditResults.missingEmbedded++;
        discrepancy = {
          type: 'MISSING_EMBEDDED',
          userId,
          userName: userData?.displayName || 'Unknown',
          calculated: calculatedStatus,
          embedded: null
        };
      } else if (embeddedData.alive !== calculatedStatus.alive) {
        status = 'MISMATCH';
        auditResults.embeddedMismatches++;
        discrepancy = {
          type: 'STATUS_MISMATCH',
          userId,
          userName: userData?.displayName || 'Unknown',
          calculated: calculatedStatus,
          embedded: embeddedData,
          difference: `Calculated: ${calculatedStatus.alive}, Embedded: ${embeddedData.alive}`
        };
      } else {
        status = 'MATCH';
        auditResults.embeddedMatches++;
      }

      if (discrepancy) {
        auditResults.discrepancies.push(discrepancy);
      }

      // Store detailed user information
      auditResults.userDetails[userId] = {
        userName: userData?.displayName || 'Unknown',
        status,
        picks: pickData.picks,
        calculated: calculatedStatus,
        embedded: embeddedData,
        discrepancy
      };

      console.log(`\n👤 ${userData?.displayName || userId.substring(0,8)}:`);
      console.log(`   Status: ${status}`);
      console.log(`   Calculated Alive: ${calculatedStatus.alive}`);
      console.log(`   Embedded Alive: ${embeddedData?.alive || 'MISSING'}`);
      console.log(`   Picks: ${calculatedStatus.pickHistory || 'None'}`);
      if (calculatedStatus.weekByWeekStatus) {
        calculatedStatus.weekByWeekStatus.forEach(weekStatus => {
          console.log(`   ${weekStatus}`);
        });
      }
    });

    // Process users WITHOUT picks
    const allPoolMemberIds = Object.keys(poolMembers);
    const usersWithPicks = new Set(survivorPicksSnapshot.docs.map(doc => doc.id));
    const usersWithoutPicks = allPoolMemberIds.filter(userId => !usersWithPicks.has(userId));

    usersWithoutPicks.forEach(userId => {
      const userData = poolMembers[userId];
      const embeddedData = userData?.survivor;

      auditResults.totalUsers++;
      auditResults.usersWithoutPicks++;

      const expectedStatus = { alive: 1, eliminationWeek: 1, reason: 'NO_PICKS' };

      let status = 'UNKNOWN';
      let discrepancy = null;

      if (!embeddedData) {
        status = 'MISSING_EMBEDDED';
        auditResults.missingEmbedded++;
        discrepancy = {
          type: 'MISSING_EMBEDDED_NO_PICKS',
          userId,
          userName: userData?.displayName || 'Unknown',
          expected: expectedStatus,
          embedded: null
        };
      } else if (embeddedData.alive !== 1) {
        status = 'MISMATCH';
        auditResults.embeddedMismatches++;
        discrepancy = {
          type: 'NO_PICKS_WRONG_STATUS',
          userId,
          userName: userData?.displayName || 'Unknown',
          expected: expectedStatus,
          embedded: embeddedData,
          difference: `Expected: 1 (no picks), Embedded: ${embeddedData.alive}`
        };
      } else {
        status = 'MATCH';
        auditResults.embeddedMatches++;
      }

      if (discrepancy) {
        auditResults.discrepancies.push(discrepancy);
      }

      auditResults.userDetails[userId] = {
        userName: userData?.displayName || 'Unknown',
        status,
        picks: null,
        calculated: expectedStatus,
        embedded: embeddedData,
        discrepancy
      };

      console.log(`\n👤 ${userData?.displayName || userId.substring(0,8)} (NO PICKS):`);
      console.log(`   Status: ${status}`);
      console.log(`   Expected Alive: 1 (eliminated Week 1)`);
      console.log(`   Embedded Alive: ${embeddedData?.alive || 'MISSING'}`);
    });

    // Step 5: Summary Report
    console.log('\n' + '=' .repeat(80));
    console.log('5️⃣ AUDIT SUMMARY REPORT');
    console.log('=' .repeat(80));

    console.log(`\n📊 OVERALL STATISTICS:`);
    console.log(`   Total Users: ${auditResults.totalUsers}`);
    console.log(`   Users with Picks: ${auditResults.usersWithPicks}`);
    console.log(`   Users without Picks: ${auditResults.usersWithoutPicks}`);
    console.log(`   Embedded Data Matches: ${auditResults.embeddedMatches}`);
    console.log(`   Embedded Data Mismatches: ${auditResults.embeddedMismatches}`);
    console.log(`   Missing Embedded Data: ${auditResults.missingEmbedded}`);

    console.log(`\n🎯 DATA INTEGRITY:`);
    const totalChecked = auditResults.embeddedMatches + auditResults.embeddedMismatches + auditResults.missingEmbedded;
    const accuracyRate = totalChecked > 0 ? Math.round((auditResults.embeddedMatches / totalChecked) * 100) : 0;
    console.log(`   Accuracy Rate: ${accuracyRate}% (${auditResults.embeddedMatches}/${totalChecked})`);

    if (auditResults.discrepancies.length > 0) {
      console.log(`\n🚨 DISCREPANCIES FOUND (${auditResults.discrepancies.length}):`);
      auditResults.discrepancies.forEach((disc, index) => {
        console.log(`\n   ${index + 1}. ${disc.type} - ${disc.userName}:`);
        console.log(`      User ID: ${disc.userId}`);
        if (disc.difference) {
          console.log(`      Issue: ${disc.difference}`);
        }
        if (disc.calculated) {
          console.log(`      Calculated: alive=${disc.calculated.alive}, reason=${disc.calculated.calculationReason || disc.calculated.reason}`);
        }
        if (disc.embedded) {
          console.log(`      Embedded: alive=${disc.embedded.alive}, picks=${disc.embedded.totalPicks}`);
        } else {
          console.log(`      Embedded: MISSING`);
        }
      });
    } else {
      console.log(`\n✅ NO DISCREPANCIES FOUND - ALL DATA IS CONSISTENT!`);
    }

    // Step 6: Detailed game results verification
    console.log(`\n🏈 GAME RESULTS VERIFICATION:`);
    for (let week = 1; week <= 3; week++) {
      console.log(`\n   Week ${week} Winners (${allWeekWinners[week].length} teams):`);
      allWeekWinners[week].forEach(winner => {
        console.log(`      ✅ ${winner}`);
      });
    }

    return {
      success: true,
      auditResults,
      gameResults: allWeekWinners
    };

  } catch (error) {
    console.error('\n❌ AUDIT FAILED:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the audit
if (require.main === module) {
  comprehensiveAudit().then((result) => {
    if (result.success) {
      console.log('\n🎯 COMPREHENSIVE AUDIT COMPLETED SUCCESSFULLY!');

      if (process.argv.includes('--export-json')) {
        const fs = require('fs');
        const exportData = {
          timestamp: new Date().toISOString(),
          auditResults: result.auditResults,
          gameResults: result.gameResults
        };

        fs.writeFileSync('survivor-audit-results.json', JSON.stringify(exportData, null, 2));
        console.log('📄 Audit results exported to: survivor-audit-results.json');
      }

      process.exit(0);
    } else {
      console.log('\n💥 Audit failed:', result.error);
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Audit error:', error);
    process.exit(1);
  });
}

module.exports = { comprehensiveAudit };