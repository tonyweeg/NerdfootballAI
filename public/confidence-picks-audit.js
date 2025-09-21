// 🔍 CONFIDENCE PICKS AUDIT - Find Invalid Pick Distributions
// Identifies users with duplicate/missing confidence values

async function auditConfidencePicks() {
    console.log('🔍 STARTING CONFIDENCE PICKS AUDIT...');

    const auditResults = {
        week1: { valid: [], invalid: [], errors: [] },
        week2: { valid: [], invalid: [], errors: [] },
        summary: { totalUsers: 0, validUsers: 0, invalidUsers: 0, errorUsers: 0 }
    };

    try {
        // Get all pool members
        const poolMembers = await window.ScoringSystemManager.getPoolMembers();
        auditResults.summary.totalUsers = poolMembers.length;

        console.log(`📊 Auditing ${poolMembers.length} users for Weeks 1-2...`);

        // Audit each week
        for (const week of [1, 2]) {
            console.log(`\n🔍 === AUDITING WEEK ${week} ===`);

            for (const member of poolMembers) {
                try {
                    // Get user's picks for this week
                    const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
                    const picksDocRef = window.doc(window.db, picksPath, member.uid);
                    const picksSnap = await window.getDoc(picksDocRef);

                    const userName = member.displayName || member.email || `User-${member.uid.slice(-6)}`;

                    if (!picksSnap.exists() || !picksSnap.data()) {
                        auditResults[`week${week}`].errors.push({
                            userId: member.uid,
                            userName,
                            issue: 'NO_PICKS_FOUND',
                            details: 'No picks document found'
                        });
                        console.log(`❌ ${userName}: NO PICKS FOUND`);
                        continue;
                    }

                    const picksData = picksSnap.data();
                    const gameIds = Object.keys(picksData);
                    const confidenceValues = [];
                    const gameDetails = [];

                    // Extract confidence values
                    for (const gameId of gameIds) {
                        const gameData = picksData[gameId];
                        if (gameData && gameData.confidence !== undefined) {
                            confidenceValues.push(parseInt(gameData.confidence));
                            gameDetails.push({
                                gameId,
                                confidence: parseInt(gameData.confidence),
                                pick: gameData.pick || 'No pick'
                            });
                        }
                    }

                    // Validate confidence distribution
                    const expectedLength = gameIds.length;
                    const expectedValues = Array.from({length: expectedLength}, (_, i) => i + 1);
                    const sortedActual = [...confidenceValues].sort((a, b) => a - b);

                    // Check for issues
                    const issues = [];

                    // Check length
                    if (confidenceValues.length !== expectedLength) {
                        issues.push(`Wrong count: ${confidenceValues.length} confidence values for ${expectedLength} games`);
                    }

                    // Check for duplicates
                    const duplicates = confidenceValues.filter((value, index) => confidenceValues.indexOf(value) !== index);
                    if (duplicates.length > 0) {
                        issues.push(`Duplicate confidence values: ${[...new Set(duplicates)].join(', ')}`);
                    }

                    // Check for missing values
                    const missing = expectedValues.filter(val => !confidenceValues.includes(val));
                    if (missing.length > 0) {
                        issues.push(`Missing confidence values: ${missing.join(', ')}`);
                    }

                    // Check for out-of-range values
                    const outOfRange = confidenceValues.filter(val => val < 1 || val > expectedLength);
                    if (outOfRange.length > 0) {
                        issues.push(`Out of range values: ${outOfRange.join(', ')} (valid: 1-${expectedLength})`);
                    }

                    if (issues.length > 0) {
                        auditResults[`week${week}`].invalid.push({
                            userId: member.uid,
                            userName,
                            issues,
                            confidenceValues: confidenceValues,
                            expectedValues: expectedValues,
                            gameDetails: gameDetails
                        });
                        console.log(`❌ ${userName}: ${issues.join('; ')}`);
                    } else {
                        auditResults[`week${week}`].valid.push({
                            userId: member.uid,
                            userName,
                            gameCount: gameIds.length
                        });
                        console.log(`✅ ${userName}: Valid confidence distribution (${gameIds.length} games)`);
                    }

                } catch (userError) {
                    auditResults[`week${week}`].errors.push({
                        userId: member.uid,
                        userName: member.displayName || member.email || `User-${member.uid.slice(-6)}`,
                        issue: 'AUDIT_ERROR',
                        details: userError.message
                    });
                    console.error(`💥 Error auditing ${member.displayName}:`, userError);
                }
            }
        }

        // Calculate summary
        const allInvalid = [...auditResults.week1.invalid, ...auditResults.week2.invalid];
        const allErrors = [...auditResults.week1.errors, ...auditResults.week2.errors];
        const uniqueInvalidUsers = [...new Set(allInvalid.map(u => u.userId))];
        const uniqueErrorUsers = [...new Set(allErrors.map(u => u.userId))];

        auditResults.summary.invalidUsers = uniqueInvalidUsers.length;
        auditResults.summary.errorUsers = uniqueErrorUsers.length;
        auditResults.summary.validUsers = auditResults.summary.totalUsers - auditResults.summary.invalidUsers - auditResults.summary.errorUsers;

        // Final Report
        console.log('\n🎯 === AUDIT COMPLETE ===');
        console.log(`📊 SUMMARY:`);
        console.log(`   Total Users: ${auditResults.summary.totalUsers}`);
        console.log(`   ✅ Valid Users: ${auditResults.summary.validUsers}`);
        console.log(`   ❌ Invalid Users: ${auditResults.summary.invalidUsers}`);
        console.log(`   💥 Error Users: ${auditResults.summary.errorUsers}`);

        console.log('\n📋 WEEK 1 RESULTS:');
        console.log(`   ✅ Valid: ${auditResults.week1.valid.length}`);
        console.log(`   ❌ Invalid: ${auditResults.week1.invalid.length}`);
        console.log(`   💥 Errors: ${auditResults.week1.errors.length}`);

        console.log('\n📋 WEEK 2 RESULTS:');
        console.log(`   ✅ Valid: ${auditResults.week2.valid.length}`);
        console.log(`   ❌ Invalid: ${auditResults.week2.invalid.length}`);
        console.log(`   💥 Errors: ${auditResults.week2.errors.length}`);

        if (auditResults.week1.invalid.length > 0) {
            console.log('\n❌ WEEK 1 INVALID USERS:');
            auditResults.week1.invalid.forEach(user => {
                console.log(`   • ${user.userName}: ${user.issues.join('; ')}`);
            });
        }

        if (auditResults.week2.invalid.length > 0) {
            console.log('\n❌ WEEK 2 INVALID USERS:');
            auditResults.week2.invalid.forEach(user => {
                console.log(`   • ${user.userName}: ${user.issues.join('; ')}`);
            });
        }

        // Store results globally for further inspection
        window.auditResults = auditResults;
        console.log('\n📁 Full audit results stored in window.auditResults');

        return auditResults;

    } catch (error) {
        console.error('💥 AUDIT FAILED:', error);
        return null;
    }
}

// Auto-run when loaded in browser
if (typeof window !== 'undefined') {
    console.log('🔍 Confidence Picks Audit Tool loaded');
    console.log('📋 Run auditConfidencePicks() to start audit');
    window.auditConfidencePicks = auditConfidencePicks;
}