const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SA_FILENAME = 'nerdfootball-firebase-adminsdk-z8k1g-4ed45f6e99.json';
const SA_PATH = path.join(__dirname, '..', SA_FILENAME);
const CLI_CONFIG_PATH = path.join(os.homedir(), '.config/configstore/firebase-tools.json');

function initFirebase() {
    if (fs.existsSync(SA_PATH)) {
        console.log('🔑 Using service account key');
        const sa = require(SA_PATH);
        admin.initializeApp({ credential: admin.credential.cert(sa) });
        return;
    }

    if (fs.existsSync(CLI_CONFIG_PATH)) {
        console.log('🔑 Using Firebase CLI credentials');
        const cliConfig = require(CLI_CONFIG_PATH);
        if (!cliConfig.tokens || !cliConfig.tokens.refresh_token) {
            console.error('❌ Firebase CLI config found but no refresh token. Run: firebase login');
            process.exit(1);
        }
        const tmpPath = path.join(os.tmpdir(), 'firebase-adc-nerdmadness.json');
        fs.writeFileSync(tmpPath, JSON.stringify({
            type: 'authorized_user',
            client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
            client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
            refresh_token: cliConfig.tokens.refresh_token
        }));
        process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
        admin.initializeApp({ projectId: 'nerdfootball' });
        process.on('exit', () => { try { fs.unlinkSync(tmpPath); } catch(e) {} });
        return;
    }

    console.error('\n❌ No Firebase credentials found.');
    console.error('   Option A: Run "firebase login" (Firebase CLI)');
    console.error(`   Option B: Place service account key at: ${SA_PATH}\n`);
    process.exit(1);
}

initFirebase();
const db = admin.firestore();

const BASE_PATH = 'artifacts/nerdbasketball/pools/nerdmadness_2026';
const NERDFOOTBALL_MEMBERS_PATH = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';

const REGIONS = {
    south: {
        region_name: 'South Regional',
        regional_city: 'Houston',
        regional_state: 'TX',
        regional_venue: 'Toyota Center',
        regional_host: 'Rice University'
    },
    west: {
        region_name: 'West Regional',
        regional_city: 'San Jose',
        regional_state: 'CA',
        regional_venue: 'SAP Center',
        regional_host: 'San Jose State University'
    },
    midwest: {
        region_name: 'Midwest Regional',
        regional_city: 'Chicago',
        regional_state: 'IL',
        regional_venue: 'United Center',
        regional_host: 'Northwestern University'
    },
    east: {
        region_name: 'East Regional',
        regional_city: 'Washington',
        regional_state: 'DC',
        regional_venue: 'Capital One Arena',
        regional_host: 'Georgetown University'
    }
};

const ROUNDS = {
    first_four: { round_name: 'First Four', round_number: 0, date_start: '2026-03-17', date_end: '2026-03-18', total_games: 4, points_per_correct_pick: 0 },
    round_of_64: { round_name: 'First Round', round_number: 1, date_start: '2026-03-19', date_end: '2026-03-20', total_games: 32, points_per_correct_pick: 1 },
    round_of_32: { round_name: 'Second Round', round_number: 2, date_start: '2026-03-21', date_end: '2026-03-22', total_games: 16, points_per_correct_pick: 2 },
    sweet_16: { round_name: 'Sweet 16', round_number: 3, date_start: '2026-03-26', date_end: '2026-03-27', total_games: 8, points_per_correct_pick: 4 },
    elite_eight: { round_name: 'Elite Eight', round_number: 4, date_start: '2026-03-28', date_end: '2026-03-29', total_games: 4, points_per_correct_pick: 8 },
    final_four: { round_name: 'Final Four', round_number: 5, date_start: '2026-04-04', date_end: '2026-04-04', total_games: 2, points_per_correct_pick: 16 },
    championship: { round_name: 'National Championship', round_number: 6, date_start: '2026-04-06', date_end: '2026-04-06', total_games: 1, points_per_correct_pick: 32 }
};

