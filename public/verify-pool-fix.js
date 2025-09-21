// 🔍 VERIFY POOL MEMBERSHIP FIX AND FORCE UI REFRESH
// Check if Tony is actually in pool members and refresh the UI

async function verifyPoolFix() {
    console.log('🔍 VERIFYING POOL MEMBERSHIP FIX...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";

    try {
        // 1. Check pool members document
        console.log('📋 Checking pool members...');
        const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
        const poolMembersRef = window.doc(window.db, poolMembersPath);
        const poolMembersSnap = await window.getDoc(poolMembersRef);

        if (poolMembersSnap.exists()) {
            const poolData = poolMembersSnap.data();
            const members = poolData.members || [];
            const tonyMember = members.find(m => m.uid === TONY_UID);

            console.log(`📊 Total pool members: ${members.length}`);
            if (tonyMember) {
                console.log('✅ TONY FOUND IN POOL:', tonyMember);
            } else {
                console.log('❌ TONY NOT FOUND IN POOL!');
                console.log('📋 All UIDs:', members.map(m => `${m.displayName}: ${m.uid.slice(-6)}`));
            }
        } else {
            console.log('❌ Pool members document does not exist!');
        }

        // 2. Check what the UI is actually looking for
        console.log('\n🔍 Checking UI scoring path...');
        const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${TONY_UID}`;
        const scoreDocRef = window.doc(window.db, scorePath);
        const scoreDocSnap = await window.getDoc(scoreDocRef);

        if (scoreDocSnap.exists()) {
            const scoreData = scoreDocSnap.data();
            console.log('✅ SCORING DOCUMENT EXISTS');
            console.log('📊 Total points:', scoreData.totalPoints);
            console.log('📊 Weeks played:', scoreData.seasonStats?.weeksPlayed);
        } else {
            console.log('❌ SCORING DOCUMENT MISSING!');
        }

        // 3. Force UI refresh by calling the home update function
        console.log('\n🔄 FORCING UI REFRESH...');
        if (typeof window.updateHomeStatus === 'function') {
            await window.updateHomeStatus();
            console.log('✅ Called updateHomeStatus()');
        }

        if (typeof window.loadHomePicksSummary === 'function') {
            await window.loadHomePicksSummary();
            console.log('✅ Called loadHomePicksSummary()');
        }

        // 4. Force page reload if functions don't exist
        if (typeof window.updateHomeStatus !== 'function') {
            console.log('🔄 HOME UPDATE FUNCTIONS NOT FOUND - NEED PAGE REFRESH');
            console.log('💡 Try refreshing the page (F5) to see your scoring data');
        }

        return true;

    } catch (error) {
        console.error('💥 VERIFICATION FAILED:', error);
        return false;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    window.verifyPoolFix = verifyPoolFix;
    console.log('🔍 Verify Pool Fix loaded. Run: verifyPoolFix()');
}