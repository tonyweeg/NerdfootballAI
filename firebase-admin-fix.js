#!/usr/bin/env node

// Firebase Admin SDK Fix Script for Survivor Elimination Bug
// Executes batch fixes identified in the analysis

const admin = require('firebase-admin');
const fs = require('fs');

console.log('🔧 FIREBASE ADMIN SDK SURVIVOR FIX');
console.log('==================================');

// Initialize Firebase Admin SDK
let app;
try {
  app = admin.initializeApp({
    projectId: 'nerdfootball'
  });
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function executeBatchFixes() {
  try {
    // Read the batch fix operations
    if (!fs.existsSync('batch-fix-operations.json')) {
      console.log('❌ No batch fix operations found');
      console.log('Run firebase-admin-analysis.js first to identify issues');
      process.exit(1);
    }

    const fixOperations = JSON.parse(fs.readFileSync('batch-fix-operations.json', 'utf8'));

    if (fixOperations.length === 0) {
      console.log('✅ No fixes needed');
      return;
    }

    console.log(`\n🔧 EXECUTING ${fixOperations.length} FIX OPERATIONS`);
    console.log('===============================================');

    const results = [];

    for (let i = 0; i < fixOperations.length; i++) {
      const operation = fixOperations[i];
      console.log(`\n🔧 Fix ${i + 1}/${fixOperations.length}: ${operation.userId}`);
      console.log(`   Operation: ${operation.operation}`);
      console.log(`   Data:`, JSON.stringify(operation.data, null, 2));

      try {
        if (operation.operation === 'UPDATE') {
          const docRef = db.doc(operation.path);
          await docRef.update(operation.data);

          console.log(`   ✅ Successfully updated ${operation.userId}`);
          results.push({
            userId: operation.userId,
            status: 'SUCCESS',
            operation: operation.operation
          });
        }

      } catch (error) {
        console.error(`   ❌ Failed to update ${operation.userId}:`, error.message);
        results.push({
          userId: operation.userId,
          status: 'ERROR',
          operation: operation.operation,
          error: error.message
        });
      }
    }

    console.log('\n📊 BATCH FIX SUMMARY');
    console.log('====================');

    const successful = results.filter(r => r.status === 'SUCCESS').length;
    const failed = results.filter(r => r.status === 'ERROR').length;

    console.log(`Total operations: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log('\n❌ FAILED OPERATIONS:');
      results
        .filter(r => r.status === 'ERROR')
        .forEach(r => {
          console.log(`   ${r.userId}: ${r.error}`);
        });
    }

    // Save results
    fs.writeFileSync('fix-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Fix results saved to: fix-results.json');

    if (successful > 0) {
      console.log('\n🎉 FIXES APPLIED SUCCESSFULLY!');
      console.log('Next step: Run firebase-admin-verify.js to confirm fixes');
    }

  } catch (error) {
    console.error('❌ Batch fix failed:', error.message);
    console.error(error.stack);
  } finally {
    // Close the app
    await admin.app().delete();
  }
}

// Execute the fixes
executeBatchFixes().catch(console.error);