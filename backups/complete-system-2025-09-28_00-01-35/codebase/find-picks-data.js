const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball.firebaseio.com"
});

const db = admin.firestore();

const INVALID_USERS = [
    '6FYtDM1p9vOpLFbSkRjBGaqayzm1', // Ghost user
    'HqQ5r88P0BZ8lrONDcATjQWuu6m1', // Shrimper2001
    'Xkfsav1h12bagLrjAE6BAWH2SUy1', // PurpleHaze
    'YBXqHkFmemOyR6GO9E7ToSHv2812', // Andrea Weeg duplicate
    'rJUpiuhwVrZU7vLvOnLL08AECUW2'  // Jacob Adkins
];

async function findAllPicks() {
    console.log('💎 SEARCHING FOR ALL PICK DATA...\n');
    
    // Check various possible paths
    const pathsToCheck = [
        'artifacts/nerdfootball/public/data/nerdfootball_picks',
        'nerdfootball_picks',
        'picks',
        'artifacts/nerdfootball/picks'
    ];
    
    for (const path of pathsToCheck) {
        console.log(`\n📍 Checking path: /${path}`);
        try {
            const collection = await db.collection(path).limit(1).get();
            if (!collection.empty) {
                console.log(`  ✅ Found data at this path!`);
                
                // Get all documents
                const allDocs = await db.collection(path).get();
                console.log(`  📊 Found ${allDocs.size} documents`);
                
                // Check for week structure
                for (const doc of allDocs.docs) {
                    const docId = doc.id;
                    if (docId.startsWith('week')) {
                        // Check submissions subcollection
                        const submissions = await db.collection(`${path}/${docId}/submissions`).get();
                        if (!submissions.empty) {
                            console.log(`    Week ${docId}: ${submissions.size} submissions`);
                            
                            // Check for invalid users
                            const invalidFound = [];
                            submissions.docs.forEach(subDoc => {
                                if (INVALID_USERS.includes(subDoc.id)) {
                                    invalidFound.push(subDoc.id);
                                }
                            });
                            
                            if (invalidFound.length > 0) {
                                console.log(`      ⚠️ Found ${invalidFound.length} invalid users in this week`);
                                invalidFound.forEach(uid => console.log(`        - ${uid}`));
                            }
                        }
                    }
                }
            } else {
                console.log(`  ❌ No data at this path`);
            }
        } catch (error) {
            console.log(`  ❌ Error accessing path: ${error.message}`);
        }
    }
    
    // Also check collectionGroup query
    console.log('\n📍 Checking with collectionGroup query for "submissions":');
    try {
        const allSubmissions = await db.collectionGroup('submissions').get();
        console.log(`  📊 Found ${allSubmissions.size} total submission documents`);
        
        // Group by user
        const userSubmissions = {};
        allSubmissions.docs.forEach(doc => {
            const uid = doc.id;
            if (!userSubmissions[uid]) {
                userSubmissions[uid] = 0;
            }
            userSubmissions[uid]++;
        });
        
        console.log(`  👥 Total unique users with submissions: ${Object.keys(userSubmissions).length}`);
        
        // Check for invalid users
        const invalidWithSubmissions = INVALID_USERS.filter(uid => userSubmissions[uid]);
        if (invalidWithSubmissions.length > 0) {
            console.log(`\n  ⚠️ Invalid users with submissions:`);
            invalidWithSubmissions.forEach(uid => {
                console.log(`    - ${uid}: ${userSubmissions[uid]} submissions`);
            });
        } else {
            console.log(`\n  ✅ No invalid users found in submissions`);
        }
        
    } catch (error) {
        console.log(`  ❌ Error with collectionGroup query: ${error.message}`);
    }
}

async function main() {
    await findAllPicks();
    process.exit(0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});