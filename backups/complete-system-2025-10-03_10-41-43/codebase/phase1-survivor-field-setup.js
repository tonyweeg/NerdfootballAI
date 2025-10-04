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

// Survivor field schema validation
function validateSurvivorField(survivorData) {
  const errors = [];

  // Check required fields
  if (!survivorData.hasOwnProperty('alive')) {
    errors.push('Missing required field: alive');
  } else if (!Number.isInteger(survivorData.alive) || survivorData.alive < 1 || survivorData.alive > 18) {
    errors.push('Field "alive" must be an integer between 1-18');
  }

  if (!survivorData.hasOwnProperty('pickHistory')) {
    errors.push('Missing required field: pickHistory');
  } else if (typeof survivorData.pickHistory !== 'string') {
    errors.push('Field "pickHistory" must be a string');
  }

  if (!survivorData.hasOwnProperty('lastUpdated')) {
    errors.push('Missing required field: lastUpdated');
  } else if (typeof survivorData.lastUpdated !== 'string') {
    errors.push('Field "lastUpdated" must be an ISO date string');
  }

  if (!survivorData.hasOwnProperty('totalPicks')) {
    errors.push('Missing required field: totalPicks');
  } else if (!Number.isInteger(survivorData.totalPicks) || survivorData.totalPicks < 0) {
    errors.push('Field "totalPicks" must be a non-negative integer');
  }

  if (!survivorData.hasOwnProperty('manualOverride')) {
    errors.push('Missing required field: manualOverride');
  } else if (typeof survivorData.manualOverride !== 'boolean') {
    errors.push('Field "manualOverride" must be a boolean');
  }

  return errors;
}

// Create default survivor field
function createDefaultSurvivorField() {
  return {
    alive: 18,                                // Default: alive
    pickHistory: "",                          // Empty pick history to start
    lastUpdated: new Date().toISOString(),    // Current timestamp
    totalPicks: 0,                           // No picks yet
    manualOverride: false                    // No manual intervention
  };
}

// Parse pick history string into array
function parsePickHistory(pickString) {
  if (!pickString || pickString.trim() === '') {
    return [];
  }
  return pickString.split(',').map(pick => pick.trim()).filter(pick => pick.length > 0);
}

// Format pick array into history string
function formatPickHistory(pickArray) {
  return pickArray.join(', ');
}

// Add team to pick history
function appendToPickHistory(currentHistory, newTeam) {
  const picks = parsePickHistory(currentHistory);
  picks.push(newTeam);
  return formatPickHistory(picks);
}

async function phase1Setup() {
  console.log('🎯 PHASE 1: SURVIVOR FIELD DATA STRUCTURE SETUP\n');

  const poolId = 'nerduniverse-2025';
  const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

  try {
    // 1. Test survivor field schema validation
    console.log('1️⃣ TESTING SURVIVOR FIELD SCHEMA VALIDATION:');

    const validSurvivorField = createDefaultSurvivorField();
    console.log('   Valid survivor field:', JSON.stringify(validSurvivorField, null, 2));

    const validationErrors = validateSurvivorField(validSurvivorField);
    if (validationErrors.length === 0) {
      console.log('   ✅ Default survivor field passes validation');
    } else {
      console.log('   ❌ Validation errors:', validationErrors);
      return;
    }

    // Test invalid survivor fields
    const invalidField = { alive: 25, pickHistory: 123 }; // Invalid values
    const invalidErrors = validateSurvivorField(invalidField);
    console.log('   🧪 Invalid field errors (expected):', invalidErrors);

    // 2. Test pick history functions
    console.log('\n2️⃣ TESTING PICK HISTORY FUNCTIONS:');

    let testHistory = "";
    testHistory = appendToPickHistory(testHistory, "Denver Broncos");
    console.log('   After adding Denver Broncos:', testHistory);

    testHistory = appendToPickHistory(testHistory, "Arizona Cardinals");
    console.log('   After adding Arizona Cardinals:', testHistory);

    const parsedPicks = parsePickHistory(testHistory);
    console.log('   Parsed picks array:', parsedPicks);

    if (parsedPicks.length === 2 && parsedPicks[0] === "Denver Broncos" && parsedPicks[1] === "Arizona Cardinals") {
      console.log('   ✅ Pick history functions working correctly');
    } else {
      console.log('   ❌ Pick history functions failed');
      return;
    }

    // 3. Check current pool members structure
    console.log('\n3️⃣ CHECKING CURRENT POOL MEMBERS STRUCTURE:');

    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      console.log('   ❌ Pool members document not found');
      return;
    }

    const poolData = poolDoc.data();
    const memberCount = Object.keys(poolData).length;
    console.log(`   ✅ Found ${memberCount} pool members`);

    // Check if any member already has survivor field
    const membersWithSurvivor = Object.entries(poolData).filter(([uid, userData]) => userData.survivor);
    console.log(`   📊 Members with existing survivor field: ${membersWithSurvivor.length}`);

    if (membersWithSurvivor.length > 0) {
      console.log('   🔍 Existing survivor fields:');
      membersWithSurvivor.forEach(([uid, userData]) => {
        console.log(`     ${userData.displayName}: ${JSON.stringify(userData.survivor)}`);
      });
    }

    // 4. Test adding survivor field to test user (Ållfåther - admin)
    console.log('\n4️⃣ TESTING SURVIVOR FIELD UPDATE:');

    const testUserId = 'WxSPmEildJdqs6T5hIpBUZrscwt2'; // Ållfåther
    const testUser = poolData[testUserId];

    if (!testUser) {
      console.log('   ❌ Test user not found in pool');
      return;
    }

    console.log(`   🎯 Test user: ${testUser.displayName} (${testUserId})`);

    // Create survivor field for test user
    const testSurvivorField = createDefaultSurvivorField();
    console.log('   📝 Adding survivor field:', JSON.stringify(testSurvivorField, null, 2));

    // Update the test user with survivor field
    await db.doc(poolMembersPath).update({
      [`${testUserId}.survivor`]: testSurvivorField
    });

    console.log('   ✅ Survivor field added to test user');

    // 5. Verify the update
    console.log('\n5️⃣ VERIFYING SURVIVOR FIELD UPDATE:');

    const updatedDoc = await db.doc(poolMembersPath).get();
    const updatedData = updatedDoc.data();
    const updatedUser = updatedData[testUserId];

    if (updatedUser.survivor) {
      console.log('   ✅ Survivor field successfully added');
      console.log('   📊 Updated user data:', JSON.stringify(updatedUser.survivor, null, 2));

      // Validate the stored field
      const storedValidation = validateSurvivorField(updatedUser.survivor);
      if (storedValidation.length === 0) {
        console.log('   ✅ Stored survivor field passes validation');
      } else {
        console.log('   ❌ Stored survivor field validation errors:', storedValidation);
      }
    } else {
      console.log('   ❌ Survivor field not found after update');
      return;
    }

    console.log('\n✅ PHASE 1 DATA STRUCTURE SETUP SUCCESSFUL!');
    console.log('🎯 READY FOR: Firestore security rules update');

  } catch (error) {
    console.error('❌ PHASE 1 SETUP FAILED:', error);
    throw error;
  }
}

// Export functions for testing
module.exports = {
  validateSurvivorField,
  createDefaultSurvivorField,
  parsePickHistory,
  formatPickHistory,
  appendToPickHistory
};

// Run if called directly
if (require.main === module) {
  phase1Setup().then(() => {
    console.log('\n🎯 Phase 1 setup complete');
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 Phase 1 setup failed:', error);
    process.exit(1);
  });
}