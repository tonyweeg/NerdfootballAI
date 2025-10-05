// Script to run elimination check for Week 1-3
// This runs the actual elimination process

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, collection, getDocs } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw",
    authDomain: "nerdfootball.firebaseapp.com",
    databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com",
    projectId: "nerdfootball",
    storageBucket: "nerdfootball.appspot.com",
    messagingSenderId: "969304790725",
    appId: "1:969304790725:web:892df38db0b0e62bde02ac"
};

async function runEliminationCheck() {
    console.log('🚀 Running elimination check for Week 1-3...');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Get Week 1 losing teams
    const week1LosingTeams = ['Miami Dolphins', 'Denver Broncos', 'Las Vegas Raiders', 'Tennessee Titans', 'Chicago Bears', 'Carolina Panthers', 'New York Giants', 'Jacksonville Jaguars', 'Indianapolis Colts', 'Cleveland Browns', 'Arizona Cardinals', 'New England Patriots', 'Los Angeles Rams', 'Seattle Seahawks'];

    console.log('📋 Week 1 losing teams:', week1LosingTeams);

    try {
        // Get all pool members
        const poolMembersRef = doc(db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const poolMembersSnap = await getDoc(poolMembersRef);

        if (!poolMembersSnap.exists()) {
            console.error('❌ Pool members not found');
            return;
        }

        const memberIds = Object.keys(poolMembersSnap.data());
        console.log(`👥 Found ${memberIds.length} pool members`);

        // Get current survivor status
        const statusDocRef = doc(db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status');
        const statusSnap = await getDoc(statusDocRef);
        const allStatuses = statusSnap.exists() ? statusSnap.data() : {};

        let eliminationUpdates = {};
        let eliminatedUsers = [];

        // Check each member's Week 1 pick
        for (const userId of memberIds) {
            // Skip already eliminated users
            if (allStatuses[userId]?.eliminated) {
                console.log(`⏭️ User ${userId} already eliminated`);
                continue;
            }

            try {
                // Get user's survivor picks
                const userPicksDocRef = doc(db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', userId);
                const userPicksSnap = await getDoc(userPicksDocRef);

                if (!userPicksSnap.exists()) {
                    console.log(`⚠️ User ${userId} has no survivor picks document`);
                    continue;
                }

                const userPicksData = userPicksSnap.data();
                const userPicks = userPicksData.picks || {};
                const week1Pick = userPicks[1];

                if (!week1Pick) {
                    console.log(`⚠️ User ${userId} has no Week 1 pick`);
                    continue;
                }

                const pickedTeam = week1Pick.team;
                console.log(`👤 User ${userId} picked: ${pickedTeam}`);

                // Check if picked team lost in Week 1
                if (week1LosingTeams.includes(pickedTeam)) {
                    console.log(`❌ ELIMINATING User ${userId}: Picked ${pickedTeam} (Week 1 loser)`);

                    eliminationUpdates[`${userId}.eliminated`] = true;
                    eliminationUpdates[`${userId}.eliminatedWeek`] = 1;
                    eliminationUpdates[`${userId}.eliminatedDate`] = new Date().toISOString();
                    eliminationUpdates[`${userId}.eliminationReason`] = `Lost in Week 1: Picked ${pickedTeam}`;

                    eliminatedUsers.push({
                        userId,
                        week: 1,
                        pickedTeam,
                        reason: 'Week 1 loser'
                    });
                } else {
                    console.log(`✅ User ${userId} survived Week 1: Picked ${pickedTeam}`);
                }

            } catch (error) {
                console.error(`Error checking user ${userId}:`, error);
            }
        }

        // Apply elimination updates
        if (Object.keys(eliminationUpdates).length > 0) {
            console.log(`📝 Updating survivor status with ${eliminatedUsers.length} eliminations...`);
            console.log('📊 Elimination updates:', eliminationUpdates);

            await setDoc(statusDocRef, eliminationUpdates, { merge: true });
            console.log(`✅ Database write successful for ${eliminatedUsers.length} eliminations`);
            console.log('📋 Eliminated users:', eliminatedUsers);
        } else {
            console.log('✅ No eliminations found');
        }

        console.log('🎉 Elimination check complete!');

    } catch (error) {
        console.error('❌ Error running elimination check:', error);
    }
}

runEliminationCheck();