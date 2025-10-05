#!/usr/bin/env node

// ESPN Cache Score Investigation Script
// This script will examine the ESPN cache data and identify potential wrong scores

const admin = require('firebase-admin');

// Initialize Firebase Admin (without service account key for now)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: 'nerdfootball'
    });
  } catch (error) {
    console.log('Firebase admin initialization with default credentials');
  }
}

const db = admin.firestore();

async function investigateEspnCacheScores() {
  try {
    console.log('🔍 ESPN CACHE SCORE INVESTIGATION');
    console.log('=' * 50);

    // Check the main ESPN cache document
    console.log('\n1. Checking main ESPN cache document...');
    const cacheDoc = await db.doc('cache/espn_current_data').get();

    if (cacheDoc.exists) {
      const cacheData = cacheDoc.data();
      console.log('✅ ESPN cache document found');
      console.log('📊 Cache keys:', Object.keys(cacheData));

      if (cacheData.lastUpdated) {
        const lastUpdate = new Date(cacheData.lastUpdated);
        const ageMinutes = Math.floor((Date.now() - cacheData.lastUpdated) / (1000 * 60));
        console.log(`🕒 Last updated: ${lastUpdate.toLocaleString()} (${ageMinutes} minutes ago)`);
      }

      if (cacheData.currentWeek) {
        console.log(`📅 Current week: ${cacheData.currentWeek}`);
      }

      // Examine team results for wrong scores
      if (cacheData.teamResults) {
        console.log('\n2. Examining team results for score anomalies...');
        const teamResults = cacheData.teamResults;
        const resultKeys = Object.keys(teamResults);

        console.log(`📈 Found ${resultKeys.length} team results`);

        let wrongScores = [];
        let suspiciousResults = [];

        resultKeys.forEach(key => {
          const result = teamResults[key];

          // Check for obviously wrong scores (negative, extremely high, etc.)
          if (result.homeScore < 0 || result.awayScore < 0) {
            wrongScores.push({
              key,
              issue: 'Negative scores',
              homeScore: result.homeScore,
              awayScore: result.awayScore,
              homeTeam: result.homeTeam,
              awayTeam: result.awayTeam
            });
          }

          if (result.homeScore > 100 || result.awayScore > 100) {
            wrongScores.push({
              key,
              issue: 'Extremely high scores',
              homeScore: result.homeScore,
              awayScore: result.awayScore,
              homeTeam: result.homeTeam,
              awayTeam: result.awayTeam
            });
          }

          // Check for string scores that should be numbers
          if (typeof result.homeScore === 'string' || typeof result.awayScore === 'string') {
            if (isNaN(parseInt(result.homeScore)) || isNaN(parseInt(result.awayScore))) {
              wrongScores.push({
                key,
                issue: 'Non-numeric scores',
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                homeTeam: result.homeTeam,
                awayTeam: result.awayTeam
              });
            } else {
              suspiciousResults.push({
                key,
                issue: 'String scores (should be numbers)',
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                homeTeam: result.homeTeam,
                awayTeam: result.awayTeam
              });
            }
          }

          // Check for inconsistent winner vs scores
          if (result.winner && result.winner !== 'TBD' && result.winner !== 'TIE') {
            const homeScoreNum = parseInt(result.homeScore) || 0;
            const awayScoreNum = parseInt(result.awayScore) || 0;

            if (homeScoreNum > awayScoreNum && result.winner !== result.homeTeam) {
              wrongScores.push({
                key,
                issue: 'Winner mismatch - home team has higher score but is not winner',
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                homeTeam: result.homeTeam,
                awayTeam: result.awayTeam,
                winner: result.winner
              });
            } else if (awayScoreNum > homeScoreNum && result.winner !== result.awayTeam) {
              wrongScores.push({
                key,
                issue: 'Winner mismatch - away team has higher score but is not winner',
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                homeTeam: result.homeTeam,
                awayTeam: result.awayTeam,
                winner: result.winner
              });
            }
          }
        });

        // Report findings
        console.log('\n3. SCORE ANOMALY REPORT:');
        if (wrongScores.length > 0) {
          console.log(`🚨 CRITICAL: Found ${wrongScores.length} wrong scores:`);
          wrongScores.forEach((wrong, index) => {
            console.log(`   ${index + 1}. ${wrong.key}`);
            console.log(`      Issue: ${wrong.issue}`);
            console.log(`      Game: ${wrong.awayTeam} @ ${wrong.homeTeam}`);
            console.log(`      Score: ${wrong.awayTeam} ${wrong.awayScore} - ${wrong.homeTeam} ${wrong.homeScore}`);
            if (wrong.winner) console.log(`      Winner: ${wrong.winner}`);
            console.log('');
          });
        } else {
          console.log('✅ No critical score errors found');
        }

        if (suspiciousResults.length > 0) {
          console.log(`⚠️  WARNING: Found ${suspiciousResults.length} suspicious results:`);
          suspiciousResults.forEach((sus, index) => {
            console.log(`   ${index + 1}. ${sus.key}: ${sus.issue}`);
            console.log(`      Score: ${sus.awayTeam} ${sus.awayScore} - ${sus.homeTeam} ${sus.homeScore}`);
          });
        }

        // Sample a few results for inspection
        console.log('\n4. Sample results for inspection:');
        const sampleKeys = resultKeys.slice(0, 3);
        sampleKeys.forEach(key => {
          const result = teamResults[key];
          console.log(`📊 ${key}:`);
          console.log(`   Game: ${result.awayTeam} @ ${result.homeTeam}`);
          console.log(`   Score: ${result.awayScore} - ${result.homeScore}`);
          console.log(`   Winner: ${result.winner}`);
          console.log(`   Status: ${result.status}`);
          console.log(`   Types: homeScore=${typeof result.homeScore}, awayScore=${typeof result.awayScore}`);
          console.log('');
        });
      }

      // Check all games data
      if (cacheData.allGamesData) {
        console.log('\n5. Examining allGamesData...');
        const weeks = Object.keys(cacheData.allGamesData);
        console.log(`📅 Found game data for weeks: ${weeks.join(', ')}`);

        weeks.forEach(week => {
          const games = cacheData.allGamesData[week];
          if (Array.isArray(games)) {
            console.log(`   Week ${week}: ${games.length} games`);

            // Check first game for structure
            if (games.length > 0) {
              const game = games[0];
              console.log(`     Sample game structure:`, Object.keys(game));
              console.log(`     Sample scores: ${game.away_team || game.awayTeam} ${game.away_score || game.awayScore} - ${game.home_team || game.homeTeam} ${game.home_score || game.homeScore}`);
            }
          }
        });
      }

    } else {
      console.log('❌ ESPN cache document not found');
    }

    console.log('\n6. Checking for other cache documents...');
    const cacheCollection = await db.collection('cache').limit(10).get();
    console.log(`📁 Found ${cacheCollection.size} documents in cache collection:`);
    cacheCollection.docs.forEach(doc => {
      console.log(`   - ${doc.id}`);
    });

  } catch (error) {
    console.error('❌ Investigation error:', error);
    if (error.code === 'unauthenticated') {
      console.log('\n💡 Authentication issue. You may need to set up Firebase credentials.');
      console.log('   Try: firebase login');
      console.log('   Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    }
  }
}

investigateEspnCacheScores().then(() => {
  console.log('\n✅ ESPN cache score investigation complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});