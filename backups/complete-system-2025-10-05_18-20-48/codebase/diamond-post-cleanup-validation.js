const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball.firebaseio.com"
  });
}

const db = admin.firestore();

async function validatePostCleanup() {
  console.log('💎 DIAMOND POST-CLEANUP VALIDATION');
  console.log('===================================');
  console.log('🔍 Verifying confidence data cleanup was successful');
  console.log('');
  
  const validation = {
    totalSubmissions: 0,
    submissionsWithUndefinedConfidence: 0,
    submissionsWithDefinedConfidence: 0,
    undefinedConfidenceDetails: [],
    successfulFixes: 0,
    validationErrors: []
  };
  
  try {
    // Check all submissions for remaining undefined confidence values
    const allSubmissions = await db.collectionGroup('submissions').get();
    validation.totalSubmissions = allSubmissions.size;
    
    console.log(`📊 Validating ${validation.totalSubmissions} submissions...`);
    console.log('');
    
    for (const doc of allSubmissions.docs) {
      const submissionPath = doc.ref.path;
      const pathParts = submissionPath.split('/');
      const userId = pathParts[pathParts.length - 1];
      const weekMatch = submissionPath.match(/\/(\d+)\//);
      const weekId = weekMatch ? weekMatch[1] : 'Unknown';
      
      const data = doc.data();
      let hasUndefinedConfidence = false;
      let hasValidPicks = false;
      
      if (data && typeof data === 'object') {
        const keys = Object.keys(data);
        
        for (const gameId of keys) {
          const pick = data[gameId];
          
          if (pick && typeof pick === 'object') {
            // Check for undefined confidence values
            if (pick.confidence === undefined && pick.winner) {
              console.log(`❌ STILL UNDEFINED: ${submissionPath}/${gameId} - Winner: ${pick.winner}`);
              hasUndefinedConfidence = true;
              
              validation.undefinedConfidenceDetails.push({
                user: userId,
                week: weekId,
                game: gameId,
                winner: pick.winner,
                path: submissionPath
              });
            }
            
            // Count valid picks with defined confidence
            if (pick.confidence !== undefined && pick.winner) {
              hasValidPicks = true;
            }
          }
        }
      }
      
      if (hasUndefinedConfidence) {
        validation.submissionsWithUndefinedConfidence++;
      }
      
      if (hasValidPicks) {
        validation.submissionsWithDefinedConfidence++;
      }
    }
    
    console.log('💎 VALIDATION RESULTS');
    console.log('=====================');
    console.log(`Total Submissions: ${validation.totalSubmissions}`);
    console.log(`Submissions with Undefined Confidence: ${validation.submissionsWithUndefinedConfidence}`);
    console.log(`Submissions with Valid Confidence: ${validation.submissionsWithDefinedConfidence}`);
    console.log('');
    
    if (validation.submissionsWithUndefinedConfidence === 0) {
      console.log('✅ SUCCESS: No undefined confidence values found!');
      console.log('✅ All confidence data has been cleaned up properly');
    } else {
      console.log(`❌ ISSUE: Found ${validation.submissionsWithUndefinedConfidence} submissions with undefined confidence`);
      console.log('');
      console.log('🔍 UNDEFINED CONFIDENCE DETAILS:');
      validation.undefinedConfidenceDetails.forEach((issue, index) => {
        console.log(`${index + 1}. User: ${issue.user}, Week: ${issue.week}, Game: ${issue.game}, Winner: ${issue.winner}`);
      });
    }
    
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('1. Open the application and verify leaderboard shows correct totals');
    console.log('2. Check that confidence values display as numbers, not "?" symbols');
    console.log('3. Verify all user picks display properly');
    console.log('4. Test that leaderboard calculations are accurate');
    
    if (validation.submissionsWithUndefinedConfidence > 0) {
      console.log('');
      console.log('⚠️  ATTENTION: Additional cleanup may be needed for remaining undefined values');
    }
    
    return validation;
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    validation.validationErrors.push(error.message);
    throw error;
  }
}

// Run validation
validatePostCleanup()
  .then((results) => {
    const isClean = results.submissionsWithUndefinedConfidence === 0;
    console.log(`\n🚀 Validation completed: ${isClean ? 'CLEAN' : 'NEEDS ATTENTION'}`);
    process.exit(isClean ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });