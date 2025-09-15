// DIAMOND LEVEL: Test Script for Target User aaG5Wc2JZkZJD1r7ozfJG04QRrf1
// Validates that the fixed week-isolation logic produces correct results

async function testTargetUser() {
    const targetUID = 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1';

    console.log('🎯 TESTING TARGET USER: ' + targetUID);
    console.log('=====================================');

    try {
        // 1. Check if SurvivorSystem is available
        if (!window.survivorSystem) {
            console.log('⚠️ Initializing SurvivorSystem...');
            window.survivorSystem = new SurvivorSystem(window.db);
        }

        // 2. Get pool members to verify user exists
        console.log('📋 Step 1: Checking pool membership...');
        const poolDoc = await getDoc(doc(db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members'));
        const poolMembers = poolDoc.data();

        if (poolMembers[targetUID]) {
            console.log('✅ User found in pool:', poolMembers[targetUID].displayName);
        } else {
            console.log('❌ User NOT found in pool members');
            return;
        }

        // 3. Check user's picks
        console.log('\n📋 Step 2: Checking user picks...');
        const picksDoc = await getDoc(doc(db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${targetUID}`));
        if (picksDoc.exists()) {
            const picks = picksDoc.data().picks || {};
            console.log('📊 User picks:', picks);

            // Check Week 1 pick specifically
            if (picks[1]) {
                console.log('🏈 Week 1 pick:', picks[1]);
            } else {
                console.log('⚠️ No Week 1 pick found');
            }
        } else {
            console.log('❌ No picks document found for user');
        }

        // 4. Check current elimination status
        console.log('\n📋 Step 3: Checking elimination status...');
        const statusDoc = await getDoc(doc(db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status'));
        const allStatuses = statusDoc.exists() ? statusDoc.data() : {};
        const userStatus = allStatuses[targetUID];

        if (userStatus) {
            console.log('📊 Current status in database:', userStatus);
        } else {
            console.log('⚠️ No status found in database');
        }

        // 5. Get ESPN data for comparison
        console.log('\n📋 Step 4: Getting ESPN Week 1 data...');
        const weekResults = await window.survivorSystem.getESPNWeekResults(1);
        console.log('🏈 ESPN Week 1 games available:', Object.keys(weekResults).length);
        console.log('🔍 ESPN game sample:', Object.values(weekResults)[0]);

        // 6. Run fixed survival check
        console.log('\n📋 Step 5: Running fixed survival check...');
        const survivalResults = await window.survivorSystem.getPoolSurvivalStatus('nerduniverse-2025');
        const targetResult = survivalResults.find(u => u.uid === targetUID);

        if (targetResult) {
            console.log('\n🎯 TARGET USER RESULT WITH FIXED LOGIC:');
            console.log('=====================================');
            console.log('Name:', targetResult.displayName);
            console.log('Status:', targetResult.status);
            console.log('Eliminated:', targetResult.isEliminated);
            console.log('Reason:', targetResult.reason);
            console.log('Current Pick:', targetResult.currentPick);
            console.log('Game ID:', targetResult.gameId);

            // Compare with database status
            if (userStatus && userStatus.eliminated !== targetResult.isEliminated) {
                console.log('\n⚠️ STATUS MISMATCH DETECTED:');
                console.log('Database says eliminated:', userStatus.eliminated);
                console.log('Fixed logic says eliminated:', targetResult.isEliminated);
                console.log('🔧 RECALCULATION NEEDED');
            } else {
                console.log('\n✅ Status matches between database and fixed logic');
            }
        } else {
            console.log('❌ Target user not found in survival results');
        }

        // 7. Show overall pool summary
        console.log('\n📊 POOL SUMMARY:');
        const summary = window.survivorSystem.getSummaryStats(survivalResults);
        console.log('Total users:', summary.total);
        console.log('Alive:', summary.alive);
        console.log('Eliminated:', summary.eliminated);

        return targetResult;

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// Auto-run test
console.log('✅ Target user test script loaded');
console.log('📋 Run: testTargetUser() to check the specific user');

// Create global function
window.testTargetUser = testTargetUser;