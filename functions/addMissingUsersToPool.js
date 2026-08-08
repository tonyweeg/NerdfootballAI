// 💎 CRITICAL FIX: Firebase Function to add missing users to pool
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { SEASON_CONFIG } = require('./seasonConfig');

exports.addMissingUsersToPool = onRequest(async (req, res) => {
    console.log('🔥 CRITICAL: Adding missing users to pool members...');
    
    const db = admin.firestore();
    const poolId = SEASON_CONFIG.poolId;
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
            const message = '✅ No missing users - pool is complete!';
            console.log(message);
            return res.json({ success: true, message });
        }
        
        // Add missing users to pool
        const updatedMembers = { ...currentMembers };
        
        missingUsers.forEach(user => {
            updatedMembers[user.id] = {
                displayName: user.data.displayName || user.data.email || 'Unknown User',
                email: user.data.email || '',
                role: 'member', // Default role for genesis pool
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
        
        const message = `🏆 CRITICAL FIX COMPLETE! Added ${missingUsers.length} users. Pool now has ${Object.keys(updatedMembers).length} total members.`;
        console.log(message);
        
        res.json({
            success: true,
            message,
            totalUsers: Object.keys(updatedMembers).length,
            addedUsers: missingUsers.length,
            userList: missingUsers.map(u => u.data.displayName || u.data.email)
        });
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Failed to add users to pool'
        });
    }
});