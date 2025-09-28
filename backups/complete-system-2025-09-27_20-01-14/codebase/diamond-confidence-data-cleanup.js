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

async function cleanupConfidenceData() {
  console.log('💎 DIAMOND DATA CLEANUP: Confidence Values');
  console.log('==========================================');
  console.log('⚠️  WARNING: This script will modify production data!');
  console.log('⚠️  Run with DRY_RUN=true first to preview changes!\n');
  
  const DRY_RUN = process.env.DRY_RUN === 'true';
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE: No changes will be made to the database');
  } else {
    console.log('🚨 LIVE MODE: Changes WILL be written to the database');
  }
  
  console.log('');
  
  const cleanup = {
    submissionsScanned: 0,
    submissionsModified: 0,
    picksObjectsRemoved: 0,
    undefinedConfidenceFixed: 0,
    emptySubmissionsRemoved: 0,
    operationsLog: []
  };

  try {
    // Get all submissions
    const allSubmissions = await db.collectionGroup('submissions').get();
    cleanup.submissionsScanned = allSubmissions.size;
    
    console.log(`📊 Scanning ${cleanup.submissionsScanned} submissions for cleanup...\n`);
    
    for (const doc of allSubmissions.docs) {
      const submissionPath = doc.ref.path;
      const pathParts = submissionPath.split('/');
      const userId = pathParts[pathParts.length - 1];
      const weekMatch = submissionPath.match(/\/(\d+)\//);
      const weekId = weekMatch ? weekMatch[1] : 'Unknown';
      
      const data = doc.data();
      let modified = false;
      let newData = { ...data };
      
      if (data && typeof data === 'object') {
        const keys = Object.keys(data);
        
        for (const gameId of keys) {
          const pick = data[gameId];
          
          if (pick && typeof pick === 'object') {
            // Case 1: "picks" objects with undefined confidence and no winner - DELETE
            if (gameId === 'picks' && pick.confidence === undefined && !pick.winner) {
              console.log(`🗑️  Removing empty "picks" object: ${submissionPath}/${gameId}`);
              delete newData[gameId];
              cleanup.picksObjectsRemoved++;
              modified = true;
              
              cleanup.operationsLog.push({
                operation: 'REMOVE_EMPTY_PICKS_OBJECT',
                user: userId,
                week: weekId,
                game: gameId,
                path: submissionPath,
                reason: 'Empty picks object with undefined confidence and no winner'
              });
            }
            
            // Case 2: Picks with undefined confidence but have winner - ASSIGN DEFAULT CONFIDENCE
            else if (pick.confidence === undefined && pick.winner) {
              // Assign a default confidence value (we'll use 1 as lowest priority)
              const defaultConfidence = 1;
              newData[gameId].confidence = defaultConfidence;
              
              console.log(`🔧 Fixing undefined confidence: ${submissionPath}/${gameId}`);
              console.log(`     Winner: ${pick.winner} -> Confidence: ${defaultConfidence}`);
              
              cleanup.undefinedConfidenceFixed++;
              modified = true;
              
              cleanup.operationsLog.push({
                operation: 'FIX_UNDEFINED_CONFIDENCE',
                user: userId,
                week: weekId,
                game: gameId,
                winner: pick.winner,
                assignedConfidence: defaultConfidence,
                path: submissionPath,
                reason: 'Had winner but undefined confidence'
              });
            }
          }
        }
        
        // Check if submission is now empty after cleanup
        const remainingKeys = Object.keys(newData);
        if (remainingKeys.length === 0) {
          console.log(`🗑️  Submission is now empty, removing: ${submissionPath}`);
          
          if (!DRY_RUN) {
            await doc.ref.delete();
          }
          
          cleanup.emptySubmissionsRemoved++;
          cleanup.operationsLog.push({
            operation: 'REMOVE_EMPTY_SUBMISSION',
            user: userId,
            week: weekId,
            path: submissionPath,
            reason: 'Submission became empty after removing invalid picks'
          });
        }
        else if (modified) {
          console.log(`💾 Updating submission: ${submissionPath}`);
          
          if (!DRY_RUN) {
            await doc.ref.set(newData);
          }
          
          cleanup.submissionsModified++;
        }
      }
    }
    
    console.log('\n💎 CLEANUP RESULTS');
    console.log('==================');
    console.log(`Submissions Scanned: ${cleanup.submissionsScanned}`);
    console.log(`Submissions Modified: ${cleanup.submissionsModified}`);
    console.log(`Empty "picks" Objects Removed: ${cleanup.picksObjectsRemoved}`);
    console.log(`Undefined Confidence Values Fixed: ${cleanup.undefinedConfidenceFixed}`);
    console.log(`Empty Submissions Removed: ${cleanup.emptySubmissionsRemoved}`);
    
    if (DRY_RUN) {
      console.log('\n🔍 DRY RUN COMPLETE - No changes made to database');
      console.log('   To execute these changes, run: node diamond-confidence-data-cleanup.js');
    } else {
      console.log('\n✅ LIVE CLEANUP COMPLETE - Changes written to database');
    }
    
    // Save cleanup report
    const reportData = {
      cleanupTimestamp: new Date().toISOString(),
      dryRun: DRY_RUN,
      summary: cleanup,
      operationsLog: cleanup.operationsLog
    };
    
    const reportFilename = DRY_RUN ? 
      'diamond-confidence-cleanup-dry-run-report.json' : 
      'diamond-confidence-cleanup-live-report.json';
    
    fs.writeFileSync(reportFilename, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Cleanup report saved to: ${reportFilename}`);
    
    // Validation recommendations
    console.log('\n🔍 POST-CLEANUP VALIDATION NEEDED');
    console.log('==================================');
    console.log('1. Run the diagnostic script again to verify all issues resolved');
    console.log('2. Test frontend display to ensure confidence values show correctly');
    console.log('3. Verify leaderboard calculations are accurate');
    console.log('4. Check that no valid picks were accidentally removed');
    
    if (!DRY_RUN) {
      console.log('\n⚠️  IMMEDIATE ACTION REQUIRED');
      console.log('============================');
      console.log('1. Test all affected users can still see their picks correctly');
      console.log('2. Verify scoring calculations are working');
      console.log('3. Monitor for any user complaints about missing picks');
      console.log('4. Consider notifying affected users about the data cleanup');
    }
    
  } catch (error) {
    console.error('❌ Error during data cleanup:', error);
    throw error;
  }
}

// Show usage instructions
if (process.argv.length > 2 && process.argv[2] === '--help') {
  console.log('💎 Diamond Confidence Data Cleanup Script');
  console.log('=========================================');
  console.log('');
  console.log('Usage:');
  console.log('  DRY_RUN=true node diamond-confidence-data-cleanup.js    # Preview changes');
  console.log('  node diamond-confidence-data-cleanup.js                 # Execute cleanup');
  console.log('');
  console.log('Operations performed:');
  console.log('1. Remove empty "picks" objects with undefined confidence and no winner');
  console.log('2. Assign default confidence (1) to picks with winner but undefined confidence');
  console.log('3. Remove submissions that become empty after cleanup');
  console.log('');
  console.log('⚠️  Always run dry run first to preview changes!');
  process.exit(0);
}

// Run cleanup
cleanupConfidenceData()
  .then(() => {
    console.log('\n🎯 Confidence data cleanup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });