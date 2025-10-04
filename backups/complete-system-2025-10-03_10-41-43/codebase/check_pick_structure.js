const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPick() {
  const docRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/WxSPmEildJdqs6T5hIpBUZrscwt2');
  const snap = await docRef.get();
  const data = snap.data();
  
  console.log('Game 401 pick:', JSON.stringify(data['401'], null, 2));
  console.log('\nGame 415 pick:', JSON.stringify(data['415'], null, 2));
  console.log('\nGame 416 pick:', JSON.stringify(data['416'], null, 2));
}

checkPick().then(() => process.exit(0));
