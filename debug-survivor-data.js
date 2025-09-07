const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugSurvivorData() {
  console.log('🔍 DEBUGGING SURVIVOR DATA STRUCTURES\n');
  
  const poolId = 'nerduniverse-2025';
  const targetUserId = 'CX0etIyJbGg33nmHCo4eezPWrsr2';
  
  try {
    // 1. Check pool members
    console.log('1️⃣ POOL MEMBERS:');
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();
    
    if (poolDoc.exists) {
      const poolData = poolDoc.data();
      console.log(`   Found ${Object.keys(poolData).length} members:`);
      Object.entries(poolData).forEach(([uid, user]) => {
        const isTarget = uid === targetUserId;
        console.log(`   ${isTarget ? '🎯' : '-'} ${uid.slice(-8)}: ${user.displayName} (${user.email})`);
      });
    } else {
      console.log('   ❌ Pool members document not found');
    }
    
    // 2. Check survivor status document
    console.log('\n2️⃣ SURVIVOR STATUS DOCUMENT:');
    const statusPath = 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status';
    const statusDoc = await db.doc(statusPath).get();
    
    if (statusDoc.exists) {
      const statusData = statusDoc.data();
      console.log(`   Found status for ${Object.keys(statusData).length} users:`);
      Object.entries(statusData).forEach(([uid, status]) => {
        const isTarget = uid === targetUserId;
        console.log(`   ${isTarget ? '🎯' : '-'} ${uid.slice(-8)}: eliminated=${status.eliminated}, week=${status.eliminatedWeek}, currentPick=${status.currentWeekPick}`);
      });
    } else {
      console.log('   ❌ Status document not found');
    }
    
    // 3. Check specific user's picks
    console.log(`\n3️⃣ USER PICKS (${targetUserId.slice(-8)}):`);
    const userPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${targetUserId}`;
    const userPicksDoc = await db.doc(userPicksPath).get();
    
    if (userPicksDoc.exists) {
      const picksData = userPicksDoc.data();
      console.log('   Raw document data:', JSON.stringify(picksData, null, 2));
      
      if (picksData.picks) {
        console.log(`   Processed picks (${Object.keys(picksData.picks).length} weeks):`);
        Object.entries(picksData.picks).forEach(([week, pick]) => {
          console.log(`     Week ${week}: ${JSON.stringify(pick)}`);
        });
      }
    } else {
      console.log('   ❌ User picks document not found');
    }
    
    // 4. Check week 1 game results
    console.log('\n4️⃣ WEEK 1 GAME RESULTS:');
    const week1Path = 'artifacts/nerdfootball/public/data/nerdfootball_results/week1';
    const week1Doc = await db.doc(week1Path).get();
    
    if (week1Doc.exists) {
      const resultsData = week1Doc.data();
      console.log(`   Found ${Object.keys(resultsData).length} games:`);
      Object.entries(resultsData).forEach(([gameId, result]) => {
        if (result && typeof result === 'object') {
          console.log(`     ${gameId}: ${result.homeTeam} vs ${result.awayTeam} → Winner: ${result.winner || 'TBD'}`);
          
          // Check if this game involves Philadelphia
          if (result.homeTeam && result.homeTeam.toLowerCase().includes('philadelphia') ||
              result.awayTeam && result.awayTeam.toLowerCase().includes('philadelphia')) {
            console.log(`       🦅 PHILADELPHIA GAME FOUND! Home: "${result.homeTeam}", Away: "${result.awayTeam}"`);
          }
        } else {
          console.log(`     ${gameId}: Invalid data - ${JSON.stringify(result)}`);
        }
      });
    } else {
      console.log('   ❌ Week 1 results document not found');
    }
    
    // 5. Try to find any Philadelphia variations in results
    console.log('\n5️⃣ SEARCHING FOR PHILADELPHIA VARIATIONS:');
    const searchTerms = ['philadelphia', 'eagles', 'phila', 'phi'];
    
    if (week1Doc.exists) {
      const resultsData = week1Doc.data();
      Object.entries(resultsData).forEach(([gameId, result]) => {
        if (result && typeof result === 'object') {
          const homeTeam = (result.homeTeam || '').toLowerCase();
          const awayTeam = (result.awayTeam || '').toLowerCase();
          const winner = (result.winner || '').toLowerCase();
          
          searchTerms.forEach(term => {
            if (homeTeam.includes(term) || awayTeam.includes(term) || winner.includes(term)) {
              console.log(`     Found "${term}" in ${gameId}:`);
              console.log(`       Home: "${result.homeTeam}"`);
              console.log(`       Away: "${result.awayTeam}"`);  
              console.log(`       Winner: "${result.winner}"`);
            }
          });
        }
      });
    }
    
  } catch (error) {
    console.error('Error debugging survivor data:', error);
  }
}

debugSurvivorData().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('Debug failed:', error);
  process.exit(1);
});