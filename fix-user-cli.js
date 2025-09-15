#!/usr/bin/env node

/**
 * EMERGENCY CLI FIX for user aaG5Wc2JZkZJD1r7ozfJG04QRrf1
 * This bypasses browser connection issues and fixes the user directly via Firebase Admin SDK
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with default credentials
try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'nerdfootball-project'
    });
    console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    process.exit(1);
}

const db = admin.firestore();
const userId = 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1';

async function fixUserStatus() {
    console.log(`🚨 EMERGENCY FIX for user: ${userId}`);
    console.log('================================================');

    try {
        // 1. Check if user exists in pool
        console.log('🔍 Checking pool membership...');
        const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const poolMembersSnap = await poolMembersRef.get();

        if (!poolMembersSnap.exists) {
            console.error('❌ Pool members document not found');
            return;
        }

        const poolMembers = poolMembersSnap.data();
        const userInfo = poolMembers[userId];

        if (!userInfo) {
            console.error(`❌ User ${userId} not found in pool`);
            return;
        }

        console.log(`✅ Found user: ${userInfo.displayName || userInfo.email}`);

        // 2. Force user to ALIVE status in pool members
        console.log('⚡ Setting user to ALIVE in pool members...');

        const updatedMembers = {
            ...poolMembers,
            [userId]: {
                ...userInfo,
                eliminated: false,
                eliminatedWeek: null,
                eliminationReason: null,
                status: 'active',
                lastUpdated: new Date().toISOString(),
                emergencyFix: true
            }
        };

        await poolMembersRef.set(updatedMembers);
        console.log('✅ Pool members updated');

        // 3. Update survivor status document
        console.log('⚡ Updating survivor status document...');

        const survivorStatusRef = db.doc(`artifacts/nerdfootball/pools/nerduniverse-2025/survivor/${userId}`);
        await survivorStatusRef.set({
            eliminated: false,
            eliminatedWeek: null,
            eliminationReason: null,
            status: 'active',
            lastUpdated: new Date().toISOString(),
            manualOverride: true,
            overrideReason: 'Emergency CLI fix - user should be alive',
            fixedAt: new Date().toISOString()
        }, { merge: true });

        console.log('✅ Survivor status updated');

        // 4. Clear legacy status if it exists
        console.log('⚡ Clearing legacy status...');

        try {
            const legacyStatusRef = db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_status/${userId}`);
            await legacyStatusRef.set({
                eliminated: false,
                eliminatedWeek: null,
                eliminationReason: null,
                status: 'active',
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            console.log('✅ Legacy status cleared');
        } catch (e) {
            console.log('ℹ️ No legacy status to clear');
        }

        // 5. Success
        console.log('================================================');
        console.log('🎉 SUCCESS! User is now ALIVE');
        console.log(`✅ User ${userId} status fixed`);
        console.log('✅ Check the survivor table - they should show as ACTIVE');
        console.log('================================================');

        // 6. Show user's picks for verification
        console.log('📋 Checking user picks for verification...');

        try {
            const picksRef = db.doc(`artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`);
            const picksSnap = await picksRef.get();

            if (picksSnap.exists) {
                const picks = picksSnap.data().picks || {};
                console.log('User picks:');
                for (let week = 1; week <= 18; week++) {
                    if (picks[week]) {
                        console.log(`  Week ${week}: ${picks[week].team} (Game ${picks[week].gameId})`);
                    }
                }
            } else {
                console.log('No picks found for user');
            }
        } catch (e) {
            console.log('Could not retrieve picks:', e.message);
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error(error);
    }
}

// Run the fix
fixUserStatus().then(() => {
    console.log('🏁 Fix complete');
    process.exit(0);
}).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});