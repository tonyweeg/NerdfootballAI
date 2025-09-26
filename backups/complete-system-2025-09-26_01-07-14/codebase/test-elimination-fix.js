// Test script to verify elimination system database writes work
// Run this in browser console after loading nerdfootball.web.app

async function testEliminationFix() {
    console.log('🧪 Testing Elimination System Database Writes');

    // Test specific user who picked Miami (should be eliminated)
    const testUserId = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';
    const testWeek = 1;

    try {
        // Initialize survivor auto elimination if not already done
        if (!window.survivorAutoElimination) {
            console.log('⚠️ survivorAutoElimination not found, loading...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (!window.survivorAutoElimination) {
            console.error('❌ survivorAutoElimination still not available');
            return;
        }

        console.log(`🔍 Testing elimination for user ${testUserId} in Week ${testWeek}`);

        // Run elimination check
        const result = await window.survivorAutoElimination.checkEliminationsForWeek(testWeek);

        console.log('✅ Elimination check result:', result);

        // Check if user is now eliminated in database
        const userDoc = await window.getDoc(window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', testUserId));

        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log(`📊 User ${testUserId} elimination status:`, userData.eliminationStatus);
            console.log(`📊 User ${testUserId} full data:`, userData);

            if (userData.eliminationStatus === 'eliminated') {
                console.log('✅ SUCCESS: User is now properly eliminated in database');
                return true;
            } else {
                console.log('❌ FAILED: User is not eliminated in database');
                return false;
            }
        } else {
            console.log('❌ FAILED: User document not found');
            return false;
        }

    } catch (error) {
        console.error('❌ Error testing elimination:', error);
        return false;
    }
}

// Auto-run test
console.log('🧪 Elimination test script loaded. Running test...');
testEliminationFix().then(success => {
    if (success) {
        console.log('🎉 ELIMINATION SYSTEM FIXED - Database writes working!');
    } else {
        console.log('🚨 ELIMINATION SYSTEM STILL BROKEN - Database writes failing');
    }
});