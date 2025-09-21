// 🔧 FIX TONY'S POOL MEMBERSHIP ISSUE
// Add Tony back to pool members so scoring data shows up

async function fixTonyPoolMembership() {
    console.log('🔧 FIXING TONY\'S POOL MEMBERSHIP...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";

    try {
        // Get current pool members
        const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
        const poolMembersRef = window.doc(window.db, poolMembersPath);
        const poolMembersSnap = await window.getDoc(poolMembersRef);

        if (!poolMembersSnap.exists()) {
            console.log('❌ Pool members document not found!');
            return false;
        }

        const poolData = poolMembersSnap.data();
        const members = poolData.members || [];

        // Check if Tony is already there
        const existingTony = members.find(m => m.uid === TONY_UID);
        if (existingTony) {
            console.log('✅ Tony already in pool members:', existingTony.displayName);
            return true;
        }

        // Get Tony's user data
        const tonyUserPath = `artifacts/nerdfootball/public/data/nerdfootball_users/${TONY_UID}`;
        const tonyUserRef = window.doc(window.db, tonyUserPath);
        const tonyUserSnap = await window.getDoc(tonyUserRef);

        if (!tonyUserSnap.exists()) {
            console.log('❌ Tony\'s user data not found!');
            return false;
        }

        const tonyData = tonyUserSnap.data();
        console.log('📋 Tony\'s user data:', {
            displayName: tonyData.displayName,
            email: tonyData.email,
            uid: TONY_UID
        });

        // Add Tony to pool members
        const tonyMember = {
            uid: TONY_UID,
            displayName: tonyData.displayName || 'Ållfåther',
            email: tonyData.email || 'tonyweeg@gmail.com',
            joinedAt: new Date().toISOString(),
            role: 'admin' // Tony is admin
        };

        members.push(tonyMember);

        // Update pool members document
        await window.updateDoc(poolMembersRef, {
            members: members,
            lastUpdated: new Date().toISOString(),
            memberCount: members.length
        });

        console.log(`🎉 TONY ADDED TO POOL! Total members: ${members.length}`);
        console.log('✅ Pool membership fixed - your scoring data should now show up!');

        return true;

    } catch (error) {
        console.error('💥 FIX FAILED:', error);
        return false;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    window.fixTonyPoolMembership = fixTonyPoolMembership;
    console.log('🔧 Fix Tony Pool Membership loaded. Run: fixTonyPoolMembership()');
}