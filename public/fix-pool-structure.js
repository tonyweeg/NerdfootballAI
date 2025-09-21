// 🔧 FIX POOL MEMBERS DOCUMENT STRUCTURE
// Debug and fix the actual pool members structure

async function fixPoolStructure() {
    console.log('🔧 FIXING POOL MEMBERS STRUCTURE...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";

    try {
        // 1. Check current pool members structure
        console.log('📋 Investigating pool members structure...');
        const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
        const poolMembersRef = window.doc(window.db, poolMembersPath);
        const poolMembersSnap = await window.getDoc(poolMembersRef);

        if (poolMembersSnap.exists()) {
            const poolData = poolMembersSnap.data();
            console.log('📊 Current pool document structure:', Object.keys(poolData));
            console.log('📊 Pool data type:', typeof poolData);

            // Check if members is an array or object
            if (poolData.members) {
                console.log('📊 Members type:', typeof poolData.members);
                console.log('📊 Members is array?', Array.isArray(poolData.members));
                console.log('📊 Members structure:', poolData.members);
            } else {
                console.log('❌ No members field found!');
            }

            // Fix if members is not an array
            let members = poolData.members;
            if (!Array.isArray(members)) {
                if (typeof members === 'object') {
                    // Convert object to array
                    members = Object.values(members);
                    console.log('🔧 Converted members object to array');
                } else {
                    // Create new array
                    members = [];
                    console.log('🔧 Created new members array');
                }
            }

            // Check if Tony is in members
            const tonyMember = members.find(m => m.uid === TONY_UID);
            if (tonyMember) {
                console.log('✅ TONY FOUND IN MEMBERS:', tonyMember);
            } else {
                console.log('❌ TONY NOT FOUND - Adding him...');

                // Get Tony's data
                const tonyUserPath = `artifacts/nerdfootball/public/data/nerdfootball_users/${TONY_UID}`;
                const tonyUserRef = window.doc(window.db, tonyUserPath);
                const tonyUserSnap = await window.getDoc(tonyUserRef);

                if (tonyUserSnap.exists()) {
                    const tonyData = tonyUserSnap.data();
                    const tonyMember = {
                        uid: TONY_UID,
                        displayName: tonyData.displayName || 'Ållfåther',
                        email: tonyData.email || 'tonyweeg@gmail.com',
                        joinedAt: new Date().toISOString(),
                        role: 'admin'
                    };

                    members.push(tonyMember);
                    console.log('✅ Added Tony to members array');
                }
            }

            // Update with proper structure
            const updatedPoolData = {
                ...poolData,
                members: members,
                memberCount: members.length,
                lastUpdated: new Date().toISOString()
            };

            await window.setDoc(poolMembersRef, updatedPoolData);
            console.log(`🎉 POOL STRUCTURE FIXED! Total members: ${members.length}`);

        } else {
            console.log('❌ Pool members document does not exist - creating...');

            // Create new pool members document
            const tonyUserPath = `artifacts/nerdfootball/public/data/nerdfootball_users/${TONY_UID}`;
            const tonyUserRef = window.doc(window.db, tonyUserPath);
            const tonyUserSnap = await window.getDoc(tonyUserRef);

            if (tonyUserSnap.exists()) {
                const tonyData = tonyUserSnap.data();
                const newPoolData = {
                    members: [{
                        uid: TONY_UID,
                        displayName: tonyData.displayName || 'Ållfåther',
                        email: tonyData.email || 'tonyweeg@gmail.com',
                        joinedAt: new Date().toISOString(),
                        role: 'admin'
                    }],
                    memberCount: 1,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };

                await window.setDoc(poolMembersRef, newPoolData);
                console.log('🎉 CREATED NEW POOL MEMBERS DOCUMENT!');
            }
        }

        // 2. Check scoring path issue
        console.log('\n🔍 Checking scoring path...');
        const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${TONY_UID}`;
        const scoreDocRef = window.doc(window.db, scorePath);
        const scoreDocSnap = await window.getDoc(scoreDocRef);

        if (scoreDocSnap.exists()) {
            console.log('✅ SCORING DOCUMENT EXISTS at correct path');
            const scoreData = scoreDocSnap.data();
            console.log('📊 Score data:', {
                totalPoints: scoreData.totalPoints,
                weeksPlayed: scoreData.seasonStats?.weeksPlayed
            });
        } else {
            console.log('❌ SCORING DOCUMENT MISSING at expected path');
            console.log('🔍 The system found your data at alternative path, but UI expects it at scoring-users path');
        }

        console.log('\n🔄 TRY REFRESHING THE PAGE (F5) NOW!');
        return true;

    } catch (error) {
        console.error('💥 FIX FAILED:', error);
        return false;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    window.fixPoolStructure = fixPoolStructure;
    console.log('🔧 Fix Pool Structure loaded. Run: fixPoolStructure()');
}