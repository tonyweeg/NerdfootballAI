// 🔍 METADATA FIELD EXAMINATION
// Determine if these fields are critical system data or pollution

async function examineMetadataFields() {
    console.log('🔍 EXAMINING METADATA FIELDS - CRITICAL ANALYSIS...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";
    const suspiciousFields = ['poolId', 'survivorPick', 'userId', 'weekNumber', 'createdAt', 'lastUpdated'];

    const analysis = {
        usersWithMetadata: [],
        usersWithoutMetadata: [],
        metadataContent: {},
        dataStructureComparison: {}
    };

    try {
        // Get pool members
        const poolMembers = await window.ScoringSystemManager.getPoolMembers();
        console.log(`👥 Examining ${poolMembers.length} users for metadata fields`);

        for (const week of [1, 2]) {
            console.log(`\n📊 === WEEK ${week} METADATA EXAMINATION ===`);

            for (const member of poolMembers) {
                try {
                    const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
                    const picksDocRef = window.doc(window.db, picksPath, member.uid);
                    const picksSnap = await window.getDoc(picksDocRef);

                    const userName = member.displayName || member.email || `User-${member.uid.slice(-6)}`;

                    if (picksSnap.exists() && picksSnap.data()) {
                        const picksData = picksSnap.data();
                        const allKeys = Object.keys(picksData);

                        // Check which suspicious fields exist
                        const hasMetadata = suspiciousFields.some(field => picksData.hasOwnProperty(field));
                        const metadataFieldsFound = suspiciousFields.filter(field => picksData.hasOwnProperty(field));

                        if (hasMetadata) {
                            console.log(`📋 ${userName}: HAS METADATA (${allKeys.length} total fields)`);
                            console.log(`   Metadata fields: ${metadataFieldsFound.join(', ')}`);

                            // Examine the CONTENT of these fields
                            metadataFieldsFound.forEach(field => {
                                const value = picksData[field];
                                console.log(`   ${field}: ${JSON.stringify(value)} (${typeof value})`);

                                if (!analysis.metadataContent[field]) {
                                    analysis.metadataContent[field] = [];
                                }
                                analysis.metadataContent[field].push({
                                    user: userName,
                                    value: value,
                                    type: typeof value
                                });
                            });

                            analysis.usersWithMetadata.push({
                                uid: member.uid,
                                userName: userName,
                                week: week,
                                totalFields: allKeys.length,
                                metadataFields: metadataFieldsFound,
                                gameFields: allKeys.filter(key => !suspiciousFields.includes(key))
                            });
                        } else {
                            console.log(`✅ ${userName}: CLEAN DATA (${allKeys.length} total fields)`);
                            console.log(`   Fields: ${allKeys.join(', ')}`);

                            analysis.usersWithoutMetadata.push({
                                uid: member.uid,
                                userName: userName,
                                week: week,
                                totalFields: allKeys.length,
                                allFields: allKeys
                            });
                        }

                    } else {
                        console.log(`⏭️ ${userName}: No picks data for Week ${week}`);
                    }
                } catch (userError) {
                    console.error(`💥 Error examining ${member.displayName}:`, userError);
                }
            }
        }

        // ANALYSIS SUMMARY
        console.log('\n🎯 === METADATA ANALYSIS SUMMARY ===');

        console.log('\n📊 METADATA CONTENT ANALYSIS:');
        Object.entries(analysis.metadataContent).forEach(([field, instances]) => {
            console.log(`\n🔍 ${field.toUpperCase()}:`);
            console.log(`   Found in: ${instances.length} instances`);

            // Show unique values
            const uniqueValues = [...new Set(instances.map(i => JSON.stringify(i.value)))];
            console.log(`   Unique values: ${uniqueValues.join(', ')}`);

            // Analyze what this field contains
            if (field === 'poolId') {
                console.log(`   🎯 POOL ID ANALYSIS: Does this associate users with pools?`);
            } else if (field === 'survivorPick') {
                console.log(`   🏆 SURVIVOR PICK ANALYSIS: Does this store survivor selections?`);
            } else if (field === 'weekNumber') {
                console.log(`   📅 WEEK NUMBER ANALYSIS: Does this identify the week?`);
            } else if (field === 'userId') {
                console.log(`   👤 USER ID ANALYSIS: Does this identify the user?`);
            } else if (field === 'createdAt' || field === 'lastUpdated') {
                console.log(`   ⏰ TIMESTAMP ANALYSIS: Tracking creation/modification?`);
            }
        });

        console.log('\n🔍 DATA STRUCTURE COMPARISON:');
        console.log(`👥 Users WITH metadata: ${analysis.usersWithMetadata.length}`);
        console.log(`👥 Users WITHOUT metadata: ${analysis.usersWithoutMetadata.length}`);

        if (analysis.usersWithMetadata.length > 0) {
            console.log('\n📋 USERS WITH METADATA:');
            analysis.usersWithMetadata.forEach(user => {
                console.log(`   ${user.userName}: ${user.totalFields} fields (${user.gameFields.length} games + ${user.metadataFields.length} metadata)`);
            });
        }

        if (analysis.usersWithoutMetadata.length > 0) {
            console.log('\n✅ USERS WITHOUT METADATA (sample):');
            analysis.usersWithoutMetadata.slice(0, 3).forEach(user => {
                console.log(`   ${user.userName}: ${user.totalFields} fields - ${user.allFields.join(', ')}`);
            });
        }

        // CRITICAL QUESTIONS
        console.log('\n🚨 CRITICAL QUESTIONS TO ANSWER:');
        console.log('1. Is poolId used to associate users with pools?');
        console.log('2. Is survivorPick where we store survivor selections?');
        console.log('3. Does weekNumber matter for identifying the week?');
        console.log('4. Are users with metadata newer/older format?');
        console.log('5. Will removing these fields break any functionality?');

        window.metadataAnalysis = analysis;
        return analysis;

    } catch (error) {
        console.error('💥 METADATA EXAMINATION FAILED:', error);
        return null;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    console.log('🔍 Metadata Field Examination loaded');
    window.examineMetadataFields = examineMetadataFields;
}