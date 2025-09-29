#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK for local emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';

admin.initializeApp({
  projectId: 'nerdfootball-4b4b2',
  databaseURL: 'http://localhost:8081'
});

const db = admin.firestore();

async function enableAllMultiEntryFlags() {
  try {
    console.log('🚀 Enabling all multi-entry features for local testing...');
    
    const multiEntryFlags = {
      'MULTI_ENTRY_DATA_ENABLED': true,
      'MULTI_ENTRY_UI_ENABLED': true, 
      'ENTRY_CREATION_ENABLED': true,
      'ENTRY_DELETION_ENABLED': true,
      'ADMIN_MIGRATION_TOOLS_ENABLED': true,
      'ADMIN_BULK_OPERATIONS_ENABLED': true,
      'ADMIN_ENTRY_TRANSFER_ENABLED': true,
      'SHOW_MULTI_ENTRY_UI': true,
      'ALLOW_MULTI_ENTRIES': true
    };

    // Enable all flags globally
    for (const [flagName, enabled] of Object.entries(multiEntryFlags)) {
      const flagData = {
        enabled: enabled,
        enabledForUsers: [],
        globallyEnabled: true,
        description: `Local testing: ${flagName}`,
        createdAt: new Date(),
        lastModified: new Date()
      };

      await db.collection('artifacts').doc('nerdfootball').collection('feature-flags').doc(flagName).set(flagData);
      console.log(`✅ Enabled: ${flagName}`);
    }

    // Also enable the old-style flags for compatibility
    const legacyFlags = {
      'multi-entry-survivor': true,
      'admin-entry-management': true,
      'entry-selector-ui': true,
      'entry-rename': true
    };

    for (const [flagName, enabled] of Object.entries(legacyFlags)) {
      const flagData = {
        enabled: enabled,
        enabledForUsers: [],
        globallyEnabled: true,
        description: `Local testing: ${flagName}`,
        createdAt: new Date(),
        lastModified: new Date()
      };

      await db.collection('artifacts').doc('nerdfootball').collection('feature-flags').doc(flagName).set(flagData);
      console.log(`✅ Enabled legacy flag: ${flagName}`);
    }

    console.log('\n✅ All multi-entry features enabled for local testing!');
    console.log('🧪 Features now available:');
    console.log('   - Multi-entry survivor pools');
    console.log('   - Entry creation/deletion');
    console.log('   - Admin management tools');
    console.log('   - Entry selector UI');
    console.log('   - Bulk operations');
    
  } catch (error) {
    console.error('❌ Error enabling multi-entry features:', error);
    process.exit(1);
  }
}

enableAllMultiEntryFlags();