const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'nerdfootball' });

const db = admin.firestore();
const BASE = 'artifacts/nerdbasketball/pools/nerdmadness_2026';

async function check() {
    console.log('🔍 Checking bracket data...\n');

    const matchupsSnap = await db.collection(`${BASE}/matchups`).get();
    const matchups = {};
    matchupsSnap.forEach(doc => { matchups[doc.id] = doc.data(); });

    console.log('E8 GAMES:');
    ['R4_G01', 'R4_G02', 'R4_G03', 'R4_G04'].forEach(id => {
        const m = matchups[id];
        if (m) {
            console.log(`  ${id} (${m.region_id}): next=${m.next_matchup_id}, slot=${m.next_matchup_slot}`);
        } else {
            console.log(`  ${id}: NOT FOUND`);
        }
    });

    console.log('\nFINAL FOUR GAMES (all fields):');
    ['R5_G01', 'R5_G02'].forEach(id => {
        const m = matchups[id];
        if (m) {
            console.log(`  ${id}:`, JSON.stringify(m, null, 4));
        } else {
            console.log(`  ${id}: NOT FOUND`);
        }
    });

    console.log('\nCHAMPIONSHIP:');
    const champ = matchups['R6_G01'];
    if (champ) {
        console.log(`  R6_G01: round=${champ.round_id}`);
    } else {
        console.log(`  R6_G01: NOT FOUND`);
    }

    // Build feeders
    console.log('\nFEEDERS MAP:');
    const feeders = {};
    for (const [id, m] of Object.entries(matchups)) {
        if (m.next_matchup_id) {
            if (!feeders[m.next_matchup_id]) feeders[m.next_matchup_id] = {};
            feeders[m.next_matchup_id][m.next_matchup_slot] = id;
        }
    }
    console.log('  R5_G01:', feeders['R5_G01'] || 'NONE');
    console.log('  R5_G02:', feeders['R5_G02'] || 'NONE');
    console.log('  R6_G01:', feeders['R6_G01'] || 'NONE');

    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
