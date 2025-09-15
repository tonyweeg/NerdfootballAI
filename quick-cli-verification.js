#!/usr/bin/env node

// Quick CLI Verification for Survivor Elimination Fixes
// Verifies that fixes were applied correctly

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 QUICK FIREBASE CLI VERIFICATION');
console.log('===================================');

const FIREBASE_PROJECT = 'nerdfootball';

// Helper function to run Firebase CLI commands
function runFirebaseCommand(command) {
  try {
    const result = execSync(command, { encoding: 'utf8' });
    return result;
  } catch (error) {
    console.error(`Error running command: ${error.message}`);
    return null;
  }
}

// Set Firebase project
console.log(`\n📋 Setting Firebase project to: ${FIREBASE_PROJECT}`);
runFirebaseCommand(`firebase use ${FIREBASE_PROJECT}`);

// Check if we have a previous issues report
let previousIssues = [];
if (fs.existsSync('elimination-issues-report.json')) {
  try {
    previousIssues = JSON.parse(fs.readFileSync('elimination-issues-report.json', 'utf8'));
    console.log(`\n📋 Found ${previousIssues.length} previously identified issues to verify`);
  } catch (error) {
    console.error('Error reading previous issues report:', error.message);
  }
}

if (previousIssues.length === 0) {
  console.log('\n❌ No previous issues found to verify');
  console.log('Run quick-cli-analysis.js first to identify issues');
  process.exit(1);
}

console.log('\n🔍 VERIFYING FIXES FOR PREVIOUSLY IDENTIFIED ISSUES');
console.log('===================================================');

const verificationResults = [];

previousIssues.forEach((issue, index) => {
  console.log(`\n👤 Verifying ${index + 1}/${previousIssues.length}: ${issue.userId}`);
  console.log(`   Previous issue: ${issue.issue}`);

  const userDataResult = runFirebaseCommand(
    `firebase firestore:get "artifacts/nerdfootball/public/data/nerd_survivor/${issue.userId}"`
  );

  if (!userDataResult) {
    console.log('   ❌ No survivor data found (unexpected)');
    verificationResults.push({
      userId: issue.userId,
      previousIssue: issue.issue,
      status: 'ERROR_NO_DATA',
      details: 'No survivor data found'
    });
    return;
  }

  try {
    const userData = JSON.parse(userDataResult);

    // Extract current elimination status
    let eliminated = false;
    let eliminatedWeek = null;

    if (userData.fields) {
      // Firebase Firestore format
      if (userData.fields.eliminated) {
        eliminated = userData.fields.eliminated.booleanValue;
      }
      if (userData.fields.eliminatedWeek) {
        eliminatedWeek = userData.fields.eliminatedWeek.integerValue;
      }
    } else {
      // Direct JSON format
      eliminated = userData.eliminated || false;
      eliminatedWeek = userData.eliminatedWeek || null;
    }

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
    console.error(`   ❌ Error parsing user data: ${error.message}`);
    verificationResults.push({
      userId: issue.userId,
      previousIssue: issue.issue,
      status: 'ERROR_PARSING',
      details: error.message
    });
  }
});

// Generate verification report
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
fs.writeFileSync('verification-report.json', JSON.stringify(verificationResults, null, 2));
console.log('\n💾 Verification report saved: verification-report.json');

if (fixedCount === previousIssues.length) {
  console.log('\n🎉 ALL ISSUES SUCCESSFULLY FIXED!');
} else {
  console.log('\n⚠️  Some issues may need additional attention');
}

console.log('\n🎯 VERIFICATION COMPLETE');
console.log('========================');