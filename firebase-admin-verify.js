#!/usr/bin/env node

// Firebase Admin SDK Verification Script for Survivor Elimination Fixes
// Verifies that fixes were applied correctly

const admin = require('firebase-admin');
const fs = require('fs');

console.log('🔍 FIREBASE ADMIN SDK VERIFICATION');
console.log('===================================');

// Initialize Firebase Admin SDK
let app;
try {
  app = admin.initializeApp({
    projectId: 'nerdfootball'
  });
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function verifyFixes() {
  try {
    // Read the original issues
    if (!fs.existsSync('admin-elimination-issues.json')) {
      console.log('❌ No original issues found to verify');
      console.log('Run firebase-admin-analysis.js first');
      process.exit(1);
    }

    const originalIssues = JSON.parse(fs.readFileSync('admin-elimination-issues.json', 'utf8'));

    if (originalIssues.length === 0) {
      console.log('✅ No issues were identified to verify');
      return;
    }

    console.log(`\n🔍 VERIFYING ${originalIssues.length} PREVIOUSLY IDENTIFIED ISSUES`);
    console.log('==============================================================');

    const verificationResults = [];

    for (let i = 0; i < originalIssues.length; i++) {
      const issue = originalIssues[i];
      console.log(`\n👤 Verifying ${i + 1}/${originalIssues.length}: ${issue.userId}`);
      console.log(`   Previous issue: ${issue.issue}`);

      try {
        const userRef = db.doc(`artifacts/nerdfootball/public/data/nerd_survivor/${issue.userId}`);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          console.log('   ❌ No survivor data found (unexpected)');
          verificationResults.push({
            userId: issue.userId,
            previousIssue: issue.issue,
            status: 'ERROR_NO_DATA',
            details: 'No survivor data found'
          });
          continue;
        }

        const userData = userDoc.data();

        // Extract current elimination status
        const eliminated = userData.eliminated || false;
        const eliminatedWeek = userData.eliminatedWeek || null;

        console.log(`   Current status - Eliminated: ${eliminated}, Week: ${eliminatedWeek}`);

        // Check if the issue was fixed
        let isFixed = false;
        let status = 'UNKNOWN';

        if (issue.issue === 'ELIMINATED_WITHOUT_WEEK') {
          // Should now be eliminated=false
          if (!eliminated) {
            isFixed = true;
            status = 'FIXED';
            console.log('   ✅ FIXED: Elimination status removed');
          } else if (eliminated && eliminatedWeek) {
            isFixed = true;
            status = 'FIXED_WITH_WEEK';
            console.log(`   ✅ FIXED: Now properly eliminated in week ${eliminatedWeek}`);
          } else {
            status = 'NOT_FIXED';
            console.log('   ❌ NOT FIXED: Still eliminated without week');
          }
        }

        verificationResults.push({
          userId: issue.userId,
          previousIssue: issue.issue,
          status,
          currentEliminated: eliminated,
          currentEliminatedWeek: eliminatedWeek,
          isFixed
        });

      } catch (error) {
        console.error(`   ❌ Error verifying ${issue.userId}:`, error.message);
        verificationResults.push({
          userId: issue.userId,
          previousIssue: issue.issue,
          status: 'ERROR_VERIFICATION',
          details: error.message
        });
      }
    }

    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('=======================');

    const fixedCount = verificationResults.filter(r => r.isFixed).length;
    const notFixedCount = verificationResults.filter(r => r.status === 'NOT_FIXED').length;
    const errorCount = verificationResults.filter(r => r.status.startsWith('ERROR')).length;

    console.log(`Total issues verified: ${verificationResults.length}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Not fixed: ${notFixedCount}`);
    console.log(`Errors: ${errorCount}`);

    if (notFixedCount > 0) {
      console.log('\n❌ ISSUES STILL NOT FIXED:');
      verificationResults
        .filter(r => r.status === 'NOT_FIXED')
        .forEach(r => {
          console.log(`   ${r.userId}: ${r.previousIssue}`);
        });
    }

    if (errorCount > 0) {
      console.log('\n⚠️  VERIFICATION ERRORS:');
      verificationResults
        .filter(r => r.status.startsWith('ERROR'))
        .forEach(r => {
          console.log(`   ${r.userId}: ${r.details || r.status}`);
        });
    }

    // Save verification report
    fs.writeFileSync('admin-verification-report.json', JSON.stringify(verificationResults, null, 2));
    console.log('\n💾 Verification report saved: admin-verification-report.json');

    if (fixedCount === originalIssues.length) {
      console.log('\n🎉 ALL ISSUES SUCCESSFULLY FIXED!');
    } else {
      console.log('\n⚠️  Some issues may need additional attention');
    }

    console.log('\n🎯 VERIFICATION COMPLETE');
    console.log('========================');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error.stack);
  } finally {
    // Close the app
    await admin.app().delete();
  }
}

// Run verification
verifyFixes().catch(console.error);