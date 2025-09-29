/**
 * 🔍 EXAMINE ERIK WEEG'S FIREBASE DATA
 *
 * This script will examine Erik Weeg's user document in Firebase to identify
 * the logic flaw in the survivor battlefield helmet display system.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Standard Firebase configuration (from CLAUDE.md)
const firebaseConfig = {
    apiKey: "AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw",
    authDomain: "nerdfootball.firebaseapp.com",
    databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com",
    projectId: "nerdfootball",
    storageBucket: "nerdfootball.appspot.com",
    messagingSenderId: "969304790725",
    appId: "1:969304790725:web:892df38db0b0e62bde02ac"
};

async function examineErikWeegData() {
    try {
        console.log('🔥 Initializing Firebase...');
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log('📡 Loading pool members data...');

        // Load the pool members document (authoritative source)
        const poolMembersDoc = await getDoc(doc(db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members'));

        if (!poolMembersDoc.exists()) {
            console.error('❌ Pool members document not found');
            return;
        }

        const poolMembers = poolMembersDoc.data();
        console.log(`✅ Loaded data for ${Object.keys(poolMembers).length} pool members`);

        // Search for Erik Weeg in the pool members
        let erikUserId = null;
        let erikData = null;

        for (const [userId, memberData] of Object.entries(poolMembers)) {
            if (memberData.displayName && memberData.displayName.toLowerCase().includes('erik')) {
                if (memberData.displayName.toLowerCase().includes('weeg') ||
                    (memberData.email && memberData.email.toLowerCase().includes('weeg'))) {
                    erikUserId = userId;
                    erikData = memberData;
                    console.log(`🎯 Found Erik Weeg! User ID: ${userId}`);
                    break;
                }
            }
        }

        if (!erikData) {
            console.log('🔍 Erik Weeg not found by name. Searching by email pattern...');

            // Alternative search by email patterns
            for (const [userId, memberData] of Object.entries(poolMembers)) {
                if (memberData.email && memberData.email.toLowerCase().includes('weeg')) {
                    erikUserId = userId;
                    erikData = memberData;
                    console.log(`🎯 Found Erik Weeg by email! User ID: ${userId}`);
                    break;
                }
            }
        }

        if (!erikData) {
            console.error('❌ Erik Weeg not found in pool members');
            console.log('📋 Available members:');
            Object.entries(poolMembers).forEach(([userId, member]) => {
                console.log(`  - ${member.displayName || 'Unknown'} (${member.email || 'No email'}) [${userId}]`);
            });
            return;
        }

        console.log('\n🔍 ERIK WEEG\'S COMPLETE DATA STRUCTURE:');
        console.log('=====================================');
        console.log(JSON.stringify(erikData, null, 2));

        // Focus on survivor data
        if (erikData.survivor) {
            console.log('\n🏆 ERIK\'S SURVIVOR DATA:');
            console.log('========================');
            console.log(`Alive: ${erikData.survivor.alive}`);
            console.log(`Total Picks: ${erikData.survivor.totalPicks}`);
            console.log(`Pick History: "${erikData.survivor.pickHistory}"`);
            console.log(`Elimination Week: ${erikData.survivor.eliminationWeek}`);
            console.log(`Last Updated: ${erikData.survivor.lastUpdated}`);

            // Analyze pick history
            if (erikData.survivor.pickHistory) {
                const picks = erikData.survivor.pickHistory.split(', ').filter(pick => pick && pick.trim());
                console.log('\n📊 PICK ANALYSIS:');
                console.log('=================');
                console.log(`Pick History String: "${erikData.survivor.pickHistory}"`);
                console.log(`Split into array: [${picks.map(p => `"${p}"`).join(', ')}]`);
                console.log(`Array length: ${picks.length}`);
                console.log(`Total picks field: ${erikData.survivor.totalPicks}`);

                picks.forEach((pick, index) => {
                    console.log(`  Week ${index + 1}: "${pick.trim()}"`);
                });

                // Calculate current week
                const seasonStart = new Date('2025-09-04');
                const now = new Date();
                const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
                const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);

                console.log(`\n📅 TIMING ANALYSIS:`);
                console.log(`==================`);
                console.log(`Current calculated week: ${currentWeek}`);
                console.log(`Season start: ${seasonStart.toDateString()}`);
                console.log(`Today: ${now.toDateString()}`);
                console.log(`Days since start: ${daysSinceStart}`);

                // Helmet display logic analysis
                console.log(`\n🎯 HELMET DISPLAY LOGIC ANALYSIS:`);
                console.log(`=================================`);

                const currentWeekGamesStarted = false; // Assume safer default
                const completedWeeks = currentWeekGamesStarted ? currentWeek : currentWeek - 1;
                const maxPicksToProcess = currentWeek;

                console.log(`Current week games started: ${currentWeekGamesStarted}`);
                console.log(`Completed weeks (shown): ${completedWeeks}`);
                console.log(`Max picks to process: ${maxPicksToProcess}`);
                console.log(`Picks to show: ${Math.min(picks.length, maxPicksToProcess)}`);
                console.log(`Helmets that should be visible: ${Math.min(picks.length, completedWeeks)}`);

                // Show what would be displayed
                const visiblePicks = picks.slice(0, maxPicksToProcess).filter((_, index) => {
                    const week = index + 1;
                    return week <= completedWeeks;
                });

                console.log(`\n👁️ VISIBLE PICKS (what user should see):`);
                visiblePicks.forEach((pick, index) => {
                    console.log(`  Week ${index + 1}: ${pick}`);
                });

                if (picks.length > completedWeeks) {
                    const hiddenPicks = picks.slice(completedWeeks);
                    console.log(`\n🙈 HIDDEN PICKS (should not be visible):`);
                    hiddenPicks.forEach((pick, index) => {
                        console.log(`  Week ${completedWeeks + index + 1}: ${pick}`);
                    });
                }
            }
        } else {
            console.log('\n❌ No survivor data found for Erik Weeg');
        }

        console.log('\n🔍 POTENTIAL LOGIC FLAWS TO INVESTIGATE:');
        console.log('=======================================');
        console.log('1. Check if picks beyond completedWeeks are being shown');
        console.log('2. Verify currentWeek calculation is correct');
        console.log('3. Ensure maxPicksToProcess limiting is working');
        console.log('4. Check if array slicing is correct in buildHelmetDisplay()');
        console.log('5. Verify that thinking emoji is shown for current week');

    } catch (error) {
        console.error('❌ Error examining Erik Weeg data:', error);
        console.error('Stack trace:', error.stack);
    }

    // Exit the process
    process.exit(0);
}

// Run the examination
examineErikWeegData();