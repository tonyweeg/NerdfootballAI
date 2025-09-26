const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function completeWeek3Analysis() {
  try {
    console.log('🏈 WEEK 3 CONFIDENCE POOL - COMPLETE RESULTS ANALYSIS');
    console.log('====================================================\n');

    // Get Week 3 game results from Firebase
    console.log('📊 Getting Week 3 game results from Firebase...');
    const gameResultsRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/3');
    const gameResultsSnap = await gameResultsRef.get();

    if (!gameResultsSnap.exists) {
      console.log('❌ No game results found at Firebase path');
      return;
    }

    const gameResultsData = gameResultsSnap.data();
    console.log(`Found game results data:`, Object.keys(gameResultsData));

    // Get Week 3 confidence picks
    console.log('\n📝 Getting Week 3 confidence picks...');
    const week3PicksRef = db.collection('artifacts/nerdfootball/public/data/nerdfootball_picks/3/submissions');
    const picksSnapshot = await week3PicksRef.get();

    if (picksSnapshot.empty) {
      console.log('❌ No picks found for Week 3');
      return;
    }

    // Get pool members for user names
    const poolMembersRef = db.collection('artifacts/nerdfootball/pools/nerduniverse-2025/metadata').doc('members');
    const membersDoc = await poolMembersRef.get();
    const userNames = {};

    if (membersDoc.exists) {
      const membersData = membersDoc.data();
      Object.values(membersData).forEach(memberData => {
        if (memberData.uid) {
          userNames[memberData.uid] = memberData.displayName || memberData.email || 'Unknown User';
        }
      });
    }

    console.log(`\n👥 Found picks from ${picksSnapshot.docs.length} users`);
    console.log(`📋 Game results structure:`, JSON.stringify(gameResultsData, null, 2).substring(0, 500) + '...\n');

    const userAnalysis = [];

    // Analyze each user's picks
    for (const userDoc of picksSnapshot.docs) {
      const userId = userDoc.id;
      const userName = userNames[userId] || `User ${userId.slice(-6)}`;
      const picksData = userDoc.data();

      console.log(`\n🎯 ANALYZING: ${userName}`);
      console.log('─'.repeat(50));

      let totalPoints = 0;
      let correctPicks = 0;
      let totalPicks = 0;
      const pickDetails = [];

      // Process each game pick (exclude mnfTotalPoints)
      Object.entries(picksData).forEach(([gameId, pickData]) => {
        if (gameId !== 'mnfTotalPoints' && pickData.winner && pickData.confidence) {
          totalPicks++;
          const teamPicked = pickData.winner;
          const confidence = pickData.confidence;

          // Find game result - need to match the structure from Firebase
          let gameResult = null;
          let isCorrect = false;
          let pointsEarned = 0;

          // Look for game result by ID or team matchup
          if (gameResultsData[gameId]) {
            gameResult = gameResultsData[gameId];
            isCorrect = gameResult.winner === teamPicked;
            pointsEarned = isCorrect ? confidence : 0;
          } else {
            // Try to find by team names if direct ID lookup fails
            for (const [key, result] of Object.entries(gameResultsData)) {
              if (result.winner === teamPicked || result.loser === teamPicked) {
                gameResult = result;
                isCorrect = result.winner === teamPicked;
                pointsEarned = isCorrect ? confidence : 0;
                break;
              }
            }
          }

          if (isCorrect) {
            correctPicks++;
            totalPoints += confidence;
          }

          const status = isCorrect ? '✅ WIN' : '❌ LOSS';
          const resultDisplay = gameResult ?
            `${gameResult.winner} def. ${gameResult.loser} ${gameResult.score || ''}` :
            'GAME NOT FOUND';

          console.log(`${status} Game ${gameId} - Picked: ${teamPicked} (${confidence} pts) - Result: ${resultDisplay}`);

          pickDetails.push({
            gameId,
            teamPicked,
            confidence,
            isCorrect,
            pointsEarned,
            gameResult: resultDisplay
          });
        }
      });

      const accuracy = totalPicks > 0 ? (correctPicks / totalPicks * 100).toFixed(1) : '0.0';
      console.log(`\n📊 SUMMARY: ${correctPicks}/${totalPicks} correct (${accuracy}%) | Total Points: ${totalPoints}`);

      userAnalysis.push({
        userName,
        userId,
        totalPoints,
        correctPicks,
        totalPicks,
        accuracy: parseFloat(accuracy),
        pickDetails
      });
    }

    // Sort users by total points (descending)
    userAnalysis.sort((a, b) => b.totalPoints - a.totalPoints);

    console.log('\n🏆 WEEK 3 CONFIDENCE POOL LEADERBOARD');
    console.log('=====================================');
    userAnalysis.forEach((user, index) => {
      const rank = index + 1;
      const trophy = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
      console.log(`${trophy} ${rank}. ${user.userName} - ${user.totalPoints} pts (${user.correctPicks}/${user.totalPicks}, ${user.accuracy}%)`);
    });

    // Show top performer's details
    if (userAnalysis.length > 0) {
      const topUser = userAnalysis[0];
      console.log(`\n🎯 TOP PERFORMER DETAILED BREAKDOWN: ${topUser.userName}`);
      console.log('==================================================');

      topUser.pickDetails
        .sort((a, b) => b.pointsEarned - a.pointsEarned)
        .forEach(pick => {
          const status = pick.isCorrect ? '✅' : '❌';
          console.log(`${status} ${pick.teamPicked} (${pick.confidence} pts) - ${pick.gameResult} | Earned: ${pick.pointsEarned} pts`);
        });
    }

    // Game popularity analysis
    console.log('\n🎮 MOST POPULAR PICKS BY GAME');
    console.log('=============================');

    const gamePickAnalysis = {};
    userAnalysis.forEach(user => {
      user.pickDetails.forEach(pick => {
        if (!gamePickAnalysis[pick.gameId]) {
          gamePickAnalysis[pick.gameId] = {};
        }
        if (!gamePickAnalysis[pick.gameId][pick.teamPicked]) {
          gamePickAnalysis[pick.gameId][pick.teamPicked] = {
            count: 0,
            totalConfidence: 0,
            correctPickers: 0
          };
        }
        gamePickAnalysis[pick.gameId][pick.teamPicked].count++;
        gamePickAnalysis[pick.gameId][pick.teamPicked].totalConfidence += pick.confidence;
        if (pick.isCorrect) {
          gamePickAnalysis[pick.gameId][pick.teamPicked].correctPickers++;
        }
      });
    });

    Object.entries(gamePickAnalysis).forEach(([gameId, teams]) => {
      console.log(`\nGame ${gameId}:`);
      Object.entries(teams)
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([team, data]) => {
          const avgConf = (data.totalConfidence / data.count).toFixed(1);
          const status = data.correctPickers > 0 ? '✅' : '❌';
          console.log(`  ${status} ${team}: ${data.count} picks (avg conf: ${avgConf}) - ${data.correctPickers} won`);
        });
    });

    console.log('\n📈 OVERALL STATISTICS');
    console.log('====================');
    const totalUsers = userAnalysis.length;
    const totalPicksMade = userAnalysis.reduce((sum, user) => sum + user.totalPicks, 0);
    const totalCorrect = userAnalysis.reduce((sum, user) => sum + user.correctPicks, 0);
    const highestScore = userAnalysis[0]?.totalPoints || 0;
    const lowestScore = userAnalysis[userAnalysis.length - 1]?.totalPoints || 0;
    const avgScore = userAnalysis.length > 0 ?
      (userAnalysis.reduce((sum, user) => sum + user.totalPoints, 0) / userAnalysis.length).toFixed(1) : 0;

    console.log(`Total participants: ${totalUsers}`);
    console.log(`Total picks made: ${totalPicksMade}`);
    console.log(`Overall accuracy: ${((totalCorrect / totalPicksMade) * 100).toFixed(1)}%`);
    console.log(`Highest score: ${highestScore} points`);
    console.log(`Lowest score: ${lowestScore} points`);
    console.log(`Average score: ${avgScore} points`);

  } catch (error) {
    console.error('❌ Error analyzing Week 3:', error);
  }
}

completeWeek3Analysis();