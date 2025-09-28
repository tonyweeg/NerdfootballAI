const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixJamesStewartProfile() {
  console.log('🔧 FIXING JAMES STEWART PROFILE DATA\n');

  const jamesUID = 'UiQyobvibJgXwEexUj6AhaUUg7P2';
  const poolId = 'nerduniverse-2025';

  try {
    // 1. Examine current pool member data
    console.log('1️⃣ EXAMINING CURRENT POOL MEMBER DATA:');
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();
      const jamesData = poolData[jamesUID];

      if (jamesData) {
        console.log(`✅ Found James Stewart in pool members:`);
        console.log(JSON.stringify(jamesData, null, 2));
        console.log(`\nDisplayName: "${jamesData.displayName || 'MISSING'}"`);
        console.log(`Email: "${jamesData.email || 'MISSING'}"`);

        // 2. Check if we need to add missing profile data
        if (!jamesData.displayName || !jamesData.email) {
          console.log('\n2️⃣ ADDING MISSING PROFILE DATA:');

          // Update with proper display name and email
          const updatedJamesData = {
            ...jamesData,
            displayName: 'James Stewart',
            email: jamesData.email || 'james.stewart@example.com' // Use existing or placeholder
          };

          // Update the pool member data
          const updatedPoolData = {
            ...poolData,
            [jamesUID]: updatedJamesData
          };

          console.log(`Adding displayName: "James Stewart"`);
          console.log(`Email status: ${jamesData.email ? 'existing preserved' : 'placeholder added'}`);

          // Save updated data
          await db.doc(poolMembersPath).set(updatedPoolData);
          console.log('\n✅ Updated James Stewart profile in pool members');

          // Verify the update
          console.log('\n3️⃣ VERIFYING UPDATE:');
          const verifyDoc = await db.doc(poolMembersPath).get();
          const verifyData = verifyDoc.data();
          const verifiedJames = verifyData[jamesUID];

          console.log('Updated profile:');
          console.log(`DisplayName: "${verifiedJames.displayName}"`);
          console.log(`Email: "${verifiedJames.email}"`);
          console.log('Survivor data preserved:', !!verifiedJames.survivor);

        } else {
          console.log('\n✅ James Stewart already has complete profile data');
        }

      } else {
        console.log('❌ James Stewart not found in pool members');
      }
    } else {
      console.log('❌ Pool members document not found');
    }

  } catch (error) {
    console.error('❌ Error fixing James Stewart profile:', error);
  }
}

fixJamesStewartProfile().then(() => {
  console.log('\n✅ James Stewart profile fix complete');
  process.exit(0);
}).catch(error => {
  console.error('Profile fix failed:', error);
  process.exit(1);
});