// 🔍 FIND AND FIX TONY'S SCORING DATA LOCATION
// The scoring data exists but UI can't find it - need to locate and move it

async function findAndFixScoringData() {
    console.log('🔍 FINDING TONY\'S SCORING DATA...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";
    const expectedPath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${TONY_UID}`;

    try {
        // 1. Check where the UI expects to find scoring data
        console.log('📍 Checking expected scoring path...');
        const expectedRef = window.doc(window.db, expectedPath);
        const expectedSnap = await window.getDoc(expectedRef);

        if (expectedSnap.exists()) {
            console.log('✅ SCORING DATA FOUND at expected path!');
            const data = expectedSnap.data();
            console.log('📊 Data:', {
                totalPoints: data.totalPoints,
                weeksPlayed: data.seasonStats?.weeksPlayed,
                weeklyPoints: Object.keys(data.weeklyPoints || {})
            });
            return true;
        } else {
            console.log('❌ SCORING DATA NOT FOUND at expected path');
        }

        // 2. Search for Tony's scoring data in various possible locations
        const possiblePaths = [
            `artifacts/nerdfootball/pools/nerduniverse-2025/users/${TONY_UID}`,
            `artifacts/nerdfootball/scoring-users/${TONY_UID}`,
            `artifacts/nerdfootball/public/data/scoring/${TONY_UID}`,
            `artifacts/nerdfootball/public/data/nerdfootball_scoring/${TONY_UID}`,
            `pools/nerduniverse-2025/scoring-users/${TONY_UID}`
        ];

        let foundData = null;
        let foundPath = null;

        for (const path of possiblePaths) {
            try {
                console.log(`🔍 Checking: ${path}`);
                const testRef = window.doc(window.db, path);
                const testSnap = await window.getDoc(testRef);

                if (testSnap.exists()) {
                    const data = testSnap.data();
                    // Check if this looks like scoring data
                    if (data.totalPoints !== undefined || data.weeklyPoints !== undefined || data.seasonStats !== undefined) {
                        console.log(`✅ FOUND SCORING DATA at: ${path}`);
                        console.log('📊 Data:', {
                            totalPoints: data.totalPoints,
                            weeklyPoints: Object.keys(data.weeklyPoints || {}),
                            seasonStats: data.seasonStats
                        });
                        foundData = data;
                        foundPath = path;
                        break;
                    }
                }
            } catch (err) {
                console.log(`❌ Path ${path}: ${err.message}`);
            }
        }

        // 3. If we found scoring data, move it to expected location
        if (foundData && foundPath) {
            console.log(`🔧 MOVING DATA from ${foundPath} to ${expectedPath}`);

            // Copy data to expected location
            await window.setDoc(expectedRef, foundData);
            console.log('✅ SCORING DATA COPIED to expected path!');

            // Optionally delete from old location (commented out for safety)
            // await window.deleteDoc(window.doc(window.db, foundPath));
            // console.log('🗑️ Deleted data from old location');

        } else {
            console.log('❌ NO SCORING DATA FOUND in any search location');
            console.log('🔧 You may need to run scoring calculation again');
        }

        // 4. Fix pool members document (remove unknown entries)
        console.log('\n🔧 FIXING POOL MEMBERS...');
        const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
        const poolMembersRef = window.doc(window.db, poolMembersPath);
        const poolMembersSnap = await window.getDoc(poolMembersRef);

        if (poolMembersSnap.exists()) {
            const poolData = poolMembersSnap.data();
            let members = poolData.members || [];

            if (!Array.isArray(members)) {
                members = Object.values(members);
            }

            // Remove entries without valid UIDs
            const validMembers = members.filter(member =>
                member &&
                member.uid &&
                member.uid !== 'unknown' &&
                member.uid.length > 10 // Firebase UIDs are longer
            );

            // Add Tony if not present
            const tonyExists = validMembers.some(m => m.uid === TONY_UID);
            if (!tonyExists) {
                const tonyUserPath = `artifacts/nerdfootball/public/data/nerdfootball_users/${TONY_UID}`;
                const tonyUserRef = window.doc(window.db, tonyUserPath);
                const tonyUserSnap = await window.getDoc(tonyUserRef);

                if (tonyUserSnap.exists()) {
                    const tonyData = tonyUserSnap.data();
                    validMembers.push({
                        uid: TONY_UID,
                        displayName: tonyData.displayName || 'Ållfåther',
                        email: tonyData.email || 'tonyweeg@gmail.com',
                        joinedAt: new Date().toISOString(),
                        role: 'admin'
                    });
                    console.log('✅ Added Tony to pool members');
                }
            }

            await window.setDoc(poolMembersRef, {
                members: validMembers,
                memberCount: validMembers.length,
                lastUpdated: new Date().toISOString()
            });

            console.log(`✅ POOL MEMBERS FIXED: ${validMembers.length} valid members`);
        }

        console.log('\n🔄 REFRESH THE PAGE (F5) TO SEE RESULTS!');
        return foundData !== null;

    } catch (error) {
        console.error('💥 SEARCH FAILED:', error);
        return false;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    window.findAndFixScoringData = findAndFixScoringData;
    console.log('🔍 Find and Fix Scoring Data loaded. Run: findAndFixScoringData()');
}