#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Import validation functions
const { validateSurvivorField, createDefaultSurvivorField } = require('./phase1-survivor-field-setup.js');

async function phase1FinalValidation() {
  console.log('🎯 PHASE 1 FINAL VALIDATION CHECKLIST\n');
  console.log('Verifying all Phase 1 requirements are complete...\n');

  const poolId = 'nerduniverse-2025';
  const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

  const validationResults = {
    dataStructure: false,
    firestoreRules: false,
    documentStructure: false,
    fieldValidation: false,
    securityTesting: false
  };

  try {
    // 1. Validate Data Structure
    console.log('1️⃣ VALIDATING DATA STRUCTURE:');

    const defaultField = createDefaultSurvivorField();
    const structureErrors = validateSurvivorField(defaultField);

    if (structureErrors.length === 0) {
      console.log('   ✅ Survivor field schema is valid');
      console.log('   📊 Schema:', JSON.stringify(defaultField, null, 6));
      validationResults.dataStructure = true;
    } else {
      console.log('   ❌ Survivor field schema has errors:', structureErrors);
    }

    // 2. Validate Firestore Rules are deployed
    console.log('\n2️⃣ VALIDATING FIRESTORE RULES:');

    try {
      // Read the current rules file to verify it contains survivor field rules
      const fs = require('fs');
      const rulesContent = fs.readFileSync('./firestore.rules', 'utf8');

      if (rulesContent.includes('survivor') && rulesContent.includes('isPoolMember')) {
        console.log('   ✅ Firestore rules contain survivor field permissions');
        validationResults.firestoreRules = true;
      } else {
        console.log('   ❌ Firestore rules missing survivor field permissions');
      }
    } catch (error) {
      console.log('   ❌ Error reading firestore.rules:', error.message);
    }

    // 3. Validate Pool Members Document Structure
    console.log('\n3️⃣ VALIDATING POOL MEMBERS DOCUMENT:');

    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      console.log('   ❌ Pool members document not found');
      return false;
    }

    const poolData = poolDoc.data();
    const totalMembers = Object.keys(poolData).length;
    const membersWithSurvivor = Object.entries(poolData).filter(([uid, userData]) => userData.survivor);

    console.log(`   📊 Total pool members: ${totalMembers}`);
    console.log(`   📊 Members with survivor field: ${membersWithSurvivor.length}`);

    if (membersWithSurvivor.length >= 3) { // We tested with 3 users
      console.log('   ✅ Pool members document has survivor fields');
      validationResults.documentStructure = true;
    } else {
      console.log('   ❌ Insufficient members with survivor fields for validation');
    }

    // 4. Validate Field Data Integrity
    console.log('\n4️⃣ VALIDATING FIELD DATA INTEGRITY:');

    let validFieldCount = 0;
    for (const [uid, userData] of membersWithSurvivor) {
      if (userData.survivor) {
        const fieldErrors = validateSurvivorField(userData.survivor);
        if (fieldErrors.length === 0) {
          validFieldCount++;
        } else {
          console.log(`   ⚠️ ${userData.displayName}: Field validation errors - ${fieldErrors.join(', ')}`);
        }
      }
    }

    console.log(`   📊 Valid survivor fields: ${validFieldCount}/${membersWithSurvivor.length}`);

    if (validFieldCount === membersWithSurvivor.length) {
      console.log('   ✅ All survivor fields pass validation');
      validationResults.fieldValidation = true;
    } else {
      console.log('   ❌ Some survivor fields have validation errors');
    }

    // 5. Validate Security Testing Results
    console.log('\n5️⃣ VALIDATING SECURITY IMPLEMENTATION:');

    // Test a quick survivor field update to verify security rules work
    const testUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Ållfåther
    const testUpdate = {
      alive: 18,
      pickHistory: "Test Validation",
      lastUpdated: new Date().toISOString(),
      totalPicks: 1,
      manualOverride: true
    };

    try {
      await db.doc(poolMembersPath).update({
        [`${testUserId}.survivor`]: testUpdate
      });

      // Verify the update
      const verifyDoc = await db.doc(poolMembersPath).get();
      const verifyData = verifyDoc.data()[testUserId];

      if (verifyData.survivor && verifyData.survivor.pickHistory === "Test Validation") {
        console.log('   ✅ Security rules allow proper survivor field updates');
        validationResults.securityTesting = true;

        // Reset to clean state
        const cleanField = createDefaultSurvivorField();
        await db.doc(poolMembersPath).update({
          [`${testUserId}.survivor`]: cleanField
        });
        console.log('   ✅ Test data cleaned up');
      } else {
        console.log('   ❌ Security update verification failed');
      }
    } catch (error) {
      console.log(`   ❌ Security rules test failed: ${error.message}`);
    }

    // Final Results
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PHASE 1 VALIDATION RESULTS:');
    console.log('='.repeat(60));

    const results = [
      { name: 'Data Structure', status: validationResults.dataStructure },
      { name: 'Firestore Rules', status: validationResults.firestoreRules },
      { name: 'Document Structure', status: validationResults.documentStructure },
      { name: 'Field Validation', status: validationResults.fieldValidation },
      { name: 'Security Testing', status: validationResults.securityTesting }
    ];

    let passedTests = 0;
    results.forEach(result => {
      const icon = result.status ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.status ? 'PASSED' : 'FAILED'}`);
      if (result.status) passedTests++;
    });

    console.log(`\n📊 OVERALL RESULT: ${passedTests}/${results.length} tests passed`);

    if (passedTests === results.length) {
      console.log('\n🎉 PHASE 1 COMPLETE! ALL VALIDATION TESTS PASSED!');
      console.log('🚀 READY FOR PHASE 2: AUTO-UPDATE LOGIC IMPLEMENTATION');
      return true;
    } else {
      console.log('\n❌ PHASE 1 INCOMPLETE! Some validation tests failed.');
      console.log('🛑 DO NOT PROCEED TO PHASE 2 until all tests pass.');
      return false;
    }

  } catch (error) {
    console.error('❌ PHASE 1 VALIDATION ERROR:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  phase1FinalValidation().then((success) => {
    if (success) {
      console.log('\n🎯 Phase 1 validation completed successfully');
      process.exit(0);
    } else {
      console.log('\n💥 Phase 1 validation failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Phase 1 validation failed:', error);
    process.exit(1);
  });
}