const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'nerdfootball'
    });
}

const db = admin.firestore();

async function debugChuckUpshurData() {
    try {
        console.log('🔍 Investigating Chuck Upshur\'s survivor data...');

        // Access pool members
        const poolId = 'nerduniverse-2025';
        const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

        console.log(`📍 Accessing: ${poolMembersPath}`);
        const membersDoc = await db.doc(poolMembersPath).get();

        if (!membersDoc.exists) {
            console.log('❌ Pool members document not found');
            return;
        }

        const membersData = membersDoc.data();
        console.log('👥 Pool members found:', Object.keys(membersData || {}));

        // Find Chuck Upshur in the members
        let chuckUID = null;
        let chuckData = null;

        for (const [uid, userData] of Object.entries(membersData || {})) {
            if (userData.displayName && userData.displayName.toLowerCase().includes('chuck upshur')) {
                chuckUID = uid;
                chuckData = userData;
                break;
            }
        }

        if (!chuckUID) {
            console.log('❌ Chuck Upshur not found in pool members');
            console.log('Available members:', Object.values(membersData || {}).map(u => u.displayName));
            return;
        }

        console.log(`✅ Found Chuck Upshur with UID: ${chuckUID}`);
        console.log('👤 Chuck\'s basic data:', JSON.stringify(chuckData, null, 2));

        // Now access Chuck's survivor data
        const survivorDataPath = `artifacts/nerdfootball/pools/${poolId}/games/survivor/users/${chuckUID}`;
        console.log(`📍 Accessing survivor data: ${survivorDataPath}`);

        const survivorDoc = await db.doc(survivorDataPath).get();

        if (!survivorDoc.exists) {
            console.log('❌ Chuck\'s survivor document not found');

            // Check if there's a collection instead
            const survivorCollection = db.collection(`artifacts/nerdfootball/pools/${poolId}/games/survivor/users/${chuckUID}`);
            const survivorSnapshot = await survivorCollection.get();

            if (!survivorSnapshot.empty) {
                console.log('📁 Found survivor subcollection with documents:');
                survivorSnapshot.forEach(doc => {
                    console.log(`  - ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
                });
            } else {
                console.log('❌ No survivor data found in subcollection either');
            }
            return;
        }

        const survivorData = survivorDoc.data();
        console.log('🏈 Chuck\'s survivor data:', JSON.stringify(survivorData, null, 2));

        // Analyze specific fields
        console.log('\n📊 DATA ANALYSIS:');
        console.log('================');
        console.log('pickHistory:', survivorData.pickHistory);
        console.log('totalPicks:', survivorData.totalPicks);
        console.log('alive:', survivorData.alive);
        console.log('eliminationWeek:', survivorData.eliminationWeek);

        // Check for picks in other locations
        console.log('\n🔍 Checking for picks data in other locations...');

        // Check picks subcollection
        const picksCollection = db.collection(`artifacts/nerdfootball/pools/${poolId}/games/survivor/users/${chuckUID}/picks`);
        const picksSnapshot = await picksCollection.get();

        if (!picksSnapshot.empty) {
            console.log('📁 Found picks in subcollection:');
            picksSnapshot.forEach(doc => {
                console.log(`  Week ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
            });
        } else {
            console.log('❌ No picks found in subcollection');
        }

        // Check for compiled survivor data
        const compiledSurvivorPath = `artifacts/nerdfootball/pools/${poolId}/games/survivor/compiledSurvivor`;
        console.log(`📍 Checking compiled survivor data: ${compiledSurvivorPath}`);

        const compiledDoc = await db.doc(compiledSurvivorPath).get();
        if (compiledDoc.exists) {
            const compiledData = compiledDoc.data();
            if (compiledData[chuckUID]) {
                console.log('📊 Chuck in compiled data:', JSON.stringify(compiledData[chuckUID], null, 2));
            } else {
                console.log('❌ Chuck not found in compiled data');
            }
        } else {
            console.log('❌ Compiled survivor document not found');
        }

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

debugChuckUpshurData();