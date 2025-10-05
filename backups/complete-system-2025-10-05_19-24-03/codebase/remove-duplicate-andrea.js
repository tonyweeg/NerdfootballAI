const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function removeDuplicateAndrea() {
    const poolPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
    const poolDoc = await db.doc(poolPath).get();
    const poolMembers = poolDoc.data();

    const duplicateId = 'xcmGnVAuQ5duZ3uDoU9NwlpHn0h1'; // Andrea Weeg (ghost with no picks)
    const realId = 'bEVzcZtSExT8cIjamWnGbWZ3J5s1'; // NerdMamma (real user with picks)

    console.log('\n=== REMOVING DUPLICATE ANDREA ===\n');

    if (poolMembers[duplicateId]) {
        console.log('✅ Found duplicate Andrea Weeg:', poolMembers[duplicateId]);
        console.log('\nRemoving from pool members...');
        
        delete poolMembers[duplicateId];
        
        await db.doc(poolPath).set(poolMembers);
        console.log('✅ Duplicate removed successfully!');
        
        console.log('\n✅ Real Andrea (NerdMamma) still in pool:', poolMembers[realId].name);
    } else {
        console.log('❌ Duplicate not found in pool members');
    }

    process.exit(0);
}

removeDuplicateAndrea();
