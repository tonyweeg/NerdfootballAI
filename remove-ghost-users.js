const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function removeGhostUsers() {
  console.log('🚨 REMOVING GHOST USERS FROM POOL MEMBERS\n');

  const poolId = 'nerduniverse-2025';
  const ghostUIDs = [
    'W4vHtFBwjoMhW4nK8TRXo1zutBq2', // Player W4vHtFBw - TRUE ghost user
    'ZiDHeqIMF1g3DvYDRdaPNy6aX8u2'  // Player ZiDHeqIM - TRUE ghost user
    // NOTE: UiQyobvibJgXwEexUj6AhaUUg7P2 (James Stewart) preserved - legitimate user
  ];

  try {
    // Get pool members document
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      console.log('❌ Pool members document not found');
      return;
    }

    const poolData = poolDoc.data();
    console.log(`📊 Pool has ${Object.keys(poolData).length} members before removal\n`);

    // Remove each ghost user
    let removedCount = 0;
    ghostUIDs.forEach(ghostUID => {
      if (poolData[ghostUID]) {
        console.log(`🗑️ Removing ghost user: ${ghostUID} (Player ${ghostUID.substring(0, 8)})`);
        console.log(`   Data being removed:`, JSON.stringify(poolData[ghostUID], null, 2));
        delete poolData[ghostUID];
        removedCount++;
        console.log('');
      } else {
        console.log(`⚠️ Ghost user ${ghostUID} not found in pool members`);
      }
    });

    if (removedCount > 0) {
      // Update the pool members document
      await db.doc(poolMembersPath).set(poolData);
      console.log(`✅ Removed ${removedCount} ghost users from pool members`);
      console.log(`📊 Pool now has ${Object.keys(poolData).length} members`);
    } else {
      console.log('ℹ️ No ghost users found to remove');
    }

  } catch (error) {
    console.error('❌ Error removing ghost users:', error);
  }
}

// SAFETY CHECK - confirm before running
console.log('⚠️ THIS WILL PERMANENTLY REMOVE 2 TRUE GHOST USERS FROM THE POOL');
console.log('⚠️ Users to be removed:');
console.log('   - W4vHtFBwjoMhW4nK8TRXo1zutBq2 (Player W4vHtFBw) - TRUE ghost');
console.log('   - ZiDHeqIMF1g3DvYDRdaPNy6aX8u2 (Player ZiDHeqIM) - TRUE ghost');
console.log('');
console.log('✅ PRESERVED: UiQyobvibJgXwEexUj6AhaUUg7P2 (James Stewart) - legitimate user');
console.log('');
console.log('🚨 RUN THIS SCRIPT TO PROCEED WITH 2-USER REMOVAL');

removeGhostUsers().then(() => {
  console.log('✅ Ghost user removal complete');
  process.exit(0);
}).catch(error => {
  console.error('Ghost user removal failed:', error);
  process.exit(1);
});