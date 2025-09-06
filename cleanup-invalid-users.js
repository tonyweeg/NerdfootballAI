const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball.firebaseio.com"
});

const db = admin.firestore();

// Users to process
const VALID_USER_TO_ADD = {
    uid: 'e2JyWNl3hzOydVxg7QkOAbBHIj32',
    displayName: 'James Guerrieri sr',
    email: 'jamguerrr@yahoo.com'
};

const INVALID_USERS_TO_REMOVE = [
    '6FYtDM1p9vOpLFbSkRjBGaqayzm1', // Ghost user
    'HqQ5r88P0BZ8lrONDcATjQWuu6m1', // Shrimper2001 - deleted account
    'Xkfsav1h12bagLrjAE6BAWH2SUy1', // PurpleHaze - per user request
    'YBXqHkFmemOyR6GO9E7ToSHv2812', // Andrea Weeg duplicate
    'rJUpiuhwVrZU7vLvOnLL08AECUW2'  // Jacob Adkins - per user request
];

async function addValidUserToPool() {
    console.log('\n💎 ADDING VALID USER TO POOL...');
    
    try {
        // Add to pool membership
        const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const poolDoc = await poolMembersRef.get();
        
        if (poolDoc.exists) {
            const members = poolDoc.data();
            
            if (!members[VALID_USER_TO_ADD.uid]) {
                // Add the user to pool
                await poolMembersRef.update({
                    [VALID_USER_TO_ADD.uid]: {
                        displayName: VALID_USER_TO_ADD.displayName,
                        email: VALID_USER_TO_ADD.email,
                        role: 'member',
                        joinedAt: admin.firestore.FieldValue.serverTimestamp()
                    }
                });
                
                console.log(`✅ Added ${VALID_USER_TO_ADD.displayName} (${VALID_USER_TO_ADD.uid}) to pool`);
                
                // Also ensure they exist in the users collection
                const userRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_users/${VALID_USER_TO_ADD.uid}`);
                const userDoc = await userRef.get();
                
                if (!userDoc.exists) {
                    await userRef.set({
                        displayName: VALID_USER_TO_ADD.displayName,
                        email: VALID_USER_TO_ADD.email,
                        uid: VALID_USER_TO_ADD.uid,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`✅ Created user profile for ${VALID_USER_TO_ADD.displayName}`);
                }
            } else {
                console.log(`ℹ️ ${VALID_USER_TO_ADD.displayName} already in pool`);
            }
        }
    } catch (error) {
        console.error(`❌ Error adding user to pool:`, error);
    }
}

async function removeInvalidUserPicks() {
    console.log('\n💎 REMOVING INVALID USER PICKS...');
    
    for (const uid of INVALID_USERS_TO_REMOVE) {
        console.log(`\n🗑️ Removing data for user: ${uid}`);
        
        try {
            // Remove from all pick weeks
            const picksPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks';
            const weeksSnapshot = await db.collection(picksPath).get();
            
            let picksRemoved = 0;
            for (const weekDoc of weeksSnapshot.docs) {
                const submissionRef = db.doc(`${picksPath}/${weekDoc.id}/submissions/${uid}`);
                const submissionDoc = await submissionRef.get();
                
                if (submissionDoc.exists) {
                    await submissionRef.delete();
                    picksRemoved++;
                    console.log(`  ✅ Removed picks from week ${weekDoc.id}`);
                }
            }
            
            // Remove from survivor picks
            const survivorRef = db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`);
            const survivorDoc = await survivorRef.get();
            
            if (survivorDoc.exists) {
                await survivorRef.delete();
                console.log(`  ✅ Removed survivor picks`);
            }
            
            // Remove from user profiles if exists
            const userRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_users/${uid}`);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                await userRef.delete();
                console.log(`  ✅ Removed user profile (${userData.displayName || 'Unknown'})`);
            }
            
            // Remove from pool membership (if somehow exists)
            const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
            const poolDoc = await poolMembersRef.get();
            
            if (poolDoc.exists) {
                const members = poolDoc.data();
                if (members[uid]) {
                    await poolMembersRef.update({
                        [uid]: admin.firestore.FieldValue.delete()
                    });
                    console.log(`  ✅ Removed from pool membership`);
                }
            }
            
            console.log(`  📊 Total picks removed: ${picksRemoved}`);
            
        } catch (error) {
            console.error(`  ❌ Error removing data for ${uid}:`, error);
        }
    }
}

async function verifyResults() {
    console.log('\n💎 VERIFYING CLEANUP RESULTS...');
    
    try {
        // Count pool members
        const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const poolDoc = await poolMembersRef.get();
        const memberCount = poolDoc.exists ? Object.keys(poolDoc.data()).length : 0;
        
        // Count unique users with picks across all weeks
        const picksPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks';
        const weeksSnapshot = await db.collection(picksPath).get();
        
        const uniquePickUsers = new Set();
        for (const weekDoc of weeksSnapshot.docs) {
            const submissionsSnapshot = await db.collection(`${picksPath}/${weekDoc.id}/submissions`).get();
            submissionsSnapshot.docs.forEach(doc => uniquePickUsers.add(doc.id));
        }
        
        console.log('\n📊 FINAL COUNTS:');
        console.log(`  Pool Members: ${memberCount}`);
        console.log(`  Unique Users with Picks: ${uniquePickUsers.size}`);
        console.log(`  Discrepancy: ${Math.abs(memberCount - uniquePickUsers.size)}`);
        
        // Check if invalid users still have picks
        console.log('\n🔍 Checking if invalid users were removed:');
        for (const uid of INVALID_USERS_TO_REMOVE) {
            if (uniquePickUsers.has(uid)) {
                console.log(`  ⚠️ ${uid} still has picks!`);
            } else {
                console.log(`  ✅ ${uid} successfully removed`);
            }
        }
        
        // Check if valid user was added
        if (poolDoc.exists && poolDoc.data()[VALID_USER_TO_ADD.uid]) {
            console.log(`\n✅ ${VALID_USER_TO_ADD.displayName} successfully added to pool`);
        } else {
            console.log(`\n⚠️ ${VALID_USER_TO_ADD.displayName} not found in pool`);
        }
        
    } catch (error) {
        console.error('❌ Error verifying results:', error);
    }
}

async function main() {
    console.log('💎 NERDFOOTBALL USER CLEANUP - DIAMONDS ARE FOREVER 💎');
    console.log('================================================');
    
    // Step 1: Add valid user
    await addValidUserToPool();
    
    // Step 2: Remove invalid users
    await removeInvalidUserPicks();
    
    // Step 3: Verify results
    await verifyResults();
    
    console.log('\n💎 CLEANUP COMPLETE!');
    process.exit(0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});