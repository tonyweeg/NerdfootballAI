#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixESPNCacheAllWeeks() {
  console.log('🔧 COMPREHENSIVE ESPN CACHE FIX - ALL 18 WEEKS\n');
  console.log('🚨 CRITICAL DATA INTEGRITY RESTORATION IN PROGRESS...\n');

  try {
    // Get current cache
    const cacheDoc = await db.doc('cache/espn_current_data').get();
    if (!cacheDoc.exists) {
      console.error('❌ ESPN cache document not found');
      return;
    }

    const currentCache = cacheDoc.data();
    console.log('✅ Current cache loaded');

    // CORRECT NFL RESULTS FOR ALL WEEKS (2025 Season)
    // VERIFIED AND CORRECTED BY USER - AUTHORITATIVE SOURCE
    const correctNFLResults = {
      1: [
        'Philadelphia Eagles',
        'Los Angeles Chargers',
        'Arizona Cardinals',
        'Las Vegas Raiders',
        'Jacksonville Jaguars',
        'Indianapolis Colts',
        'Washington Commanders',
        'Cincinnati Bengals',
        'Denver Broncos',
        'Pittsburgh Steelers',
        'Tampa Bay Buccaneers',
        'Green Bay Packers',
        'San Francisco 49ers',
        'Minnesota Vikings',
        'Buffalo Bills',
        'Los Angeles Rams'
      ],
      2: [
        'Green Bay Packers',
        'Arizona Cardinals',
        'Baltimore Ravens',
        'Buffalo Bills',
        'Cincinnati Bengals',
        'Dallas Cowboys',
        'Detroit Lions',
        'Indianapolis Colts',
        'Los Angeles Rams',
        'New England Patriots',
        'Philadelphia Eagles',
        'San Francisco 49ers',
        'Atlanta Falcons',
        'Seattle Seahawks',
        'Tampa Bay Buccaneers',
        'Los Angeles Chargers'
      ]
      // Weeks 3-18 will be added as games are played
    };

    // Calculate current week based on date
    const getCurrentWeek = () => {
      const now = new Date();
      const seasonStart = new Date('2025-09-04');
      const weekMs = 7 * 24 * 60 * 60 * 1000;

      if (now < seasonStart) return 1;

      const weeksSinceStart = Math.floor((now - seasonStart) / weekMs) + 1;
      return Math.min(Math.max(weeksSinceStart, 1), 18);
    };

    const currentWeek = getCurrentWeek();
    console.log(`📅 Current Week: ${currentWeek}`);
    console.log(`🔄 Fixing weeks 1-${Math.min(currentWeek, Object.keys(correctNFLResults).length)}\n`);

    // Clear existing teamResults
    console.log('🗑️ CLEARING CORRUPTED CACHE DATA...');
    currentCache.teamResults = {};
    currentCache.allGamesData = {};

    let totalCorrections = 0;

    // Apply correct results for each completed week
    for (const [weekStr, winners] of Object.entries(correctNFLResults)) {
      const week = parseInt(weekStr);

      if (week <= currentWeek) {
        console.log(`\n🏈 WEEK ${week} - FIXING ${winners.length} WINNING TEAMS:`);
        console.log('==========================================');

        // Update teamResults with correct winners
        winners.forEach(team => {
          const teamKey = `${team}_${week}`;
          currentCache.teamResults[teamKey] = {
            winner: team,
            week: week,
            result: 'W',
            lastUpdated: Date.now(),
            verified: true,
            source: 'MANUAL_CORRECTION'
          };
          console.log(`✅ ${teamKey} = WINNER`);
          totalCorrections++;
        });

        // Initialize week in allGamesData if needed
        if (!currentCache.allGamesData[week]) {
          currentCache.allGamesData[week] = {};
        }

        console.log(`✅ Week ${week}: ${winners.length} teams corrected`);
      }
    }

    // Identify teams that should be LOSERS (critical for survivor pool)
    console.log('\n🚨 IDENTIFYING WEEK 1 LOSERS (CRITICAL FOR SURVIVOR POOL):');
    console.log('=========================================================');

    const allNFLTeams = [
      'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
      'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
      'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
      'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
      'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
      'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
      'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
      'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders'
    ];

    const week1Winners = correctNFLResults[1];
    const week1Losers = allNFLTeams.filter(team => !week1Winners.includes(team));

    console.log('❌ WEEK 1 LOSERS:');
    week1Losers.forEach(team => {
      console.log(`   ${team} - LOST Week 1`);
      // Add loser records to cache
      const teamKey = `${team}_1`;
      currentCache.teamResults[teamKey] = {
        winner: null,
        week: 1,
        result: 'L',
        lastUpdated: Date.now(),
        verified: true,
        source: 'MANUAL_CORRECTION'
      };
      totalCorrections++;
    });

    // Do the same for Week 2
    if (correctNFLResults[2] && currentWeek >= 2) {
      const week2Winners = correctNFLResults[2];
      const week2Losers = allNFLTeams.filter(team => !week2Winners.includes(team));

      console.log('\n❌ WEEK 2 LOSERS:');
      week2Losers.forEach(team => {
        console.log(`   ${team} - LOST Week 2`);
        const teamKey = `${team}_2`;
        currentCache.teamResults[teamKey] = {
          winner: null,
          week: 2,
          result: 'L',
          lastUpdated: Date.now(),
          verified: true,
          source: 'MANUAL_CORRECTION'
        };
        totalCorrections++;
      });
    }

    // Update cache metadata
    currentCache.lastUpdated = Date.now();
    currentCache.currentWeek = currentWeek;
    currentCache.updateInProgress = false;
    currentCache.version = "2.0-COMPREHENSIVE-FIX";
    currentCache.correctionMetadata = {
      correctedWeeks: Object.keys(correctNFLResults).map(w => parseInt(w)),
      totalCorrections: totalCorrections,
      correctionTimestamp: Date.now(),
      dataSource: 'VERIFIED_NFL_RESULTS'
    };

    // Save corrected cache to Firebase
    console.log('\n💾 SAVING COMPREHENSIVE CORRECTIONS TO FIREBASE...');
    await db.doc('cache/espn_current_data').set(currentCache);

    console.log('\n🎯 COMPREHENSIVE ESPN CACHE FIX COMPLETED!');
    console.log('==========================================');
    console.log(`✅ Total corrections applied: ${totalCorrections}`);
    console.log(`✅ Weeks corrected: ${Object.keys(correctNFLResults).join(', ')}`);
    console.log(`✅ Cache version: 2.0-COMPREHENSIVE-FIX`);
    console.log(`✅ All winner/loser data verified`);

    console.log('\n🔍 CRITICAL SURVIVOR POOL IMPLICATIONS:');
    console.log('======================================');
    console.log('❌ Miami Dolphins Week 1 pickers should be ELIMINATED');
    console.log('❌ All Week 1 loser pickers should be ELIMINATED');
    console.log('❌ All Week 2 loser pickers should be ELIMINATED');
    console.log('\n🚨 NEXT: Run survivor elimination fix script!');

    return {
      success: true,
      totalCorrections: totalCorrections,
      correctedWeeks: Object.keys(correctNFLResults),
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('❌ Error in comprehensive ESPN cache fix:', error);
    return { success: false, error: error.message };
  }
}

fixESPNCacheAllWeeks().then((result) => {
  if (result.success) {
    console.log('\n🎯 COMPREHENSIVE ESPN CACHE FIX SUCCESSFUL!');
  } else {
    console.log('\n❌ COMPREHENSIVE ESPN CACHE FIX FAILED:', result.error);
  }
  process.exit(0);
});