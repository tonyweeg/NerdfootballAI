// Final test script to verify elimination system database writes
// Copy and paste this into browser console at https://nerdfootball.web.app

async function testEliminationFinal() {
    console.log('🧪 FINAL TEST: Elimination System Database Writes');

    // Wait for systems to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (!window.survivorAutoElimination) {
        console.error('❌ survivorAutoElimination not available');
        return false;
    }

    console.log('🔄 Running elimination check for Week 1...');

    try {
        // Run elimination for Week 1 (should catch Miami user)
        const result = await window.survivorAutoElimination.checkEliminationsForWeek(1);

        console.log('📊 Elimination result:', result);

        if (result.eliminatedCount > 0) {
            console.log(`✅ SUCCESS: ${result.eliminatedCount} users eliminated`);
            console.log('📋 Eliminated users:', result.details);

            // Check specific user BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2
            const miamiUser = result.details.find(u => u.userId === 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2');
            if (miamiUser) {
                console.log(`🎯 CONFIRMED: Miami user ${miamiUser.userId} eliminated for picking ${miamiUser.pickedTeam}`);
                return true;
            } else {
                console.log('⚠️ Miami user not in elimination list - checking database directly...');
            }
        }

        // Check database for Miami user status
        const statusDoc = await window.getDoc(
            window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status')
        );

        if (statusDoc.exists()) {
            const allStatuses = statusDoc.data();
            const miamiUserStatus = allStatuses['BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];

            console.log('📊 Miami user database status:', miamiUserStatus);

            if (miamiUserStatus && miamiUserStatus.eliminated) {
                console.log('✅ SUCCESS: Miami user eliminated in database');
                return true;
            } else {
                console.log('❌ FAILED: Miami user NOT eliminated in database');
                return false;
            }
        } else {
            console.log('❌ FAILED: Status document not found');
            return false;
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        return false;
    }
}

// Auto-run test
console.log('🧪 Loading final elimination test...');
testEliminationFinal().then(success => {
    if (success) {
        console.log('🎉 ELIMINATION SYSTEM WORKING - Database writes successful!');
    } else {
        console.log('🚨 ELIMINATION SYSTEM BROKEN - Database writes failing');
    }
});