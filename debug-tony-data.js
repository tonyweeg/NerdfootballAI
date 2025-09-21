// 🔍 DEBUG TONY'S SCORING AND PICKS DATA
// Check why Tony is still seeing "No scoring data available"

async function debugTonyData() {
    console.log('🔍 DEBUGGING TONY\'S DATA...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";

    try {
        // 1. CHECK SCORING DOCUMENT
        console.log('📊 Checking Tony\'s scoring document...');
        const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${TONY_UID}`;
        const scoreDocRef = window.doc(window.db, scorePath);
        const scoreDocSnap = await window.getDoc(scoreDocRef);

        if (scoreDocSnap.exists()) {
            const scoreData = scoreDocSnap.data();
            console.log('✅ SCORING DOCUMENT EXISTS');
            console.log('   Document structure:', Object.keys(scoreData));
            console.log('   weeklyPoints:', scoreData.weeklyPoints);
            console.log('   totalPoints:', scoreData.totalPoints);
            console.log('   seasonStats:', scoreData.seasonStats);

            // Check weekly data specifically
            if (scoreData.weeklyPoints) {
                console.log('📋 Weekly breakdown:');
                console.log('   Week 1:', scoreData.weeklyPoints['1'] || 'MISSING');
                console.log('   Week 2:', scoreData.weeklyPoints['2'] || 'MISSING');
            }
        } else {
            console.log('❌ SCORING DOCUMENT DOES NOT EXIST!');
        }

        // 2. CHECK PICKS DATA
        console.log('\n📋 Checking Tony\'s picks data...');

        for (const week of [1, 2]) {
            const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
            const picksDocRef = window.doc(window.db, picksPath, TONY_UID);
            const picksDocSnap = await window.getDoc(picksDocRef);

            if (picksDocSnap.exists()) {
                const picksData = picksDocSnap.data();
                const gameCount = Object.keys(picksData).filter(k => k !== 'mnfTotalPoints').length;
                console.log(`✅ Week ${week} picks: ${gameCount} games`);
                console.log(`   Sample picks:`, Object.keys(picksData).slice(0, 3));
                console.log(`   MNF Total:`, picksData.mnfTotalPoints);
            } else {
                console.log(`❌ Week ${week} picks: MISSING!`);
            }
        }

        // 3. CHECK POOL MEMBERSHIP
        console.log('\n👥 Checking Tony\'s pool membership...');
        const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
        const poolMembersRef = window.doc(window.db, poolMembersPath);
        const poolMembersSnap = await window.getDoc(poolMembersRef);

        if (poolMembersSnap.exists()) {
            const members = poolMembersSnap.data().members || [];
            const tonyMember = members.find(m => m.uid === TONY_UID);
            if (tonyMember) {
                console.log('✅ POOL MEMBER FOUND');
                console.log('   Display Name:', tonyMember.displayName);
                console.log('   Email:', tonyMember.email);
            } else {
                console.log('❌ NOT FOUND IN POOL MEMBERS!');
            }
        }

        // 4. RUN SCORING CALCULATION FOR TONY SPECIFICALLY
        console.log('\n🔧 Running scoring calculation for Tony...');
        try {
            const week1Result = await window.ScoringCalculator.processWeekScoring(1);
            console.log('Week 1 scoring result:', week1Result);

            const week2Result = await window.ScoringCalculator.processWeekScoring(2);
            console.log('Week 2 scoring result:', week2Result);
        } catch (scoringError) {
            console.log('💥 Scoring calculation failed:', scoringError);
        }

        console.log('\n🎯 DEBUG COMPLETE');
        return true;

    } catch (error) {
        console.error('💥 DEBUG FAILED:', error);
        return false;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    window.debugTonyData = debugTonyData;
    console.log('🔍 Debug Tony Data loaded. Run: debugTonyData()');
}