const puppeteer = require('puppeteer');

async function runSurgicalExtraction() {
    console.log('🔥 AUTOMATED SURGICAL EXTRACTION STARTING...');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    try {
        const page = await browser.newPage();

        // Listen for console output from the page
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('🔥') || text.includes('👻') || text.includes('🧹') || text.includes('✅') || text.includes('💥')) {
                console.log(`BROWSER: ${text}`);
            }
        });

        // Navigate to the application
        console.log('📱 Navigating to application...');
        await page.goto('http://localhost:5005', { waitUntil: 'networkidle0' });

        // Wait for Firebase to initialize
        console.log('⏳ Waiting for Firebase initialization...');
        await page.waitForFunction(() => window.auth && window.db, { timeout: 10000 });

        console.log('🔧 Loading surgical extraction scripts...');

        // Load Phase 1 script
        await page.addScriptTag({ path: './public/phase1-forensic-analysis.js' });
        await page.waitForFunction(() => window.phase1ForensicAnalysis, { timeout: 5000 });

        // Load Phase 2 script
        await page.addScriptTag({ path: './public/phase2-surgical-extraction.js' });
        await page.waitForFunction(() => window.phase2SurgicalExtraction, { timeout: 5000 });

        console.log('✅ Scripts loaded. Executing Phase 1 forensic analysis...');

        // Execute Phase 1
        const phase1Results = await page.evaluate(async () => {
            return await window.phase1ForensicAnalysis();
        });

        if (!phase1Results) {
            throw new Error('Phase 1 forensic analysis failed');
        }

        console.log('✅ Phase 1 complete. Executing Phase 2 surgical extraction...');

        // Execute Phase 2
        const phase2Results = await page.evaluate(async () => {
            return await window.phase2SurgicalExtraction();
        });

        if (!phase2Results) {
            throw new Error('Phase 2 surgical extraction failed');
        }

        console.log('🎉 SURGICAL EXTRACTION COMPLETE!');
        console.log('📊 FINAL RESULTS:');
        console.log(`   👻 Ghost users eliminated: ${phase2Results.summary.totalGhostRemovals}`);
        console.log(`   🧹 Pool members cleaned: ${phase2Results.summary.totalPoolMembersFixes}`);
        console.log(`   📦 Metadata extractions: ${phase2Results.summary.totalMetadataExtractions}`);
        console.log(`   💥 Errors: ${phase2Results.summary.errors.length}`);

        if (phase2Results.summary.errors.length > 0) {
            console.log('⚠️ ERRORS:');
            phase2Results.summary.errors.forEach(error => {
                console.log(`   ${error.userName}: ${error.error}`);
            });
        }

        // Log detailed results
        console.log('\n📋 DETAILED RESULTS:');
        for (const week of [1, 2]) {
            console.log(`\n--- WEEK ${week} ---`);
            console.log(`👻 Ghosts removed: ${phase2Results.ghostUsersRemoved[`week${week}`].length}`);
            console.log(`🔧 Pool members fixed: ${phase2Results.poolMembersFixed[`week${week}`].length}`);

            if (phase2Results.ghostUsersRemoved[`week${week}`].length > 0) {
                const ghostUIDs = phase2Results.ghostUsersRemoved[`week${week}`].map(g => g.userId.slice(-6));
                console.log(`   Ghost UIDs: ${ghostUIDs.join(', ')}`);
            }

            if (phase2Results.poolMembersFixed[`week${week}`].length > 0) {
                const fixedUsers = phase2Results.poolMembersFixed[`week${week}`].map(f => f.userName);
                console.log(`   Fixed users: ${fixedUsers.join(', ')}`);
            }
        }

        // Keep browser open for verification
        console.log('\n🎯 Surgical extraction complete. Browser kept open for manual verification.');
        console.log('🔍 You can check the results in the browser console.');
        console.log('⚠️ Close this terminal or press Ctrl+C when ready to close browser.');

        return phase2Results;

    } catch (error) {
        console.error('💥 AUTOMATED SURGICAL EXTRACTION FAILED:', error);
        console.log('⚠️ Browser will remain open for manual debugging.');

        // Don't close browser on error for debugging
        return null;
    }
}

// Execute if run directly
if (require.main === module) {
    runSurgicalExtraction().catch(console.error);
}

module.exports = { runSurgicalExtraction };