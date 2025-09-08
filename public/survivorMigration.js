// DIAMOND LEVEL: Migration Script to Populate Unified Survivor Document
// Runs ONCE to migrate all existing picks to the unified structure

class SurvivorMigration {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.currentYear = 2025;
        this.currentWeek = window.currentWeek || 1;
    }

    async runMigration() {
        console.log('🚀 Starting survivor migration to unified document...');
        const startTime = performance.now();
        
        try {
            // 1. Get all pool members
            console.log('📥 Loading pool members...');
            const membersRef = db.doc(`artifacts/nerdfootball/pools/${this.poolId}/metadata/members`);
            const membersDoc = await membersRef.get();
            
            if (!membersDoc.exists) {
                throw new Error('Pool members not found');
            }
            
            const poolMembers = membersDoc.data();
            const userIds = Object.keys(poolMembers);
            console.log(`Found ${userIds.length} pool members`);
            
            // 2. Load all existing elimination statuses
            console.log('📊 Loading elimination statuses...');
            const statusRef = db.doc('artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
            const statusDoc = await statusRef.get();
            const eliminationStatuses = statusDoc.exists ? statusDoc.data() : {};
            
            // 3. Process each week
            const migrationResults = {};
            
            for (let week = 1; week <= this.currentWeek; week++) {
                console.log(`\n📅 Processing Week ${week}...`);
                const weekData = {
                    weekNumber: week,
                    year: this.currentYear,
                    users: {},
                    lastUpdated: new Date(),
                    migrated: true
                };
                
                // 4. Load all user picks for this week
                const pickPromises = userIds.map(async (uid) => {
                    try {
                        const pickRef = db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`);
                        const pickDoc = await pickRef.get();
                        
                        if (pickDoc.exists) {
                            const userData = pickDoc.data();
                            const weekPick = userData.picks?.[week];
                            
                            if (weekPick && weekPick.team) {
                                return {
                                    uid,
                                    pick: weekPick,
                                    eliminated: eliminationStatuses[uid]?.eliminated || false,
                                    eliminatedWeek: eliminationStatuses[uid]?.eliminatedWeek || null
                                };
                            }
                        }
                        
                        // Check if user was eliminated before this week
                        const wasEliminated = eliminationStatuses[uid]?.eliminated || false;
                        const eliminatedWeek = eliminationStatuses[uid]?.eliminatedWeek || null;
                        
                        if (wasEliminated && eliminatedWeek && eliminatedWeek < week) {
                            // User was eliminated in a previous week
                            return {
                                uid,
                                pick: null,
                                eliminated: true,
                                eliminatedWeek
                            };
                        }
                        
                        return null;
                    } catch (error) {
                        console.error(`Error loading pick for ${uid}:`, error);
                        return null;
                    }
                });
                
                const userPicks = await Promise.all(pickPromises);
                let activePicks = 0;
                let eliminatedUsers = 0;
                
                // 5. Build week data structure
                userPicks.forEach(userPick => {
                    if (userPick) {
                        const { uid, pick, eliminated, eliminatedWeek } = userPick;
                        
                        if (pick) {
                            weekData.users[uid] = {
                                team: pick.team,
                                gameId: pick.gameId,
                                timestamp: pick.timestamp || new Date(),
                                eliminated: eliminated || false,
                                eliminatedWeek: eliminatedWeek,
                                hasPicked: true
                            };
                            
                            if (eliminated) {
                                eliminatedUsers++;
                            } else {
                                activePicks++;
                            }
                        } else if (eliminated) {
                            // User was eliminated in a previous week
                            weekData.users[uid] = {
                                team: null,
                                gameId: null,
                                timestamp: null,
                                eliminated: true,
                                eliminatedWeek: eliminatedWeek,
                                hasPicked: false
                            };
                            eliminatedUsers++;
                        }
                    }
                });
                
                console.log(`Week ${week}: ${activePicks} active picks, ${eliminatedUsers} eliminated`);
                
                // 6. Save week data to unified document
                const weekDocPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${this.currentYear}/weeks/${week}`;
                await db.doc(weekDocPath).set(weekData);
                
                migrationResults[week] = {
                    totalUsers: Object.keys(weekData.users).length,
                    activePicks,
                    eliminatedUsers
                };
            }
            
            // 7. Create migration summary
            const migrationSummary = {
                poolId: this.poolId,
                migratedAt: new Date(),
                weeksProcessed: this.currentWeek,
                totalUsers: userIds.length,
                results: migrationResults,
                duration: performance.now() - startTime
            };
            
            // Save migration summary
            await db.doc(`artifacts/nerdfootball/pools/${this.poolId}/survivor/migration_log`).set(migrationSummary);
            
            console.log('\n✅ MIGRATION COMPLETE!');
            console.log(`Total time: ${migrationSummary.duration.toFixed(0)}ms`);
            console.log('Migration summary:', migrationResults);
            
            return migrationSummary;
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }
    
    // Verify migration was successful
    async verifyMigration() {
        console.log('\n🔍 Verifying migration...');
        
        try {
            for (let week = 1; week <= this.currentWeek; week++) {
                const weekDocPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${this.currentYear}/weeks/${week}`;
                const weekDoc = await db.doc(weekDocPath).get();
                
                if (!weekDoc.exists) {
                    console.error(`❌ Week ${week} document missing!`);
                    return false;
                }
                
                const data = weekDoc.data();
                const userCount = Object.keys(data.users || {}).length;
                console.log(`✅ Week ${week}: ${userCount} users found`);
            }
            
            console.log('✅ Migration verified successfully!');
            return true;
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
            return false;
        }
    }
    
    // One-click migration with verification
    async runFullMigration() {
        try {
            // Run migration
            const results = await this.runMigration();
            
            // Verify it worked
            const verified = await this.verifyMigration();
            
            if (verified) {
                console.log('\n🎉 MIGRATION SUCCESSFUL!');
                console.log('The unified survivor system is now ready to use.');
                console.log('Refresh the page to see sub-500ms load times!');
                
                // Initialize the unified manager if available
                if (window.unifiedSurvivorManager) {
                    await window.unifiedSurvivorManager.initialize();
                    console.log('✅ Unified manager initialized');
                }
            } else {
                console.error('⚠️ Migration completed but verification failed');
            }
            
            return verified;
            
        } catch (error) {
            console.error('❌ Full migration failed:', error);
            return false;
        }
    }
}

// Create global instance
window.survivorMigration = new SurvivorMigration();

// Auto-run migration check
async function checkMigrationStatus() {
    try {
        // Check if migration has been done
        const migrationLog = await db.doc(`artifacts/nerdfootball/pools/nerduniverse-2025/survivor/migration_log`).get();
        
        if (!migrationLog.exists) {
            console.log('⚠️ Unified survivor document not found. Run migration:');
            console.log('survivorMigration.runFullMigration()');
        } else {
            const data = migrationLog.data();
            console.log('✅ Migration already completed:', data.migratedAt);
        }
    } catch (error) {
        console.log('Migration status check error:', error);
    }
}

// Check status when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(checkMigrationStatus, 2000); // Wait for Firebase
    });
} else {
    setTimeout(checkMigrationStatus, 2000);
}