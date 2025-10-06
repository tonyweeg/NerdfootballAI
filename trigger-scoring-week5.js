const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function triggerScoring() {
  try {
    console.log('🏆 Triggering Week 5 scoring...');

    // Call the Cloud Function
    const functions = require('firebase-functions-test')();
    const processWeeklyScoring = require('./functions/bulletproofWeeklyScoring').processWeeklyScoring;

    const wrapped = functions.wrap(processWeeklyScoring);
    const result = await wrapped({ week: 5 });

    console.log('✅ Scoring complete:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

triggerScoring();
