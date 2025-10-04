#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK for local emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9098';

admin.initializeApp({
  projectId: 'nerdfootball-4b4b2',
  databaseURL: 'http://localhost:8081'
});

const db = admin.firestore();
const auth = admin.auth();

// Sample data for local testing
const testUsers = [
  {
    uid: 'test-user-1',
    email: 'tony@test.com',
    displayName: 'Tony Test',
    emailVerified: true
  },
  {
    uid: 'test-user-2', 
    email: 'mike@test.com',
    displayName: 'Mike Test',
    emailVerified: true
  },
  {
    uid: 'test-user-3',
    email: 'sarah@test.com',
    displayName: 'Sarah Test',
    emailVerified: true
  }
];

const poolMembers = [
  {
    uid: 'test-user-1',
    email: 'tony@test.com',
    displayName: 'Tony Test',
    joinedAt: new Date('2024-08-01'),
    isActive: true
  },
  {
    uid: 'test-user-2',
    email: 'mike@test.com', 
    displayName: 'Mike Test',
    joinedAt: new Date('2024-08-02'),
    isActive: true
  },
  {
    uid: 'test-user-3',
    email: 'sarah@test.com',
    displayName: 'Sarah Test',
    joinedAt: new Date('2024-08-03'),
    isActive: true
  }
];

const survivorEntries = [
  {
    userId: 'test-user-1',
    entryId: 'entry-1-main',
    entryName: 'Tony Main Entry',
    isActive: true,
    createdAt: new Date('2024-08-01'),
    picks: []
  },
  {
    userId: 'test-user-2',
    entryId: 'entry-2-main',
    entryName: 'Mike Main Entry', 
    isActive: true,
    createdAt: new Date('2024-08-02'),
    picks: []
  }
];

const featureFlags = {
  'multi-entry-survivor': {
    enabled: false,
    enabledForUsers: [],
    createdAt: new Date(),
    lastModified: new Date()
  },
  'admin-entry-management': {
    enabled: false,
    enabledForUsers: [],
    createdAt: new Date(),
    lastModified: new Date()
  }
};

async function importTestData() {
  try {
    console.log('🚀 Starting local data import...');

    // Create test users in Auth emulator
    console.log('📥 Creating test users...');
    for (const user of testUsers) {
      try {
        await auth.createUser(user);
        console.log(`✅ Created user: ${user.email}`);
      } catch (error) {
        if (error.code === 'auth/uid-already-exists') {
          console.log(`⚠️  User already exists: ${user.email}`);
        } else {
          console.error(`❌ Error creating user ${user.email}:`, error);
        }
      }
    }

    // Import pool members
    console.log('📥 Importing pool members...');
    for (const member of poolMembers) {
      await db.collection('artifacts').doc('nerdfootball').collection('pools').doc('nerduniverse-2025').collection('metadata').doc('members').collection('members').doc(member.uid).set(member);
      console.log(`✅ Added pool member: ${member.email}`);
    }

    // Import survivor entries
    console.log('📥 Importing survivor entries...');
    for (const entry of survivorEntries) {
      await db.collection('artifacts').doc('nerdfootball').collection('survivor').doc('entries').collection('entries').doc(entry.entryId).set(entry);
      
      // Also add to user's entries collection
      await db.collection('artifacts').doc('nerdfootball').collection('users').doc(entry.userId).collection('survivor').doc('entries').collection('entries').doc(entry.entryId).set({
        entryId: entry.entryId,
        entryName: entry.entryName,
        isActive: entry.isActive,
        createdAt: entry.createdAt
      });
      
      console.log(`✅ Added survivor entry: ${entry.entryName}`);
    }

    // Import feature flags
    console.log('📥 Importing feature flags...');
    for (const [flagName, flagData] of Object.entries(featureFlags)) {
      await db.collection('artifacts').doc('nerdfootball').collection('feature-flags').doc(flagName).set(flagData);
      console.log(`✅ Added feature flag: ${flagName}`);
    }

    // Import current season data
    console.log('📥 Setting up current season...');
    await db.collection('artifacts').doc('nerdfootball').collection('season').doc('current').set({
      year: 2025,
      week: 1,
      isActive: true,
      survivorActive: true,
      lastUpdated: new Date()
    });

    console.log('✅ Local data import completed successfully!');
    console.log('\n📊 Imported:');
    console.log(`   - ${testUsers.length} test users`);
    console.log(`   - ${poolMembers.length} pool members`);
    console.log(`   - ${survivorEntries.length} survivor entries`);
    console.log(`   - ${Object.keys(featureFlags).length} feature flags`);
    console.log(`   - Season data`);

  } catch (error) {
    console.error('❌ Error importing data:', error);
    process.exit(1);
  }
}

async function clearTestData() {
  try {
    console.log('🧹 Clearing existing test data...');
    
    // Clear collections
    const collections = [
      'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members',
      'artifacts/nerdfootball/survivor/entries',
      'artifacts/nerdfootball/feature-flags',
      'artifacts/nerdfootball/season'
    ];

    for (const collectionPath of collections) {
      try {
        const snapshot = await db.collection(collectionPath).get();
        const batch = db.batch();
        
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        if (!snapshot.empty) {
          await batch.commit();
          console.log(`✅ Cleared collection: ${collectionPath}`);
        }
      } catch (error) {
        console.log(`⚠️  Collection not found or empty: ${collectionPath}`);
      }
    }

    // Clear user entries
    for (const user of testUsers) {
      try {
        const userEntriesPath = `artifacts/nerdfootball/users/${user.uid}/survivor/entries`;
        const snapshot = await db.collection(userEntriesPath).get();
        const batch = db.batch();
        
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        if (!snapshot.empty) {
          await batch.commit();
          console.log(`✅ Cleared user entries for: ${user.email}`);
        }
      } catch (error) {
        console.log(`⚠️  User entries not found: ${user.email}`);
      }
    }

    console.log('✅ Test data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
}

// CLI interface
const command = process.argv[2];

if (command === 'import') {
  importTestData();
} else if (command === 'clear') {
  clearTestData();
} else if (command === 'reset') {
  clearTestData().then(() => importTestData());
} else {
  console.log('Usage:');
  console.log('  node local-data-import.js import  - Import test data');
  console.log('  node local-data-import.js clear   - Clear test data');
  console.log('  node local-data-import.js reset   - Clear then import test data');
}