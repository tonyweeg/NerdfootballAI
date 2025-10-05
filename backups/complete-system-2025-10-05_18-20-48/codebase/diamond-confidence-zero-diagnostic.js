const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball.firebaseio.com"
  });
}

const db = admin.firestore();

async function diagnosticZeroConfidenceValues() {
  console.log('🔍 DIAMOND DIAGNOSTIC: Scanning for Zero Confidence Values');
  console.log('===========================================================');
  
  const results = {
    affectedUsers: new Map(),
    totalAffectedPicks: 0,
    weekPattern: new Map(),
    gamePattern: new Map(),
    timestamp: new Date().toISOString()
  };

  try {
    // Scan ALL submissions in the database for zero confidence values
    console.log('🔍 COMPREHENSIVE SCAN: All submissions in database');
    console.log('====================================================');
    
    const allSubmissionsGlobal = await db.collectionGroup('submissions').get();
    console.log(`📊 Total submissions in database: ${allSubmissionsGlobal.size}\n`);
    
    let scannedCount = 0;
    for (const doc of allSubmissionsGlobal.docs) {
      scannedCount++;
      if (scannedCount % 100 === 0) {
        console.log(`   Scanned ${scannedCount}/${allSubmissionsGlobal.size} submissions...`);
      }
      
      const submissionPath = doc.ref.path;
      const pathParts = submissionPath.split('/');
      const userId = pathParts[pathParts.length - 1]; // Last part is userId
      const weekMatch = submissionPath.match(/week(\d+)/);
      const weekId = weekMatch ? weekMatch[1] : 'Unknown';
      
      const data = doc.data();
      
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(gameId => {
          const pick = data[gameId];
          if (pick && typeof pick === 'object') {
            // Check for zero confidence values
            if (pick.confidence === 0 || pick.confidence === '0') {
              console.log(`🚨 ZERO CONFIDENCE FOUND: User ${userId}, Week ${weekId}, Game ${gameId}`);
              
              results.totalAffectedPicks++;
              
              // Track patterns
              results.weekPattern.set(weekId, (results.weekPattern.get(weekId) || 0) + 1);
              results.gamePattern.set(gameId, (results.gamePattern.get(gameId) || 0) + 1);
              
              // Track affected user
              if (!results.affectedUsers.has(userId)) {
                results.affectedUsers.set(userId, {
                  userId: userId,
                  affectedWeeks: new Set(),
                  zeroConfidencePicks: []
                });
              }
              
              const userRecord = results.affectedUsers.get(userId);
              userRecord.affectedWeeks.add(weekId);
              userRecord.zeroConfidencePicks.push({
                week: weekId,
                game: gameId,
                winner: pick.winner,
                confidence: pick.confidence,
                confidenceType: typeof pick.confidence,
                submissionPath: submissionPath
              });
            }
          }
        });
      }
    }

    // Generate summary report
    console.log('\n💎 DIAGNOSTIC SUMMARY');
    console.log('=====================');
    console.log(`Total Affected Picks: ${results.totalAffectedPicks}`);
    console.log(`Total Affected Users: ${results.affectedUsers.size}`);
    
    console.log('\n📈 Week Distribution:');
    for (const [week, count] of Array.from(results.weekPattern.entries()).sort()) {
      console.log(`  Week ${week}: ${count} zero-confidence picks`);
    }
    
    console.log('\n🎯 Game Distribution:');
    for (const [game, count] of Array.from(results.gamePattern.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${game}: ${count} zero-confidence picks`);
    }
    
    
    console.log('\n👥 Affected Users Detail:');
    for (const [userId, userData] of results.affectedUsers.entries()) {
      console.log(`  User: ${userId}`);
      console.log(`    Affected Weeks: ${Array.from(userData.affectedWeeks).sort().join(', ')}`);
      console.log(`    Zero Confidence Picks: ${userData.zeroConfidencePicks.length}`);
      console.log('');
    }

    // Save detailed report to file
    const reportData = {
      summary: {
        totalAffectedPicks: results.totalAffectedPicks,
        totalAffectedUsers: results.affectedUsers.size,
        scanTimestamp: results.timestamp
      },
      weekDistribution: Object.fromEntries(results.weekPattern),
      gameDistribution: Object.fromEntries(results.gamePattern),
      affectedUsers: Array.from(results.affectedUsers.values()).map(user => ({
        ...user,
        affectedWeeks: Array.from(user.affectedWeeks)
      }))
    };

    fs.writeFileSync('diamond-zero-confidence-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n📄 Detailed report saved to: diamond-zero-confidence-report.json');
    
    // Critical findings analysis
    console.log('\n🚨 CRITICAL FINDINGS ANALYSIS');
    console.log('=============================');
    
    if (results.totalAffectedPicks > 0) {
      console.log('❌ DATA INTEGRITY VIOLATION CONFIRMED');
      console.log(`   ${results.totalAffectedPicks} picks have zero confidence values`);
      console.log(`   ${results.affectedUsers.size} users affected across multiple weeks`);
      console.log('');
      console.log('⚠️  GAME INTEGRITY IMPACT:');
      console.log('   - Zero confidence violates core scoring rules');
      console.log('   - Affects leaderboard calculations');
      console.log('   - May indicate systematic validation bypass');
      console.log('');
      console.log('🔧 IMMEDIATE ACTIONS REQUIRED:');
      console.log('   1. Stop accepting new picks until fixed');
      console.log('   2. Identify root cause of validation bypass');
      console.log('   3. Decide remediation strategy');
      console.log('   4. Implement fix and re-validate data');
    } else {
      console.log('✅ NO ZERO CONFIDENCE VALUES FOUND');
      console.log('   Data integrity appears intact');
    }

  } catch (error) {
    console.error('❌ Error during diagnostic scan:', error);
    throw error;
  }
}

// Run diagnostic
diagnosticZeroConfidenceValues()
  .then(() => {
    console.log('\n🎯 Diagnostic scan completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Diagnostic scan failed:', error);
    process.exit(1);
  });