const LOCATIONS = {
    dayton: { location_venue: 'UD Arena', location_city: 'Dayton', location_state: 'OH', location_host: 'University of Dayton', rounds_hosted: ['first_four'] },
    buffalo: { location_venue: 'KeyBank Center', location_city: 'Buffalo', location_state: 'NY', location_host: 'MAAC / Canisius / Niagara', rounds_hosted: ['round_of_64', 'round_of_32'] },
    greenville: { location_venue: 'Bon Secours Wellness Arena', location_city: 'Greenville', location_state: 'SC', location_host: 'Furman / Southern Conference', rounds_hosted: ['round_of_64', 'round_of_32'] },
    oklahoma_city: { location_venue: 'Paycom Center', location_city: 'Oklahoma City', location_state: 'OK', location_host: 'Big 12 Conference', rounds_hosted: ['round_of_64', 'round_of_32'] },
    portland: { location_venue: 'Moda Center', location_city: 'Portland', location_state: 'OR', location_host: 'Oregon State University', rounds_hosted: ['round_of_64', 'round_of_32'] },
    tampa: { location_venue: 'Benchmark International Arena', location_city: 'Tampa', location_state: 'FL', location_host: 'University of South Florida', rounds_hosted: ['round_of_64', 'round_of_32'] },
    philadelphia: { location_venue: 'Xfinity Mobile Arena', location_city: 'Philadelphia', location_state: 'PA', location_host: "Saint Joseph's University", rounds_hosted: ['round_of_64', 'round_of_32'] },
    san_diego: { location_venue: 'Viejas Arena', location_city: 'San Diego', location_state: 'CA', location_host: 'San Diego State University', rounds_hosted: ['round_of_64', 'round_of_32'] },
    st_louis: { location_venue: 'Enterprise Center', location_city: 'St. Louis', location_state: 'MO', location_host: 'Missouri Valley Conference', rounds_hosted: ['round_of_64', 'round_of_32'] },
    houston: { location_venue: 'Toyota Center', location_city: 'Houston', location_state: 'TX', location_host: 'Rice University', rounds_hosted: ['sweet_16', 'elite_eight'] },
    san_jose: { location_venue: 'SAP Center', location_city: 'San Jose', location_state: 'CA', location_host: 'San Jose State University', rounds_hosted: ['sweet_16', 'elite_eight'] },
    chicago: { location_venue: 'United Center', location_city: 'Chicago', location_state: 'IL', location_host: 'Northwestern University', rounds_hosted: ['sweet_16', 'elite_eight'] },
    washington_dc: { location_venue: 'Capital One Arena', location_city: 'Washington', location_state: 'DC', location_host: 'Georgetown University', rounds_hosted: ['sweet_16', 'elite_eight'] },
    indianapolis: { location_venue: 'Lucas Oil Stadium', location_city: 'Indianapolis', location_state: 'IN', location_host: 'Horizon League / IU Indianapolis', rounds_hosted: ['final_four', 'championship'] }
};

