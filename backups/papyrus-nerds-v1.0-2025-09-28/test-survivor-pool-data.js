// Test script for getSurvivorPoolData function
const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'nerdfootball'
});

const db = admin.firestore();

// Import the survivor pool cache function
const { generateSurvivorPoolData } = require('./functions/survivorPoolCache');

async function testSurvivorPoolData() {
    console.log('🏈 Testing Survivor Pool Data Generation...');

    try {
        const startTime = Date.now();

        // Test data generation (same logic as the Firebase Function)
        const poolId = 'nerduniverse-2025';

        // Test pool members access
        const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
        const membersDoc = await db.doc(poolMembersPath).get();

        if (!membersDoc.exists) {
            throw new Error(`Pool ${poolId} not found`);
        }

        const poolMembers = membersDoc.data();
        const memberIds = Object.keys(poolMembers).filter(id => id !== 'okl4sw2aDhW3yKpOfOwe5lH7OQj1');

        console.log(`👥 Found ${memberIds.length} pool members`);

        // Test survivor picks access for first few members
        const testMemberIds = memberIds.slice(0, 3);

        for (const memberId of testMemberIds) {
            const memberInfo = poolMembers[memberId];
            const survivorPicksPath = `artifacts/nerdfootball/users/${memberId}/survivor_picks/${poolId}`;

            try {
                const picksDoc = await db.doc(survivorPicksPath).get();

                if (picksDoc.exists) {
                    const picks = picksDoc.data();
                    const week1Pick = picks['1']?.teamPicked || picks['1']?.team;
                    console.log(`✅ ${memberInfo.displayName}: Week 1 pick = ${week1Pick || 'None'}`);
                } else {
                    console.log(`⚠️ ${memberInfo.displayName}: No survivor picks found`);
                }
            } catch (error) {
                console.log(`❌ ${memberInfo.displayName}: Error accessing picks - ${error.message}`);
            }
        }

        // Test NFL results access
        console.log('\n📊 Testing NFL Results Access...');
        const nflResults = {};

        for (let week = 1; week <= 3; week++) {
            try {
                const weekDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdfootball_results/${week}`).get();

                if (weekDoc.exists) {
                    const weekData = weekDoc.data();
                    const gameCount = Object.keys(weekData).length;

                    if (gameCount > 0) {
                        const finalGames = Object.values(weekData).filter(g => g.status === 'FINAL');
                        console.log(`✅ Week ${week}: ${finalGames.length} final games out of ${gameCount} total`);
                        nflResults[week] = weekData;
                    }
                } else {
                    console.log(`⚠️ Week ${week}: No results data found`);
                }
            } catch (error) {
                console.log(`❌ Week ${week}: Error accessing results - ${error.message}`);
            }
        }

        const totalTime = Date.now() - startTime;
        console.log(`\n✅ Test completed in ${totalTime}ms`);
        console.log(`📊 Available NFL weeks: ${Object.keys(nflResults).join(', ')}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        process.exit(0);
    }
}

// Run the test
testSurvivorPoolData();