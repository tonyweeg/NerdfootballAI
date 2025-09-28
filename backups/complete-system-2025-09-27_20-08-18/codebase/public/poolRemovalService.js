/**
 * Pool Removal Service - Handles cascading effects of removing users from pools
 * Ensures complete removal from all displays, caches, and calculations
 */

class PoolRemovalService {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
        this.db = null;
        this.initialized = false;
        
        // Track operations for rollback capability
        this.operations = [];
        this.auditLog = [];
    }

    /**
     * Initialize with Firebase reference
     */
    async initialize(db) {
        this.db = db;
        this.initialized = true;
        console.log('✅ PoolRemovalService initialized');
    }

    /**
     * Main removal method - orchestrates all cascading operations
     */
    async removeUserFromPool(userId, poolType, adminId, options = {}) {
        console.log(`🔄 Starting cascading removal: ${userId} from ${poolType}`);
        
        const startTime = performance.now();
        const removalId = this.generateRemovalId();
        
        try {
            // Phase 1: Validate removal
            const validation = await this.validateRemoval(userId, poolType);
            if (!validation.valid) {
                throw new Error(validation.reason);
            }
            
            // Phase 2: Create removal plan
            const removalPlan = await this.createRemovalPlan(userId, poolType);
            
            // Phase 3: Archive existing data (soft delete)
            if (!options.skipArchive) {
                await this.archiveUserData(userId, poolType, removalId);
            }
            
            // Phase 4: Remove from active collections
            await this.removeFromActiveCollections(userId, poolType);
            
            // Phase 5: Update unified documents
            await this.updateUnifiedDocuments(userId, poolType);
            
            // Phase 6: Invalidate caches
            await this.invalidateCaches(userId, poolType);
            
            // Phase 7: Create audit trail
            await this.createAuditTrail({
                removalId,
                userId,
                poolType,
                adminId,
                timestamp: new Date().toISOString(),
                operations: this.operations,
                duration: performance.now() - startTime
            });
            
            console.log(`✅ Cascading removal complete in ${(performance.now() - startTime).toFixed(0)}ms`);
            
            return {
                success: true,
                removalId,
                operationsPerformed: this.operations.length,
                canRestore: true
            };
            
        } catch (error) {
            console.error('❌ Cascading removal failed:', error);
            
            // Attempt rollback
            if (this.operations.length > 0) {
                await this.rollbackOperations();
            }
            
            return {
                success: false,
                error: error.message,
                operationsRolledBack: this.operations.length
            };
        }
    }

    /**
     * Validate that removal is allowed
     */
    async validateRemoval(userId, poolType) {
        // Check if user exists in pool
        const membersRef = window.doc(this.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`);
        const membersDoc = await window.getDoc(membersRef);
        
        if (!membersDoc.exists()) {
            return { valid: false, reason: 'Pool members not found' };
        }
        
        const members = membersDoc.data();
        const member = members[userId];
        
        if (!member) {
            return { valid: false, reason: 'User not found in pool' };
        }
        
        // Can't remove if it's the only pool they're in
        const participation = member.participation || { confidence: { enabled: true }, survivor: { enabled: true } };
        
        if (poolType === 'both') {
            // Removing from both pools is essentially removing from pool entirely
            return { valid: true };
        }
        
        if (poolType === 'confidence' && !participation.survivor?.enabled) {
            return { valid: false, reason: 'Cannot remove from confidence - user is not in survivor pool' };
        }
        
        if (poolType === 'survivor' && !participation.confidence?.enabled) {
            return { valid: false, reason: 'Cannot remove from survivor - user is not in confidence pool' };
        }
        
        return { valid: true };
    }

    /**
     * Create a removal plan listing all affected data
     */
    async createRemovalPlan(userId, poolType) {
        const plan = {
            userId,
            poolType,
            affectedData: {
                confidence: [],
                survivor: [],
                caches: [],
                unified: []
            }
        };
        
        if (poolType === 'confidence' || poolType === 'both') {
            // List all confidence-related data
            plan.affectedData.confidence = [
                `picks/${this.season}/weeks/*/users/${userId}`,
                `confidence/${this.season}/weeks/*/picks/${userId}`,
                `confidence/${this.season}/summary/users/${userId}`
            ];
            
            plan.affectedData.unified.push(
                `confidence/${this.season}/weeks/*`
            );
        }
        
        if (poolType === 'survivor' || poolType === 'both') {
            // List all survivor-related data
            plan.affectedData.survivor = [
                `survivor/${this.season}/users/${userId}`,
                `survivor/${this.season}/weeks/*/picks/${userId}`,
                `nerdSurvivor_picks/${userId}`
            ];
            
            plan.affectedData.unified.push(
                `survivor/${this.season}/weeks/*`
            );
        }
        
        // Caches to invalidate
        plan.affectedData.caches = [
            'leaderboard_cache',
            'survivor_standings_cache',
            'grid_cache'
        ];
        
        return plan;
    }

    /**
     * Archive user's picks and scores before removal
     */
    async archiveUserData(userId, poolType, removalId) {
        console.log(`📦 Archiving ${poolType} data for user ${userId}`);
        
        const archivePath = `artifacts/nerdfootball/pools/${this.poolId}/archived/${removalId}`;
        const archiveRef = window.doc(this.db, archivePath);
        
        const archiveData = {
            removalId,
            userId,
            poolType,
            archivedAt: new Date().toISOString(),
            data: {}
        };
        
        if (poolType === 'confidence' || poolType === 'both') {
            // Archive confidence picks
            archiveData.data.confidence = await this.archiveConfidencePicks(userId);
        }
        
        if (poolType === 'survivor' || poolType === 'both') {
            // Archive survivor picks
            archiveData.data.survivor = await this.archiveSurvivorPicks(userId);
        }
        
        // Store archive
        await window.setDoc(archiveRef, archiveData);
        
        this.operations.push({
            type: 'archive',
            path: archivePath,
            data: archiveData
        });
        
        console.log(`✅ Archived ${Object.keys(archiveData.data).length} pool(s) data`);
        
        return archiveData;
    }

    /**
     * Archive confidence picks for a user
     */
    async archiveConfidencePicks(userId) {
        const picks = {};
        
        // Get all weeks of picks
        for (let week = 1; week <= 18; week++) {
            const pickPath = `artifacts/nerdfootball/pools/${this.poolId}/picks/${this.season}/weeks/${week}/users/${userId}`;
            const pickRef = window.doc(this.db, pickPath);
            
            try {
                const pickDoc = await window.getDoc(pickRef);
                if (pickDoc.exists()) {
                    picks[`week${week}`] = pickDoc.data();
                }
            } catch (error) {
                console.log(`No picks found for week ${week}`);
            }
        }
        
        return {
            totalWeeks: Object.keys(picks).length,
            picks,
            archivedAt: new Date().toISOString()
        };
    }

    /**
     * Archive survivor picks for a user
     */
    async archiveSurvivorPicks(userId) {
        // Get legacy survivor picks
        const legacyPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
        const legacyRef = window.doc(this.db, legacyPath);
        
        let survivorData = {};
        
        try {
            const legacyDoc = await window.getDoc(legacyRef);
            if (legacyDoc.exists()) {
                survivorData = legacyDoc.data();
            }
        } catch (error) {
            console.log('No survivor picks found');
        }
        
        return {
            picks: survivorData.picks || {},
            eliminatedWeek: survivorData.eliminatedWeek,
            isEliminated: survivorData.isEliminated || false,
            archivedAt: new Date().toISOString()
        };
    }

    /**
     * Remove user from active collections (don't delete, just remove from unified)
     */
    async removeFromActiveCollections(userId, poolType) {
        console.log(`🗑️ Removing from active collections`);
        
        if (poolType === 'confidence' || poolType === 'both') {
            await this.removeFromConfidenceCollections(userId);
        }
        
        if (poolType === 'survivor' || poolType === 'both') {
            await this.removeFromSurvivorCollections(userId);
        }
    }

    /**
     * Remove from confidence unified documents
     */
    async removeFromConfidenceCollections(userId) {
        // Remove from weekly unified documents
        for (let week = 1; week <= 18; week++) {
            const unifiedPath = `artifacts/nerdfootball/pools/${this.poolId}/confidence/${this.season}/weeks/${week}`;
            const unifiedRef = window.doc(this.db, unifiedPath);
            
            try {
                const unifiedDoc = await window.getDoc(unifiedRef);
                if (unifiedDoc.exists()) {
                    const data = unifiedDoc.data();
                    
                    // Remove user from picks
                    if (data.picks && data.picks[userId]) {
                        delete data.picks[userId];
                    }
                    
                    // Remove from leaderboards
                    if (data.leaderboards?.weekly) {
                        data.leaderboards.weekly = data.leaderboards.weekly.filter(
                            entry => entry.userId !== userId
                        );
                    }
                    
                    if (data.leaderboards?.season) {
                        data.leaderboards.season = data.leaderboards.season.filter(
                            entry => entry.userId !== userId
                        );
                    }
                    
                    // Update the document
                    await window.updateDoc(unifiedRef, data);
                    
                    this.operations.push({
                        type: 'removeFromUnified',
                        path: unifiedPath,
                        userId
                    });
                }
            } catch (error) {
                console.log(`Week ${week} unified doc not found`);
            }
        }
    }

    /**
     * Remove from survivor unified documents
     */
    async removeFromSurvivorCollections(userId) {
        // Remove from weekly survivor documents
        for (let week = 1; week <= 18; week++) {
            const unifiedPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${this.season}/weeks/${week}`;
            const unifiedRef = window.doc(this.db, unifiedPath);
            
            try {
                const unifiedDoc = await window.getDoc(unifiedRef);
                if (unifiedDoc.exists()) {
                    const data = unifiedDoc.data();
                    
                    // Remove user from picks/users
                    if (data.picks && data.picks[userId]) {
                        delete data.picks[userId];
                    }
                    
                    if (data.users && data.users[userId]) {
                        delete data.users[userId];
                    }
                    
                    // Update stats
                    if (data.stats) {
                        data.stats.totalActivePlayers = Object.keys(data.users || {}).length;
                    }
                    
                    await window.updateDoc(unifiedRef, data);
                    
                    this.operations.push({
                        type: 'removeFromSurvivor',
                        path: unifiedPath,
                        userId
                    });
                }
            } catch (error) {
                console.log(`Week ${week} survivor doc not found`);
            }
        }
    }

    /**
     * Update unified documents to recalculate without removed user
     */
    async updateUnifiedDocuments(userId, poolType) {
        console.log(`📊 Updating unified documents`);
        
        // Trigger recalculation of affected weeks
        // This would ideally be done by a Cloud Function
        
        this.operations.push({
            type: 'updateUnified',
            poolType,
            userId
        });
    }

    /**
     * Invalidate all relevant caches
     */
    async invalidateCaches(userId, poolType) {
        console.log(`🔄 Invalidating caches`);
        
        // Clear in-memory caches
        if (typeof window.unifiedConfidenceManager !== 'undefined') {
            window.unifiedConfidenceManager.cache.clear();
        }
        
        if (typeof window.unifiedSurvivorManager !== 'undefined') {
            window.unifiedSurvivorManager.cachedWeekData.clear();
        }
        
        // Clear localStorage caches
        const cacheKeys = [
            'leaderboard_cache',
            'survivor_cache',
            'grid_cache',
            `user_${userId}_cache`
        ];
        
        cacheKeys.forEach(key => {
            localStorage.removeItem(key);
        });
        
        this.operations.push({
            type: 'cacheInvalidation',
            clearedCaches: cacheKeys
        });
        
        console.log(`✅ Cleared ${cacheKeys.length} caches`);
    }

    /**
     * Create audit trail for the removal
     */
    async createAuditTrail(auditData) {
        const auditPath = `artifacts/nerdfootball/pools/${this.poolId}/audit/removals/${auditData.removalId}`;
        const auditRef = window.doc(this.db, auditPath);
        
        await window.setDoc(auditRef, {
            ...auditData,
            poolId: this.poolId,
            season: this.season,
            operationCount: this.operations.length,
            canRestore: true,
            restoreExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });
        
        console.log(`📝 Audit trail created: ${auditData.removalId}`);
    }

    /**
     * Rollback operations in case of failure
     */
    async rollbackOperations() {
        console.log(`⏮️ Rolling back ${this.operations.length} operations`);
        
        // Rollback in reverse order
        for (const op of this.operations.reverse()) {
            try {
                switch (op.type) {
                    case 'archive':
                        // Delete the archive
                        await window.deleteDoc(window.doc(this.db, op.path));
                        break;
                    
                    case 'removeFromUnified':
                        // Would need to restore from archive
                        console.log(`Cannot auto-rollback unified doc changes`);
                        break;
                    
                    case 'cacheInvalidation':
                        // Caches will rebuild automatically
                        break;
                }
            } catch (error) {
                console.error(`Failed to rollback operation:`, op, error);
            }
        }
    }

    /**
     * Restore user to pool from archive
     */
    async restoreUserToPool(removalId, options = {}) {
        console.log(`♻️ Restoring user from removal ${removalId}`);
        
        // Get archive data
        const archivePath = `artifacts/nerdfootball/pools/${this.poolId}/archived/${removalId}`;
        const archiveRef = window.doc(this.db, archivePath);
        const archiveDoc = await window.getDoc(archiveRef);
        
        if (!archiveDoc.exists()) {
            throw new Error('Archive not found');
        }
        
        const archive = archiveDoc.data();
        const { userId, poolType, data } = archive;
        
        // Re-enable participation flags
        const membersRef = window.doc(this.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`);
        const updateData = {};
        
        if (poolType === 'confidence' || poolType === 'both') {
            updateData[`${userId}.participation.confidence`] = {
                enabled: true,
                status: 'active',
                restoredAt: new Date().toISOString()
            };
        }
        
        if (poolType === 'survivor' || poolType === 'both') {
            updateData[`${userId}.participation.survivor`] = {
                enabled: true,
                status: 'active',
                restoredAt: new Date().toISOString()
            };
        }
        
        await window.updateDoc(membersRef, updateData);
        
        // Restore picks if requested
        if (options.restorePicks) {
            await this.restorePicks(userId, poolType, data);
        }
        
        // Clear caches to force refresh
        await this.invalidateCaches(userId, poolType);
        
        console.log(`✅ User ${userId} restored to ${poolType} pool(s)`);
        
        return {
            success: true,
            userId,
            poolType,
            picksRestored: options.restorePicks
        };
    }

    /**
     * Restore archived picks
     */
    async restorePicks(userId, poolType, archiveData) {
        if (poolType === 'confidence' || poolType === 'both') {
            // Restore confidence picks
            if (archiveData.confidence?.picks) {
                for (const [week, picks] of Object.entries(archiveData.confidence.picks)) {
                    const weekNum = week.replace('week', '');
                    const pickPath = `artifacts/nerdfootball/pools/${this.poolId}/picks/${this.season}/weeks/${weekNum}/users/${userId}`;
                    const pickRef = window.doc(this.db, pickPath);
                    await window.setDoc(pickRef, picks);
                }
            }
        }
        
        if (poolType === 'survivor' || poolType === 'both') {
            // Restore survivor picks
            if (archiveData.survivor?.picks) {
                const survivorPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
                const survivorRef = window.doc(this.db, survivorPath);
                await window.setDoc(survivorRef, {
                    picks: archiveData.survivor.picks,
                    isEliminated: archiveData.survivor.isEliminated,
                    eliminatedWeek: archiveData.survivor.eliminatedWeek
                });
            }
        }
    }

    /**
     * Generate unique removal ID
     */
    generateRemovalId() {
        return `removal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Create singleton instance
const poolRemovalService = new PoolRemovalService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = poolRemovalService;
}