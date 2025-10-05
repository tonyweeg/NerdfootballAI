// 🔍 Check if specific users have picks data
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

exports.checkUserPicks = onRequest(async (req, res) => {
    console.log('🔍 CHECKING USER PICKS DATA...');
    
    const db = admin.firestore();
    
    const usersToCheck = [
        'RSj8SoyvF9NHOtbSi8uULvJpm6H2', // Michael Rayfield
        'UiQyobvibJgXwEexUj6AhaUUg7P2', // James Stewart
        'RThxWwOKm8fm52CHU5VUWIdMa7q2'  // Rey Gomez
    ];
    
    const userNames = {
        'RSj8SoyvF9NHOtbSi8uULvJpm6H2': 'Michael Rayfield',
        'UiQyobvibJgXwEexUj6AhaUUg7P2': 'James Stewart',
        'RThxWwOKm8fm52CHU5VUWIdMa7q2': 'Rey Gomez'
    };
    
    const poolId = 'nerduniverse-2025';
    const picksResults = {};
    
    try {
        for (const userId of usersToCheck) {
            console.log(`\n🔍 Checking picks for: ${userNames[userId]} (${userId})`);
            
            // Check multiple possible picks paths
            const picksPaths = [
                `artifacts/nerdfootball/pools/${poolId}/picks/${userId}`,
                `artifacts/nerdfootball/picks/${userId}`,
                `picks/${userId}`,
                `users/${userId}/picks`,
                `artifacts/nerdfootball/pools/${poolId}/users/${userId}/picks`
            ];
            
            let foundPicks = false;
            const userPicksData = {};
            
            for (const path of picksPaths) {
                try {
                    console.log(`  📍 Checking path: ${path}`);
                    const picksDoc = await db.doc(path).get();
                    
                    if (picksDoc.exists()) {
                        const picksData = picksDoc.data();
                        console.log(`  ✅ Found picks at ${path}:`, Object.keys(picksData).length, 'items');
                        userPicksData[path] = {
                            exists: true,
                            itemCount: Object.keys(picksData).length,
                            sampleData: Object.keys(picksData).slice(0, 3) // First 3 keys as sample
                        };
                        foundPicks = true;
                    } else {
                        console.log(`  ❌ No picks at ${path}`);
                        userPicksData[path] = { exists: false };
                    }
                } catch (error) {
                    console.log(`  ⚠️ Error checking ${path}:`, error.message);
                    userPicksData[path] = { error: error.message };
                }
            }
            
            // Also check collections that might contain user picks
            const collectionsToCheck = [
                `artifacts/nerdfootball/pools/${poolId}/picks`,
                `artifacts/nerdfootball/picks`,
                `picks`
            ];
            
            for (const collectionPath of collectionsToCheck) {
                try {
                    console.log(`  📍 Checking collection: ${collectionPath}`);
                    const picksCollection = await db.collection(collectionPath).get();
                    
                    const userDocs = picksCollection.docs.filter(doc => 
                        doc.id === userId || JSON.stringify(doc.data()).includes(userId)
                    );
                    
                    if (userDocs.length > 0) {
                        console.log(`  ✅ Found ${userDocs.length} docs in ${collectionPath}`);
                        userPicksData[collectionPath] = {
                            exists: true,
                            docCount: userDocs.length,
                            docIds: userDocs.map(doc => doc.id)
                        };
                        foundPicks = true;
                    } else {
                        console.log(`  ❌ No user docs in ${collectionPath}`);
                        userPicksData[collectionPath] = { exists: false };
                    }
                } catch (error) {
                    console.log(`  ⚠️ Error checking collection ${collectionPath}:`, error.message);
                    userPicksData[collectionPath] = { error: error.message };
                }
            }
            
            picksResults[userId] = {
                name: userNames[userId],
                hasPicks: foundPicks,
                picksData: userPicksData
            };
            
            console.log(`📊 ${userNames[userId]}: ${foundPicks ? 'HAS PICKS' : 'NO PICKS'}`);
        }
        
        console.log('\n🏆 PICKS CHECK COMPLETE!');
        
        const summary = {
            usersWithPicks: Object.values(picksResults).filter(u => u.hasPicks).length,
            usersWithoutPicks: Object.values(picksResults).filter(u => !u.hasPicks).length,
            details: picksResults
        };
        
        console.log(`📊 Summary: ${summary.usersWithPicks} have picks, ${summary.usersWithoutPicks} have no picks`);
        
        res.json({
            success: true,
            message: 'User picks check complete',
            summary,
            checkedUsers: usersToCheck.length
        });
        
    } catch (error) {
        console.error('💥 PICKS CHECK ERROR:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to check user picks'
        });
    }
});