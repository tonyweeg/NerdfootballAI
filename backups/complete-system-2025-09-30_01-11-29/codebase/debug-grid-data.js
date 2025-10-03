const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function debugGridData() {
    try {
        console.log('🔍 Debugging Grid data for Week 4...');

        const weekNumber = 4;

        // Step 1: Load pool members
        console.log('\n1. Loading pool members...');
        const poolId = 'nerduniverse-2025';
        const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
        const membersDoc = await db.doc(poolMembersPath).get();

        if (!membersDoc.exists) {
            console.log('❌ Pool members document not found');
            return;
        }

        const poolMembers = membersDoc.data();
        const memberIds = Object.keys(poolMembers);
        console.log(`✅ Found ${memberIds.length} pool members`);

        // Step 2: Load games data (Bible)
        console.log('\n2. Loading games data...');
        const gamesPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`;
        const gamesDoc = await db.doc(gamesPath).get();

        if (!gamesDoc.exists) {
            console.log('❌ Games document not found');
            return;
        }

        const bibleData = gamesDoc.data();
        const gameIds = Object.keys(bibleData)
            .filter(k => !k.startsWith('_') && !k.includes('401772'))
            .filter(k => parseInt(k) >= 401 && parseInt(k) <= 416)
            .sort((a, b) => parseInt(a) - parseInt(b));

        console.log(`✅ Found ${gameIds.length} games`);
        console.log('Game IDs:', gameIds.slice(0, 5), '...');

        // Step 3: Test loading picks for a few users
        console.log('\n3. Loading sample user picks...');
        const sampleUsers = memberIds.slice(0, 3); // Test first 3 users

        for (const userId of sampleUsers) {
            const member = poolMembers[userId];
            const memberName = member.name || member.email || userId;

            console.log(`\n   Testing user: ${memberName} (${userId})`);

            const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${userId}`;
            const userPicksDoc = await db.doc(picksPath).get();

            if (userPicksDoc.exists) {
                const userPicks = userPicksDoc.data();
                const pickCount = Object.keys(userPicks).filter(k =>
                    userPicks[k] && typeof userPicks[k] === 'object' && userPicks[k].confidence
                ).length;

                console.log(`   ✅ Found ${pickCount} valid picks`);

                // Show first few picks
                const firstGame = gameIds[0];
                const firstPick = userPicks[firstGame];
                if (firstPick) {
                    console.log(`   Sample pick (Game ${firstGame}): ${firstPick.winner || firstPick.team} (confidence: ${firstPick.confidence})`);
                } else {
                    console.log(`   No pick for Game ${firstGame}`);
                }
            } else {
                console.log(`   ❌ No picks found for this user`);
            }
        }

        // Step 4: Check specific game statuses
        console.log('\n4. Checking game statuses...');
        gameIds.slice(0, 3).forEach(gameId => {
            const game = bibleData[gameId];
            console.log(`Game ${gameId}: ${game.a} @ ${game.h} - Status: ${game.status} - Winner: ${game.winner || 'TBD'}`);
        });

        console.log('\n✅ Grid debug complete!');

    } catch (error) {
        console.error('❌ Error debugging grid data:', error);
    }
}

debugGridData();