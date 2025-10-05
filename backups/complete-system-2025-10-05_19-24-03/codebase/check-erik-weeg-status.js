#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkErikWeegStatus() {
  console.log('🔍 CHECKING ERIK WEEG SURVIVOR STATUS...\n');

  try {
    // Erik Weeg's UID from previous conversation
    const erikUID = 'erik_weeg_uid'; // We need to find his actual UID

    // First, let's find Erik Weeg in the pool members
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolMembersDoc = await db.doc(poolMembersPath).get();

    if (poolMembersDoc.exists) {
      const members = poolMembersDoc.data();
      console.log('👥 POOL MEMBERS SEARCH:');

      // Look for Erik Weeg
      let erikMember = null;
      for (const [uid, member] of Object.entries(members)) {
        if (member.email && member.email.toLowerCase().includes('erik') && member.email.toLowerCase().includes('weeg')) {
          erikMember = { uid, ...member };
          console.log(`✅ Found Erik Weeg: ${member.email} (UID: ${uid})`);
          break;
        }
      }

      if (erikMember) {
        // Check his survivor status
        const survivorPath = `artifacts/nerdfootball/pools/${poolId}/survivor/${erikMember.uid}`;
        const survivorDoc = await db.doc(survivorPath).get();

        if (survivorDoc.exists) {
          const survivorData = survivorDoc.data();
          console.log('\n📊 ERIK WEEG SURVIVOR DATA:');
          console.log('============================');
          console.log(`Status: ${survivorData.status}`);
          console.log(`Eliminated: ${survivorData.eliminated}`);
          console.log(`Eliminated Week: ${survivorData.eliminatedWeek}`);
          console.log(`Week 1 Pick: ${survivorData.week1Pick}`);
          console.log(`Week 2 Pick: ${survivorData.week2Pick || 'N/A'}`);

          // Check specific status meanings
          if (survivorData.status === 18) {
            console.log('\n❌ PROBLEM: Status 18 = ALIVE - but he picked Miami who LOST Week 1!');
          } else if (survivorData.eliminated) {
            console.log('\n✅ CORRECT: Properly eliminated');
          } else {
            console.log('\n⚠️  UNCLEAR: Status needs verification');
          }

        } else {
          console.log('\n❌ No survivor document found for Erik Weeg');
        }

      } else {
        console.log('\n❌ Erik Weeg not found in pool members');

        // Let's search all users for anyone with "erik" or "weeg"
        console.log('\n🔍 Searching all pool members for Erik/Weeg...');
        for (const [uid, member] of Object.entries(members)) {
          const name = (member.displayName || member.email || '').toLowerCase();
          if (name.includes('erik') || name.includes('weeg')) {
            console.log(`   Possible match: ${member.email || member.displayName} (UID: ${uid})`);
          }
        }
      }

    } else {
      console.log('❌ Pool members document not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkErikWeegStatus().then(() => {
  process.exit(0);
});