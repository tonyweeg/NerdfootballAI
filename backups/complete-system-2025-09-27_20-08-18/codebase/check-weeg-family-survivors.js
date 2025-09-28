#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkWeegFamilySurvivors() {
  console.log('🔍 CHECKING ALL WEEG FAMILY SURVIVOR STATUSES...\n');

  const weegUIDs = [
    { uid: 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2', email: 'erweeg@gmail.com', name: 'Erik Weeg (likely)' },
    { uid: 'bEVzcZtSExT8cIjamWnGbWZ3J5s1', email: 'andreaweeg@gmail.com', name: 'Andrea Weeg' },
    { uid: 'ebBc70wNgMgIvIfG44jJupsMW0T2', email: 'jimweeg@comcast.net', name: 'Jim Weeg' },
    { uid: 'dTZoM31JtZRnSoelUz40axtOJou2', email: 'bweeg@walkerlaberge-md.com', name: 'B Weeg' }
  ];

  const poolId = 'nerduniverse-2025';

  try {
    for (const weegMember of weegUIDs) {
      console.log(`\n📊 ${weegMember.name} (${weegMember.email})`);
      console.log('='.repeat(50));

      const survivorPath = `artifacts/nerdfootball/pools/${poolId}/survivor/${weegMember.uid}`;
      const survivorDoc = await db.doc(survivorPath).get();

      if (survivorDoc.exists) {
        const survivorData = survivorDoc.data();

        console.log(`Status: ${survivorData.status}`);
        console.log(`Eliminated: ${survivorData.eliminated}`);
        console.log(`Eliminated Week: ${survivorData.eliminatedWeek || 'N/A'}`);
        console.log(`Week 1 Pick: ${survivorData.week1Pick || 'N/A'}`);
        console.log(`Week 2 Pick: ${survivorData.week2Pick || 'N/A'}`);

        // Critical analysis for Miami Dolphins pick
        if (survivorData.week1Pick === 'Miami Dolphins') {
          if (survivorData.status === 18 || !survivorData.eliminated) {
            console.log('❌ CRITICAL ISSUE: Picked Miami Dolphins (LOST Week 1) but still ALIVE!');
          } else {
            console.log('✅ CORRECT: Picked Miami Dolphins and properly eliminated');
          }
        } else if (survivorData.week1Pick) {
          console.log(`ℹ️  Week 1 pick: ${survivorData.week1Pick} (needs verification against results)`);
        }

      } else {
        console.log('❌ No survivor document found');
      }
    }

    // Now let's check ALL users who picked Miami Dolphins in Week 1
    console.log('\n🔍 SCANNING ALL SURVIVORS FOR MIAMI DOLPHINS PICKS...');
    console.log('='.repeat(60));

    const poolMembersDoc = await db.doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`).get();
    if (poolMembersDoc.exists) {
      const members = poolMembersDoc.data();
      let miamiPickersCount = 0;
      let miamiPickersAlive = 0;

      for (const [uid, member] of Object.entries(members)) {
        const survivorDoc = await db.doc(`artifacts/nerdfootball/pools/${poolId}/survivor/${uid}`).get();

        if (survivorDoc.exists) {
          const survivorData = survivorDoc.data();

          if (survivorData.week1Pick === 'Miami Dolphins') {
            miamiPickersCount++;
            console.log(`\n🐬 ${member.email || member.displayName}: Picked Miami Dolphins`);
            console.log(`   Status: ${survivorData.status}, Eliminated: ${survivorData.eliminated}`);

            if (survivorData.status === 18 || !survivorData.eliminated) {
              miamiPickersAlive++;
              console.log('   ❌ PROBLEM: Still showing as ALIVE!');
            } else {
              console.log('   ✅ Correctly eliminated');
            }
          }
        }
      }

      console.log(`\n📊 MIAMI DOLPHINS SUMMARY:`);
      console.log(`Total who picked Miami: ${miamiPickersCount}`);
      console.log(`Still incorrectly alive: ${miamiPickersAlive}`);

      if (miamiPickersAlive > 0) {
        console.log('❌ CRITICAL DATA INTEGRITY ISSUE: Need to eliminate Miami pickers!');
      } else {
        console.log('✅ All Miami pickers correctly eliminated');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWeegFamilySurvivors().then(() => {
  process.exit(0);
});