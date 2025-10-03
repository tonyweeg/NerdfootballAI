const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkGames() {
  const docRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/4');
  const snap = await docRef.get();
  
  if (!snap.exists) {
    console.log('Document does not exist!');
    return;
  }
  
  const data = snap.data();
  const gameIds = Object.keys(data).filter(k => k !== '_metadata');
  
  console.log('Game IDs found:', gameIds.sort());
  console.log('Total games:', gameIds.length);
  
  if (data['415']) {
    console.log('\nGame 415:', JSON.stringify(data['415'], null, 2));
  } else {
    console.log('\nGame 415: NOT FOUND');
  }
  
  if (data['416']) {
    console.log('\nGame 416:', JSON.stringify(data['416'], null, 2));
  } else {
    console.log('\nGame 416: NOT FOUND');
  }
}

checkGames().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
