// 🔥 PHASE 2: SURGICAL METADATA EXTRACTION & GHOST USER ELIMINATION
// Precision surgery to clean contaminated picks and eliminate ghost users

async function phase2SurgicalExtraction() {
    console.log('🔥 PHASE 2: SURGICAL METADATA EXTRACTION STARTING...');

    if (!window.forensicAnalysis) {
        console.error('❌ FORENSIC ANALYSIS REQUIRED! Run phase1ForensicAnalysis() first!');
        return null;
    }

    const results = {
        timestamp: new Date().toISOString(),
        metadataExtracted: {
            week1: [],
            week2: []
        },
        ghostUsersRemoved: {
            week1: [],
            week2: []
        },
        poolMembersFixed: {
            week1: [],
            week2: []
        },
        summary: {
            totalMetadataExtractions: 0,
            totalGhostRemovals: 0,
            totalPoolMembersFixes: 0,
            errors: []
        }
    };

    // GHOST USERS TO ELIMINATE
    const GHOST_USERS = ['MUIAH2', 'ZizY32', 'DORe33']; // Partial UIDs for identification

    // METADATA FIELDS TO EXTRACT
    const METADATA_FIELDS = ['poolId', 'survivorPick', 'userId', 'weekNumber', 'createdAt', 'lastUpdated'];

    try {
        // Get pool members for validation
        const poolMembers = await window.ScoringSystemManager.getPoolMembers();
        const poolMemberUIDs = poolMembers.map(member => member.uid);

        console.log(`🎯 Target: Extract metadata from contaminated pool members, eliminate ghost users`);
        console.log(`👻 Ghost users to eliminate: ${GHOST_USERS.join(', ')}`);
        console.log(`🧹 Metadata fields to extract: ${METADATA_FIELDS.join(', ')}`);

        // PROCESS EACH WEEK
        for (const week of [1, 2]) {
            console.log(`\n🔥 === WEEK ${week} SURGICAL EXTRACTION ===`);

            const picksCollectionPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
            const picksCollectionRef = window.collection(window.db, picksCollectionPath);
            const allPicksSnap = await window.getDocs(picksCollectionRef);

            console.log(`📁 Processing ${allPicksSnap.size} documents in Week ${week}`);

            for (const doc of allPicksSnap.docs) {
                const userId = doc.id;
                const picksData = doc.data();
                const userName = getUserName(userId, poolMembers);

                try {
                    // STEP 1: CHECK IF GHOST USER
                    const isGhostUser = GHOST_USERS.some(ghostUID => userId.includes(ghostUID));

                    if (isGhostUser) {
                        console.log(`👻 GHOST USER DETECTED: ${userName} (${userId.slice(-6)})`);
                        console.log(`   Fields: ${Object.keys(picksData).length} total`);
                        console.log(`   Eliminating completely...`);

                        // DELETE GHOST USER DOCUMENT
                        await window.deleteDoc(doc.ref);

                        results.ghostUsersRemoved[`week${week}`].push({
                            userId: userId,
                            userName: userName,
                            fieldsRemoved: Object.keys(picksData).length,
                            originalData: picksData
                        });

                        results.summary.totalGhostRemovals++;
                        console.log(`   ✅ GHOST ELIMINATED: ${userName}`);
                        continue;
                    }

                    // STEP 2: CHECK IF POOL MEMBER WITH METADATA CONTAMINATION
                    const isPoolMember = poolMemberUIDs.includes(userId);
                    if (!isPoolMember) {
                        console.log(`⚠️ NON-POOL USER: ${userName} (${userId.slice(-6)}) - Skipping`);
                        continue;
                    }

                    // Check for metadata contamination
                    const hasMetadata = METADATA_FIELDS.some(field => picksData.hasOwnProperty(field));

                    if (hasMetadata) {
                        console.log(`🔧 CONTAMINATED POOL MEMBER: ${userName}`);
                        console.log(`   Original fields: ${Object.keys(picksData).length}`);

                        // EXTRACT METADATA
                        const extractedMetadata = {};
                        const cleanedPicks = {};

                        Object.entries(picksData).forEach(([key, value]) => {
                            if (METADATA_FIELDS.includes(key)) {
                                extractedMetadata[key] = value;
                                console.log(`   📤 Extracted ${key}: ${JSON.stringify(value)}`);
                            } else {
                                cleanedPicks[key] = value;
                            }
                        });

                        console.log(`   Clean game fields: ${Object.keys(cleanedPicks).length}`);
                        console.log(`   Metadata extracted: ${Object.keys(extractedMetadata).length}`);

                        // SAVE EXTRACTED METADATA (for potential restoration)
                        const metadataRecord = {
                            userId: userId,
                            userName: userName,
                            week: week,
                            extractedAt: new Date().toISOString(),
                            metadata: extractedMetadata,
                            originalFieldCount: Object.keys(picksData).length,
                            cleanedFieldCount: Object.keys(cleanedPicks).length
                        };

                        results.metadataExtracted[`week${week}`].push(metadataRecord);

                        // SPECIAL HANDLING FOR SURVIVOR PICK
                        if (extractedMetadata.survivorPick) {
                            console.log(`   🏆 SURVIVOR PICK PRESERVED: ${extractedMetadata.survivorPick}`);
                            // TODO: Save to proper survivor picks collection if needed
                        }

                        // UPDATE DOCUMENT WITH CLEANED DATA
                        await window.setDoc(doc.ref, cleanedPicks);

                        results.poolMembersFixed[`week${week}`].push({
                            userId: userId,
                            userName: userName,
                            beforeFields: Object.keys(picksData).length,
                            afterFields: Object.keys(cleanedPicks).length,
                            metadataRemoved: Object.keys(extractedMetadata).length
                        });

                        results.summary.totalMetadataExtractions++;
                        results.summary.totalPoolMembersFixes++;

                        console.log(`   ✅ CLEANED: ${userName} (${Object.keys(picksData).length} → ${Object.keys(cleanedPicks).length} fields)`);

                    } else {
                        console.log(`✅ CLEAN: ${userName} (${Object.keys(picksData).length} fields)`);
                    }

                } catch (userError) {
                    console.error(`💥 ERROR processing ${userName}:`, userError);
                    results.summary.errors.push({
                        userId: userId,
                        userName: userName,
                        week: week,
                        error: userError.message
                    });
                }
            }
        }

        // FINAL SUMMARY
        console.log('\n🎉 === PHASE 2 SURGICAL EXTRACTION COMPLETE ===');
        console.log(`👻 Ghost users eliminated: ${results.summary.totalGhostRemovals}`);
        console.log(`🧹 Pool members with metadata extracted: ${results.summary.totalPoolMembersFixes}`);
        console.log(`📦 Total metadata extractions: ${results.summary.totalMetadataExtractions}`);
        console.log(`💥 Errors: ${results.summary.errors.length}`);

        if (results.summary.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            results.summary.errors.forEach(error => {
                console.log(`   ${error.userName}: ${error.error}`);
            });
        }

        console.log('\n📊 DETAILED RESULTS:');
        for (const week of [1, 2]) {
            console.log(`\n--- WEEK ${week} ---`);
            console.log(`👻 Ghosts removed: ${results.ghostUsersRemoved[`week${week}`].length}`);
            console.log(`🔧 Pool members fixed: ${results.poolMembersFixed[`week${week}`].length}`);

            if (results.ghostUsersRemoved[`week${week}`].length > 0) {
                console.log(`   Ghost UIDs: ${results.ghostUsersRemoved[`week${week}`].map(g => g.userId.slice(-6)).join(', ')}`);
            }

            if (results.poolMembersFixed[`week${week}`].length > 0) {
                console.log(`   Fixed users: ${results.poolMembersFixed[`week${week}`].map(f => f.userName).join(', ')}`);
            }
        }

        // Store results globally
        window.phase2Results = results;
        console.log('\n📁 Full results stored in window.phase2Results');

        console.log('\n🎯 READY FOR PHASE 3: VERIFICATION!');
        return results;

    } catch (error) {
        console.error('💥 PHASE 2 SURGICAL EXTRACTION FAILED:', error);
        return null;
    }
}

function getUserName(userId, poolMembers) {
    const member = poolMembers.find(m => m.uid === userId);
    if (member) {
        return member.displayName || member.email || `Pool-${userId.slice(-6)}`;
    }
    return `Ghost-${userId.slice(-6)}`;
}

// Auto-setup
if (typeof window !== 'undefined') {
    console.log('🔥 Phase 2 Surgical Extraction loaded');
    console.log('🎯 This will extract metadata from contaminated picks and eliminate ghost users');
    console.log('👻 Ghost targets: MUIAH2, ZizY32, DORe33');
    console.log('🧹 Metadata targets: poolId, survivorPick, userId, weekNumber, createdAt, lastUpdated');
    window.phase2SurgicalExtraction = phase2SurgicalExtraction;
}