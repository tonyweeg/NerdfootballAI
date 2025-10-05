#!/usr/bin/env node

/**
 * Add David Dulany to Pool Members
 *
 * Quick fix to add missing pool member
 */

const admin = require('firebase-admin');

async function addPoolMember() {
    try {
        // Initialize Firebase Admin
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                databaseURL: 'https://nerdfootball-default-rtdb.firebaseio.com'
            });
        }

        const db = admin.firestore();

        // Get current pool members
        const membersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
        const membersRef = db.doc(membersPath);
        const membersSnap = await membersRef.get();

        let currentMembers = {};
        if (membersSnap.exists()) {
            currentMembers = membersSnap.data();
            console.log('📊 Current pool members count:', Object.keys(currentMembers).length);
        } else {
            console.log('⚠️  Pool members document not found, creating new one');
        }

        // David Dulany's info
        const davidUID = 'XAEvbGQ77bWsbo9WuTkJhdMUIAH2';
        const davidInfo = {
            name: 'David Dulany',
            email: 'daviddulany1975@gmail.com',
            addedAt: new Date().toISOString(),
            addedBy: 'admin-fix',
            isActive: true
        };

        // Check if already exists
        if (currentMembers[davidUID]) {
            console.log('✅ David Dulany is already a pool member:', currentMembers[davidUID]);
            return;
        }

        // Add David to pool members
        currentMembers[davidUID] = davidInfo;

        // Update the document
        await membersRef.set(currentMembers);

        console.log('✅ SUCCESS: Added David Dulany to pool members');
        console.log('📊 New pool members count:', Object.keys(currentMembers).length);
        console.log('👤 David Dulany info:', davidInfo);

        // Verify the addition
        const verifySnap = await membersRef.get();
        const verifyData = verifySnap.data();

        if (verifyData[davidUID]) {
            console.log('🔍 VERIFICATION: David successfully added to pool');
        } else {
            console.log('❌ VERIFICATION FAILED: David not found in updated pool');
        }

    } catch (error) {
        console.error('❌ Error adding pool member:', error);
        process.exit(1);
    }
}

addPoolMember()
    .then(() => {
        console.log('🎉 Pool member addition complete!');
        process.exit(0);
    })
    .catch(console.error);