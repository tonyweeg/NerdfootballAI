const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixGame401() {
  console.log('🔧 Fixing Week 4 Game 401 (AZ vs SEA)...');

  const gameRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/4');

  // Update just the winner field for game 401
  await gameRef.update({
    '401.winner': 'Arizona Cardinals'
  });

  console.log('✅ Fixed: Game 401 winner set to Arizona Cardinals (28-3 over Seattle)');

  // Verify the fix
  const verifySnap = await gameRef.get();
  const verifyData = verifySnap.data();
  console.log('\n✅ Verification:');
  console.log(`  Game 401 Winner: ${verifyData['401'].winner}`);
  console.log(`  Score: Arizona ${verifyData['401'].homeScore} - Seattle ${verifyData['401'].awayScore}`);

  process.exit(0);
}

fixGame401();
