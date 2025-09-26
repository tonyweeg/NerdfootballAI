// 🔍 Investigate phantom user 6FYtDM1p9vOpLFbSkRjBGaqayzm1
const admin = require('firebase-admin');

async function investigatePhantomUser() {
    console.log('🔍 INVESTIGATING PHANTOM USER: 6FYtDM1p9vOpLFbSkRjBGaqayzm1');
    
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'nerdfootball'
        });
    }
    const db = admin.firestore();
    
    const phantomUserId = '6FYtDM1p9vOpLFbSkRjBGaqayzm1';
    
    try {
        console.log('\n📍 1. Checking Firebase Users collection...');
        const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
        const userDoc = await db.collection(usersPath).doc(phantomUserId).get();
        
        if (userDoc.exists) {
            console.log('✅ FOUND in Firebase Users collection:');
            console.log(JSON.stringify(userDoc.data(), null, 2));
        } else {
            console.log('❌ NOT FOUND in Firebase Users collection');
        }
        
        console.log('\n📍 2. Checking Pool Members...');
        const poolId = 'nerduniverse-2025';
        const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
        const poolMembersDoc = await db.doc(poolMembersPath).get();
        
        if (poolMembersDoc.exists) {
            const poolMembers = poolMembersDoc.data();
            if (poolMembers[phantomUserId]) {
                console.log('✅ FOUND in Pool Members:');
                console.log(JSON.stringify(poolMembers[phantomUserId], null, 2));
            } else {
                console.log('❌ NOT FOUND in Pool Members');
            }
            
            console.log(`\n📊 Pool has ${Object.keys(poolMembers).length} total members`);
        }
        
        console.log('\n📍 3. Checking Firebase Authentication...');
        try {
            const authUser = await admin.auth().getUser(phantomUserId);
            console.log('✅ FOUND in Firebase Auth:');
            console.log(`  Display Name: ${authUser.displayName || 'N/A'}`);
            console.log(`  Email: ${authUser.email || 'N/A'}`);
            console.log(`  Creation Time: ${authUser.metadata.creationTime}`);
            console.log(`  Last Sign In: ${authUser.metadata.lastSignInTime || 'Never'}`);
            console.log(`  Providers: ${authUser.providerData.map(p => p.providerId).join(', ')}`);
        } catch (authError) {
            console.log('❌ NOT FOUND in Firebase Auth:', authError.message);
        }
        
        console.log('\n📍 4. Searching all Firestore collections for this user...');
        
        // Check various other possible locations
        const possiblePaths = [
            'artifacts/nerdfootball/pools',
            'artifacts/nerdfootball/public/data',
            'users',
            'pool_members'
        ];
        
        for (const path of possiblePaths) {
            try {
                console.log(`\n   Checking ${path}...`);
                const snapshot = await db.collection(path).get();
                let found = false;
                
                snapshot.docs.forEach(doc => {
                    if (doc.id === phantomUserId || 
                        JSON.stringify(doc.data()).includes(phantomUserId)) {
                        console.log(`   ✅ FOUND in ${path}/${doc.id}:`, doc.data());
                        found = true;
                    }
                });
                
                if (!found) {
                    console.log(`   ❌ Not found in ${path}`);
                }
            } catch (error) {
                console.log(`   ⚠️ Could not check ${path}: ${error.message}`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🔍 PHANTOM USER INVESTIGATION COMPLETE');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('💥 INVESTIGATION ERROR:', error);
    }
}

investigatePhantomUser()
    .then(() => {
        console.log('\n🏁 Investigation complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });