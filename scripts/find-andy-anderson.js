const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findAndyAnderson() {
    try {
        console.log('🔍 Searching for Andy Anderson in pool members...\n');

        const poolId = 'nerduniverse-2025';
        const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
        const membersDoc = await db.doc(poolMembersPath).get();

        if (!membersDoc.exists) {
            console.log('❌ Pool members not found');
            process.exit(1);
        }

        const members = membersDoc.data();

        // Find all members with "andy" or "anderson" in name/email
        const andyMatches = Object.entries(members).filter(([id, member]) => {
            const name = (member.name || '').toLowerCase();
            const email = (member.email || '').toLowerCase();
            return name.includes('andy') || name.includes('anderson') ||
                   email.includes('andy') || email.includes('anderson');
        });

        console.log(`Found ${andyMatches.length} matches:\n`);

        for (const [id, member] of andyMatches) {
            console.log('=====================================');
            console.log('User ID:', id);
            console.log('Name:', member.name);
            console.log('Email:', member.email);
            console.log('Confidence enabled:', member.participation?.confidence?.enabled);
            console.log('');

            // Check Week 4 picks
            const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/${id}`;
            const picksDoc = await db.doc(picksPath).get();

            if (picksDoc.exists) {
                const picks = picksDoc.data();
                const gamePicks = Object.entries(picks).filter(([key]) => key.match(/^\d+$/));
                console.log('Week 4 picks count:', gamePicks.length);

                // Show first 3 picks
                console.log('Sample picks:');
                gamePicks.slice(0, 3).forEach(([gameId, pick]) => {
                    console.log(`  Game ${gameId}: ${pick.winner} (confidence ${pick.confidence})`);
                });
            } else {
                console.log('❌ No Week 4 picks found');
            }
            console.log('');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

findAndyAnderson();
