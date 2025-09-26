// Debug User THoYhTIT46RdGeNuL9CyfPCJtZ73 - Check picks and scoring data

console.log('🔍 Debugging user THoYhTIT46RdGeNuL9CyfPCJtZ73...');

const userId = 'THoYhTIT46RdGeNuL9CyfPCJtZ73';

async function debugUserPicks() {
    try {
        console.log('📊 Checking picks for weeks 1 and 2...');

        // Check Week 1 picks
        const week1PicksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/1/submissions`;
        const week1DocRef = window.doc(window.db, week1PicksPath, userId);
        const week1Snap = await window.getDoc(week1DocRef);

        console.log(`Week 1 picks exist: ${week1Snap.exists()}`);
        if (week1Snap.exists()) {
            const week1Data = week1Snap.data();
            console.log('Week 1 picks data:', week1Data);
            console.log(`Week 1 picks count: ${Object.keys(week1Data).length}`);
        }

        // Check Week 2 picks
        const week2PicksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/2/submissions`;
        const week2DocRef = window.doc(window.db, week2PicksPath, userId);
        const week2Snap = await window.getDoc(week2DocRef);

        console.log(`Week 2 picks exist: ${week2Snap.exists()}`);
        if (week2Snap.exists()) {
            const week2Data = week2Snap.data();
            console.log('Week 2 picks data:', week2Data);
            console.log(`Week 2 picks count: ${Object.keys(week2Data).length}`);
        }

        // Check scoring data
        console.log('📈 Checking scoring data...');
        const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${userId}`;
        const scoreDocRef = window.doc(window.db, scorePath);
        const scoreSnap = await window.getDoc(scoreDocRef);

        console.log(`Scoring data exists: ${scoreSnap.exists()}`);
        if (scoreSnap.exists()) {
            const scoreData = scoreSnap.data();
            console.log('Scoring data:', scoreData);
        }

        // Check pool membership
        console.log('👥 Checking pool membership...');
        const poolMembersPath = `artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members`;
        const poolDocRef = window.doc(window.db, poolMembersPath);
        const poolSnap = await window.getDoc(poolDocRef);

        if (poolSnap.exists()) {
            const poolData = poolSnap.data();
            const userMember = Object.values(poolData).find(member => member.uid === userId);
            if (userMember) {
                console.log('Pool member data:', userMember);
            } else {
                console.log('❌ User not found in pool members');
            }
        }

    } catch (error) {
        console.error('❌ Error debugging user:', error);
    }
}

// Run the debug function
window.debugUserPicks = debugUserPicks;
console.log('🚀 Run: window.debugUserPicks()');