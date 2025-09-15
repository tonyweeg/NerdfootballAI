// Manual fix for user aaG5Wc2JZkZJD1r7ozfJG04QRrf1
// Run this in the browser console

console.log('🚨 MANUAL FIX LOADING...');

window.manualFixUser = async function() {
    const userId = 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1';

    console.log(`🚨 FIXING USER: ${userId}`);

    try {
        // Wait for Firebase to be ready
        if (!window.db || !window.firestoreImports) {
            console.log('⏳ Waiting for Firebase...');
            await new Promise(resolve => {
                const check = () => {
                    if (window.db && window.firestoreImports) {
                        resolve();
                    } else {
                        setTimeout(check, 1000);
                    }
                };
                check();
            });
        }

        const { doc, updateDoc, setDoc } = window.firestoreImports;

        // 1. Clear elimination from pool members
        console.log('⚡ Fixing pool members...');
        const poolMembersRef = doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');

        // Get current pool members
        const poolDoc = await window.firestoreImports.getDoc(poolMembersRef);
        if (poolDoc.exists()) {
            const poolMembers = poolDoc.data();
            if (poolMembers[userId]) {
                // Update user to be alive
                poolMembers[userId] = {
                    ...poolMembers[userId],
                    eliminated: false,
                    eliminatedWeek: null,
                    eliminationReason: null,
                    status: 'active',
                    manualFix: true,
                    fixedAt: new Date().toISOString()
                };

                await updateDoc(poolMembersRef, poolMembers);
                console.log('✅ Pool members updated - user is now ALIVE');
            } else {
                console.log('❌ User not found in pool members');
                return;
            }
        } else {
            console.log('❌ Pool members document not found');
            return;
        }

        // 2. Set survivor status to alive
        console.log('⚡ Setting survivor status...');
        const survivorRef = doc(window.db, `artifacts/nerdfootball/pools/nerduniverse-2025/survivor/${userId}`);
        await setDoc(survivorRef, {
            eliminated: false,
            eliminatedWeek: null,
            eliminationReason: null,
            status: 'active',
            manualOverride: true,
            fixedAt: new Date().toISOString()
        });
        console.log('✅ Survivor status set to ALIVE');

        // 3. Clear any cached data
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ Cache cleared');

        console.log('🎉 USER IS NOW ALIVE!');
        console.log('📊 Refresh the survivor page to see the fix');

        // Auto-navigate to survivor page
        setTimeout(() => {
            window.location.href = './index.html?view=survivor';
        }, 2000);

    } catch (error) {
        console.error('❌ ERROR:', error);
    }
};

console.log('✅ Manual fix loaded');
console.log('📋 Run: manualFixUser() to fix the user');

// Auto-run if this script is loaded
if (window.location.pathname.includes('manual-fix') || window.location.search.includes('autofix')) {
    setTimeout(() => {
        window.manualFixUser();
    }, 2000);
}