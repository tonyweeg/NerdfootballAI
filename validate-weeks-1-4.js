const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function validateWeeks() {
  console.log('🔍 VALIDATING WEEKS 1-4 DATA INTEGRITY\n');

  const issues = [];

  for (let week = 1; week <= 4; week++) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📅 WEEK ${week} VALIDATION`);
    console.log('='.repeat(60));

    const bibleDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${week}`).get();

    if (!bibleDoc.exists) {
      console.log(`❌ No bible data for Week ${week}`);
      issues.push(`Week ${week}: Missing bible data`);
      continue;
    }

    const bible = bibleDoc.data();
    const gameIds = Object.keys(bible).filter(k => k !== '_metadata');

    console.log(`\n📊 ${gameIds.length} games found`);

    let validGames = 0;
    let invalidGames = 0;
    let finalGames = 0;
    let inProgressGames = 0;
    let scheduledGames = 0;

    gameIds.forEach(gameId => {
      const game = bible[gameId];

      // Check game status
      const status = (game.status || '').toLowerCase();
      if (status === 'status_final' || status === 'final') {
        finalGames++;

        // Validate final games
        if (!game.winner) {
          console.log(`  ❌ Game ${gameId}: FINAL but no winner`);
          console.log(`     ${game.a} @ ${game.h}`);
          console.log(`     Score: ${game.awayScore} - ${game.homeScore}`);
          issues.push(`Week ${week} Game ${gameId}: FINAL but no winner`);
          invalidGames++;
        } else if (game.winner !== game.a && game.winner !== game.h) {
          console.log(`  ❌ Game ${gameId}: Winner "${game.winner}" not in game`);
          console.log(`     Teams: ${game.a} @ ${game.h}`);
          console.log(`     Score: ${game.awayScore} - ${game.homeScore}`);
          issues.push(`Week ${week} Game ${gameId}: Invalid winner "${game.winner}"`);
          invalidGames++;
        } else {
          // Verify winner matches score
          const correctWinner = game.homeScore > game.awayScore ? game.h : game.a;
          if (game.homeScore === game.awayScore) {
            // Tie game - winner should be null
            if (game.winner !== null) {
              console.log(`  ⚠️ Game ${gameId}: TIE (${game.homeScore}-${game.awayScore}) but winner is ${game.winner}`);
              issues.push(`Week ${week} Game ${gameId}: Tie game should have null winner`);
              invalidGames++;
            } else {
              validGames++;
            }
          } else if (game.winner !== correctWinner) {
            console.log(`  ❌ Game ${gameId}: Winner mismatch`);
            console.log(`     ${game.a} ${game.awayScore} @ ${game.h} ${game.homeScore}`);
            console.log(`     Stored winner: ${game.winner}`);
            console.log(`     Correct winner: ${correctWinner}`);
            issues.push(`Week ${week} Game ${gameId}: Winner should be ${correctWinner}, not ${game.winner}`);
            invalidGames++;
          } else {
            validGames++;
          }
        }
      } else if (status === 'in_progress' || status === 'halftime') {
        inProgressGames++;
      } else {
        scheduledGames++;
      }
    });

    console.log(`\n📈 Week ${week} Summary:`);
    console.log(`  ✅ Valid games: ${validGames}`);
    console.log(`  ❌ Invalid games: ${invalidGames}`);
    console.log(`  🏁 Final games: ${finalGames}`);
    console.log(`  🔴 In progress: ${inProgressGames}`);
    console.log(`  📅 Scheduled: ${scheduledGames}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 VALIDATION SUMMARY');
  console.log('='.repeat(60));

  if (issues.length === 0) {
    console.log('✅ ALL WEEKS 1-4 ARE VALID - NO ISSUES FOUND');
  } else {
    console.log(`❌ FOUND ${issues.length} ISSUES:\n`);
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }

  process.exit(issues.length > 0 ? 1 : 0);
}

validateWeeks();
