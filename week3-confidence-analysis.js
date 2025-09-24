const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function analyzeWeek3Confidence() {
  console.log('🏈 WEEK 3 CONFIDENCE POOL ANALYSIS');
  console.log('=====================================\n');

  try {
    // Get pool members first
    console.log('👥 Getting pool members...');
    const poolMembersRef = db.collection('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    const membersSnapshot = await poolMembersRef.get();
    const userNames = {};

    membersSnapshot.docs.forEach(doc => {
      const memberData = doc.data();
      if (memberData.uid) {
        userNames[memberData.uid] = memberData.displayName || memberData.email || 'Unknown User';
      }
    });

    // Get Week 3 picks
    console.log('📝 Getting Week 3 confidence picks...');
    const week3PicksRef = db.collection('artifacts/nerdfootball/public/data/nerdfootball_picks/3/submissions');
    const picksSnapshot = await week3PicksRef.get();

    if (picksSnapshot.empty) {
      console.log('❌ No picks found for Week 3');
      return;
    }

    console.log(`Found ${picksSnapshot.docs.length} users with Week 3 picks\n`);

    // Sample a few users to show the structure
    console.log('📊 SAMPLE PICKS ANALYSIS');
    console.log('========================\n');

    let sampleCount = 0;
    const maxSamples = 5;

    for (const userDoc of picksSnapshot.docs) {
      if (sampleCount >= maxSamples) break;

      const userId = userDoc.id;
      const userName = userNames[userId] || `User ${userId.slice(-6)}`;
      const picksData = userDoc.data();

      console.log(`🎯 ${userName} (${userId.slice(-6)})`);
      console.log('─'.repeat(40));

      if (picksData.picks) {
        const pickEntries = Object.entries(picksData.picks);
        console.log(`Total picks: ${pickEntries.length}`);

        // Show first 3 picks as examples
        pickEntries.slice(0, 3).forEach(([gameKey, pickInfo]) => {
          console.log(`  ${gameKey}: ${pickInfo.team} (Confidence: ${pickInfo.confidence})`);
        });

        if (pickEntries.length > 3) {
          console.log(`  ... and ${pickEntries.length - 3} more picks`);
        }
      } else {
        console.log('  No picks data found');
      }

      console.log('');
      sampleCount++;
    }

    // Summary statistics
    console.log('📈 PARTICIPATION SUMMARY');
    console.log('========================');

    let totalUsers = 0;
    let totalPicks = 0;
    const confidenceDistribution = {};
    const teamPickCounts = {};

    for (const userDoc of picksSnapshot.docs) {
      const picksData = userDoc.data();
      if (picksData.picks) {
        totalUsers++;
        const userPickCount = Object.keys(picksData.picks).length;
        totalPicks += userPickCount;

        // Analyze confidence distribution
        Object.values(picksData.picks).forEach(pickInfo => {
          const conf = pickInfo.confidence;
          confidenceDistribution[conf] = (confidenceDistribution[conf] || 0) + 1;

          // Count team picks
          const team = pickInfo.team;
          teamPickCounts[team] = (teamPickCounts[team] || 0) + 1;
        });
      }
    }

    console.log(`Total users: ${totalUsers}`);
    console.log(`Total picks made: ${totalPicks}`);
    console.log(`Average picks per user: ${(totalPicks / totalUsers).toFixed(1)}\n`);

    // Confidence distribution
    console.log('🎯 CONFIDENCE LEVEL DISTRIBUTION');
    console.log('=================================');
    const sortedConfidences = Object.entries(confidenceDistribution)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    sortedConfidences.forEach(([confidence, count]) => {
      const percentage = (count / totalPicks * 100).toFixed(1);
      console.log(`Confidence ${confidence}: ${count} picks (${percentage}%)`);
    });

    // Most popular teams
    console.log('\n🏆 MOST POPULAR TEAMS (TOP 10)');
    console.log('===============================');
    const sortedTeams = Object.entries(teamPickCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedTeams.forEach(([team, count], index) => {
      const percentage = (count / totalPicks * 100).toFixed(1);
      console.log(`${index + 1}. ${team}: ${count} picks (${percentage}%)`);
    });

    console.log('\n💡 To get game results and calculate actual points:');
    console.log('   1. Week 3 games need to be completed');
    console.log('   2. ESPN API results need to be cached');
    console.log('   3. Run scoring system to calculate points earned');

  } catch (error) {
    console.error('❌ Error analyzing Week 3:', error);
  }
}

analyzeWeek3Confidence();