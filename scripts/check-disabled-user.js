const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkDisabledUser() {
    try {
        const userId = 'XAEvbGQ77bWsbo9WuTkJhdMUIAH2';
        console.log('Checking user:', userId);
        
        // Check pool members
        const poolId = 'nerduniverse-2025';
        const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
        const membersDoc = await db.doc(poolMembersPath).get();
        
        if (membersDoc.exists) {
            const members = membersDoc.data();
            const user = members[userId];
            
            console.log('\nPool Member Data:');
            console.log(JSON.stringify(user, null, 2));
        }
        
        // Check if there's a pools config
        const poolsConfigPath = `artifacts/nerdfootball/pools/${poolId}/metadata/config`;
        const configDoc = await db.doc(poolsConfigPath).get();
        
        if (configDoc.exists) {
            console.log('\nPool Config Data:');
            console.log(JSON.stringify(configDoc.data(), null, 2));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDisabledUser();
