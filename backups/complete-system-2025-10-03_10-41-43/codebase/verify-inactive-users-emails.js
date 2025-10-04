/**
 * 🔍 VERIFY INACTIVE USERS EMAIL ADDRESSES
 *
 * Show email addresses for the 3 inactive users before removal
 * This ensures we don't remove the wrong David Dulany/Dulaney
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
const INACTIVE_USER_IDS = [
    '7qopL067nYUS1zCOzwzRJek2fUr1', // Casey Dougall
    'EJNzILXk6sgHzFU5WOGJqiDORe33', // PurpleHaze
    'XAEvbGQ77bWsbo9WuTkJhdMUIAH2'  // David Dulany
];

async function verifyInactiveUsersEmails() {
    console.log('🔍 VERIFYING INACTIVE USERS EMAIL ADDRESSES');
    console.log('============================================');
    console.log('🎯 MISSION: Confirm identities before removal');

    try {
        // Get user profiles
        console.log('\n📊 Fetching user profiles and email addresses...');
        const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
        const usersCollection = await db.collection(usersPath).get();

        const userProfiles = {};
        usersCollection.forEach(userDoc => {
            const userData = userDoc.data();
            userProfiles[userDoc.id] = userData;
        });

        console.log(`✅ Found ${Object.keys(userProfiles).length} total user profiles`);

        // Display detailed info for each inactive user
        console.log('\n👥 INACTIVE USERS TO BE REMOVED:');
        console.log('================================');

        for (let i = 0; i < INACTIVE_USER_IDS.length; i++) {
            const userId = INACTIVE_USER_IDS[i];
            const userProfile = userProfiles[userId];

            console.log(`\n${i + 1}. USER DETAILS:`);
            console.log(`   🆔 User ID: ${userId}`);

            if (userProfile) {
                console.log(`   👤 Display Name: ${userProfile.displayName || userProfile.name || 'Not set'}`);
                console.log(`   📧 Email Address: ${userProfile.email || 'Not set'}`);
                console.log(`   📅 Created: ${userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Unknown'}`);
                console.log(`   🔑 Auth Provider: ${userProfile.authProvider || 'Unknown'}`);

                // Show any other identifying info
                if (userProfile.firstName || userProfile.lastName) {
                    console.log(`   🏷️ Name Parts: ${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim());
                }

                if (userProfile.phoneNumber) {
                    console.log(`   📱 Phone: ${userProfile.phoneNumber}`);
                }
            } else {
                console.log(`   ❌ No profile found for this user ID`);
            }

            // Double-check their pick activity
            console.log(`   📋 Pick Activity:`);
            const week1Picks = await checkUserPicksDetailed(userId, 1);
            const week2Picks = await checkUserPicksDetailed(userId, 2);
            console.log(`      Week 1: ${week1Picks.haspicks ? `${week1Picks.pickCount} picks` : 'No picks'}`);
            console.log(`      Week 2: ${week2Picks.haspicks ? `${week2Picks.pickCount} picks` : 'No picks'}`);

            if (week1Picks.haspicks || week2Picks.haspicks) {
                console.log(`   ⚠️ WARNING: This user actually has picks! Should NOT be removed.`);
            } else {
                console.log(`   ✅ Confirmed: Zero picks in both weeks`);
            }
        }

        // Special focus on David Dulany/Dulaney verification
        const davidUser = userProfiles['XAEvbGQ77bWsbo9WuTkJhdMUIAH2'];
        if (davidUser) {
            console.log('\n🔍 SPECIAL VERIFICATION - DAVID DULANY:');
            console.log('======================================');
            console.log(`   👤 Display Name: "${davidUser.displayName || davidUser.name}"`);
            console.log(`   📧 Email: "${davidUser.email}"`);
            console.log(`   🎯 Verification: This should match the David we want to remove`);

            // Check if there are any other Davids in the system
            console.log('\n🔍 Checking for other "David" users in the system...');
            const otherDavids = Object.entries(userProfiles).filter(([id, profile]) => {
                const name = (profile.displayName || profile.name || '').toLowerCase();
                return name.includes('david') && id !== 'XAEvbGQ77bWsbo9WuTkJhdMUIAH2';
            });

            if (otherDavids.length > 0) {
                console.log(`   ⚠️ Found ${otherDavids.length} other David(s) in the system:`);
                otherDavids.forEach(([id, profile]) => {
                    console.log(`      • ${profile.displayName || profile.name} (${profile.email}) - ID: ${id}`);
                });
            } else {
                console.log(`   ✅ No other Davids found in the system`);
            }
        }

        // Final confirmation summary
        console.log('\n📋 REMOVAL CONFIRMATION SUMMARY:');
        console.log('=================================');

        let allVerified = true;
        for (let i = 0; i < INACTIVE_USER_IDS.length; i++) {
            const userId = INACTIVE_USER_IDS[i];
            const userProfile = userProfiles[userId];

            if (userProfile) {
                const week1Picks = await checkUserPicksDetailed(userId, 1);
                const week2Picks = await checkUserPicksDetailed(userId, 2);
                const isInactive = !week1Picks.haspicks && !week2Picks.haspicks;

                console.log(`   ${i + 1}. ${userProfile.displayName || 'Unknown'} (${userProfile.email || 'No email'})`);
                console.log(`      Status: ${isInactive ? '✅ Safe to remove' : '❌ DO NOT REMOVE - Has picks!'}`);

                if (!isInactive) {
                    allVerified = false;
                }
            } else {
                console.log(`   ${i + 1}. User ID ${userId} - ❌ Profile not found`);
                allVerified = false;
            }
        }

        console.log(`\n🎯 FINAL VERIFICATION: ${allVerified ? '✅ ALL USERS VERIFIED FOR REMOVAL' : '❌ ISSUES DETECTED - DO NOT PROCEED'}`);

        if (allVerified) {
            console.log('\n📧 EMAIL ADDRESSES CONFIRMED:');
            for (const userId of INACTIVE_USER_IDS) {
                const userProfile = userProfiles[userId];
                if (userProfile) {
                    console.log(`   • ${userProfile.displayName || 'Unknown'}: ${userProfile.email || 'No email'}`);
                }
            }

            console.log('\n✅ Ready to proceed with removal if these email addresses are correct.');
        } else {
            console.log('\n❌ DO NOT PROCEED - Verification failed!');
        }

    } catch (error) {
        console.error('💥 Verification failed:', error);
    }
}

async function checkUserPicksDetailed(userId, weekNumber) {
    try {
        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${userId}`;
        const picksDoc = await db.doc(picksPath).get();

        if (picksDoc.exists) {
            const userData = picksDoc.data();
            const picks = userData.picks || userData;
            const validPicks = Object.keys(picks).filter(key =>
                typeof picks[key] === 'object' && picks[key].winner && picks[key].confidence
            );

            return {
                haspicks: validPicks.length > 0,
                pickCount: validPicks.length,
                totalEntries: Object.keys(picks).length
            };
        }

        return { haspicks: false, pickCount: 0, totalEntries: 0 };
    } catch (error) {
        return { haspicks: false, pickCount: 0, totalEntries: 0 };
    }
}

verifyInactiveUsersEmails().catch(console.error);