// 🚨 DEBUG USER COUNT DISCREPANCY
// Why are we seeing 90 users when pool has 52?

async function debugUserCount() {
    console.log('🚨 DEBUGGING USER COUNT DISCREPANCY...');

    try {
        // STEP 1: Count pool members
        const poolMembers = await window.ScoringSystemManager.getPoolMembers();
        console.log(`👥 Pool members: ${poolMembers.length}`);

        // STEP 2: Count actual picks documents for each week
        for (const week of [1, 2]) {
            console.log(`\n📊 === WEEK ${week} DOCUMENT COUNT ===`);

            const picksCollectionPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
            const picksCollectionRef = window.collection(window.db, picksCollectionPath);
            const allPicksSnap = await window.getDocs(picksCollectionRef);

            console.log(`📁 Total documents in Week ${week} collection: ${allPicksSnap.size}`);

            let poolMemberDocs = 0;
            let nonPoolMemberDocs = 0;
            const nonPoolMembers = [];

            allPicksSnap.docs.forEach(doc => {
                const docUserId = doc.id;
                const isPoolMember = poolMembers.some(member => member.uid === docUserId);

                if (isPoolMember) {
                    poolMemberDocs++;
                } else {
                    nonPoolMemberDocs++;
                    nonPoolMembers.push(docUserId);
                }
            });

            console.log(`✅ Documents from pool members: ${poolMemberDocs}`);
            console.log(`❌ Documents from NON-pool members: ${nonPoolMemberDocs}`);

            if (nonPoolMembers.length > 0) {
                console.log(`🔍 Non-pool member UIDs (first 10):`, nonPoolMembers.slice(0, 10));

                // Try to identify these mystery users
                for (const mysteryUID of nonPoolMembers.slice(0, 5)) {
                    try {
                        const picksDocRef = window.doc(window.db, picksCollectionPath, mysteryUID);
                        const picksSnap = await window.getDoc(picksDocRef);

                        if (picksSnap.exists()) {
                            const data = picksSnap.data();
                            const keys = Object.keys(data);
                            console.log(`🕵️ Mystery user ${mysteryUID.slice(-6)}: ${keys.length} fields`);

                            // Look for identifying info
                            if (data.userId) {
                                console.log(`   User ID in data: ${data.userId}`);
                            }
                            if (data.poolId) {
                                console.log(`   Pool ID in data: ${data.poolId}`);
                            }
                            if (data.email) {
                                console.log(`   Email in data: ${data.email}`);
                            }
                        }
                    } catch (error) {
                        console.log(`   Error examining ${mysteryUID}: ${error.message}`);
                    }
                }
            }
        }

        // STEP 3: Check for data structure explanation
        console.log(`\n🔍 === ANALYSIS ===`);
        console.log(`Expected: 52 pool members × 2 weeks = 104 documents max`);
        console.log(`Found: 90+ documents total`);
        console.log(`Possible explanations:`);
        console.log(`1. Old/deleted users with leftover data`);
        console.log(`2. Test accounts or admin accounts`);
        console.log(`3. Users removed from pool but data remains`);
        console.log(`4. Duplicate documents or data corruption`);

    } catch (error) {
        console.error('💥 DEBUG USER COUNT FAILED:', error);
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    console.log('🚨 Debug User Count loaded');
    window.debugUserCount = debugUserCount;
}