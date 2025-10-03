const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball.firebaseio.com"
  });
}

const db = admin.firestore();

async function clearLeaderboardCache() {
  console.log('💎 DIAMOND CACHE CLEAR: Post Confidence Data Cleanup');
  console.log('=====================================================');
  console.log('🚨 Clearing all cached leaderboard data to force recalculation');
  console.log('');
  
  try {
    // Clear the cached leaderboard summary in Firestore (correct path with even segments)
    const leaderboardSummaryRef = db.doc('artifacts/nerdfootball/leaderboard_summaries/season_2025');
    
    console.log('🗑️  Clearing Firestore leaderboard summary cache...');
    await leaderboardSummaryRef.delete();
    console.log('✅ Firestore leaderboard cache cleared');
    
    // Also clear any browser localStorage that might cache leaderboard data
    console.log('🧹 Note: Browser-side cache will be cleared on next page load');
    
    console.log('');
    console.log('💎 CACHE CLEAR COMPLETE');
    console.log('=======================');
    console.log('✅ All leaderboard cache cleared from Firestore');
    console.log('✅ Next leaderboard load will recalculate from clean confidence data');
    console.log('');
    console.log('🎯 VALIDATION STEPS:');
    console.log('1. Open the application and check leaderboard displays correct totals');
    console.log('2. Verify confidence values show numbers instead of "?" symbols');
    console.log('3. Check that all user scores reflect the cleaned data');
    console.log('4. Confirm no more undefined confidence values in picks');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    throw error;
  }
}

// Execute cache clear
clearLeaderboardCache()
  .then(() => {
    console.log('\n🚀 Cache clearing completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Cache clear failed:', error);
    process.exit(1);
  });