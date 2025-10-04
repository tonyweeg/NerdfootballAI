// Survivor Field Integration - Frontend Version
// Integrates new survivor field structure with existing pick submission system
// Compatible with browser environment (index.html)

// Helper functions (copied from phase1-survivor-field-setup.js for browser compatibility)
function validateSurvivorField(survivorData) {
  const errors = [];

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

function createDefaultSurvivorField() {
  return {
    alive: 18,
    pickHistory: "",
    lastUpdated: new Date().toISOString(),
    totalPicks: 0,
    manualOverride: false
  };
}

function parsePickHistory(pickString) {
  if (!pickString || pickString.trim() === '') {
    return [];
  }
  return pickString.split(',').map(pick => pick.trim()).filter(pick => pick.length > 0);
}

function formatPickHistory(pickArray) {
  return pickArray.join(', ');
}

function appendToPickHistory(currentHistory, newTeam) {
  const picks = parsePickHistory(currentHistory);
  picks.push(newTeam);
  return formatPickHistory(picks);
}

// Main integration functions for browser use
window.survivorFieldIntegration = {

  /**
   * Update survivor field when a pick is saved
   * Call this AFTER the existing pick save logic
   */
  async updateSurvivorFieldOnPickSave(userId, teamPicked, weekNumber) {
    console.log(`🎯 [Survivor Field] Updating field for user ${userId}, team: ${teamPicked}, week: ${weekNumber}`);

    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    try {
      // Get current pool members data
      const poolDocRef = doc(db, poolMembersPath);
      const poolSnap = await getDoc(poolDocRef);

      if (!poolSnap.exists()) {
        throw new Error('Pool members document not found');
      }

      const poolData = poolSnap.data();
      const userData = poolData[userId];

      if (!userData) {
        throw new Error(`User ${userId} not found in pool members`);
      }

      // Get current survivor field or create default
      let survivorField = userData.survivor || createDefaultSurvivorField();

      // Validate current field structure
      const validationErrors = validateSurvivorField(survivorField);
      if (validationErrors.length > 0) {
        console.warn('⚠️ [Survivor Field] Validation errors, recreating field:', validationErrors);
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
        lastUpdated: new Date().toISOString()
        // Keep alive and manualOverride unchanged
      };

      // Validate updated field
      const updatedValidationErrors = validateSurvivorField(updatedSurvivorField);
      if (updatedValidationErrors.length > 0) {
        throw new Error(`Updated survivor field validation failed: ${updatedValidationErrors.join(', ')}`);
      }

      // Update the document
      await updateDoc(poolDocRef, {
        [`${userId}.survivor`]: updatedSurvivorField
      });

      console.log(`✅ [Survivor Field] Updated successfully for ${userData.displayName || userId}`);
      console.log(`   📊 Pick History: ${updatedHistory}`);
      console.log(`   📊 Total Picks: ${updatedSurvivorField.totalPicks}`);
      console.log(`   📊 Alive Status: ${updatedSurvivorField.alive}`);

      return updatedSurvivorField;

    } catch (error) {
      console.error(`❌ [Survivor Field] Error updating field for ${userId}:`, error);
      // Don't throw - this is supplementary to existing pick save
      // Log error but allow existing pick save to succeed
      return null;
    }
  },

  /**
   * Update survivor field when a pick is cleared
   */
  async updateSurvivorFieldOnPickClear(userId, teamToRemove, weekNumber) {
    console.log(`🎯 [Survivor Field] Clearing field for user ${userId}, removing team: ${teamToRemove}, week: ${weekNumber}`);

    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    try {
      // Get current pool members data
      const poolDocRef = doc(db, poolMembersPath);
      const poolSnap = await getDoc(poolDocRef);

      if (!poolSnap.exists()) {
        throw new Error('Pool members document not found');
      }

      const poolData = poolSnap.data();
      const userData = poolData[userId];

      if (!userData || !userData.survivor) {
        console.warn(`⚠️ [Survivor Field] User ${userId} has no survivor field to clear`);
        return null;
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
      const updatedHistory = formatPickHistory(updatedPicks);

      // Update survivor field
      const updatedSurvivorField = {
        ...survivorField,
        pickHistory: updatedHistory,
        totalPicks: Math.max(0, survivorField.totalPicks - 1),
        lastUpdated: new Date().toISOString()
      };

      // Validate updated field
      const validationErrors = validateSurvivorField(updatedSurvivorField);
      if (validationErrors.length > 0) {
        throw new Error(`Updated survivor field validation failed: ${validationErrors.join(', ')}`);
      }

      // Update the document
      await updateDoc(poolDocRef, {
        [`${userId}.survivor`]: updatedSurvivorField
      });

      console.log(`✅ [Survivor Field] Cleared successfully for ${userData.displayName || userId}`);
      console.log(`   📊 Pick History: ${updatedHistory}`);
      console.log(`   📊 Total Picks: ${updatedSurvivorField.totalPicks}`);

      return updatedSurvivorField;

    } catch (error) {
      console.error(`❌ [Survivor Field] Error clearing field for ${userId}:`, error);
      // Don't throw - this is supplementary to existing pick clear
      return null;
    }
  },

  /**
   * Initialize survivor field for a user if they don't have one
   */
  async initializeSurvivorFieldForUser(userId) {
    console.log(`🎯 [Survivor Field] Initializing field for user ${userId}`);

    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    try {
      // Get current pool members data
      const poolDocRef = doc(db, poolMembersPath);
      const poolSnap = await getDoc(poolDocRef);

      if (!poolSnap.exists()) {
        throw new Error('Pool members document not found');
      }

      const poolData = poolSnap.data();
      const userData = poolData[userId];

      if (!userData) {
        throw new Error(`User ${userId} not found in pool members`);
      }

      // Check if user already has survivor field
      if (userData.survivor) {
        console.log(`✅ [Survivor Field] User ${userData.displayName || userId} already has field`);
        return userData.survivor;
      }

      // Create default survivor field
      const survivorField = createDefaultSurvivorField();

      // Update the document
      await updateDoc(poolDocRef, {
        [`${userId}.survivor`]: survivorField
      });

      console.log(`✅ [Survivor Field] Initialized for ${userData.displayName || userId}`);
      return survivorField;

    } catch (error) {
      console.error(`❌ [Survivor Field] Error initializing field for ${userId}:`, error);
      return null;
    }
  },

  /**
   * Get survivor field for a user (creates one if it doesn't exist)
   */
  async getSurvivorFieldForUser(userId) {
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    try {
      const poolDocRef = doc(db, poolMembersPath);
      const poolSnap = await getDoc(poolDocRef);

      if (!poolSnap.exists()) {
        throw new Error('Pool members document not found');
      }

      const poolData = poolSnap.data();
      const userData = poolData[userId];

      if (!userData) {
        throw new Error(`User ${userId} not found in pool members`);
      }

      // Return existing field or initialize new one
      if (userData.survivor) {
        return userData.survivor;
      } else {
        return await this.initializeSurvivorFieldForUser(userId);
      }

    } catch (error) {
      console.error(`❌ [Survivor Field] Error getting field for ${userId}:`, error);
      return null;
    }
  }
};

console.log('🎯 [Survivor Field] Integration loaded successfully');