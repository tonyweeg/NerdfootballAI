#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function analyzeWeekWinners() {
  console.log('🎯 ANALYZING WEEK WINNERS FOR EMERGENCY DOCUMENT\n');

  // Get game results
  const week1Doc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/1').get();
  const week2Doc = await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/2').get();

  const week1Games = week1Doc.data();
  const week2Games = week2Doc.data();

  // Extract winners
  const week1Winners = Object.values(week1Games).map(game => game.winner);
  const week2Winners = Object.values(week2Games).map(game => game.winner);

  console.log('Week 1 Winners:', week1Winners);
  console.log('Week 2 Winners:', week2Winners);

  // Get pool members
  const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
  const poolMembers = poolDoc.data();

  // Get all picks
  const survivorPicksSnapshot = await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').collection('nerdSurvivor_picks').get();

  const week1Survivors = [];
  const week2Survivors = [];

  survivorPicksSnapshot.docs.forEach(doc => {
    const userId = doc.id;
    const data = doc.data();
    const userData = poolMembers[userId];

    if (data.picks) {
      // Week 1 analysis
      if (data.picks['1']) {
        const week1Pick = data.picks['1'].team;
        if (week1Winners.includes(week1Pick)) {
          week1Survivors.push({
            name: userData?.displayName || 'Unknown',
            team: week1Pick,
            survived: true
          });
        }
      }

      // Week 2 analysis (only if they made a Week 2 pick)
      if (data.picks['2']) {
        const week2Pick = data.picks['2'].team;
        if (week2Winners.includes(week2Pick)) {
          week2Survivors.push({
            name: userData?.displayName || 'Unknown',
            team: week2Pick,
            survived: true
          });
        }
      }
    }
  });

  // Sort by name
  week1Survivors.sort((a, b) => a.name.localeCompare(b.name));
  week2Survivors.sort((a, b) => a.name.localeCompare(b.name));

  console.log('\n📊 WEEK 1 SURVIVORS (' + week1Survivors.length + ' nerds):');
  week1Survivors.forEach(s => {
    console.log('  ' + s.name + ' with ' + s.team);
  });

  console.log('\n📊 WEEK 2 SURVIVORS (' + week2Survivors.length + ' nerds):');
  week2Survivors.forEach(s => {
    console.log('  ' + s.name + ' with ' + s.team);
  });

  return { week1Survivors, week2Survivors };
}

analyzeWeekWinners().then(() => process.exit(0)).catch(console.error);