const TEAMS = {
    south: [
        { seed: 1, name: 'Kansas', mascot: 'Jayhawks', conference: 'Big 12' },
        { seed: 2, name: 'Florida', mascot: 'Gators', conference: 'SEC' },
        { seed: 3, name: 'Iowa State', mascot: 'Cyclones', conference: 'Big 12' },
        { seed: 4, name: 'Alabama', mascot: 'Crimson Tide', conference: 'SEC' },
        { seed: 5, name: 'Marquette', mascot: 'Golden Eagles', conference: 'Big East' },
        { seed: 6, name: 'Creighton', mascot: 'Bluejays', conference: 'Big East' },
        { seed: 7, name: "Saint Mary's", mascot: 'Gaels', conference: 'WCC' },
        { seed: 8, name: 'Michigan State', mascot: 'Spartans', conference: 'Big Ten' },
        { seed: 9, name: 'Memphis', mascot: 'Tigers', conference: 'AAC' },
        { seed: 10, name: 'New Mexico', mascot: 'Lobos', conference: 'MWC' },
        { seed: 11, name: 'Drake', mascot: 'Bulldogs', conference: 'MVC' },
        { seed: 12, name: 'UC San Diego', mascot: 'Tritons', conference: 'Big West' },
        { seed: 13, name: 'Vermont', mascot: 'Catamounts', conference: 'AEC' },
        { seed: 14, name: 'Colgate', mascot: 'Raiders', conference: 'Patriot' },
        { seed: 15, name: 'Robert Morris', mascot: 'Colonials', conference: 'Horizon' },
        { seed: 16, name: 'Norfolk State', mascot: 'Spartans', conference: 'MEAC' }
    ],
    west: [
        { seed: 1, name: 'Duke', mascot: 'Blue Devils', conference: 'ACC' },
        { seed: 2, name: 'Auburn', mascot: 'Tigers', conference: 'SEC' },
        { seed: 3, name: 'Wisconsin', mascot: 'Badgers', conference: 'Big Ten' },
        { seed: 4, name: 'Arizona', mascot: 'Wildcats', conference: 'Big 12' },
        { seed: 5, name: 'Michigan', mascot: 'Wolverines', conference: 'Big Ten' },
        { seed: 6, name: 'BYU', mascot: 'Cougars', conference: 'Big 12' },
        { seed: 7, name: 'Clemson', mascot: 'Tigers', conference: 'ACC' },
        { seed: 8, name: 'Missouri', mascot: 'Tigers', conference: 'SEC' },
        { seed: 9, name: 'Utah State', mascot: 'Aggies', conference: 'MWC' },
        { seed: 10, name: 'Oklahoma', mascot: 'Sooners', conference: 'SEC' },
        { seed: 11, name: 'VCU', mascot: 'Rams', conference: 'A-10' },
        { seed: 12, name: 'Grand Canyon', mascot: 'Antelopes', conference: 'WAC' },
        { seed: 13, name: 'Yale', mascot: 'Bulldogs', conference: 'Ivy' },
        { seed: 14, name: 'Montana State', mascot: 'Bobcats', conference: 'Big Sky' },
        { seed: 15, name: 'UNC Asheville', mascot: 'Bulldogs', conference: 'Big South' },
        { seed: 16, name: "Mount St. Mary's", mascot: 'Mountaineers', conference: 'NEC' }
    ],
    midwest: [
        { seed: 1, name: 'Houston', mascot: 'Cougars', conference: 'Big 12' },
        { seed: 2, name: 'Tennessee', mascot: 'Volunteers', conference: 'SEC' },
        { seed: 3, name: 'Kentucky', mascot: 'Wildcats', conference: 'SEC' },
        { seed: 4, name: 'Baylor', mascot: 'Bears', conference: 'Big 12' },
        { seed: 5, name: 'Purdue', mascot: 'Boilermakers', conference: 'Big Ten' },
        { seed: 6, name: 'Illinois', mascot: 'Fighting Illini', conference: 'Big Ten' },
        { seed: 7, name: 'UCLA', mascot: 'Bruins', conference: 'Big Ten' },
        { seed: 8, name: 'Ohio State', mascot: 'Buckeyes', conference: 'Big Ten' },
        { seed: 9, name: 'Xavier', mascot: 'Musketeers', conference: 'Big East' },
        { seed: 10, name: 'Indiana', mascot: 'Hoosiers', conference: 'Big Ten' },
        { seed: 11, name: 'San Diego State', mascot: 'Aztecs', conference: 'MWC' },
        { seed: 12, name: 'McNeese State', mascot: 'Cowboys', conference: 'Southland' },
        { seed: 13, name: 'Iona', mascot: 'Gaels', conference: 'MAAC' },
        { seed: 14, name: 'Morehead State', mascot: 'Eagles', conference: 'OVC' },
        { seed: 15, name: 'Winthrop', mascot: 'Eagles', conference: 'Big South' },
        { seed: 16, name: 'Texas Southern', mascot: 'Tigers', conference: 'SWAC' }
    ],
    east: [
        { seed: 1, name: 'UConn', mascot: 'Huskies', conference: 'Big East' },
        { seed: 2, name: 'Arizona State', mascot: 'Sun Devils', conference: 'Big 12' },
        { seed: 3, name: 'Villanova', mascot: 'Wildcats', conference: 'Big East' },
        { seed: 4, name: 'North Carolina', mascot: 'Tar Heels', conference: 'ACC' },
        { seed: 5, name: 'Gonzaga', mascot: 'Bulldogs', conference: 'WCC' },
        { seed: 6, name: 'Texas Tech', mascot: 'Red Raiders', conference: 'Big 12' },
        { seed: 7, name: 'Maryland', mascot: 'Terrapins', conference: 'Big Ten' },
        { seed: 8, name: 'TCU', mascot: 'Horned Frogs', conference: 'Big 12' },
        { seed: 9, name: 'Boise State', mascot: 'Broncos', conference: 'MWC' },
        { seed: 10, name: 'Colorado', mascot: 'Buffaloes', conference: 'Big 12' },
        { seed: 11, name: 'Princeton', mascot: 'Tigers', conference: 'Ivy' },
        { seed: 12, name: 'Liberty', mascot: 'Flames', conference: 'CUSA' },
        { seed: 13, name: 'Kent State', mascot: 'Golden Flashes', conference: 'MAC' },
        { seed: 14, name: 'Northern Kentucky', mascot: 'Norse', conference: 'Horizon' },
        { seed: 15, name: 'Longwood', mascot: 'Lancers', conference: 'Big South' },
        { seed: 16, name: 'Fairleigh Dickinson', mascot: 'Knights', conference: 'NEC' }
    ]
};

