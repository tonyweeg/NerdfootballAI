const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkGame414() {
  const bibleDoc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/4').get();
  const bible = bibleDoc.data();
  const game414 = bible['414'];

  console.log('🏈 Game 414 (GB @ DAL) TIE GAME:');
  console.log(JSON.stringify(game414, null, 2));
  console.log('\n📊 Analysis:');
  console.log(`  Score: ${game414.a} ${game414.awayScore} @ ${game414.h} ${game414.homeScore}`);
  console.log(`  Winner: ${game414.winner === null ? 'NULL (correct for tie)' : game414.winner}`);
  console.log(`  Status: ${game414.status}`);

  if (game414.awayScore === game414.homeScore && game414.winner === null) {
    console.log('\n✅ TIE GAME CORRECTLY CONFIGURED');
    console.log('   All users get their confidence points for this game!');
  } else if (game414.awayScore === game414.homeScore && game414.winner !== null) {
    console.log('\n❌ TIE GAME BUT WINNER IS SET - NEEDS FIX');
  }

  process.exit(0);
}

checkGame414();
