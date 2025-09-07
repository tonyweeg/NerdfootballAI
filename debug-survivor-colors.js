const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'nerdfootball'
  });
}

const db = admin.firestore();

async function debugSurvivorColors() {
  try {
    console.log('🔍 Debugging survivor color issue for user CX0etIyJbGg33nmHCo4eezPWrsr2');
    
    const targetUserId = 'CX0etIyJbGg33nmHCo4eezPWrsr2';
    
    // Get current week
    const now = new Date();
    const seasonStart = new Date('2025-09-05');
    const weeksDiff = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
    const currentWeek = Math.max(1, Math.min(18, weeksDiff + 1));
    console.log(`📅 Current week: ${currentWeek}`);
    
    // Get user's survivor picks
    const userPicksDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${targetUserId}`).get();
    if (userPicksDoc.exists()) {
      const userPicksData = userPicksDoc.data();
      const userPicks = userPicksData.picks || {};
      console.log(`🎯 User picks:`, JSON.stringify(userPicks, null, 2));
      
      // Check current week pick
      const currentWeekPick = userPicks[currentWeek];
      if (currentWeekPick) {
        console.log(`📋 Current week (${currentWeek}) pick:`, currentWeekPick.team);
        
        // Check game results for current week
        const resultsDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdfootball_results/week${currentWeek}`).get();
        if (resultsDoc.exists()) {
          const weekResults = resultsDoc.data();
          console.log(`🏈 Week ${currentWeek} results:`, JSON.stringify(weekResults, null, 2));
          
          // Check if user's team won
          let teamWon = false;
          let winningGame = null;
          Object.entries(weekResults).forEach(([gameId, gameResult]) => {
            if (gameResult && gameResult.winner === currentWeekPick.team) {
              teamWon = true;
              winningGame = { gameId, gameResult };
            }
          });
          
          if (teamWon) {
            console.log(`✅ ${currentWeekPick.team} WON! Game details:`, winningGame);
          } else {
            console.log(`❌ ${currentWeekPick.team} did not win or game not yet completed`);
            
            // Check if team appears in any game
            let teamFoundInGames = [];
            Object.entries(weekResults).forEach(([gameId, gameResult]) => {
              if (gameResult && (gameResult.homeTeam === currentWeekPick.team || gameResult.awayTeam === currentWeekPick.team)) {
                teamFoundInGames.push({ gameId, gameResult });
              }
            });
            console.log(`🔍 Games involving ${currentWeekPick.team}:`, teamFoundInGames);
          }
        } else {
          console.log(`⚠️  No results found for week ${currentWeek}`);
        }
      } else {
        console.log(`⚠️  No pick found for current week ${currentWeek}`);
      }
    } else {
      console.log(`❌ No survivor picks found for user ${targetUserId}`);
    }
    
    // Check survivor status
    const statusDoc = await db.doc('artifacts/nerdfootball/public/data/nerdSurvivor_status/status').get();
    if (statusDoc.exists()) {
      const allStatuses = statusDoc.data();
      const userStatus = allStatuses[targetUserId];
      console.log(`📊 User status:`, userStatus);
    } else {
      console.log('⚠️  No status document found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugSurvivorColors();