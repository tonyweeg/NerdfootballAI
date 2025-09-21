// 🔍 DEBUG THE EXACT SAME ACCESS PATTERN AS FAILING FUNCTION
// Test the exact same Firebase context/method that's failing

async function debugExactAccess() {
    console.log('🔍 DEBUGGING EXACT ACCESS PATTERN...');

    const TONY_UID = "WxSPmEildJdqs6T5hIpBUZrscwt2";
    const scorePath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/${TONY_UID}`;

    try {
        // 1. Test multiple Firebase access methods
        console.log('📋 Testing different Firebase access methods...');

        // Method 1: Direct doc + getDoc (what we used before)
        console.log('\n🔍 Method 1: window.doc + window.getDoc');
        try {
            const docRef1 = window.doc(window.db, scorePath);
            const docSnap1 = await window.getDoc(docRef1);

            if (docSnap1.exists()) {
                console.log('✅ Method 1 SUCCESS - Document found');
                console.log('📊 Total points:', docSnap1.data().totalPoints);
            } else {
                console.log('❌ Method 1 FAILED - Document not found');
            }
        } catch (err) {
            console.log('❌ Method 1 ERROR:', err.message);
        }

        // Method 2: Using collection + doc (alternative approach)
        console.log('\n🔍 Method 2: window.collection + window.doc');
        try {
            const collectionPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users';
            const collectionRef = window.collection(window.db, collectionPath);
            const docRef2 = window.doc(collectionRef, TONY_UID);
            const docSnap2 = await window.getDoc(docRef2);

            if (docSnap2.exists()) {
                console.log('✅ Method 2 SUCCESS - Document found');
                console.log('📊 Total points:', docSnap2.data().totalPoints);
            } else {
                console.log('❌ Method 2 FAILED - Document not found');
            }
        } catch (err) {
            console.log('❌ Method 2 ERROR:', err.message);
        }

        // Method 3: Test if there are multiple Firebase database instances
        console.log('\n🔍 Method 3: Check Firebase instances');
        console.log('📊 window.db:', typeof window.db);
        console.log('📊 window.db.app.name:', window.db?.app?.name);
        console.log('📊 Global firebase:', typeof firebase);

        // Method 4: Raw Firestore access (if available)
        console.log('\n🔍 Method 4: Check raw Firestore access');
        if (typeof window.getFirestore !== 'undefined') {
            console.log('📊 window.getFirestore available');
            try {
                const rawDb = window.getFirestore();
                const rawDocRef = window.doc(rawDb, scorePath);
                const rawDocSnap = await window.getDoc(rawDocRef);

                if (rawDocSnap.exists()) {
                    console.log('✅ Method 4 SUCCESS - Raw Firestore found document');
                } else {
                    console.log('❌ Method 4 FAILED - Raw Firestore no document');
                }
            } catch (err) {
                console.log('❌ Method 4 ERROR:', err.message);
            }
        }

        // 5. Test the exact function that's showing the error
        console.log('\n🔍 Method 5: Call the failing function directly');
        if (typeof window.ScoringSystemManager !== 'undefined' &&
            typeof window.ScoringSystemManager.getUserSeasonTotals === 'function') {

            console.log('📊 Calling ScoringSystemManager.getUserSeasonTotals...');
            try {
                const seasonTotals = await window.ScoringSystemManager.getUserSeasonTotals(TONY_UID);
                console.log('✅ getUserSeasonTotals SUCCESS:', seasonTotals);
            } catch (err) {
                console.log('❌ getUserSeasonTotals ERROR:', err.message);
            }
        }

        // 6. Test permissions explicitly
        console.log('\n🔍 Method 6: Test document permissions');
        try {
            const testPath = `artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users`;
            const testCollectionRef = window.collection(window.db, testPath);
            const testQuery = window.query(testCollectionRef, window.limit(1));
            const testSnap = await window.getDocs(testQuery);

            console.log(`✅ Collection access SUCCESS - ${testSnap.size} documents visible`);

            testSnap.forEach(doc => {
                console.log(`📋 Visible document: ${doc.id.slice(-6)} (${doc.data().displayName})`);
            });

        } catch (err) {
            console.log('❌ Collection access ERROR:', err.message);
        }

        return true;

    } catch (error) {
        console.error('💥 DEBUG ACCESS FAILED:', error);
        return false;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    window.debugExactAccess = debugExactAccess;
    console.log('🔍 Debug Exact Access loaded. Run: debugExactAccess()');
}