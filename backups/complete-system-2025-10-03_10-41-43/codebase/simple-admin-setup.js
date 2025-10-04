#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK for local emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';

admin.initializeApp({
  projectId: 'nerdfootball-4b4b2',
  databaseURL: 'http://localhost:8081'
});

const db = admin.firestore();

async function setupSimpleAdminPermissions() {
  try {
    console.log('👑 Setting up admin permissions directly in Firestore...');
    
    // Since we can't easily get the actual user ID from auth emulator,
    // let's set up admin permissions that will work for any user with tony@test.com
    
    // Common patterns for Firebase Auth UIDs
    const possibleUserIds = [
      'test-user-1',  // Our original test user
      'tony@test.com', // Email as ID
      'auto-generated-id' // Placeholder
    ];
    
    // Set up admin permissions document
    const adminData = {
      admins: possibleUserIds,
      adminEmails: ['tony@test.com'],
      lastUpdated: new Date(),
      environment: 'local-testing',
      allUsersAdmin: true  // For testing, allow any user to be admin
    };
    
    await db.collection('artifacts').doc('nerdfootball').collection('admin').doc('permissions').set(adminData);
    console.log('✅ Admin permissions document created');
    
    // Also create a fallback check that will work for the email
    await db.collection('artifacts').doc('nerdfootball').collection('admin').doc('email-admins').set({
      'tony@test.com': true,
      lastUpdated: new Date()
    });
    console.log('✅ Email-based admin permissions created');
    
    // Create admin configuration
    await db.collection('artifacts').doc('nerdfootball').collection('config').doc('admin').set({
      enabled: true,
      localTesting: true,
      allowAllUsers: true,
      lastUpdated: new Date()
    });
    console.log('✅ Admin configuration created');
    
    console.log('\n✅ Admin permissions setup complete!');
    console.log('🔧 Admin features should now be available');
    console.log('💡 All users are now admins in local testing mode');
    
  } catch (error) {
    console.error('❌ Error setting up admin permissions:', error);
    process.exit(1);
  }
}

setupSimpleAdminPermissions();