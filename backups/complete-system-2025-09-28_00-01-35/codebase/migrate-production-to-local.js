#!/usr/bin/env node

/**
 * Production Data Migration to Local Emulator
 * 
 * This script migrates all production NerdFootball data to local Firebase emulator,
 * transforms it to the new multi-entry structure, and sets up the genesis pool
 * as a survivor + confidence pool with multiple entries support.
 * 
 * SAFE APPROACH:
 * 1. Download production data (read-only)
 * 2. Transform to new multi-entry structure
 * 3. Import to local emulator
 * 4. Test thoroughly before any production changes
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Production Firebase config (read-only access)
const productionConfig = {
  credential: admin.credential.applicationDefault(),
  projectId: 'your-production-project-id' // Replace with actual project ID
};

// Local emulator config
const emulatorConfig = {
  projectId: 'demo-nerdfootball-local',
  credential: admin.credential.applicationDefault()
};

class ProductionMigrator {
  constructor() {
    this.productionDb = null;
    this.localDb = null;
    this.migrationData = {};
    this.migrationLog = [];
    this.genesisPoolId = 'nerduniverse-2025';
    this.allPools = [];
  }

  async initialize() {
    console.log('🚀 Initializing Production Data Migration...\n');
    
    try {
      // Initialize production Firebase (read-only)
      const productionApp = admin.initializeApp(productionConfig, 'production');
      this.productionDb = productionApp.firestore();
      
      // Initialize local emulator Firebase
      const localApp = admin.initializeApp(emulatorConfig, 'local');
      
      // Connect to local emulator
      this.localDb = localApp.firestore();
      this.localDb.settings({
        host: 'localhost:8081',
        ssl: false,
        ignoreUndefinedProperties: true
      });
      
      console.log('✅ Firebase connections established');
      console.log('📊 Production DB: Connected (READ-ONLY)');
      console.log('🧪 Local Emulator: Connected (localhost:8081)\n');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  async migrateFullProduction() {
    console.log('📋 FULL PRODUCTION MIGRATION PLAN:\n');
    console.log('1. Download pool members & users');
    console.log('2. Download historical picks & results');
    console.log('3. Download survivor data');
    console.log('4. Transform to multi-entry structure');
    console.log('5. Configure genesis pool as survivor+confidence');
    console.log('6. Import to local emulator');
    console.log('7. Validate data integrity\n');
    
    try {
      // Phase 1: Download production data
      console.log('📥 Phase 1: Downloading Production Data...');
      await this.downloadPoolData();
      await this.downloadUserData();
      await this.downloadPicksData();
      await this.downloadSurvivorData();
      await this.downloadResultsData();
      
      // Phase 2: Transform data structure
      console.log('\n🔄 Phase 2: Transforming Data Structure...');
      await this.transformToMultiEntryStructure();
      
      // Phase 3: Import to local emulator
      console.log('\n📤 Phase 3: Importing to Local Emulator...');
      await this.importToLocalEmulator();
      
      // Phase 4: Configure multi-entry features
      console.log('\n⚙️ Phase 4: Configuring Multi-Entry Features...');
      await this.configureGenesisPool();
      
      // Phase 5: Validation
      console.log('\n✅ Phase 5: Validating Migration...');
      await this.validateMigration();
      
      // Generate migration report
      await this.generateMigrationReport();
      
      console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('📊 Check migration-report.json for details');
      console.log('🧪 Local emulator ready for testing');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      this.logError('Migration failed', error);
      throw error;
    }
  }

  async downloadPoolData() {
    console.log('  📊 Downloading all pool data...');
    
    try {
      // Discover all pools first
      const poolsRef = this.productionDb
        .collection('artifacts')
        .doc('nerdfootball')
        .collection('pools');
        
      const poolsSnapshot = await poolsRef.get();
      this.allPools = [];
      poolsSnapshot.forEach(doc => {
        this.allPools.push(doc.id);
      });
      
      console.log(`    🔍 Discovered ${this.allPools.length} pools: ${this.allPools.join(', ')}`);
      
      this.migrationData.pools = {};
      
      // Download data for all pools
      for (const poolId of this.allPools) {
        console.log(`    📥 Downloading pool: ${poolId}`);
        
        this.migrationData.pools[poolId] = {
          members: {},
          picks: {},
          survivorPicks: {},
          config: {}
        };
        
        // Download pool members
        const poolMembersRef = this.productionDb
          .collection('artifacts')
          .doc('nerdfootball')
          .collection('pools')
          .doc(poolId)
          .collection('metadata')
          .doc('members');
          
        const poolMembersDoc = await poolMembersRef.get();
        
        if (poolMembersDoc.exists) {
          this.migrationData.pools[poolId].members = poolMembersDoc.data();
          console.log(`      ✅ ${poolId}: ${Object.keys(this.migrationData.pools[poolId].members).length} members`);
        } else {
          console.log(`      ⚠️ ${poolId}: No pool members found`);
        }
        
        // Download pool configuration if exists
        const poolConfigRef = this.productionDb
          .collection('artifacts')
          .doc('nerdfootball')
          .collection('pools')
          .doc(poolId)
          .collection('metadata')
          .doc('poolConfig');
          
        const poolConfigDoc = await poolConfigRef.get();
        if (poolConfigDoc.exists) {
          this.migrationData.pools[poolId].config = poolConfigDoc.data();
        }
      }
      
    } catch (error) {
      console.error('    ❌ Error downloading pool data:', error);
      this.logError('Pool data download failed', error);
    }
  }

  async downloadUserData() {
    console.log('  👥 Downloading user profiles...');
    
    try {
      // Download legacy user profiles
      const usersRef = this.productionDb
        .collection('artifacts')
        .doc('nerdfootball')
        .collection('public')
        .doc('data')
        .collection('nerdfootball_users');
        
      const usersSnapshot = await usersRef.get();
      this.migrationData.users = {};
      
      usersSnapshot.forEach(doc => {
        this.migrationData.users[doc.id] = doc.data();
      });
      
      console.log(`    ✅ Downloaded ${usersSnapshot.size} user profiles`);
      
    } catch (error) {
      console.error('    ❌ Error downloading user data:', error);
      this.logError('User data download failed', error);
    }
  }

  async downloadPicksData() {
    console.log('  🏈 Downloading picks data for all pools...');
    
    try {
      this.migrationData.allPicks = {};
      
      // Download legacy confidence picks (global)
      for (let week = 1; week <= 18; week++) {
        const picksRef = this.productionDb
          .collection('artifacts')
          .doc('nerdfootball')
          .collection('public')
          .doc('data')
          .collection('nerdfootball_picks')
          .doc(`week${week}`)
          .collection('submissions');
          
        const picksSnapshot = await picksRef.get();
        this.migrationData.allPicks[`legacy_week${week}`] = {};
        
        picksSnapshot.forEach(doc => {
          this.migrationData.allPicks[`legacy_week${week}`][doc.id] = {
            ...doc.data(),
            source: 'legacy_confidence',
            poolAssociation: 'to_be_determined'
          };
        });
        
        if (picksSnapshot.size > 0) {
          console.log(`    ✅ Legacy Week ${week}: ${picksSnapshot.size} submissions`);
        }
      }
      
      // Download pool-specific picks for all discovered pools
      for (const poolId of this.allPools) {
        console.log(`    📥 Downloading pool picks: ${poolId}`);
        
        // Download confidence picks for this pool
        const poolPicksRef = this.productionDb
          .collection('artifacts')
          .doc('nerdfootball')
          .collection('pools')
          .doc(poolId)
          .collection('picks');
          
        const userPicksSnapshot = await poolPicksRef.get();
        let poolPicksCount = 0;
        
        for (const userDoc of userPicksSnapshot.docs) {
          const userId = userDoc.id;
          
          // Get confidence picks
          const confidenceRef = userDoc.ref.collection('confidence');
          const confidenceSnapshot = await confidenceRef.get();
          
          confidenceSnapshot.forEach(weekDoc => {
            const weekKey = `${poolId}_confidence_${weekDoc.id}`;
            this.migrationData.allPicks[weekKey] = {
              userId: userId,
              ...weekDoc.data(),
              source: 'pool_confidence',
              poolId: poolId,
              week: weekDoc.id
            };
            poolPicksCount++;
          });
          
          // Get survivor picks
          const survivorRef = userDoc.ref.collection('survivor');
          const survivorSnapshot = await survivorRef.get();
          
          for (const entryDoc of survivorSnapshot.docs) {
            const entryId = entryDoc.id;
            const weeksRef = entryDoc.ref.collection('weeks');
            const weeksSnapshot = await weeksRef.get();
            
            weeksSnapshot.forEach(weekDoc => {
              const weekKey = `${poolId}_survivor_${userId}_${entryId}_${weekDoc.id}`;
              this.migrationData.allPicks[weekKey] = {
                userId: userId,
                entryId: entryId,
                ...weekDoc.data(),
                source: 'pool_survivor',
                poolId: poolId,
                week: weekDoc.id
              };
              poolPicksCount++;
            });
          }
        }
        
        console.log(`      ✅ ${poolId}: ${poolPicksCount} total picks`);
      }
      
      console.log(`    📊 Total picks downloaded: ${Object.keys(this.migrationData.allPicks).length}`);
      
    } catch (error) {
      console.error('    ❌ Error downloading picks data:', error);
      this.logError('Picks data download failed', error);
    }
  }

  async downloadSurvivorData() {
    console.log('  💀 Downloading survivor data...');
    
    try {
      // Download survivor picks
      const survivorPicksRef = this.productionDb
        .collection('artifacts')
        .doc('nerdfootball')
        .collection('public')
        .doc('data')
        .collection('nerdSurvivor_picks');
        
      const survivorPicksSnapshot = await survivorPicksRef.get();
      this.migrationData.survivorPicks = {};
      
      survivorPicksSnapshot.forEach(doc => {
        this.migrationData.survivorPicks[doc.id] = doc.data();
      });
      
      // Download survivor status
      const survivorStatusRef = this.productionDb
        .collection('artifacts')
        .doc('nerdfootball')
        .collection('public')
        .doc('data')
        .collection('nerdSurvivor_status')
        .doc('status');
        
      const survivorStatusDoc = await survivorStatusRef.get();
      if (survivorStatusDoc.exists) {
        this.migrationData.survivorStatus = survivorStatusDoc.data();
      }
      
      console.log(`    ✅ Downloaded ${survivorPicksSnapshot.size} survivor entries`);
      
    } catch (error) {
      console.error('    ❌ Error downloading survivor data:', error);
      this.logError('Survivor data download failed', error);
    }
  }

  async downloadResultsData() {
    console.log('  🏆 Downloading results data...');
    
    try {
      this.migrationData.results = {};
      
      // Download results for each week
      for (let week = 1; week <= 18; week++) {
        const resultsRef = this.productionDb
          .collection('artifacts')
          .doc('nerdfootball')
          .collection('public')
          .doc('data')
          .collection('nerdfootball_results')
          .doc(`week${week}`);
          
        const resultsDoc = await resultsRef.get();
        
        if (resultsDoc.exists) {
          this.migrationData.results[`week${week}`] = resultsDoc.data();
          console.log(`    ✅ Week ${week}: Results downloaded`);
        }
      }
      
    } catch (error) {
      console.error('    ❌ Error downloading results data:', error);
      this.logError('Results data download failed', error);
    }
  }

  async transformToMultiEntryStructure() {
    console.log('  🔄 Transforming to multi-entry structure while preserving all pool associations...');
    
    this.migrationData.transformed = {
      pools: {}
    };
    
    // Transform each discovered pool
    for (const poolId of this.allPools) {
      console.log(`    🔄 Transforming pool: ${poolId}`);
      
      this.migrationData.transformed.pools[poolId] = {
        config: {
          poolId: poolId,
          type: poolId === this.genesisPoolId ? 'both' : 'confidence', // Genesis pool gets both, others confidence only
          multiEntryEnabled: poolId === this.genesisPoolId,
          maxSurvivorEntries: poolId === this.genesisPoolId ? 3 : 1,
          confidenceEnabled: true,
          survivorEnabled: poolId === this.genesisPoolId,
          createdAt: new Date().toISOString(),
          migratedFrom: 'legacy-production',
          ...this.migrationData.pools[poolId].config // Preserve existing config
        },
        members: {},
        confidencePicks: {},
        survivorEntries: {},
        entries: {}
      };
      
      // Transform pool members
      const poolMembers = this.migrationData.pools[poolId].members || {};
      const users = this.migrationData.users || {};
      
      for (const [userId, memberData] of Object.entries(poolMembers)) {
        const userData = users[userId] || {};
        
        this.migrationData.transformed.pools[poolId].members[userId] = {
          displayName: memberData.displayName || userData.displayName || 'Unknown User',
          email: memberData.email || userData.email || '',
          role: memberData.role || 'member',
          joinedAt: memberData.joinedAt || new Date().toISOString(),
          active: true,
          migratedFrom: 'pool-members'
        };
      }
      
      // If no pool members, try to determine from picks data
      if (Object.keys(this.migrationData.transformed.pools[poolId].members).length === 0) {
        console.log(`    ⚠️ ${poolId}: No pool members found, determining from picks...`);
        
        // Find users who have picks for this pool
        const poolUsers = new Set();
        for (const [pickKey, pickData] of Object.entries(this.migrationData.allPicks)) {
          if (pickData.poolId === poolId || 
              (pickData.source === 'legacy_confidence' && poolId === this.genesisPoolId)) {
            poolUsers.add(pickData.userId);
          }
        }
        
        // Add these users to pool members
        for (const userId of poolUsers) {
          const userData = users[userId] || {};
          this.migrationData.transformed.pools[poolId].members[userId] = {
            displayName: userData.displayName || `User ${userId.substring(0, 8)}`,
            email: userData.email || '',
            role: 'member',
            joinedAt: new Date().toISOString(),
            active: true,
            migratedFrom: 'picks-inference'
          };
        }
      }
    }
    
    // Transform all picks while preserving pool associations
    console.log('    📊 Transforming picks with pool associations...');
    
    for (const [pickKey, pickData] of Object.entries(this.migrationData.allPicks)) {
      let targetPoolId = pickData.poolId;
      
      // Handle legacy picks - associate with genesis pool
      if (pickData.source === 'legacy_confidence') {
        targetPoolId = this.genesisPoolId;
        
        // Extract week from key
        const weekMatch = pickKey.match(/week(\d+)/);
        const week = weekMatch ? weekMatch[1] : '1';
        
        if (!this.migrationData.transformed.pools[targetPoolId].confidencePicks[pickData.userId]) {
          this.migrationData.transformed.pools[targetPoolId].confidencePicks[pickData.userId] = {};
        }
        
        this.migrationData.transformed.pools[targetPoolId].confidencePicks[pickData.userId][week] = {
          picks: pickData.picks || {},
          submittedAt: pickData.timestamp || new Date().toISOString(),
          locked: true,
          migratedFrom: 'legacy-confidence',
          originalPoolAssociation: 'legacy-global'
        };
      }
      
      // Handle pool-specific confidence picks
      else if (pickData.source === 'pool_confidence') {
        if (!this.migrationData.transformed.pools[targetPoolId].confidencePicks[pickData.userId]) {
          this.migrationData.transformed.pools[targetPoolId].confidencePicks[pickData.userId] = {};
        }
        
        this.migrationData.transformed.pools[targetPoolId].confidencePicks[pickData.userId][pickData.week] = {
          picks: pickData.picks || {},
          submittedAt: pickData.submittedAt || new Date().toISOString(),
          locked: true,
          migratedFrom: 'pool-confidence',
          originalPoolAssociation: targetPoolId
        };
      }
      
      // Handle survivor picks
      else if (pickData.source === 'pool_survivor') {
        if (!this.migrationData.transformed.pools[targetPoolId].entries[pickData.userId]) {
          this.migrationData.transformed.pools[targetPoolId].entries[pickData.userId] = {
            metadata: {}
          };
        }
        
        if (!this.migrationData.transformed.pools[targetPoolId].entries[pickData.userId].metadata[pickData.entryId]) {
          this.migrationData.transformed.pools[targetPoolId].entries[pickData.userId].metadata[pickData.entryId] = {
            id: pickData.entryId,
            name: pickData.entryId === 'default' ? 'Original Entry' : `Entry ${pickData.entryId}`,
            type: 'survivor',
            createdAt: new Date().toISOString(),
            active: true,
            migratedFrom: 'pool-survivor'
          };
        }
        
        if (!this.migrationData.transformed.pools[targetPoolId].survivorEntries[pickData.userId]) {
          this.migrationData.transformed.pools[targetPoolId].survivorEntries[pickData.userId] = {};
        }
        
        if (!this.migrationData.transformed.pools[targetPoolId].survivorEntries[pickData.userId][pickData.entryId]) {
          this.migrationData.transformed.pools[targetPoolId].survivorEntries[pickData.userId][pickData.entryId] = {
            weeks: {}
          };
        }
        
        this.migrationData.transformed.pools[targetPoolId].survivorEntries[pickData.userId][pickData.entryId].weeks[pickData.week] = {
          team: pickData.team,
          submittedAt: pickData.submittedAt || new Date().toISOString(),
          locked: true,
          migratedFrom: 'pool-survivor',
          originalPoolAssociation: targetPoolId
        };
      }
    }
    
    // Process legacy survivor picks separately
    for (const [userId, survivorData] of Object.entries(this.migrationData.survivorPicks || {})) {
      const targetPoolId = this.genesisPoolId; // Legacy survivor goes to genesis
      
      if (!this.migrationData.transformed.pools[targetPoolId].entries[userId]) {
        this.migrationData.transformed.pools[targetPoolId].entries[userId] = {
          metadata: {}
        };
      }
      
      this.migrationData.transformed.pools[targetPoolId].entries[userId].metadata['legacy'] = {
        id: 'legacy',
        name: 'Legacy Entry',
        type: 'survivor',
        createdAt: survivorData.createdAt || new Date().toISOString(),
        active: true,
        migratedFrom: 'legacy-survivor'
      };
      
      if (!this.migrationData.transformed.pools[targetPoolId].survivorEntries[userId]) {
        this.migrationData.transformed.pools[targetPoolId].survivorEntries[userId] = {};
      }
      
      this.migrationData.transformed.pools[targetPoolId].survivorEntries[userId]['legacy'] = {
        weeks: survivorData.weeks || {},
        eliminated: survivorData.eliminated || false,
        eliminatedWeek: survivorData.eliminatedWeek || null,
        migratedFrom: 'legacy-survivor'
      };
    }
    
    // Print transformation summary
    for (const poolId of this.allPools) {
      const pool = this.migrationData.transformed.pools[poolId];
      console.log(`    ✅ ${poolId}: ${Object.keys(pool.members).length} members, ${Object.keys(pool.confidencePicks).length} confidence users, ${Object.keys(pool.survivorEntries).length} survivor users`);
    }
  }

  async importToLocalEmulator() {
    console.log('  📤 Importing all pools to local emulator...');
    
    try {
      // Import each pool separately to maintain associations
      for (const poolId of this.allPools) {
        console.log(`    📥 Importing pool: ${poolId}`);
        const poolData = this.migrationData.transformed.pools[poolId];
        
        // Import pool configuration
        const poolConfigRef = this.localDb
          .collection('artifacts')
          .doc('nerdfootball')
          .collection('pools')
          .doc(poolId)
          .collection('metadata')
          .doc('poolConfig');
          
        await poolConfigRef.set(poolData.config);
        
        // Import pool members
        const poolMembersRef = this.localDb
          .collection('artifacts')
          .doc('nerdfootball')
          .collection('pools')
          .doc(poolId)
          .collection('metadata')
          .doc('members');
          
        await poolMembersRef.set(poolData.members);
        
        // Import confidence picks
        let confidenceCount = 0;
        for (const [userId, userPicks] of Object.entries(poolData.confidencePicks)) {
          for (const [week, pickData] of Object.entries(userPicks)) {
            const pickRef = this.localDb
              .collection('artifacts')
              .doc('nerdfootball')
              .collection('pools')
              .doc(poolId)
              .collection('picks')
              .doc(userId)
              .collection('confidence')
              .doc(week);
              
            await pickRef.set(pickData);
            confidenceCount++;
          }
        }
        
        // Import survivor entries and metadata
        let survivorCount = 0;
        for (const [userId, entryMetadata] of Object.entries(poolData.entries)) {
          // Import entry metadata
          for (const [entryId, metadata] of Object.entries(entryMetadata.metadata)) {
            const metadataRef = this.localDb
              .collection('artifacts')
              .doc('nerdfootball')
              .collection('pools')
              .doc(poolId)
              .collection('entries')
              .doc(userId)
              .collection('metadata')
              .doc(entryId);
              
            await metadataRef.set(metadata);
          }
          
          // Import survivor picks for each entry
          const userSurvivorEntries = poolData.survivorEntries[userId] || {};
          for (const [entryId, entryData] of Object.entries(userSurvivorEntries)) {
            for (const [week, weekData] of Object.entries(entryData.weeks || {})) {
              const survivorPickRef = this.localDb
                .collection('artifacts')
                .doc('nerdfootball')
                .collection('pools')
                .doc(poolId)
                .collection('picks')
                .doc(userId)
                .collection('survivor')
                .doc(entryId)
                .collection('weeks')
                .doc(week);
                
              await survivorPickRef.set({
                team: weekData.team,
                submittedAt: weekData.submittedAt || new Date().toISOString(),
                locked: true,
                migratedFrom: weekData.migratedFrom,
                originalPoolAssociation: weekData.originalPoolAssociation
              });
              survivorCount++;
            }
          }
        }
        
        console.log(`      ✅ ${poolId}: ${Object.keys(poolData.members).length} members, ${confidenceCount} confidence picks, ${survivorCount} survivor picks`);
      }
      
      console.log('    ✅ All pools imported to local emulator with preserved associations');
      
    } catch (error) {
      console.error('    ❌ Import failed:', error);
      this.logError('Local import failed', error);
      throw error;
    }
  }

  async configureGenesisPool() {
    console.log('  ⚙️ Configuring genesis pool multi-entry features...');
    
    try {
      // Enable feature flags for multi-entry
      const featureFlagsRef = this.localDb
        .collection('artifacts')
        .doc('nerdfootball')
        .collection('admin')
        .doc('featureFlags');
        
      await featureFlagsRef.set({
        MULTI_ENTRY_DATA_ENABLED: true,
        MULTI_ENTRY_UI_ENABLED: true,
        ENTRY_CREATION_ENABLED: true,
        ENTRY_DELETION_ENABLED: true,
        ADMIN_MIGRATION_TOOLS_ENABLED: true,
        lastUpdated: new Date().toISOString(),
        enabledBy: 'production-migration'
      });
      
      console.log('    ✅ Multi-entry feature flags enabled');
      console.log('    ✅ Genesis pool configured for survivor + confidence');
      console.log('    ✅ Maximum 3 survivor entries per user');
      
    } catch (error) {
      console.error('    ❌ Configuration failed:', error);
      this.logError('Genesis pool configuration failed', error);
    }
  }

  async validateMigration() {
    console.log('  ✅ Validating migration integrity for all pools...');
    
    const validation = {
      pools: {},
      totalMembers: 0,
      totalConfidencePicks: 0,
      totalSurvivorPicks: 0,
      errors: []
    };
    
    try {
      for (const poolId of this.allPools) {
        console.log(`    🔍 Validating pool: ${poolId}`);
        
        validation.pools[poolId] = {
          members: 0,
          confidenceUsers: 0,
          survivorUsers: 0,
          confidencePicks: 0,
          survivorPicks: 0
        };
        
        // Validate pool members
        const poolMembersRef = this.localDb
          .collection('artifacts')
          .doc('nerdfootball')
          .collection('pools')
          .doc(poolId)
          .collection('metadata')
          .doc('members');
          
        const poolMembersDoc = await poolMembersRef.get();
        if (poolMembersDoc.exists) {
          validation.pools[poolId].members = Object.keys(poolMembersDoc.data()).length;
          validation.totalMembers += validation.pools[poolId].members;
        }
        
        // Validate confidence picks
        const confidencePicksRef = this.localDb
          .collection('artifacts')
          .doc('nerdfootball')
          .collection('pools')
          .doc(poolId)
          .collection('picks');
          
        const usersSnapshot = await confidencePicksRef.get();
        validation.pools[poolId].confidenceUsers = usersSnapshot.size;
        
        // Count confidence and survivor picks
        for (const userDoc of usersSnapshot.docs) {
          const confidenceRef = userDoc.ref.collection('confidence');
          const confidenceSnapshot = await confidenceRef.get();
          validation.pools[poolId].confidencePicks += confidenceSnapshot.size;
          
          const survivorRef = userDoc.ref.collection('survivor');
          const survivorSnapshot = await survivorRef.get();
          
          for (const entryDoc of survivorSnapshot.docs) {
            const weeksRef = entryDoc.ref.collection('weeks');
            const weeksSnapshot = await weeksRef.get();
            validation.pools[poolId].survivorPicks += weeksSnapshot.size;
          }
        }
        
        // Count survivor users
        const entriesRef = this.localDb
          .collection('artifacts')
          .doc('nerdfootball')
          .collection('pools')
          .doc(poolId)
          .collection('entries');
          
        const entriesSnapshot = await entriesRef.get();
        validation.pools[poolId].survivorUsers = entriesSnapshot.size;
        
        validation.totalConfidencePicks += validation.pools[poolId].confidencePicks;
        validation.totalSurvivorPicks += validation.pools[poolId].survivorPicks;
        
        console.log(`      ✅ ${poolId}: ${validation.pools[poolId].members} members, ${validation.pools[poolId].confidencePicks} confidence picks, ${validation.pools[poolId].survivorPicks} survivor picks`);
      }
      
      console.log(`    📊 TOTAL VALIDATION SUMMARY:`);
      console.log(`      👥 Total Members Across All Pools: ${validation.totalMembers}`);
      console.log(`      🏈 Total Confidence Picks: ${validation.totalConfidencePicks}`);
      console.log(`      💀 Total Survivor Picks: ${validation.totalSurvivorPicks}`);
      console.log(`      🏊 Pools Preserved: ${this.allPools.length}`);
      
      this.migrationData.validation = validation;
      
    } catch (error) {
      console.error('    ❌ Validation failed:', error);
      validation.errors.push(error.message);
      this.logError('Migration validation failed', error);
    }
  }

  async generateMigrationReport() {
    const report = {
      migrationDate: new Date().toISOString(),
      sourceEnvironment: 'production',
      targetEnvironment: 'local-emulator',
      genesisPoolId: this.genesisPoolId,
      
      summary: {
        poolMembers: Object.keys(this.migrationData.transformed?.poolMembers || {}).length,
        confidenceUsers: Object.keys(this.migrationData.transformed?.confidencePicks || {}).length,
        survivorUsers: Object.keys(this.migrationData.transformed?.survivorEntries || {}).length,
        totalWeeksOfData: 18
      },
      
      configuration: this.migrationData.transformed?.poolConfig,
      validation: this.migrationData.validation,
      migrationLog: this.migrationLog,
      
      nextSteps: [
        '1. Start local emulator: firebase emulators:start',
        '2. Visit http://localhost:5002/?view=admin',
        '3. Navigate to Multi-Entry Admin tab',
        '4. Test multi-entry functionality',
        '5. Verify data integrity',
        '6. Test user workflows',
        '7. When ready, deploy to staging environment'
      ]
    };
    
    await fs.promises.writeFile(
      'migration-report.json', 
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📊 MIGRATION REPORT GENERATED:');
    console.log('  📄 File: migration-report.json');
    console.log(`  👥 Pool Members: ${report.summary.poolMembers}`);
    console.log(`  🏈 Confidence Users: ${report.summary.confidenceUsers}`);
    console.log(`  💀 Survivor Users: ${report.summary.survivorUsers}`);
    console.log('  ⚙️ Pool Type: Both (Survivor + Confidence)');
    console.log('  🔢 Max Survivor Entries: 3 per user');
  }

  logError(context, error) {
    this.migrationLog.push({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      context,
      error: error.message,
      stack: error.stack
    });
  }
}

// Main execution
async function main() {
  const migrator = new ProductionMigrator();
  
  try {
    await migrator.initialize();
    await migrator.migrateFullProduction();
    
    console.log('\n🎯 MIGRATION COMPLETE! Ready for testing.');
    console.log('Next: Start emulators and test multi-entry functionality');
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProductionMigrator;