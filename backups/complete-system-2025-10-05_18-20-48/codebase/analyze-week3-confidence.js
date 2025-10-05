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
    // Get Week 3 game results
    console.log('📊 Getting Week 3 game data...');
    const gameData = require('./public/nfl_2025_week_3.json');
    console.log(`Found ${gameData.games.length} games for Week 3\n`);

    // Create game results lookup
    const gameResults = {};
    gameData.games.forEach(game => {
      const homeTeam = game.competitions[0].competitors.find(c => c.homeAway === 'home').team.abbreviation;
      const awayTeam = game.competitions[0].competitors.find(c => c.homeAway === 'away').team.abbreviation;
      const homeScore = parseInt(game.competitions[0].competitors.find(c => c.homeAway === 'home').score);
      const awayScore = parseInt(game.competitions[0].competitors.find(c => c.homeAway === 'away').score);

      const winner = homeScore > awayScore ? homeTeam : awayTeam;
      const loser = homeScore > awayScore ? awayTeam : homeTeam;

      gameResults[`${awayTeam}_${homeTeam}`] = {
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        winner,
        loser,
        gameId: game.id
      };

      console.log(`🏈 ${awayTeam} ${awayScore} - ${homeScore} ${homeTeam} | Winner: ${winner}`);
    });

    console.log('\n📝 Getting Week 3 confidence picks...');

    // Get all Week 3 picks
    const week3PicksRef = db.collection('artifacts/nerdfootball/public/data/nerdfootball_picks/3/submissions');
    const picksSnapshot = await week3PicksRef.get();

    if (picksSnapshot.empty) {
      console.log('❌ No picks found for Week 3');
      return;
    }

    // Get pool members to map UIDs to names
    const poolMembersRef = db.collection('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    const membersSnapshot = await poolMembersRef.get();
    const userNames = {};

    membersSnapshot.docs.forEach(doc => {
      const memberData = doc.data();
      if (memberData.uid) {
        userNames[memberData.uid] = memberData.displayName || memberData.email || 'Unknown User';
      }
    });

    console.log(`\n👥 Found picks from ${picksSnapshot.docs.length} users\n`);

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

      if (picksData.picks) {
        for (const [gameKey, pickInfo] of Object.entries(picksData.picks)) {
          totalPicks++;

          const confidence = pickInfo.confidence || 0;
          const teamPicked = pickInfo.team;

          // Find the corresponding game result
          const gameResult = gameResults[gameKey];
          if (!gameResult) {
            console.log(`⚠️  Game ${gameKey} - Picked: ${teamPicked} (Confidence: ${confidence}) - GAME NOT FOUND`);
            continue;
          }

          const isCorrect = gameResult.winner === teamPicked;
          const pointsEarned = isCorrect ? confidence : 0;

          if (isCorrect) {
            correctPicks++;
            totalPoints += confidence;
          }

          const status = isCorrect ? '✅ WIN' : '❌ LOSS';
          console.log(`${status} Game ${gameKey} - Picked: ${teamPicked} (Confidence: ${confidence}) - Points: ${pointsEarned}`);

          pickDetails.push({
            gameKey,
            teamPicked,
            confidence,
            isCorrect,
            pointsEarned,
            gameResult: `${gameResult.awayTeam} ${gameResult.awayScore} - ${gameResult.homeScore} ${gameResult.homeTeam}`
          });
        }
      }

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

    // Analysis by game
    console.log('\n🎮 GAME-BY-GAME ANALYSIS');
    console.log('========================');

    const gameAnalysis = {};
    userAnalysis.forEach(user => {
      user.pickDetails.forEach(pick => {
        if (!gameAnalysis[pick.gameKey]) {
          gameAnalysis[pick.gameKey] = {
            gameResult: pick.gameResult,
            picks: {}
          };
        }
        if (!gameAnalysis[pick.gameKey].picks[pick.teamPicked]) {
          gameAnalysis[pick.gameKey].picks[pick.teamPicked] = {
            count: 0,
            totalConfidence: 0,
            users: []
          };
        }
        gameAnalysis[pick.gameKey].picks[pick.teamPicked].count++;
        gameAnalysis[pick.gameKey].picks[pick.teamPicked].totalConfidence += pick.confidence;
        gameAnalysis[pick.gameKey].picks[pick.teamPicked].users.push({
          name: user.userName,
          confidence: pick.confidence,
          correct: pick.isCorrect
        });
      });
    });

    for (const [gameKey, analysis] of Object.entries(gameAnalysis)) {
      console.log(`\n🏈 ${gameKey}: ${analysis.gameResult}`);
      for (const [team, teamData] of Object.entries(analysis.picks)) {
        const avgConfidence = (teamData.totalConfidence / teamData.count).toFixed(1);
        const correctCount = teamData.users.filter(u => u.correct).length;
        const status = correctCount > 0 ? '✅' : '❌';
        console.log(`  ${status} ${team}: ${teamData.count} picks (Avg confidence: ${avgConfidence})`);
        teamData.users.forEach(user => {
          const userStatus = user.correct ? '✅' : '❌';
          console.log(`    ${userStatus} ${user.name} (${user.confidence})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing Week 3:', error);
  }
}

analyzeWeek3Confidence();