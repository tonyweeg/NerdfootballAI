#!/usr/bin/env node

/**
 * 🎯 DIRECT MEGATRON BATCH PROCESSING TEST
 * Tests the batch processing fix to prevent Firebase timeouts when processing 50+ users
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function testMegatronBatchProcessing() {
  console.log('🧪 TESTING MEGATRON BATCH PROCESSING FIX\n');

  try {
    // Step 1: Load pool members (should be 50+ users)
    console.log('1️⃣ Loading pool members...');
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      console.log('❌ Pool members not found');
      return false;
    }

    const poolData = poolDoc.data();
    const allUserIds = Object.keys(poolData);
    console.log(`✅ Found ${allUserIds.length} pool members`);

    // Step 2: Test batch processing approach
    console.log('\n2️⃣ Testing batch processing for Week 1 picks...');

    const batchSize = 10;
    let totalProcessed = 0;
    let picksFound = 0;
    let errors = 0;

    const startTime = Date.now();

    for (let i = 0; i < allUserIds.length; i += batchSize) {
      const batch = allUserIds.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      console.log(`   🔄 Processing batch ${batchNumber}: users ${i + 1}-${Math.min(i + batchSize, allUserIds.length)}`);

      try {
        const batchPromises = batch.map(async (userId) => {
          try {
            const pickPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
            const pickDoc = await db.doc(pickPath).get();

            if (pickDoc.exists) {
              const pickData = pickDoc.data();
              if (pickData.picks && pickData.picks['1']) {
                return { userId, pick: pickData.picks['1'], hasWeek1: true };
              }
            }
            return { userId, hasWeek1: false };
          } catch (error) {
            console.log(`     ⚠️ Error processing ${userId}: ${error.message}`);
            return { userId, error: error.message };
          }
        });

        const batchResults = await Promise.all(batchPromises);

        // Process results
        batchResults.forEach(result => {
          totalProcessed++;
          if (result.hasWeek1) {
            picksFound++;
            console.log(`     ✅ ${result.userId.substring(0,8)}: ${result.pick.team}`);
          } else if (result.error) {
            errors++;
          }
        });

        // Small delay between batches to avoid overwhelming Firebase
        if (i + batchSize < allUserIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (batchError) {
        console.log(`   ❌ Batch ${batchNumber} failed: ${batchError.message}`);
        errors++;
      }
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📊 BATCH PROCESSING TEST RESULTS:');
    console.log('='.repeat(60));
    console.log(`⏱️  Processing time: ${processingTime}ms`);
    console.log(`👥 Total users processed: ${totalProcessed}/${allUserIds.length}`);
    console.log(`🎯 Week 1 picks found: ${picksFound}`);
    console.log(`❌ Errors encountered: ${errors}`);
    console.log(`📈 Success rate: ${((totalProcessed - errors) / totalProcessed * 100).toFixed(1)}%`);

    if (processingTime < 30000 && errors === 0) {
      console.log('\n🎉 BATCH PROCESSING FIX SUCCESSFUL!');
      console.log('✅ No timeouts, all users processed efficiently');
      return true;
    } else {
      console.log('\n❌ BATCH PROCESSING NEEDS OPTIMIZATION');
      if (processingTime >= 30000) console.log('⚠️ Processing took too long (>30s)');
      if (errors > 0) console.log('⚠️ Errors encountered during processing');
      return false;
    }

  } catch (error) {
    console.error('💥 BATCH PROCESSING TEST FAILED:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testMegatronBatchProcessing().then((success) => {
    if (success) {
      console.log('\n🎯 Batch processing test PASSED');
      process.exit(0);
    } else {
      console.log('\n💥 Batch processing test FAILED');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testMegatronBatchProcessing };