// Survivor Field Integration - Phase 1 Integration with Existing Pick System
// This script provides functions to integrate the new survivor field structure
// with the existing survivor pick submission system

const {
  validateSurvivorField,
  createDefaultSurvivorField,
  appendToPickHistory,
  parsePickHistory
} = require('./phase1-survivor-field-setup.js');

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Update survivor field when a pick is saved
 * This function integrates with the existing pick save process
 */
async function updateSurvivorFieldOnPickSave(userId, teamPicked, weekNumber) {
  console.log(`🎯 Updating survivor field for user ${userId}, team: ${teamPicked}, week: ${weekNumber}`);

  const poolId = 'nerduniverse-2025';
  const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

  try {
    // Get current pool members data
    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const userData = poolData[userId];

    if (!userData) {
      throw new Error(`User ${userId} not found in pool members`);
    }

    // Get current survivor field or create default
    let survivorField = userData.survivor || createDefaultSurvivorField();

    // Validate current field structure
    const validationErrors = validateSurvivorField(survivorField);
    if (validationErrors.length > 0) {
      console.warn('⚠️ Survivor field validation errors, recreating:', validationErrors);
      survivorField = createDefaultSurvivorField();
    }

    // Update pick history
    const currentHistory = survivorField.pickHistory || '';
    const updatedHistory = appendToPickHistory(currentHistory, teamPicked);

    // Update survivor field
    const updatedSurvivorField = {
      ...survivorField,
      pickHistory: updatedHistory,
      totalPicks: survivorField.totalPicks + 1,
      lastUpdated: new Date().toISOString(),
      // Keep alive status unchanged (Phase 2 will handle elimination logic)
      // manualOverride stays false unless admin manually changed it
    };

    // Validate updated field
    const updatedValidationErrors = validateSurvivorField(updatedSurvivorField);
    if (updatedValidationErrors.length > 0) {
      throw new Error(`Updated survivor field validation failed: ${updatedValidationErrors.join(', ')}`);
    }

    // Update the document
    await db.doc(poolMembersPath).update({
      [`${userId}.survivor`]: updatedSurvivorField
    });

    console.log(`✅ Survivor field updated successfully for ${userData.displayName || userId}`);
    console.log(`   📊 Pick History: ${updatedHistory}`);
    console.log(`   📊 Total Picks: ${updatedSurvivorField.totalPicks}`);
    console.log(`   📊 Alive Status: ${updatedSurvivorField.alive}`);

    return updatedSurvivorField;

  } catch (error) {
    console.error(`❌ Error updating survivor field for ${userId}:`, error);
    throw error;
  }
}

/**
 * Update survivor field when a pick is cleared
 * This removes the team from pick history and decrements total picks
 */
async function updateSurvivorFieldOnPickClear(userId, teamToRemove, weekNumber) {
  console.log(`🎯 Clearing survivor field for user ${userId}, removing team: ${teamToRemove}, week: ${weekNumber}`);

  const poolId = 'nerduniverse-2025';
  const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

  try {
    // Get current pool members data
    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const userData = poolData[userId];

    if (!userData || !userData.survivor) {
      console.warn(`⚠️ User ${userId} has no survivor field to clear`);
      return;
    }

    const survivorField = userData.survivor;

    // Parse current pick history
    const currentPicks = parsePickHistory(survivorField.pickHistory);

    // Remove the team from pick history (remove last occurrence)
    const updatedPicks = [...currentPicks];
    const lastIndex = updatedPicks.lastIndexOf(teamToRemove);
    if (lastIndex > -1) {
      updatedPicks.splice(lastIndex, 1);
    }

    // Create updated history string
    const updatedHistory = updatedPicks.join(', ');

    // Update survivor field
    const updatedSurvivorField = {
      ...survivorField,
      pickHistory: updatedHistory,
      totalPicks: Math.max(0, survivorField.totalPicks - 1), // Don't go below 0
      lastUpdated: new Date().toISOString()
    };

    // Validate updated field
    const validationErrors = validateSurvivorField(updatedSurvivorField);
    if (validationErrors.length > 0) {
      throw new Error(`Updated survivor field validation failed: ${validationErrors.join(', ')}`);
    }

    // Update the document
    await db.doc(poolMembersPath).update({
      [`${userId}.survivor`]: updatedSurvivorField
    });

    console.log(`✅ Survivor field cleared successfully for ${userData.displayName || userId}`);
    console.log(`   📊 Pick History: ${updatedHistory}`);
    console.log(`   📊 Total Picks: ${updatedSurvivorField.totalPicks}`);

    return updatedSurvivorField;

  } catch (error) {
    console.error(`❌ Error clearing survivor field for ${userId}:`, error);
    throw error;
  }
}

/**
 * Initialize survivor field for a user if they don't have one
 * This ensures all users have the new field structure
 */
async function initializeSurvivorFieldForUser(userId) {
  console.log(`🎯 Initializing survivor field for user ${userId}`);

  const poolId = 'nerduniverse-2025';
  const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

  try {
    // Get current pool members data
    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const userData = poolData[userId];

    if (!userData) {
      throw new Error(`User ${userId} not found in pool members`);
    }

    // Check if user already has survivor field
    if (userData.survivor) {
      console.log(`✅ User ${userData.displayName || userId} already has survivor field`);
      return userData.survivor;
    }

    // Create default survivor field
    const survivorField = createDefaultSurvivorField();

    // Update the document
    await db.doc(poolMembersPath).update({
      [`${userId}.survivor`]: survivorField
    });

    console.log(`✅ Survivor field initialized for ${userData.displayName || userId}`);
    console.log(`   📊 Default Field: ${JSON.stringify(survivorField, null, 2)}`);

    return survivorField;

  } catch (error) {
    console.error(`❌ Error initializing survivor field for ${userId}:`, error);
    throw error;
  }
}

/**
 * Get survivor field for a user (creates one if it doesn't exist)
 */
async function getSurvivorFieldForUser(userId) {
  const poolId = 'nerduniverse-2025';
  const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

  try {
    const poolDoc = await db.doc(poolMembersPath).get();
    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    const userData = poolData[userId];

    if (!userData) {
      throw new Error(`User ${userId} not found in pool members`);
    }

    // Return existing field or initialize new one
    if (userData.survivor) {
      return userData.survivor;
    } else {
      return await initializeSurvivorFieldForUser(userId);
    }

  } catch (error) {
    console.error(`❌ Error getting survivor field for ${userId}:`, error);
    throw error;
  }
}

// Export functions for use in browser/frontend integration
module.exports = {
  updateSurvivorFieldOnPickSave,
  updateSurvivorFieldOnPickClear,
  initializeSurvivorFieldForUser,
  getSurvivorFieldForUser
};

// Browser/frontend integration functions (for use in index.html)
if (typeof window !== 'undefined') {
  window.survivorFieldIntegration = {
    updateSurvivorFieldOnPickSave,
    updateSurvivorFieldOnPickClear,
    initializeSurvivorFieldForUser,
    getSurvivorFieldForUser
  };
}