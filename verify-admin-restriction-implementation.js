const fs = require('fs');
const path = require('path');

/**
 * 🔒 VERIFY ADMIN RESTRICTION IMPLEMENTATION
 * Analyzes code files to ensure admin restrictions are properly implemented
 */

class AdminRestrictionVerifier {
    constructor() {
        this.results = {
            frontendChecks: [],
            backendChecks: [],
            errors: []
        };
    }

    verifyFrontendImplementation() {
        console.log('🔧 Verifying Frontend Implementation...');

        const liveGameModalPath = '/Users/tonyweeg/nerdfootball-project/public/liveGameModal.js';

        try {
            const content = fs.readFileSync(liveGameModalPath, 'utf8');

            // Check 1: Admin UIDs defined
            const hasAdminUids = content.includes('const ADMIN_UIDS = ["WxSPmEildJdqs6T5hIpBUZrscwt2", "BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2"]');
            this.results.frontendChecks.push({
                test: 'Admin UIDs Defined',
                passed: hasAdminUids,
                details: hasAdminUids ? 'Admin UIDs properly defined' : 'Admin UIDs not found'
            });

            // Check 2: Admin check function exists
            const hasAdminCheckFunction = content.includes('function isCurrentUserAdmin()') &&
                                        content.includes('ADMIN_UIDS.includes(currentUserId)');
            this.results.frontendChecks.push({
                test: 'Admin Check Function',
                passed: hasAdminCheckFunction,
                details: hasAdminCheckFunction ? 'isCurrentUserAdmin() function implemented' : 'Admin check function missing'
            });

            // Check 3: Admin validation in addGameClickHandler
            const hasAdminValidation = content.includes('if (!isCurrentUserAdmin())') &&
                                     content.includes('console.log(\'🔒 Live game modal restricted to admin users only\');');
            this.results.frontendChecks.push({
                test: 'Click Handler Admin Validation',
                passed: hasAdminValidation,
                details: hasAdminValidation ? 'addGameClickHandler properly checks admin status' : 'Admin validation missing in click handler'
            });

            // Check 4: Admin-only visual indicators
            const hasAdminVisuals = content.includes('🔧 Admin: Click to view live game details') &&
                                  content.includes('(Admin user)');
            this.results.frontendChecks.push({
                test: 'Admin Visual Indicators',
                passed: hasAdminVisuals,
                details: hasAdminVisuals ? 'Admin-specific UI elements added' : 'Admin visual indicators missing'
            });

            console.log('✅ Frontend verification completed');

        } catch (error) {
            this.results.errors.push(`Frontend verification error: ${error.message}`);
            console.error('❌ Frontend verification failed:', error);
        }
    }

    verifyBackendImplementation() {
        console.log('🔒 Verifying Backend Implementation...');

        const espnApiPath = '/Users/tonyweeg/nerdfootball-project/functions/espnNerdApi.js';

        try {
            const content = fs.readFileSync(espnApiPath, 'utf8');

            // Check 1: Authentication requirement
            const hasAuthCheck = content.includes('if (!context.auth)') &&
                                content.includes('Authentication required for live game details');
            this.results.backendChecks.push({
                test: 'Authentication Required',
                passed: hasAuthCheck,
                details: hasAuthCheck ? 'Firebase Auth context validation implemented' : 'Authentication check missing'
            });

            // Check 2: Admin UIDs defined in backend
            const hasBackendAdminUids = content.includes('const ADMIN_UIDS = ["WxSPmEildJdqs6T5hIpBUZrscwt2", "BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2"]');
            this.results.backendChecks.push({
                test: 'Backend Admin UIDs',
                passed: hasBackendAdminUids,
                details: hasBackendAdminUids ? 'Admin UIDs defined in Firebase Function' : 'Backend admin UIDs missing'
            });

            // Check 3: Admin validation
            const hasAdminValidation = content.includes('if (!ADMIN_UIDS.includes(userId))') &&
                                     content.includes('Live game details are restricted to admin users only');
            this.results.backendChecks.push({
                test: 'Backend Admin Validation',
                passed: hasAdminValidation,
                details: hasAdminValidation ? 'Admin UID validation implemented' : 'Admin validation missing in backend'
            });

            // Check 4: Admin logging
            const hasAdminLogging = content.includes('Admin access granted for user:') &&
                                  content.includes('Access denied: User') &&
                                  content.includes('is not an admin');
            this.results.backendChecks.push({
                test: 'Admin Access Logging',
                passed: hasAdminLogging,
                details: hasAdminLogging ? 'Proper admin access logging implemented' : 'Admin logging missing'
            });

            // Check 5: Function header updated
            const hasFunctionHeader = content.includes('ADMIN ONLY') &&
                                    content.includes('For DOPE Game Modal System (ADMIN ONLY)');
            this.results.backendChecks.push({
                test: 'Function Documentation Updated',
                passed: hasFunctionHeader,
                details: hasFunctionHeader ? 'Function header indicates admin restriction' : 'Function documentation not updated'
            });

            console.log('✅ Backend verification completed');

        } catch (error) {
            this.results.errors.push(`Backend verification error: ${error.message}`);
            console.error('❌ Backend verification failed:', error);
        }
    }

