const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball.firebaseio.com"
});

const db = admin.firestore();

const INVALID_USERS_TO_CHECK = [
    '6FYtDM1p9vOpLFbSkRjBGaqayzm1', // Ghost user
    'HqQ5r88P0BZ8lrONDcATjQWuu6m1', // Shrimper2001 - deleted account
    'Xkfsav1h12bagLrjAE6BAWH2SUy1', // PurpleHaze
    'YBXqHkFmemOyR6GO9E7ToSHv2812', // Andrea Weeg duplicate
    'rJUpiuhwVrZU7vLvOnLL08AECUW2'  // Jacob Adkins
];

async function checkAllPickLocations() {
    console.log('💎 CHECKING ALL POSSIBLE PICK LOCATIONS...\n');
    
    // Check public/data path (legacy)
    console.log('📍 Checking: /artifacts/nerdfootball/public/data/nerdfootball_picks/');
    const publicPicksPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks';
    const publicWeeks = await db.collection(publicPicksPath).get();
    
    for (const weekDoc of publicWeeks.docs) {
        const weekId = weekDoc.id;
        const submissions = await db.collection(`${publicPicksPath}/${weekId}/submissions`).get();
        
        const invalidUsersInWeek = [];
        submissions.docs.forEach(doc => {
            if (INVALID_USERS_TO_CHECK.includes(doc.id)) {
                invalidUsersInWeek.push(doc.id);
            }
        });
        
        if (invalidUsersInWeek.length > 0) {
            console.log(`  Week ${weekId}: Found ${invalidUsersInWeek.length} invalid users`);
            invalidUsersInWeek.forEach(uid => console.log(`    - ${uid}`));
        }
    }
    
    // Check pool-specific path
    console.log('\n📍 Checking: /artifacts/nerdfootball/pools/nerduniverse-2025/data/nerdfootball_picks/');
    const poolPicksPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/data/nerdfootball_picks';
    const poolWeeks = await db.collection(poolPicksPath).get();
    
    for (const weekDoc of poolWeeks.docs) {
        const weekId = weekDoc.id;
        const submissions = await db.collection(`${poolPicksPath}/${weekId}/submissions`).get();
        
        const invalidUsersInWeek = [];
        submissions.docs.forEach(doc => {
            if (INVALID_USERS_TO_CHECK.includes(doc.id)) {
                invalidUsersInWeek.push(doc.id);
            }
        });
        
        if (invalidUsersInWeek.length > 0) {
            console.log(`  Week ${weekId}: Found ${invalidUsersInWeek.length} invalid users`);
            invalidUsersInWeek.forEach(uid => console.log(`    - ${uid}`));
        }
    }
    
    // Check genesis pool path
    console.log('\n📍 Checking: /artifacts/nerdfootball/pools/genesis/data/nerdfootball_picks/');
    const genesisPicksPath = 'artifacts/nerdfootball/pools/genesis/data/nerdfootball_picks';
    const genesisWeeks = await db.collection(genesisPicksPath).get();
    
    for (const weekDoc of genesisWeeks.docs) {
        const weekId = weekDoc.id;
        const submissions = await db.collection(`${genesisPicksPath}/${weekId}/submissions`).get();
        
        const invalidUsersInWeek = [];
        submissions.docs.forEach(doc => {
            if (INVALID_USERS_TO_CHECK.includes(doc.id)) {
                invalidUsersInWeek.push(doc.id);
            }
        });
        
        if (invalidUsersInWeek.length > 0) {
            console.log(`  Week ${weekId}: Found ${invalidUsersInWeek.length} invalid users`);
            invalidUsersInWeek.forEach(uid => console.log(`    - ${uid}`));
        }
    }
    
    // Get total counts
    console.log('\n📊 SUMMARY:');
    
    // Count pool members
    const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    const poolDoc = await poolMembersRef.get();
    const memberCount = poolDoc.exists ? Object.keys(poolDoc.data()).length : 0;
    console.log(`  Current Pool Members: ${memberCount}`);
    
    // Count unique users with picks in public path
    const uniquePickUsers = new Set();
    for (const weekDoc of publicWeeks.docs) {
        const submissions = await db.collection(`${publicPicksPath}/${weekDoc.id}/submissions`).get();
        submissions.docs.forEach(doc => uniquePickUsers.add(doc.id));
    }
    console.log(`  Unique Users with Picks (public path): ${uniquePickUsers.size}`);
    
    // Show which invalid users still have picks
    const remainingInvalid = INVALID_USERS_TO_CHECK.filter(uid => uniquePickUsers.has(uid));
    if (remainingInvalid.length > 0) {
        console.log(`\n⚠️ Invalid users still with picks: ${remainingInvalid.length}`);
        remainingInvalid.forEach(uid => console.log(`  - ${uid}`));
    } else {
        console.log('\n✅ All invalid users have been removed from picks');
    }
}

async function main() {
    await checkAllPickLocations();
    process.exit(0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});