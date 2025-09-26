// 🔥 SURGICAL EXTRACTION EXECUTOR
// Automated execution of Phase 1 + Phase 2

async function executeSurgicalExtraction() {
    console.log('🔥 STARTING SURGICAL EXTRACTION SEQUENCE...');

    try {
        // Load required scripts
        if (!window.phase1ForensicAnalysis) {
            await import('./phase1-forensic-analysis.js');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!window.phase2SurgicalExtraction) {
            await import('./phase2-surgical-extraction.js');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('📋 Scripts loaded. Starting Phase 1...');

        // Execute Phase 1: Forensic Analysis
        const phase1Results = await window.phase1ForensicAnalysis();
        if (!phase1Results) {
            console.error('💥 Phase 1 failed!');
            return false;
        }

        console.log('✅ Phase 1 complete. Starting Phase 2...');

        // Execute Phase 2: Surgical Extraction
        const phase2Results = await window.phase2SurgicalExtraction();
        if (!phase2Results) {
            console.error('💥 Phase 2 failed!');
            return false;
        }

        console.log('🎉 SURGICAL EXTRACTION COMPLETE!');
        console.log('📊 Summary:');
        console.log(`   👻 Ghost users removed: ${phase2Results.summary.totalGhostRemovals}`);
        console.log(`   🧹 Pool members cleaned: ${phase2Results.summary.totalPoolMembersFixes}`);
        console.log(`   📦 Metadata extractions: ${phase2Results.summary.totalMetadataExtractions}`);
        console.log(`   💥 Errors: ${phase2Results.summary.errors.length}`);

        if (phase2Results.summary.errors.length > 0) {
            console.log('⚠️ ERRORS OCCURRED:');
            phase2Results.summary.errors.forEach(error => {
                console.log(`   ${error.userName}: ${error.error}`);
            });
        }

        return phase2Results;

    } catch (error) {
        console.error('💥 SURGICAL EXTRACTION FAILED:', error);
        return false;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    console.log('🔥 Surgical Extraction Executor loaded');
    console.log('🎯 Run: executeSurgicalExtraction()');
    window.executeSurgicalExtraction = executeSurgicalExtraction;
}