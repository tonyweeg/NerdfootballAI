const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball.firebaseio.com"
});

const db = admin.firestore();

const INVALID_USERS_TO_REMOVE = [
    '6FYtDM1p9vOpLFbSkRjBGaqayzm1', // Ghost user - 1 submission
    'HqQ5r88P0BZ8lrONDcATjQWuu6m1', // Shrimper2001 - 1 submission
    'Xkfsav1h12bagLrjAE6BAWH2SUy1', // PurpleHaze - 18 submissions
    'YBXqHkFmemOyR6GO9E7ToSHv2812', // Andrea Weeg duplicate - 18 submissions
    'rJUpiuhwVrZU7vLvOnLL08AECUW2'  // Jacob Adkins - 1 submission
];

async function deleteInvalidSubmissions() {
    console.log('💎 DELETING INVALID USER SUBMISSIONS...\n');
    
    let totalDeleted = 0;
    
    // Use collectionGroup to find all submissions
    const allSubmissions = await db.collectionGroup('submissions').get();
    
    console.log(`📊 Found ${allSubmissions.size} total submissions\n`);
    
    // Group submissions by user to delete
    const submissionsToDelete = [];
    
    allSubmissions.docs.forEach(doc => {
        if (INVALID_USERS_TO_REMOVE.includes(doc.id)) {
            submissionsToDelete.push({
                ref: doc.ref,
                uid: doc.id,
                path: doc.ref.path
            });
        }
    });
    
    console.log(`⚠️ Found ${submissionsToDelete.length} submissions to delete:\n`);
    
    // Group by user for reporting
    const byUser = {};
    submissionsToDelete.forEach(item => {
        if (!byUser[item.uid]) {
            byUser[item.uid] = [];
        }
        byUser[item.uid].push(item);
    });
    
    // Delete submissions for each user
    for (const [uid, submissions] of Object.entries(byUser)) {
        console.log(`\n🗑️ Deleting ${submissions.length} submissions for ${uid}:`);
        
        for (const submission of submissions) {
            try {
                await submission.ref.delete();
                totalDeleted++;
                console.log(`  ✅ Deleted: ${submission.path}`);
            } catch (error) {
                console.log(`  ❌ Error deleting ${submission.path}: ${error.message}`);
            }
        }
    }
    
    console.log(`\n📊 Total submissions deleted: ${totalDeleted}`);
    
    return totalDeleted;
}

async function verifyCleanup() {
    console.log('\n💎 VERIFYING CLEANUP...\n');
    
    // Count pool members
    const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    const poolDoc = await poolMembersRef.get();
    const memberCount = poolDoc.exists ? Object.keys(poolDoc.data()).length : 0;
    
    // Count unique users with submissions using collectionGroup
    const allSubmissions = await db.collectionGroup('submissions').get();
    const uniqueUsers = new Set();
    allSubmissions.docs.forEach(doc => uniqueUsers.add(doc.id));
    
    console.log('📊 FINAL COUNTS:');
    console.log(`  Pool Members: ${memberCount}`);
    console.log(`  Unique Users with Picks: ${uniqueUsers.size}`);
    console.log(`  Discrepancy: ${Math.abs(memberCount - uniqueUsers.size)}`);
    
    // Check if any invalid users still have submissions
    const remainingInvalid = INVALID_USERS_TO_REMOVE.filter(uid => uniqueUsers.has(uid));
    if (remainingInvalid.length > 0) {
        console.log(`\n⚠️ Invalid users still with submissions: ${remainingInvalid.length}`);
        remainingInvalid.forEach(uid => console.log(`  - ${uid}`));
    } else {
        console.log('\n✅ All invalid users have been removed from submissions');
    }
    
    console.log('\n💎 CLEANUP COMPLETE - DIAMONDS ARE FOREVER! 💎');
}

async function main() {
    console.log('💎 NERDFOOTBALL SUBMISSION CLEANUP - DIAMONDS ARE FOREVER 💎');
    console.log('========================================================\n');
    
    const deleted = await deleteInvalidSubmissions();
    
    if (deleted > 0) {
        await verifyCleanup();
    } else {
        console.log('\n✅ No submissions found to delete - system is already clean!');
    }
    
    process.exit(0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});