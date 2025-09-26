// 🗑️ Firebase Function to delete specific problematic users
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

exports.deleteSpecificUsers = onRequest(async (req, res) => {
    console.log('🗑️ DELETING SPECIFIC PROBLEMATIC USERS...');
    
    const db = admin.firestore();
    
    const usersToDelete = [
        '6FYtDM1p9vOpLFbSkRjBGaqayzm1', // Phantom user (deleted from auth)
        'okl4sw2aDhW3yKpOfOwe5lH7OQj1'  // Ghost user (known problematic)
    ];
    
    const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
    const deletedUsers = [];
    const notFoundUsers = [];
    
    try {
        for (const userId of usersToDelete) {
            console.log(`\n🗑️ Deleting user: ${userId}`);
            
            // Check if user exists first
            const userDoc = await db.collection(usersPath).doc(userId).get();
            
            if (!userDoc.exists) {
                console.log(`❌ User ${userId} not found in Firestore - already deleted`);
                notFoundUsers.push(userId);
                continue;
            }
            
            const userData = userDoc.data();
            console.log(`✅ Found user ${userId}:`, userData);
            
            // Delete the user
            await db.collection(usersPath).doc(userId).delete();
            console.log(`✅ Successfully deleted user: ${userId}`);
            
            deletedUsers.push({
                id: userId,
                data: userData
            });
        }
        
        console.log('\n🏆 DELETION COMPLETE!');
        console.log(`✅ Deleted: ${deletedUsers.length} users`);
        console.log(`⚠️ Not found: ${notFoundUsers.length} users`);
        
        res.json({
            success: true,
            message: `Successfully deleted ${deletedUsers.length} problematic users`,
            deleted: deletedUsers.map(u => ({ id: u.id, name: u.data.displayName || u.data.email })),
            notFound: notFoundUsers,
            totalProcessed: usersToDelete.length
        });
        
    } catch (error) {
        console.error('💥 DELETION ERROR:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to delete users'
        });
    }
});