function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildTeamDocs() {
    const teamDocs = {};
    for (const [regionId, regionTeams] of Object.entries(TEAMS)) {
        for (const team of regionTeams) {
            const teamId = slugify(team.name);
            teamDocs[teamId] = {
                team_id: teamId,
                team_name: team.name,
                team_mascot: team.mascot,
                team_seed: team.seed,
                team_region_id: regionId,
                team_conference: team.conference,
                eliminated: false,
                elimination_round: null
            };
        }
    }
    return teamDocs;
}

function getTeamIdBySeed(regionId, seed) {
    const team = TEAMS[regionId].find(t => t.seed === seed);
    return team ? slugify(team.name) : null;
}

function buildMatchups() {
    const matchups = [];
    const regionKeys = ['south', 'west', 'midwest', 'east'];
    const seedMatchups = [
        [1, 16], [8, 9], [5, 12], [4, 13],
        [6, 11], [3, 14], [7, 10], [2, 15]
    ];

    const r1LocationMap = {
        south: ['buffalo', 'buffalo', 'oklahoma_city', 'oklahoma_city', 'greenville', 'greenville', 'portland', 'portland'],
        west: ['tampa', 'tampa', 'philadelphia', 'philadelphia', 'san_diego', 'san_diego', 'st_louis', 'st_louis'],
        midwest: ['buffalo', 'buffalo', 'oklahoma_city', 'oklahoma_city', 'tampa', 'tampa', 'philadelphia', 'philadelphia'],
        east: ['greenville', 'greenville', 'portland', 'portland', 'san_diego', 'san_diego', 'st_louis', 'st_louis']
    };

    let r1GameNum = 1;
    for (let r = 0; r < 4; r++) {
        const region = regionKeys[r];
        for (let g = 0; g < 8; g++) {
            const [topSeed, bottomSeed] = seedMatchups[g];
            const r2GameNum = Math.ceil(r1GameNum / 2);
            const slot = (r1GameNum % 2 === 1) ? 'top' : 'bottom';

            matchups.push({
                matchup_id: `R1_G${String(r1GameNum).padStart(2, '0')}`,
                round_id: 'round_of_64',
                region_id: region,
                location_id: r1LocationMap[region][g],
                bracket_position: r1GameNum,
                top_team_id: getTeamIdBySeed(region, topSeed),
                bottom_team_id: getTeamIdBySeed(region, bottomSeed),
                top_seed: topSeed,
                bottom_seed: bottomSeed,
                top_score: null,
                bottom_score: null,
                game_time: null,
                complete: false,
                winning_team_id: null,
                next_matchup_id: `R2_G${String(r2GameNum).padStart(2, '0')}`,
                next_matchup_slot: slot
            });
            r1GameNum++;
        }
    }

    let r2GameNum = 1;
    for (let r = 0; r < 4; r++) {
        const region = regionKeys[r];
        for (let g = 0; g < 4; g++) {
            const r3GameNum = Math.ceil(r2GameNum / 2);
            const slot = (r2GameNum % 2 === 1) ? 'top' : 'bottom';
            matchups.push({
                matchup_id: `R2_G${String(r2GameNum).padStart(2, '0')}`,
                round_id: 'round_of_32',
                region_id: region,
                location_id: r1LocationMap[region][g * 2],
                bracket_position: r2GameNum,
                top_team_id: null,
                bottom_team_id: null,
                top_seed: null,
                bottom_seed: null,
                top_score: null,
                bottom_score: null,
                game_time: null,
                complete: false,
                winning_team_id: null,
                next_matchup_id: `R3_G${String(r3GameNum).padStart(2, '0')}`,
                next_matchup_slot: slot
            });
            r2GameNum++;
        }
    }

    const r3RegionalLocations = { south: 'houston', west: 'san_jose', midwest: 'chicago', east: 'washington_dc' };
    let r3GameNum = 1;
    for (let r = 0; r < 4; r++) {
        const region = regionKeys[r];
        for (let g = 0; g < 2; g++) {
            const r4GameNum = Math.ceil(r3GameNum / 2);
            const slot = (r3GameNum % 2 === 1) ? 'top' : 'bottom';
            matchups.push({
                matchup_id: `R3_G${String(r3GameNum).padStart(2, '0')}`,
                round_id: 'sweet_16',
                region_id: region,
                location_id: r3RegionalLocations[region],
                bracket_position: r3GameNum,
                top_team_id: null, bottom_team_id: null,
                top_seed: null, bottom_seed: null,
                top_score: null, bottom_score: null,
                game_time: null, complete: false, winning_team_id: null,
                next_matchup_id: `R4_G${String(r4GameNum).padStart(2, '0')}`,
                next_matchup_slot: slot
            });
            r3GameNum++;
        }
    }

    let r4GameNum = 1;
    for (let r = 0; r < 4; r++) {
        const region = regionKeys[r];
        const r5GameNum = Math.ceil(r4GameNum / 2);
        const slot = (r4GameNum % 2 === 1) ? 'top' : 'bottom';
        matchups.push({
            matchup_id: `R4_G${String(r4GameNum).padStart(2, '0')}`,
            round_id: 'elite_eight',
            region_id: region,
            location_id: r3RegionalLocations[region],
            bracket_position: r4GameNum,
            top_team_id: null, bottom_team_id: null,
            top_seed: null, bottom_seed: null,
            top_score: null, bottom_score: null,
            game_time: null, complete: false, winning_team_id: null,
            next_matchup_id: `R5_G${String(r5GameNum).padStart(2, '0')}`,
            next_matchup_slot: slot
        });
        r4GameNum++;
    }

    for (let g = 1; g <= 2; g++) {
        const slot = (g === 1) ? 'top' : 'bottom';
        matchups.push({
            matchup_id: `R5_G${String(g).padStart(2, '0')}`,
            round_id: 'final_four',
            region_id: null,
            location_id: 'indianapolis',
            bracket_position: g,
            top_team_id: null, bottom_team_id: null,
            top_seed: null, bottom_seed: null,
            top_score: null, bottom_score: null,
            game_time: null, complete: false, winning_team_id: null,
            next_matchup_id: 'R6_G01',
            next_matchup_slot: slot
        });
    }

    matchups.push({
        matchup_id: 'R6_G01',
        round_id: 'championship',
        region_id: null,
        location_id: 'indianapolis',
        bracket_position: 1,
        top_team_id: null, bottom_team_id: null,
        top_seed: null, bottom_seed: null,
        top_score: null, bottom_score: null,
        game_time: null, complete: false, winning_team_id: null,
        next_matchup_id: null, next_matchup_slot: null
    });

    return matchups;
}

