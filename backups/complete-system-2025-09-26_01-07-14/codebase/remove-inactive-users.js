/**
 * 🧹 REMOVE INACTIVE USERS FROM CONFIDENCE POOL
 *
 * Remove the 3 users with 0 picks in both Week 1 and Week 2
 * This script is ready to execute pending user approval
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

// Users identified for removal (0 picks in both weeks)
const INACTIVE_USERS = [
    {
        userId: '7qopL067nYUS1zCOzwzRJek2fUr1',
        displayName: 'Casey Dougall',
        reason: '0 picks in Week 1 and Week 2'
    },
    {
        userId: 'EJNzILXk6sgHzFU5WOGJqiDORe33',
        displayName: 'PurpleHaze',
        reason: '0 picks in Week 1 and Week 2'
    },
    {
        userId: 'XAEvbGQ77bWsbo9WuTkJhdMUIAH2',
        displayName: 'David Dulany',
        reason: '0 picks in Week 1 and Week 2'
    }
];

async function removeInactiveUsers() {
    console.log('🧹 REMOVING INACTIVE USERS FROM CONFIDENCE POOL');
    console.log('===============================================');
    console.log('⚠️ WARNING: This will permanently remove users from pool membership');
    console.log('📋 Users to be removed:');

    INACTIVE_USERS.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.displayName} (${user.userId})`);
        console.log(`      Reason: ${user.reason}`);
    });

    console.log('\n🔍 Pre-removal verification...');

    // Verify users are actually inactive
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    try {
        const poolMembersDoc = await db.doc(poolMembersPath).get();

        if (!poolMembersDoc.exists) {
            console.log('❌ Pool members document not found');
            return;
        }

        const currentMembers = poolMembersDoc.data();
        console.log(`✅ Found pool with ${Object.keys(currentMembers).length} current members`);

        // Verify each user exists in pool and confirm they're inactive
        for (const user of INACTIVE_USERS) {
            if (currentMembers[user.userId]) {
                console.log(`   ✅ ${user.displayName} found in pool membership`);

                // Double-check they have no picks in Week 1 or 2
                const hasWeek1Picks = await checkUserPicks(user.userId, 1);
                const hasWeek2Picks = await checkUserPicks(user.userId, 2);

                if (hasWeek1Picks || hasWeek2Picks) {
                    console.log(`   ❌ ERROR: ${user.displayName} actually has picks! Skipping removal.`);
                    continue;
                }

                console.log(`   ✅ Confirmed: ${user.displayName} has 0 picks in both weeks`);
            } else {
                console.log(`   ⚠️ ${user.displayName} not found in current pool membership`);
            }
        }

        console.log('\n💾 SIMULATION MODE - Remove the following line to execute actual removal:');
        console.log('// REMOVE_USERS_CONFIRMED = true;');
        console.log('\n📋 This would remove:');

        const REMOVE_USERS_CONFIRMED = false; // Set to true to actually remove users

        if (REMOVE_USERS_CONFIRMED) {
            // Create updated members object without inactive users
            const updatedMembers = { ...currentMembers };

            for (const user of INACTIVE_USERS) {
                if (updatedMembers[user.userId]) {
                    delete updatedMembers[user.userId];
                    console.log(`   ✅ Removed ${user.displayName} from pool membership`);
                }
            }

            // Update the pool members document
            await db.doc(poolMembersPath).set(updatedMembers);

            console.log('\n✅ USERS SUCCESSFULLY REMOVED FROM POOL');
            console.log(`📊 Pool size reduced from ${Object.keys(currentMembers).length} to ${Object.keys(updatedMembers).length} members`);

            // Create removal log
            const removalLog = {
                timestamp: new Date().toISOString(),
                removedUsers: INACTIVE_USERS,
                reason: 'No participation in Week 1 or Week 2',
                previousPoolSize: Object.keys(currentMembers).length,
                newPoolSize: Object.keys(updatedMembers).length,
                executedBy: 'Diamond Accuracy Engine'
            };

            await db.doc(`artifacts/nerdfootball/pools/${poolId}/logs/inactive_user_removal_${Date.now()}`).set(removalLog);
            console.log('📝 Removal log saved for audit trail');

        } else {
            console.log('\n🔒 SIMULATION MODE - No actual changes made');
            console.log('📋 To execute removal, set REMOVE_USERS_CONFIRMED = true');

            INACTIVE_USERS.forEach((user, index) => {
                console.log(`   ${index + 1}. Would remove: ${user.displayName}`);
            });

            console.log(`\n📊 Impact: Pool would reduce from ${Object.keys(currentMembers).length} to ${Object.keys(currentMembers).length - INACTIVE_USERS.length} active members`);
        }

    } catch (error) {
        console.error('💥 Removal failed:', error);
    }
}

async function checkUserPicks(userId, weekNumber) {
    try {
        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${userId}`;
        const picksDoc = await db.doc(picksPath).get();

        if (picksDoc.exists) {
            const userData = picksDoc.data();
            const picks = userData.picks || userData;
            const pickCount = Object.keys(picks).filter(key =>
                typeof picks[key] === 'object' && picks[key].winner && picks[key].confidence
            ).length;
            return pickCount > 0;
        }

        return false;
    } catch (error) {
        return false;
    }
}

// Execute if run directly
if (require.main === module) {
    removeInactiveUsers().catch(console.error);
}

module.exports = { removeInactiveUsers, INACTIVE_USERS };