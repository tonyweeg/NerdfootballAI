// Firestore Explorer - Find the actual data structure
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nerdfootball-dd237-default-rtdb.firebaseio.com/'
});

const db = admin.firestore();

async function exploreFirestore() {
    console.log('🔍 EXPLORING FIRESTORE STRUCTURE');
    console.log('='.repeat(60));

    try {
        // 1. Check elimination status location
        console.log('\n1. CHECKING ELIMINATION STATUS PATHS:');

        const statusPaths = [
            'artifacts/nerdfootball/public/data/nerdSurvivor_status/status',
            'nerdSurvivor_status/status',
            'survivor_status',
            'elimination_status'
        ];

        for (const path of statusPaths) {
            try {
                const doc = await db.doc(path).get();
                if (doc.exists) {
                    const data = doc.data();
                    console.log(`✅ FOUND: ${path} - ${Object.keys(data).length} records`);

                    // Show sample elimination record
                    const sample = Object.entries(data)[0];
                    if (sample) {
                        console.log(`   Sample: ${sample[0]} = ${JSON.stringify(sample[1])}`);
                    }
                } else {
                    console.log(`❌ NOT FOUND: ${path}`);
                }
            } catch (error) {
                console.log(`❌ ERROR: ${path} - ${error.message}`);
            }
        }

        // 2. Check target user's picks specifically
        console.log('\n2. TARGET USER PICKS (aaG5Wc2JZkZJD1r7ozfJG04QRrf1):');
        const targetUserId = 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1';

        const picksDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${targetUserId}`).get();
        if (picksDoc.exists) {
            const picksData = picksDoc.data();
            console.log(`✅ Picks data structure:`, JSON.stringify(picksData, null, 2));
        } else {
            console.log(`❌ No picks found for target user`);
        }

        // 3. Check ESPN cache locations
        console.log('\n3. CHECKING ESPN CACHE LOCATIONS:');

        const cachePaths = [
            'cache/espn_current_data',
            'espn_cache',
            'artifacts/nerdfootball/public/data/nerdfootball_games/1',
            'game_results/week_1',
            'espn_results'
        ];

        for (const path of cachePaths) {
            try {
                const doc = await db.doc(path).get();
                if (doc.exists) {
                    const data = doc.data();
                    console.log(`✅ FOUND: ${path} - ${Object.keys(data).length} records`);

                    // Show sample game result
                    const sample = Object.entries(data)[0];
                    if (sample) {
                        console.log(`   Sample: ${sample[0]} = ${JSON.stringify(sample[1])}`);
                    }
                } else {
                    console.log(`❌ NOT FOUND: ${path}`);
                }
            } catch (error) {
                console.log(`❌ ERROR: ${path} - ${error.message}`);
            }
        }

        // 4. Explore collections to find survivor data
        console.log('\n4. EXPLORING ROOT COLLECTIONS:');

        const collections = await db.listCollections();
        console.log(`Found ${collections.length} root collections:`);

        for (const collection of collections) {
            console.log(`   📁 ${collection.id}`);

            if (collection.id.toLowerCase().includes('survivor') ||
                collection.id.toLowerCase().includes('status') ||
                collection.id.toLowerCase().includes('elimination')) {

                const docs = await collection.limit(3).get();
                console.log(`      ${docs.size} documents found`);

                docs.forEach(doc => {
                    console.log(`      📄 ${doc.id}: ${JSON.stringify(doc.data())}`);
                });
            }
        }

        // 5. Check artifacts structure
        console.log('\n5. EXPLORING ARTIFACTS STRUCTURE:');

        const artifactsCollection = await db.collection('artifacts').listDocuments();
        console.log(`Artifacts documents: ${artifactsCollection.length}`);

        for (const docRef of artifactsCollection.slice(0, 5)) {
            console.log(`   📄 ${docRef.id}`);
        }

        console.log('\n✅ EXPLORATION COMPLETE');

    } catch (error) {
        console.error('❌ Exploration failed:', error);
    }
}

// Run the exploration
if (require.main === module) {
    exploreFirestore().then(() => {
        process.exit(0);
    });
}

module.exports = { exploreFirestore };