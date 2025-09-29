#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkYourPicks() {
  try {
    console.log('🔍 Checking YOUR survivor picks...');

    // Your user ID
    const yourUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Ållfåther

    // Check in the original survivor picks collection
    const yourPicksDoc = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').collection('nerdSurvivor_picks').doc(yourUserId).get();

    if (yourPicksDoc.exists) {
      const pickData = yourPicksDoc.data();
      console.log('✅ FOUND your picks document!');
      console.log('📋 Full document:', JSON.stringify(pickData, null, 2));

      if (pickData.picks) {
        console.log('\n📊 Your picks by week:');
        Object.entries(pickData.picks).forEach(([week, pick]) => {
          console.log(`   Week ${week}: ${pick.team || 'No team'} ${pick.gameId ? `(Game ID: ${pick.gameId})` : ''}`);
        });

        // Specifically answer your question
        console.log('\n🎯 ANSWERS TO YOUR QUESTIONS:');

        const week1Pick = pickData.picks['1'];
        if (week1Pick) {
          console.log(`   Week 1: You picked ${week1Pick.team}`);
        } else {
          console.log('   Week 1: NO PICK FOUND');
        }

        const week2Pick = pickData.picks['2'];
        if (week2Pick) {
          console.log(`   Week 2: You picked ${week2Pick.team}`);
        } else {
          console.log('   Week 2: NO PICK FOUND');
        }

      } else {
        console.log('❌ No picks field in document');
      }
    } else {
      console.log('❌ NO picks document found for you');
      console.log(`   Searched: artifacts/nerdfootball/public/data/nerdSurvivor_picks/${yourUserId}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkYourPicks().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
});