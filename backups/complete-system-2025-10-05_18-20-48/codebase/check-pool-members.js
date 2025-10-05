const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPoolMembers() {
    const userId = 'bEVzcZtSExT8cIjamWnGbWZ3J5s1'; // NerdMamma
    const poolId = 'nerduniverse-2025';

    try {
        const membersPath = 'artifacts/nerdfootball/pools/' + poolId + '/metadata/members';
        const membersDoc = await db.doc(membersPath).get();

        if (membersDoc.exists) {
            const poolMembers = membersDoc.data();
            console.log('\n👥 POOL MEMBERS:');
            console.log('Total members:', Object.keys(poolMembers).length);
            
            if (poolMembers[userId]) {
                console.log('\n✅ NerdMamma (' + userId + ') IS in pool:');
                console.log(JSON.stringify(poolMembers[userId], null, 2));
            } else {
                console.log('\n❌ NerdMamma (' + userId + ') is NOT in pool members');
                console.log('\nAvailable member IDs:');
                Object.keys(poolMembers).forEach(id => {
                    const member = poolMembers[id];
                    console.log('  - ' + id + ': ' + (member.name || member.email));
                });
            }
        } else {
            console.log('\n❌ NO POOL MEMBERS FOUND');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

checkPoolMembers();
