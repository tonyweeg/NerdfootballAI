const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function auditPoolMembers() {
  try {
    const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
    const doc = await db.doc(poolMembersPath).get();

    if (doc.exists()) {
      const data = doc.data();
      const allMembers = Object.values(data);
      console.log('Total members found:', allMembers.length);

      // Show all keys for debugging
      console.log('All member keys:', Object.keys(data));

      const invalidMembers = [];
      allMembers.forEach((member, index) => {
        if (!member || !member.uid || member.uid === 'undefined') {
          console.log(`❌ Invalid member ${index}:`, JSON.stringify(member, null, 2));
          invalidMembers.push(member);
        }
      });

      const validMembers = allMembers.filter(member => member && member.uid && member.uid !== 'undefined');
      console.log('\n📊 Summary:');
      console.log('Valid members:', validMembers.length);
      console.log('Invalid members:', invalidMembers.length);

      if (invalidMembers.length > 0) {
        console.log('\n🔍 Invalid member details:');
        invalidMembers.forEach((member, index) => {
          console.log(`Invalid ${index + 1}:`, member);
        });
      }

    } else {
      console.log('Pool members document not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

auditPoolMembers();