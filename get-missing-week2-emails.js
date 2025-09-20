const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function getMissingWeek2UserEmails() {
  console.log('🔍 GETTING EMAIL ADDRESSES FOR USERS MISSING WEEK 2 PICKS\n');

  const poolId = 'nerduniverse-2025';

  // Users identified as missing Week 2 picks from battlefield.html analysis
  const missingWeek2Users = [
    'Chuck Upshur',
    'David Dulany',
    'Douglas Reynolds',
    'Frank Hanna',
    'Lisa Guerrieri',
    'Player UiQyobvi',
    'Player W4vHtFBw',
    'Player ZiDHeqIM',
    'Trae Anderson',
    'Wholeeoh'
  ];

  try {
    // Get pool members
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (poolDoc.exists) {
      const poolData = poolDoc.data();
      console.log(`📊 Searching ${Object.keys(poolData).length} pool members for missing Week 2 users...\n`);

      const results = [];

      // Find each missing user and get their email
      missingWeek2Users.forEach(targetName => {
        let found = false;

        for (const [uid, user] of Object.entries(poolData)) {
          const displayName = (user.displayName || '').trim();

          if (displayName === targetName) {
            results.push({
              name: displayName,
              email: user.email || 'No email found',
              uid: uid,
              week1Pick: user.survivor?.pickHistory || 'No picks'
            });
            found = true;
            break;
          }
        }

        if (!found) {
          results.push({
            name: targetName,
            email: 'USER NOT FOUND',
            uid: 'N/A',
            week1Pick: 'N/A'
          });
        }
      });

      // Display results
      console.log('🚨 USERS MISSING WEEK 2 PICKS (WITH EMAIL ADDRESSES):\n');
      results.forEach((user, index) => {
        const week1Team = user.week1Pick.split(',')[0]?.trim() || 'No Week 1 pick';
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Week 1: ${week1Team}, NO Week 2, NO 🤔`);
        console.log(`   UID: ${user.uid}\n`);
      });

    } else {
      console.log('❌ Pool members document not found');
    }

  } catch (error) {
    console.error('Error getting user emails:', error);
  }
}

getMissingWeek2UserEmails().then(() => {
  console.log('✅ Email extraction complete');
  process.exit(0);
}).catch(error => {
  console.error('Email extraction failed:', error);
  process.exit(1);
});