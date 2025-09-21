// 🔧 RECREATE TONY'S SCORING DOCUMENT AT EXPECTED PATH
// Run scoring calculation specifically for Tony to create the missing document

async function recreateTonyScoring() {
    console.log('🔧 RECREATING TONY\'S SCORING DOCUMENT...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";
    const expectedPath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${TONY_UID}`;

    try {
        // 1. Check Tony's picks exist
        console.log('📋 Verifying Tony\'s picks exist...');
        let totalWeeks = 0;

        for (const week of [1, 2]) {
            const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
            const picksRef = window.doc(window.db, picksPath, TONY_UID);
            const picksSnap = await window.getDoc(picksRef);

            if (picksSnap.exists()) {
                const picks = picksSnap.data();
                const gameCount = Object.keys(picks).filter(k => k !== 'mnfTotalPoints').length;
                console.log(`✅ Week ${week}: ${gameCount} games`);
                totalWeeks++;
            } else {
                console.log(`❌ Week ${week}: No picks found`);
            }
        }

        if (totalWeeks === 0) {
            console.log('❌ NO PICKS FOUND - Cannot create scoring document');
            return false;
        }

        // 2. Get user info
        const userPath = `artifacts/nerdfootball/public/data/nerdfootball_users/${TONY_UID}`;
        const userRef = window.doc(window.db, userPath);
        const userSnap = await window.getDoc(userRef);

        if (!userSnap.exists()) {
            console.log('❌ User data not found');
            return false;
        }

        const userData = userSnap.data();
        console.log('📋 User info:', userData.displayName, userData.email);

        // 3. Calculate scoring for each week and create the document structure
        console.log('🔢 Calculating scoring...');

        const weeklyPoints = {};
        let totalPoints = 0;
        let totalPicks = 0;
        let totalCorrectPicks = 0;

        for (const week of [1, 2]) {
            console.log(`\n📊 Processing Week ${week}...`);

            try {
                // Use the existing scoring calculator
                const weekResult = await window.ScoringCalculator.calculateWeeklyPoints(TONY_UID, week);

                if (weekResult && weekResult.totalPoints !== undefined) {
                    weeklyPoints[week] = weekResult;
                    totalPoints += weekResult.totalPoints;
                    totalPicks += weekResult.totalPicks || 0;
                    totalCorrectPicks += weekResult.correctPicks || 0;

                    console.log(`✅ Week ${week}: ${weekResult.totalPoints} points (${weekResult.correctPicks}/${weekResult.totalPicks} correct)`);
                } else {
                    console.log(`❌ Week ${week}: Scoring calculation failed`);
                }
            } catch (err) {
                console.log(`❌ Week ${week}: Error - ${err.message}`);
            }
        }

        if (Object.keys(weeklyPoints).length === 0) {
            console.log('❌ NO SCORING DATA CALCULATED');
            return false;
        }

        // 4. Create the scoring document
        console.log('\n📝 Creating scoring document...');

        const scoringData = {
            userId: TONY_UID,
            displayName: userData.displayName || 'Ållfåther',
            email: userData.email,
            weeklyPoints: weeklyPoints,
            totalPoints: totalPoints,
            seasonStats: {
                totalPoints: totalPoints,
                totalPicks: totalPicks,
                totalCorrectPicks: totalCorrectPicks,
                weeksPlayed: Object.keys(weeklyPoints).length,
                lastUpdated: new Date().toISOString()
            },
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        // 5. Save to expected path
        const expectedRef = window.doc(window.db, expectedPath);
        await window.setDoc(expectedRef, scoringData);

        console.log(`🎉 SCORING DOCUMENT CREATED!`);
        console.log(`📊 Total Points: ${totalPoints}`);
        console.log(`📊 Weeks Played: ${Object.keys(weeklyPoints).length}`);
        console.log(`📍 Saved to: ${expectedPath}`);

        console.log('\n🔄 REFRESH THE PAGE (F5) - YOUR SCORING DATA SHOULD NOW APPEAR!');
        return true;

    } catch (error) {
        console.error('💥 RECREATION FAILED:', error);
        return false;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    window.recreateTonyScoring = recreateTonyScoring;
    console.log('🔧 Recreate Tony Scoring loaded. Run: recreateTonyScoring()');
}