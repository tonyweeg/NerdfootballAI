const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAZSEAGame() {
  const bibleDoc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/4').get();

  if (!bibleDoc.exists) {
    console.log('❌ No bible data for Week 4');
    return;
  }

  const bible = bibleDoc.data();
  const games = Object.keys(bible).filter(k => k !== '_metadata');

  console.log(`✅ Week 4 Bible Data: ${games.length} games\n`);

  // Find AZ/SEA game
  games.forEach(gameId => {
    const game = bible[gameId];
    if ((game.a && game.a.includes('Arizona')) || (game.h && game.h.includes('Arizona')) ||
        (game.a && game.a.includes('Seattle')) || (game.h && game.h.includes('Seattle'))) {
      console.log(`🏈 Found AZ/SEA Game:`);
      console.log(`  Game ID: ${gameId}`);
      console.log(`  Away: ${game.a}`);
      console.log(`  Home: ${game.h}`);
      console.log(`  Winner: ${game.winner || 'NULL/UNDEFINED'}`);
      console.log(`  Status: ${game.status}`);
      console.log(`  Full data:`, JSON.stringify(game, null, 2));
    }
  });
}

checkAZSEAGame().then(() => process.exit(0));
