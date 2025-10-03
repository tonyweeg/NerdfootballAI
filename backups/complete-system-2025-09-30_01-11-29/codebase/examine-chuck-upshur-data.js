/**
 * 🔍 EXAMINE CHUCK UPSHUR'S FIREBASE DATA
 *
 * This script will examine Chuck Upshur's user document in Firebase to identify
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

async function examineChuckUpshurData() {
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

        // Search for Chuck Upshur in the pool members
        let chuckUserId = null;
        let chuckData = null;

        for (const [userId, memberData] of Object.entries(poolMembers)) {
            if (memberData.displayName && memberData.displayName.toLowerCase().includes('chuck')) {
                if (memberData.displayName.toLowerCase().includes('upshur') ||
                    (memberData.email && memberData.email.toLowerCase().includes('upshur'))) {
                    chuckUserId = userId;
                    chuckData = memberData;
                    console.log(`🎯 Found Chuck Upshur! User ID: ${userId}`);
                    break;
                }
            }
        }

        if (!chuckData) {
            console.log('🔍 Chuck Upshur not found by name. Searching by email pattern...');

            // Alternative search by email patterns
            for (const [userId, memberData] of Object.entries(poolMembers)) {
                if (memberData.email && memberData.email.toLowerCase().includes('upshur')) {
                    chuckUserId = userId;
                    chuckData = memberData;
                    console.log(`🎯 Found Chuck Upshur by email! User ID: ${userId}`);
                    break;
                }
            }
        }

        if (!chuckData) {
            console.error('❌ Chuck Upshur not found in pool members');
            console.log('📋 Available members:');
            Object.entries(poolMembers).forEach(([userId, member]) => {
                console.log(`  - ${member.displayName || 'Unknown'} (${member.email || 'No email'}) [${userId}]`);
            });
            return;
        }

        console.log('\n🔍 CHUCK UPSHUR\'S COMPLETE DATA STRUCTURE:');
        console.log('==========================================');
        console.log(JSON.stringify(chuckData, null, 2));

        // Focus on survivor data
        if (chuckData.survivor) {
            console.log('\n🏆 CHUCK\'S SURVIVOR DATA:');
            console.log('=========================');
            console.log(`Alive: ${chuckData.survivor.alive}`);
            console.log(`Total Picks: ${chuckData.survivor.totalPicks}`);
            console.log(`Pick History: "${chuckData.survivor.pickHistory}"`);
            console.log(`Elimination Week: ${chuckData.survivor.eliminationWeek}`);
            console.log(`Last Updated: ${chuckData.survivor.lastUpdated}`);

            // Analyze pick history
            if (chuckData.survivor.pickHistory) {
                const picks = chuckData.survivor.pickHistory.split(', ').filter(pick => pick && pick.trim());
                console.log('\n📊 PICK ANALYSIS:');
                console.log('=================');
                console.log(`Pick History String: "${chuckData.survivor.pickHistory}"`);
                console.log(`Split into array: [${picks.map(p => `"${p}"`).join(', ')}]`);
                console.log(`Array length: ${picks.length}`);
                console.log(`Total picks field: ${chuckData.survivor.totalPicks}`);

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

                // Check for specific Week 1 Tampa Bay pick
                if (picks.length > 0 && picks[0]) {
                    const week1Pick = picks[0].trim();
                    console.log(`\n🏈 WEEK 1 PICK ANALYSIS:`);
                    console.log(`========================`);
                    console.log(`Week 1 pick: "${week1Pick}"`);
                    console.log(`Expected: "Tampa Bay"`);
                    console.log(`Matches Tampa Bay: ${week1Pick.toLowerCase().includes('tampa')}`);
                    console.log(`Should show helmet: ${completedWeeks >= 1}`);
                }

                // Check for Week 2 pick existence
                if (picks.length > 1 && picks[1]) {
                    const week2Pick = picks[1].trim();
                    console.log(`\n🏈 WEEK 2 PICK ANALYSIS:`);
                    console.log(`========================`);
                    console.log(`Week 2 pick: "${week2Pick}"`);
                    console.log(`Should show helmet: ${completedWeeks >= 2}`);
                    console.log(`Should show thinking emoji: ${currentWeek === 2 && !currentWeekGamesStarted}`);
                } else {
                    console.log(`\n❌ WEEK 2 PICK MISSING:`);
                    console.log(`=======================`);
                    console.log(`No Week 2 pick found in pick history`);
                    console.log(`This explains why Week 2 pick is not showing`);
                }

            } else {
                console.log('\n❌ No pick history string found for Chuck Upshur');
            }
        } else {
            console.log('\n❌ No survivor data found for Chuck Upshur');
        }

        console.log('\n🔍 CHUCK UPSHUR ISSUES IDENTIFIED:');
        console.log('==================================');
        console.log('1. Check if Week 1 Tampa Bay pick is in pick history');
        console.log('2. Verify if Week 2 pick exists in data');
        console.log('3. Check helmet rendering logic for existing picks');
        console.log('4. Verify totalPicks count matches actual picks');
        console.log('5. Check if display shows "1 weeks" despite having data');

    } catch (error) {
        console.error('❌ Error examining Chuck Upshur data:', error);
        console.error('Stack trace:', error.stack);
    }

    // Exit the process
    process.exit(0);
}

// Run the examination
examineChuckUpshurData();