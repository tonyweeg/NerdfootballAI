#!/usr/bin/env node

/**
 * 🎯 GENESIS SURVIVOR SYSTEM - THE BREAKTHROUGH IMPLEMENTATION
 *
 * This script processes ALL historical survivor data and creates the embedded
 * survivor data structure that enables lightning-fast admin interfaces.
 *
 * LOGIC: Week-by-week elimination processing using pick progression
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

// Extract winners from game results for each week
async function extractWeekWinners(weekNumber) {
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

// CORE ALGORITHM: Process individual user's survival week by week
function processUserSurvival(userId, userPicks, allWeekWinners, userData) {
  let alive = 18;           // Start alive (can survive all 18 weeks)
  let pickHistory = [];     // Chronological picks
  let eliminationWeek = null;

  console.log(`   👤 ${userData?.displayName || userId.substring(0,8)}: Processing picks...`);

  if (!userPicks.picks) {
    // User has no picks - eliminated Week 1
    return {
      alive: 1,
      pickHistory: "",
      totalPicks: 0,
      eliminationWeek: 1,
      lastUpdated: new Date().toISOString(),
      manualOverride: false
    };
  }

  // Get weeks chronologically
  const pickedWeeks = Object.keys(userPicks.picks).map(w => parseInt(w)).sort((a, b) => a - b);

  // Process each week chronologically
  for (const week of pickedWeeks) {
    const weekPick = userPicks.picks[week];
    const pickedTeam = normalizeTeamName(weekPick.team);
    const weekWinners = allWeekWinners[week] || [];

    pickHistory.push(pickedTeam);
    console.log(`      Week ${week}: ${pickedTeam}`);

    // Check if their pick won this week
    if (weekWinners.includes(pickedTeam)) {
      console.log(`         ✅ ${pickedTeam} WON - survived Week ${week}`);
      // Continue to next week
    } else if (weekWinners.length > 0) {
      // Week has results and their team didn't win
      console.log(`         💀 ${pickedTeam} LOST - eliminated in Week ${week}`);
      alive = week;
      eliminationWeek = week;
      break; // Stop processing further weeks
    } else {
      // Week has no results yet - assume alive for now
      console.log(`         ❓ ${pickedTeam} result unknown - continuing`);
    }
  }

  return {
    alive,
    pickHistory: pickHistory.join(', '),
    totalPicks: pickHistory.length,
    eliminationWeek,
    lastUpdated: new Date().toISOString(),
    manualOverride: false
  };
}

async function genesisEmbeddedSurvivorData() {
  console.log('🎯 GENESIS EMBEDDED SURVIVOR DATA - THE BREAKTHROUGH IMPLEMENTATION\n');

  try {
    // Step 1: Load game results for all completed weeks
    console.log('1️⃣ Loading game results for all completed weeks...');
    const allWeekWinners = {};
    // Calculate current week dynamically
    const getCurrentWeek = () => {
      const now = new Date();
      const seasonStart = new Date('2025-09-04');
      const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
      return Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
    };

    const currentWeek = getCurrentWeek();
    for (let week = 1; week <= currentWeek; week++) { // Dynamic week calculation - automatically advances
      allWeekWinners[week] = await extractWeekWinners(week);
      console.log(`   Week ${week}: ${allWeekWinners[week].length} winning teams`);
    }

    // Step 2: Load pool members for name mapping
    console.log('\n2️⃣ Loading pool member data...');
    const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }
    const poolMembers = poolDoc.data();
    console.log(`✅ Found ${Object.keys(poolMembers).length} pool members`);

    // Step 3: Load all individual survivor picks
    console.log('\n3️⃣ Loading all individual survivor picks...');
    const survivorPicksSnapshot = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').collection('nerdSurvivor_picks').get();
    console.log(`✅ Found ${survivorPicksSnapshot.size} users with survivor picks`);

    // Step 4: Process each user's survival status
    console.log('\n4️⃣ Processing survivor picks and calculating alive status...');
    const embeddedUpdates = {};
    let totalProcessed = 0;
    let stillAlive = 0;
    let eliminated = 0;

    // Process users WITH picks
    survivorPicksSnapshot.docs.forEach(doc => {
      const userId = doc.id;
      const userData = poolMembers[userId];
      const pickData = doc.data();

      const survivorStatus = processUserSurvival(userId, pickData, allWeekWinners, userData);

      embeddedUpdates[`${userId}.survivor`] = survivorStatus;

      if (survivorStatus.alive === 18) {
        stillAlive++;
      } else {
        eliminated++;
      }

      totalProcessed++;
    });

    // Process users WITHOUT picks (set default eliminated status)
    const allPoolMemberIds = Object.keys(poolMembers);
    const usersWithPicks = new Set(survivorPicksSnapshot.docs.map(doc => doc.id));
    const usersWithoutPicks = allPoolMemberIds.filter(userId => !usersWithPicks.has(userId));

    console.log(`\n📋 Found ${usersWithoutPicks.length} users without picks - setting default status...`);
    usersWithoutPicks.forEach(userId => {
      const userData = poolMembers[userId];
      embeddedUpdates[`${userId}.survivor`] = {
        alive: 1,                    // Eliminated Week 1 for no pick
        pickHistory: "",
        totalPicks: 0,
        eliminationWeek: 1,
        lastUpdated: new Date().toISOString(),
        manualOverride: false
      };
      eliminated++;
      console.log(`   📝 ${userData?.displayName || 'Unknown'}: NO PICKS - eliminated Week 1`);
    });

    totalProcessed += usersWithoutPicks.length;

    console.log(`\n✅ Processed ${totalProcessed} total users`);

    // Step 5: Summary statistics
    console.log('\n5️⃣ SURVIVOR STATUS SUMMARY:');
    console.log(`🏆 Still Alive: ${stillAlive} users`);
    console.log(`💀 Eliminated: ${eliminated} users`);
    console.log(`📊 Total Users: ${totalProcessed} users`);

    // Step 6: Show preview of what will be updated
    console.log('\n6️⃣ PREVIEW OF EMBEDDED DATA UPDATES:');
    const sampleUserIds = Object.keys(embeddedUpdates).slice(0, 5);
    sampleUserIds.forEach(userField => {
      const userId = userField.replace('.survivor', '');
      const userData = poolMembers[userId];
      const survivorData = embeddedUpdates[userField];

      console.log(`\n   👤 ${userData?.displayName || 'Unknown'}:`);
      console.log(`      alive: ${survivorData.alive}`);
      console.log(`      pickHistory: "${survivorData.pickHistory}"`);
      console.log(`      totalPicks: ${survivorData.totalPicks}`);
      console.log(`      status: ${survivorData.alive === 18 ? 'ALIVE' : `ELIMINATED Week ${survivorData.alive}`}`);
    });

    return {
      success: true,
      embeddedUpdates,
      statistics: {
        totalUsers: totalProcessed,
        stillAlive,
        eliminated,
        usersWithPicks: survivorPicksSnapshot.size,
        usersWithoutPicks: usersWithoutPicks.length
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

// Apply the embedded data updates atomically
async function applyEmbeddedDataUpdates(embeddedUpdates) {
  console.log('\n🔄 APPLYING EMBEDDED DATA UPDATES ATOMICALLY...');

  try {
    // Create backup first
    console.log('📋 Creating backup before applying updates...');
    const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
    const currentPoolDoc = await db.doc(poolMembersPath).get();

    await db.doc('backups/pool-members-pre-survivor-genesis').set({
      data: currentPoolDoc.data(),
      timestamp: new Date().toISOString(),
      reason: 'Pre-survivor-genesis backup',
      totalUpdates: Object.keys(embeddedUpdates).length
    });
    console.log('✅ Backup created successfully');

    // Apply updates atomically using transaction
    console.log('🔄 Applying updates with Firestore transaction...');
    await db.runTransaction(async (transaction) => {
      const poolRef = db.doc(poolMembersPath);
      transaction.update(poolRef, embeddedUpdates);
    });

    console.log('✅ Successfully updated embedded survivor data for all users');
    console.log(`📊 Applied ${Object.keys(embeddedUpdates).length} updates atomically`);

    return { success: true };

  } catch (error) {
    console.error('❌ Update failed:', error);
    return { success: false, error: error.message };
  }
}

// Main execution
if (require.main === module) {
  genesisEmbeddedSurvivorData().then((result) => {
    if (result.success) {
      console.log('\n🎯 Genesis process completed successfully!');
      console.log('📊 Final Statistics:');
      console.log(`   Total Users: ${result.statistics.totalUsers}`);
      console.log(`   Still Alive: ${result.statistics.stillAlive}`);
      console.log(`   Eliminated: ${result.statistics.eliminated}`);

      // Check if --apply flag is provided
      if (process.argv.includes('--apply')) {
        console.log('\n🔄 Applying updates...');
        return applyEmbeddedDataUpdates(result.embeddedUpdates);
      } else {
        console.log('\n💡 This was a DRY RUN. Add --apply to actually update data.');
        console.log('   Command: node genesis-survivor-system.js --apply');
        process.exit(0);
      }
    } else {
      console.log('\n💥 Genesis failed:', result.error);
      process.exit(1);
    }
  }).then((applyResult) => {
    if (applyResult) {
      if (applyResult.success) {
        console.log('\n🎯 EMBEDDED SURVIVOR DATA SUCCESSFULLY DEPLOYED!');
        console.log('✨ The survivor system is now ready for lightning-fast admin interfaces!');
        process.exit(0);
      } else {
        console.log('\n💥 Update failed:', applyResult.error);
        process.exit(1);
      }
    }
  }).catch(error => {
    console.error('\n💥 Genesis error:', error);
    process.exit(1);
  });
}

module.exports = { genesisEmbeddedSurvivorData, applyEmbeddedDataUpdates };