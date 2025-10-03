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

async function analyzeConfidenceCorruption() {
  console.log('💎 DIAMOND CONFIDENCE CORRUPTION ANALYSIS');
  console.log('=========================================');
  
  const analysis = {
    totalSubmissions: 0,
    corruptedSubmissions: 0,
    affectedUsers: new Set(),
    undefinedConfidenceCount: 0,
    incompletePicksPattern: new Map(),
    weekDistribution: new Map(),
    pickObjectsWithUndefinedConfidence: []
  };

  try {
    // Get all submissions
    const allSubmissions = await db.collectionGroup('submissions').get();
    analysis.totalSubmissions = allSubmissions.size;
    
    console.log(`📊 Scanning ${analysis.totalSubmissions} total submissions...\n`);
    
    for (const doc of allSubmissions.docs) {
      const submissionPath = doc.ref.path;
      const pathParts = submissionPath.split('/');
      const userId = pathParts[pathParts.length - 1];
      const weekMatch = submissionPath.match(/\/(\d+)\//);
      const weekId = weekMatch ? weekMatch[1] : 'Unknown';
      
      const data = doc.data();
      let hasUndefinedConfidence = false;
      
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(gameId => {
          const pick = data[gameId];
          
          if (pick && typeof pick === 'object') {
            // Check for undefined confidence
            if (pick.confidence === undefined) {
              hasUndefinedConfidence = true;
              analysis.undefinedConfidenceCount++;
              analysis.affectedUsers.add(userId);
              
              // Track the pattern
              const patternKey = `${gameId}`;
              analysis.incompletePicksPattern.set(patternKey, (analysis.incompletePicksPattern.get(patternKey) || 0) + 1);
              
              // Track week distribution
              analysis.weekDistribution.set(weekId, (analysis.weekDistribution.get(weekId) || 0) + 1);
              
              // Store detailed info
              analysis.pickObjectsWithUndefinedConfidence.push({
                user: userId,
                week: weekId,
                game: gameId,
                winner: pick.winner,
                confidence: pick.confidence,
                hasWinner: !!pick.winner,
                path: submissionPath
              });
            }
          }
        });
      }
      
      if (hasUndefinedConfidence) {
        analysis.corruptedSubmissions++;
      }
    }
    
    console.log('📈 CORRUPTION ANALYSIS RESULTS');
    console.log('==============================');
    console.log(`Total Submissions: ${analysis.totalSubmissions}`);
    console.log(`Corrupted Submissions: ${analysis.corruptedSubmissions}`);
    console.log(`Corruption Rate: ${((analysis.corruptedSubmissions / analysis.totalSubmissions) * 100).toFixed(1)}%`);
    console.log(`Affected Users: ${analysis.affectedUsers.size}`);
    console.log(`Total Undefined Confidence Values: ${analysis.undefinedConfidenceCount}`);
    
    console.log('\n🔍 PATTERN ANALYSIS');
    console.log('===================');
    
    // Analyze the pattern of undefined confidence values
    const gamePatterns = Array.from(analysis.incompletePicksPattern.entries()).sort((a, b) => b[1] - a[1]);
    console.log('Games/Objects with Undefined Confidence (Top 10):');
    gamePatterns.slice(0, 10).forEach(([game, count]) => {
      console.log(`  ${game}: ${count} occurrences`);
    });
    
    console.log('\nWeek Distribution:');
    const weekPatterns = Array.from(analysis.weekDistribution.entries()).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    weekPatterns.forEach(([week, count]) => {
      console.log(`  Week ${week}: ${count} undefined confidence values`);
    });
    
    console.log('\n🔬 ROOT CAUSE ANALYSIS');
    console.log('======================');
    
    // Analyze the specific patterns
    const picksObjectUndefined = analysis.pickObjectsWithUndefinedConfidence.filter(p => p.game === 'picks');
    const gameSpecificUndefined = analysis.pickObjectsWithUndefinedConfidence.filter(p => p.game !== 'picks');
    
    console.log(`"picks" object with undefined confidence: ${picksObjectUndefined.length}`);
    console.log(`Game-specific picks with undefined confidence: ${gameSpecificUndefined.length}`);
    
    // Check if picks with undefined confidence have winners
    const picksWithWinners = analysis.pickObjectsWithUndefinedConfidence.filter(p => p.hasWinner).length;
    const picksWithoutWinners = analysis.pickObjectsWithUndefinedConfidence.filter(p => !p.hasWinner).length;
    
    console.log(`Undefined confidence picks WITH winners: ${picksWithWinners}`);
    console.log(`Undefined confidence picks WITHOUT winners: ${picksWithoutWinners}`);
    
    // Identify most affected users
    const userCounts = {};
    analysis.pickObjectsWithUndefinedConfidence.forEach(pick => {
      userCounts[pick.user] = (userCounts[pick.user] || 0) + 1;
    });
    
    const topAffectedUsers = Object.entries(userCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log('\nMost Affected Users:');
    topAffectedUsers.forEach(([userId, count]) => {
      console.log(`  ${userId}: ${count} undefined confidence values`);
    });
    
    console.log('\n💡 LIKELY ROOT CAUSES');
    console.log('=====================');
    
    if (picksObjectUndefined.length > 0) {
      console.log('1. INCOMPLETE SUBMISSION PROCESS:');
      console.log('   - "picks" objects with undefined confidence suggest incomplete form submissions');
      console.log('   - Users may be saving partial picks before completing confidence assignment');
      console.log('   - Frontend validation may not be preventing incomplete saves');
    }
    
    if (gameSpecificUndefined.length > 0) {
      console.log('2. PARTIAL PICK UPDATES:');
      console.log('   - Specific game picks missing confidence suggests partial updates');
      console.log('   - Could be from user editing existing picks without reassigning confidence');
      console.log('   - May indicate frontend/backend sync issues');
    }
    
    if (picksWithWinners > 0) {
      console.log('3. CONFIDENCE ASSIGNMENT BUG:');
      console.log('   - Picks have winners but missing confidence values');
      console.log('   - Suggests confidence assignment logic is separate from winner selection');
      console.log('   - May indicate frontend bug where confidence is not properly saved');
    }
    
    console.log('\n🛠️  RECOMMENDED FIXES');
    console.log('=====================');
    console.log('1. IMMEDIATE DATA CLEANUP:');
    console.log('   - Remove incomplete "picks" objects that have no winner and undefined confidence');
    console.log('   - For picks with winners but undefined confidence, assign default confidence values');
    console.log('   - Validate that all remaining picks have proper confidence values');
    
    console.log('\n2. FRONTEND VALIDATION ENHANCEMENT:');
    console.log('   - Prevent submission of picks without confidence values');
    console.log('   - Add client-side validation before save operations');
    console.log('   - Display clear error messages for incomplete picks');
    
    console.log('\n3. BACKEND VALIDATION STRENGTHENING:');
    console.log('   - Add server-side validation for pick completeness');
    console.log('   - Reject submissions with undefined confidence values');
    console.log('   - Implement data integrity checks on write operations');
    
    console.log('\n4. USER EXPERIENCE IMPROVEMENTS:');
    console.log('   - Show clear indicators for incomplete picks');
    console.log('   - Implement draft/final submission states');
    console.log('   - Add confirmation dialogs for partial saves');
    
    // Save comprehensive analysis report
    const reportData = {
      analysisTimestamp: new Date().toISOString(),
      summary: {
        totalSubmissions: analysis.totalSubmissions,
        corruptedSubmissions: analysis.corruptedSubmissions,
        corruptionRate: (analysis.corruptedSubmissions / analysis.totalSubmissions) * 100,
        affectedUsers: analysis.affectedUsers.size,
        totalUndefinedConfidence: analysis.undefinedConfidenceCount
      },
      patterns: {
        gamePatterns: Object.fromEntries(analysis.incompletePicksPattern),
        weekDistribution: Object.fromEntries(analysis.weekDistribution),
        picksObjectIssues: picksObjectUndefined.length,
        gameSpecificIssues: gameSpecificUndefined.length,
        picksWithWinners: picksWithWinners,
        picksWithoutWinners: picksWithoutWinners
      },
      topAffectedUsers: topAffectedUsers,
      detailedIssues: analysis.pickObjectsWithUndefinedConfidence,
      rootCauseAssessment: {
        incompleteSubmissions: picksObjectUndefined.length > 0,
        partialUpdates: gameSpecificUndefined.length > 0,
        confidenceAssignmentBug: picksWithWinners > 0
      },
      recommendations: [
        'Remove incomplete picks objects with no winner and undefined confidence',
        'Assign default confidence values to picks with winners but undefined confidence',
        'Implement stronger frontend validation to prevent incomplete submissions',
        'Add backend validation to reject picks with undefined confidence',
        'Improve user experience with better incomplete pick indicators'
      ]
    };
    
    fs.writeFileSync('diamond-confidence-corruption-analysis.json', JSON.stringify(reportData, null, 2));
    console.log('\n📄 Comprehensive analysis report saved to: diamond-confidence-corruption-analysis.json');
    
  } catch (error) {
    console.error('❌ Error during corruption analysis:', error);
    throw error;
  }
}

// Run analysis
analyzeConfidenceCorruption()
  .then(() => {
    console.log('\n🎯 Confidence corruption analysis completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });