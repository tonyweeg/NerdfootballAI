const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fullWeek3Analysis() {
  try {
    console.log('🏈 WEEK 3 CONFIDENCE POOL - WHO PICKED WHAT');
    console.log('=============================================\n');

    // Get Week 3 picks
    const week3PicksRef = db.collection('artifacts/nerdfootball/public/data/nerdfootball_picks/3/submissions');
    const picksSnapshot = await week3PicksRef.get();

    console.log(`📊 Found picks from ${picksSnapshot.docs.length} users\n`);

    // Analyze picks
    const teamPicks = {};
    const confidenceStats = {};
    const userAnalysis = [];
    let totalPicks = 0;

    for (const userDoc of picksSnapshot.docs) {
      const userId = userDoc.id;
      const userName = `User_${userId.slice(-6)}`;
      const picksData = userDoc.data();

      let userPickCount = 0;
      const userPicks = {};

      // Process each game pick (exclude mnfTotalPoints)
      Object.entries(picksData).forEach(([gameId, pickData]) => {
        if (gameId !== 'mnfTotalPoints' && pickData.winner && pickData.confidence) {
          const team = pickData.winner;
          const conf = pickData.confidence;

          userPicks[gameId] = { team, confidence: conf };
          userPickCount++;
          totalPicks++;

          // Track overall stats
          if (!teamPicks[team]) teamPicks[team] = [];
          teamPicks[team].push({ user: userName, confidence: conf, gameId });

          if (!confidenceStats[conf]) confidenceStats[conf] = 0;
          confidenceStats[conf]++;
        }
      });

      userAnalysis.push({
        userName,
        userId: userId.slice(-6),
        pickCount: userPickCount,
        picks: userPicks,
        mnfTotal: picksData.mnfTotalPoints
      });
    }

    // Show sample of user picks
    console.log('📝 SAMPLE USER PICKS (First 5 users)');
    console.log('=====================================');
    userAnalysis.slice(0, 5).forEach(user => {
      console.log(`\n🎯 ${user.userName}`);
      console.log(`   Total picks: ${user.pickCount}`);
      console.log(`   MNF Total: ${user.mnfTotal}`);

      Object.entries(user.picks).slice(0, 4).forEach(([gameId, pick]) => {
        console.log(`   Game ${gameId}: ${pick.team} (confidence: ${pick.confidence})`);
      });

      if (user.pickCount > 4) {
        console.log(`   ... and ${user.pickCount - 4} more picks`);
      }
    });

    // Most popular teams
    console.log('\n\n🏆 MOST POPULAR TEAMS (TOP 12)');
    console.log('===============================');
    const sortedTeams = Object.entries(teamPicks)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 12);

    sortedTeams.forEach(([team, picks], i) => {
      const avgConf = (picks.reduce((sum, p) => sum + p.confidence, 0) / picks.length).toFixed(1);
      console.log(`${i+1}. ${team}: ${picks.length} picks (avg confidence: ${avgConf})`);
    });

    // Confidence distribution
    console.log('\n🎯 CONFIDENCE DISTRIBUTION');
    console.log('===========================');
    const sortedConf = Object.entries(confidenceStats)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    sortedConf.forEach(([conf, count]) => {
      const pct = (count / totalPicks * 100).toFixed(1);
      console.log(`Confidence ${conf}: ${count} picks (${pct}%)`);
    });

    // High confidence picks analysis
    console.log('\n💎 HIGHEST CONFIDENCE PICKS (14-16 points)');
    console.log('============================================');
    const highConfidenceTeams = [];

    Object.entries(teamPicks).forEach(([team, picks]) => {
      const highConfPicks = picks.filter(p => p.confidence >= 14);
      if (highConfPicks.length > 0) {
        highConfidenceTeams.push({ team, picks: highConfPicks });
      }
    });

    // Sort by number of high confidence picks
    highConfidenceTeams.sort((a, b) => b.picks.length - a.picks.length);

    highConfidenceTeams.forEach(({ team, picks }) => {
      console.log(`\n${team}: ${picks.length} high-confidence picks`);
      picks.forEach(pick => {
        console.log(`  - ${pick.user} (confidence: ${pick.confidence})`);
      });
    });

    console.log('\n📊 SUMMARY STATISTICS');
    console.log('=====================');
    console.log(`Total users: ${userAnalysis.length}`);
    console.log(`Total picks made: ${totalPicks}`);
    console.log(`Average picks per user: ${(totalPicks / userAnalysis.length).toFixed(1)}`);

    const avgPickCount = userAnalysis.reduce((sum, u) => sum + u.pickCount, 0) / userAnalysis.length;
    console.log(`Most common pick count: ${Math.round(avgPickCount)}`);

    // Show which games had the most picks
    console.log('\n🎮 GAME PARTICIPATION');
    console.log('=====================');
    const gameParticipation = {};

    userAnalysis.forEach(user => {
      Object.keys(user.picks).forEach(gameId => {
        if (!gameParticipation[gameId]) gameParticipation[gameId] = 0;
        gameParticipation[gameId]++;
      });
    });

    const sortedGames = Object.entries(gameParticipation)
      .sort((a, b) => b[1] - a[1]);

    console.log('Games ranked by number of picks:');
    sortedGames.forEach(([gameId, count]) => {
      console.log(`Game ${gameId}: ${count} picks`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fullWeek3Analysis();