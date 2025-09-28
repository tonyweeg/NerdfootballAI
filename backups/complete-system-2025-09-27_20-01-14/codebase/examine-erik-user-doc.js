#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function examineErikUserDocument() {
  console.log('🔍 EXAMINING ERIK WEEG\'S COMPLETE USER DOCUMENT\n');

  try {
    // First, get pool members to find Erik's user ID
    console.log('📡 Loading pool members data...');
    const poolMembersDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();

    if (!poolMembersDoc.exists) {
      console.error('❌ Pool members document not found');
      return;
    }

    const poolMembers = poolMembersDoc.data();
    console.log(`✅ Loaded data for ${Object.keys(poolMembers).length} pool members`);

    // Search for Erik Weeg
    let erikUserId = null;
    let erikData = null;

    for (const [userId, memberData] of Object.entries(poolMembers)) {
      if (memberData.displayName && memberData.displayName.toLowerCase().includes('erik')) {
        if (memberData.displayName.toLowerCase().includes('weeg') ||
            (memberData.email && memberData.email.toLowerCase().includes('weeg'))) {
          erikUserId = userId;
          erikData = memberData;
          console.log(`🎯 Found Erik Weeg! User ID: ${userId}`);
          break;
        }
      }
    }

    if (!erikData) {
      console.log('🔍 Erik Weeg not found by name. Available members:');
      Object.entries(poolMembers).forEach(([userId, member]) => {
        console.log(`  - ${member.displayName || 'Unknown'} (${member.email || 'No email'}) [${userId}]`);
      });
      return;
    }

    console.log('\n🔍 ERIK WEEG\'S COMPLETE USER DOCUMENT:');
    console.log('=========================================');
    console.log(`User ID: ${erikUserId}`);
    console.log(`Display Name: ${erikData.displayName}`);
    console.log(`Email: ${erikData.email}`);
    console.log(`Joined: ${erikData.joined}`);
    console.log(`Admin: ${erikData.admin || false}`);

    console.log('\n📄 COMPLETE DATA STRUCTURE:');
    console.log('============================');
    console.log(JSON.stringify(erikData, null, 2));

    // Analyze survivor data specifically
    if (erikData.survivor) {
      console.log('\n🏆 SURVIVOR DATA ANALYSIS:');
      console.log('==========================');
      console.log(`Alive: ${erikData.survivor.alive}`);
      console.log(`Total Picks: ${erikData.survivor.totalPicks}`);
      console.log(`Pick History: "${erikData.survivor.pickHistory}"`);
      console.log(`Elimination Week: ${erikData.survivor.eliminationWeek}`);
      console.log(`Last Updated: ${erikData.survivor.lastUpdated}`);

      if (erikData.survivor.pickHistory) {
        const picks = erikData.survivor.pickHistory.split(', ').filter(pick => pick && pick.trim());
        console.log('\n📊 PICK BREAKDOWN:');
        console.log('==================');
        picks.forEach((pick, index) => {
          console.log(`  Week ${index + 1}: "${pick.trim()}"`);
        });
        console.log(`\nTotal Parsed Picks: ${picks.length}`);
        console.log(`Total Picks Field: ${erikData.survivor.totalPicks}`);
      }
    } else {
      console.log('\n❌ No survivor data found for Erik Weeg');
    }

    // Check confidence pool data
    if (erikData.confidence) {
      console.log('\n💪 CONFIDENCE POOL DATA:');
      console.log('========================');
      console.log(JSON.stringify(erikData.confidence, null, 2));
    } else {
      console.log('\n❌ No confidence pool data found');
    }

    // Check any other data fields
    console.log('\n🔍 ALL DATA FIELDS:');
    console.log('===================');
    Object.keys(erikData).forEach(key => {
      console.log(`  - ${key}: ${typeof erikData[key]}`);
    });

  } catch (error) {
    console.error('❌ Error examining Erik user document:', error);
  }

  process.exit(0);
}

examineErikUserDocument();