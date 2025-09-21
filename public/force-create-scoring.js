// 🚨 FORCE CREATE TONY'S SCORING DOCUMENT
// Simple, direct approach - minimal data, maximum compatibility

async function forceCreateScoring() {
    console.log('🚨 FORCE CREATING TONY\'S SCORING DOCUMENT...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";
    const expectedPath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${TONY_UID}`;

    try {
        // 1. First, verify if it actually exists
        console.log('🔍 Checking if document actually exists...');
        const ref = window.doc(window.db, expectedPath);
        const snap = await window.getDoc(ref);

        if (snap.exists()) {
            console.log('✅ DOCUMENT ALREADY EXISTS!');
            console.log('📊 Data:', snap.data());
            console.log('🔄 Try a HARD REFRESH (Ctrl+F5 or Cmd+Shift+R)');
            return true;
        } else {
            console.log('❌ DOCUMENT CONFIRMED MISSING - Creating now...');
        }

        // 2. Create MINIMAL scoring document (match other users' format exactly)
        console.log('📝 Creating minimal scoring document...');

        const minimalData = {
            userId: TONY_UID,
            displayName: "Ållfåther",
            email: "tonyweeg@gmail.com",
            weeklyPoints: {
                "1": {
                    weekNumber: 1,
                    totalPoints: 91,
                    correctPicks: 10,
                    totalPicks: 16,
                    accuracy: 62.5,
                    possiblePoints: 136,
                    timestamp: "2025-09-21T02:16:31.933Z"
                },
                "2": {
                    weekNumber: 2,
                    totalPoints: 51,
                    correctPicks: 8,
                    totalPicks: 15,
                    accuracy: 53.3,
                    possiblePoints: 132,
                    timestamp: "2025-09-21T02:16:31.933Z"
                }
            },
            totalPoints: 142,
            seasonStats: {
                totalPoints: 142,
                totalPicks: 31,
                totalCorrectPicks: 18,
                weeksPlayed: 2,
                lastUpdated: "2025-09-21T02:24:39.986Z"
            },
            createdAt: "2025-09-21T02:24:39.986Z",
            lastUpdated: "2025-09-21T02:24:39.986Z"
        };

        console.log('📊 Document structure:');
        console.log('   weeklyPoints keys:', Object.keys(minimalData.weeklyPoints));
        console.log('   totalPoints:', minimalData.totalPoints);
        console.log('   weeksPlayed:', minimalData.seasonStats.weeksPlayed);

        // 3. Force save with setDoc
        console.log('💾 Saving document...');
        await window.setDoc(ref, minimalData);

        // 4. Immediate verification
        console.log('🔍 Verifying save...');
        const verifySnap = await window.getDoc(ref);

        if (verifySnap.exists()) {
            const savedData = verifySnap.data();
            console.log('🎉 DOCUMENT SUCCESSFULLY CREATED!');
            console.log('📊 Saved total points:', savedData.totalPoints);
            console.log('📊 Saved weeks:', savedData.seasonStats.weeksPlayed);
            console.log('✅ VERIFICATION PASSED');
        } else {
            console.log('❌ SAVE FAILED - Document still doesn\'t exist');
            return false;
        }

        // 5. Check one more user to make sure our path is right
        console.log('\n🔍 Double-checking with another user...');
        const steveUID = "CX0etIyJbGg33nmHCo4eezPWrsr2";
        const stevePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${steveUID}`;
        const steveRef = window.doc(window.db, stevePath);
        const steveSnap = await window.getDoc(steveRef);

        if (steveSnap.exists()) {
            console.log('✅ Steve\'s document found at same path structure');
            console.log('📊 Steve\'s points:', steveSnap.data().totalPoints);
        } else {
            console.log('❌ Steve\'s document also missing - path might be wrong!');
        }

        console.log('\n🔄 NOW TRY: Hard refresh (Ctrl+F5 or Cmd+Shift+R)');
        console.log('🔄 OR: Close browser completely and reopen');

        return true;

    } catch (error) {
        console.error('💥 FORCE CREATE FAILED:', error);
        console.log('📋 Error details:', error.message);
        return false;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    window.forceCreateScoring = forceCreateScoring;
    console.log('🚨 Force Create Scoring loaded. Run: forceCreateScoring()');
}