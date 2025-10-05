const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearWeek4Cache() {
    console.log('🗑️  CLEARING WEEK 4 CACHE TO FORCE REFRESH WITH TIE GAME FIX\n');

    const cacheRef = db.doc('cache/weekly_leaderboard_2025_week_4');

    console.log('Deleting Week 4 cache document...');
    await cacheRef.delete();

    console.log('✅ Week 4 cache cleared!');
    console.log('📊 Next call to getWeeklyLeaderboard will regenerate with correct completion count (16/16)');

    process.exit(0);
}

clearWeek4Cache().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
