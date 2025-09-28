/**
 * Pool Participation Manager
 * Handles selective participation in confidence and survivor pools
 * Users can be in confidence-only, survivor-only, or both pools
 */

class PoolParticipationManager {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
        this.db = null;
        this.initialized = false;
    }

    /**
     * Initialize with Firebase reference
     */
    async initialize(db) {
        this.db = db;
        this.initialized = true;
        console.log('✅ PoolParticipationManager initialized');
    }

    /**
     * Get pool members path
     */
    getPoolMembersPath() {
        return `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
    }

    /**
     * Get enhanced pool members with participation flags
     * @param {Object} options - Filter options
     * @returns {Object} Members with participation data
     */
    async getPoolMembers(options = {}) {
        try {
            const membersRef = window.doc(this.db, this.getPoolMembersPath());
            const membersDoc = await window.getDoc(membersRef);
            
            if (!membersDoc.exists()) {
                console.warn('No pool members found');
                return {};
            }
            
            const members = membersDoc.data();
            const enhancedMembers = {};
            
            for (const [uid, memberData] of Object.entries(members)) {
                // Skip ghost user
                if (uid === 'okl4sw2aDhW3yKpOfOwe5lH7OQj1') {
                    continue;
                }
                
                // Ensure participation structure exists (backward compatibility)
                if (!memberData.participation) {
                    memberData.participation = {
                        confidence: { enabled: true, status: 'active' },
                        survivor: { enabled: true, status: 'active' }
                    };
                }
                
                // Apply filters if specified
                if (options.confidenceOnly && !memberData.participation.confidence.enabled) {
                    continue;
                }
                if (options.survivorOnly && !memberData.participation.survivor.enabled) {
                    continue;
                }
                
                enhancedMembers[uid] = memberData;
            }
            
            return enhancedMembers;
        } catch (error) {
            console.error('Error fetching pool members:', error);
            return {};
        }
    }

    /**
     * Get members participating in confidence pool
     */
    async getConfidenceParticipants() {
        return await this.getPoolMembers({ confidenceOnly: true });
    }

    /**
     * Get members participating in survivor pool
     */
    async getSurvivorParticipants() {
        return await this.getPoolMembers({ survivorOnly: true });
    }

    /**
     * Update user's participation status WITH cascading removal
     * @param {string} userId - User ID to update
     * @param {Object} updates - Participation updates
     * @param {string} adminId - Admin making the change
     */
    async updateUserParticipation(userId, updates, adminId) {
        try {
            // Determine what type of removal this is
            let removalType = null;
            if (updates.confidence === false && updates.survivor === false) {
                removalType = 'both';
            } else if (updates.confidence === false) {
                removalType = 'confidence';
            } else if (updates.survivor === false) {
                removalType = 'survivor';
            }
            
            // If removing from any pool, trigger cascading removal
            if (removalType) {
                console.log(`🔄 Triggering cascading removal for ${userId} from ${removalType}`);
                
                // Initialize removal service if needed
                if (typeof poolRemovalService !== 'undefined' && !poolRemovalService.initialized) {
                    await poolRemovalService.initialize(this.db);
                }
                
                // Perform cascading removal
                if (typeof poolRemovalService !== 'undefined') {
                    const removalResult = await poolRemovalService.removeUserFromPool(
                        userId,
                        removalType,
                        adminId,
                        { skipArchive: false }
                    );
                    
                    if (!removalResult.success) {
                        console.error('Cascading removal failed:', removalResult.error);
                        // Continue with flag update anyway
                    } else {
                        console.log(`✅ Cascading removal complete: ${removalResult.removalId}`);
                    }
                }
            }
            
            // Update participation flags
            const membersPath = this.getPoolMembersPath();
            const updateData = {};
            
            // Initialize participation structure if needed
            updateData[`${userId}.participation`] = {
                confidence: {
                    enabled: updates.confidence !== undefined ? updates.confidence : true,
                    status: updates.confidence ? 'active' : 'removed'
                },
                survivor: {
                    enabled: updates.survivor !== undefined ? updates.survivor : true,
                    status: updates.survivor ? 'active' : 'removed'
                },
                metadata: {}
            };
            
            // Add metadata for tracking changes
            if (updates.confidence === false) {
                updateData[`${userId}.participation.metadata.confidenceRemovedAt`] = new Date().toISOString();
                updateData[`${userId}.participation.metadata.confidenceRemovedBy`] = adminId;
            }
            
            if (updates.survivor === false) {
                updateData[`${userId}.participation.metadata.survivorRemovedAt`] = new Date().toISOString();
                updateData[`${userId}.participation.metadata.survivorRemovedBy`] = adminId;
            }
            
            // Add last modified timestamp
            updateData[`${userId}.lastModified`] = new Date().toISOString();
            updateData[`${userId}.lastModifiedBy`] = adminId;
            
            console.log('Updating participation flags:', updateData);
            
            // Update the flags in Firestore
            const docRef = window.doc(this.db, membersPath);
            await window.updateDoc(docRef, updateData);
            
            // If re-enabling, offer to restore from archive
            if (updates.confidence === true || updates.survivor === true) {
                console.log('ℹ️ User re-enabled - restoration available via admin panel');
            }
            
            console.log(`✅ Updated participation for user ${userId}:`, updates);
            return { success: true, removalType };
            
        } catch (error) {
            console.error('Error updating user participation:', error);
            return { success: false, error };
        }
    }

    /**
     * Migrate existing members to new participation structure
     * This is a one-time migration for backward compatibility
     */
    async migrateExistingMembers() {
        try {
            const membersRef = window.doc(this.db, this.getPoolMembersPath());
            const membersDoc = await window.getDoc(membersRef);
            
            if (!membersDoc.exists()) {
                console.log('No members to migrate');
                return { success: true, migrated: 0 };
            }
            
            const members = membersDoc.data();
            const updates = {};
            let migratedCount = 0;
            
            for (const [uid, memberData] of Object.entries(members)) {
                // Skip if already has participation structure
                if (memberData.participation) {
                    continue;
                }
                
                // Add default participation (both pools enabled)
                updates[`${uid}.participation`] = {
                    confidence: { enabled: true, status: 'active' },
                    survivor: { enabled: true, status: 'active' },
                    metadata: {}
                };
                
                migratedCount++;
            }
            
            if (migratedCount > 0) {
                await window.updateDoc(membersRef, updates);
                console.log(`✅ Migrated ${migratedCount} members to new participation structure`);
            }
            
            return { success: true, migrated: migratedCount };
            
        } catch (error) {
            console.error('Error migrating members:', error);
            return { success: false, error };
        }
    }

    /**
     * Get current NFL week number
     */
    getCurrentNflWeek() {
        const seasonStart = new Date('2025-09-04');
        const now = new Date();
        const diffTime = Math.abs(now - seasonStart);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weekNumber = Math.ceil(diffDays / 7);
        return Math.min(Math.max(1, weekNumber), 18);
    }

    /**
     * Check if user can participate in confidence pool
     */
    async canParticipateInConfidence(userId) {
        const members = await this.getPoolMembers();
        return members[userId]?.participation?.confidence?.enabled || false;
    }

    /**
     * Check if user can participate in survivor pool
     */
    async canParticipateInSurvivor(userId) {
        const members = await this.getPoolMembers();
        return members[userId]?.participation?.survivor?.enabled || false;
    }
}

// Create singleton instance
const poolParticipationManager = new PoolParticipationManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = poolParticipationManager;
}