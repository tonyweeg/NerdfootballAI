#!/usr/bin/env node

/**
 * 🎯 GENESIS EMBEDDED SURVIVOR DATA
 * Take the processed original survivor picks and create correct embedded data in user documents
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const { readOriginalSurvivorPicks } = require('./read-original-survivor-picks');

async function genesisEmbeddedSurvivorData() {
  console.log('🎯 GENESIS EMBEDDED SURVIVOR DATA FROM ORIGINAL PICKS\n');

  try {
    // Step 1: Get processed survivor data from original picks
    console.log('1️⃣ Processing original survivor picks...');
    const result = await readOriginalSurvivorPicks();

    if (!result.success) {
      throw new Error(`Failed to process original picks: ${result.error}`);
    }

    const { survivorData, summary } = result;
    console.log(`✅ Processed ${summary.totalProcessed} users from original picks`);
    console.log(`📊 Status: ${summary.stillAlive} alive, ${summary.eliminated} eliminated`);

    // Step 2: Load all pool members
    console.log('\n2️⃣ Loading all pool members...');
    const poolDoc = await db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members').get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }
    const poolMembers = poolDoc.data();
    const allUserIds = Object.keys(poolMembers);
    console.log(`✅ Found ${allUserIds.length} total pool members`);

    // Step 3: Create embedded data for ALL users
    console.log('\n3️⃣ Creating embedded survivor data for all users...');

    const updates = {};
    let usersWithPicks = 0;
    let usersWithoutPicks = 0;

    for (const userId of allUserIds) {
      const userData = poolMembers[userId];

      if (survivorData[userId]) {
        // User has survivor picks - use processed data
        const userSurvivor = survivorData[userId];
        updates[`${userId}.survivor`] = {
          alive: userSurvivor.alive,
          pickHistory: userSurvivor.pickHistory,
          totalPicks: userSurvivor.totalPicks,
          lastUpdated: userSurvivor.lastUpdated,
          manualOverride: false
        };
        usersWithPicks++;
        console.log(`   ✅ ${userData.displayName}: ${userSurvivor.alive === 18 ? 'ALIVE' : `ELIMINATED Week ${userSurvivor.alive}`} - "${userSurvivor.pickHistory}"`);
      } else {
        // User has no survivor picks - set default
        updates[`${userId}.survivor`] = {
          alive: 18,
          pickHistory: "",
          totalPicks: 0,
          lastUpdated: new Date().toISOString(),
          manualOverride: false
        };
        usersWithoutPicks++;
        console.log(`   📝 ${userData.displayName}: NO PICKS - defaulting to alive`);
      }
    }

    console.log(`\n📊 Processing summary:`);
    console.log(`   Users with picks: ${usersWithPicks}`);
    console.log(`   Users without picks: ${usersWithoutPicks}`);
    console.log(`   Total updates prepared: ${Object.keys(updates).length}`);

    // Step 4: Show preview of changes
    console.log('\n4️⃣ PREVIEW OF CHANGES:');

    // Show current vs new data for a few users
    const sampleUserIds = allUserIds.slice(0, 5);
    for (const userId of sampleUserIds) {
      const userData = poolMembers[userId];
      const currentSurvivor = userData.survivor || {};
      const newSurvivor = updates[`${userId}.survivor`];

      console.log(`\n   👤 ${userData.displayName}:`);
      console.log(`      CURRENT: alive=${currentSurvivor.alive || 'undefined'}, picks="${currentSurvivor.pickHistory || ''}"`);
      console.log(`      NEW:     alive=${newSurvivor.alive}, picks="${newSurvivor.pickHistory}"`);

      const hasChanges =
        currentSurvivor.alive !== newSurvivor.alive ||
        currentSurvivor.pickHistory !== newSurvivor.pickHistory ||
        currentSurvivor.totalPicks !== newSurvivor.totalPicks;

      console.log(`      CHANGES: ${hasChanges ? '✅ YES' : '❌ NO'}`);
    }

    // Step 5: Ask for confirmation (in real use, or auto-apply for testing)
    console.log('\n5️⃣ READY TO APPLY UPDATES...');
    console.log('   This will update the embedded survivor data for ALL 54 users');
    console.log('   Based on the ORIGINAL survivor picks from nerdSurvivor_picks collection');

    // For now, let's do a dry run and show what would be applied
    console.log('\n📋 DRY RUN - Would apply these updates:');

    // Show statistics
    const aliveUsers = Object.values(updates).filter(update => update.alive === 18);
    const eliminatedUsers = Object.values(updates).filter(update => update.alive < 18);
    const usersWithPicksCount = Object.values(updates).filter(update => update.totalPicks > 0);

    console.log(`\n📊 FINAL STATISTICS:`);
    console.log(`   Total users: ${Object.keys(updates).length}`);
    console.log(`   Still alive: ${aliveUsers.length}`);
    console.log(`   Eliminated: ${eliminatedUsers.length}`);
    console.log(`   With picks: ${usersWithPicksCount.length}`);
    console.log(`   Without picks: ${Object.keys(updates).length - usersWithPicksCount.length}`);

    return {
      success: true,
      updates,
      statistics: {
        totalUsers: Object.keys(updates).length,
        stillAlive: aliveUsers.length,
        eliminated: eliminatedUsers.length,
        withPicks: usersWithPicksCount.length,
        withoutPicks: Object.keys(updates).length - usersWithPicksCount.length
      }
    };

  } catch (error) {
    console.error('❌ ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to actually apply the updates (separate for safety)
async function applyEmbeddedDataUpdates(updates) {
  console.log('🔄 APPLYING EMBEDDED DATA UPDATES...');

  try {
    const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
    const poolRef = db.doc(poolMembersPath);

    await poolRef.update(updates);

    console.log('✅ Successfully updated embedded survivor data for all users');
    return { success: true };

  } catch (error) {
    console.error('❌ Update failed:', error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  genesisEmbeddedSurvivorData().then((result) => {
    if (result.success) {
      console.log('\n🎯 Genesis process completed successfully!');
      console.log('📋 Run with --apply flag to actually update the data');

      // Check if --apply flag is provided
      if (process.argv.includes('--apply')) {
        console.log('\n🔄 Applying updates...');
        return applyEmbeddedDataUpdates(result.updates);
      } else {
        console.log('\n💡 This was a DRY RUN. Add --apply to actually update data.');
        process.exit(0);
      }
    } else {
      console.log('\n💥 Genesis failed');
      process.exit(1);
    }
  }).then((applyResult) => {
    if (applyResult) {
      if (applyResult.success) {
        console.log('\n🎯 Data successfully updated!');
        process.exit(0);
      } else {
        console.log('\n💥 Update failed');
        process.exit(1);
      }
    }
  }).catch(error => {
    console.error('\n💥 Genesis error:', error);
    process.exit(1);
  });
}

module.exports = { genesisEmbeddedSurvivorData, applyEmbeddedDataUpdates };