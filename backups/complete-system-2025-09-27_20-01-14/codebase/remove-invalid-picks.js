const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball.firebaseio.com"
});

const db = admin.firestore();

const INVALID_USERS_TO_REMOVE = [
    '6FYtDM1p9vOpLFbSkRjBGaqayzm1', // Ghost user
    'HqQ5r88P0BZ8lrONDcATjQWuu6m1', // Shrimper2001 - deleted account
    'Xkfsav1h12bagLrjAE6BAWH2SUy1', // PurpleHaze
    'YBXqHkFmemOyR6GO9E7ToSHv2812', // Andrea Weeg duplicate
    'rJUpiuhwVrZU7vLvOnLL08AECUW2'  // Jacob Adkins
];

async function removeInvalidPicks() {
    console.log('💎 REMOVING INVALID USER PICKS FROM ALL LOCATIONS...\n');
    
    let totalRemoved = 0;
    
    // Remove from public/data path (legacy) - THIS IS WHERE THE PICKS ARE!
    console.log('📍 Cleaning: /artifacts/nerdfootball/public/data/nerdfootball_picks/');
    const publicPicksPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks';
    
    // Get all weeks
    const publicWeeks = await db.collection(publicPicksPath).get();
    
    for (const weekDoc of publicWeeks.docs) {
        const weekId = weekDoc.id;
        console.log(`\n  Processing Week ${weekId}:`);
        
        // Check each invalid user
        for (const uid of INVALID_USERS_TO_REMOVE) {
            const submissionRef = db.doc(`${publicPicksPath}/${weekId}/submissions/${uid}`);
            const submissionDoc = await submissionRef.get();
            
            if (submissionDoc.exists) {
                const data = submissionDoc.data();
                const userName = data.displayName || data.userName || 'Unknown';
                await submissionRef.delete();
                totalRemoved++;
                console.log(`    ✅ Removed picks for ${userName} (${uid})`);
            }
        }
    }
    
    console.log(`\n📊 Total pick documents removed: ${totalRemoved}`);
    
    // Also remove survivor picks
    console.log('\n📍 Cleaning survivor picks:');
    for (const uid of INVALID_USERS_TO_REMOVE) {
        const survivorRef = db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`);
        const survivorDoc = await survivorRef.get();
        
        if (survivorDoc.exists) {
            const data = survivorDoc.data();
            await survivorRef.delete();
            console.log(`  ✅ Removed survivor picks for ${uid}`);
        }
    }
    
    // Remove user profiles
    console.log('\n📍 Cleaning user profiles:');
    for (const uid of INVALID_USERS_TO_REMOVE) {
        const userRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_users/${uid}`);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            const data = userDoc.data();
            await userRef.delete();
            console.log(`  ✅ Removed profile for ${data.displayName || uid}`);
        }
    }
}

async function verifyCleanup() {
    console.log('\n💎 VERIFYING CLEANUP...\n');
    
    // Count pool members
    const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    const poolDoc = await poolMembersRef.get();
    const memberCount = poolDoc.exists ? Object.keys(poolDoc.data()).length : 0;
    
    // Count unique users with picks
    const publicPicksPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks';
    const publicWeeks = await db.collection(publicPicksPath).get();
    
    const uniquePickUsers = new Set();
    for (const weekDoc of publicWeeks.docs) {
        const submissions = await db.collection(`${publicPicksPath}/${weekDoc.id}/submissions`).get();
        submissions.docs.forEach(doc => uniquePickUsers.add(doc.id));
    }
    
    console.log('📊 FINAL COUNTS:');
    console.log(`  Pool Members: ${memberCount}`);
    console.log(`  Unique Users with Picks: ${uniquePickUsers.size}`);
    console.log(`  Discrepancy: ${Math.abs(memberCount - uniquePickUsers.size)}`);
    
    // Check if any invalid users still have picks
    const remainingInvalid = INVALID_USERS_TO_REMOVE.filter(uid => uniquePickUsers.has(uid));
    if (remainingInvalid.length > 0) {
        console.log(`\n⚠️ Invalid users still with picks: ${remainingInvalid.length}`);
        remainingInvalid.forEach(uid => console.log(`  - ${uid}`));
    } else {
        console.log('\n✅ All invalid users have been removed from picks');
    }
}

async function main() {
    console.log('💎 NERDFOOTBALL INVALID USER CLEANUP - DIAMONDS ARE FOREVER 💎');
    console.log('==========================================================\n');
    
    await removeInvalidPicks();
    await verifyCleanup();
    
    console.log('\n💎 CLEANUP COMPLETE!');
    process.exit(0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});