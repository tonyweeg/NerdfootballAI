const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkScoring() {
  const docRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/WxSPmEildJdqs6T5hIpBUZrscwt2');
  const snap = await docRef.get();
  const data = snap.data();
  
  const week4 = data.weeklyPoints && data.weeklyPoints['4'];
  
  console.log('Week 4 scoring data:', JSON.stringify(week4, null, 2));
}

checkScoring().then(() => process.exit(0));
