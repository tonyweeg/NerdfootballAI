const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Week 3 actual game results from ESPN
const gameResults = {
  301: { winner: 'Buffalo Bills', loser: 'Miami Dolphins', score: '31-21' },
  302: { winner: 'Cleveland Browns', loser: 'Green Bay Packers', score: '13-10' },
  303: { winner: 'Indianapolis Colts', loser: 'Tennessee Titans', score: '41-20' },
  304: { winner: 'Minnesota Vikings', loser: 'Cincinnati Bengals', score: '48-10' },
  305: { winner: 'Pittsburgh Steelers', loser: 'New England Patriots', score: '21-14' },
  306: { winner: 'Philadelphia Eagles', loser: 'Los Angeles Rams', score: '33-26' },
  307: { winner: 'Tampa Bay Buccaneers', loser: 'New York Jets', score: '29-27' },
  308: { winner: 'Washington Commanders', loser: 'Las Vegas Raiders', score: '41-24' },
  309: { winner: 'Carolina Panthers', loser: 'Atlanta Falcons', score: '30-0' },
  310: { winner: 'Jacksonville Jaguars', loser: 'Houston Texans', score: '17-10' },
  311: { winner: 'Los Angeles Chargers', loser: 'Denver Broncos', score: '23-20' },
  312: { winner: 'Seattle Seahawks', loser: 'New Orleans Saints', score: '44-13' },
  313: { winner: 'Chicago Bears', loser: 'Dallas Cowboys', score: '31-14' },
  314: { winner: 'San Francisco 49ers', loser: 'Arizona Cardinals', score: '16-15' },
  315: { winner: 'Kansas City Chiefs', loser: 'New York Giants', score: '22-9' },
  316: { winner: 'Detroit Lions', loser: 'Baltimore Ravens', score: '38-30' }
};