    checkDeploymentReadiness() {
        console.log('\n🚀 Checking Deployment Readiness...');

        const allChecks = [...this.results.frontendChecks, ...this.results.backendChecks];
        const totalChecks = allChecks.length;
        const passedChecks = allChecks.filter(check => check.passed).length;
        const hasErrors = this.results.errors.length > 0;

        const deploymentReady = passedChecks === totalChecks && !hasErrors;

        console.log(`📊 Implementation Status: ${passedChecks}/${totalChecks} checks passed`);

        if (deploymentReady) {
            console.log('✅ DEPLOYMENT READY: Admin restrictions properly implemented');
            console.log('🎯 Safe to deploy to production');
        } else {
            console.log('⚠️ DEPLOYMENT NOT READY: Issues found that need resolution');
            console.log('🔧 Fix the issues above before deploying');
        }

        return {
            ready: deploymentReady,
            score: passedChecks / totalChecks,
            summary: {
                total: totalChecks,
                passed: passedChecks,
                failed: totalChecks - passedChecks,
                errors: this.results.errors.length
            }
        };
    }

    generateReport() {
        console.log('\n📋 IMPLEMENTATION VERIFICATION REPORT');
        console.log('='.repeat(50));

        console.log('\n🔧 FRONTEND IMPLEMENTATION:');
        this.results.frontendChecks.forEach((check, index) => {
            const status = check.passed ? '✅' : '❌';
            console.log(`  ${index + 1}. ${status} ${check.test}`);
            console.log(`     ${check.details}`);
        });

        console.log('\n🔒 BACKEND IMPLEMENTATION:');
        this.results.backendChecks.forEach((check, index) => {
            const status = check.passed ? '✅' : '❌';
            console.log(`  ${index + 1}. ${status} ${check.test}`);
            console.log(`     ${check.details}`);
        });

        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        const readinessCheck = this.checkDeploymentReadiness();

        console.log('\n🎯 RECOMMENDED ACTIONS:');
        if (readinessCheck.ready) {
            console.log('  1. ✅ Deploy functions: firebase deploy --only functions');
            console.log('  2. ✅ Deploy hosting: firebase deploy --only hosting');
            console.log('  3. ✅ Test with actual admin users in production');
            console.log('  4. ✅ Verify non-admin users cannot access modal');
        } else {
            console.log('  1. 🔧 Fix failed implementation checks above');
            console.log('  2. 🧪 Re-run this verification script');
            console.log('  3. 🚀 Deploy only after all checks pass');
        }

        return readinessCheck;
    }

    run() {
        console.log('🔒 Starting Admin Restriction Implementation Verification...\n');

        this.verifyFrontendImplementation();
        this.verifyBackendImplementation();

        return this.generateReport();
    }
}

// Run verification if called directly
if (require.main === module) {
    const verifier = new AdminRestrictionVerifier();
    const result = verifier.run();

    process.exit(result.ready ? 0 : 1);
}

module.exports = AdminRestrictionVerifier;