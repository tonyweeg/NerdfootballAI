#!/usr/bin/env node

// Quick CLI Analysis for Survivor Elimination Bug
// Direct Firebase CLI approach to bypass browser permission issues

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 QUICK FIREBASE CLI SURVIVOR ANALYSIS');
console.log('========================================');

const FIREBASE_PROJECT = 'nerdfootball';

// Helper function to run Firebase CLI commands
function runFirebaseCommand(command) {
  try {
    console.log(`Running: ${command}`);
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

// Step 1: Get pool members
console.log('\n📊 STEP 1: Fetching Pool Members');
console.log('=================================');

const poolMembersResult = runFirebaseCommand(
  'firebase firestore:get "artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members"'
);

if (!poolMembersResult) {
  console.error('❌ Failed to fetch pool members');
  process.exit(1);
}

// Save pool members data
fs.writeFileSync('pool_members_quick.json', poolMembersResult);
console.log('✅ Pool members saved to: pool_members_quick.json');

// Step 2: Parse and extract user IDs
console.log('\n📊 STEP 2: Extracting User IDs');
console.log('===============================');

let userIds = [];
try {
  const poolData = JSON.parse(poolMembersResult);

  // Handle different possible data structures
  if (poolData.fields && poolData.fields.users) {
    userIds = Object.keys(poolData.fields.users.mapValue.fields);
  } else if (poolData.users) {
    userIds = Object.keys(poolData.users);
  } else {
    console.log('Raw pool data structure:');
    console.log(JSON.stringify(poolData, null, 2));

    // Try to find users in the structure
    const findUsers = (obj, path = '') => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (key === 'users' && typeof value === 'object') {
          console.log(`Found users at path: ${currentPath}`);
          if (value.mapValue && value.mapValue.fields) {
            userIds = Object.keys(value.mapValue.fields);
          } else {
            userIds = Object.keys(value);
          }
          return;
        }

        if (typeof value === 'object') {
          findUsers(value, currentPath);
        }
      }
    };

    findUsers(poolData);
  }

  console.log(`✅ Found ${userIds.length} users:`, userIds);

} catch (error) {
  console.error('❌ Error parsing pool members:', error.message);
  process.exit(1);
}

if (userIds.length === 0) {
  console.error('❌ No user IDs found in pool members');
  process.exit(1);
}

// Step 3: Check each user's survivor status
console.log('\n📊 STEP 3: Analyzing User Elimination Status');
console.log('============================================');

const issues = [];
const validUsers = [];

userIds.forEach((userId, index) => {
  console.log(`\n👤 Checking user ${index + 1}/${userIds.length}: ${userId}`);

  const userDataResult = runFirebaseCommand(
    `firebase firestore:get "artifacts/nerdfootball/public/data/nerd_survivor/${userId}"`
  );

  if (!userDataResult) {
    console.log('   ⚠️  No survivor data found');
    return;
  }

  try {
    const userData = JSON.parse(userDataResult);

    // Extract elimination status
    let eliminated = false;
    let eliminatedWeek = null;
    let hasValidPicks = false;

    if (userData.fields) {
      // Firebase Firestore format
      if (userData.fields.eliminated) {
        eliminated = userData.fields.eliminated.booleanValue;
      }
      if (userData.fields.eliminatedWeek) {
        eliminatedWeek = userData.fields.eliminatedWeek.integerValue;
      }
      if (userData.fields.picks) {
        hasValidPicks = Object.keys(userData.fields.picks.mapValue.fields || {}).length > 0;
      }
    } else {
      // Direct JSON format
      eliminated = userData.eliminated || false;
      eliminatedWeek = userData.eliminatedWeek || null;
      hasValidPicks = userData.picks && Object.keys(userData.picks).length > 0;
    }

    console.log(`   Eliminated: ${eliminated}`);
    console.log(`   Eliminated Week: ${eliminatedWeek}`);
    console.log(`   Has Picks: ${hasValidPicks}`);

    // Identify issues
    if (eliminated && !eliminatedWeek) {
      issues.push({
        userId,
        issue: 'ELIMINATED_WITHOUT_WEEK',
        eliminated,
        eliminatedWeek,
        hasValidPicks,
        fixCommand: `firebase firestore:update "artifacts/nerdfootball/public/data/nerd_survivor/${userId}" eliminated=false`
      });
      console.log(`   🚨 ISSUE: Eliminated without week - NEEDS FIX!`);
    } else if (eliminated && eliminatedWeek) {
      console.log(`   ✅ Eliminated in week ${eliminatedWeek} (may be correct)`);
      validUsers.push({ userId, eliminated, eliminatedWeek, hasValidPicks });
    } else {
      console.log(`   ✅ Status appears correct`);
      validUsers.push({ userId, eliminated, eliminatedWeek, hasValidPicks });
    }

  } catch (error) {
    console.error(`   ❌ Error parsing user data: ${error.message}`);
  }
});

// Step 4: Generate report and fix commands
console.log('\n📋 FINAL ANALYSIS REPORT');
console.log('========================');
console.log(`Total users analyzed: ${userIds.length}`);
console.log(`Users with issues: ${issues.length}`);
console.log(`Valid users: ${validUsers.length}`);

if (issues.length > 0) {
  console.log('\n🚨 USERS WITH ELIMINATION ISSUES:');
  console.log('=================================');

  issues.forEach(issue => {
    console.log(`\n👤 User: ${issue.userId}`);
    console.log(`   Issue: ${issue.issue}`);
    console.log(`   Fix Command: ${issue.fixCommand}`);
  });

  // Generate batch fix script
  const fixCommands = issues.map(issue => issue.fixCommand);
  const batchScript = `#!/bin/bash

# Batch Fix Script for Survivor Elimination Issues
# Generated: ${new Date().toISOString()}

echo "🔧 EXECUTING SURVIVOR ELIMINATION FIXES"
echo "======================================="

${fixCommands.map((cmd, idx) => `
echo "Fix ${idx + 1}/${fixCommands.length}: ${issues[idx].userId}"
${cmd}
echo "✅ Fixed: ${issues[idx].userId}"`).join('')}

echo ""
echo "✅ ALL FIXES COMPLETED"
echo "Run verification: node quick-cli-verification.js"
`;

  fs.writeFileSync('batch-fix-eliminations.sh', batchScript);
  execSync('chmod +x batch-fix-eliminations.sh');

  console.log('\n💾 Batch fix script saved: batch-fix-eliminations.sh');
  console.log('🔧 To execute fixes, run: ./batch-fix-eliminations.sh');

  // Save issues for reference
  fs.writeFileSync('elimination-issues-report.json', JSON.stringify(issues, null, 2));
  console.log('📋 Detailed report saved: elimination-issues-report.json');

} else {
  console.log('\n✅ No elimination issues found!');
}

console.log('\n🎯 NEXT STEPS:');
console.log('==============');
if (issues.length > 0) {
  console.log('1. Review the issues above');
  console.log('2. Execute: ./batch-fix-eliminations.sh');
  console.log('3. Verify: node quick-cli-verification.js');
} else {
  console.log('No action needed - all elimination statuses appear correct');
}