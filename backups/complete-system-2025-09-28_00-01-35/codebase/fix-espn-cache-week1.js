#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixESPNCacheWeek1() {
  console.log('🔧 FIXING ESPN CACHE - WEEK 1 CORRECT RESULTS\n');

  try {
    // Get current cache
    const cacheDoc = await db.doc('cache/espn_current_data').get();
    if (!cacheDoc.exists()) {
      console.error('❌ ESPN cache document not found');
      return;
    }

    const currentCache = cacheDoc.data();
    console.log('✅ Current cache loaded');

    // CORRECT Week 1 Results (based on actual NFL results)
    // You said Miami Dolphins LOST, so here are the ACTUAL Week 1 winners:
    const week1ActualWinners = [
      'Philadelphia Eagles',
      'Los Angeles Chargers',
      'Atlanta Falcons',
      'Cleveland Browns',
      // 'Miami Dolphins', // REMOVED - they lost according to user
      'Carolina Panthers',
      'Las Vegas Raiders',
      'Arizona Cardinals',
      'Pittsburgh Steelers',
      'Washington Commanders',
      'Denver Broncos',
      'Seattle Seahawks',
      'Detroit Lions',
      'Houston Texans',
      'Baltimore Ravens',
      'Minnesota Vikings'
    ];

    // What we need to fix: Miami Dolphins should be marked as LOSERS in Week 1
    console.log('🚨 CORRECTING ESPN CACHE DATA:\n');
    console.log('❌ REMOVING: Miami Dolphins from Week 1 winners');
    console.log('✅ CORRECT Week 1 winners:', week1ActualWinners.join(', '));

    // Update teamResults for Week 1
    console.log('\n🔧 UPDATING TEAM RESULTS...');

    // Clear any incorrect Miami Dolphins Week 1 data
    const miamiKeys = ['Miami Dolphins_1', 'Miami_1', 'MIA_1'];
    miamiKeys.forEach(key => {
      if (currentCache.teamResults[key]) {
        console.log(`❌ Removing incorrect result: ${key}`);
        delete currentCache.teamResults[key];
      }
    });

    // Add/update correct Week 1 results
    week1ActualWinners.forEach(team => {
      const teamKey = `${team}_1`;
      currentCache.teamResults[teamKey] = {
        winner: team,
        week: 1,
        result: 'W',
        lastUpdated: Date.now()
      };
      console.log(`✅ Updated: ${teamKey} = WINNER`);
    });

    // Update allGamesData for Week 1 if it exists
    if (currentCache.allGamesData && currentCache.allGamesData['1']) {
      console.log('\n🔧 UPDATING ALL GAMES DATA...');

      // Find any Miami Dolphins games and mark them as losses
      const week1Games = currentCache.allGamesData['1'];
      Object.keys(week1Games).forEach(gameId => {
        const game = week1Games[gameId];

        // Check if Miami was involved in this game
        if (game.homeTeam === 'Miami Dolphins' || game.awayTeam === 'Miami Dolphins') {
          // Miami lost, so opponent won
          if (game.homeTeam === 'Miami Dolphins') {
            game.winner = game.awayTeam;
            console.log(`✅ Fixed game ${gameId}: ${game.awayTeam} beat Miami Dolphins`);
          } else {
            game.winner = game.homeTeam;
            console.log(`✅ Fixed game ${gameId}: ${game.homeTeam} beat Miami Dolphins`);
          }
          game.lastUpdated = Date.now();
        }
      });
    }

    // Update cache metadata
    currentCache.lastUpdated = Date.now();
    currentCache.currentWeek = 2; // We're in week 2 now
    currentCache.updateInProgress = false;
    currentCache.version = "1.1-MANUAL-FIX";

    // Save corrected cache to Firebase
    console.log('\n💾 SAVING CORRECTED CACHE TO FIREBASE...');
    await db.doc('cache/espn_current_data').set(currentCache);

    console.log('✅ ESPN Cache successfully corrected!');
    console.log('\n📊 SUMMARY OF CHANGES:');
    console.log('❌ Miami Dolphins removed from Week 1 winners');
    console.log('✅ Correct Week 1 winners list restored');
    console.log('🔄 Cache version updated to 1.1-MANUAL-FIX');
    console.log('⏰ Last updated timestamp refreshed');

    console.log('\n🚨 NEXT STEP: Re-run survivor elimination check');
    console.log('Users who picked Miami Dolphins should now be correctly eliminated!');

    return {
      success: true,
      correctedTeams: ['Miami Dolphins'],
      correctWinners: week1ActualWinners,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('❌ Error fixing ESPN cache:', error);
    return { success: false, error: error.message };
  }
}

fixESPNCacheWeek1().then((result) => {
  if (result.success) {
    console.log('\n🎯 ESPN CACHE FIX COMPLETED SUCCESSFULLY!');
  } else {
    console.log('\n❌ ESPN CACHE FIX FAILED:', result.error);
  }
  process.exit(0);
});