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

    // Check a Round of 64 game to see team field names
    console.log('\nSAMPLE R64 GAME (first one):');
    const r64Games = Object.entries(matchups).filter(([id, m]) => m.round_id === 'round_of_64');
    if (r64Games.length > 0) {
        console.log(`  ${r64Games[0][0]}:`, JSON.stringify(r64Games[0][1], null, 4));
    }

    // Check a team to see field names
    console.log('\nSAMPLE TEAM:');
    const teamsSnap = await db.collection(`${BASE}/teams`).limit(1).get();
    teamsSnap.forEach(doc => {
        console.log(`  ${doc.id}:`, JSON.stringify(doc.data(), null, 4));
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