async function seedDatabase() {
    console.log('🏀 NerdMadness 2026 - Database Seed Script (with fake teams)');
    console.log('=============================================================\n');

    const teamDocs = buildTeamDocs();
    const matchups = buildMatchups();

    // Firestore batch limit is 500 — we have ~160 docs, well within limit
    const batch = db.batch();
    let docCount = 0;

    console.log('📋 Creating pool settings...');
    batch.set(db.doc(`${BASE_PATH}/metadata/settings`), {
        pool_name: 'NerdMadness 2026',
        pool_id: 'nerdmadness_2026',
        season_year: 2026,
        sport: 'ncaa_basketball',
        tournament_name: '2026 NCAA Division I Mens Basketball Championship',
        bracket_lock_time: null,
        scoring_system: { first_four: 0, round_of_64: 1, round_of_32: 2, sweet_16: 4, elite_eight: 8, final_four: 16, championship: 32 },
        max_possible_points: 192,
        status: 'pre_tournament',
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    docCount++;

    console.log('🗺️  Creating regions (4)...');
    for (const [id, data] of Object.entries(REGIONS)) {
        batch.set(db.doc(`${BASE_PATH}/regions/${id}`), { region_id: id, ...data });
        docCount++;
    }

    console.log('🔄 Creating rounds (7)...');
    for (const [id, data] of Object.entries(ROUNDS)) {
        batch.set(db.doc(`${BASE_PATH}/rounds/${id}`), { round_id: id, ...data });
        docCount++;
    }

    console.log('📍 Creating locations (14)...');
    for (const [id, data] of Object.entries(LOCATIONS)) {
        batch.set(db.doc(`${BASE_PATH}/locations/${id}`), { location_id: id, ...data });
        docCount++;
    }

    console.log(`🏫 Creating teams (${Object.keys(teamDocs).length})...`);
    for (const [id, data] of Object.entries(teamDocs)) {
        batch.set(db.doc(`${BASE_PATH}/teams/${id}`), data);
        docCount++;
    }

    console.log(`🏀 Creating matchups (${matchups.length})...`);
    for (const m of matchups) {
        batch.set(db.doc(`${BASE_PATH}/matchups/${m.matchup_id}`), m);
        docCount++;
    }

    console.log(`\n💾 Committing ${docCount} documents...`);
    await batch.commit();
    console.log('✅ Tournament structure + teams created!\n');

    console.log('👥 Copying members from nerdfootball...');
    const membersSnap = await db.doc(NERDFOOTBALL_MEMBERS_PATH).get();
    if (!membersSnap.exists) {
        console.error('❌ Nerdfootball members not found. Set up members manually.');
    } else {
        const membersData = membersSnap.data();
        const count = membersData.members ? membersData.members.length : Object.keys(membersData).length;
        await db.doc(`${BASE_PATH}/metadata/members`).set({
            ...membersData,
            copied_from: 'nerduniverse-2025',
            copied_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Copied ${count} members!\n`);
    }

    console.log('=============================================================');
    console.log('🏀 NerdMadness 2026 Seeded!');
    console.log(`   Path:     ${BASE_PATH}`);
    console.log(`   Teams:    ${Object.keys(teamDocs).length}`);
    console.log(`   Matchups: ${matchups.length}`);
    console.log(`   Regions:  ${Object.keys(REGIONS).length}`);
    console.log(`   Rounds:   ${Object.keys(ROUNDS).length}`);
    console.log('=============================================================\n');
}

seedDatabase().catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
