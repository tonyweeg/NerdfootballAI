// 🔍 Investigate 51 pool members vs 57 pick sheets discrepancy
// This script analyzes the NerdFootball database to find the source of the mismatch

const admin = require('firebase-admin');

async function investigatePoolPicksDiscrepancy() {
    console.log('🔍 INVESTIGATING POOL vs PICKS DISCREPANCY');
    console.log('Expected: 51 pool members, but 57 pick sheets found');
    console.log('Goal: Find the 6 extra picks or missing members\n');
    
    // Initialize Firebase Admin
    if (!admin.apps.length) {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'nerdfootball'
        });
    }
    const db = admin.firestore();
    
    const poolId = 'nerduniverse-2025';
    const results = {
        poolMembers: [],
        allUsers: [],
        picksUsers: [],
        discrepancies: []
    };
    
    try {
        // 1. GET POOL MEMBERS
        console.log('📍 1. CHECKING POOL MEMBERS...');
        const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
        const poolMembersDoc = await db.doc(poolMembersPath).get();
        
        if (poolMembersDoc.exists) {
            const poolMembers = poolMembersDoc.data();
            results.poolMembers = Object.keys(poolMembers).map(uid => ({
                uid,
                displayName: poolMembers[uid].displayName,
                email: poolMembers[uid].email,
                role: poolMembers[uid].role,
                joinedAt: poolMembers[uid].joinedAt
            }));
            
            console.log(`✅ Found ${results.poolMembers.length} pool members`);
            console.log('Pool Members:');
            results.poolMembers.forEach((member, index) => {
                console.log(`  ${index + 1}. ${member.displayName} (${member.uid}) - ${member.role}`);
            });
        } else {
            console.log('❌ Pool members document not found');
        }
        
        // 2. GET ALL FIREBASE USERS
        console.log('\n📍 2. CHECKING ALL FIREBASE USERS...');
        const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
        const usersSnap = await db.collection(usersPath).get();
        
        results.allUsers = usersSnap.docs.map(doc => ({
            uid: doc.id,
            data: doc.data()
        }));
        
        console.log(`✅ Found ${results.allUsers.length} total Firebase users`);
        
        // 3. FIND PICKS DATA - Check multiple possible locations
        console.log('\n📍 3. SEARCHING FOR PICKS DATA...');
        
        const picksLocations = [
            `artifacts/nerdfootball/pools/${poolId}/data/nerdfootball_picks`,
            `artifacts/nerdfootball/public/data/nerdfootball_picks`,
            `artifacts/nerdfootball/picks`,
            `picks`,
            `artifacts/nerdfootball/pools/${poolId}/picks`
        ];
        
        let picksFound = false;
        let allPicksUsers = new Set();
        
        for (const location of picksLocations) {
            console.log(`\n   🔍 Checking picks location: ${location}`);
            
            try {
                // First try as a collection
                const picksCollection = await db.collection(location).get();
                if (!picksCollection.empty) {
                    console.log(`   ✅ Found ${picksCollection.size} documents in collection ${location}`);
                    picksCollection.docs.forEach(doc => {
                        console.log(`     - Document ID: ${doc.id}`);
                        allPicksUsers.add(doc.id);
                        
                        // Check if document contains user picks
                        const data = doc.data();
                        if (data && typeof data === 'object') {
                            Object.keys(data).forEach(key => {
                                // If the key looks like a UID (long alphanumeric string)
                                if (key.length > 15 && /^[a-zA-Z0-9]+$/.test(key)) {
                                    allPicksUsers.add(key);
                                }
                            });
                        }
                    });
                    picksFound = true;
                }
            } catch (collectionError) {
                // Try as a document
                try {
                    const picksDoc = await db.doc(location).get();
                    if (picksDoc.exists) {
                        const picksData = picksDoc.data();
                        console.log(`   ✅ Found picks document at ${location}`);
                        
                        if (picksData && typeof picksData === 'object') {
                            const userIds = Object.keys(picksData);
                            console.log(`     - Contains picks for ${userIds.length} users`);
                            userIds.forEach(uid => allPicksUsers.add(uid));
                            picksFound = true;
                        }
                    }
                } catch (docError) {
                    console.log(`   ❌ No data at ${location}`);
                }
            }
        }
        
        // Convert Set to Array
        results.picksUsers = Array.from(allPicksUsers);
        console.log(`\n📊 TOTAL UNIQUE USERS WITH PICKS: ${results.picksUsers.length}`);
        
        // 4. ANALYZE DISCREPANCIES
        console.log('\n📍 4. ANALYZING DISCREPANCIES...');
        
        const poolMemberUIDs = new Set(results.poolMembers.map(m => m.uid));
        const picksUserUIDs = new Set(results.picksUsers);
        
        // Find users with picks but not in pool
        const picksNotInPool = results.picksUsers.filter(uid => !poolMemberUIDs.has(uid));
        
        // Find pool members without picks
        const poolNopicks = results.poolMembers.filter(member => !picksUserUIDs.has(member.uid));
        
        console.log(`\n🎯 DISCREPANCY ANALYSIS:`);
        console.log(`📊 Pool Members: ${results.poolMembers.length}`);
        console.log(`📊 Users with Picks: ${results.picksUsers.length}`);
        console.log(`📊 Difference: ${results.picksUsers.length - results.poolMembers.length}`);
        
        if (picksNotInPool.length > 0) {
            console.log(`\n🚨 ${picksNotInPool.length} USERS HAVE PICKS BUT ARE NOT IN POOL:`);
            
            for (const uid of picksNotInPool) {
                // Try to find user details
                const user = results.allUsers.find(u => u.uid === uid);
                const displayName = user ? (user.data.displayName || user.data.email || 'Unknown') : 'User not found';
                console.log(`  - ${uid} (${displayName})`);
                
                // Check if this user exists in Firebase Auth
                try {
                    const authUser = await admin.auth().getUser(uid);
                    console.log(`    Auth: ${authUser.displayName || authUser.email} (Active)`);
                } catch (authError) {
                    console.log(`    Auth: User not found (${authError.message})`);
                }
                
                results.discrepancies.push({
                    uid,
                    issue: 'Has picks but not in pool',
                    displayName,
                    inAuth: true // will be updated above
                });
            }
        }
        
        if (poolNopicks.length > 0) {
            console.log(`\n⚠️ ${poolNopicks.length} POOL MEMBERS HAVE NO PICKS:`);
            poolNopicks.forEach(member => {
                console.log(`  - ${member.uid} (${member.displayName})`);
            });
        }
        
        // 5. CHECK FOR GHOST USERS OR TEST ACCOUNTS
        console.log('\n📍 5. CHECKING FOR GHOST/TEST USERS...');
        
        const ghostPatterns = [
            'test',
            'demo',
            'admin',
            'ghost',
            'okl4sw2aDhW3yKpOfOwe5lH7OQj1' // Known ghost user from other scripts
        ];
        
        const suspiciousUsers = [];
        
        results.picksUsers.forEach(uid => {
            // Check for known ghost user
            if (uid === 'okl4sw2aDhW3yKpOfOwe5lH7OQj1') {
                suspiciousUsers.push({ uid, reason: 'Known ghost user' });
                return;
            }
            
            // Check for test patterns in UID
            const lowerUID = uid.toLowerCase();
            for (const pattern of ghostPatterns) {
                if (lowerUID.includes(pattern)) {
                    suspiciousUsers.push({ uid, reason: `Contains pattern: ${pattern}` });
                    break;
                }
            }
            
            // Check user data
            const user = results.allUsers.find(u => u.uid === uid);
            if (user && user.data) {
                const displayName = (user.data.displayName || '').toLowerCase();
                const email = (user.data.email || '').toLowerCase();
                
                for (const pattern of ghostPatterns) {
                    if (displayName.includes(pattern) || email.includes(pattern)) {
                        suspiciousUsers.push({ uid, reason: `Name/email contains: ${pattern}` });
                        break;
                    }
                }
            }
        });
        
        if (suspiciousUsers.length > 0) {
            console.log(`🚨 Found ${suspiciousUsers.length} suspicious users:`);
            suspiciousUsers.forEach(user => {
                console.log(`  - ${user.uid}: ${user.reason}`);
            });
        } else {
            console.log('✅ No obvious ghost or test users detected');
        }
        
        // 6. RECOMMENDATIONS
        console.log('\n📍 6. RECOMMENDATIONS TO FIX DISCREPANCY...');
        
        if (picksNotInPool.length > 0) {
            console.log(`\n🔧 RECOMMENDATION 1: Add ${picksNotInPool.length} users to pool`);
            console.log('   These users have submitted picks but are not pool members.');
            console.log('   Run the add-missing-users-to-pool.js script to sync them.');
        }
        
        if (suspiciousUsers.length > 0) {
            console.log(`\n🔧 RECOMMENDATION 2: Remove ${suspiciousUsers.length} ghost/test users`);
            console.log('   These users appear to be test accounts or ghost users.');
            console.log('   Consider removing their picks data to clean up the discrepancy.');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 INVESTIGATION COMPLETE');
        console.log('='.repeat(60));
        
        return results;
        
    } catch (error) {
        console.error('💥 INVESTIGATION ERROR:', error);
        throw error;
    }
}

// Run the investigation
investigatePoolPicksDiscrepancy()
    .then(results => {
        console.log('\n🏁 Investigation completed successfully');
        console.log(`📊 Final Summary:`);
        console.log(`   Pool Members: ${results.poolMembers.length}`);
        console.log(`   Users with Picks: ${results.picksUsers.length}`);
        console.log(`   Discrepancies Found: ${results.discrepancies.length}`);
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });