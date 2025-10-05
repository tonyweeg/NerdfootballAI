const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkResults() {
  const docRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_results/4');
  const snap = await docRef.get();
  
  if (!snap.exists) {
    console.log('Results document does not exist!');
    return;
  }
  
  const data = snap.data();
  console.log('Keys in results document:', Object.keys(data).sort());
  console.log('\nTotal keys:', Object.keys(data).length);
  
  // Check a sample user
  const userId = 'WxSPmEildJdqs6T5hIpBUZrscwt2';
  if (data[userId]) {
    console.log(`\nYour (${userId}) results:`, JSON.stringify(data[userId], null, 2));
  }
}

checkResults().then(() => process.exit(0));
