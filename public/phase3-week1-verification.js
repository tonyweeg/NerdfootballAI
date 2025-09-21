// ✅ PHASE 3: WEEK 1 VERIFICATION & TESTING
// Validate fix success and test scoring system functionality

async function phase3Week1Verification() {
    console.log('✅ PHASE 3: WEEK 1 VERIFICATION STARTING...');

    const verification = {
        auditResults: null,
        scoringTest: null,
        validationSummary: {
            totalUsers: 0,
            validUsers: 0,
            invalidUsers: 0,
            errorUsers: 0,
            allUsersValid: false,
            scoringWorking: false
        }
    };

    try {
        // STEP 1: Re-run confidence audit on Week 1
        console.log('🔍 STEP 1: Running confidence audit on fixed Week 1 data...');

        // Re-create audit for Week 1 only
        const poolMembers = await window.ScoringSystemManager.getPoolMembers();
        verification.validationSummary.totalUsers = poolMembers.length;

        let validCount = 0;
        let invalidCount = 0;
        let errorCount = 0;

        for (const member of poolMembers) {
            try {
                const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/1/submissions`;
                const picksDocRef = window.doc(window.db, picksPath, member.uid);
                const picksSnap = await window.getDoc(picksDocRef);

                const userName = member.displayName || member.email || `User-${member.uid.slice(-6)}`;

                if (picksSnap.exists() && picksSnap.data()) {
                    const picksData = picksSnap.data();
                    const gameIds = Object.keys(picksData);
                    const confidenceValues = gameIds.map(id => parseInt(picksData[id].confidence)).filter(c => !isNaN(c));

                    // Validation checks
                    const expectedGameCount = 16;
                    const expectedConfidenceValues = Array.from({length: expectedGameCount}, (_, i) => i + 1);
                    const sortedActual = [...confidenceValues].sort((a, b) => a - b);

                    const isValid = (
                        gameIds.length === expectedGameCount &&
                        confidenceValues.length === expectedGameCount &&
                        JSON.stringify(sortedActual) === JSON.stringify(expectedConfidenceValues)
                    );

                    if (isValid) {
                        validCount++;
                        console.log(`✅ ${userName}: VALID (${gameIds.length} games, confidence 1-16)`);
                    } else {
                        invalidCount++;
                        const issues = [];
                        if (gameIds.length !== expectedGameCount) {
                            issues.push(`Wrong game count: ${gameIds.length} vs ${expectedGameCount}`);
                        }
                        if (confidenceValues.length !== expectedGameCount) {
                            issues.push(`Wrong confidence count: ${confidenceValues.length} vs ${expectedGameCount}`);
                        }
                        const missing = expectedConfidenceValues.filter(val => !confidenceValues.includes(val));
                        if (missing.length > 0) {
                            issues.push(`Missing confidence: ${missing.join(', ')}`);
                        }
                        const duplicates = confidenceValues.filter((value, index) => confidenceValues.indexOf(value) !== index);
                        if (duplicates.length > 0) {
                            issues.push(`Duplicate confidence: ${[...new Set(duplicates)].join(', ')}`);
                        }
                        console.log(`❌ ${userName}: INVALID - ${issues.join('; ')}`);
                    }
                } else {
                    errorCount++;
                    console.log(`💥 ${userName}: NO PICKS DATA`);
                }
            } catch (userError) {
                errorCount++;
                console.error(`💥 Error checking ${member.displayName}:`, userError);
            }
        }

        verification.validationSummary.validUsers = validCount;
        verification.validationSummary.invalidUsers = invalidCount;
        verification.validationSummary.errorUsers = errorCount;
        verification.validationSummary.allUsersValid = (invalidCount === 0 && errorCount === 0);

        console.log('\n📊 VALIDATION SUMMARY:');
        console.log(`   ✅ Valid users: ${validCount}`);
        console.log(`   ❌ Invalid users: ${invalidCount}`);
        console.log(`   💥 Error users: ${errorCount}`);
        console.log(`   🎯 All users valid: ${verification.validationSummary.allUsersValid ? 'YES' : 'NO'}`);

        // STEP 2: Test Week 1 scoring system
        console.log('\n🔍 STEP 2: Testing Week 1 scoring system...');

        try {
            // Test Week 1 scoring
            console.log('⚡ Running Week 1 scoring test...');
            const scoringResult = await window.ScoringSystemManager.processWeekScoring(1, true);

            if (scoringResult && scoringResult.success) {
                console.log(`✅ Week 1 scoring SUCCESS: ${scoringResult.phase1_userScoring.usersProcessed} users processed`);
                verification.scoringTest = {
                    success: true,
                    usersProcessed: scoringResult.phase1_userScoring.usersProcessed,
                    details: scoringResult
                };
                verification.validationSummary.scoringWorking = true;
            } else {
                console.log(`❌ Week 1 scoring FAILED`);
                verification.scoringTest = {
                    success: false,
                    error: 'Scoring process returned unsuccessful result',
                    details: scoringResult
                };
            }
        } catch (scoringError) {
            console.error(`❌ Week 1 scoring ERROR:`, scoringError);
            verification.scoringTest = {
                success: false,
                error: scoringError.message,
                details: null
            };
        }

        // STEP 3: Overall verification result
        console.log('\n🎯 === PHASE 3 VERIFICATION RESULTS ===');

        const overallSuccess = verification.validationSummary.allUsersValid && verification.validationSummary.scoringWorking;

        console.log(`📊 User validation: ${verification.validationSummary.allUsersValid ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`⚙️ Scoring test: ${verification.validationSummary.scoringWorking ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`🏆 Overall Week 1 fix: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);

        if (overallSuccess) {
            console.log('\n🎉 WEEK 1 IS READY! Proceeding to Week 2 analysis...');
        } else {
            console.log('\n⚠️ WEEK 1 ISSUES DETECTED! Review and fix before proceeding to Week 2.');
        }

        // Store verification results globally
        window.phase3Verification = verification;
        console.log('\n📁 Full verification stored in window.phase3Verification');

        return verification;

    } catch (error) {
        console.error('💥 PHASE 3 VERIFICATION FAILED:', error);
        return null;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    console.log('✅ Phase 3 Week 1 Verification loaded');
    window.phase3Week1Verification = phase3Week1Verification;
}