const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWeek5Data() {
  const bibleDoc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/5').get();

  if (!bibleDoc.exists) {
    console.log('❌ No bible data for Week 5');
    return;
  }

  const bible = bibleDoc.data();
  const games = Object.keys(bible).filter(k => k !== '_metadata');

  console.log(`✅ Week 5 Bible Data: ${games.length} games\n`);

  let completed = 0;
  let live = 0;
  let upcoming = 0;

  games.forEach(gameId => {
    const game = bible[gameId];
    if (game.status === 'STATUS_FINAL' || game.status === 'final') {
      completed++;
      console.log(`  ✅ Game ${gameId}: ${game.a} @ ${game.h} - Winner: ${game.winner || 'TIE'} (${game.status})`);
    } else if (game.status === 'IN_PROGRESS' || game.status === 'HALFTIME') {
      live++;
      console.log(`  🔴 Game ${gameId}: ${game.a} @ ${game.h} - LIVE (${game.status})`);
    } else {
      upcoming++;
      console.log(`  ⏳ Game ${gameId}: ${game.a} @ ${game.h} - ${game.status}`);
    }
  });

  console.log(`\n📊 Game States: ${completed} completed, ${live} live, ${upcoming} upcoming`);
}

checkWeek5Data().then(() => process.exit(0));
