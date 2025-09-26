#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK for local emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';

admin.initializeApp({
  projectId: 'nerdfootball-4b4b2',
  databaseURL: 'http://localhost:8081'
});

const db = admin.firestore();

const FEATURE_FLAGS = {
  'multi-entry-survivor': 'Enable multiple survivor entries per user',
  'admin-entry-management': 'Allow admins to create/manage entries for users',
  'entry-selector-ui': 'Show entry selector interface for users with multiple entries',
  'entry-transfer': 'Allow transferring entries between users',
  'entry-rename': 'Allow users to rename their entries'
};

const TEST_USERS = [
  { uid: 'test-user-1', email: 'tony@test.com' },
  { uid: 'test-user-2', email: 'mike@test.com' },
  { uid: 'test-user-3', email: 'sarah@test.com' }
];

async function enableFlag(flagName, userIds = []) {
  try {
    if (!FEATURE_FLAGS[flagName]) {
      console.error(`❌ Unknown feature flag: ${flagName}`);
      console.log('Available flags:', Object.keys(FEATURE_FLAGS));
      return;
    }

    const flagData = {
      enabled: userIds.length === 0, // Global enable if no specific users
      enabledForUsers: userIds,
      description: FEATURE_FLAGS[flagName],
      createdAt: new Date(),
      lastModified: new Date()
    };

    await db.doc(`artifacts/nerdfootball/feature-flags/${flagName}`).set(flagData);
    
    if (userIds.length === 0) {
      console.log(`✅ Enabled feature flag globally: ${flagName}`);
    } else {
      console.log(`✅ Enabled feature flag for specific users: ${flagName}`);
      console.log(`   Users: ${userIds.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error enabling feature flag:', error);
  }
}

async function disableFlag(flagName) {
  try {
    if (!FEATURE_FLAGS[flagName]) {
      console.error(`❌ Unknown feature flag: ${flagName}`);
      return;
    }

    await db.doc(`artifacts/nerdfootball/feature-flags/${flagName}`).update({
      enabled: false,
      enabledForUsers: [],
      lastModified: new Date()
    });

    console.log(`✅ Disabled feature flag: ${flagName}`);
  } catch (error) {
    console.error('❌ Error disabling feature flag:', error);
  }
}

async function listFlags() {
  try {
    const snapshot = await db.collection('artifacts/nerdfootball/feature-flags').get();
    
    if (snapshot.empty) {
      console.log('No feature flags found. Run import first.');
      return;
    }

    console.log('\n📊 Current Feature Flags:');
    console.log('==========================================');
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.enabled ? '🟢 ENABLED' : '🔴 DISABLED';
      const scope = data.enabled ? 'Global' : 
                   data.enabledForUsers?.length > 0 ? `Users: ${data.enabledForUsers.join(', ')}` : 'None';
      
      console.log(`${status} ${doc.id}`);
      console.log(`   Description: ${data.description || 'No description'}`);
      console.log(`   Scope: ${scope}`);
      console.log(`   Last Modified: ${data.lastModified?.toDate().toLocaleString()}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error listing feature flags:', error);
  }
}

async function enableMultiEntryTesting() {
  console.log('🚀 Setting up multi-entry testing environment...');
  
  // Enable multi-entry for test-user-1 only initially
  await enableFlag('multi-entry-survivor', ['test-user-1']);
  await enableFlag('admin-entry-management', ['test-user-1']); // Give admin powers to test-user-1
  await enableFlag('entry-selector-ui', ['test-user-1']);
  
  // Enable for all users
  await enableFlag('entry-rename', []);
  
  console.log('\n✅ Multi-entry testing environment ready!');
  console.log('📋 Test Scenario Setup:');
  console.log('   - test-user-1: Has multi-entry features + admin powers');
  console.log('   - test-user-2: Standard single entry user');  
  console.log('   - test-user-3: Standard single entry user');
  console.log('   - All users can rename entries');
}

async function createTestEntries() {
  try {
    console.log('🏗️  Creating additional test entries for multi-entry testing...');

    const additionalEntries = [
      {
        userId: 'test-user-1',
        entryId: 'entry-1-backup',
        entryName: 'Tony Backup Entry',
        isActive: true,
        createdAt: new Date(),
        picks: []
      },
      {
        userId: 'test-user-1', 
        entryId: 'entry-1-risky',
        entryName: 'Tony Risky Picks',
        isActive: true,
        createdAt: new Date(),
        picks: []
      }
    ];

    for (const entry of additionalEntries) {
      await db.collection('artifacts').doc('nerdfootball').collection('survivor').doc('entries').collection('entries').doc(entry.entryId).set(entry);
      
      // Also add to user's entries collection
      await db.collection('artifacts').doc('nerdfootball').collection('users').doc(entry.userId).collection('survivor').doc('entries').collection('entries').doc(entry.entryId).set({
        entryId: entry.entryId,
        entryName: entry.entryName,
        isActive: entry.isActive,
        createdAt: entry.createdAt
      });
      
      console.log(`✅ Created entry: ${entry.entryName}`);
    }

    console.log('✅ Additional test entries created successfully!');
  } catch (error) {
    console.error('❌ Error creating test entries:', error);
  }
}

// CLI interface
const command = process.argv[2];
const flagName = process.argv[3];
const userIds = process.argv.slice(4);

if (command === 'enable' && flagName) {
  enableFlag(flagName, userIds);
} else if (command === 'disable' && flagName) {
  disableFlag(flagName);
} else if (command === 'list') {
  listFlags();
} else if (command === 'setup-multi-entry') {
  enableMultiEntryTesting();
} else if (command === 'create-test-entries') {
  createTestEntries();
} else if (command === 'full-setup') {
  enableMultiEntryTesting().then(() => createTestEntries());
} else {
  console.log('Local Feature Flag Manager');
  console.log('==========================');
  console.log('');
  console.log('Commands:');
  console.log('  enable <flag-name> [user-ids...]   - Enable flag globally or for specific users');
  console.log('  disable <flag-name>                - Disable flag');
  console.log('  list                               - List all flags and their status');
  console.log('  setup-multi-entry                  - Setup multi-entry testing environment');
  console.log('  create-test-entries                - Create additional test entries');
  console.log('  full-setup                         - Complete multi-entry setup');
  console.log('');
  console.log('Available flags:');
  Object.keys(FEATURE_FLAGS).forEach(flag => {
    console.log(`  ${flag} - ${FEATURE_FLAGS[flag]}`);
  });
  console.log('');
  console.log('Available test users:');
  TEST_USERS.forEach(user => {
    console.log(`  ${user.uid} (${user.email})`);
  });
}