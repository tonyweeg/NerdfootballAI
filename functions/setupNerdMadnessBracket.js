const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const BASE = 'artifacts/nerdbasketball/pools/nerdmadness_2026';

// ============================================
// TOURNAMENT TEAMS - 2026 NCAA BRACKET
// ============================================

const REGIONS = {
    east: { name: 'East', displayName: 'EAST', color: '#3b82f6' },
    west: { name: 'West', displayName: 'WEST', color: '#22c55e' },
    south: { name: 'South', displayName: 'SOUTH', color: '#f97316' },
    midwest: { name: 'Midwest', displayName: 'MIDWEST', color: '#eab308' }
};

const ROUNDS = {
    round_of_64: { name: 'Round of 64', order: 1, multiplier: 1, games: 32 },
    round_of_32: { name: 'Round of 32', order: 2, multiplier: 2, games: 16 },
    sweet_16: { name: 'Sweet 16', order: 3, multiplier: 4, games: 8 },
    elite_8: { name: 'Elite 8', order: 4, multiplier: 8, games: 4 },
    final_four: { name: 'Final Four', order: 5, multiplier: 16, games: 2 },
    championship: { name: 'Championship', order: 6, multiplier: 32, games: 1 }
};

const TEAMS_DATA = {
    // EAST REGION - Official 2026 NCAA Bracket
    east: [
        { seed: 1, name: 'Duke', abbrev: 'DUKE', record: '32-2' },
        { seed: 2, name: 'UConn', abbrev: 'CONN', record: '29-5' },
        { seed: 3, name: 'Michigan State', abbrev: 'MSU', record: '25-7' },
        { seed: 4, name: 'Kansas', abbrev: 'KU', record: '23-10' },
        { seed: 5, name: "St. John's", abbrev: 'SJU', record: '28-6' },
        { seed: 6, name: 'Louisville', abbrev: 'LOU', record: '23-10' },
        { seed: 7, name: 'UCLA', abbrev: 'UCLA', record: '23-11' },
        { seed: 8, name: 'Ohio State', abbrev: 'OSU', record: '21-12' },
        { seed: 9, name: 'TCU', abbrev: 'TCU', record: '22-11' },
        { seed: 10, name: 'UCF', abbrev: 'UCF', record: '21-11' },
        { seed: 11, name: 'South Florida', abbrev: 'USF', record: '25-8' },
        { seed: 12, name: 'Northern Iowa', abbrev: 'UNI', record: '23-12' },
        { seed: 13, name: 'Cal Baptist', abbrev: 'CBU', record: '25-8' },
        { seed: 14, name: 'North Dakota State', abbrev: 'NDSU', record: '27-7' },
        { seed: 15, name: 'Furman', abbrev: 'FUR', record: '22-12' },
        { seed: 16, name: 'Siena', abbrev: 'SIEN', record: '23-11' }
    ],
    // WEST REGION - Official 2026 NCAA Bracket
    west: [
        { seed: 1, name: 'Arizona', abbrev: 'ARIZ', record: '32-2' },
        { seed: 2, name: 'Purdue', abbrev: 'PUR', record: '27-8' },
        { seed: 3, name: 'Gonzaga', abbrev: 'GONZ', record: '30-3' },
        { seed: 4, name: 'Arkansas', abbrev: 'ARK', record: '26-8' },
        { seed: 5, name: 'Wisconsin', abbrev: 'WIS', record: '24-10' },
        { seed: 6, name: 'BYU', abbrev: 'BYU', record: '23-11' },
        { seed: 7, name: 'Miami (FL)', abbrev: 'MIA', record: '25-8' },
        { seed: 8, name: 'Villanova', abbrev: 'NOVA', record: '24-8' },
        { seed: 9, name: 'Utah State', abbrev: 'USU', record: '28-6' },
        { seed: 10, name: 'Missouri', abbrev: 'MIZ', record: '20-12' },
        { seed: 11, name: 'Texas', abbrev: 'TEX', record: '19-14' },
        { seed: 12, name: 'High Point', abbrev: 'HPU', record: '30-4' },
        { seed: 13, name: 'Hawaii', abbrev: 'HAW', record: '24-8' },
        { seed: 14, name: 'Kennesaw State', abbrev: 'KENN', record: '21-13' },
        { seed: 15, name: 'Queens (N.C.)', abbrev: 'QUEE', record: '21-13' },
        { seed: 16, name: 'Long Island', abbrev: 'LIU', record: '24-10' }
    ],
    // SOUTH REGION - Official 2026 NCAA Bracket
    south: [
        { seed: 1, name: 'Florida', abbrev: 'FLA', record: '26-7' },
        { seed: 2, name: 'Houston', abbrev: 'HOU', record: '28-6' },
        { seed: 3, name: 'Illinois', abbrev: 'ILL', record: '24-8' },
        { seed: 4, name: 'Nebraska', abbrev: 'NEB', record: '26-6' },
        { seed: 5, name: 'Vanderbilt', abbrev: 'VAN', record: '26-8' },
        { seed: 6, name: 'North Carolina', abbrev: 'UNC', record: '24-8' },
        { seed: 7, name: "Saint Mary's", abbrev: 'SMC', record: '27-5' },
        { seed: 8, name: 'Clemson', abbrev: 'CLEM', record: '24-10' },
        { seed: 9, name: 'Iowa', abbrev: 'IOWA', record: '21-12' },
        { seed: 10, name: 'Texas A&M', abbrev: 'TAMU', record: '21-11' },
        { seed: 11, name: 'VCU', abbrev: 'VCU', record: '27-7' },
        { seed: 12, name: 'McNeese', abbrev: 'MCN', record: '28-5' },
        { seed: 13, name: 'Troy', abbrev: 'TROY', record: '22-11' },
        { seed: 14, name: 'Penn', abbrev: 'PENN', record: '18-11' },
        { seed: 15, name: 'Idaho', abbrev: 'IDAH', record: '21-14' },
        { seed: 16, name: 'PVAMU/Lehigh', abbrev: 'TBD', record: 'First Four', isPlayIn: true }
    ],
    // MIDWEST REGION - Official 2026 NCAA Bracket
    midwest: [
        { seed: 1, name: 'Michigan', abbrev: 'MICH', record: '31-3' },
        { seed: 2, name: 'Iowa State', abbrev: 'ISU', record: '27-7' },
        { seed: 3, name: 'Virginia', abbrev: 'UVA', record: '29-5' },
        { seed: 4, name: 'Alabama', abbrev: 'BAMA', record: '23-9' },
        { seed: 5, name: 'Texas Tech', abbrev: 'TTU', record: '22-10' },
        { seed: 6, name: 'Tennessee', abbrev: 'TENN', record: '22-11' },
        { seed: 7, name: 'Kentucky', abbrev: 'UK', record: '21-13' },
        { seed: 8, name: 'Georgia', abbrev: 'UGA', record: '22-10' },
        { seed: 9, name: 'Saint Louis', abbrev: 'SLU', record: '28-5' },
        { seed: 10, name: 'Santa Clara', abbrev: 'SCU', record: '26-8' },
        { seed: 11, name: 'MIA OH/SMU', abbrev: 'TBD', record: 'First Four', isPlayIn: true },
        { seed: 12, name: 'Akron', abbrev: 'AKR', record: '29-5' },
        { seed: 13, name: 'Hofstra', abbrev: 'HOF', record: '24-10' },
        { seed: 14, name: 'Wright State', abbrev: 'WRST', record: '23-11' },
        { seed: 15, name: 'Tennessee State', abbrev: 'TNST', record: '23-9' },
        { seed: 16, name: 'Howard', abbrev: 'HOW', record: '24-10' }
    ]
};

