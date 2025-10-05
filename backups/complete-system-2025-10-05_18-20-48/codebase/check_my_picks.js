const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPicks() {
  const docRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/WxSPmEildJdqs6T5hIpBUZrscwt2');
  const snap = await docRef.get();
  
  if (!snap.exists) {
    console.log('Document does not exist!');
    return;
  }
  
  const data = snap.data();
  const gameIds = Object.keys(data).filter(k => !['userName', 'submittedAt', 'weekNumber', 'timestamp', 'mondayNightPoints', 'mnfTotalPoints', 'tiebreaker', 'totalPoints', 'userId', 'lastUpdated', 'poolId', 'survivorPick', 'createdAt', 'week', 'games'].includes(k));
  
  console.log('Game picks found:', gameIds.sort());
  console.log('Total picks:', gameIds.length);
  
  console.log('\nAll pick data keys:', Object.keys(data).sort());
}

checkPicks().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
