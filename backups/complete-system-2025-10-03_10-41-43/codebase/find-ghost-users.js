const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findGhostUsers() {
  console.log('🔍 SEARCHING FOR GHOST USERS IN POOL MEMBERS\n');

  const poolId = 'nerduniverse-2025';

  try {
    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();
      console.log(`📊 Checking ${Object.keys(poolData).length} pool members for ghost users...\n`);

      const ghostUsers = [];
      const targetIds = ['UiQyobvi', 'W4vHtFBw', 'ZiDHeqIM'];

      // Find users with UIDs starting with our target IDs
      for (const [uid, user] of Object.entries(poolData)) {
        const first8 = uid.substring(0, 8);

        if (targetIds.includes(first8)) {
          ghostUsers.push({
            uid,
            first8,
            displayName: user.displayName || 'NO DISPLAY NAME',
            email: user.email || 'NO EMAIL',
            survivor: user.survivor ? 'HAS SURVIVOR DATA' : 'NO SURVIVOR DATA'
          });
        }

        // Also check for users with missing display names that would trigger fallback
        if (!user.displayName || !user.displayName.trim()) {
          if (!user.email || !user.email.trim()) {
            console.log(`🚨 GHOST USER FOUND: ${uid.substring(0, 8)} - NO NAME, NO EMAIL`);
            console.log(`   Full UID: ${uid}`);
            console.log(`   Data:`, JSON.stringify(user, null, 2));
            console.log('');
          }
        }
      }

      if (ghostUsers.length > 0) {
        console.log('🎯 FOUND MATCHING GHOST USERS:');
        ghostUsers.forEach(ghost => {
          console.log(`- UID: ${ghost.uid}`);
          console.log(`  First 8: ${ghost.first8} (matches Player ${ghost.first8})`);
          console.log(`  Display Name: ${ghost.displayName}`);
          console.log(`  Email: ${ghost.email}`);
          console.log(`  Survivor: ${ghost.survivor}`);
          console.log('');
        });
      } else {
        console.log('❌ No direct matches found for target IDs');
      }

    } else {
      console.log('❌ Pool members document not found');
    }

  } catch (error) {
    console.error('Error finding ghost users:', error);
  }
}

findGhostUsers().then(() => {
  console.log('✅ Ghost user search complete');
  process.exit(0);
}).catch(error => {
  console.error('Ghost user search failed:', error);
  process.exit(1);
});