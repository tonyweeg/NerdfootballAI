const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function week3ConfidenceResults() {
  try {
    console.log('🏈 WEEK 3 CONFIDENCE POOL - FINAL RESULTS');
    console.log('==========================================\n');

    // Get Week 3 game results
    const gameResultsRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/3');
    const gameResultsSnap = await gameResultsRef.get();
    const gameResults = gameResultsSnap.data();

    // Get picks
    const picksRef = db.collection('artifacts/nerdfootball/public/data/nerdfootball_picks/3/submissions');
    const picksSnapshot = await picksRef.get();

    // Get pool members
    const membersRef = db.collection('artifacts/nerdfootball/pools/nerduniverse-2025/metadata').doc('members');
    const membersDoc = await membersRef.get();
    const userNames = {};

    if (membersDoc.exists) {
      Object.values(membersDoc.data()).forEach(member => {
        if (member.uid) {
          userNames[member.uid] = member.displayName || member.email || 'Unknown User';
        }
      });
    }

    const userResults = [];

    // Process each user
    for (const userDoc of picksSnapshot.docs) {
      const userId = userDoc.id;
      const userName = userNames[userId] || `User ${userId.slice(-6)}`;
      const picks = userDoc.data();

      let totalPoints = 0;
      let correctPicks = 0;
      let totalPicks = 0;

      // Process each pick (skip mnfTotalPoints)
      Object.entries(picks).forEach(([gameId, pickData]) => {
        if (gameId !== 'mnfTotalPoints' && pickData.winner && pickData.confidence) {
          const teamPicked = pickData.winner;
          const confidence = pickData.confidence;
          const gameResult = gameResults[gameId];

          totalPicks++;

          if (gameResult && gameResult.winner === teamPicked) {
            correctPicks++;
            totalPoints += confidence;
          }
        }
      });

      const accuracy = totalPicks > 0 ? (correctPicks / totalPicks * 100).toFixed(1) : '0.0';

      userResults.push({
        userName,
        userId,
        totalPoints,
        correctPicks,
        totalPicks,
        accuracy: parseFloat(accuracy)
      });
    }

    // Sort by points
    userResults.sort((a, b) => b.totalPoints - a.totalPoints);

    console.log('🏆 WEEK 3 CONFIDENCE POOL LEADERBOARD');
    console.log('=====================================');

    userResults.slice(0, 15).forEach((user, index) => {
      const rank = index + 1;
      const trophy = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
      console.log(`${trophy} ${rank.toString().padStart(2)}. ${user.userName.padEnd(25)} - ${user.totalPoints.toString().padStart(3)} pts (${user.correctPicks}/${user.totalPicks}, ${user.accuracy}%)`);
    });

    // Show game results
    console.log('\n🎮 WEEK 3 GAME RESULTS');
    console.log('======================');

    const gameIds = ['301', '302', '303', '304', '305', '306', '307', '308', '309', '310', '311', '312', '313', '314', '315', '316'];

    gameIds.forEach(gameId => {
      const result = gameResults[gameId];
      if (result && result.status === 'final') {
        const homeTeam = result.h;
        const awayTeam = result.a;
        const homeScore = result.homeScore;
        const awayScore = result.awayScore;
        const winner = result.winner;

        console.log(`Game ${gameId}: ${awayTeam} ${awayScore} - ${homeScore} ${homeTeam} | Winner: ${winner}`);
      }
    });

    // Game pick analysis
    console.log('\n📊 GAME PICK ANALYSIS');
    console.log('=====================');

    const gameAnalysis = {};

    // Initialize game analysis
    gameIds.forEach(gameId => {
      gameAnalysis[gameId] = {};
    });

    // Count picks for each game
    picksSnapshot.docs.forEach(userDoc => {
      const picks = userDoc.data();
      Object.entries(picks).forEach(([gameId, pickData]) => {
        if (gameId !== 'mnfTotalPoints' && pickData.winner && gameIds.includes(gameId)) {
          const team = pickData.winner;
          if (!gameAnalysis[gameId][team]) {
            gameAnalysis[gameId][team] = { count: 0, correctCount: 0, totalConfidence: 0 };
          }
          gameAnalysis[gameId][team].count++;
          gameAnalysis[gameId][team].totalConfidence += pickData.confidence;

          // Check if correct
          const gameResult = gameResults[gameId];
          if (gameResult && gameResult.winner === team) {
            gameAnalysis[gameId][team].correctCount++;
          }
        }
      });
    });

    // Show biggest upsets (games where winner was least picked)
    console.log('\nBiggest upsets (winner was least popular):');
    const upsets = [];

    gameIds.forEach(gameId => {
      const result = gameResults[gameId];
      if (result && result.status === 'final') {
        const winner = result.winner;
        const winnerPicks = gameAnalysis[gameId][winner]?.count || 0;
        const totalGamePicks = Object.values(gameAnalysis[gameId]).reduce((sum, team) => sum + team.count, 0);
        const winnerPercentage = totalGamePicks > 0 ? (winnerPicks / totalGamePicks * 100).toFixed(1) : '0.0';

        upsets.push({
          gameId,
          winner,
          winnerPicks,
          totalGamePicks,
          winnerPercentage: parseFloat(winnerPercentage),
          gameScore: `${result.a} ${result.awayScore} - ${result.homeScore} ${result.h}`
        });
      }
    });

    upsets.sort((a, b) => a.winnerPercentage - b.winnerPercentage);

    upsets.slice(0, 5).forEach(upset => {
      console.log(`Game ${upset.gameId}: ${upset.winner} (${upset.winnerPercentage}% picked) - ${upset.gameScore}`);
      console.log(`  ${upset.winnerPicks}/${upset.totalGamePicks} users picked the winner`);
    });

    console.log('\n📈 OVERALL STATS');
    console.log('================');
    console.log(`Total participants: ${userResults.length}`);
    console.log(`Highest score: ${userResults[0]?.totalPoints || 0} points`);
    console.log(`Lowest score: ${userResults[userResults.length - 1]?.totalPoints || 0} points`);
    const avgScore = userResults.length > 0 ? (userResults.reduce((sum, u) => sum + u.totalPoints, 0) / userResults.length).toFixed(1) : 0;
    console.log(`Average score: ${avgScore} points`);

    const totalCorrect = userResults.reduce((sum, u) => sum + u.correctPicks, 0);
    const totalPicksMade = userResults.reduce((sum, u) => sum + u.totalPicks, 0);
    console.log(`Overall accuracy: ${((totalCorrect / totalPicksMade) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

week3ConfidenceResults();