// Standard bracket seed matchups for Round of 64
const SEED_MATCHUPS = [
    [1, 16], [8, 9], [5, 12], [4, 13],
    [6, 11], [3, 14], [7, 10], [2, 15]
];

// ============================================
// GENERATE TEAMS COLLECTION
// ============================================
function generateTeams() {
    const teams = {};

    for (const [regionId, regionTeams] of Object.entries(TEAMS_DATA)) {
        for (const team of regionTeams) {
            const teamId = `${regionId}_${team.seed}`;
            teams[teamId] = {
                team_id: teamId,
                team_name: team.name,
                team_abbrev: team.abbrev,
                team_seed: team.seed,
                seed: team.seed,
                region_id: regionId,
                region_name: REGIONS[regionId].displayName,
                eliminated: false,
                logo_url: null
            };
        }
    }

    return teams;
}

// ============================================
// GENERATE MATCHUPS COLLECTION
// ============================================
function generateMatchups() {
    const matchups = {};
    const regions = ['east', 'west', 'south', 'midwest'];

    let matchupNum = 1;

    // ROUND OF 64 (Matchups 1-32, 8 per region)
    for (const region of regions) {
        for (let i = 0; i < SEED_MATCHUPS.length; i++) {
            const [topSeed, bottomSeed] = SEED_MATCHUPS[i];
            const matchupId = `m${matchupNum}`;

            // Calculate which Round of 32 game this feeds into
            const rd32GameIndex = Math.floor(i / 2);
            const rd32MatchupNum = 33 + (regions.indexOf(region) * 4) + rd32GameIndex;
            const slot = i % 2 === 0 ? 'top' : 'bottom';

            matchups[matchupId] = {
                matchup_id: matchupId,
                matchup_number: matchupNum,
                round_id: 'round_of_64',
                round_number: 1,
                region_id: region,
                top_team_id: `${region}_${topSeed}`,
                bottom_team_id: `${region}_${bottomSeed}`,
                top_seed: topSeed,
                bottom_seed: bottomSeed,
                next_matchup_id: `m${rd32MatchupNum}`,
                next_matchup_slot: slot,
                winning_team_id: null,
                complete: false,
                game_time: null,
                location: null
            };

            matchupNum++;
        }
    }

    // ROUND OF 32 (Matchups 33-48, 4 per region)
    for (const region of regions) {
        for (let i = 0; i < 4; i++) {
            const matchupId = `m${matchupNum}`;

            // Calculate Sweet 16 feed
            const s16GameIndex = Math.floor(i / 2);
            const s16MatchupNum = 49 + (regions.indexOf(region) * 2) + s16GameIndex;
            const slot = i % 2 === 0 ? 'top' : 'bottom';

            matchups[matchupId] = {
                matchup_id: matchupId,
                matchup_number: matchupNum,
                round_id: 'round_of_32',
                round_number: 2,
                region_id: region,
                top_team_id: null,
                bottom_team_id: null,
                top_seed: null,
                bottom_seed: null,
                next_matchup_id: `m${s16MatchupNum}`,
                next_matchup_slot: slot,
                winning_team_id: null,
                complete: false,
                game_time: null,
                location: null
            };

            matchupNum++;
        }
    }

    // SWEET 16 (Matchups 49-56, 2 per region)
    for (const region of regions) {
        for (let i = 0; i < 2; i++) {
            const matchupId = `m${matchupNum}`;

            // Calculate Elite 8 feed
            const e8MatchupNum = 57 + regions.indexOf(region);
            const slot = i === 0 ? 'top' : 'bottom';

            matchups[matchupId] = {
                matchup_id: matchupId,
                matchup_number: matchupNum,
                round_id: 'sweet_16',
                round_number: 3,
                region_id: region,
                top_team_id: null,
                bottom_team_id: null,
                top_seed: null,
                bottom_seed: null,
                next_matchup_id: `m${e8MatchupNum}`,
                next_matchup_slot: slot,
                winning_team_id: null,
                complete: false,
                game_time: null,
                location: null
            };

            matchupNum++;
        }
    }

    // ELITE 8 (Matchups 57-60, 1 per region)
    const finalFourFeeds = {
        east: { matchup: 61, slot: 'top' },
        west: { matchup: 61, slot: 'bottom' },
        south: { matchup: 62, slot: 'top' },
        midwest: { matchup: 62, slot: 'bottom' }
    };

    for (const region of regions) {
        const matchupId = `m${matchupNum}`;
        const ff = finalFourFeeds[region];

        matchups[matchupId] = {
            matchup_id: matchupId,
            matchup_number: matchupNum,
            round_id: 'elite_8',
            round_number: 4,
            region_id: region,
            top_team_id: null,
            bottom_team_id: null,
            top_seed: null,
            bottom_seed: null,
            next_matchup_id: `m${ff.matchup}`,
            next_matchup_slot: ff.slot,
            winning_team_id: null,
            complete: false,
            game_time: null,
            location: null
        };

        matchupNum++;
    }

    // FINAL FOUR (Matchups 61-62)
    matchups['m61'] = {
        matchup_id: 'm61',
        matchup_number: 61,
        round_id: 'final_four',
        round_number: 5,
        region_id: 'final_four',
        matchup_name: 'East vs West',
        top_team_id: null,
        bottom_team_id: null,
        top_seed: null,
        bottom_seed: null,
        next_matchup_id: 'm63',
        next_matchup_slot: 'top',
        winning_team_id: null,
        complete: false,
        game_time: null,
        location: null
    };

    matchups['m62'] = {
        matchup_id: 'm62',
        matchup_number: 62,
        round_id: 'final_four',
        round_number: 5,
        region_id: 'final_four',
        matchup_name: 'South vs Midwest',
        top_team_id: null,
        bottom_team_id: null,
        top_seed: null,
        bottom_seed: null,
        next_matchup_id: 'm63',
        next_matchup_slot: 'bottom',
        winning_team_id: null,
        complete: false,
        game_time: null,
        location: null
    };

    // CHAMPIONSHIP (Matchup 63)
    matchups['m63'] = {
        matchup_id: 'm63',
        matchup_number: 63,
        round_id: 'championship',
        round_number: 6,
        region_id: 'championship',
        matchup_name: 'National Championship',
        top_team_id: null,
        bottom_team_id: null,
        top_seed: null,
        bottom_seed: null,
        next_matchup_id: null,
        next_matchup_slot: null,
        winning_team_id: null,
        complete: false,
        game_time: null,
        location: null
    };

    return matchups;
}

