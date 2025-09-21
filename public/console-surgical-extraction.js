// 🔥 COPY AND PASTE THIS INTO BROWSER CONSOLE
// Surgical extraction execution script

(async function surgicalExtractionConsole() {
    console.log('🔥 STARTING SURGICAL EXTRACTION FROM CONSOLE...');

    try {
        // Load scripts if not already loaded
        if (!window.phase1ForensicAnalysis) {
            console.log('📥 Loading Phase 1 script...');
            const script1 = document.createElement('script');
            script1.src = './phase1-forensic-analysis.js';
            document.head.appendChild(script1);
            await new Promise(resolve => script1.onload = resolve);
        }

        if (!window.phase2SurgicalExtraction) {
            console.log('📥 Loading Phase 2 script...');
            const script2 = document.createElement('script');
            script2.src = './phase2-surgical-extraction.js';
            document.head.appendChild(script2);
            await new Promise(resolve => script2.onload = resolve);
        }

        console.log('✅ Scripts loaded. Starting Phase 1 Forensic Analysis...');

        // Execute Phase 1
        const phase1Results = await window.phase1ForensicAnalysis();
        if (!phase1Results) {
            console.error('💥 Phase 1 failed!');
            return false;
        }

        console.log('✅ Phase 1 complete. Starting Phase 2 Surgical Extraction...');

        // Execute Phase 2
        const phase2Results = await window.phase2SurgicalExtraction();
        if (!phase2Results) {
            console.error('💥 Phase 2 failed!');
            return false;
        }

        console.log('🎉 SURGICAL EXTRACTION COMPLETE!');
        console.log('📊 FINAL SUMMARY:');
        console.log(`   👻 Ghost users eliminated: ${phase2Results.summary.totalGhostRemovals}`);
        console.log(`   🧹 Pool members cleaned: ${phase2Results.summary.totalPoolMembersFixes}`);
        console.log(`   📦 Metadata extractions: ${phase2Results.summary.totalMetadataExtractions}`);
        console.log(`   💥 Errors: ${phase2Results.summary.errors.length}`);

        // Show metadata that was preserved
        console.log('\n🔧 METADATA PRESERVATION SUMMARY:');
        for (const week of [1, 2]) {
            const extracted = phase2Results.metadataExtracted[`week${week}`];
            if (extracted.length > 0) {
                console.log(`\nWeek ${week} - Metadata preserved for ${extracted.length} users:`);
                extracted.forEach(record => {
                    console.log(`   ${record.userName}: ${Object.keys(record.metadata).join(', ')}`);
                    if (record.metadata.survivorPick) {
                        console.log(`      🏆 Survivor pick: ${record.metadata.survivorPick}`);
                    }
                });
            }
        }

        if (phase2Results.summary.errors.length > 0) {
            console.log('\n⚠️ ERRORS OCCURRED:');
            phase2Results.summary.errors.forEach(error => {
                console.log(`   ${error.userName}: ${error.error}`);
            });
        }

        console.log('\n🎯 READY FOR PHASE 3 VERIFICATION!');
        return phase2Results;

    } catch (error) {
        console.error('💥 CONSOLE SURGICAL EXTRACTION FAILED:', error);
        return false;
    }
})();