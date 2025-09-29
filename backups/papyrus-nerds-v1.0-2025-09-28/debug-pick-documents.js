#!/usr/bin/env node

/**
 * 🔍 DEBUG INDIVIDUAL PICK DOCUMENTS
 * Figure out why batch processing returns 0 but exploration finds data
 */

const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugPickDocuments() {
  console.log('🔍 DEBUGGING INDIVIDUAL PICK DOCUMENTS\n');

  try {
    // Step 1: Get pool members
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    const poolDoc = await db.doc(poolMembersPath).get();
    const poolData = poolDoc.data();
    const allUserIds = Object.keys(poolData);

    console.log(`1️⃣ Pool members: ${allUserIds.length} users`);

    // Step 2: Test specific users we know should have data
    const usersWithEmbeddedData = [];
    for (const userId of allUserIds) {
      const userData = poolData[userId];
      if (userData.survivor) {
        usersWithEmbeddedData.push({
          userId,
          name: userData.displayName,
          survivor: userData.survivor
        });
      }
    }

    console.log(`\n2️⃣ Users with embedded survivor data: ${usersWithEmbeddedData.length}`);
    usersWithEmbeddedData.forEach(user => {
      console.log(`   ${user.name} (${user.userId.substring(0,8)}): ${user.survivor.pickHistory}`);
    });

    // Step 3: Test individual pick documents for these specific users
    console.log('\n3️⃣ Testing individual pick documents for embedded data users...');

    for (const user of usersWithEmbeddedData) {
      const userPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${user.userId}`;

      try {
        const userPicksDoc = await db.doc(userPicksPath).get();

        if (userPicksDoc.exists) {
          const picksData = userPicksDoc.data();
          console.log(`   ✅ ${user.name}: HAS INDIVIDUAL PICK DOCUMENT`);
          console.log(`      Path: ${userPicksPath}`);
          console.log(`      Data:`, JSON.stringify(picksData, null, 2));
        } else {
          console.log(`   ❌ ${user.name}: NO INDIVIDUAL PICK DOCUMENT`);
          console.log(`      Path: ${userPicksPath}`);
        }
      } catch (error) {
        console.log(`   💥 ${user.name}: ERROR accessing pick document`);
        console.log(`      Error: ${error.message}`);
      }
    }

    // Step 4: Test first 10 pool members for individual picks
    console.log('\n4️⃣ Testing first 10 pool members for individual pick documents...');

    const first10Users = allUserIds.slice(0, 10);
    for (const userId of first10Users) {
      const userData = poolData[userId];
      const userPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;

      try {
        const userPicksDoc = await db.doc(userPicksPath).get();

        if (userPicksDoc.exists) {
          const picksData = userPicksDoc.data();
          console.log(`   ✅ ${userData.displayName} (${userId.substring(0,8)}): HAS PICKS`);
          if (picksData.picks) {
            Object.keys(picksData.picks).forEach(week => {
              console.log(`      Week ${week}: ${picksData.picks[week].team}`);
            });
          }
        } else {
          console.log(`   ❌ ${userData.displayName} (${userId.substring(0,8)}): NO PICKS`);
        }
      } catch (error) {
        console.log(`   💥 ${userData.displayName}: ERROR - ${error.message}`);
      }
    }

    // Step 5: Count total individual pick documents
    console.log('\n5️⃣ Counting total individual pick documents...');

    let totalPickDocs = 0;
    let usersWithPicks = [];

    for (const userId of allUserIds) {
      const userPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;

      try {
        const userPicksDoc = await db.doc(userPicksPath).get();

        if (userPicksDoc.exists) {
          totalPickDocs++;
          const userData = poolData[userId];
          const picksData = userPicksDoc.data();

          usersWithPicks.push({
            name: userData.displayName,
            userId: userId.substring(0,8),
            picks: picksData.picks || {}
          });
        }
      } catch (error) {
        // Skip errors for this count
      }
    }

    console.log(`   📊 Total users with individual pick documents: ${totalPickDocs}/${allUserIds.length}`);

    if (usersWithPicks.length > 0) {
      console.log('\n6️⃣ ALL USERS WITH INDIVIDUAL PICK DOCUMENTS:');
      usersWithPicks.forEach(user => {
        const weekCount = Object.keys(user.picks).length;
        const teams = Object.values(user.picks).map(pick => pick.team).join(', ');
        console.log(`   ${user.name} (${user.userId}): ${weekCount} weeks - ${teams}`);
      });

      // Count by week
      const weekCounts = {};
      usersWithPicks.forEach(user => {
        Object.keys(user.picks).forEach(week => {
          weekCounts[week] = (weekCounts[week] || 0) + 1;
        });
      });

      console.log('\n7️⃣ PICKS BY WEEK:');
      Object.keys(weekCounts).sort().forEach(week => {
        console.log(`   Week ${week}: ${weekCounts[week]} users made picks`);
      });
    }

    return {
      totalUsers: allUserIds.length,
      embeddedSurvivorUsers: usersWithEmbeddedData.length,
      individualPickUsers: totalPickDocs,
      success: true
    };

  } catch (error) {
    console.error('💥 DEBUG ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  debugPickDocuments().then((result) => {
    if (result.success) {
      console.log('\n🔍 Debug analysis completed!');
      console.log(`📊 Summary: ${result.totalUsers} total users, ${result.embeddedSurvivorUsers} with embedded data, ${result.individualPickUsers} with individual picks`);
      process.exit(0);
    } else {
      console.log('\n💥 Debug analysis failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Debug error:', error);
    process.exit(1);
  });
}

module.exports = { debugPickDocuments };