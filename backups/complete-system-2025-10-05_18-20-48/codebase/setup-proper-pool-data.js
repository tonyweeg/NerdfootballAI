#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK for local emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';

admin.initializeApp({
  projectId: 'nerdfootball-4b4b2',
  databaseURL: 'http://localhost:8081'
});

const db = admin.firestore();

async function setupProperPoolData() {
  try {
    console.log('🏊 Setting up proper pool member data...');
    
    // Get current user from auth to use real user ID
    const auth = admin.auth();
    const listUsers = await auth.listUsers().catch(() => ({users: []}));
    
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    
    // Create proper pool member data structure
    const poolMembers = [];
    
    if (listUsers.users.length > 0) {
      // Use real user IDs from auth
      for (const user of listUsers.users) {
        const member = {
          uid: user.uid,
          email: user.email,
          displayName: user.email.split('@')[0], // Use email prefix as display name
          joinedAt: new Date('2024-08-01'),
          isActive: true,
          poolId: poolId
        };
        poolMembers.push(member);
        
        // Add to poolMembers array for later batch creation
        console.log(`✅ Added pool member: ${user.email} (${user.uid})`);
      }
    } else {
      console.log('⚠️ No auth users found, creating placeholder data');
      // Fallback with placeholder data
      const placeholderMember = {
        uid: 'placeholder-user',
        email: 'tony@test.com',
        displayName: 'Tony Test',
        joinedAt: new Date('2024-08-01'),
        isActive: true,
        poolId: poolId
      };
      poolMembers.push(placeholderMember);
    }
    
    // Create the members document in the correct format
    if (poolMembers.length > 0) {
      const membersObject = {};
      poolMembers.forEach(member => {
        membersObject[member.uid] = {
          displayName: member.displayName,
          email: member.email,
          joinedAt: member.joinedAt,
          isActive: member.isActive,
          role: 'member'
        };
      });
      
      await db.doc(poolMembersPath).set(membersObject);
      console.log(`✅ Pool members document created with ${poolMembers.length} members`);
    }
    
    // Create pool metadata
    await db.collection(`artifacts/nerdfootball/pools/${poolId}/metadata`).doc('info').set({
      poolName: 'Nerd Universe 2025',
      poolId: poolId,
      isActive: true,
      memberCount: poolMembers.length,
      createdAt: new Date('2024-08-01'),
      lastUpdated: new Date()
    });
    console.log('✅ Pool metadata created');
    
    // Remove legacy user data to prevent fallbacks
    try {
      const legacyPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
      const legacySnapshot = await db.collection(legacyPath).get();
      
      if (!legacySnapshot.empty) {
        console.log('🧹 Cleaning up legacy user data...');
        const batch = db.batch();
        legacySnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log('✅ Legacy user data removed');
      }
    } catch (error) {
      console.log('ℹ️ No legacy user data found (this is good)');
    }
    
    console.log('\n✅ Pool member data setup complete!');
    console.log(`👥 Pool members: ${poolMembers.length}`);
    console.log('🚫 Legacy fallbacks eliminated');
    
  } catch (error) {
    console.error('❌ Error setting up pool data:', error);
    process.exit(1);
  }
}

setupProperPoolData();