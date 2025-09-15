#!/usr/bin/env node

// Firebase Admin SDK Analysis for Survivor Elimination Bug
// Direct database access using Firebase Admin SDK

const admin = require('firebase-admin');
const fs = require('fs');

console.log('🔍 FIREBASE ADMIN SDK SURVIVOR ANALYSIS');
console.log('========================================');

// Initialize Firebase Admin SDK
let app;
try {
  // Try to use default service account or application default credentials
  app = admin.initializeApp({
    projectId: 'nerdfootball'
  });
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  console.log('\nTip: Make sure you are authenticated with Firebase CLI:');
  console.log('firebase login');
  console.log('or set up service account credentials');
  process.exit(1);
}

const db = admin.firestore();

async function analyzeEliminationIssues() {
  try {
    console.log('\n📊 STEP 1: Fetching Pool Members');
    console.log('=================================');

    // Get pool members
    const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    const poolDoc = await poolMembersRef.get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    console.log('✅ Pool members document retrieved');

    // Extract user IDs
    let userIds = [];
    if (poolData.users) {
      userIds = Object.keys(poolData.users);
    } else {
      console.log('Pool data structure:', JSON.stringify(poolData, null, 2));
      throw new Error('Could not find users in pool data');
    }

    console.log(`✅ Found ${userIds.length} users:`, userIds);

    console.log('\n📊 STEP 2: Analyzing User Elimination Status');
    console.log('============================================');

    const issues = [];
    const validUsers = [];

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      console.log(`\n👤 Checking user ${i + 1}/${userIds.length}: ${userId}`);

      try {
        const userRef = db.doc(`artifacts/nerdfootball/public/data/nerd_survivor/${userId}`);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          console.log('   ⚠️  No survivor data found');
          continue;
        }

        const userData = userDoc.data();

        // Extract elimination status
        const eliminated = userData.eliminated || false;
        const eliminatedWeek = userData.eliminatedWeek || null;
        const hasValidPicks = userData.picks && Object.keys(userData.picks).length > 0;

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
            userData
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
        console.error(`   ❌ Error processing user ${userId}:`, error.message);
      }
    }

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
        console.log(`   Current data:`, JSON.stringify({
          eliminated: issue.eliminated,
          eliminatedWeek: issue.eliminatedWeek,
          hasValidPicks: issue.hasValidPicks
        }, null, 2));
      });

      // Save issues for batch fix
      fs.writeFileSync('admin-elimination-issues.json', JSON.stringify(issues, null, 2));
      console.log('\n💾 Issues saved to: admin-elimination-issues.json');

      // Generate batch fix operations
      console.log('\n🔧 GENERATING BATCH FIX OPERATIONS');
      console.log('==================================');

      const batchFixes = [];

      for (const issue of issues) {
        if (issue.issue === 'ELIMINATED_WITHOUT_WEEK') {
          batchFixes.push({
            userId: issue.userId,
            operation: 'UPDATE',
            path: `artifacts/nerdfootball/public/data/nerd_survivor/${issue.userId}`,
            data: {
              eliminated: false
            }
          });
          console.log(`FIX: ${issue.userId} - Set eliminated=false`);
        }
      }

      if (batchFixes.length > 0) {
        fs.writeFileSync('batch-fix-operations.json', JSON.stringify(batchFixes, null, 2));
        console.log(`\n💾 ${batchFixes.length} fix operations saved to: batch-fix-operations.json`);

        console.log('\n🎯 NEXT STEPS:');
        console.log('==============');
        console.log('1. Review admin-elimination-issues.json');
        console.log('2. Execute fixes: node firebase-admin-fix.js');
        console.log('3. Verify fixes: node firebase-admin-verify.js');
      }

    } else {
      console.log('\n✅ No elimination issues found!');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error(error.stack);
  } finally {
    // Close the app
    await admin.app().delete();
  }
}

// Run the analysis
analyzeEliminationIssues().catch(console.error);