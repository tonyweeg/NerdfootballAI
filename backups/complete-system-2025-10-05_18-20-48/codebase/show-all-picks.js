#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function generatePickLists() {
  console.log('🎯 COMPREHENSIVE SURVIVOR PICK ANALYSIS\n');

  // Get pool members for name/email mapping
  const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
  const poolMembers = poolDoc.data();

  // Get all survivor picks
  const survivorPicksSnapshot = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').collection('nerdSurvivor_picks').get();

  const week1Picks = [];
  const week2Picks = [];
  const usersWithPicks = new Set();

  survivorPicksSnapshot.docs.forEach(doc => {
    const userId = doc.id;
    const data = doc.data();
    const userData = poolMembers[userId];

    if (data.picks) {
      usersWithPicks.add(userId);

      if (data.picks['1']) {
        week1Picks.push({
          userId,
          name: userData?.displayName || 'Unknown',
          email: userData?.email || 'Unknown',
          pick: data.picks['1'].team
        });
      }

      if (data.picks['2']) {
        week2Picks.push({
          userId,
          name: userData?.displayName || 'Unknown',
          email: userData?.email || 'Unknown',
          pick: data.picks['2'].team
        });
      }
    }
  });

  // Sort by name
  week1Picks.sort((a, b) => a.name.localeCompare(b.name));
  week2Picks.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`📊 WEEK 1 PICKS (${week1Picks.length} users):`);
  console.log('Name | Pick | Email');
  console.log('-----|------|------');
  week1Picks.forEach(p => {
    console.log(`${p.name} | ${p.pick} | ${p.email}`);
  });

  console.log(`\n📊 WEEK 2 PICKS (${week2Picks.length} users):`);
  console.log('Name | Pick | Email');
  console.log('-----|------|------');
  week2Picks.forEach(p => {
    console.log(`${p.name} | ${p.pick} | ${p.email}`);
  });

  // Find users without picks
  const allPoolMembers = Object.keys(poolMembers);
  const usersWithoutPicks = allPoolMembers.filter(userId => !usersWithPicks.has(userId));

  console.log(`\n📊 USERS WITHOUT PICKS (${usersWithoutPicks.length} users):`);
  console.log('Name | Email');
  console.log('-----|------');
  usersWithoutPicks.forEach(userId => {
    const userData = poolMembers[userId];
    console.log(`${userData?.displayName || 'Unknown'} | ${userData?.email || 'Unknown'}`);
  });

  console.log('\n📈 SUMMARY:');
  console.log(`Total pool members: ${allPoolMembers.length}`);
  console.log(`Users with survivor picks: ${usersWithPicks.size}`);
  console.log(`Users without survivor picks: ${usersWithoutPicks.length}`);
  console.log(`Week 1 picks: ${week1Picks.length}`);
  console.log(`Week 2 picks: ${week2Picks.length}`);
}

generatePickLists().then(() => process.exit(0)).catch(console.error);