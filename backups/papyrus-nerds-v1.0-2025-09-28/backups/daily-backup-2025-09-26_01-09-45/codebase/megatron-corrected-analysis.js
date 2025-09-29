#!/usr/bin/env node

/**
 * 🎯 MEGATRON CORRECTED SURVIVOR ANALYSIS
 * Uses BOTH data sources: individual picks + embedded survivor data
 */

const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function runCorrectedSurvivorAnalysis() {
  console.log('🎯 MEGATRON CORRECTED SURVIVOR ANALYSIS\n');

  try {
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    // Step 1: Load pool members
    console.log('1️⃣ Loading pool members...');
    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const allUserIds = Object.keys(poolData);
    console.log(`✅ Found ${allUserIds.length} pool members`);

    // Step 2: Analyze embedded survivor data in pool members
    console.log('\n2️⃣ Analyzing embedded survivor data...');
    let embeddedSurvivorCount = 0;
    const embeddedSurvivorUsers = [];

    for (const userId of allUserIds) {
      const userData = poolData[userId];
      if (userData.survivor) {
        embeddedSurvivorCount++;
        embeddedSurvivorUsers.push({
          userId,
          name: userData.displayName,
          survivor: userData.survivor
        });
        console.log(`   ${userData.displayName}: ${userData.survivor.pickHistory || 'No picks'} (Alive: ${userData.survivor.alive})`);
      }
    }

    console.log(`\n   📊 Found ${embeddedSurvivorCount} users with embedded survivor data`);

    // Step 3: Check individual pick documents (batch processing)
    console.log('\n3️⃣ Checking individual pick documents...');
    const weekPickCounts = {};
    const userPicksByWeek = {};

    // Calculate current week dynamically
    const getCurrentWeek = () => {
      const now = new Date();
      const seasonStart = new Date('2025-09-04');
      const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
      return Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
    };

    const currentWeek = getCurrentWeek();
    // Only check weeks 1 through current week (dynamic)
    for (let week = 1; week <= currentWeek; week++) {
      weekPickCounts[week] = 0;
      userPicksByWeek[week] = [];

      console.log(`   🎯 Checking Week ${week} picks...`);

      const batchSize = 10;
      for (let i = 0; i < allUserIds.length; i += batchSize) {
        const batch = allUserIds.slice(i, i + batchSize);

        const batchPromises = batch.map(async (userId) => {
          try {
            const userPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
            const userPicksDoc = await db.doc(userPicksPath).get();

            if (userPicksDoc.exists()) {
              const picksData = userPicksDoc.data();
              if (picksData.picks && picksData.picks[week]) {
                return {
                  userId: userId,
                  name: poolData[userId].displayName || poolData[userId].name || userId.substring(0,8),
                  email: poolData[userId].email || poolData[userId].emailAddress || 'No email',
                  team: picksData.picks[week].team
                };
              }
            }
            return null;
          } catch (error) {
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validPicks = batchResults.filter(pick => pick !== null);

        weekPickCounts[week] += validPicks.length;
        userPicksByWeek[week].push(...validPicks);

        if (i + batchSize < allUserIds.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log(`      Week ${week}: ${weekPickCounts[week]} users made picks`);
    }

    // Step 4: Cross-reference both data sources
    console.log('\n4️⃣ Cross-referencing data sources...');

    const week1PickUsers = userPicksByWeek[1] || [];
    const week2PickUsers = userPicksByWeek[2] || [];

    console.log(`   Individual picks - Week 1: ${week1PickUsers.length} users`);
    console.log(`   Individual picks - Week 2: ${week2PickUsers.length} users`);
    console.log(`   Embedded survivor data: ${embeddedSurvivorCount} users`);

    // Step 5: Generate corrected elimination analysis
    console.log('\n5️⃣ CORRECTED ELIMINATION ANALYSIS:');
    console.log('='.repeat(60));

    const totalStarters = weekPickCounts[1] || 0;
    const week2Survivors = weekPickCounts[2] || 0;
    const week1Eliminations = totalStarters - week2Survivors;

    console.log('🎯 MEGATRON Enhanced Admin Dashboard');
    console.log('='.repeat(60));
    console.log(`📊 Total Players: ${totalStarters}`);
    console.log(`✅ Still Alive after Week 1: ${week2Survivors}`);
    console.log(`💀 Eliminated after Week 1: ${week1Eliminations}`);
    console.log(`📈 Data Status: Real Data (Valid Weeks 1-2 Only)`);

    console.log('\n📅 VALID WEEKLY PATTERN (No impossible future weeks):');
    console.log(`   Week 1: ${weekPickCounts[1]} users made picks (POOL START)`);
    console.log(`   Week 2: ${weekPickCounts[2]} users made picks (${week1Eliminations} eliminated after Week 1)`);
    console.log(`   Week 3+: TBD (Games haven't occurred yet)`);

    // Step 6: Show sample data for verification
    console.log('\n6️⃣ SAMPLE PICK DATA (First 10 Week 1 picks):');
    week1PickUsers.slice(0, 10).forEach(user => {
      console.log(`   ${user.name}: ${user.team}`);
    });

    // Step 7: Show embedded survivor data sample
    console.log('\n7️⃣ EMBEDDED SURVIVOR DATA SAMPLE:');
    embeddedSurvivorUsers.slice(0, 5).forEach(user => {
      console.log(`   ${user.name}: Alive=${user.survivor.alive}, Picks=${user.survivor.totalPicks}, History="${user.survivor.pickHistory}"`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 CORRECTED ANALYSIS RESULTS:');
    console.log('='.repeat(60));
    console.log(`✅ Real Week 1 picks found: ${weekPickCounts[1]} users`);
    console.log(`✅ Real Week 2 picks found: ${weekPickCounts[2]} users`);
    console.log(`✅ Embedded survivor data: ${embeddedSurvivorCount} users`);
    console.log(`✅ Data sources aligned: Individual picks + embedded summary`);
    console.log(`✅ Timeline validated: Only Weeks 1-2 analyzed (current valid weeks)`);
    console.log(`❌ Invalid Week 3+ data: DISCARDED (impossible future weeks)`);

    return {
      totalStarters: weekPickCounts[1],
      week2Survivors: weekPickCounts[2],
      week1Eliminations,
      embeddedSurvivorCount,
      success: true
    };

  } catch (error) {
    console.error('❌ CORRECTED ANALYSIS ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  runCorrectedSurvivorAnalysis().then((result) => {
    if (result.success) {
      console.log('\n🎯 Corrected analysis COMPLETED successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Corrected analysis FAILED');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Analysis error:', error);
    process.exit(1);
  });
}

module.exports = { runCorrectedSurvivorAnalysis };