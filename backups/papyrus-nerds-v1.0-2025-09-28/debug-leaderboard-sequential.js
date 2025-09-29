// 🔍 SEQUENTIAL DEBUG - Step by step leaderboard investigation
// Run this in browser console at https://nerdfootball.web.app/?view=leaderboard&week=1

console.log('🔍 SEQUENTIAL LEADERBOARD DEBUG - STEP BY STEP');
console.log('================================================');

async function debugLeaderboardSequential() {

    // STEP 1: Check if our new integration code is loaded
    console.log('\n📋 STEP 1: Check if LeaderboardScoringIntegration is available');
    if (window.LeaderboardScoringIntegration) {
        console.log('✅ LeaderboardScoringIntegration is loaded');
    } else {
        console.log('❌ LeaderboardScoringIntegration NOT LOADED - cache issue!');
        return;
    }

    // STEP 2: Check if Firebase is ready
    console.log('\n📋 STEP 2: Check Firebase availability');
    if (window.db && window.doc && window.getDoc) {
        console.log('✅ Firebase is ready');
    } else {
        console.log('❌ Firebase not ready');
        return;
    }

    // STEP 3: Check if Week 1 leaderboard data exists in Firestore
    console.log('\n📋 STEP 3: Check if Week 1 leaderboard data exists in Firestore');
    try {
        const leaderboardPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/leaderboards/weekly-1';
        console.log('🔍 Checking path:', leaderboardPath);

        const docRef = window.doc(window.db, leaderboardPath);
        const docSnap = await window.getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('✅ Week 1 leaderboard data EXISTS!');
            console.log('📊 Data preview:', {
                generated: data.generatedAt,
                users: data.standings?.length || 0,
                highScore: data.metadata?.highScore || 0
            });

            // Show first 3 users
            if (data.standings?.length > 0) {
                console.log('🏆 Top 3 users from Firestore:');
                data.standings.slice(0, 3).forEach((user, i) => {
                    console.log(`   ${i+1}. ${user.displayName}: ${user.totalPoints} pts`);
                });
            }
        } else {
            console.log('❌ Week 1 leaderboard data DOES NOT EXIST in Firestore');
            console.log('   This means the scoring system did NOT save leaderboard data!');
            return;
        }
    } catch (error) {
        console.log('❌ Error checking Firestore:', error);
        return;
    }

    // STEP 4: Test the integration function directly
    console.log('\n📋 STEP 4: Test LeaderboardScoringIntegration.replaceLeaderboardCalculation(1)');
    try {
        const result = await window.LeaderboardScoringIntegration.replaceLeaderboardCalculation(1);

        if (result && result.length > 0) {
            console.log('✅ Integration returned data:', result.length, 'users');
            console.log('🏆 First user:', result[0]);
        } else {
            console.log('❌ Integration returned null/empty - falling back to legacy');
        }
    } catch (error) {
        console.log('❌ Integration error:', error);
    }

    // STEP 5: Check what renderPublicLeaderboard is actually doing
    console.log('\n📋 STEP 5: Check current leaderboard HTML content');
    const tbody = document.getElementById('public-leaderboard-body');
    if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        console.log(`📊 Current leaderboard has ${rows.length} rows`);

        if (rows.length > 0) {
            const firstRow = rows[0];
            const scoreCell = firstRow.querySelector('td:nth-child(3)');
            const userCell = firstRow.querySelector('td:nth-child(2)');
            console.log('🔍 First row:', {
                user: userCell?.textContent?.trim(),
                score: scoreCell?.textContent?.trim()
            });
        }
    }

    console.log('\n🎯 CONCLUSION:');
    console.log('If Week 1 data exists but integration returns null, there\'s a path/logic issue');
    console.log('If Week 1 data does NOT exist, the scoring system never saved it');
    console.log('If integration returns data but leaderboard shows zeros, renderPublicLeaderboard has issues');
}

// Run the debug
debugLeaderboardSequential();