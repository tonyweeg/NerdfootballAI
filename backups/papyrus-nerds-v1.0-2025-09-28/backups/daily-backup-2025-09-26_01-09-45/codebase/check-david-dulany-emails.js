const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkDavidDulanyEmails() {
  console.log('🔍 CHECKING DAVID DULANY EMAIL ADDRESSES\n');

  const davidDulanyUIDs = [
    'nKwmN2JLvQhD77W7TzZLv95mngS2',
    'XAEvbGQ77bWsbo9WuTkJhdMUIAH2'
  ];

  try {
    // Get pool members data
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();
      console.log('📧 DAVID DULANY EMAIL ADDRESSES:');

      davidDulanyUIDs.forEach((uid, index) => {
        const userData = poolData[uid];
        if (userData) {
          console.log(`${index + 1}. User ID: ${uid}`);
          console.log(`   Display Name: ${userData.displayName}`);
          console.log(`   Email: ${userData.email}`);
          console.log(`   Joined: ${userData.joinedAt}`);
          console.log(`   Role: ${userData.role}`);
          console.log('');
        } else {
          console.log(`❌ No data found for ${uid}`);
        }
      });

      // Also check Firebase Auth for additional details
      console.log('🔑 FIREBASE AUTH DETAILS:');
      for (const uid of davidDulanyUIDs) {
        try {
          const authUser = await admin.auth().getUser(uid);
          console.log(`User ID: ${uid}`);
          console.log(`   Auth Email: ${authUser.email}`);
          console.log(`   Auth Display Name: ${authUser.displayName || 'Not set'}`);
          console.log(`   Created: ${authUser.metadata.creationTime}`);
          console.log(`   Last Sign In: ${authUser.metadata.lastSignInTime || 'Never'}`);
          console.log('');
        } catch (authError) {
          console.log(`❌ Auth error for ${uid}: ${authError.message}`);
        }
      }

    } else {
      console.log('❌ Pool members document not found');
    }

  } catch (error) {
    console.error('Error checking David Dulany emails:', error);
  }
}

checkDavidDulanyEmails().then(() => {
  console.log('✅ Email check complete');
  process.exit(0);
}).catch(error => {
  console.error('Email check failed:', error);
  process.exit(1);
});