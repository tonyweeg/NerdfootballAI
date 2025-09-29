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

async function deepInvestigateConfidenceIssue() {
  console.log('💎 DIAMOND DEEP INVESTIGATION: Confidence Display Issue');
  console.log('======================================================');
  
  const targetUser = 'w9a0168NrKRH3sgB4BoFYCt7miV2';
  const issues = [];
  
  try {
    console.log(`🔍 Deep investigation of user: ${targetUser}\n`);
    
    // Get all submissions for this specific user
    const allSubmissions = await db.collectionGroup('submissions').get();
    
    console.log(`📊 Total submissions in database: ${allSubmissions.size}`);
    
    // Filter to find submissions for our target user
    const userSubmissions = allSubmissions.docs.filter(doc => {
      return doc.ref.path.includes(targetUser);
    });
    
    console.log(`📊 Found ${userSubmissions.length} submissions for target user\n`);
    
    if (userSubmissions.length === 0) {
      console.log('⚠️  NO SUBMISSIONS FOUND FOR TARGET USER');
      console.log('   This could indicate:');
      console.log('   1. User has not made any picks');
      console.log('   2. User ID is incorrect or has changed');
      console.log('   3. Data structure is different than expected');
      return;
    }
    
    // Analyze each submission in detail
    for (let i = 0; i < userSubmissions.length; i++) {
      const doc = userSubmissions[i];
      const submissionPath = doc.ref.path;
      const weekMatch = submissionPath.match(/week(\d+)/);
      const weekId = weekMatch ? weekMatch[1] : 'Unknown';
      
      console.log(`📝 Submission ${i + 1}: ${submissionPath}`);
      console.log(`   Week: ${weekId}`);
      
      const data = doc.data();
      
      if (data && typeof data === 'object') {
        const games = Object.keys(data);
        console.log(`   Games: ${games.length}`);
        
        games.forEach(gameId => {
          const pick = data[gameId];
          if (pick && typeof pick === 'object') {
            const confidence = pick.confidence;
            const confidenceType = typeof confidence;
            
            console.log(`     🏈 ${gameId}:`);
            console.log(`        Winner: ${pick.winner || 'N/A'}`);
            console.log(`        Confidence: ${confidence} (${confidenceType})`);
            
            // Check for various problematic confidence values
            if (confidence === 0) {
              console.log(`        🚨 ISSUE: Confidence is numeric zero (0)`);
              issues.push({
                type: 'NUMERIC_ZERO',
                user: targetUser,
                week: weekId,
                game: gameId,
                confidence: confidence,
                path: submissionPath
              });
            } else if (confidence === '0') {
              console.log(`        🚨 ISSUE: Confidence is string zero ("0")`);
              issues.push({
                type: 'STRING_ZERO',
                user: targetUser,
                week: weekId,
                game: gameId,
                confidence: confidence,
                path: submissionPath
              });
            } else if (confidence === null) {
              console.log(`        🚨 ISSUE: Confidence is null`);
              issues.push({
                type: 'NULL_CONFIDENCE',
                user: targetUser,
                week: weekId,
                game: gameId,
                confidence: confidence,
                path: submissionPath
              });
            } else if (confidence === undefined) {
              console.log(`        🚨 ISSUE: Confidence is undefined`);
              issues.push({
                type: 'UNDEFINED_CONFIDENCE',
                user: targetUser,
                week: weekId,
                game: gameId,
                confidence: confidence,
                path: submissionPath
              });
            } else if (confidence === '') {
              console.log(`        🚨 ISSUE: Confidence is empty string`);
              issues.push({
                type: 'EMPTY_STRING',
                user: targetUser,
                week: weekId,
                game: gameId,
                confidence: confidence,
                path: submissionPath
              });
            } else if (isNaN(confidence)) {
              console.log(`        🚨 ISSUE: Confidence is not a number (${confidence})`);
              issues.push({
                type: 'NOT_A_NUMBER',
                user: targetUser,
                week: weekId,
                game: gameId,
                confidence: confidence,
                path: submissionPath
              });
            } else {
              console.log(`        ✅ Valid confidence value`);
            }
            
            // Test frontend display logic
            const displayValue = confidence || '?';
            const parsedValue = parseInt(confidence) || 0;
            
            console.log(`        📱 Frontend display: "${displayValue}"`);
            console.log(`        🔢 Parsed integer: ${parsedValue}`);
            
            if (displayValue === '?') {
              console.log(`        ⚠️  Would display as question mark`);
              issues.push({
                type: 'DISPLAYS_AS_QUESTION_MARK',
                user: targetUser,
                week: weekId,
                game: gameId,
                confidence: confidence,
                displayValue: displayValue,
                path: submissionPath
              });
            }
          }
        });
      }
      console.log('');
    }
    
    // Check if user exists in pool membership
    console.log('🏊 Checking Pool Membership...');
    const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    const poolDoc = await poolMembersRef.get();
    
    if (poolDoc.exists) {
      const members = poolDoc.data();
      if (members[targetUser]) {
        console.log('✅ User exists in pool membership');
        console.log(`👤 User info: ${JSON.stringify(members[targetUser], null, 2)}`);
      } else {
        console.log('❌ User NOT found in pool membership');
        issues.push({
          type: 'NOT_IN_POOL_MEMBERSHIP',
          user: targetUser,
          details: 'User not found in pool members list'
        });
      }
    } else {
      console.log('❌ Pool metadata document not found');
    }
    
    // Summary of findings
    console.log('\n💎 INVESTIGATION SUMMARY');
    console.log('========================');
    console.log(`Total Issues Found: ${issues.length}`);
    
    if (issues.length > 0) {
      console.log('\n🚨 ISSUES BY TYPE:');
      const issuesByType = {};
      issues.forEach(issue => {
        issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      });
      
      Object.entries(issuesByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} occurrences`);
      });
      
      console.log('\n📋 DETAILED ISSUES:');
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.type}`);
        console.log(`     User: ${issue.user}`);
        console.log(`     Week: ${issue.week || 'N/A'}`);
        console.log(`     Game: ${issue.game || 'N/A'}`);
        console.log(`     Confidence: ${JSON.stringify(issue.confidence)}`);
        console.log(`     Path: ${issue.path || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('✅ No confidence-related issues found for this user');
      console.log('   This suggests:');
      console.log('   - All confidence values are valid');
      console.log('   - Issue may be in frontend display logic');
      console.log('   - Issue may have been previously resolved');
      console.log('   - User may not have made picks yet');
    }
    
    // Save detailed investigation report
    const reportData = {
      investigationTimestamp: new Date().toISOString(),
      targetUser: targetUser,
      submissionsFound: userSubmissions.length,
      totalIssues: issues.length,
      issuesByType: issues.reduce((acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      }, {}),
      detailedIssues: issues
    };
    
    fs.writeFileSync('diamond-confidence-deep-investigation-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n📄 Detailed investigation report saved to: diamond-confidence-deep-investigation-report.json');
    
    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS');
    console.log('==================');
    
    if (issues.length === 0) {
      console.log('1. Verify the original issue still exists in the frontend');
      console.log('2. Check if the issue was already resolved');
      console.log('3. Investigate frontend display logic for edge cases');
      console.log('4. Consider testing with different browsers/devices');
    } else {
      console.log('1. Address data integrity issues found');
      console.log('2. Implement stronger validation on picks submission');
      console.log('3. Add data migration script if needed');
      console.log('4. Update frontend display logic to handle edge cases');
    }
    
  } catch (error) {
    console.error('❌ Error during deep investigation:', error);
    throw error;
  }
}

// Run investigation
deepInvestigateConfidenceIssue()
  .then(() => {
    console.log('\n🎯 Deep investigation completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Deep investigation failed:', error);
    process.exit(1);
  });