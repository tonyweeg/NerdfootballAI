// 💎 CRITICAL FIX: Add missing 21 users to pool members
// This script adds all Firebase users to the pool that aren't already there

const admin = require('firebase-admin');

async function addMissingUsersToPool() {
    console.log('🔥 CRITICAL: Adding missing users to pool members...');
    
    // Initialize Firebase Admin with project
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'nerdfootball'
        });
    }
    const db = admin.firestore();
    
    const poolId = 'nerduniverse-2025';
    const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    
    try {
        // Get all Firebase users
        console.log('📍 Fetching all Firebase users...');
        const usersSnap = await db.collection(usersPath).get();
        console.log(`✅ Found ${usersSnap.size} total Firebase users`);
        
        // Get current pool members
        console.log('📍 Fetching current pool members...');
        const poolMembersRef = db.doc(poolMembersPath);
        const poolMembersSnap = await poolMembersRef.get();
        
        const currentMembers = poolMembersSnap.exists ? poolMembersSnap.data() : {};
        console.log(`✅ Found ${Object.keys(currentMembers).length} current pool members`);
        
        // Find missing users
        const missingUsers = [];
        usersSnap.docs.forEach(userDoc => {
            // Skip the ghost user
            if (userDoc.id === 'okl4sw2aDhW3yKpOfOwe5lH7OQj1') {
                console.log('🚫 SKIPPING GHOST USER:', userDoc.id);
                return;
            }
            
            if (!currentMembers[userDoc.id]) {
                missingUsers.push({
                    id: userDoc.id,
                    data: userDoc.data()
                });
            }
        });
        
        console.log(`🎯 Found ${missingUsers.length} missing users to add to pool`);
        
        if (missingUsers.length === 0) {
            console.log('✅ No missing users - pool is complete!');
            return;
        }
        
        // Add missing users to pool
        const updatedMembers = { ...currentMembers };
        
        missingUsers.forEach(user => {
            updatedMembers[user.id] = {
                displayName: user.data.displayName || user.data.email || 'Unknown User',
                email: user.data.email || '',
                role: 'member', // Default role
                joinedAt: new Date().toISOString(),
                addedBy: 'system-sync',
                uid: user.id,
                ...user.data // Include all original user data
            };
            console.log(`➕ Adding user: ${user.data.displayName || user.data.email} (${user.id})`);
        });
        
        // Update pool members document
        console.log('📍 Updating pool members document...');
        await poolMembersRef.set(updatedMembers);
        
        console.log('✅ SUCCESS: Pool members updated!');
        console.log(`📊 Pool now has ${Object.keys(updatedMembers).length} total members`);
        console.log(`➕ Added ${missingUsers.length} new members`);
        
        // Update pool config member count
        const poolConfigRef = db.doc(`artifacts/nerdfootball/pools/${poolId}/metadata/config`);
        const poolConfigSnap = await poolConfigRef.get();
        
        if (poolConfigSnap.exists) {
            const currentConfig = poolConfigSnap.data();
            await poolConfigRef.set({
                ...currentConfig,
                memberCount: Object.keys(updatedMembers).length,
                lastUpdated: new Date().toISOString(),
                lastSync: new Date().toISOString()
            });
            console.log('✅ Updated pool config member count');
        }
        
        console.log('\n🏆 CRITICAL FIX COMPLETE!');
        console.log(`🎯 All ${Object.keys(updatedMembers).length} users now in pool members`);
        console.log('💎 User displays should now show all users!');
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR:', error);
        throw error;
    }
}

// Run the critical fix
addMissingUsersToPool()
    .then(() => {
        console.log('🚀 MISSION ACCOMPLISHED!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 CRITICAL FAILURE:', error);
        process.exit(1);
    });