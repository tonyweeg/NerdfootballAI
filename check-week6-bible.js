const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWeek6Data() {
  const bibleDoc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/6').get();

  if (!bibleDoc.exists) {
    console.log('❌ No bible data for Week 6');
    return;
  }

  const bible = bibleDoc.data();
  const games = Object.keys(bible).filter(k => k !== '_metadata');

  console.log(`✅ Week 6 Bible Data: ${games.length} games`);

  let completed = 0;
  let live = 0;
  let upcoming = 0;

  games.forEach(gameId => {
    const game = bible[gameId];
    if (game.status === 'STATUS_FINAL' || game.status === 'final') {
      completed++;
      console.log(`  ✅ ${gameId}: ${game.a} vs ${game.h} - Winner: ${game.winner || 'TIE'}`);
    } else if (game.status === 'IN_PROGRESS' || game.status === 'HALFTIME') {
      live++;
      console.log(`  🔴 ${gameId}: ${game.a} vs ${game.h} - LIVE`);
    } else {
      upcoming++;
    }
  });

  console.log(`\n📊 Game States: ${completed} completed, ${live} live, ${upcoming} upcoming`);
}

checkWeek6Data().then(() => process.exit(0));
