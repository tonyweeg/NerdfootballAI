/**
 * 🔍 EXAMINE USER DOCUMENTS FOR SURVIVOR DATA
 *
 * Research the actual user document structure for survivor information
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'nerdfootball'
    });
}

const db = admin.firestore();

async function examineUserSurvivorData() {
    console.log('🔍 EXAMINING USER DOCUMENTS FOR SURVIVOR DATA');
    console.log('==============================================');

    try {
        // Get a few user documents to understand structure
        const usersCollection = await db.collection('artifacts/nerdfootball/public/data/nerdfootball_users').limit(5).get();

        usersCollection.forEach(userDoc => {
            const userData = userDoc.data();
            console.log(`📋 User: ${userData.displayName || 'Unknown'} (${userDoc.id})`);
            console.log(`   Keys: ${Object.keys(userData).join(', ')}`);

            // Look for survivor-related fields
            if (userData.survivor) {
                console.log(`   🏆 Survivor data: ${JSON.stringify(userData.survivor)}`);
            }
            if (userData.survivorPicks) {
                console.log(`   🎯 Survivor picks: ${JSON.stringify(userData.survivorPicks)}`);
            }
            if (userData.pools) {
                console.log(`   🏊 Pools: ${JSON.stringify(userData.pools)}`);
            }
            console.log('');
        });

        // Check if survivor data exists in user documents
        const allUsersQuery = await db.collection('artifacts/nerdfootball/public/data/nerdfootball_users').get();
        let usersWithSurvivorData = 0;
        let usersWithSurvivorPicks = 0;

        allUsersQuery.forEach(userDoc => {
            const userData = userDoc.data();
            if (userData.survivor) usersWithSurvivorData++;
            if (userData.survivorPicks) usersWithSurvivorPicks++;
        });

        console.log(`📊 SUMMARY:`);
        console.log(`   Total users: ${allUsersQuery.size}`);
        console.log(`   Users with survivor data: ${usersWithSurvivorData}`);
        console.log(`   Users with survivor picks: ${usersWithSurvivorPicks}`);

        // Now check the separate survivor picks collection
        console.log('\n🎯 CHECKING SEPARATE SURVIVOR PICKS COLLECTION:');
        console.log('===============================================');

        const survivorPicksCollection = await db.collection('artifacts/nerdfootball/public/data/nerdSurvivor_picks').limit(3).get();

        survivorPicksCollection.forEach(pickDoc => {
            const pickData = pickDoc.data();
            console.log(`📋 User ID: ${pickDoc.id}`);
            console.log(`   Keys: ${Object.keys(pickData).join(', ')}`);
            if (pickData.picks) {
                console.log(`   Weeks with picks: ${Object.keys(pickData.picks).join(', ')}`);
                // Show sample pick structure
                const firstWeek = Object.keys(pickData.picks)[0];
                if (firstWeek) {
                    console.log(`   Sample pick (Week ${firstWeek}): ${JSON.stringify(pickData.picks[firstWeek])}`);
                }
            }
            console.log('');
        });

    } catch (error) {
        console.error('💥 Failed:', error.message);
    }
}

examineUserSurvivorData().catch(console.error);