#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK for local emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';

admin.initializeApp({
  projectId: 'nerdfootball-4b4b2',
  databaseURL: 'http://localhost:8081'
});

const db = admin.firestore();
const auth = admin.auth();

async function setupAdminPermissions() {
  try {
    console.log('👑 Setting up admin permissions for local testing...');
    
    // Get all users from Auth emulator to find the actual user ID
    const listUsers = await auth.listUsers();
    console.log(`📋 Found ${listUsers.users.length} users in emulator:`);
    
    let tonyUserId = null;
    for (const user of listUsers.users) {
      console.log(`   - ${user.email} (${user.uid})`);
      if (user.email === 'tony@test.com') {
        tonyUserId = user.uid;
      }
    }
    
    if (!tonyUserId) {
      console.log('⚠️  tony@test.com not found. Using all user IDs as admins for testing.');
      // Make all users admins for testing
      const allUserIds = listUsers.users.map(u => u.uid);
      
      await db.collection('artifacts').doc('nerdfootball').collection('admin').doc('permissions').set({
        admins: allUserIds,
        lastUpdated: new Date(),
        environment: 'local-testing'
      });
      
      console.log('✅ All users granted admin permissions for testing');
      console.log(`👑 Admin user IDs: ${allUserIds.join(', ')}`);
      
    } else {
      // Set up admin permissions for Tony
      await db.collection('artifacts').doc('nerdfootball').collection('admin').doc('permissions').set({
        admins: [tonyUserId],
        lastUpdated: new Date(),
        environment: 'local-testing'
      });
      
      console.log(`✅ Admin permissions granted to: ${tonyUserId} (tony@test.com)`);
    }
    
    // Also add to legacy admin structure if it exists
    await db.collection('artifacts').doc('nerdfootball').collection('public').doc('data').update({
      admins: tonyUserId ? [tonyUserId] : listUsers.users.map(u => u.uid)
    }).catch(() => {
      console.log('📝 Legacy admin structure not found (this is fine)');
    });
    
    console.log('\n✅ Admin permissions setup complete!');
    console.log('🔧 Admin features should now be available');
    
  } catch (error) {
    console.error('❌ Error setting up admin permissions:', error);
    process.exit(1);
  }
}

setupAdminPermissions();