async function analyzeWeek3Results() {
  try {
    console.log('🏈 WEEK 3 CONFIDENCE POOL - RESULTS & SCORING');
    console.log('==============================================\n');

    // Show game results first
    console.log('🎮 WEEK 3 GAME RESULTS');
    console.log('======================');
    Object.entries(gameResults).forEach(([gameId, result]) => {
      console.log(`Game ${gameId}: ${result.winner} def. ${result.loser} (${result.score})`);
    });

    console.log('\n📊 Getting user picks and calculating scores...\n');

    // Get Week 3 picks
    const week3PicksRef = db.collection('artifacts/nerdfootball/public/data/nerdfootball_picks/3/submissions');
    const picksSnapshot = await week3PicksRef.get();

    const userScores = [];
    let totalCorrectPicks = 0;
    let totalIncorrectPicks = 0;

    for (const userDoc of picksSnapshot.docs) {
      const userId = userDoc.id;
      const userName = `User_${userId.slice(-6)}`;
      const picksData = userDoc.data();

      let userScore = 0;
      let correctPicks = 0;
      let incorrectPicks = 0;
      const pickResults = [];

      // Calculate score for each pick
      Object.entries(picksData).forEach(([gameId, pickData]) => {
        if (gameId !== 'mnfTotalPoints' && pickData.winner && pickData.confidence) {
          const userPick = pickData.winner;
          const confidence = pickData.confidence;
          const gameResult = gameResults[gameId];

          if (gameResult) {
            const isCorrect = gameResult.winner === userPick;
            const pointsEarned = isCorrect ? confidence : 0;

            if (isCorrect) {
              correctPicks++;
              totalCorrectPicks++;
              userScore += confidence;
            } else {
              incorrectPicks++;
              totalIncorrectPicks++;
            }

            pickResults.push({
              gameId,
              pick: userPick,
              confidence,
              winner: gameResult.winner,
              isCorrect,
              pointsEarned
            });
          }
        }
      });

      const accuracy = correctPicks + incorrectPicks > 0 ? (correctPicks / (correctPicks + incorrectPicks) * 100).toFixed(1) : '0.0';

      userScores.push({
        userName,
        userId: userId.slice(-6),
        totalScore: userScore,
        correctPicks,
        incorrectPicks,
        accuracy: parseFloat(accuracy),
        pickResults,
        mnfTotal: picksData.mnfTotalPoints
      });
    }

    // Sort by total score (descending)
    userScores.sort((a, b) => b.totalScore - a.totalScore);

    // Show top 10 leaderboard
    console.log('🏆 WEEK 3 CONFIDENCE LEADERBOARD (TOP 10)');
    console.log('==========================================');
    userScores.slice(0, 10).forEach((user, index) => {
      const rank = index + 1;
      const trophy = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
      console.log(`${trophy} ${rank.toString().padStart(2)}. ${user.userName} - ${user.totalScore} pts (${user.correctPicks}/${user.correctPicks + user.incorrectPicks}, ${user.accuracy}%)`);
    });

    // Show sample detailed picks for top user
    console.log('\n🎯 DETAILED RESULTS - TOP PERFORMER');
    console.log('===================================');
    const topUser = userScores[0];
    console.log(`${topUser.userName} - ${topUser.totalScore} points\n`);

    topUser.pickResults
      .sort((a, b) => b.pointsEarned - a.pointsEarned)
      .forEach(pick => {
        const status = pick.isCorrect ? '✅' : '❌';
        const gameResult = gameResults[pick.gameId];
        console.log(`${status} Game ${pick.gameId}: Picked ${pick.pick} (${pick.confidence} pts) - Winner: ${pick.winner} | ${pick.pointsEarned} pts`);
      });

    // Game analysis - which games hurt/helped most
    console.log('\n🎲 GAME ANALYSIS - BIGGEST UPSETS');
    console.log('=================================');

    const gameUpsets = [];
    Object.entries(gameResults).forEach(([gameId, result]) => {
      let picksForWinner = 0;
      let picksForLoser = 0;
      let avgConfidenceWinner = 0;
      let avgConfidenceLoser = 0;

      userScores.forEach(user => {
        const pick = user.pickResults.find(p => p.gameId === gameId);
        if (pick) {
          if (pick.pick === result.winner) {
            picksForWinner++;
            avgConfidenceWinner += pick.confidence;
          } else {
            picksForLoser++;
            avgConfidenceLoser += pick.confidence;
          }
        }
      });

      const totalPicks = picksForWinner + picksForLoser;
      const winnerPercentage = (picksForWinner / totalPicks * 100).toFixed(1);

      avgConfidenceWinner = picksForWinner > 0 ? (avgConfidenceWinner / picksForWinner).toFixed(1) : 0;
      avgConfidenceLoser = picksForLoser > 0 ? (avgConfidenceLoser / picksForLoser).toFixed(1) : 0;

      gameUpsets.push({
        gameId,
        winner: result.winner,
        loser: result.loser,
        score: result.score,
        picksForWinner,
        picksForLoser,
        winnerPercentage: parseFloat(winnerPercentage),
        avgConfidenceWinner,
        avgConfidenceLoser
      });
    });

    // Sort by biggest upsets (lowest winner percentage)
    gameUpsets.sort((a, b) => a.winnerPercentage - b.winnerPercentage);

    console.log('Biggest upsets (games where winner was least picked):');
    gameUpsets.slice(0, 5).forEach(game => {
      console.log(`Game ${game.gameId}: ${game.winner} (${game.winnerPercentage}% picked) def. ${game.loser} ${game.score}`);
      console.log(`  Winner picked by ${game.picksForWinner} users (avg conf: ${game.avgConfidenceWinner})`);
      console.log(`  Loser picked by ${game.picksForLoser} users (avg conf: ${game.avgConfidenceLoser})`);
    });

    console.log('\n📊 OVERALL STATISTICS');
    console.log('=====================');
    console.log(`Total users: ${userScores.length}`);
    console.log(`Highest score: ${userScores[0].totalScore} points`);
    console.log(`Lowest score: ${userScores[userScores.length - 1].totalScore} points`);
    console.log(`Average score: ${(userScores.reduce((sum, u) => sum + u.totalScore, 0) / userScores.length).toFixed(1)} points`);
    console.log(`Total correct picks: ${totalCorrectPicks}`);
    console.log(`Total incorrect picks: ${totalIncorrectPicks}`);
    console.log(`Overall accuracy: ${(totalCorrectPicks / (totalCorrectPicks + totalIncorrectPicks) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzeWeek3Results();