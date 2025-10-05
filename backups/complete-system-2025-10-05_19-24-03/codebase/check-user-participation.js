const admin = require('firebase-admin');
const serviceAccount = require('./nerdfootball-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUserParticipation() {
    const userId = 'XAEvbGQ77bWsbo9WuTkJhdMUIAH2';
    const poolId = 'nerduniverse-2025';
    
    try {
        // Check pool members document
        const membersRef = db.doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`);
        const membersDoc = await membersRef.get();
        
        if (!membersDoc.exists) {
            console.log('Members document not found');
            return;
        }
        
        const members = membersDoc.data();
        const userMember = members[userId];
        
        if (!userMember) {
            console.log(`User ${userId} not found in pool members`);
            return;
        }
        
        console.log(`\n✅ User Found: ${userMember.displayName || userMember.email}`);
        console.log('\n📊 Participation Status:');
        
        if (userMember.participation) {
            console.log('  Confidence Pool:', userMember.participation.confidence?.enabled ? '✅ ENABLED' : '❌ DISABLED');
            console.log('  Survivor Pool:', userMember.participation.survivor?.enabled ? '✅ ENABLED' : '❌ DISABLED');
            
            if (userMember.participation.metadata) {
                const meta = userMember.participation.metadata;
                if (meta.confidenceRemovedAt) {
                    console.log(`  Removed from Confidence: ${meta.confidenceRemovedAt}`);
                    console.log(`  Removed by: ${meta.confidenceRemovedBy}`);
                }
                if (meta.survivorRemovedAt) {
                    console.log(`  Removed from Survivor: ${meta.survivorRemovedAt}`);
                    console.log(`  Removed by: ${meta.survivorRemovedBy}`);
                }
            }
        } else {
            console.log('  No participation data (defaults to both enabled)');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
    
    process.exit(0);
}

checkUserParticipation();