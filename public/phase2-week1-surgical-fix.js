// 🏥 PHASE 2: SURGICAL WEEK 1 NORMALIZATION
// Precise removal of extra games while preserving all valid picks

async function phase2Week1SurgicalFix() {
    console.log('🏥 PHASE 2: SURGICAL WEEK 1 FIX STARTING...');

    if (!window.forensicAnalysis) {
        console.error('❌ FORENSIC ANALYSIS REQUIRED! Run phase1ForensicAnalysis() first!');
        return null;
    }

    const results = {
        usersProcessed: 0,
        usersFixed: 0,
        gamesRemoved: 0,
        errors: [],
        beforeAfter: []
    };

    try {
        const canonicalGames = window.forensicAnalysis.week1.canonical;
        console.log(`🎯 Target: Normalize all users to ${canonicalGames.length} canonical games: ${canonicalGames.join(', ')}`);

        // Get pool members
        const poolMembers = await window.ScoringSystemManager.getPoolMembers();

        // Process each user
        for (const member of poolMembers) {
            try {
                const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/1/submissions`;
                const picksDocRef = window.doc(window.db, picksPath, member.uid);
                const picksSnap = await window.getDoc(picksDocRef);

                const userName = member.displayName || member.email || `User-${member.uid.slice(-6)}`;

                if (picksSnap.exists() && picksSnap.data()) {
                    const originalPicks = picksSnap.data();
                    const originalGameIds = Object.keys(originalPicks);

                    // Create cleaned picks - keep only canonical games
                    const cleanedPicks = {};
                    let gamesRemovedCount = 0;
                    let gamesKeptCount = 0;

                    canonicalGames.forEach(gameId => {
                        if (originalPicks[gameId]) {
                            cleanedPicks[gameId] = originalPicks[gameId];
                            gamesKeptCount++;
                        }
                    });

                    gamesRemovedCount = originalGameIds.length - gamesKeptCount;

                    // Record before/after
                    const beforeAfter = {
                        userId: member.uid,
                        userName: userName,
                        before: {
                            gameCount: originalGameIds.length,
                            gameIds: originalGameIds.sort(),
                            confidenceValues: originalGameIds.map(id => parseInt(originalPicks[id].confidence)).filter(c => !isNaN(c)).sort((a,b) => a-b)
                        },
                        after: {
                            gameCount: Object.keys(cleanedPicks).length,
                            gameIds: Object.keys(cleanedPicks).sort(),
                            confidenceValues: Object.keys(cleanedPicks).map(id => parseInt(cleanedPicks[id].confidence)).filter(c => !isNaN(c)).sort((a,b) => a-b)
                        },
                        gamesRemoved: gamesRemovedCount,
                        action: gamesRemovedCount > 0 ? 'FIXED' : 'NO_CHANGE'
                    };

                    results.beforeAfter.push(beforeAfter);

                    if (gamesRemovedCount > 0) {
                        // Save cleaned picks
                        await window.setDoc(picksDocRef, cleanedPicks);

                        console.log(`🏥 FIXED ${userName}: ${originalGameIds.length} → ${Object.keys(cleanedPicks).length} games (${gamesRemovedCount} removed)`);
                        console.log(`   Removed games: ${originalGameIds.filter(id => !canonicalGames.includes(id)).join(', ')}`);
                        console.log(`   Confidence values: ${beforeAfter.before.confidenceValues.join(', ')} → ${beforeAfter.after.confidenceValues.join(', ')}`);

                        results.usersFixed++;
                        results.gamesRemoved += gamesRemovedCount;
                    } else {
                        console.log(`✅ NO CHANGE ${userName}: Already has correct ${Object.keys(cleanedPicks).length} games`);
                    }

                    results.usersProcessed++;

                } else {
                    console.log(`⏭️ SKIPPED ${userName}: No picks data`);
                }

            } catch (userError) {
                console.error(`💥 ERROR ${member.displayName}:`, userError);
                results.errors.push({
                    userId: member.uid,
                    userName: member.displayName || 'Unknown',
                    error: userError.message
                });
            }
        }

        console.log('\n🎉 === PHASE 2 SURGICAL FIX COMPLETE ===');
        console.log(`👥 Users processed: ${results.usersProcessed}`);
        console.log(`🏥 Users fixed: ${results.usersFixed}`);
        console.log(`🗑️ Games removed: ${results.gamesRemoved}`);
        console.log(`💥 Errors: ${results.errors.length}`);

        if (results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            results.errors.forEach(error => {
                console.log(`   ${error.userName}: ${error.error}`);
            });
        }

        // Store results globally
        window.phase2Results = results;
        console.log('\n📁 Full results stored in window.phase2Results');

        return results;

    } catch (error) {
        console.error('💥 PHASE 2 SURGICAL FIX FAILED:', error);
        return null;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    console.log('🏥 Phase 2 Surgical Week 1 Fix loaded');
    window.phase2Week1SurgicalFix = phase2Week1SurgicalFix;
}