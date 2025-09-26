#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function auditWeek1SurvivorIntegrity() {
  console.log('🚨 CRITICAL AUDIT: Week 1 Survivor Pool Data Integrity\n');
  console.log('Checking for users marked alive who should be eliminated...\n');

  try {
    // Load pool members
    console.log('📡 Loading pool members data...');
    const poolMembersDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();

    if (!poolMembersDoc.exists) {
      console.error('❌ Pool members document not found');
      return;
    }

    const poolMembers = poolMembersDoc.data();
    console.log(`✅ Loaded data for ${Object.keys(poolMembers).length} pool members\n`);

    // Analyze all survivor participants
    const survivorParticipants = [];
    const week1Picks = {};

    console.log('👥 SURVIVOR POOL PARTICIPANTS:');
    console.log('==============================');

    for (const [userId, memberData] of Object.entries(poolMembers)) {
      if (memberData.survivor && memberData.participation?.survivor?.enabled) {
        survivorParticipants.push({
          userId,
          name: memberData.displayName,
          email: memberData.email,
          ...memberData.survivor
        });

        // Extract Week 1 pick
        let week1Pick = 'NO PICK';
        if (memberData.survivor.pickHistory) {
          const picks = memberData.survivor.pickHistory.split(', ').filter(pick => pick && pick.trim());
          if (picks.length > 0) {
            week1Pick = picks[0].trim();
          }
        }

        week1Picks[week1Pick] = (week1Picks[week1Pick] || 0) + 1;

        console.log(`${memberData.displayName}:`);
        console.log(`  UID: ${userId}`);
        console.log(`  Week 1 Pick: "${week1Pick}"`);
        console.log(`  Current Status: ${memberData.survivor.alive} (${memberData.survivor.alive === 18 ? 'ALIVE' : `ELIMINATED Week ${memberData.survivor.alive}`})`);
        console.log(`  Elimination Week: ${memberData.survivor.eliminationWeek || 'null'}`);
        console.log(`  Total Picks: ${memberData.survivor.totalPicks}`);
        console.log(`  Last Updated: ${memberData.survivor.lastUpdated}`);
        console.log('');
      }
    }

    console.log(`\n📊 WEEK 1 PICK SUMMARY:`);
    console.log('======================');
    console.log(`Total Survivor Participants: ${survivorParticipants.length}\n`);

    // Sort teams by pick count
    const sortedPicks = Object.entries(week1Picks)
      .sort(([,a], [,b]) => b - a);

    sortedPicks.forEach(([team, count]) => {
      console.log(`${team}: ${count} pick${count === 1 ? '' : 's'}`);
    });

    console.log(`\n🚨 CRITICAL DATA INTEGRITY ISSUES:`);
    console.log('==================================');

    // Check for users marked alive who might be eliminated
    const potentialIssues = survivorParticipants.filter(participant => {
      return participant.alive === 18 && participant.eliminationWeek === null;
    });

    console.log(`Found ${potentialIssues.length} users marked as ALIVE (status 18):`);
    potentialIssues.forEach(participant => {
      const week1Pick = participant.pickHistory ?
        participant.pickHistory.split(', ')[0]?.trim() || 'NO PICK' :
        'NO PICK';
      console.log(`  - ${participant.name}: Week 1 pick "${week1Pick}"`);
    });

    console.log(`\n⚠️  TEAMS THAT NEED WEEK 1 RESULT VERIFICATION:`);
    console.log('===============================================');
    sortedPicks.forEach(([team, count]) => {
      if (team !== 'NO PICK') {
        console.log(`${team} (${count} picks) - WINNER or LOSER?`);
      }
    });

    console.log(`\n🔍 NEXT STEPS:`);
    console.log('==============');
    console.log('1. Verify Week 1 game results for each team');
    console.log('2. Users who picked LOSING teams should be:');
    console.log('   - alive: changed to 1 (eliminated in week 1)');
    console.log('   - eliminationWeek: changed to 1');
    console.log('3. Users who picked WINNING teams should remain:');
    console.log('   - alive: 18 (still alive)');
    console.log('   - eliminationWeek: null');

    return {
      totalParticipants: survivorParticipants.length,
      week1Picks: sortedPicks,
      potentialIssues: potentialIssues.length,
      participantsData: survivorParticipants
    };

  } catch (error) {
    console.error('❌ Error during audit:', error);
  }
}

auditWeek1SurvivorIntegrity().then(() => {
  process.exit(0);
});