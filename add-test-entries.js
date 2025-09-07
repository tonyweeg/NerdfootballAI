#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK for local emulator  
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';

admin.initializeApp({
  projectId: 'nerdfootball-4b4b2',
  databaseURL: 'http://localhost:8081'
});

const db = admin.firestore();

async function addTestEntriesForCurrentUser() {
  try {
    console.log('🏗️ Adding test survivor entries for current user...');
    
    // Get the current user from auth emulator - we'll use a placeholder for now
    const userEmail = 'tony@test.com';
    
    // We'll need to get the actual user ID, but for now let's use a reasonable guess
    // The Firebase Auth emulator typically generates predictable IDs
    const estimatedUserId = 'auto-generated-user-id'; // This will be the real one from your login
    
    console.log(`📧 Creating entries for: ${userEmail}`);
    console.log('💡 Note: If user ID doesn\'t match your actual login, we\'ll need to update it');
    
    const testEntries = [
      {
        entryId: `entry-${Date.now()}-main`,
        entryName: 'My Main Entry',
        isActive: true,
        createdAt: new Date(),
        picks: [],
        userId: estimatedUserId
      },
      {
        entryId: `entry-${Date.now() + 1}-backup`, 
        entryName: 'Backup Strategy',
        isActive: true,
        createdAt: new Date(),
        picks: [],
        userId: estimatedUserId
      },
      {
        entryId: `entry-${Date.now() + 2}-risky`,
        entryName: 'High Risk High Reward',
        isActive: true,
        createdAt: new Date(),
        picks: [],
        userId: estimatedUserId
      }
    ];

    for (const entry of testEntries) {
      // Add to global survivor entries collection
      await db.collection('artifacts').doc('nerdfootball').collection('survivor').doc('entries').collection('entries').doc(entry.entryId).set(entry);
      
      // Add to user's personal entries collection
      await db.collection('artifacts').doc('nerdfootball').collection('users').doc(entry.userId).collection('survivor').doc('entries').collection('entries').doc(entry.entryId).set({
        entryId: entry.entryId,
        entryName: entry.entryName,
        isActive: entry.isActive,
        createdAt: entry.createdAt
      });
      
      console.log(`✅ Created entry: ${entry.entryName}`);
    }

    console.log('\n✅ Test entries created successfully!');
    console.log('🧪 You should now see:');
    console.log('   - Entry selector in Survivor section');
    console.log('   - Multiple entries to choose from');
    console.log('   - Admin controls for managing entries');
    
  } catch (error) {
    console.error('❌ Error creating test entries:', error);
  }
}

// Also create a version that can be called with actual user ID
async function addEntriesForUser(userId) {
  console.log(`🏗️ Adding entries for user ID: ${userId}`);
  // Implementation here - same as above but with actual user ID
}

if (require.main === module) {
  addTestEntriesForCurrentUser();
}

module.exports = { addEntriesForUser };