// 🗑️ Delete specific problematic users
const admin = require('firebase-admin');

async function deleteSpecificUsers() {
    console.log('🗑️ DELETING SPECIFIC PROBLEMATIC USERS...');
    
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'nerdfootball'
        });
    }
    const db = admin.firestore();
    
    const usersToDelete = [
        '6FYtDM1p9vOpLFbSkRjBGaqayzm1', // Phantom user (deleted from auth)
        'okl4sw2aDhW3yKpOfOwe5lH7OQj1'  // Ghost user (known problematic)
    ];
    
    const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
    
    try {
        for (const userId of usersToDelete) {
            console.log(`\n🗑️ Deleting user: ${userId}`);
            
            // Check if user exists first
            const userDoc = await db.collection(usersPath).doc(userId).get();
            
            if (!userDoc.exists) {
                console.log(`❌ User ${userId} not found in Firestore - already deleted`);
                continue;
            }
            
            console.log(`✅ Found user ${userId}:`, userDoc.data());
            
            // Delete the user
            await db.collection(usersPath).doc(userId).delete();
            console.log(`✅ Successfully deleted user: ${userId}`);
        }
        
        console.log('\n🏆 DELETION COMPLETE!');
        console.log('💡 Run the diagnostic tool ANALYZE to see updated counts');
        
    } catch (error) {
        console.error('💥 DELETION ERROR:', error);
        throw error;
    }
}

deleteSpecificUsers()
    .then(() => {
        console.log('🚀 Mission accomplished!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });