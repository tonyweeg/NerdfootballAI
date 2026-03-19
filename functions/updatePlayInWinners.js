const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const BASE = 'artifacts/nerdbasketball/pools/nerdmadness_2026';

// ============================================
// PLAY-IN GAME WINNERS - UPDATE THESE!
// ============================================

const PLAY_IN_WINNERS = {
    // 11-SEED PLAY-IN GAMES
    // Update with actual winners after First Four

    // Example: If San Diego State beats Another Team for the West 11-seed
    west_11: {
        name: 'San Diego State',
        abbrev: 'SDSU'
    },

    // Example: If Xavier beats Another Team for the Midwest 11-seed
    midwest_11: {
        name: 'Xavier',
        abbrev: 'XAV'
    },

    // 16-SEED PLAY-IN GAMES
    // Update with actual winners after First Four

    // Example: If Norfolk State wins the South 16-seed play-in
    south_16: {
        name: 'Norfolk State',
        abbrev: 'NSU'
    },

    // Example: If UMBC wins the Midwest 16-seed play-in
    // (Actually UMBC is already set, this is just example)
    // midwest_16: {
    //     name: 'UMBC',
    //     abbrev: 'UMBC'
    // }
};

// ============================================
// UPDATE FUNCTION
// ============================================

async function updatePlayInWinners() {
    console.log('🏀 Updating Play-In Game Winners...\n');

    try {
        const batch = db.batch();
        let updateCount = 0;

        for (const [teamSlot, winnerData] of Object.entries(PLAY_IN_WINNERS)) {
            const [region, seedStr] = teamSlot.split('_');
            const seed = parseInt(seedStr);
            const teamId = teamSlot;

            console.log(`📝 Updating ${region.toUpperCase()} ${seed}-seed: ${winnerData.name}`);

            const teamRef = db.doc(`${BASE}/teams/${teamId}`);
            batch.update(teamRef, {
                team_name: winnerData.name,
                team_abbrev: winnerData.abbrev,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            updateCount++;
        }

        if (updateCount === 0) {
            console.log('⚠️  No teams to update. Edit PLAY_IN_WINNERS object first!\n');
            return { success: false, message: 'No updates configured' };
        }

        console.log('\n💾 Committing updates...');
        await batch.commit();
        console.log('   ✅ Done!\n');

        console.log('═══════════════════════════════════════════════');
        console.log('🏆 PLAY-IN WINNERS UPDATED!');
        console.log('═══════════════════════════════════════════════');
        console.log(`📊 Updated ${updateCount} team(s)`);
        console.log('═══════════════════════════════════════════════\n');

        return { success: true, updated: updateCount };

    } catch (error) {
        console.error('❌ Error updating play-in winners:', error);
        throw error;
    }
}

// ============================================
// HELPER: View current team data
// ============================================

async function viewCurrentTeams() {
    console.log('🏀 Current Play-In Slot Teams:\n');

    const slots = ['east_11', 'west_11', 'south_11', 'midwest_11',
                   'east_16', 'west_16', 'south_16', 'midwest_16'];

    for (const slot of slots) {
        const snap = await db.doc(`${BASE}/teams/${slot}`).get();
        if (snap.exists) {
            const data = snap.data();
            console.log(`   ${slot}: ${data.team_name} (${data.team_abbrev})`);
        }
    }
    console.log('');
}

// ============================================
// MAIN
// ============================================

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--view')) {
        await viewCurrentTeams();
    } else if (args.includes('--update')) {
        await viewCurrentTeams();
        console.log('─────────────────────────────────────────────\n');
        await updatePlayInWinners();
    } else {
        console.log('🏀 Play-In Winners Update Script\n');
        console.log('Usage:');
        console.log('  node updatePlayInWinners.js --view    View current teams in play-in slots');
        console.log('  node updatePlayInWinners.js --update  Update with configured winners\n');
        console.log('Before running --update:');
        console.log('  1. Edit PLAY_IN_WINNERS object in this file');
        console.log('  2. Set the actual winner names and abbreviations');
        console.log('  3. Run with --update flag\n');
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { updatePlayInWinners, viewCurrentTeams };
