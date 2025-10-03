const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ESPN abbreviation to full team name mapping
const TEAM_MAP = {
    'SF': 'San Francisco 49ers',
    'LAR': 'Los Angeles Rams',
    'MIN': 'Minnesota Vikings',
    'CLE': 'Cleveland Browns',
    'LV': 'Las Vegas Raiders',
    'IND': 'Indianapolis Colts',
    'NYG': 'New York Giants',
    'NO': 'New Orleans Saints',
    'DAL': 'Dallas Cowboys',
    'NYJ': 'New York Jets',
    'DEN': 'Denver Broncos',
    'PHI': 'Philadelphia Eagles',
    'MIA': 'Miami Dolphins',
    'CAR': 'Carolina Panthers',
    'HOU': 'Houston Texans',
    'BAL': 'Baltimore Ravens',
    'TEN': 'Tennessee Titans',
    'ARI': 'Arizona Cardinals',
    'TB': 'Tampa Bay Buccaneers',
    'SEA': 'Seattle Seahawks',
    'DET': 'Detroit Lions',
    'CIN': 'Cincinnati Bengals',
    'WSH': 'Washington Commanders',
    'LAC': 'Los Angeles Chargers',
    'NE': 'New England Patriots',
    'BUF': 'Buffalo Bills',
    'KC': 'Kansas City Chiefs',
    'JAX': 'Jacksonville Jaguars'
};

async function fixWeek5TeamNames() {
    console.log('🔧 FIXING WEEK 5 TEAM NAMES TO MATCH WEEKS 1-4 FORMAT\n');

    const week5Ref = db.collection('artifacts').doc('nerdfootball')
        .collection('public').doc('data')
        .collection('nerdfootball_games').doc('5');

    const week5Snap = await week5Ref.get();
    const week5Data = week5Snap.data();

    const fixedData = {};

    for (const [gameId, game] of Object.entries(week5Data)) {
        if (gameId === '_metadata') {
            fixedData[gameId] = game;
            continue;
        }

        if (!game.homeTeam || !game.awayTeam || !TEAM_MAP[game.homeTeam] || !TEAM_MAP[game.awayTeam]) {
            console.log(`⚠️  Skipping invalid game: ${gameId}`);
            continue;
        }

        const homeTeamFull = TEAM_MAP[game.homeTeam];
        const awayTeamFull = TEAM_MAP[game.awayTeam];
        const winnerFull = game.winner ? TEAM_MAP[game.winner] : null;

        fixedData[gameId] = {
            h: homeTeamFull,
            a: awayTeamFull,
            dt: game.gameTime,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            status: game.status === 'STATUS_FINAL' ? 'final' : 'scheduled',
            winner: winnerFull,
            espnId: game.espnId
        };

        console.log(`${gameId}: ${awayTeamFull} @ ${homeTeamFull}`);
        if (winnerFull) {
            console.log(`   Winner: ${winnerFull} ✅`);
        }
    }

    console.log('\n💾 Writing fixed Week 5 data...');
    await week5Ref.set(fixedData);

    console.log('✅ Week 5 team names fixed!');
    console.log('Now using full team names like Weeks 1-4');

    process.exit(0);
}

fixWeek5TeamNames().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
