// Comprehensive Survivor Verification Runner
// Executes the batch verification system to find ALL incorrectly eliminated users

async function runSurvivorVerification() {
    console.log('🚨 STARTING COMPREHENSIVE SURVIVOR VERIFICATION');
    console.log('='.repeat(80));

    try {
        // Ensure all dependencies are loaded
        if (!window.batchSurvivorVerification) {
            console.error('❌ BatchSurvivorVerification not loaded');
            return;
        }

        if (!window.db) {
            console.error('❌ Firebase DB not available');
            return;
        }

        // Wait for ESPN API to be ready
        if (window.espnNerdApi) {
            await window.espnNerdApi.ensureReady();
            console.log('✅ ESPN API ready');
        }

        // Run the complete analysis
        console.log('🔍 Running complete analysis...');
        const results = await window.batchSurvivorVerification.runCompleteAnalysis();

        if (results.success) {
            console.log('\n✅ ANALYSIS COMPLETE');
            console.log('📊 SUMMARY:');
            console.log(`  Bug Patterns Found: ${results.bugPatterns.length}`);
            console.log(`  Affected Users Found: ${results.affectedUsers.length}`);
            console.log(`  Verified Users: ${results.verificationResults.verified?.length || 0}`);

            // Log all affected users
            if (results.affectedUsers.length > 0) {
                console.log('\n🚨 AFFECTED USERS:');
                results.affectedUsers.forEach((user, index) => {
                    console.log(`${index + 1}. ${user.displayName} (${user.uid})`);
                    console.log(`   Pattern: ${user.bugPattern.type}`);
                    console.log(`   Details: ${JSON.stringify(user.bugDetails)}`);
                    console.log('');
                });
            }

            // Show verification results
            if (results.verificationResults.verified?.length > 0) {
                console.log('\n✅ VERIFIED INCORRECTLY ELIMINATED USERS:');
                results.verificationResults.verified.forEach((user, index) => {
                    console.log(`${index + 1}. ${user.displayName} (${user.uid})`);
                    console.log(`   Pattern: ${user.pattern}`);
                    console.log(`   Should be: ALIVE`);
                    console.log('');
                });
            }

            return results;

        } else {
            console.error('❌ Analysis failed:', results.error);
            return null;
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
        return null;
    }
}

// Export for use
window.runSurvivorVerification = runSurvivorVerification;

// Auto-run if requested
if (window.location.search.includes('auto-verify')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(runSurvivorVerification, 2000);
    });
}

console.log('✅ Survivor Verification Runner loaded');
console.log('📋 Run: runSurvivorVerification()');