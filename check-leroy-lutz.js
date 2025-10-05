const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkFrankHanna() {
    const week = 5;
    const poolPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
    const picksBasePath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;

    console.log('\n🔍 LEROY LUTZ AUDIT\n');
    console.log('='.repeat(80));

    // Get pool members
    const poolDoc = await db.doc(poolPath).get();
    const poolMembers = poolDoc.data();

    // Find Leroy Lutz in pool members
    console.log('\n📋 SEARCHING POOL MEMBERS FOR LEROY LUTZ:\n');
    let leroyUserId = null;
    for (const [userId, member] of Object.entries(poolMembers)) {
        if (member.email === 'leroylutz@hotmail.com' ||
            (member.name && member.name.toLowerCase().includes('leroy')) ||
            (member.name && member.name.toLowerCase().includes('hanna'))) {
            console.log(`✅ FOUND: ${member.name || member.email}`);
            console.log(`   User ID: ${userId}`);
            console.log(`   Email: ${member.email}`);
            leroyUserId = userId;
            break;
        }
    }

    if (!leroyUserId) {
        console.log('❌ Leroy Lutz NOT FOUND in pool members!');
        console.log('\nSearching all pool members with "hanna" in name/email:');
        for (const [userId, member] of Object.entries(poolMembers)) {
            const searchText = `${member.name} ${member.email}`.toLowerCase();
            if (searchText.includes('hanna') || searchText.includes('leroy')) {
                console.log(`  - ${member.name || member.email} (${userId})`);
            }
        }
        process.exit(1);
    }

    // Check for picks under this userId
    console.log(`\n🎯 CHECKING PICKS FOR USER ID: ${leroyUserId}\n`);
    const picksDoc = await db.doc(`${picksBasePath}/${leroyUserId}`).get();

    if (!picksDoc.exists) {
        console.log(`❌ NO PICKS FOUND at ${picksBasePath}/${leroyUserId}`);
    } else {
        const picks = picksDoc.data();
        console.log(`✅ PICKS FOUND! Total games: ${Object.keys(picks).length}`);
        console.log('\nPicks breakdown:');
        Object.entries(picks).forEach(([gameId, pick]) => {
            console.log(`  Game ${gameId}: ${pick.winner} (confidence: ${pick.confidence})`);
        });
    }

    // Check if there are picks under a different userId with similar email
    console.log('\n🔍 SEARCHING ALL WEEK 5 PICKS FOR FRANK:\n');
    const allPicksSnapshot = await db.collection(picksBasePath).get();

    for (const doc of allPicksSnapshot.docs) {
        const userId = doc.id;
        const picks = doc.data();

        // Check if this userId matches a pool member with Frank's email
        const member = poolMembers[userId];
        if (member &&
            (member.email === 'leroylutz@hotmail.com' ||
             (member.name && member.name.toLowerCase().includes('leroy hanna')))) {
            console.log(`✅ FOUND PICKS under different userId: ${userId}`);
            console.log(`   Pool member: ${member.name || member.email}`);
            console.log(`   Total picks: ${Object.keys(picks).length}`);
            console.log('\nPicks:');
            Object.entries(picks).forEach(([gameId, pick]) => {
                console.log(`  Game ${gameId}: ${pick.winner} (confidence: ${pick.confidence})`);
            });
        }
    }

    console.log('\n' + '='.repeat(80));
    process.exit(0);
}

checkFrankHanna();