// ============================================
// MAIN SETUP FUNCTION
// ============================================
async function setupTournament() {
    console.log('🏀 Starting NerdMadness 2026 Tournament Setup...\n');

    try {
        const batch = db.batch();

        // 1. Save Regions
        console.log('📝 Saving regions...');
        for (const [regionId, regionData] of Object.entries(REGIONS)) {
            const ref = db.doc(`${BASE}/regions/${regionId}`);
            batch.set(ref, {
                region_id: regionId,
                ...regionData
            });
        }
        console.log('   ✅ 4 regions prepared\n');

        // 2. Save Rounds
        console.log('📝 Saving rounds...');
        for (const [roundId, roundData] of Object.entries(ROUNDS)) {
            const ref = db.doc(`${BASE}/rounds/${roundId}`);
            batch.set(ref, {
                round_id: roundId,
                ...roundData
            });
        }
        console.log('   ✅ 6 rounds prepared\n');

        // 3. Save Teams
        console.log('📝 Saving teams...');
        const teams = generateTeams();
        for (const [teamId, teamData] of Object.entries(teams)) {
            const ref = db.doc(`${BASE}/teams/${teamId}`);
            batch.set(ref, teamData);
        }
        console.log(`   ✅ ${Object.keys(teams).length} teams prepared\n`);

        // 4. Save Matchups
        console.log('📝 Saving matchups...');
        const matchups = generateMatchups();
        for (const [matchupId, matchupData] of Object.entries(matchups)) {
            const ref = db.doc(`${BASE}/matchups/${matchupId}`);
            batch.set(ref, matchupData);
        }
        console.log(`   ✅ ${Object.keys(matchups).length} matchups prepared\n`);

        // Commit the batch
        console.log('💾 Committing to Firestore...');
        await batch.commit();
        console.log('   ✅ Batch committed!\n');

        // 5. Update settings (separate write)
        console.log('📝 Updating tournament settings...');
        const settingsRef = db.doc(`${BASE}/metadata/settings`);
        await settingsRef.set({
            tournamentName: 'NerdMadness 2026',
            lockTime: admin.firestore.Timestamp.fromDate(new Date('2026-03-19T12:00:00-05:00')),
            totalTeams: 64,
            totalGames: 63,
            regions: ['east', 'west', 'south', 'midwest'],
            scoring_system: {
                round_of_64: 1,
                round_of_32: 2,
                sweet_16: 4,
                elite_8: 8,
                final_four: 16,
                championship: 32
            },
            scoringFormula: 'Points = Round Multiplier × Seed of Winner',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('   ✅ Settings updated\n');

        // 6. Create empty results document
        console.log('📝 Creating results document...');
        const resultsRef = db.doc(`${BASE}/results/actual`);
        await resultsRef.set({
            games: {},
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            completedGames: 0,
            currentRound: 'round_of_64'
        });
        console.log('   ✅ Results document created\n');

        // Summary
        console.log('═══════════════════════════════════════════════');
        console.log('🏆 NERDMADNESS 2026 TOURNAMENT SETUP COMPLETE!');
        console.log('═══════════════════════════════════════════════');
        console.log(`📍 Base Path: ${BASE}`);
        console.log('📊 Collections Created:');
        console.log('   • /regions (4 documents)');
        console.log('   • /rounds (6 documents)');
        console.log('   • /teams (64 documents)');
        console.log('   • /matchups (63 documents)');
        console.log('   • /metadata/settings');
        console.log('   • /results/actual');
        console.log('🔒 Lock Time: March 19, 2026 @ 12:00 PM EST');
        console.log('═══════════════════════════════════════════════\n');

        return { success: true };

    } catch (error) {
        console.error('❌ Error setting up tournament:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    setupTournament()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { setupTournament, TEAMS_DATA, REGIONS, ROUNDS, generateTeams, generateMatchups };
