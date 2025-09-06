// 🔍 Find actual picks data using the correct path structure
// Based on frontend code: artifacts/nerdfootball/public/data/nerdfootball_picks/{week}/submissions/{uid}

const admin = require('firebase-admin');

async function findActualPicksData() {
    console.log('🔍 FINDING ACTUAL PICKS DATA');
    console.log('Using correct path: artifacts/nerdfootball/public/data/nerdfootball_picks/{week}/submissions/{uid}\n');
    
    // Initialize Firebase Admin
    if (!admin.apps.length) {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'nerdfootball'
        });
    }
    const db = admin.firestore();
    
    let totalPicksFound = 0;
    let allPicksUsers = new Set();
    const weeklyData = {};
    
    try {
        // Check for picks data in each week (1-18 for NFL season)
        console.log('📍 SEARCHING WEEKLY PICKS DATA...');
        
        for (let week = 1; week <= 18; week++) {
            console.log(`\n   🔍 Week ${week}:`);
            
            const weekPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
            
            try {
                const submissionsCollection = db.collection(weekPath);
                const snapshot = await submissionsCollection.get();
                
                if (!snapshot.empty) {
                    console.log(`   ✅ Found ${snapshot.size} submissions`);
                    weeklyData[week] = [];
                    
                    snapshot.docs.forEach(doc => {
                        const userId = doc.id;
                        allPicksUsers.add(userId);
                        weeklyData[week].push(userId);
                        console.log(`     👤 ${userId}`);
                    });
                    
                    totalPicksFound += snapshot.size;
                } else {
                    console.log(`   ❌ No submissions found`);
                }
                
            } catch (error) {
                console.log(`   ⚠️ Error checking week ${week}: ${error.message}`);
            }
        }
        
        // Also check pool-specific path for legacy pools
        console.log('\n📍 CHECKING POOL-SPECIFIC PATHS...');
        const poolId = 'nerduniverse-2025';
        
        for (let week = 1; week <= 18; week++) {
            const poolWeekPath = `artifacts/nerdfootball/pools/${poolId}/data/nerdfootball_picks/${week}/submissions`;
            
            try {
                const poolSubmissions = db.collection(poolWeekPath);
                const poolSnapshot = await poolSubmissions.get();
                
                if (!poolSnapshot.empty) {
                    console.log(`   ✅ Pool Week ${week}: ${poolSnapshot.size} submissions`);
                    
                    poolSnapshot.docs.forEach(doc => {
                        const userId = doc.id;
                        allPicksUsers.add(userId);
                        if (!weeklyData[week]) weeklyData[week] = [];
                        if (!weeklyData[week].includes(userId)) {
                            weeklyData[week].push(userId);
                        }
                    });
                    
                    totalPicksFound += poolSnapshot.size;
                }
            } catch (error) {
                // Silent fail
            }
        }
        
        // Get pool members for comparison
        console.log('\n📍 COMPARING WITH POOL MEMBERS...');
        const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
        const poolMembersDoc = await db.doc(poolMembersPath).get();
        
        let poolMembers = {};
        if (poolMembersDoc.exists) {
            poolMembers = poolMembersDoc.data();
            console.log(`✅ Found ${Object.keys(poolMembers).length} pool members`);
        }
        
        const poolMemberUIDs = new Set(Object.keys(poolMembers));
        const picksUserUIDs = Array.from(allPicksUsers);
        
        // Find discrepancies
        const picksNotInPool = picksUserUIDs.filter(uid => !poolMemberUIDs.has(uid));
        const poolNopicks = Object.keys(poolMembers).filter(uid => !allPicksUsers.has(uid));
        
        // Get user details for picks not in pool
        console.log('\n📍 ANALYZING USERS WITH PICKS BUT NOT IN POOL...');
        const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
        
        const picksNotInPoolDetails = [];
        for (const uid of picksNotInPool) {
            try {
                const userDoc = await db.collection(usersPath).doc(uid).get();
                let userDetails = { uid, displayName: 'Unknown', email: 'Unknown' };
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    userDetails = {
                        uid,
                        displayName: userData.displayName || 'Unknown',
                        email: userData.email || 'Unknown'
                    };
                }
                
                // Also check Firebase Auth
                try {
                    const authUser = await admin.auth().getUser(uid);
                    userDetails.authDisplayName = authUser.displayName;
                    userDetails.authEmail = authUser.email;
                    userDetails.inAuth = true;
                } catch (authError) {
                    userDetails.inAuth = false;
                }
                
                picksNotInPoolDetails.push(userDetails);
            } catch (error) {
                picksNotInPoolDetails.push({ 
                    uid, 
                    displayName: 'Error fetching', 
                    email: 'Error fetching',
                    error: error.message 
                });
            }
        }
        
        // Final results
        console.log('\n' + '='.repeat(60));
        console.log('🎯 PICKS DATA ANALYSIS RESULTS');
        console.log('='.repeat(60));
        
        console.log(`📊 SUMMARY:`);
        console.log(`   Total pick submissions: ${totalPicksFound}`);
        console.log(`   Unique users with picks: ${allPicksUsers.size}`);
        console.log(`   Pool members: ${Object.keys(poolMembers).length}`);
        console.log(`   Discrepancy: ${allPicksUsers.size - Object.keys(poolMembers).length}`);
        
        console.log(`\n📈 WEEKLY BREAKDOWN:`);
        Object.keys(weeklyData).forEach(week => {
            if (weeklyData[week].length > 0) {
                console.log(`   Week ${week}: ${weeklyData[week].length} submissions`);
            }
        });
        
        if (picksNotInPool.length > 0) {
            console.log(`\n🚨 ${picksNotInPool.length} USERS HAVE PICKS BUT ARE NOT IN POOL:`);
            picksNotInPoolDetails.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.displayName} (${user.email})`);
                console.log(`      UID: ${user.uid}`);
                console.log(`      In Auth: ${user.inAuth ? 'Yes' : 'No'}`);
                if (user.authDisplayName) {
                    console.log(`      Auth Name: ${user.authDisplayName} (${user.authEmail})`);
                }
            });
        }
        
        if (poolNopicks.length > 0) {
            console.log(`\n⚠️ ${poolNopicks.length} POOL MEMBERS HAVE NO PICKS:`);
            poolNopicks.slice(0, 10).forEach((uid, index) => {
                const member = poolMembers[uid];
                console.log(`   ${index + 1}. ${member.displayName || member.email} (${uid})`);
            });
            if (poolNopicks.length > 10) {
                console.log(`   ... and ${poolNopicks.length - 10} more`);
            }
        }
        
        // Recommendations
        console.log('\n🔧 RECOMMENDATIONS:');
        if (picksNotInPool.length > 0) {
            console.log(`   1. Add ${picksNotInPool.length} users to pool membership`);
            console.log(`      Run: node add-missing-users-to-pool.js`);
        }
        
        if (poolNopicks.length > 0) {
            console.log(`   2. ${poolNopicks.length} pool members haven't submitted picks yet`);
            console.log(`      This may be normal if the season hasn't started`);
        }
        
        console.log('\n🎯 INVESTIGATION COMPLETE!');
        
        return {
            totalSubmissions: totalPicksFound,
            uniqueUsers: allPicksUsers.size,
            poolMembers: Object.keys(poolMembers).length,
            picksNotInPool: picksNotInPool.length,
            poolNopicks: poolNopicks.length,
            weeklyData,
            picksNotInPoolDetails
        };
        
    } catch (error) {
        console.error('💥 SEARCH ERROR:', error);
        throw error;
    }
}

// Run the search
findActualPicksData()
    .then(results => {
        console.log('\n🏁 Analysis completed successfully');
        console.log(`📊 Final Summary:`);
        console.log(`   Submissions: ${results.totalSubmissions}`);
        console.log(`   Unique users with picks: ${results.uniqueUsers}`);
        console.log(`   Pool members: ${results.poolMembers}`);
        console.log(`   Users with picks not in pool: ${results.picksNotInPool}`);
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });